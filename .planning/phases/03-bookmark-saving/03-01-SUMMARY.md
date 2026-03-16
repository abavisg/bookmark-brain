---
phase: 03-bookmark-saving
plan: "01"
subsystem: database
tags: [dexie, indexeddb, chrome-extension, mv3, tdd, vitest]

# Dependency graph
requires:
  - phase: 03-00
    provides: RED test scaffolds for saveBookmark and deletedBookmarks

provides:
  - DeletedBookmark interface in src/shared/types/db.ts
  - Dexie v2 migration adding deletedBookmarks table
  - logDeletedBookmark() function in src/shared/db/deletedBookmarks.ts
  - handleSaveBookmark() / handleUnsaveBookmark() in src/background/saveBookmark.ts
  - showSaveBadge() / showUnsaveBadge() badge helpers
  - SAVE_BOOKMARK message case in service worker onMessage
  - chrome.commands.onCommand listener for keyboard shortcut
  - Alt+Shift+S keyboard shortcut declared in manifest.json
  - chrome.action mock + storage.local stub in test setup

affects:
  - 03-02 (popup UI wires to handleSaveBookmark via SAVE_BOOKMARK message)
  - 05 (AI pipeline uses bookmarks added by handleSaveBookmark)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional dbInstance injection for testability (established in Phase 2, extended here)
    - Write-before-delete pattern for soft-delete audit log (logDeletedBookmark before deleteBookmark)
    - chrome.action mock added to test setup for MV3 badge API (vitest-chrome only has browserAction)

key-files:
  created:
    - src/shared/db/deletedBookmarks.ts
    - src/background/saveBookmark.ts
  modified:
    - src/shared/types/db.ts
    - src/shared/db/db.ts
    - src/shared/db/index.ts
    - src/background/index.ts
    - manifest.json
    - src/test/setup.ts

key-decisions:
  - "chrome.action mock added to test setup because vitest-chrome@0.1.0 only provides browserAction (MV3 action API absent)"
  - "chrome.storage.local.get/set callbacks stubbed in setup.ts so getOrCreateDeviceId() resolves immediately in tests"
  - "logDeletedBookmark omits id from spread (uses { id: _id, ...rest }) to avoid Dexie auto-increment collision"
  - "handleSaveBookmark silently returns { bookmarkId: 0, alreadyExists: false } for non-http URLs without error or badge"

patterns-established:
  - "Write-before-delete: logDeletedBookmark called BEFORE deleteBookmark for safe audit trail"
  - "Optional dbInstance injection on handleSaveBookmark/handleUnsaveBookmark follows established db module pattern"

requirements-completed: [SAVE-01, SAVE-02, SAVE-03, SAVE-04]

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 3 Plan 01: Bookmark Saving Backend Summary

**Dexie v2 migration with deletedBookmarks table, logDeletedBookmark write-before-delete helper, and handleSaveBookmark/handleUnsaveBookmark service worker functions with badge feedback and Alt+Shift+S keyboard shortcut**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-16T14:13:48Z
- **Completed:** 2026-03-16T14:19:45Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments

- DeletedBookmark type + Dexie v2 migration making deletedBookmarks table available
- logDeletedBookmark() preserving full bookmark record before deletion (write-before-delete)
- handleSaveBookmark() with duplicate detection, badge feedback, and chrome:// URL guard
- handleUnsaveBookmark() calling logDeletedBookmark before delete with unsave badge
- Service worker wired: SAVE_BOOKMARK message case + chrome.commands.onCommand listener
- manifest.json commands section with Alt+Shift+S binding
- Test infrastructure fixed: chrome.action mock + storage stub for MV3 test compatibility

## Task Commits

1. **Task 1: Add DeletedBookmark type and Dexie v2 migration** - `872b9ca` (feat)
2. **Task 2: Implement save/unsave logic and wire service worker** - `8b51526` (feat)

## Files Created/Modified

- `src/shared/types/db.ts` - Added DeletedBookmark interface (all Bookmark fields + deletedAt: number)
- `src/shared/db/db.ts` - Added deletedBookmarks table property + version(2) migration
- `src/shared/db/deletedBookmarks.ts` - Created: logDeletedBookmark() with optional dbInstance injection
- `src/shared/db/index.ts` - Added logDeletedBookmark export
- `src/background/saveBookmark.ts` - Created: handleSaveBookmark, handleUnsaveBookmark, showSaveBadge, showUnsaveBadge
- `src/background/index.ts` - Added SAVE_BOOKMARK case + chrome.commands.onCommand listener
- `manifest.json` - Added commands section with save-bookmark / Alt+Shift+S
- `src/test/setup.ts` - Added chrome.action mock + chrome.storage.local callback stubs

## Decisions Made

- **chrome.action mock in setup.ts:** vitest-chrome@0.1.0 only exposes `browserAction` (MV2). MV3 `action` API is absent, causing `chrome.action is undefined` at test runtime. Added explicit `vi.fn()` mock for the full action API surface.
- **storage.local stubs in setup.ts:** `getOrCreateDeviceId()` uses callback-style `chrome.storage.local.get()`. The vi.fn() default returns undefined without calling the callback, causing 5s test timeouts. Stubbing to auto-call callback with `{}` resolves this for all tests.
- **id omitted from deletedBookmarks.add spread:** Dexie `++id` on deletedBookmarks assigns a new auto-incremented id. Spreading the original bookmark's id would conflict. Using destructuring `{ id: _id, ...rest }` omits it safely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added chrome.action mock to test setup**
- **Found during:** Task 2 (saveBookmark implementation)
- **Issue:** vitest-chrome@0.1.0 only includes `browserAction` (MV2 API), not `action` (MV3). Tests using `chrome.action.setBadgeText` threw `TypeError: Cannot read properties of undefined (reading 'setBadgeText')`.
- **Fix:** Extended `src/test/setup.ts` to add `chrome.action` object with `vi.fn()` mocks for all badge/icon/popup methods.
- **Files modified:** src/test/setup.ts
- **Verification:** showSaveBadge / showUnsaveBadge tests pass; chrome.action.setBadgeText assertions succeed.
- **Committed in:** 8b51526 (Task 2 commit)

**2. [Rule 3 - Blocking] Stubbed chrome.storage.local callbacks in test setup**
- **Found during:** Task 2 (handleSaveBookmark tests timing out at 5s)
- **Issue:** `getOrCreateDeviceId()` calls `chrome.storage.local.get(key, callback)`. The vi.fn() mock never invoked the callback, hanging the Promise indefinitely.
- **Fix:** Added `mockImplementation` on `chrome.storage.local.get` and `.set` in setup.ts to call callbacks immediately with empty results.
- **Files modified:** src/test/setup.ts
- **Verification:** SAVE-01, SAVE-02, SAVE-03, SAVE-04 tests resolve in <100ms instead of timing out.
- **Committed in:** 8b51526 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking test infrastructure gaps)
**Impact on plan:** Both fixes were necessary to make tests runnable. No scope creep — no production code changed.

## Issues Encountered

- Import order lint error in saveBookmark.ts (Biome organizeImports) — resolved via `pnpm format`
- Long-line formatting in index.ts — resolved via `pnpm format`

## Next Phase Readiness

- Backend fully implemented: handleSaveBookmark and handleUnsaveBookmark ready for popup wiring
- SAVE_BOOKMARK message case live in service worker — popup can sendMessage immediately
- deletedBookmarks table available for future audit/restore features
- popup/App.test.tsx has 5 RED tests for Plan 02 (expected, not a blocker)

---
*Phase: 03-bookmark-saving*
*Completed: 2026-03-16*
