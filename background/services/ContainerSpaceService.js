var NS = SpaceManager;

class ContainerSpaceService {
  constructor(browserApi, constants, store) {
    this.browser = browserApi;
    this.constants = constants;
    this.store = store;
  }

  async getContainersSupport() {
    if (!this.browser.contextualIdentities) {
      return {
        available: false,
        code: "api-missing",
        message: "Firefox Containers API is unavailable in this browser."
      };
    }

    try {
      await this.browser.contextualIdentities.query({});
      return { available: true, code: null, message: null };
    } catch {
      return {
        available: false,
        code: "disabled",
        message: "Firefox Containers are disabled. Enable Container Tabs in Firefox settings to use Spaces."
      };
    }
  }

  async getContainerSpaces() {
    const identities = await this.browser.contextualIdentities.query({});
    return identities.map((i) => ({
      id: i.cookieStoreId,
      cookieStoreId: i.cookieStoreId,
      name: i.name,
      color: i.color,
      icon: i.icon
    }));
  }

  async sanitizeActiveMappings() {
    const spaces = await this.getContainerSpaces();
    const validIds = new Set(spaces.map((s) => s.id));
    const activeByWindow = await this.store.getActiveByWindow();
    const next = {};

    for (const [windowId, spaceId] of Object.entries(activeByWindow)) {
      if (spaceId === null || spaceId === undefined || validIds.has(spaceId)) {
        next[windowId] = spaceId ?? null;
      }
    }

    await this.store.setActiveByWindow(next);
  }

  async ensureState() {
    const support = await this.getContainersSupport();
    if (!support.available) return [];
    await this.sanitizeActiveMappings();
    return this.getContainerSpaces();
  }

  async getWindowActiveSpaceId(windowId) {
    const spaces = await this.getContainerSpaces();
    const validIds = new Set(spaces.map((s) => s.id));
    const activeByWindow = await this.store.getActiveByWindow();
    const value = activeByWindow[String(windowId)];
    if (value === null) return null;
    if (value && validIds.has(value)) return value;
    return null;
  }

  async setWindowActiveSpaceId(windowId, spaceId) {
    const activeByWindow = await this.store.getActiveByWindow();
    activeByWindow[String(windowId)] = spaceId ?? null;
    await this.store.setActiveByWindow(activeByWindow);
  }

  async resolveTargetCookieStoreId(spaceId) {
    if (!spaceId) return this.constants.DEFAULT_COOKIE_STORE_ID;
    const spaces = await this.getContainerSpaces();
    const exists = spaces.some((s) => s.id === spaceId);
    if (!exists) throw new Error("Unknown container space");
    return spaceId;
  }

  async getState(windowId) {
    const support = await this.getContainersSupport();
    if (!support.available) {
      return { spaces: [], activeSpaceId: null, support };
    }

    const spaces = await this.ensureState();
    const activeSpaceId = await this.getWindowActiveSpaceId(windowId);
    return { spaces, activeSpaceId, support };
  }
}

NS.classes.ContainerSpaceService = ContainerSpaceService;
