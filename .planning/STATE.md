---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_plan: 03-01 complete — awaiting plan 03-02
status: executing
last_updated: "2026-03-16T14:20:52.034Z"
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 7
  completed_plans: 6
---

# State: Bookmark Brain

## Project Reference

**Core Value:** When a user asks a question about something they bookmarked weeks ago, they find it — with a summary reminding them why they saved it.

**Stack:** Chrome MV3 + Vite + @crxjs/vite-plugin + TypeScript + React + Dexie.js + Vercel AI SDK + Tailwind + shadcn/ui

**Key Constraints:**
- Chrome/Chromium only (MV3) — no Firefox/Safari in v1
- Local-first (IndexedDB via Dexie) — no backend, no auth
- User-provided API key (BYOK) — OpenAI or Anthropic
- Alarm-driven processing queue — non-negotiable from day one (service worker lifecycle)

---

## Current Position

**Milestone:** v1
**Current Phase:** 3
**Current Plan:** 03-01 complete — awaiting plan 03-02
**Status:** In progress

**Progress Bar:**
```
Phase:  [##        ] 2/10 phases complete
Plans:  [██████    ] 6/? plans complete (Phase 1: 2/2, Phase 2: 2/2, Phase 3: 2/3)
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Scaffold | Complete (2/2 plans) |
| 2 | Data Layer + Processing Queue | Complete (2/2 plans) |
| 3 | Bookmark Saving | In progress (2/3 plans) |
| 4 | Settings + Onboarding | Not started |
| 5 | AI Processing Pipeline | Not started |
| 6 | Library + Basic Search | Not started |
| 7 | Natural Language Search | Not started |
| 8 | AI-Synthesized Answers | Not started |
| 9 | Import Pipeline | Not started |
| 10 | Export + Polish | Not started |

---

## Performance Metrics

**Plans completed:** 6
**Plans failed:** 0
**Requirements delivered:** 5/28 (SET-04, SAVE-01, SAVE-02, SAVE-03, SAVE-04)
**Phases completed:** 2/10

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01 | 371s | 3/3 | 28 |
| 01 | 02 | 771s | 3/3 | 16 |
| 02 | 01 | ~600s | 2/2 | 11 |
| 02 | 02 | ~600s | 2/2 | 4 |
| 03 | 00 | 170s | 3/3 | 3 |
| 03 | 01 | 357s | 2/2 | 8 |

## Accumulated Context

### Architectural Decisions (Non-Negotiable)

- **Alarm-driven queue from Phase 1:** Chrome terminates service workers after ~30s. The processing queue must be alarm-driven and persisted to `chrome.storage.local` from day one. Cannot be retrofitted.
- **API key lives in service worker only:** MV3 CORS rules + security require that no LLM calls happen from popup or content scripts. All AI calls route through `chrome.runtime.sendMessage` to the service worker.
- **Dexie.js is the only viable storage choice:** `chrome.storage.local` has no query API and a 10MB cap. Dexie wraps IndexedDB with migrations, reactive queries, and a sane API.
- **Separate evictable content from permanent metadata:** `pageContent` table is evictable; `bookmarks` metadata is permanent. Prevents quota exhaustion from eating core data.
- **Schema versioning from Phase 1:** Include `updatedAt` and `deviceId` fields from the start for v2 sync compatibility.
- **Dexie 4 EntityTable pattern:** Use `EntityTable<T, 'id'>` (not older `Table<T, TKey>`) — makes primary key optional on insert. All CRUD modules use optional `dbInstance` parameter for test injection.
- **fake-indexeddb top-level import in db.ts:** ESM project cannot use dynamic `require()` (no node types in tsconfig.app.json). Importing fake-indexeddb statically is safe — the `db` singleton uses no options so fake-indexeddb never runs in production.
- **globalThis.chrome in quota tests:** vitest-chrome exports `{ chrome }` as a named export; `import * as chrome` gives the module namespace, not the chrome object. Tests must use the globally-assigned `chrome` set via `Object.assign(global, chrome)` in setup.ts.
- **processJob injectable via jobProcessor param:** ESM module boundaries prevent vi.spyOn from intercepting same-module function calls. processQueueBatch accepts optional `jobProcessor` param for test injection — defaults to real processJob stub in production. Phase 5 replaces processJob body directly.
- **TDD Wave 0 RED import strategy (Phase 3):** Test files import from non-existing modules — RED state is guaranteed at import resolution time. No need for stubs or `throw new Error` inside tests. Mirrors the "contract before code" TDD discipline.
- **handleSaveBookmark signature with optional dbInstance (Phase 3):** Follows the established addBookmark/deleteBookmark injection pattern. Tests pass testDb; production uses default db singleton.
- **App.test.tsx placeholder tests replaced (Phase 3):** Old tests tested a placeholder App.tsx that Plan 02 will replace entirely. Keeping them would create confusing mixed state.
- **chrome.action mock in test setup (Phase 3, Plan 01):** vitest-chrome@0.1.0 only provides browserAction (MV2). MV3 action API is absent, so setup.ts manually mocks chrome.action with vi.fn() for all badge/icon methods.
- **chrome.storage.local callbacks stubbed in setup.ts (Phase 3, Plan 01):** getOrCreateDeviceId() uses callback-style chrome.storage.local.get(). Without stub, vi.fn() never calls the callback, causing 5s test timeouts. Stubbing auto-calls callback with empty object.

### UI/Branding Decisions

- **Manual shadcn/ui init over CLI:** CLI had alias resolution issues with crxjs project structure; manual components.json + utils.ts is more reliable
- **Indigo brand color (#6366f1):** Used for brain icon background; sets consistent brand identity
- **CSS Grid dashboard layout:** `grid-cols-[16rem_1fr] grid-rows-[4rem_1fr]` provides fixed sidebar with fluid main content

### Technology Choices

- **Vercel AI SDK 4.x** — provider-agnostic LLM abstraction (OpenAI + Anthropic out of the box)
- **@mozilla/readability 0.5.x** — page content extraction (same engine as Firefox Reader View)
- **Zustand 4.x** — ephemeral UI state only; Dexie handles all persistence
- **Vitest 4.x** — testing (separate config from Vite due to crxjs incompatibility)
- **Tailwind CSS 4.x + shadcn/ui** — shared across popup and dashboard

### Research Flags Carried Forward

- **Phase 5 (content extraction):** Validate Readability.js against real-world URL samples (SPAs, paywalls, social media) before finalizing extraction architecture. Fallback hierarchy is defined but real-world hit rates are unknown.
- **Phase 8 (RAG prompt design):** Research optimal RAG patterns for personal library search — context window budget, citation prompting, relevance ranking. This is implementation-experimentable, not pre-researchable.

### Known Pitfalls to Avoid

1. Building the processing queue after Phase 1 — it must be foundational
2. Any LLM call from content script or popup (API key security + CORS)
3. Using `chrome.storage.local` instead of IndexedDB for bookmark data (10MB cap, no query API)
4. Building embeddings/vectors before shipping LLM query expansion (premature optimization)
5. Starting import before AI pipeline is production-stable (import multiplies any pipeline bugs)

---

## Session Continuity

**Last action:** Completed 03-01-PLAN.md (2026-03-16) — Dexie v2 migration + logDeletedBookmark + handleSaveBookmark/handleUnsaveBookmark + service worker wiring + Alt+Shift+S keyboard shortcut. All SAVE-01..04 tests GREEN.
**Next action:** Execute 03-02-PLAN.md (Wave 1 — popup UI: Save/Unsave buttons, BookmarkCard, chrome:// guard)

**To resume after context loss:**
1. Read `.planning/ROADMAP.md` for phase structure and success criteria
2. Read `.planning/REQUIREMENTS.md` for requirement IDs and traceability
3. Read `.planning/STATE.md` (this file) for decisions and current position
4. Check which phases have plan files in `.planning/plans/`

---

*State initialized: 2026-03-06*
*Last updated: 2026-03-16 after completing 03-01 — bookmark save/unsave backend fully implemented (SAVE-01..04 GREEN)*
