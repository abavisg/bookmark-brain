# Phase 3: Bookmark Saving - Research

**Researched:** 2026-03-16
**Domain:** Chrome MV3 extension APIs — toolbar action, keyboard commands, badge UI, Dexie migration, React popup UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Popup Layout:**
- Save-focused: Popup shows current page state only — no list of saved bookmarks
- States: Two states based on whether current URL is already saved:
  - Unsaved: Save button (primary CTA)
  - Saved: "Saved" indicator + Unsave button (toggle)
- No bookmark list in popup: Popup is a focused action tool, not a library browser
- "View saved bookmarks" button: Always present in popup footer — opens dashboard in a new tab (not a side panel for v1)
- Processing status on cards: Deferred to Phase 5 — cards in this phase show static metadata only (title, URL, favicon, date)

**Save / Unsave Behavior:**
- Clicking toolbar on unsaved page: Saves immediately — no confirmation prompt
- Clicking toolbar on saved page: Unsaves immediately (deletes bookmark + logs it)
- Toggle is symmetric: Keyboard shortcut does the exact same toggle behavior as toolbar click
- Shortcut configurability: Default `Alt+Shift+S` (Windows/Linux) / `Option+Shift+S` (Mac) — user-remappable from `chrome://extensions/shortcuts`

**Visual Confirmation:**
- Badge: Set extension icon badge to "✓" briefly after save; clear after ~2s. Show on unsave too (or clear immediately).
- Toast: Show a toast inside the popup UI. When triggered by keyboard shortcut (popup not open), toast shows next time popup opens — badge is the primary real-time confirmation for shortcut triggers.
- Both badge + toast on every save/unsave action

**Keyboard Shortcut:**
- Default binding: `Alt+Shift+S` (declared in manifest `commands`)
- Same behavior as toolbar click: Toggles save/unsave
- Remappable: Via Chrome's built-in `chrome://extensions/shortcuts` — no custom settings UI needed in v1

**Deletion (Unsave):**
- Hard delete from `bookmarks` table — record is removed from Dexie
- Full record logged to a `deletedBookmarks` table in IndexedDB (Dexie) — same schema as `bookmarks` plus a `deletedAt` timestamp
- Log includes all fields: title, URL, favicon, tags, summary, entities, AI fields, original `createdAt`, and `deletedAt`
- Retention: Indefinite — no auto-expiry in v1
- View log: In the dashboard (Phase 6) — not in popup
- No restore UI in this phase — log is write-only for now

**Bookmark Card (Popup):**
- Fields displayed: Title, URL (truncated), favicon, date saved
- Width: Inherits `w-[380px]` popup width established in Phase 1
- No AI fields shown yet — those render in Phase 5
- Duplicate detection: `getBookmarkByUrl()` already checks — `alreadyExists: true` in `SAVE_BOOKMARK` response drives the "Saved" UI state

**SAVE_BOOKMARK Message Handler:**
- Already typed in `src/shared/types/messages.ts`: `{ url, title, favicon? }` → `{ bookmarkId, alreadyExists }`
- Handler goes in `src/background/index.ts` `onMessage` switch — `case 'SAVE_BOOKMARK':`
- Calls `addBookmark()` from `@/shared/db` (already exists from Phase 2)
- On duplicate: `getBookmarkByUrl()` finds existing record — return `{ bookmarkId: existing.id, alreadyExists: true }` without re-saving

### Claude's Discretion
- Exact toast component choice (shadcn/ui Sonner or custom — prefer Sonner if available)
- Badge color and display duration (suggest green badge "#22c55e", 2s timeout)
- Favicon fetching strategy (Google favicon API vs. `<link rel="icon">` scraping)
- File/module organization within `src/popup/` and `src/background/`
- Exact Dexie schema for `deletedBookmarks` table (add in new Dexie version migration)
- Test strategy for message handler (vitest-chrome mock pattern established in Phase 2)

### Deferred Ideas (OUT OF SCOPE)
- Processing status on bookmark cards (Phase 5)
- Dashboard deletion log UI (Phase 6)
- Shortcut remapping UI in settings (Chrome's built-in `chrome://extensions/shortcuts` handles this)
- Side panel instead of new tab for dashboard
- Export of deletion log
- Restore from deletion log UI
- Toast when popup is closed during keyboard shortcut trigger (badge is primary; toast shows on next popup open)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SAVE-01 | User can save the current page as a bookmark with one click from the extension toolbar | `chrome.action.onClicked` fires when toolbar icon clicked (popup is NOT opened when popup is the action — see Critical Finding below). Use named `SAVE_BOOKMARK` message sent from popup's save button click instead. |
| SAVE-02 | User sees visual confirmation (badge/toast) that a bookmark was saved | `chrome.action.setBadgeText` + `setBadgeBackgroundColor` callable from service worker; Sonner toast in popup React component |
| SAVE-03 | User can save a bookmark via keyboard shortcut | Named command `save-bookmark` in manifest + `chrome.commands.onCommand` listener in service worker (NOT `_execute_action` — see Critical Finding) |
| SAVE-04 | User is alerted when saving a page that is already bookmarked (duplicate detection) | `getBookmarkByUrl()` exists in Phase 2; `SAVE_BOOKMARK` response `alreadyExists: true` drives UI state |
| SAVE-05 | Bookmark card displays title, URL, favicon, and date saved | Popup React component renders card from `SAVE_BOOKMARK` response; favicon from Google S2 API |
</phase_requirements>

---

## Summary

Phase 3 wires together the save action (toolbar click and keyboard shortcut), the SAVE_BOOKMARK message handler in the service worker, the popup UI (save/unsave toggle), and the deletedBookmarks log. The data layer (Dexie, addBookmark, getBookmarkByUrl, deleteBookmark) and typed message bus are fully built from Phase 2 — this phase is primarily wiring and UI.

**Critical architectural finding:** Because the manifest defines `default_popup`, clicking the toolbar icon opens the popup — it does NOT fire `chrome.action.onClicked`. The save action therefore originates from a button click inside the popup that sends a `SAVE_BOOKMARK` message to the service worker. The keyboard shortcut must use a separate named command (e.g., `"save-bookmark"`) with `chrome.commands.onCommand` in the service worker, not `_execute_action`. This is the only architecture that achieves independent background save (without opening popup) for the shortcut.

**Primary recommendation:** Use two distinct trigger paths: (1) popup button → `sendMessage('SAVE_BOOKMARK')` → service worker handler, and (2) named command → `chrome.commands.onCommand` → service worker handler running the same save logic directly. Badge confirmation works from both paths. Toast is stored as pending state in `chrome.storage.local` and rendered by popup on open.

---

## Standard Stack

### Core (all already installed in Phase 1/2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.3.0 | IndexedDB — addBookmark, getBookmarkByUrl, deleteBookmark, deletedBookmarks log | Already the project's only DB layer |
| React 19 | 19.x | Popup UI — save/unsave toggle, bookmark card | Project framework |
| Tailwind CSS 4 + shadcn/ui | 4.x | Popup component styling | Established in Phase 1 |
| `chrome.action` API | MV3 built-in | Badge text/color, setBadgeBackgroundColor | Standard MV3 API |
| `chrome.commands` API | MV3 built-in | Named keyboard shortcut command | Standard MV3 API |
| `chrome.tabs` API | MV3 built-in | Get active tab URL + title from service worker | Standard MV3 API |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | via shadcn | Toast notifications in popup | Preferred toast — install with `pnpm dlx shadcn@latest add sonner` |
| dexie-react-hooks | 4.2.0 | `useLiveQuery` for reactive popup state | Use for reactive "is this URL saved?" check in popup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Google S2 favicon API | `<link rel="icon">` scraping via content script | S2 is zero-code, no permissions needed; scraping requires content script coordination |
| Named `commands.onCommand` for shortcut | `_execute_action` | `_execute_action` opens popup (not useful for background save); named command fires `onCommand` in service worker for direct background execution |
| Sonner toast | Custom toast | Sonner is already the shadcn/ui blessed component; custom means hand-rolling accessibility + animations |

**Installation:**
```bash
# sonner (toast) — if not already installed
pnpm dlx shadcn@latest add sonner
```

---

## Architecture Patterns

### Recommended Module Structure

```
src/
├── background/
│   └── index.ts              # Add: case 'SAVE_BOOKMARK', chrome.commands.onCommand listener
├── popup/
│   ├── App.tsx               # Replace placeholder with save/unsave UI
│   ├── hooks/
│   │   └── useCurrentTab.ts  # chrome.tabs.query({ active, currentWindow }) wrapper
│   └── components/
│       └── BookmarkCard.tsx  # Displays title, URL (truncated), favicon, date
├── shared/
│   ├── db/
│   │   ├── db.ts             # version(2) adds deletedBookmarks table
│   │   ├── deletedBookmarks.ts  # logDeletedBookmark() function
│   │   └── index.ts          # export logDeletedBookmark
│   └── types/
│       └── db.ts             # Add DeletedBookmark interface
└── test/
    └── setup.ts              # No changes needed
```

### Pattern 1: Two Save Trigger Paths

**What:** Toolbar click opens popup → user clicks Save button → popup sends `SAVE_BOOKMARK` message. Keyboard shortcut fires `commands.onCommand` → service worker saves directly (no popup).

**When to use:** Any extension with both a `default_popup` AND a background save shortcut — these are mutually exclusive trigger types.

```typescript
// src/background/index.ts — keyboard shortcut path
// Source: https://developer.chrome.com/docs/extensions/reference/api/commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.url || !tab?.title) return
    // call same save logic as SAVE_BOOKMARK handler
    await handleSaveBookmark({ url: tab.url, title: tab.title, favicon: tab.favIconUrl })
  }
})
```

```json
// manifest.json — commands section
// Source: https://developer.chrome.com/docs/extensions/reference/api/commands
"commands": {
  "save-bookmark": {
    "suggested_key": {
      "default": "Alt+Shift+S",
      "mac": "MacCtrl+Shift+S"
    },
    "description": "Save or unsave current page"
  }
}
```

**Note on Mac shortcut:** `Option+Shift+S` is written as `"mac": "MacCtrl+Shift+S"` or use `"Alt+Shift+S"` as the `"default"` which Chrome maps to Option on Mac. Verify: Chrome's shortcut syntax accepts `"Alt+Shift+S"` as the default and it becomes Option+Shift+S on Mac automatically.

### Pattern 2: Badge Confirmation from Service Worker

**What:** After save/unsave, set badge with `chrome.action.setBadgeText` + `chrome.action.setBadgeBackgroundColor`, then clear after 2s.

**When to use:** Immediate visual feedback — especially critical for shortcut trigger when popup is not open.

```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/action
async function showSaveBadge(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
  await chrome.action.setBadgeText({ text: '✓' })
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
  }, 2000)
}
```

**Limit:** Badge text should be 4 or fewer characters. A checkmark character ('✓') is 1 character — safe.

### Pattern 3: Toast Pending State for Keyboard Shortcut

**What:** When shortcut fires with popup closed, store a pending toast message in `chrome.storage.local`. Popup reads this on open, shows the toast, then clears it.

**When to use:** Deferred toast notification — popup is not always open when shortcut is pressed.

```typescript
// Service worker: after successful save via shortcut
await chrome.storage.local.set({ pendingToast: { message: 'Saved!', type: 'success' } })

// Popup App.tsx: on mount
useEffect(() => {
  chrome.storage.local.get(['pendingToast'], ({ pendingToast }) => {
    if (pendingToast) {
      toast.success(pendingToast.message)
      chrome.storage.local.remove('pendingToast')
    }
  })
}, [])
```

### Pattern 4: Dexie v2 Migration — deletedBookmarks Table

**What:** Add `deletedBookmarks` table in a new Dexie version block. Only the new table needs to be declared — existing stores are inherited.

```typescript
// Source: https://dexie.org/docs/Dexie/Dexie.version()
// db.ts — extend BookmarkBrainDB
export class BookmarkBrainDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>
  pageContent!: EntityTable<PageContent, 'id'>
  processingQueue!: EntityTable<ProcessingJob, 'id'>
  deletedBookmarks!: EntityTable<DeletedBookmark, 'id'>

  constructor(options?: { indexedDB?: IDBFactory; IDBKeyRange?: typeof IDBKeyRange }) {
    super('bookmark-brain', options)
    this.version(1).stores({
      bookmarks: '++id, &url, *tags, [status+createdAt], updatedAt, deviceId',
      pageContent: '++id, bookmarkId',
      processingQueue: '++id, bookmarkId, [status+nextRetryAt]',
    })
    this.version(2).stores({
      deletedBookmarks: '++id, url, deletedAt',
      // existing stores are NOT repeated — Dexie inherits them from version 1
    })
  }
}
```

**DeletedBookmark interface:**
```typescript
// src/shared/types/db.ts
export interface DeletedBookmark {
  id: number
  url: string
  title: string
  favicon?: string
  summary?: string
  tags: string[]
  entities?: string[]
  status: BookmarkStatus
  createdAt: number      // original bookmark createdAt
  updatedAt: number      // original bookmark updatedAt
  deviceId: string
  deletedAt: number      // epoch ms — when unsave happened
}
```

### Pattern 5: Popup Tab Detection

**What:** Popup reads active tab on mount using `chrome.tabs.query`.

**Permission note:** The manifest already has `activeTab` (grants temporary host permission on user gesture) and `https://*/*` + `http://*/*` host permissions. Combined, this is sufficient to read `tab.url` and `tab.title` when the popup opens via user click. The `tabs` permission is NOT in the manifest; the host permissions substitute.

```typescript
// src/popup/hooks/useCurrentTab.ts
import { useEffect, useState } from 'react'

export function useCurrentTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      setTab(activeTab ?? null)
    })
  }, [])

  return tab
}
```

**Restricted pages (chrome://, PDF):** `tab.url` and `tab.title` may be empty strings or undefined for `chrome://` pages — the host permissions only cover `https://*/*` and `http://*/*`. Always guard: `if (!tab?.url || tab.url.startsWith('chrome://')) { /* show graceful fallback */ }`. Success Criterion 5 says "A bookmark is saved (title + URL) even when the page cannot be read" — for `chrome://` pages, the URL will be inaccessible; the popup should still show a graceful "Cannot save this page" state.

### Pattern 6: Favicon via Google S2 API

**What:** Fetch a 32px favicon with no content script needed.

```typescript
// Source: confirmed pattern, widely used
function getFaviconUrl(pageUrl: string): string {
  const domain = new URL(pageUrl).hostname
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}
```

**Limitation:** Requires network access; falls back gracefully when offline (broken image). Favicon URL is stored as a string in the bookmark — no binary data in IndexedDB.

### Anti-Patterns to Avoid

- **Using `_execute_action` for save shortcut:** With `default_popup` set, `_execute_action` opens the popup instead of firing a service worker handler. Use a named command + `chrome.commands.onCommand` instead.
- **Calling `chrome.tabs.query` from content script:** Tabs API is not available in content scripts. Only service worker and extension pages (popup, dashboard) can use it.
- **Sending SAVE_BOOKMARK with favicon as binary:** Store the favicon URL string, not binary data. Binary favicons bloat IndexedDB and complicate migration.
- **Not clearing badge text after timeout:** If the badge is never cleared, it persists permanently — always schedule a `setTimeout` to clear it.
- **Calling `addBookmark` without checking duplicate first:** `addBookmark` will throw on duplicate URL (unique index). Always call `getBookmarkByUrl` first in the handler.
- **Omitting `logDeletedBookmark` before `deleteBookmark`:** The deletion log must be written before the record is deleted — otherwise data is lost on an error mid-operation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast overlay | Sonner (shadcn) | Accessibility, z-index stacking, animation, keyboard dismiss all handled |
| Badge display timeout | Manual timer tracking | `setTimeout` + `chrome.action.setBadgeText({ text: '' })` | Simplest correct approach — no library needed |
| Favicon fetching | Scraping `<link rel="icon">` via content script | Google S2 favicon API | Zero code, no permissions, works for 95%+ of sites |
| Keyboard shortcut UI | Custom hotkey remapper | Chrome's `chrome://extensions/shortcuts` | Platform-native, handles OS conflicts, no code needed |
| Reactive "is URL saved?" | Polling setInterval | `dexie-react-hooks` `useLiveQuery` | Reactive Dexie query; auto-updates on DB changes |

**Key insight:** The Chrome extension platform provides badge, commands, and tabs APIs — do not replicate these with content script message passing.

---

## Common Pitfalls

### Pitfall 1: `_execute_action` Silently Opens Popup Instead of Saving

**What goes wrong:** Developer declares `_execute_action` in manifest thinking it will trigger `chrome.action.onClicked` (background save). Instead, since `default_popup` is set, it just opens the popup — the `onClicked` event never fires.
**Why it happens:** Chrome docs state: "If the extension action has a popup, `chrome.action.onClicked` is not dispatched." The `_execute_action` command triggers the same behavior as clicking the icon.
**How to avoid:** Use a separate named command `"save-bookmark"` with `chrome.commands.onCommand` for background saves.
**Warning signs:** Save action only works when popup is manually opened; keyboard shortcut just opens popup with no save.

### Pitfall 2: `tab.url` Is Undefined for Restricted Pages

**What goes wrong:** `chrome.tabs.query` returns a tab object but `tab.url` is undefined or empty for `chrome://` pages, `file://` pages, and PDF viewer pages.
**Why it happens:** Host permissions (`https://*/*`, `http://*/*`) don't cover `chrome://` or `file://` schemes.
**How to avoid:** Always check `if (!tab?.url || !tab.url.startsWith('http'))` before attempting to save. Show a "Cannot save this page" state in the popup for restricted URLs.
**Warning signs:** Success Criterion 5 says the bookmark saves even on such pages — but this applies to pages where the title IS available (like PDF.js renders a title). For true `chrome://` pages, saving is not possible.

### Pitfall 3: Toast Not Visible When Shortcut Fires With Popup Closed

**What goes wrong:** Toast is called in service worker context where no DOM exists — `toast()` call is silently ignored.
**Why it happens:** Sonner's `toast()` is a DOM API; service workers have no DOM.
**How to avoid:** Store pending toast in `chrome.storage.local`; popup reads and displays it on mount.
**Warning signs:** Keyboard shortcut saves but no toast ever appears on next popup open.

### Pitfall 4: Duplicate Save Throws Instead of Returning `alreadyExists: true`

**What goes wrong:** `addBookmark()` throws a Dexie ConstraintError on duplicate URL (unique index `&url`). If this exception is not caught in the SAVE_BOOKMARK handler, the service worker returns no response.
**Why it happens:** `addBookmark()` calls `instance.bookmarks.add()` which throws on unique constraint violation.
**How to avoid:** In the `SAVE_BOOKMARK` handler, call `getBookmarkByUrl(url)` first. If found, return `{ bookmarkId: existing.id, alreadyExists: true }` without calling `addBookmark`.
**Warning signs:** Popup shows error state or no response on second save of same URL.

### Pitfall 5: Dexie v2 Migration Breaks Tests Using `createTestDb`

**What goes wrong:** Test that creates a `BookmarkBrainDB` via `createTestDb()` fails because version 2 migration runs against the fake-indexeddb and encounters schema issues.
**Why it happens:** `createTestDb()` uses a fresh `IDBFactory` per test — migration should be clean. But if `BookmarkBrainDB` constructor is broken (e.g., version definitions in wrong order), all tests fail.
**How to avoid:** Declare `version(1).stores(...)` before `version(2).stores(...)` in constructor. Test the migration explicitly with one new test in `db.test.ts` that verifies `deletedBookmarks` table exists.
**Warning signs:** All existing db tests fail after adding version 2 block.

### Pitfall 6: `onMessage` Handler Returns `false` for Async Cases

**What goes wrong:** The `onMessage` listener returns `false` (or nothing) synchronously — Chrome closes the message channel before the async handler resolves. The popup's `sendMessage` promise never resolves.
**Why it happens:** The existing `onMessage` switch already returns `false` at the bottom. `SAVE_BOOKMARK` is async — must return `true` to keep channel open.
**How to avoid:** Return `true` from the listener when handling `SAVE_BOOKMARK` asynchronously. Use `sendResponse` callback pattern (not a return value).
**Warning signs:** `sendMessage('SAVE_BOOKMARK')` promise hangs or rejects with "no response" error.

---

## Code Examples

### SAVE_BOOKMARK Handler in Service Worker

```typescript
// src/background/index.ts
// Source: Chrome MV3 onMessage async pattern
chrome.runtime.onMessage.addListener(
  (message: AppMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ alive: true })
        break
      case 'GET_STATUS':
        sendResponse({ version: chrome.runtime.getManifest().version })
        break
      case 'SAVE_BOOKMARK': {
        const { url, title, favicon } = message.payload
        handleSaveBookmark({ url, title, favicon })
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true  // CRITICAL: keep channel open for async response
      }
      default:
        break
    }
    return false
  },
)

async function handleSaveBookmark(payload: {
  url: string
  title: string
  favicon?: string
}): Promise<{ bookmarkId: number; alreadyExists: boolean }> {
  const existing = await getBookmarkByUrl(payload.url)
  if (existing) {
    await showSaveBadge()
    return { bookmarkId: existing.id, alreadyExists: true }
  }
  const deviceId = await getOrCreateDeviceId()
  const bookmarkId = await addBookmark({
    url: payload.url,
    title: payload.title,
    favicon: payload.favicon,
    tags: [],
    deviceId,
  })
  await showSaveBadge()
  return { bookmarkId, alreadyExists: false }
}
```

### Unsave (logDeletedBookmark + deleteBookmark)

```typescript
// src/shared/db/deletedBookmarks.ts
import type { BookmarkBrainDB } from '@/shared/db/db'
import { db as defaultDb } from '@/shared/db/db'
import type { Bookmark } from '@/shared/types/db'

export async function logDeletedBookmark(
  bookmark: Bookmark,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  await instance.deletedBookmarks.add({
    ...bookmark,
    deletedAt: Date.now(),
  })
}
```

Service worker unsave flow:
```typescript
// In UNSAVE_BOOKMARK handler (or shared with SAVE_BOOKMARK toggle):
const existing = await getBookmarkByUrl(url)
if (existing) {
  await logDeletedBookmark(existing)  // log first
  await deleteBookmark(existing.id)   // then delete
  await showUnsaveBadge()
}
```

### Popup Save Button

```typescript
// src/popup/App.tsx (simplified)
import { toast } from 'sonner'
import { sendMessage } from '@/shared/messages/bus'

const handleSave = async () => {
  const response = await sendMessage({
    type: 'SAVE_BOOKMARK',
    payload: { url: tab.url, title: tab.title, favicon: faviconUrl },
  })
  if (response.alreadyExists) {
    toast.info('Already saved')
  } else {
    toast.success('Saved!')
  }
  setSaved(true)
}
```

### Manifest Commands Section

```json
"commands": {
  "save-bookmark": {
    "suggested_key": {
      "default": "Alt+Shift+S"
    },
    "description": "Save or unsave current page as bookmark"
  }
}
```

Chrome automatically maps `Alt` to `Option` on macOS. The key `"mac"` override is only needed if you want a different binding on Mac.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.browserAction` (MV2) | `chrome.action` (MV3) | MV3 (Chrome 88+) | Single unified API; project is already MV3 |
| `background.html` persistent pages | Service worker (MV3) | MV3 | Service workers terminate — badge/alarm APIs handle persistence |
| `chrome.tabs` permission required for tab URL | `activeTab` + host permissions sufficient | MV3 | No permission warning shown to user |
| Callbacks-only Chrome APIs | Promises supported | Chrome 88+ | Async/await works natively |

**Deprecated/outdated:**
- `chrome.browserAction.setBadgeText`: Removed in MV3 — use `chrome.action.setBadgeText`
- Returning response directly from async `onMessage` handlers: Never worked — must use `sendResponse` callback + `return true`

---

## Open Questions

1. **Mac keyboard shortcut — `Alt+Shift+S` vs `MacCtrl+Shift+S`**
   - What we know: Chrome accepts `"Alt+Shift+S"` as `"default"` and maps Alt→Option on Mac automatically
   - What's unclear: Whether `Alt+Shift+S` conflicts with any standard Mac system shortcut
   - Recommendation: Use `"default": "Alt+Shift+S"` only. If conflict is found during manual testing, add `"mac"` override. The Chrome shortcut settings page lets users remap anyway.

2. **`chrome://` and `file://` page save behavior**
   - What we know: Host permissions cover only `https://` and `http://` — `tab.url` will be empty or undefined for restricted pages
   - What's unclear: Does `tab.title` populate for PDF pages viewed via Chrome's built-in PDF viewer?
   - Recommendation: Guard on `!tab?.url?.startsWith('http')`. Show "Cannot save this page" for restricted pages. The Success Criterion 5 interpretation is: save works for pages that ARE readable but may have no content script access (SPAs, paywalls) — not for `chrome://` system pages.

3. **Sonner in popup — z-index stacking**
   - What we know: Popup is a fixed 380px window; Sonner renders a portal at document root
   - What's unclear: Whether Sonner's default z-index (9999) works correctly in Chrome extension popup's constrained DOM
   - Recommendation: Install Sonner and test manually in a loaded extension. If z-index issues arise, configure `<Toaster />` with explicit `style={{ zIndex: 9999 }}` prop.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + Testing Library |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:run` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAVE-01 | Toolbar click → popup save button → SAVE_BOOKMARK message → bookmark added to DB | unit (handler) | `pnpm test:run -- --reporter=verbose src/background/` | ❌ Wave 0 |
| SAVE-02 | Badge set after save; cleared after 2s | unit (mocked chrome.action) | `pnpm test:run -- --reporter=verbose src/background/` | ❌ Wave 0 |
| SAVE-03 | Named command `save-bookmark` → onCommand → bookmark added | unit (mocked chrome.commands) | `pnpm test:run -- --reporter=verbose src/background/` | ❌ Wave 0 |
| SAVE-04 | Duplicate URL → `alreadyExists: true` returned, no second DB entry | unit (handler + real fake-indexeddb) | `pnpm test:run -- --reporter=verbose src/background/` | ❌ Wave 0 |
| SAVE-05 | Popup renders bookmark card with title, URL, favicon, date | unit (React Testing Library) | `pnpm test:run -- --reporter=verbose src/popup/` | ❌ Wave 0 (App.test.tsx exists but tests placeholder) |

### Sampling Rate

- **Per task commit:** `pnpm test:run`
- **Per wave merge:** `pnpm test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/background/saveBookmark.test.ts` — covers SAVE-01, SAVE-02, SAVE-03, SAVE-04 (handler + badge + shortcut)
- [ ] `src/shared/db/deletedBookmarks.test.ts` — covers logDeletedBookmark behavior
- [ ] `src/popup/App.test.tsx` — extend existing file to cover SAVE-05 (bookmark card render)
- [ ] `src/shared/db/db.ts` — Dexie v2 migration test: verify `deletedBookmarks` table exists post-migration

---

## Sources

### Primary (HIGH confidence)
- [chrome.action API — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/action) — setBadgeText, setBadgeBackgroundColor, setBadgeTextColor parameters and service worker availability
- [chrome.commands API — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/commands) — Named commands vs _execute_action, onCommand event, manifest syntax
- [chrome.tabs API — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/tabs) — Permission model, activeTab vs tabs permission, url/title availability
- [Dexie version() docs](https://dexie.org/docs/Dexie/Dexie.version()) — Schema migration, version(2).stores() pattern

### Secondary (MEDIUM confidence)
- [shadcn/ui Sonner docs](https://ui.shadcn.com/docs/components/radix/sonner) — Installation (`pnpm dlx shadcn@latest add sonner`), Toaster placement, `toast()` API — verified via official shadcn site
- [Dexie Issue #661](https://github.com/dfahlander/Dexie.js/issues/661) — Confirmed: only new/changed stores need to be declared in version(N), existing stores inherited
- Chrome extensions community discussion — confirmed `_execute_action` opens popup (not `onClicked`) when `default_popup` is set

### Tertiary (LOW confidence)
- Community reports on `chrome://` page URL access — behavior observed but not formally documented; treat as implementation assumption requiring manual verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; Chrome APIs are stable MV3
- Architecture: HIGH — SAVE_BOOKMARK handler pattern, Dexie migration, badge API all verified against official docs
- Pitfalls: HIGH — `_execute_action` vs named command distinction is the most dangerous trap; verified via official Chrome docs
- Sonner z-index in popup: MEDIUM — theoretically fine, needs manual extension load test

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (Chrome MV3 APIs are stable; Dexie 4.x is stable; Sonner is stable)
