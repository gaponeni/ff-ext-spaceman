# Space Manager

Space Manager is a Firefox WebExtension that treats **Container Tabs** as workspace-like Spaces.

## What it does

- Reads Spaces directly from Firefox containers (`contextualIdentities`).
- Provides `No Space (default)` plus all existing containers in the toolbar popup.
- Switches Space per browser window:
  - shows tabs of the selected Space,
  - hides tabs from other Spaces,
  - discards hidden tabs (best effort) to reduce memory usage.
- Remembers the last active tab per Space and window.
- Keeps tab groups isolated by Space and restores group metadata when returning.
- Colors the toolbar icon background based on the active Space color.
- Automatically moves newly created default-store tabs into the active Space or opener container when possible.

## Private browsing

- Space Manager can run in private windows without persisting private browsing data to `storage.local`.
- Private-window state is kept in memory for the current private session only.
- Closing a private window clears its remembered active Space, last-tab state, and tab-group snapshots.

## Automatic tab behavior

- When you switch Spaces, the extension shows tabs that belong to the selected container and hides tabs from other containers in the same window.
- Hidden tabs may be discarded on a best-effort basis to reduce memory usage.
- When Firefox creates a new tab in the default cookie store while a Space is active, the extension may recreate that tab inside the active container and close the original tab so the window stays aligned with the current Space.

## Source of truth

There is no separate Space CRUD in the extension.

- Create, rename, and delete containers in Firefox settings.
- Space Manager reflects those container changes automatically.
- The extension does not create or manage its own separate container records.

## Project structure

- `background/core/*`: shared namespace, constants, utility helpers
- `background/storage/*`: local state storage
- `background/services/*`: core business logic (spaces, switching, icon rendering)
- `background/controllers/*`: browser event and runtime message handling
- `background.js`: dependency wiring (composition root)
- `popup/*`: toolbar popup UI

## Local run (temporary add-on)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `manifest.json`

## License

MIT.

## References

- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [MDN contextualIdentities API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/contextualIdentities)
- [MDN tabs.hide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/hide)
- [MDN tabs.discard](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/discard)
