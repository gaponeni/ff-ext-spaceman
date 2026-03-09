var NS = SpaceManager;

class LocalWindowStateStore {
  constructor(browserApi, constants) {
    this.browser = browserApi;
    this.constants = constants;
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

  async rememberLastTab(windowId, cookieStoreId, tabId) {
    if (!tabId) return;
    const map = await this.getLastActiveTabsByWindow();
    const key = String(windowId);
    const next = { ...(map[key] || {}) };
    next[cookieStoreId] = tabId;
    map[key] = next;
    await this.setLastActiveTabsByWindow(map);
  }

  async getRememberedTabId(windowId, cookieStoreId) {
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

  async getGroupSnapshot(windowId, cookieStoreId) {
    const map = await this.getGroupSnapshotsByWindow();
    return map[String(windowId)]?.[cookieStoreId] || [];
  }

  async setGroupSnapshot(windowId, cookieStoreId, groups) {
    const map = await this.getGroupSnapshotsByWindow();
    const key = String(windowId);
    map[key] = map[key] || {};
    map[key][cookieStoreId] = groups;
    await this.setGroupSnapshotsByWindow(map);
  }
}

NS.classes.LocalWindowStateStore = LocalWindowStateStore;
