---
phase: 03-bookmark-saving
plan: "00"
subsystem: testing
tags: [vitest, tdd, dexie, chrome-extension, bookmark-saving]

# Dependency graph
requires:
  - phase: 02-data-layer
    provides: createTestDb, addBookmark, deleteBookmark, BookmarkBrainDB, vitest-chrome setup pattern

provides:
  - Failing (RED) test scaffolds for all Phase 3 implementation tasks
  - saveBookmark.test.ts — 7 test cases for handleSaveBookmark, showSaveBadge/showUnsaveBadge, keyboard shortcut
  - deletedBookmarks.test.ts — 4 test cases for logDeletedBookmark and Dexie v2 migration
  - App.test.tsx (popup) — 5 test cases for save/unsave UI, BookmarkCard, footer, chrome:// guard

affects: [03-bookmark-saving plan 01, 03-bookmark-saving plan 02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD red-phase scaffolds: test files import not-yet-existing modules to guarantee RED state"
    - "createTestDb() per-test DB injection (continued from Phase 2)"
    - "vitest-chrome globalThis.chrome mock for chrome.action.setBadgeText / chrome.tabs.query"
    - "handleSaveBookmark accepts optional dbInstance param for test injection"

key-files:
  created:
    - src/background/saveBookmark.test.ts
    - src/shared/db/deletedBookmarks.test.ts
  modified:
    - src/popup/App.test.tsx

key-decisions:
  - "Tests import not-yet-existing modules — RED state is enforced by import resolution failure, not by assertion failure"
  - "App.test.tsx placeholder tests replaced — old tests tested a placeholder component that Plan 02 will replace anyway"
  - "handleSaveBookmark signature accepts optional dbInstance for injection — mirrors existing addBookmark/deleteBookmark pattern"
  - "logDeletedBookmark uses write-before-delete pattern — test verifies ordering contract for Plan 01 implementor"

patterns-established:
  - "TDD red-phase: import from nonexistent module guarantees RED without needing a stub"
  - "deletedBookmarks table tested via createTestDb() — Dexie v2 migration must add the table or DB tests fail"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 3 Plan 00: Test Scaffolds Summary

**TDD Wave 0 scaffolds — 16 failing tests across 3 files define the full bookmark-saving contract before any implementation exists**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-16T14:07:37Z
- **Completed:** 2026-03-16T14:10:37Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- Created `src/background/saveBookmark.test.ts` with 7 test cases covering SAVE-01 through SAVE-04 (new-save, duplicate detection, badge confirmation, keyboard shortcut, chrome:// guard)
- Created `src/shared/db/deletedBookmarks.test.ts` with 4 test cases verifying Dexie v2 migration (deletedBookmarks table), logDeletedBookmark field preservation, createdAt retention, and write-before-delete ordering
- Replaced placeholder `src/popup/App.test.tsx` with 5 test cases covering SAVE-05 popup states (unsaved/saved BookmarkCard, Unsave button, footer link, chrome:// guard)

## Task Commits

Each task was committed atomically:

1. **Task 1: saveBookmark.test.ts** - `5fbcc4c` (test)
2. **Task 2: deletedBookmarks.test.ts** - `e77d4de` (test)
3. **Task 3: App.test.tsx overwrite** - `cf9b4a8` (test)
4. **Lint fixes** - `1bf62e7` (fix — Rule 1: auto-fixed Biome style issues in test code I wrote)

## Files Created/Modified

- `src/background/saveBookmark.test.ts` — RED tests for handleSaveBookmark (SAVE-01 through SAVE-04), showSaveBadge, showUnsaveBadge, keyboard shortcut handler
- `src/shared/db/deletedBookmarks.test.ts` — RED tests for logDeletedBookmark and Dexie v2 deletedBookmarks migration
- `src/popup/App.test.tsx` — RED tests for popup save/unsave UI and BookmarkCard (SAVE-05); placeholder tests removed

## Decisions Made

- Tests import from non-existing modules (`@/background/saveBookmark`, `@/shared/db/deletedBookmarks`) — this guarantees RED state at import resolution time, not just at assertion time
- Replaced all placeholder App.test.tsx tests — the old tests tested a placeholder component that Plan 02 will completely replace; keeping them would create a confusing mixed state
- `handleSaveBookmark` test signature uses `optional dbInstance` parameter — mirrors the `addBookmark`/`deleteBookmark` injection pattern established in Phase 2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome lint errors in test files I wrote**
- **Found during:** Post-task lint check (before SUMMARY creation)
- **Issue:** `noNonNullAssertion` violations (`tab!.url!`) and `useOptionalChain` in saveBookmark.test.ts; import ordering in deletedBookmarks.test.ts; formatter differences
- **Fix:** Replaced `tab!.url!` with `tab?.url ?? ''`, applied `?.startsWith()` chain, reordered imports, ran `pnpm format`
- **Files modified:** `src/background/saveBookmark.test.ts`, `src/shared/db/deletedBookmarks.test.ts`
- **Verification:** `pnpm lint` exits 0 after fix
- **Committed in:** `1bf62e7`

---

**Total deviations:** 1 auto-fixed (Rule 1 — style/lint)
**Impact on plan:** No scope change. Fixes were cosmetic style corrections to code I wrote.

## Issues Encountered

None — all three test files in RED state as required by TDD wave 0 discipline.

## Next Phase Readiness

- All Wave 1 implementation tasks (Plan 01) now have pre-existing verify commands pointing to `saveBookmark.test.ts` and `deletedBookmarks.test.ts`
- All Wave 2 popup tasks (Plan 02) have pre-existing verify commands pointing to `App.test.tsx`
- Dexie v2 schema migration test is the first thing Plan 01 must make GREEN (table must exist in `BookmarkBrainDB.version(2)`)
- No blockers

## Self-Check: PASSED

All 3 test files present. All 4 commits verified.

---
*Phase: 03-bookmark-saving*
*Completed: 2026-03-16*
