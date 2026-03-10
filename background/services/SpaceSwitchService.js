var NS = SpaceManager;

class SpaceSwitchService {
  constructor(browserApi, constants, utils, store, spaceService, iconService, settingsService) {
    this.browser = browserApi;
    this.constants = constants;
    this.utils = utils;
    this.store = store;
    this.spaceService = spaceService;
    this.iconService = iconService;
    this.settingsService = settingsService;
    this.switchQueueByWindow = new Map();
  }

  async listTabsByStore(windowId, cookieStoreId) {
    const tabs = await this.browser.tabs.query({ windowId });
    return tabs.filter((t) => (t.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID) === cookieStoreId);
  }

  supportsTabGroups() {
    return Boolean(
      this.browser.tabGroups &&
      this.browser.tabs &&
      typeof this.browser.tabs.group === "function" &&
      typeof this.browser.tabs.ungroup === "function"
    );
  }

  runWindowSwitchLocked(windowId, operation) {
    const key = String(windowId);
    const prev = this.switchQueueByWindow.get(key) || Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(operation)
      .finally(() => {
        if (this.switchQueueByWindow.get(key) === next) {
          this.switchQueueByWindow.delete(key);
        }
      });
    this.switchQueueByWindow.set(key, next);
    return next;
  }

  async isPrivateWindow(windowId) {
    return this.spaceService.isPrivateWindow(windowId);
  }

  buildStableTabRef(tab) {
    return {
      tabId: tab.id || null,
      url: tab.url || "",
      pinned: Boolean(tab.pinned),
      index: typeof tab.index === "number" ? tab.index : null
    };
  }

  selectBestTabMatch(ref, candidates) {
    if (!candidates.length) return null;
    const exact = ref.tabId ? candidates.find((t) => t.id === ref.tabId) : null;
    if (exact) return exact;

    const sameUrlPinned = candidates.filter((t) =>
      (t.url || "") === (ref.url || "") &&
      Boolean(t.pinned) === Boolean(ref.pinned)
    );
    if (!sameUrlPinned.length) return null;
    if (typeof ref.index !== "number") return sameUrlPinned[0];

    return sameUrlPinned.reduce((best, current) => {
      if (!best) return current;
      const bestDist = Math.abs((best.index ?? ref.index) - ref.index);
      const currentDist = Math.abs((current.index ?? ref.index) - ref.index);
      return currentDist < bestDist ? current : best;
    }, null);
  }

  async captureAndDetachGroups(windowId, cookieStoreId, isPrivate) {
    if (!this.supportsTabGroups()) return;

    const tabsInStore = await this.listTabsByStore(windowId, cookieStoreId);
    const tabById = new Map(tabsInStore.map((tab) => [tab.id, tab]));
    const noneGroupId = this.browser.tabGroups.TAB_GROUP_ID_NONE;
    const byGroupId = new Map();

    for (const tab of tabsInStore) {
      if (!tab.id) continue;
      if (tab.groupId === noneGroupId || typeof tab.groupId !== "number" || tab.groupId < 0) continue;
      const existing = byGroupId.get(tab.groupId) || [];
      existing.push(tab.id);
      byGroupId.set(tab.groupId, existing);
    }

    if (byGroupId.size === 0) {
      await this.store.setGroupSnapshot(windowId, cookieStoreId, [], isPrivate);
      return;
    }

    const captured = [];
    const ungroupIds = [];

    for (const [groupId, tabIds] of byGroupId.entries()) {
      let meta = { title: "", color: "blue", collapsed: false };
      try {
        const details = await this.browser.tabGroups.get(groupId);
        meta = {
          title: details.title || "",
          color: details.color || "blue",
          collapsed: Boolean(details.collapsed)
        };
      } catch {
        // keep defaults
      }

      const tabRefs = tabIds
        .map((id) => tabById.get(id))
        .filter(Boolean)
        .map((tab) => this.buildStableTabRef(tab));
      captured.push({ ...meta, tabs: tabRefs });
      ungroupIds.push(...tabIds);
    }

    await this.store.setGroupSnapshot(windowId, cookieStoreId, captured, isPrivate);
    try {
      await this.browser.tabs.ungroup(ungroupIds);
    } catch {
      // ignore if some tabs cannot be ungrouped
    }
  }

  async restoreGroupsForStore(windowId, cookieStoreId, isPrivate) {
    if (!this.supportsTabGroups()) return;
    const groups = await this.store.getGroupSnapshot(windowId, cookieStoreId, isPrivate);
    if (!groups.length) return;

    const tabsInStore = await this.listTabsByStore(windowId, cookieStoreId);
    const usedTabIds = new Set();
    const restoredGroups = [];

    for (const g of groups) {
      const matchedTabs = [];
      for (const ref of g.tabs || []) {
        const candidates = tabsInStore.filter((t) => t.id && !usedTabIds.has(t.id));
        const matched = this.selectBestTabMatch(ref, candidates);
        if (!matched?.id) continue;
        matchedTabs.push(matched);
        usedTabIds.add(matched.id);
      }

      const tabIds = matchedTabs.map((t) => t.id);
      if (!tabIds.length) continue;
      try {
        const newGroupId = await this.browser.tabs.group({ tabIds });
        try {
          await this.browser.tabGroups.update(newGroupId, {
            title: g.title || "",
            color: g.color || "blue",
            collapsed: Boolean(g.collapsed)
          });
        } catch {
          // ignore metadata update failures
        }
        restoredGroups.push({
          title: g.title || "",
          color: g.color || "blue",
          collapsed: Boolean(g.collapsed),
          tabs: matchedTabs.map((t) => this.buildStableTabRef(t))
        });
      } catch {
        // ignore grouping failures
      }
    }

    if (restoredGroups.length) {
      await this.store.setGroupSnapshot(windowId, cookieStoreId, restoredGroups, isPrivate);
    }
  }

  async switchSpace(spaceId, windowId) {
    return this.runWindowSwitchLocked(windowId, () => this.switchSpaceInternal(spaceId, windowId));
  }

  async switchSpaceInternal(spaceId, windowId) {
    const isPrivate = await this.isPrivateWindow(windowId);
    const spaces = await this.spaceService.ensureState();
    const selected = spaceId ? spaces.find((s) => s.id === spaceId) : null;
    if (spaceId && !selected) throw new Error("Unknown space");

    const currentSpaceId = await this.spaceService.getWindowActiveSpaceId(windowId, isPrivate);
    if ((currentSpaceId || null) === (spaceId || null)) return;

    const currentActive = (await this.browser.tabs.query({ windowId, active: true }))[0] || null;
    if (currentActive?.id) {
      const currentStore = currentActive.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID;
      await this.store.rememberLastTab(windowId, currentStore, currentActive.id, isPrivate);
    }

    const currentStore = await this.spaceService.resolveTargetCookieStoreId(currentSpaceId);
    await this.captureAndDetachGroups(windowId, currentStore, isPrivate);

    const targetStore = await this.spaceService.resolveTargetCookieStoreId(spaceId);
    let targetTabs = await this.listTabsByStore(windowId, targetStore);

    if (targetTabs.length === 0) {
      const created = await this.browser.tabs.create({
        windowId,
        active: true,
        ...(spaceId ? { cookieStoreId: targetStore } : {})
      });
      targetTabs = [created];
    }

    const rememberedTargetId = await this.store.getRememberedTabId(windowId, targetStore, isPrivate);
    const activeTarget = targetTabs.find((t) => t.id === rememberedTargetId) || targetTabs[0] || null;

    const targetTabIds = targetTabs.map((t) => t.id).filter(Boolean);
    if (targetTabIds.length > 0) {
      try {
        await this.browser.tabs.show(targetTabIds);
      } catch {
        // ignore protected tabs
      }
    }

    if (activeTarget?.id) {
      await this.browser.tabs.update(activeTarget.id, { active: true });
      await this.store.rememberLastTab(windowId, targetStore, activeTarget.id, isPrivate);
    }

    await this.restoreGroupsForStore(windowId, targetStore, isPrivate);

    const allTabs = await this.browser.tabs.query({ windowId });
    const hideIds = allTabs
      .filter((t) => (t.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID) !== targetStore && !t.hidden && t.id)
      .map((t) => t.id);

    if (hideIds.length > 0) {
      try {
        await this.browser.tabs.hide(hideIds);
      } catch {
        for (const id of hideIds) {
          try {
            await this.browser.tabs.hide(id);
          } catch {
            // ignore
          }
        }
      }
    }

    const shouldDiscard = await this.settingsService.shouldAutoDiscardHiddenTabs();
    if (shouldDiscard) {
      const discardIds = allTabs
        .filter((t) => (t.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID) !== targetStore && this.utils.canDiscard(t, activeTarget?.id))
        .map((t) => t.id)
        .filter(Boolean);

      for (const id of discardIds) {
        try {
          await this.browser.tabs.discard(id);
        } catch {
          // ignore
        }
      }
    }

    await this.spaceService.setWindowActiveSpaceId(windowId, spaceId ?? null, isPrivate);
    await this.iconService.setActionIcon(windowId, selected);
  }

  async handleTabActivated({ tabId, windowId }) {
    try {
      const tab = await this.browser.tabs.get(tabId);
      const storeId = tab.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID;
      await this.store.rememberLastTab(windowId, storeId, tabId, Boolean(tab.incognito));
    } catch {
      // ignore
    }
  }

  async handleTabCreated(tab) {
    try {
      if (!tab?.id || typeof tab.windowId !== "number") return;
      const isPrivate = Boolean(tab.incognito);

      const createdStore = tab.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID;
      if (createdStore !== this.constants.DEFAULT_COOKIE_STORE_ID) return;

      let targetStore = this.constants.DEFAULT_COOKIE_STORE_ID;
      if (typeof tab.openerTabId === "number") {
        try {
          const opener = await this.browser.tabs.get(tab.openerTabId);
          const openerStore = opener?.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID;
          if (openerStore !== this.constants.DEFAULT_COOKIE_STORE_ID) {
            targetStore = openerStore;
          }
        } catch {
          // ignore opener lookup failure
        }
      }

      if (!targetStore || targetStore === this.constants.DEFAULT_COOKIE_STORE_ID) {
        const activeSpaceId = await this.spaceService.getWindowActiveSpaceId(tab.windowId, isPrivate);
        if (activeSpaceId) {
          targetStore = await this.spaceService.resolveTargetCookieStoreId(activeSpaceId);
        }
      }

      if (!targetStore || targetStore === this.constants.DEFAULT_COOKIE_STORE_ID) {
        const tabsInWindow = await this.browser.tabs.query({ windowId: tab.windowId });
        const candidate = tabsInWindow
          .filter((t) => t.id !== tab.id && !t.hidden)
          .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0] || null;
        const candidateStore = candidate?.cookieStoreId || this.constants.DEFAULT_COOKIE_STORE_ID;
        if (candidateStore !== this.constants.DEFAULT_COOKIE_STORE_ID) {
          targetStore = candidateStore;
        }
      }

      if (!targetStore || targetStore === this.constants.DEFAULT_COOKIE_STORE_ID) return;

      const fullPayload = {
        windowId: tab.windowId,
        active: Boolean(tab.active),
        cookieStoreId: targetStore
      };

      if (typeof tab.index === "number") fullPayload.index = tab.index;
      if (typeof tab.openerTabId === "number") fullPayload.openerTabId = tab.openerTabId;
      if (this.utils.isTransferableUrl(tab.url)) fullPayload.url = tab.url;

      let replacement = null;
      try {
        replacement = await this.browser.tabs.create(fullPayload);
      } catch {
        const fallbackPayload = {
          windowId: tab.windowId,
          active: Boolean(tab.active),
          cookieStoreId: targetStore
        };
        if (typeof tab.index === "number") fallbackPayload.index = tab.index;
        replacement = await this.browser.tabs.create(fallbackPayload);
      }

      await this.browser.tabs.remove(tab.id);

      if (replacement?.id) {
        await this.store.rememberLastTab(tab.windowId, targetStore, replacement.id, isPrivate);
      }
    } catch (error) {
      console.error("[tabs.onCreated] failed to move tab into active space", error);
    }
  }

}

NS.classes.SpaceSwitchService = SpaceSwitchService;
