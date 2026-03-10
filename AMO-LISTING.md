## Summary

Space Manager turns Firefox Container Tabs into workspace-like Spaces per browser window.

The add-on reads available containers from Firefox, lets the user switch the active Space from the toolbar popup, shows tabs that belong to the selected Space, and hides tabs from other Spaces in the same window.

## What The Add-on Does

- Reads Firefox container identities and lists them in the toolbar popup.
- Tracks the active Space per window.
- Shows tabs that belong to the selected container and hides tabs from other containers in the same window.
- Discards hidden tabs on a best-effort basis to reduce memory usage.
- Restores the last active tab for a Space when the user switches back.
- Preserves tab-group membership per Space when tab groups are supported.
- Recreates some newly opened default-store tabs inside the active container so the current window stays aligned with the selected Space.

## Permissions Explanation

- `tabs`: required to query, activate, create, remove, hide, show, and discard tabs while switching Spaces.
- `tabHide`: required to hide tabs that belong to non-active Spaces.
- `tabGroups`: required to preserve and restore tab-group state per Space.
- `storage`: required to remember the active Space, last active tab, and tab-group snapshots for normal windows.
- `contextualIdentities`: required to read Firefox Container Tabs and map Spaces to Firefox cookie stores.
- `cookies`: required for Firefox container/cookie-store integration. The add-on uses container identity and cookie-store routing for tabs. It does not read cookie values for tracking or transmit cookie data to remote servers.

## Privacy Behavior

- The add-on does not send browsing data, cookies, or tab metadata to remote servers.
- The add-on does not load or execute remote code.
- Private browsing state is not persisted to `storage.local`.
- In private windows, active Space state, last-tab state, and tab-group snapshots are kept in memory only for the current private session.

## Reviewer Notes

- Space Manager is a local-only WebExtension with no remote network requests in extension code.
- The `cookies` permission is used to support Firefox container/cookie-store behavior rather than to inspect or exfiltrate cookie contents.
- The add-on's tab recreation behavior is limited to keeping newly created tabs aligned with the active container Space in the current window.
