var NS = SpaceManager;

class RuntimeMessageController {
  constructor(browserApi, spaceService, switchService, utils) {
    this.browser = browserApi;
    this.spaceService = spaceService;
    this.switchService = switchService;
    this.utils = utils;
  }

  async getNormalWindowId() {
    const win = await this.browser.windows.getLastFocused({ windowTypes: ["normal"] });
    return win?.id;
  }

  async resolveWindowId(explicitWindowId, senderWindowId) {
    if (typeof explicitWindowId === "number") return explicitWindowId;
    if (typeof senderWindowId === "number") return senderWindowId;
    return this.getNormalWindowId();
  }

  async handleGetState(message, senderWindowId) {
    const requestedWindowId = message.windowId;
    if (typeof requestedWindowId === "number") return this.spaceService.getState(requestedWindowId);
    if (typeof senderWindowId === "number") return this.spaceService.getState(senderWindowId);

    const windowId = await this.getNormalWindowId();
    if (typeof windowId !== "number") {
      return {
        spaces: [],
        activeSpaceId: null,
        support: {
          available: false,
          code: "window-missing",
          message: "No active browser window found."
        }
      };
    }
    return this.spaceService.getState(windowId);
  }

  async handleSwitch(message, senderWindowId) {
    const windowId = await this.resolveWindowId(message.windowId, senderWindowId);
    if (typeof windowId !== "number") return { ok: false };

    const support = await this.spaceService.getContainersSupport();
    if (!support.available) return { ok: false, error: support.message };

    try {
      await this.switchService.switchSpace(message.spaceId ?? null, windowId);
      return { ok: true };
    } catch (error) {
      console.error("[space:switch] failed", error);
      return { ok: false, error: this.utils.errMsg(error) };
    }
  }

  async handleMessage(message, sender) {
    const senderWindowId = sender.tab?.windowId;

    if (message?.type === "space:get-state") {
      return this.handleGetState(message, senderWindowId);
    }

    if (message?.type === "space:switch") {
      return this.handleSwitch(message, senderWindowId);
    }

    return undefined;
  }

  register() {
    this.browser.runtime.onMessage.addListener((message, sender) => this.handleMessage(message, sender));
  }
}

NS.classes.RuntimeMessageController = RuntimeMessageController;
