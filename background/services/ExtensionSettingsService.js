var NS = SpaceManager;

class ExtensionSettingsService {
  constructor(browserApi, constants) {
    this.browser = browserApi;
    this.constants = constants;
  }

  getDefaults() {
    return {
      [this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]: true
    };
  }

  normalize(raw) {
    const defaults = this.getDefaults();
    return {
      [this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]:
        typeof raw?.[this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS] === "boolean"
          ? raw[this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]
          : defaults[this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]
    };
  }

  async getSettings() {
    const data = await this.browser.storage.local.get(this.constants.LOCAL_SETTINGS_KEY);
    return this.normalize(data[this.constants.LOCAL_SETTINGS_KEY] || {});
  }

  async setSettings(next) {
    const normalized = this.normalize(next);
    await this.browser.storage.local.set({ [this.constants.LOCAL_SETTINGS_KEY]: normalized });
    return normalized;
  }

  async setAutoDiscardHiddenTabs(enabled) {
    const current = await this.getSettings();
    current[this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS] = Boolean(enabled);
    return this.setSettings(current);
  }

  async shouldAutoDiscardHiddenTabs() {
    const settings = await this.getSettings();
    return Boolean(settings[this.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]);
  }
}

NS.classes.ExtensionSettingsService = ExtensionSettingsService;
