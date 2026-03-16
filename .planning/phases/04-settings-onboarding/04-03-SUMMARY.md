---
phase: 04-settings-onboarding
plan: 03
subsystem: ui
tags: [react, chrome-extension, popup, storage, onboarding]

# Dependency graph
requires:
  - phase: 04-settings-onboarding/04-01
    provides: bbHasApiKey boolean in chrome.storage.local, settings handlers
  - phase: 04-settings-onboarding/04-02
    provides: dashboard Settings tab at #settings hash route
provides:
  - useHasApiKey hook with chrome.storage.onChanged reactive listener
  - Popup onboarding banner that shows/hides based on API key state
  - Gear icon in popup header opening dashboard to #settings
affects:
  - 05-ai-processing-pipeline
  - future popup features

# Tech tracking
tech-stack:
  added: ["@testing-library/user-event 14.6.1"]
  patterns: ["chrome.storage.onChanged listener with cleanup in useEffect"]

key-files:
  created:
    - src/popup/hooks/useHasApiKey.ts
  modified:
    - src/popup/App.tsx
    - src/popup/App.test.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "useHasApiKey reads only bbHasApiKey boolean, never bbApiKeySecret — security boundary enforced by hook API"
  - "Banner uses soft gate pattern — Save button remains fully functional regardless of API key state"
  - "chrome.storage.onChanged listener in useEffect with cleanup ensures no memory leaks and reactive updates from dashboard"
  - "@testing-library/user-event installed (Rule 3 auto-fix) — required for click interaction tests on gear icon and banner CTA"

patterns-established:
  - "Storage-reactive hook pattern: useEffect reads initial value + subscribes to onChanged, cleanup removes listener"
  - "Soft gate UX: show guidance banner without blocking functionality"

requirements-completed: [SET-01, SET-03]

# Metrics
duration: ~6min
completed: 2026-03-16
---

# Phase 4 Plan 03: Popup Onboarding Banner Summary

**useHasApiKey hook with chrome.storage.onChanged reactive listener, amber banner in popup when no API key configured, gear icon opening dashboard #settings — 85 tests green**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-16T20:30:14Z
- **Completed:** 2026-03-16T20:32:10Z
- **Tasks:** 1/2 complete (Task 2 is checkpoint:human-verify — awaiting manual verification)
- **Files modified:** 5

## Accomplishments
- Created `useHasApiKey` hook that reads `bbHasApiKey` from `chrome.storage.local` and subscribes to `chrome.storage.onChanged` for real-time updates
- Added amber onboarding banner to popup that shows "Add API key to enable AI features" with "Set up now" CTA when no API key is configured
- Added gear icon button (Settings) to popup header that opens dashboard to `#settings` hash route
- Save button remains fully functional regardless of API key state (soft gate per CONTEXT.md)
- 7 new popup tests covering: gear icon render, gear icon click, banner show/hide, banner CTA click, soft gate

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useHasApiKey hook, add gear icon and banner to popup, update tests** - `06f1d7a` (feat)

**Plan metadata:** TBD (docs: complete plan — after human verification)

## Files Created/Modified
- `src/popup/hooks/useHasApiKey.ts` - Hook reading bbHasApiKey with chrome.storage.onChanged listener
- `src/popup/App.tsx` - Added Settings gear icon to header, onboarding banner, useHasApiKey integration
- `src/popup/App.test.tsx` - Added 7 new tests for gear icon and banner behavior (13 total)
- `package.json` - Added @testing-library/user-event dev dependency
- `pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Security boundary maintained: `useHasApiKey` only reads `bbHasApiKey` boolean, never `bbApiKeySecret`
- Soft gate: banner shows guidance but does not prevent saving bookmarks
- `chrome.storage.onChanged` with `area === 'local'` filter ensures cross-context reactivity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @testing-library/user-event**
- **Found during:** Task 1 (writing failing tests)
- **Issue:** Test file used `userEvent.click()` for gear icon and banner button interactions, but `@testing-library/user-event` was not installed
- **Fix:** Ran `pnpm add -D @testing-library/user-event`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Tests compile and pass
- **Committed in:** 06f1d7a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Required for click interaction tests. No scope creep.

## Issues Encountered
None beyond the missing dev dependency (handled via Rule 3).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 4 complete (pending human verification of checkpoint Task 2)
- After human verification confirms end-to-end flow works in Chrome, Phase 5 (AI Processing Pipeline) can begin
- useHasApiKey hook available for Phase 5 if AI feature gating needed

---
*Phase: 04-settings-onboarding*
*Completed: 2026-03-16*

## Self-Check: PASSED
- FOUND: src/popup/hooks/useHasApiKey.ts
- FOUND: src/popup/App.tsx
- FOUND: src/popup/App.test.tsx
- FOUND: .planning/phases/04-settings-onboarding/04-03-SUMMARY.md
- FOUND commit: 06f1d7a
