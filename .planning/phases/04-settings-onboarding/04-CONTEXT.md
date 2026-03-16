# Phase 4: Settings + Onboarding - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

First-time users are guided to enter their API key and choose an LLM provider via a banner in the popup. Returning users can update settings at any time from the Settings tab in the existing dashboard sidebar. The API key is stored in chrome.storage.local but only read by the service worker — never exposed to popup or content scripts.

</domain>

<decisions>
## Implementation Decisions

### Settings Entry Point
- **Location:** Settings tab in the existing dashboard sidebar (`src/dashboard/App.tsx` already has the nav item — just needs to be wired up)
- **From popup:** Gear icon in popup header opens dashboard to the Settings tab (not a new page)
- **Dashboard nav:** "Settings" sidebar item navigates to the settings panel in the main content area

### Onboarding Trigger + Gate
- **Detection:** `chrome.storage.local` holds `{ hasApiKey: boolean, provider: string }` flag — popup reads only the boolean, never the key
- **First-run behavior:** Popup shows a banner: "Add API key to enable AI features" with a "Set up now →" CTA that opens dashboard to Settings tab
- **Soft gate:** Save button remains functional without an API key — bookmarks can be saved, AI processing will be queued and fail gracefully until key is configured
- **Live update:** Popup listens to `chrome.storage.onChanged` — banner disappears immediately when key is saved in the settings tab (no popup re-open required)

### API Key Storage
- **Backend:** `chrome.storage.local` — persists across browser restarts, readable only by service worker in practice
- **Security boundary:** Popup and content scripts never request the key — only the service worker reads it for API calls
- **Flag separation:** `{ hasApiKey: true, provider: 'openai' }` in `chrome.storage.local` is safe for popup to read; actual key stored under a separate key only the service worker uses

### API Key UX
- **Input:** Password-style field with eye icon toggle to reveal/hide
- **Returning user state:** Shows masked dots (●●●●●●●●●) with eye toggle + Clear button; status shows "✓ API key saved"
- **Validation on save:** After saving, service worker makes a minimal test API call — responds with success/failure
  - Success: green "✓ API key verified"
  - Failure: red "✗ Invalid key" + error message
- **Clear:** Removes the key entirely from storage, sets `hasApiKey: false`, popup banner reappears

### LLM Providers
- **Available providers:** OpenAI, Anthropic, Ollama (all three from Phase 4)
- **Cloud providers (OpenAI, Anthropic):** API key field
- **Ollama:** Base URL field instead of API key (default: `http://localhost:11434`) — no key required
- **Provider switching:** Saving a new provider + key triggers `requeueFailedApiKeyJobs()` (already implemented in Phase 2) — all pending/failed jobs reset to `pending` and reprocess with the new provider automatically, no user confirmation needed
- **Vercel AI SDK:** Provider abstraction already supports all three — researcher should confirm Ollama provider package

### Claude's Discretion
- Exact shadcn/ui components for the settings form (Select, Input, Button from existing component library)
- Settings panel layout within the dashboard main content area
- Gear icon choice (Lucide icon set already in use)
- Exact `chrome.storage.local` key names for settings persistence
- Test validation call strategy per provider (e.g. list models vs. minimal completion)
- Routing mechanism for dashboard sidebar nav (hash routing, state, or simple conditional render)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Settings — SET-01, SET-02, SET-03 define the exact acceptance criteria for this phase

### Architecture constraints
- `.planning/STATE.md` §Architectural Decisions — "API key lives in service worker only" and "Alarm-driven queue" are non-negotiable constraints that directly affect this phase

No external specs — requirements fully captured in decisions above and referenced files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/dashboard/App.tsx` — Dashboard shell already exists with sidebar nav including "Settings" item (not yet wired). Phase 4 adds routing and the settings panel content.
- `src/background/index.ts` — `onMessage` switch is the integration point for new `SAVE_SETTINGS` / `GET_SETTINGS` / `VALIDATE_API_KEY` message handlers
- `src/shared/types/messages.ts` — Add new message types here following the existing discriminated union pattern
- `src/shared/db/processingQueue.ts` — `requeueFailedApiKeyJobs()` already implemented (Phase 2) — call this on provider/key save
- `src/components/ui/button.tsx` — shadcn/ui Button already available; researcher should confirm Select and Input components exist or need adding

### Established Patterns
- Biome: 2-space indent, single quotes, no semicolons
- Path alias `@/` → `src/`
- `sendMessage()` pattern: popup/dashboard sends → service worker responds
- `chrome.storage.local` already used for `pendingToast` — same pattern for `hasApiKey` + `provider` flags
- `chrome.storage.onChanged` not yet used — this phase introduces the listener pattern

### Integration Points
- `src/dashboard/App.tsx`: Wire up Settings nav item → settings panel (conditional render or hash routing)
- `src/popup/App.tsx`: Add gear icon to header + `hasApiKey` banner (reads from `chrome.storage.local`)
- `src/background/index.ts`: Add message handlers for settings CRUD and API key validation
- `src/shared/types/messages.ts`: Add `SAVE_SETTINGS`, `GET_SETTINGS`, `VALIDATE_API_KEY` message types

</code_context>

<specifics>
## Specific Ideas

- Ollama support: user explicitly wants local model support via Ollama — base URL field, no API key required, Vercel AI SDK Ollama provider
- Gear icon in popup header: small, unobtrusive — consistent with the clean popup design from Phase 3
- The `requeueFailedApiKeyJobs()` function from Phase 2 was specifically designed for this moment — use it directly on settings save

</specifics>

<deferred>
## Deferred Ideas

- Model selection per provider (e.g. choose gpt-4o vs gpt-4o-mini) — could be a settings option but belongs in Phase 5 when AI pipeline is built and model choices are meaningful
- Usage/cost tracking display in settings — future phase
- Multiple API key profiles — out of scope for v1

</deferred>

---

*Phase: 04-settings-onboarding*
*Context gathered: 2026-03-16*
