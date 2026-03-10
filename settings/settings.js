const checkboxNode = document.getElementById("auto-discard-hidden-tabs");
const statusNode = document.getElementById("status");

const settingsService = new SpaceManager.classes.ExtensionSettingsService(browser, SpaceManager.constants);

function setStatus(message, isError) {
  statusNode.textContent = message || "";
  statusNode.classList.toggle("error", Boolean(isError));
}

async function loadSettings() {
  try {
    const settings = await settingsService.getSettings();
    checkboxNode.checked = Boolean(settings[SpaceManager.constants.SETTING_AUTO_DISCARD_HIDDEN_TABS]);
    setStatus("");
  } catch (error) {
    setStatus(error?.message || "Failed to load settings.", true);
  }
}

async function saveSettings() {
  checkboxNode.disabled = true;
  try {
    await settingsService.setAutoDiscardHiddenTabs(checkboxNode.checked);
    setStatus("Saved.");
  } catch (error) {
    setStatus(error?.message || "Failed to save settings.", true);
  } finally {
    checkboxNode.disabled = false;
  }
}

checkboxNode.addEventListener("change", () => {
  void saveSettings();
});

void loadSettings();
