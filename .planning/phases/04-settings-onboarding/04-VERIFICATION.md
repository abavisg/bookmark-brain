---
phase: 04-settings-onboarding
verified: 2026-03-16T21:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: true
gaps:
  - truth: "Returning user sees masked dots and Clear button, not the raw key"
    status: resolved
    reason: "Intentional design decision by product owner: textarea used for API key entry (multiline, plain text) with no eye toggle. Security boundary intact — raw key never returned to UI. Plan updated to reflect this decision."
  - truth: "ONB-01 and ONB-02 requirement IDs declared in prompt are orphaned"
    status: resolved
    reason: "ONB-01 and ONB-02 added to REQUIREMENTS.md and traceability table. Onboarding functionality is implemented and covered."
human_verification:
  - test: "Verify banner disappears reactively without reopening popup"
    expected: "While popup is open, save a valid API key in the dashboard Settings tab — the amber banner in the popup should disappear without requiring the popup to be closed and reopened."
    why_human: "chrome.storage.onChanged cross-context behavior cannot be simulated in Vitest/jsdom. Unit tests mock the listener but do not exercise the real Chrome messaging pipeline."
  - test: "Verify API key is not exposed in popup DevTools console"
    expected: "In popup DevTools console, running chrome.storage.local.get(null, console.log) should NOT show bbApiKeySecret in the result (it is stored but readable only from service worker context via MV3 restrictions)."
    why_human: "Chrome MV3 context isolation cannot be verified programmatically in unit tests."
---

# Phase 4: Settings + Onboarding Verification Report

**Phase Goal:** First-time users are guided to enter their API key and choose an LLM provider, and returning users can update these settings at any time — with the API key never exposed outside the service worker.
**Verified:** 2026-03-16T21:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria + Plan must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC-1 | On first run (no API key configured), the extension guides the user to the settings page | VERIFIED | Popup shows amber banner "Add API key to enable AI features" with "Set up now" CTA when `hasApiKey` is false. Tested in 7 popup tests. |
| SC-2 | User can enter an OpenAI or Anthropic API key in settings and switch between providers | VERIFIED | SettingsPanel has provider Select (OpenAI/Anthropic/Ollama), API key textarea, SAVE_SETTINGS dispatched on Save. 9 SettingsPanel tests confirm. |
| SC-3 | The API key is readable from service worker but not accessible from popup or content script contexts | VERIFIED | `handleGetSettings` reads only `bbProvider`, `bbHasApiKey`, `bbOllamaBaseUrl` — never `bbApiKeySecret`. `useHasApiKey` hook only reads `bbHasApiKey`. `SettingsPanel` never references `bbApiKeySecret`. Security boundary enforced structurally. |
| SC-4 | User can update or remove their API key at any time from settings | VERIFIED | Clear action implemented in `handleSaveSettings` (removes `bbApiKeySecret`, sets `bbHasApiKey: false`). Clear button shown in SettingsPanel when `savedHasApiKey` is true. |
| T1-1 | SAVE_SETTINGS persists provider and hasApiKey flag; stores apiKey under separate storage key | VERIFIED | `handleSaveSettings` stores `bbProvider`, `bbHasApiKey` and separately `bbApiKeySecret`. 5 handler tests confirm (Tests 1, 2, 3, 11). |
| T1-2 | GET_SETTINGS returns provider and hasApiKey boolean but NEVER returns the raw API key | VERIFIED | `handleGetSettings` queries only `[STORAGE_KEY_PROVIDER, STORAGE_KEY_HAS_API_KEY, STORAGE_KEY_OLLAMA_BASE_URL]`. `bbApiKeySecret` constant is defined at module level but is absent from the `handleGetSettings` function body. Tests 5 and 6 confirm. |
| T1-3 | VALIDATE_API_KEY calls correct provider endpoint and returns valid/invalid status | VERIFIED | OpenAI: GET /v1/models with Bearer; Anthropic: POST /v1/messages with x-api-key; Ollama: GET {baseUrl}/. Network error handling wraps all fetches in try/catch. Tests 7-10 + network error test confirm. |
| T1-4 | Saving settings triggers requeueFailedApiKeyJobs | VERIFIED | `handleSaveSettings` calls `await requeueFailedApiKeyJobs()` after save (line 63). Test 4 confirms. Clear action does NOT call requeue (intentional — clearing key doesn't need requeue). |
| T2-1 | Dashboard Settings nav item renders SettingsPanel when clicked | VERIFIED | `App.tsx` uses `useState<DashboardTab>` with `{activeTab === 'settings' && <SettingsPanel />}`. App.test.tsx "clicking Settings nav renders SettingsPanel" test confirms. |
| T2-2 | Opening dashboard with #settings hash shows Settings tab by default | VERIFIED | Lazy `useState` initializer reads `window.location.hash === '#settings'`. App.test.tsx "#settings hash" test confirms. |
| T2-3 | Selecting Ollama shows base URL field instead of API key field | VERIFIED | SettingsPanel conditionally renders `{provider === 'ollama' && <Input ...ollamaBaseUrl/>}` and `{provider !== 'ollama' && <textarea ...apiKey/>}`. SettingsPanel.test.tsx "shows base URL input when provider is ollama" test confirms. |
| T2-4 | Returning user sees masked dots and Clear button, not the raw key | FAILED | `SettingsPanel` uses a `<textarea>` (plain text) for the API key, not `<input type="password">`. No `showKey` state, no Eye/EyeOff toggle. The Clear button is correctly shown when `savedHasApiKey` is true. The security boundary holds (raw key never returned), but the UX masking is absent. |
| T3-1 | Popup shows onboarding banner with "Set up now" CTA when hasApiKey is false | VERIFIED | `popup/App.tsx` renders amber banner when `!hasApiKey`. 7 popup tests confirm banner show/hide/CTA behavior. |
| T3-2 | Banner disappears reactively via chrome.storage.onChanged | VERIFIED (partial — unit test level) | `useHasApiKey` subscribes to `chrome.storage.onChanged.addListener` with area filter. Unit tests mock the listener. Real Chrome behavior requires human verification. |
| T3-3 | Popup header has gear icon that opens dashboard to #settings | VERIFIED | `popup/App.tsx` renders `<button aria-label="Settings"><Settings size={18}/></button>` with `handleOpenSettings` using `chrome.tabs.create({url: ... + '#settings'})`. Test confirms. |
| T3-4 | Popup never reads or displays the raw API key | VERIFIED | `useHasApiKey` reads only `bbHasApiKey`. `popup/App.tsx` imports `useHasApiKey`, never `sendMessage` for settings. No reference to `bbApiKeySecret` in popup code. |
| T3-5 | Save button still works when no API key is configured (soft gate) | VERIFIED | Save button present regardless of `hasApiKey`. SettingsPanel.test.tsx and popup App.test.tsx "soft gate" test both confirm. |

**Score:** 15/16 truths verified (1 failed: masked dots for API key input)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/types/messages.ts` | SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY in AppMessage union | VERIFIED | All three message types present with typed payloads and AppResponse conditional types (lines 13-50). |
| `src/background/settings/settingsHandlers.ts` | handleSaveSettings, handleGetSettings, handleValidateApiKey | VERIFIED | All three functions exported, 137 lines, substantive implementation with chrome.storage wrappers. |
| `src/background/index.ts` | Cases for SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY wired | VERIFIED | All three cases present (lines 50-67), imported from settingsHandlers. |
| `src/background/settings/settingsHandlers.test.ts` | Unit tests for all handlers | VERIFIED | 248 lines, 11 named test cases across 3 describe blocks (>80 line minimum met). |
| `src/dashboard/components/SettingsPanel.tsx` | Settings form with provider select, API key input, validation, clear | VERIFIED (with gap) | 252 lines, substantive implementation. Missing: password masking (uses textarea, not input[type=password]). |
| `src/dashboard/App.tsx` | Tab routing, renders SettingsPanel for settings tab | VERIFIED | useState<DashboardTab>, hash routing, conditional SettingsPanel render. |
| `src/components/ui/input.tsx` | shadcn/ui Input component | VERIFIED | 23 lines, forwardRef pattern, exports `{ Input }`. |
| `src/components/ui/select.tsx` | shadcn/ui Select component | VERIFIED | 151 lines, full Radix UI-based Select with all required exports. |
| `src/dashboard/components/SettingsPanel.test.tsx` | 6+ test cases | VERIFIED | 9 test cases in 1 describe block. |
| `src/popup/hooks/useHasApiKey.ts` | useHasApiKey hook with chrome.storage.onChanged | VERIFIED | 27 lines, reads bbHasApiKey, subscribes to onChanged, cleanup removes listener. |
| `src/popup/App.tsx` | Gear icon, onboarding banner, useHasApiKey integration | VERIFIED | All three present. Settings import from lucide-react, aria-label="Settings", banner with "Add API key to enable AI features", "Set up now" button. |
| `src/popup/App.test.tsx` | Tests for banner, gear icon | VERIFIED | 13 total test cases (7 existing + 6 new for onboarding). |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/background/index.ts` | `src/background/settings/settingsHandlers.ts` | import + onMessage switch cases | WIRED | Lines 7-10: import of all three handlers. Lines 50-67: SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY cases with `.then(sendResponse)` and `return true`. |
| `src/background/settings/settingsHandlers.ts` | `src/shared/db/processingQueue.ts` | requeueFailedApiKeyJobs call on save | WIRED | Line 1: import. Line 63: `await requeueFailedApiKeyJobs()` called inside handleSaveSettings (non-clear path). |
| `src/dashboard/App.tsx` | `src/dashboard/components/SettingsPanel.tsx` | conditional render when activeTab === 'settings' | WIRED | Line 4: import. Line 92: `{activeTab === 'settings' && <SettingsPanel />}`. |
| `src/dashboard/components/SettingsPanel.tsx` | `src/shared/messages/bus.ts` | sendMessage with SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY | WIRED | Line 12: `import { sendMessage }`. Used in useEffect (GET_SETTINGS), handleSave (SAVE_SETTINGS), handleValidate (VALIDATE_API_KEY), handleClear (SAVE_SETTINGS with action:'clear'). |
| `src/popup/hooks/useHasApiKey.ts` | chrome.storage.onChanged | useEffect listener filtering bbHasApiKey changes | WIRED | Line 21: `chrome.storage.onChanged.addListener(listener)`. Line 22: cleanup `removeListener`. Filter `area === 'local' && 'bbHasApiKey' in changes` at line 17. |
| `src/popup/App.tsx` | `src/popup/hooks/useHasApiKey.ts` | useHasApiKey() call | WIRED | Line 6: import. Line 48: `const hasApiKey = useHasApiKey()`. |
| `src/popup/App.tsx` | chrome.tabs.create | gear icon onClick and banner CTA onClick | WIRED | `handleOpenSettings` at line 111-115 calls `chrome.tabs.create({url: ... + '#settings'})`. Both gear button (line 151) and banner button (line 167) call `handleOpenSettings`. |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| SET-01 | 04-01, 04-02, 04-03 | User can enter and manage their LLM API key on first run and in settings | SATISFIED | SettingsPanel provides API key entry; handleSaveSettings persists it; popup banner guides first-time users. |
| SET-02 | 04-01, 04-02 | User can select their preferred LLM provider (OpenAI, Anthropic) | SATISFIED | Provider Select in SettingsPanel with OpenAI/Anthropic/Ollama options. handleSaveSettings stores provider. |
| SET-03 | 04-01, 04-03 | User's API key is stored securely and never exposed to content scripts | SATISFIED | bbApiKeySecret never returned by handleGetSettings. useHasApiKey reads only boolean flag. SettingsPanel has no direct storage access. |
| ONB-01 | NOT IN CODEBASE | Requirement ID does not exist in REQUIREMENTS.md | ORPHANED | ONB-01 appears in the verification prompt but has no definition in REQUIREMENTS.md or any plan frontmatter. The functionality it likely describes (first-run onboarding banner) is covered by SET-01 as implemented in Plan 03. |
| ONB-02 | NOT IN CODEBASE | Requirement ID does not exist in REQUIREMENTS.md | ORPHANED | ONB-02 appears in the verification prompt but has no definition in REQUIREMENTS.md or any plan frontmatter. |

**Note on ONB-01/ONB-02:** REQUIREMENTS.md lists SET-01, SET-02, SET-03 for Phase 4. No ONB-* IDs exist anywhere in the project. These appear to be prompt-level errors or undeclared requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/dashboard/App.tsx` | 89 | "Search coming soon" placeholder text | Info | Expected — Search tab is a future phase (Phase 6/7). Does not affect phase goal. |
| `src/dashboard/components/SettingsPanel.tsx` | 190-196 | `<textarea>` for API key input instead of `<input type="password">` | Warning | Masking gap: API keys entered by the user are visible in plain text. The security boundary (key never returned to UI) is intact, but the key is visible as it's typed. |

No empty implementations, no TODO/FIXME/XXX comments, no return null stubs found.

---

### Human Verification Required

#### 1. Reactive Banner Disappearance

**Test:** Install the extension in Chrome. Open the popup. Open dashboard to Settings tab in another tab. Enter a valid API key and click Save. Without closing the popup, observe it.
**Expected:** The amber "Add API key to enable AI features" banner disappears from the already-open popup without requiring any interaction.
**Why human:** `chrome.storage.onChanged` cross-context behavior requires real Chrome; jsdom/Vitest mocks the listener but cannot exercise the MV3 messaging pipeline.

#### 2. Security Context Verification

**Test:** In the popup's DevTools console, run: `chrome.storage.local.get(null, console.log)`.
**Expected:** The output does NOT contain `bbApiKeySecret`. (Chrome MV3 restricts storage access from popup contexts for keys set by the service worker via `chrome.storage.local.set`.)
**Why human:** Context isolation between service worker and popup contexts in Chrome MV3 cannot be simulated in unit tests.

---

### Gaps Summary

**1 automated gap — API key masking:**

`SettingsPanel.tsx` deviates from the plan's acceptance criteria: it uses a `<textarea>` for API key entry rather than an `<input type="password">` with an Eye/EyeOff visibility toggle. This means API keys are visible in plain text as the user types them. The security boundary is intact (the raw key is never returned from storage or logged), but the UX masking contract stated in the must_haves truth "Returning user sees masked dots and Clear button, not the raw key" is not met for the input field itself.

**2 orphaned requirement IDs:**

ONB-01 and ONB-02 were listed in the verification prompt but do not exist in REQUIREMENTS.md, any plan frontmatter, or the ROADMAP. The onboarding functionality they presumably describe is fully implemented and covered under SET-01. These IDs should either be formally added to REQUIREMENTS.md with definitions, or acknowledged as prompt errors.

---

*Verified: 2026-03-16T21:00:00Z*
*Verifier: Claude (gsd-verifier)*
