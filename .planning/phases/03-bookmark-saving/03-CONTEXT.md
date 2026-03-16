# Phase 3: Bookmark Saving - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Toolbar button + keyboard shortcut that toggles save/unsave on the current page. Visual confirmation (badge + toast in popup). Duplicate detection shows "Saved" state with unsave toggle. Bookmark card in popup showing title, URL, favicon, date. "View saved bookmarks" button opens dashboard in new tab. Soft-delete with full-record log stored in IndexedDB. No bookmark list in popup — popup is a focused save/unsave tool only.

</domain>

<decisions>
## Implementation Decisions

### Popup Layout
- **Save-focused:** Popup shows current page state only — no list of saved bookmarks
- **States:** Two states based on whether current URL is already saved:
  - **Unsaved:** Save button (primary CTA)
  - **Saved:** "Saved" indicator + Unsave button (toggle)
- **No bookmark list in popup:** Popup is a focused action tool, not a library browser
- **"View saved bookmarks" button:** Always present in popup footer — opens dashboard in a new tab (not a side panel for v1)
- **Processing status on cards:** Deferred to Phase 5 — cards in this phase show static metadata only (title, URL, favicon, date)

### Save / Unsave Behavior
- **Clicking toolbar on unsaved page:** Saves immediately — no confirmation prompt
- **Clicking toolbar on saved page:** Unsaves immediately (deletes bookmark + logs it)
- **Toggle is symmetric:** Keyboard shortcut does the exact same toggle behavior as toolbar click
- **Shortcut configurability:** Default `Alt+Shift+S` (Windows/Linux) / `Option+Shift+S` (Mac) — user-remappable from the extension's keyboard shortcuts page (`chrome://extensions/shortcuts`). Note: Chrome's built-in shortcut remapping UI handles this; the manifest just declares the command.

### Visual Confirmation (Both Toolbar Click AND Keyboard Shortcut)
- **Badge:** Set extension icon badge to "✓" (or "1") briefly after save; clear after ~2s. Show on unsave too (or clear immediately).
- **Toast:** Show a toast inside the popup UI. When triggered by keyboard shortcut (popup not open), the toast is shown next time the popup opens — badge is the primary real-time confirmation for shortcut triggers.
- **Both badge + toast** on every save/unsave action

### Keyboard Shortcut
- **Default binding:** `Alt+Shift+S` (declared in manifest `commands`)
- **Same behavior as toolbar click:** Toggles save/unsave
- **Remappable:** Via Chrome's built-in `chrome://extensions/shortcuts` — no custom settings UI needed in v1

### Deletion (Unsave)
- **Hard delete from `bookmarks` table** — record is removed from Dexie
- **Full record logged** to a `deletedBookmarks` table in IndexedDB (Dexie) — same schema as `bookmarks` plus a `deletedAt` timestamp
- **Log includes all fields:** title, URL, favicon, tags, summary, entities, AI fields, original `createdAt`, and `deletedAt`
- **Retention:** Indefinite — no auto-expiry in v1
- **View log:** In the dashboard (Phase 6) — not in popup
- **No restore UI in this phase** — log is write-only for now; export potential noted for future

### Bookmark Card (Popup)
- **Fields displayed:** Title, URL (truncated), favicon, date saved
- **Width:** Inherits `w-[380px]` popup width established in Phase 1
- **No AI fields shown yet** — those render in Phase 5
- **Duplicate detection:** `getBookmarkByUrl()` already checks — `alreadyExists: true` in `SAVE_BOOKMARK` response drives the "Saved" UI state

### SAVE_BOOKMARK Message Handler
- **Already typed** in `src/shared/types/messages.ts`: `{ url, title, favicon? }` → `{ bookmarkId, alreadyExists }`
- **Handler goes in** `src/background/index.ts` `onMessage` switch — `case 'SAVE_BOOKMARK':`
- **Calls** `addBookmark()` from `@/shared/db` (already exists from Phase 2)
- **On duplicate:** `getBookmarkByUrl()` finds existing record — return `{ bookmarkId: existing.id, alreadyExists: true }` without re-saving

### Claude's Discretion
- Exact toast component choice (shadcn/ui Sonner or custom — prefer Sonner if available)
- Badge color and display duration (suggest green badge "#22c55e", 2s timeout)
- Favicon fetching strategy (Google favicon API vs. `<link rel="icon">` scraping)
- File/module organization within `src/popup/` and `src/background/`
- Exact Dexie schema for `deletedBookmarks` table (add in new Dexie version migration)
- Test strategy for message handler (vitest-chrome mock pattern established in Phase 2)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/messages/bus.ts` — `sendMessage<T>()` typed wrapper. Popup uses this to send `SAVE_BOOKMARK` to service worker.
- `src/shared/types/messages.ts` — `SAVE_BOOKMARK` and `PROCESSING_STATUS` already typed. `AppResponse<T>` returns `{ bookmarkId, alreadyExists }`.
- `src/shared/db/index.ts` — `addBookmark()`, `getBookmarkByUrl()`, `deleteBookmark()` all exported and tested.
- `src/background/index.ts` — `onMessage` switch already handles `PING` and `GET_STATUS`. Phase 3 adds `SAVE_BOOKMARK` case.
- `src/popup/App.tsx` — Current placeholder (`w-[380px]`, dark mode ready). Phase 3 replaces content.
- `src/content/index.ts` — Bare content script, just logs. Phase 3 may extend if tab metadata extraction needed.
- `manifest.json` — No `commands` section yet. Phase 3 adds `_execute_action` + custom save command.

### Established Patterns
- Biome: 2-space indent, single quotes, no semicolons
- Path alias `@/` → `src/`
- `sendMessage()` pattern: popup sends → service worker responds
- `createTestDb()` + `dbInstance` injection for all DB tests
- `vitest-chrome` global chrome mock via `setup.ts`

### Integration Points
- `src/background/index.ts`: Add `case 'SAVE_BOOKMARK':` handler
- `src/shared/db/db.ts`: Add `deletedBookmarks` table in new Dexie version (schema migration)
- `manifest.json`: Add `commands` section for keyboard shortcut
- `src/popup/App.tsx`: Replace placeholder with save/unsave UI

</code_context>

<specifics>
## Specific Ideas

- Keyboard shortcut: `"Alt+Shift+S"` in manifest `commands` — Chrome handles Mac/Windows mapping automatically
- Badge: `chrome.action.setBadgeText({ text: '✓' })` + `chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })` — clear after 2s via `setTimeout`
- Favicon: Try `https://www.google.com/s2/favicons?domain=${domain}&sz=32` as the simplest approach — no content script needed
- deletedBookmarks Dexie migration: bump schema version to `2`, add `deletedBookmarks: '++id, url, deletedAt'`
- Tab metadata: `chrome.tabs.query({ active: true, currentWindow: true })` in service worker — gets URL and title without content script
- `getBookmarkByUrl()` already exists — use it in the `SAVE_BOOKMARK` handler to detect duplicates before calling `addBookmark()`

</specifics>

<deferred>
## Deferred Ideas

- Processing status on bookmark cards (Phase 5)
- Dashboard deletion log UI (Phase 6)
- Shortcut remapping UI in settings (Chrome's built-in `chrome://extensions/shortcuts` handles this)
- Side panel instead of new tab for dashboard (user mentioned Chrome's Reading List style — possible future enhancement)
- Export of deletion log (mentioned by user as future possibility)
- Restore from deletion log UI (user acknowledged: log is write-only in v1)
- Toast when popup is closed during keyboard shortcut trigger (badge is primary; toast shows on next popup open)

</deferred>

---

*Phase: 03-bookmark-saving*
*Context gathered: 2026-03-16*
