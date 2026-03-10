var NS = SpaceManager;

NS.utils.errMsg = function errMsg(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return error.message || String(error);
};

NS.utils.isTransferableUrl = function isTransferableUrl(url) {
  if (!url || typeof url !== "string") return false;
  // if (url.startsWith("about:")) return false;
  return true;
};

NS.utils.canDiscard = function canDiscard(tab, keepTabId) {
  if (!tab.id || tab.id === keepTabId) return false;
  if (tab.active || tab.discarded || tab.pinned) return false;
  return true;
};
