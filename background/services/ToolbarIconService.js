var NS = SpaceManager;

class ToolbarIconService {
  constructor(browserApi, constants, spaceService) {
    this.browser = browserApi;
    this.constants = constants;
    this.spaceService = spaceService;
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  makeBrandImageData(size, bgColorStart, bgColorEnd) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");

    this.drawRoundedRect(
      ctx,
      Math.round(size * 0.02),
      Math.round(size * 0.02),
      Math.round(size * 0.96),
      Math.round(size * 0.96),
      Math.round(size * 0.24)
    );

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, bgColorStart);
    gradient.addColorStop(1, bgColorEnd || bgColorStart);
    ctx.fillStyle = gradient;
    ctx.fill();

    const scale = size / 96;

    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.arc(32 * scale, 35 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.arc(64 * scale, 35 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();

    this.drawRoundedRect(ctx, 20 * scale, 54 * scale, 56 * scale, 20 * scale, 10 * scale);
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  }

  async setActionIcon(windowId, spaceOrNull) {
    if (!spaceOrNull) {
      if (typeof OffscreenCanvas !== "undefined") {
        await this.browser.action.setIcon({
          windowId,
          imageData: {
            16: this.makeBrandImageData(16, "#2563eb", "#14b8a6"),
            32: this.makeBrandImageData(32, "#2563eb", "#14b8a6")
          }
        });
      } else {
        await this.browser.action.setIcon({ windowId, path: this.constants.DEFAULT_ICON_PATH });
      }
      await this.browser.action.setTitle({ windowId, title: "Space Manager (No Space)" });
      await this.browser.action.setBadgeText({ windowId, text: "" });
      return;
    }

    const bgColor = this.constants.COLOR_HEX[spaceOrNull.color] || "#2563eb";

    if (typeof OffscreenCanvas === "undefined") {
      await this.browser.action.setIcon({ windowId, path: this.constants.DEFAULT_ICON_PATH });
      await this.browser.action.setTitle({ windowId, title: `Space Manager (${spaceOrNull.name})` });
      await this.browser.action.setBadgeText({ windowId, text: "" });
      return;
    }

    await this.browser.action.setIcon({
      windowId,
      imageData: {
        16: this.makeBrandImageData(16, bgColor),
        32: this.makeBrandImageData(32, bgColor)
      }
    });
    await this.browser.action.setTitle({ windowId, title: `Space Manager (${spaceOrNull.name})` });
    await this.browser.action.setBadgeText({ windowId, text: "" });
  }

  async initWindowIcons() {
    const support = await this.spaceService.getContainersSupport();
    if (!support.available) return;

    const windows = await this.browser.windows.getAll();
    const spaces = await this.spaceService.getContainerSpaces();

    for (const w of windows) {
      const active = await this.spaceService.getWindowActiveSpaceId(w.id);
      const selected = active ? spaces.find((s) => s.id === active) : null;
      await this.setActionIcon(w.id, selected || null);
    }
  }
}

NS.classes.ToolbarIconService = ToolbarIconService;
