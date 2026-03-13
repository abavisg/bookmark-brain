# Phase 2: Data Layer + Processing Queue - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Dexie.js schema (3 tables: bookmarks, pageContent, processingQueue) + IndexedDB CRUD layer + alarm-driven processing queue that survives service worker termination + storage quota monitoring. Pure infrastructure — no user-facing UI in this phase. Everything Phase 3 and beyond will read/write to.

</domain>

<decisions>
## Implementation Decisions

### Queue Retry Behavior
- **Max attempts:** 3 retries before job is permanently marked `failed`
- **Backoff strategy:** Exponential backoff (e.g. 1min → 5min → 25min)
- **Failed job handling:** Keep in DB with status `failed`, never auto-deleted — recovery path preserved for future UI
- **API key self-healing:** When user adds or updates their API key, all `failed` jobs with `lastError` indicating missing API key should be automatically re-enqueued (status → `pending`) — handles the common case of saving bookmarks before completing setup

### Quota Warning
- **Storage:** Warning state stored in `chrome.storage.local` as `{ storageWarning: boolean }` — both popup and dashboard can read it without initializing Dexie
- **Trigger:** Quota checked via `navigator.storage.estimate()` after every write operation
- **Threshold:** 70% (as defined in roadmap success criteria)
- **Phase 2 scope:** State only — no UI in this phase. "Observable" means the flag is set and testable. UI surfacing belongs in Phase 6 dashboard.

### Schema Design
- **Dexie version:** Dexie 4 (TypeScript-first API, latest stable)
- **v2 sync fields:** Include `updatedAt` and `deviceId` in `bookmarks` table from day one (non-negotiable per STATE.md architectural decisions)
- **Eviction:** `pageContent` table is manually evictable by quota monitor — no TTL field, no time-based auto-eviction in v1
- **Indexes:** Define compound indexes now at schema creation time (cheap to add, painful to migrate):
  - `bookmarks`: `[status+createdAt]`, `url` (unique), `tags` (multiEntry)
  - `processingQueue`: `[status+nextRetryAt]`, `bookmarkId`
  - `pageContent`: `bookmarkId`

### Test Strategy
- **IDB adapter:** `fake-indexeddb` in-memory adapter — fast, no jsdom quirks, native Dexie compatibility
- **Coverage:** Unit tests for CRUD + at least one integration test verifying the full alarm → process → status-update flow (vitest-chrome already installed)
- **Test data:** Fresh data per test — no shared fixtures, no cross-test state leakage
- **Test boundary:** Public API only — tests verify behavior, not internal Dexie queries

### Claude's Discretion
- Exact Dexie 4 API patterns and migration syntax
- Internal queue processor implementation details (concurrency, batch size)
- File/module organization within `src/shared/db/` and `src/background/`
- Exact exponential backoff formula (within the spirit of 1min → 5min → 25min progression)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/types/messages.ts` — Discriminated union `AppMessage` type. Phase 2 will extend this with `SAVE_BOOKMARK`, `PROCESSING_STATUS` etc. message types
- `src/shared/messages/bus.ts` — Typed `sendMessage` wrapper. Queue status updates will use this pattern
- `src/background/index.ts` — `chrome.alarms` keepalive already set up at 0.4min interval. Phase 2 replaces the empty alarm handler with real queue processing logic
- `src/lib/utils.ts` — `cn` helper (Tailwind). Not directly relevant to data layer but establishes the shared utilities pattern

### Established Patterns
- Biome (not ESLint): 2-space indent, single quotes, no semicolons — all new files follow this
- Separate Vitest config (`vitest.config.ts`) from Vite — required due to crxjs incompatibility
- Path alias `@/` maps to `src/` — all imports use this

### Integration Points
- `src/background/index.ts`: Alarm handler stub is the exact integration point for the queue processor
- `src/shared/types/messages.ts`: Will be extended with data-layer message types
- All future phases (3–10) will import from the `src/shared/db/` module this phase creates

</code_context>

<specifics>
## Specific Ideas

- The `chrome.alarms` keepalive at 0.4min (24s) is already set up — Phase 2 plugs the queue processor into the existing `alarms.onAlarm` handler rather than creating new alarms
- Re-enqueue on API key update should be triggered via a message from the settings page (Phase 4) — Phase 2 just needs the `requeueFailedApiKeyJobs()` function ready to call

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-layer-processing-queue*
*Context gathered: 2026-03-13*
