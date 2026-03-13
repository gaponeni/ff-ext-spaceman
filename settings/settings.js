const checkboxNode = document.getElementById("auto-discard-hidden-tabs");
const resetViewButton = document.getElementById("reset-spaces-view");
const statusNode = document.getElementById("status");

const settingsService = new SpaceManager.classes.ExtensionSettingsService(browser, SpaceManager.constants);

function setStatus(message, isError) {
  statusNode.textContent = message || "";
  statusNode.classList.toggle("error", Boolean(isError));
}

function setBusy(isBusy) {
  checkboxNode.disabled = isBusy;
  if (resetViewButton) {
    resetViewButton.disabled = isBusy;
  }
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
  setBusy(true);
  try {
    await settingsService.setAutoDiscardHiddenTabs(checkboxNode.checked);
    setStatus("Saved.");
  } catch (error) {
    setStatus(error?.message || "Failed to save settings.", true);
  } finally {
    setBusy(false);
  }
}

async function resetSpacesView() {
  const confirmed = window.confirm(
    "Reset Spaces view for this window? This will show all tabs, restore saved groups, and switch to No Space."
  );
  if (!confirmed) return;

  setBusy(true);
  try {
    const result = await browser.runtime.sendMessage({ type: "space:reset-view" });
    if (result?.ok === false) {
      throw new Error(result.error || "Failed to reset Spaces view.");
    }
    setStatus("Spaces view reset.");
  } catch (error) {
    setStatus(error?.message || "Failed to reset Spaces view.", true);
  } finally {
    setBusy(false);
  }
}

checkboxNode.addEventListener("change", () => {
  void saveSettings();
});

if (resetViewButton) {
  resetViewButton.addEventListener("click", () => {
    void resetSpacesView();
  });
}

void loadSettings();
