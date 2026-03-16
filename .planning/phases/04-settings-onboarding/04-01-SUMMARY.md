---
phase: 04-settings-onboarding
plan: 01
subsystem: api
tags: [chrome-extension, service-worker, settings, api-key, security, vitest, tdd]

# Dependency graph
requires:
  - phase: 03-bookmark-saving
    provides: onMessage switch pattern in background/index.ts, chrome.storage mocks in test setup
provides:
  - SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY message types in AppMessage discriminated union
  - handleSaveSettings, handleGetSettings, handleValidateApiKey handler functions
  - Security boundary: raw API key (bbApiKeySecret) never returned to UI contexts
  - requeueFailedApiKeyJobs called on settings save to reprocess failed jobs
  - OpenAI/Anthropic/Ollama API key validation logic
affects: [04-02-dashboard-ui, 04-03-popup-banner, 05-ai-processing-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - chrome.storage promise wrapper pattern (storageGet/storageSet/storageRemove)
    - Provider-scoped API key validation with try/catch wrapping all fetch calls
    - bbApiKeySecret storage key — raw key stored separately, never read by GET_SETTINGS

key-files:
  created:
    - src/background/settings/settingsHandlers.ts
    - src/background/settings/settingsHandlers.test.ts
  modified:
    - src/shared/types/messages.ts
    - src/background/index.ts

key-decisions:
  - "Chrome storage promise wrappers: storageGet/storageSet/storageRemove wrap callback API for clean async/await usage in handlers"
  - "bbApiKeySecret constant defined once, never referenced in handleGetSettings — security boundary enforced by code structure, not convention"
  - "Ollama provider sets hasApiKey=true without requiring an API key (no auth required for local Ollama)"
  - "handleValidateApiKey wraps entire fetch in try/catch and returns { valid: false, error: message } on network errors"

patterns-established:
  - "Settings handlers follow injectable dbInstance-free pattern (chrome.storage only, no Dexie dependency)"
  - "Anthropic validation uses POST /v1/messages with max_tokens:1 to minimize cost on validation"

requirements-completed: [SET-01, SET-02, SET-03]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 4 Plan 1: Settings Backend Summary

**Service worker settings backend with SAVE_SETTINGS/GET_SETTINGS/VALIDATE_API_KEY message handlers, chrome.storage persistence, and security boundary ensuring the raw API key (bbApiKeySecret) is never returned to popup or dashboard contexts.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-16T20:19:13Z
- **Completed:** 2026-03-16T20:21:45Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Three new message types added to AppMessage discriminated union with typed AppResponse entries
- Three handler functions implemented with full test coverage (12 tests): handleSaveSettings, handleGetSettings, handleValidateApiKey
- Security boundary enforced: bbApiKeySecret constant never referenced inside handleGetSettings function body
- requeueFailedApiKeyJobs called after every save to reprocess jobs that failed due to missing/invalid API key
- All three handlers wired into the onMessage switch in background/index.ts following existing async pattern

## Task Commits

1. **Task 1: Add settings message types and create settingsHandlers module with tests** - `5638446` (feat)
2. **Task 2: Wire settings handlers into service worker onMessage switch** - `a1c1592` (feat)

## Files Created/Modified

- `src/shared/types/messages.ts` - Added SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY to AppMessage union and AppResponse conditional types
- `src/background/settings/settingsHandlers.ts` - Three exported handler functions with chrome.storage promise wrappers
- `src/background/settings/settingsHandlers.test.ts` - 12 unit tests covering all handler behaviors including clear action and network errors
- `src/background/index.ts` - Import and three new switch cases for settings message types

## Decisions Made

- Chrome storage promise wrappers (storageGet/storageSet/storageRemove) wrap callback-style API for clean async/await in handlers — consistent with existing MV3 service worker patterns
- `bbApiKeySecret` defined as a module-level constant; its absence from `handleGetSettings` is structurally enforced, not just by convention
- Ollama provider sets `hasApiKey: true` without requiring an API key — local Ollama instances require no authentication
- Anthropic validation uses POST `/v1/messages` with `max_tokens: 1` to minimize token cost during key validation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Settings backend complete; Plan 02 (dashboard UI) and Plan 03 (popup banner) can now consume GET_SETTINGS/SAVE_SETTINGS/VALIDATE_API_KEY via sendMessage
- API key is stored under bbApiKeySecret in chrome.storage.local and accessible to the service worker for Phase 5 AI pipeline calls
- requeueFailedApiKeyJobs integration means failed jobs auto-reprocess when user corrects a bad API key

## Self-Check: PASSED

- FOUND: src/background/settings/settingsHandlers.ts
- FOUND: src/background/settings/settingsHandlers.test.ts
- FOUND: .planning/phases/04-settings-onboarding/04-01-SUMMARY.md
- FOUND commit 5638446 (feat: add settings message types and handlers with tests)
- FOUND commit a1c1592 (feat: wire settings handlers into service worker onMessage switch)
- All 68 tests passing, TypeScript clean

---
*Phase: 04-settings-onboarding*
*Completed: 2026-03-16*
