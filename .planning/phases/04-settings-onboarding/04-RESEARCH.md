# Phase 4: Settings + Onboarding - Research

**Researched:** 2026-03-16
**Domain:** Chrome MV3 settings UI, API key storage security, Vercel AI SDK provider configuration, chrome.storage.onChanged reactive patterns
**Confidence:** HIGH

## Summary

Phase 4 builds the settings UI on top of an already-solid foundation: the service worker message bus, `chrome.storage.local` patterns, and dashboard shell are all operational. The primary technical challenge is maintaining the security boundary (API key visible only to service worker) while giving the popup reactive feedback when the key is configured in a separate dashboard tab. `chrome.storage.onChanged` solves this cleanly — the popup registers a listener in a `useEffect` and tears it down on unmount.

The Vercel AI SDK has no official `@ai-sdk/ollama` package. Ollama support requires a community provider. The most web-compatible option is `ollama-ai-provider-v2` (no Node.js dependencies). This must be resolved here so Phase 5 does not encounter a surprise dependency gap. For API key validation: OpenAI uses `GET /v1/models` (free, no cost), Anthropic uses a minimal `POST /v1/messages` with `max_tokens: 1`, and Ollama uses `GET /` (returns "Ollama is running" with HTTP 200).

Dashboard routing for the Settings tab should use simple conditional rendering with a `useState` string — the dashboard is not a multi-page SPA and does not need React Router. The popup gear icon opens the dashboard URL with a `#settings` hash appended; the dashboard reads `window.location.hash` on mount to set initial active tab.

**Primary recommendation:** Use conditional render state machine in `App.tsx` for dashboard nav, `chrome.storage.onChanged` useEffect hook in the popup for live banner updates, and service worker message handlers for all settings CRUD and validation — zero new runtime dependencies needed beyond the optional Ollama community provider.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings Entry Point**
- Location: Settings tab in the existing dashboard sidebar (`src/dashboard/App.tsx` already has the nav item — just needs to be wired up)
- From popup: Gear icon in popup header opens dashboard to the Settings tab (not a new page)
- Dashboard nav: "Settings" sidebar item navigates to the settings panel in the main content area

**Onboarding Trigger + Gate**
- Detection: `chrome.storage.local` holds `{ hasApiKey: boolean, provider: string }` flag — popup reads only the boolean, never the key
- First-run behavior: Popup shows a banner: "Add API key to enable AI features" with a "Set up now →" CTA that opens dashboard to Settings tab
- Soft gate: Save button remains functional without an API key — bookmarks can be saved, AI processing will be queued and fail gracefully until key is configured
- Live update: Popup listens to `chrome.storage.onChanged` — banner disappears immediately when key is saved in the settings tab (no popup re-open required)

**API Key Storage**
- Backend: `chrome.storage.local` — persists across browser restarts, readable only by service worker in practice
- Security boundary: Popup and content scripts never request the key — only the service worker reads it for API calls
- Flag separation: `{ hasApiKey: true, provider: 'openai' }` in `chrome.storage.local` is safe for popup to read; actual key stored under a separate key only the service worker uses

**API Key UX**
- Input: Password-style field with eye icon toggle to reveal/hide
- Returning user state: Shows masked dots (●●●●●●●●●) with eye toggle + Clear button; status shows "✓ API key saved"
- Validation on save: After saving, service worker makes a minimal test API call — responds with success/failure
  - Success: green "✓ API key verified"
  - Failure: red "✗ Invalid key" + error message
- Clear: Removes the key entirely from storage, sets `hasApiKey: false`, popup banner reappears

**LLM Providers**
- Available providers: OpenAI, Anthropic, Ollama (all three from Phase 4)
- Cloud providers (OpenAI, Anthropic): API key field
- Ollama: Base URL field instead of API key (default: `http://localhost:11434`) — no key required
- Provider switching: Saving a new provider + key triggers `requeueFailedApiKeyJobs()` (already implemented in Phase 2) — all pending/failed jobs reset to `pending` and reprocess with the new provider automatically, no user confirmation needed
- Vercel AI SDK: Provider abstraction already supports all three — researcher should confirm Ollama provider package

### Claude's Discretion

- Exact shadcn/ui components for the settings form (Select, Input, Button from existing component library)
- Settings panel layout within the dashboard main content area
- Gear icon choice (Lucide icon set already in use)
- Exact `chrome.storage.local` key names for settings persistence
- Test validation call strategy per provider (e.g. list models vs. minimal completion)
- Routing mechanism for dashboard sidebar nav (hash routing, state, or simple conditional render)

### Deferred Ideas (OUT OF SCOPE)

- Model selection per provider (e.g. choose gpt-4o vs gpt-4o-mini) — belongs in Phase 5
- Usage/cost tracking display in settings — future phase
- Multiple API key profiles — out of scope for v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SET-01 | User can enter and manage their LLM API key on first run and in settings | Settings panel in dashboard with password input + validation flow via service worker message handler |
| SET-02 | User can select their preferred LLM provider (OpenAI, Anthropic) | Provider select control + Ollama base URL variant; service worker reads provider flag from `chrome.storage.local` |
| SET-03 | User's API key is stored securely in the browser and never exposed to content scripts | API key stored under a separate storage key never requested by popup/content scripts; popup only reads the `hasApiKey` boolean flag |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 (installed) | Settings panel UI and popup banner | Already in project |
| chrome.storage.local | MV3 built-in | Settings persistence + hasApiKey flag | MV3 standard; already used for pendingToast |
| chrome.storage.onChanged | MV3 built-in | Reactive popup banner update | Standard MV3 event API for cross-context reactivity |
| shadcn/ui Button | (installed) | Form submit, clear, reveal/hide actions | Already installed in src/components/ui/ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | via shadcn/ui | Gear icon (popup header), eye toggle (password reveal) | Already pulled in via shadcn/ui — use `Settings`, `Eye`, `EyeOff` icons |
| ollama-ai-provider-v2 | latest (~1.x) | Vercel AI SDK community provider for Ollama | Required for Ollama support in Phase 4/5; web-compatible, no Node.js deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ollama-ai-provider-v2 | ollama-ai-provider (original, sgomez) | Original is unresponsive to issues, missing tool streaming, 5+ months inactive — use v2 |
| ollama-ai-provider-v2 | ai-sdk-ollama | ai-sdk-ollama v3+ requires AI SDK v6; project is on AI SDK v4.x — incompatible |
| Conditional render routing | React Router / hash routing library | Dashboard is a single options page with 3 nav items — React Router is heavy overkill |

### Installation

```bash
# Only new runtime dependency for this phase:
pnpm add ollama-ai-provider-v2
```

Note: shadcn/ui Input and Select components are not yet installed. They must be added manually (per project pattern — CLI had issues with crxjs). Copy component files from shadcn/ui source into `src/components/ui/`.

**Version verification:**
```bash
npm view ollama-ai-provider-v2 version
```

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
  dashboard/
    App.tsx                         # MODIFY: add routing state + Settings tab wiring
    components/
      SettingsPanel.tsx             # NEW: settings form panel
  popup/
    App.tsx                         # MODIFY: add gear icon header, hasApiKey banner
  background/
    index.ts                        # MODIFY: add SAVE_SETTINGS, GET_SETTINGS, VALIDATE_API_KEY handlers
    settings/
      settingsHandlers.ts           # NEW: service worker settings CRUD + validation logic
  shared/
    types/
      messages.ts                   # MODIFY: add 3 new message types to discriminated union
  components/
    ui/
      input.tsx                     # NEW: shadcn/ui Input component (manual copy)
      select.tsx                    # NEW: shadcn/ui Select component (manual copy)
```

### Pattern 1: chrome.storage.onChanged Reactive Hook

**What:** A `useEffect` in popup `App.tsx` that subscribes to `chrome.storage.onChanged`, filters for the `hasApiKey` key, and updates a local state boolean. Cleans up listener on unmount.

**When to use:** Whenever the popup needs to reflect storage changes made in another extension page (settings tab) without user action.

**Example:**
```typescript
// Source: chrome.storage API — MDN/Chrome Developers
useEffect(() => {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && 'hasApiKey' in changes) {
      setHasApiKey(changes.hasApiKey.newValue as boolean)
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}, [])
```

### Pattern 2: Storage Key Separation (Security Boundary)

**What:** Two separate `chrome.storage.local` namespaces — one for the safe flag the popup reads, one for the raw key only the service worker reads.

**When to use:** Any time a sensitive credential must exist in browser storage but must not be accessible to untrusted contexts.

**Storage layout:**
```typescript
// Safe namespace (popup can read):
{ hasApiKey: boolean, provider: 'openai' | 'anthropic' | 'ollama', ollamaBaseUrl: string }

// Sensitive namespace (service worker only):
{ apiKeySecret: string }  // key name chosen by implementer (Claude's discretion)
```

The popup NEVER calls `chrome.storage.local.get(['apiKeySecret'])` — it only reads `hasApiKey`.

### Pattern 3: Dashboard Tab Routing via useState + Hash

**What:** Dashboard `App.tsx` holds a `activeTab: 'library' | 'search' | 'settings'` state. On mount, read `window.location.hash` to set initial tab. Sidebar nav items call `setActiveTab(...)`.

**When to use:** Single-page options dashboard with a small fixed set of tabs — no need for a router.

**Example:**
```typescript
// Source: established project pattern (conditional render already used in popup App.tsx)
const [activeTab, setActiveTab] = useState<'library' | 'search' | 'settings'>(
  () => {
    if (window.location.hash === '#settings') return 'settings'
    return 'library'
  }
)

// In popup, gear icon opens dashboard to settings:
chrome.tabs.create({
  url: chrome.runtime.getURL('src/dashboard/index.html') + '#settings',
})
```

### Pattern 4: Service Worker Message Handlers for Settings

**What:** Three new message types added to the discriminated union in `messages.ts`, handled in the `onMessage` switch in `background/index.ts`.

**Message types to add:**
```typescript
| { type: 'SAVE_SETTINGS'; payload: { provider: string; apiKey?: string; ollamaBaseUrl?: string } }
| { type: 'GET_SETTINGS' }
| { type: 'VALIDATE_API_KEY'; payload: { provider: string; apiKey?: string; ollamaBaseUrl?: string } }
```

**Response types:**
```typescript
// SAVE_SETTINGS → { success: boolean }
// GET_SETTINGS  → { provider: string; hasApiKey: boolean; ollamaBaseUrl: string }
// VALIDATE_API_KEY → { valid: boolean; error?: string }
```

### Pattern 5: API Key Validation Strategy Per Provider

**What:** Service worker performs a minimal, cheap test call after saving. Each provider has the lowest-cost verification endpoint.

| Provider | Validation Call | Cost | Notes |
|----------|----------------|------|-------|
| OpenAI | `GET https://api.openai.com/v1/models` | Free | Returns model list; 401 = invalid key |
| Anthropic | `POST https://api.anthropic.com/v1/messages` with `max_tokens: 1`, empty user message | Minimal (~0.000001 USD) | 401/403 = invalid key |
| Ollama | `GET {baseUrl}/` | Free (local) | Returns "Ollama is running" with HTTP 200; network error = not running |

### Anti-Patterns to Avoid

- **Reading apiKeySecret from popup:** Popup must never call `chrome.storage.local.get(['apiKeySecret'])`. Only service worker reads it for API calls.
- **Storing hasApiKey in IndexedDB:** This flag must be in `chrome.storage.local` (not Dexie) so the popup can read it without the service worker being awake.
- **Making validation API calls from popup/content script:** All validation goes through the service worker via `sendMessage({ type: 'VALIDATE_API_KEY', ... })`. MV3 CORS rules block direct API calls from popup contexts in some configurations.
- **Forgetting `return true` in async message handlers:** Any handler that calls `sendResponse` asynchronously must `return true` to keep the message channel open. The existing handlers in `background/index.ts` all do this correctly — replicate the pattern.
- **Not cleaning up chrome.storage.onChanged listener:** React's useEffect cleanup must call `chrome.storage.onChanged.removeListener(listener)` or the popup leaks listeners across re-renders.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-context reactivity for hasApiKey flag | Polling interval / custom event bus | `chrome.storage.onChanged` | MV3 built-in, fires within milliseconds, cleanup is trivial |
| Password input with reveal toggle | Custom implementation | HTML `<input type="password">` + toggle state + shadcn/ui Input | Native browser password masking + autocomplete, eye icon toggle is 5 lines of state |
| Job requeue on provider change | Custom logic | `requeueFailedApiKeyJobs()` from `src/shared/db/processingQueue.ts` | Already implemented in Phase 2 specifically for this moment |
| Ollama protocol integration | Fetch wrapper | `ollama-ai-provider-v2` | Handles streaming, error normalization, Vercel AI SDK interface compatibility |

**Key insight:** The entire cross-context update problem (popup reacting to settings changes in the dashboard) is solved by the native `chrome.storage.onChanged` API. Building any custom messaging layer for this would be premature complexity.

---

## Common Pitfalls

### Pitfall 1: API Key Leaking via GET_SETTINGS Response

**What goes wrong:** Service worker's `GET_SETTINGS` handler accidentally includes the raw API key in its response, which the popup receives.

**Why it happens:** Lazy implementation returns the full storage object.

**How to avoid:** `GET_SETTINGS` response MUST only return `{ provider, hasApiKey, ollamaBaseUrl }`. The `apiKeySecret` key is never included. The settings panel's "returning user" UI shows masked dots — it does NOT populate the input with the real key. The input is empty by default; the "✓ API key saved" label confirms existence.

**Warning signs:** If the settings Input field pre-populates with the real key value, the key has leaked to the dashboard context.

### Pitfall 2: chrome.storage.onChanged Listener Accumulation

**What goes wrong:** Banner never disappears, or disappears after multiple key saves, because the listener is added on every render instead of once.

**Why it happens:** Missing dependency array in `useEffect`, or listener added outside `useEffect`.

**How to avoid:** Always add `chrome.storage.onChanged` listener inside `useEffect(() => { ... return cleanup }, [])` with empty dependency array. The existing `pendingToast` pattern in popup `App.tsx` shows the correct useEffect-with-cleanup structure.

**Warning signs:** ESLint/Biome warnings about missing cleanup; banner behavior is inconsistent across popup open/close cycles.

### Pitfall 3: Validation Calls From Wrong Context

**What goes wrong:** Settings panel calls OpenAI/Anthropic API directly from the dashboard page context.

**Why it happens:** Seems simpler to call fetch() directly from the UI component.

**How to avoid:** All validation calls route through `sendMessage({ type: 'VALIDATE_API_KEY', ... })` to the service worker. This is non-negotiable per `STATE.md` architectural decisions.

**Warning signs:** `fetch()` calls to `api.openai.com` or `api.anthropic.com` in any file under `src/dashboard/` or `src/popup/`.

### Pitfall 4: Dashboard Test Breakage from App.tsx Rewrite

**What goes wrong:** Existing `App.test.tsx` tests in `src/dashboard/` fail after introducing routing state.

**Why it happens:** Tests assert on "Welcome to Bookmark Brain" placeholder text which is replaced when the Library tab renders instead.

**How to avoid:** Update `App.test.tsx` to reflect the new tab-based structure. Tests should cover: default tab is 'library', clicking Settings nav item renders SettingsPanel, hash `#settings` sets initial tab to settings.

**Warning signs:** Tests pass individually but fail together; snapshot mismatches on the main content area.

### Pitfall 5: Ollama Validation Over HTTPS from Extension Context

**What goes wrong:** Ollama validation fails with a CORS or mixed-content error when the extension tries to reach `http://localhost:11434` from the service worker.

**Why it happens:** Chrome extensions have `*://localhost/*` in host permissions by default, but HTTP (not HTTPS) localhost requests from a service worker may need explicit permission.

**How to avoid:** Verify that `manifest.json` `host_permissions` includes `http://localhost/*` or `http://127.0.0.1/*`. The fetch to Ollama's `GET /` endpoint runs in the service worker (correct) — not from popup. This avoids CORS entirely.

**Warning signs:** Ollama validation fails with network error even when Ollama server is confirmed running.

---

## Code Examples

### useSettings hook skeleton (popup)

```typescript
// Source: chrome.storage API pattern — chrome.storage.onChanged documented at
// https://developer.chrome.com/docs/extensions/reference/api/storage#event-onChanged
function useHasApiKey(): boolean {
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    // Read initial value
    chrome.storage.local.get(['hasApiKey'], (result) => {
      setHasApiKey(result.hasApiKey === true)
    })
    // Subscribe to changes
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && 'hasApiKey' in changes) {
        setHasApiKey(changes.hasApiKey.newValue === true)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return hasApiKey
}
```

### Popup banner component

```typescript
// Inline banner shown when hasApiKey === false, hidden when true
// Banner disappears reactively via onChanged without popup re-open
{!hasApiKey && (
  <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
    <span className="text-amber-800 dark:text-amber-200">
      Add API key to enable AI features
    </span>
    <button
      type="button"
      onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') + '#settings' })}
      className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      Set up now →
    </button>
  </div>
)}
```

### Service worker SAVE_SETTINGS handler

```typescript
// Pattern matches existing async handlers in background/index.ts
case 'SAVE_SETTINGS': {
  const { provider, apiKey, ollamaBaseUrl } = message.payload
  // Save sensitive key separately — never returned to UI contexts
  if (apiKey) {
    await chrome.storage.local.set({ apiKeySecret: apiKey })
  }
  await chrome.storage.local.set({
    hasApiKey: !!apiKey || provider === 'ollama',
    provider,
    ollamaBaseUrl: ollamaBaseUrl ?? 'http://localhost:11434',
  })
  // Requeue failed API key jobs with the new provider
  await requeueFailedApiKeyJobs()
  sendResponse({ success: true })
  return true
}
```

### Password input with reveal toggle (SettingsPanel)

```typescript
// Standard pattern for API key inputs — no library needed
const [showKey, setShowKey] = useState(false)

<div className="relative">
  <input
    type={showKey ? 'text' : 'password'}
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    placeholder="sk-..."
    className="w-full pr-10 ..."
  />
  <button
    type="button"
    onClick={() => setShowKey(!showKey)}
    className="absolute right-2 top-1/2 -translate-y-1/2"
  >
    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
  </button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chrome.storage.onChanged with polling fallback | Direct `onChanged` listener — reliable in MV3 service workers | MV3 (2020+) | Polling not needed; `onChanged` fires cross-context reliably |
| @ai-sdk/ollama (official) | Community providers (ollama-ai-provider-v2) | As of early 2025 | No official package exists; must use community provider |
| Options page as separate HTML route | Options page declared in manifest; opened via `chrome.tabs.create` | MV3 standard | Dashboard already registered as options_page in manifest |

**Deprecated/outdated:**
- `ollama-ai-provider` (original by sgomez): Unmaintained as of early 2025, missing tool streaming — do not use.
- `ai-sdk-ollama` v3+: Requires AI SDK v6 which is incompatible with this project's AI SDK v4.x.

---

## Open Questions

1. **ollama-ai-provider-v2 exact install name and current version**
   - What we know: Package `ollama-ai-provider-v2` exists on npm, is web-compatible, supports Vercel AI SDK v4
   - What's unclear: Exact current version number (need `npm view ollama-ai-provider-v2 version` at task time)
   - Recommendation: Run version check before writing import statement; pin to exact version found

2. **shadcn/ui Input and Select component availability**
   - What we know: Only `button.tsx` exists in `src/components/ui/`; project uses manual copy approach (not CLI)
   - What's unclear: Whether Input and Select were added in a prior phase not yet committed
   - Recommendation: Wave 0 task should check `src/components/ui/` and copy Input + Select from shadcn/ui source if missing

3. **manifest.json host permissions for localhost**
   - What we know: Manifest has `http://*/*` and `https://*/*` in host_permissions (per Phase 1 scaffold)
   - What's unclear: Whether explicit `http://localhost/*` is present — Chrome sometimes treats localhost differently
   - Recommendation: Implementing task should verify `localhost` is covered in `host_permissions` before Ollama validation

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + Testing Library 16.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:run -- src/dashboard src/popup src/background` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-01 | SettingsPanel renders API key input with save/clear actions | unit | `pnpm test:run -- src/dashboard/components/SettingsPanel.test.tsx` | ❌ Wave 0 |
| SET-01 | SAVE_SETTINGS message handler persists key and sets hasApiKey=true | unit | `pnpm test:run -- src/background/settings/settingsHandlers.test.ts` | ❌ Wave 0 |
| SET-01 | GET_SETTINGS response never contains raw API key | unit | `pnpm test:run -- src/background/settings/settingsHandlers.test.ts` | ❌ Wave 0 |
| SET-01 | Popup shows "Set up now" banner when hasApiKey=false | unit | `pnpm test:run -- src/popup/App.test.tsx` | ✅ (needs new cases) |
| SET-01 | Popup banner disappears reactively when hasApiKey changes to true | unit | `pnpm test:run -- src/popup/App.test.tsx` | ✅ (needs new cases) |
| SET-02 | Provider select renders OpenAI, Anthropic, Ollama options | unit | `pnpm test:run -- src/dashboard/components/SettingsPanel.test.tsx` | ❌ Wave 0 |
| SET-02 | Selecting Ollama shows base URL field, not API key field | unit | `pnpm test:run -- src/dashboard/components/SettingsPanel.test.tsx` | ❌ Wave 0 |
| SET-02 | requeueFailedApiKeyJobs called on settings save | unit | `pnpm test:run -- src/background/settings/settingsHandlers.test.ts` | ❌ Wave 0 |
| SET-03 | GET_SETTINGS response contains only hasApiKey flag, not raw key | unit | `pnpm test:run -- src/background/settings/settingsHandlers.test.ts` | ❌ Wave 0 |
| SET-03 | Dashboard context cannot read apiKeySecret from storage directly | manual-only | n/a — architectural enforcement, not testable in jsdom | n/a |

### Sampling Rate
- **Per task commit:** `pnpm test:run -- src/dashboard src/popup src/background`
- **Per wave merge:** `pnpm test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/dashboard/components/SettingsPanel.test.tsx` — covers SET-01 (form render, save, clear), SET-02 (provider switching)
- [ ] `src/background/settings/settingsHandlers.test.ts` — covers SET-01 (SAVE_SETTINGS, GET_SETTINGS handlers), SET-02 (requeueFailedApiKeyJobs call), SET-03 (key never in response)
- [ ] `src/components/ui/input.tsx` — shadcn/ui Input component (copy from shadcn source if absent)
- [ ] `src/components/ui/select.tsx` — shadcn/ui Select component (copy from shadcn source if absent)

---

## Sources

### Primary (HIGH confidence)
- Chrome Developers — chrome.storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Existing codebase — `src/background/index.ts`, `src/shared/messages/bus.ts`, `src/shared/db/processingQueue.ts` (direct read)
- Existing codebase — `src/popup/App.tsx`, `src/dashboard/App.tsx` (direct read)
- `package.json` — confirmed installed dependencies and versions (direct read)

### Secondary (MEDIUM confidence)
- WebSearch: "Vercel AI SDK ollama provider package @ai-sdk/ollama 2025" — confirmed no official package; ollama-ai-provider-v2 identified as web-compatible community provider
- WebSearch: "Ollama REST API validation check connection health endpoint 2025" — confirmed `GET /` returns "Ollama is running" HTTP 200
- WebSearch: "OpenAI API key validation minimal test call" — confirmed `GET /v1/models` is cost-free validation
- WebSearch: "Anthropic API key validation minimal API call 2025" — confirmed minimal `POST /v1/messages` with max_tokens:1 is standard approach

### Tertiary (LOW confidence)
- WebSearch: chrome.storage.onChanged listener React cleanup pattern — consistent across multiple sources, but not verified against official Chrome API docs beyond the API reference URL found in search

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified against installed `package.json`; Ollama provider confirmed via WebSearch (MEDIUM on exact version)
- Architecture: HIGH — patterns derived directly from existing working code in the project
- Pitfalls: HIGH — pitfalls derived from established project decisions in STATE.md + direct code reading
- Validation strategy per provider: MEDIUM — WebSearch verified; official API docs not directly fetched

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable MV3 APIs; Ollama provider ecosystem may shift faster — verify before Phase 5)
