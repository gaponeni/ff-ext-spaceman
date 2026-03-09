var NS = SpaceManager;

class BackgroundEventController {
  constructor(browserApi, spaceService, iconService, switchService) {
    this.browser = browserApi;
    this.spaceService = spaceService;
    this.iconService = iconService;
    this.switchService = switchService;
  }

  async handleInstalled() {
    await this.spaceService.ensureState();
    await this.iconService.initWindowIcons();
  }

  async handleStartup() {
    await this.spaceService.ensureState();
    await this.iconService.initWindowIcons();
  }

  async handleWindowCreated(window) {
    await this.spaceService.setWindowActiveSpaceId(window.id, null);
    await this.iconService.setActionIcon(window.id, null);
  }

  async handleContainersChanged() {
    await this.spaceService.sanitizeActiveMappings();
    await this.iconService.initWindowIcons();
  }

  register() {
    this.browser.runtime.onInstalled.addListener(() => this.handleInstalled());
    this.browser.runtime.onStartup.addListener(() => this.handleStartup());
    this.browser.windows.onCreated.addListener((window) => this.handleWindowCreated(window));
    this.browser.tabs.onActivated.addListener((info) => this.switchService.handleTabActivated(info));
    this.browser.tabs.onCreated.addListener((tab) => this.switchService.handleTabCreated(tab));

    this.browser.contextualIdentities.onCreated.addListener(() => this.handleContainersChanged());
    this.browser.contextualIdentities.onUpdated.addListener(() => this.handleContainersChanged());
    this.browser.contextualIdentities.onRemoved.addListener(() => this.handleContainersChanged());
  }
}

NS.classes.BackgroundEventController = BackgroundEventController;
