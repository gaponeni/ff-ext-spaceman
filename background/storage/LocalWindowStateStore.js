var NS = SpaceManager;

class LocalWindowStateStore {
  constructor(browserApi, constants) {
    this.browser = browserApi;
    this.constants = constants;
    this.privateActiveByWindow = {};
    this.privateLastActiveTabsByWindow = {};
    this.privateGroupSnapshotsByWindow = {};
  }

  async getActiveByWindow() {
    const data = await this.browser.storage.local.get(this.constants.LOCAL_ACTIVE_KEY);
    return data[this.constants.LOCAL_ACTIVE_KEY] || {};
  }

  async setActiveByWindow(map) {
    await this.browser.storage.local.set({ [this.constants.LOCAL_ACTIVE_KEY]: map });
  }

  async getLastActiveTabsByWindow() {
    const data = await this.browser.storage.local.get(this.constants.LOCAL_LAST_TAB_KEY);
    return data[this.constants.LOCAL_LAST_TAB_KEY] || {};
  }

  async setLastActiveTabsByWindow(map) {
    await this.browser.storage.local.set({ [this.constants.LOCAL_LAST_TAB_KEY]: map });
  }

  async rememberLastTab(windowId, cookieStoreId, tabId, isPrivate = false) {
    if (!tabId) return;
    if (isPrivate) {
      const key = String(windowId);
      const next = { ...(this.privateLastActiveTabsByWindow[key] || {}) };
      next[cookieStoreId] = tabId;
      this.privateLastActiveTabsByWindow[key] = next;
      return;
    }
    const map = await this.getLastActiveTabsByWindow();
    const key = String(windowId);
    const next = { ...(map[key] || {}) };
    next[cookieStoreId] = tabId;
    map[key] = next;
    await this.setLastActiveTabsByWindow(map);
  }

  async getRememberedTabId(windowId, cookieStoreId, isPrivate = false) {
    if (isPrivate) {
      return this.privateLastActiveTabsByWindow[String(windowId)]?.[cookieStoreId] || null;
    }
    const map = await this.getLastActiveTabsByWindow();
    return map[String(windowId)]?.[cookieStoreId] || null;
  }

  async getGroupSnapshotsByWindow() {
    const data = await this.browser.storage.local.get(this.constants.LOCAL_GROUP_SNAPSHOT_KEY);
    return data[this.constants.LOCAL_GROUP_SNAPSHOT_KEY] || {};
  }

  async setGroupSnapshotsByWindow(map) {
    await this.browser.storage.local.set({ [this.constants.LOCAL_GROUP_SNAPSHOT_KEY]: map });
  }

  async getGroupSnapshot(windowId, cookieStoreId, isPrivate = false) {
    if (isPrivate) {
      return this.privateGroupSnapshotsByWindow[String(windowId)]?.[cookieStoreId] || [];
    }
    const map = await this.getGroupSnapshotsByWindow();
    return map[String(windowId)]?.[cookieStoreId] || [];
  }

  async setGroupSnapshot(windowId, cookieStoreId, groups, isPrivate = false) {
    if (isPrivate) {
      const key = String(windowId);
      this.privateGroupSnapshotsByWindow[key] = this.privateGroupSnapshotsByWindow[key] || {};
      this.privateGroupSnapshotsByWindow[key][cookieStoreId] = groups;
      return;
    }
    const map = await this.getGroupSnapshotsByWindow();
    const key = String(windowId);
    map[key] = map[key] || {};
    map[key][cookieStoreId] = groups;
    await this.setGroupSnapshotsByWindow(map);
  }

  async getWindowActiveSpaceId(windowId, isPrivate) {
    if (isPrivate) return this.privateActiveByWindow[String(windowId)] ?? null;
    const activeByWindow = await this.getActiveByWindow();
    return activeByWindow[String(windowId)] ?? null;
  }

  async setWindowActiveSpaceId(windowId, spaceId, isPrivate) {
    if (isPrivate) {
      this.privateActiveByWindow[String(windowId)] = spaceId ?? null;
      return;
    }
    const activeByWindow = await this.getActiveByWindow();
    activeByWindow[String(windowId)] = spaceId ?? null;
    await this.setActiveByWindow(activeByWindow);
  }

  clearPrivateWindowState(windowId) {
    const key = String(windowId);
    delete this.privateActiveByWindow[key];
    delete this.privateLastActiveTabsByWindow[key];
    delete this.privateGroupSnapshotsByWindow[key];
  }
}

NS.classes.LocalWindowStateStore = LocalWindowStateStore;
