---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_plan: Not started
status: planning
last_updated: "2026-03-06T20:38:04.540Z"
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
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
**Current Phase:** 2
**Current Plan:** Not started
**Status:** Ready to plan

**Progress Bar:**
```
Phase:  [#         ] 1/10 phases complete
Plans:  [##########] 2/2 plans complete (Phase 1)
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Project Scaffold | Complete (2/2 plans) |
| 2 | Data Layer + Processing Queue | Not started |
| 3 | Bookmark Saving | Not started |
| 4 | Settings + Onboarding | Not started |
| 5 | AI Processing Pipeline | Not started |
| 6 | Library + Basic Search | Not started |
| 7 | Natural Language Search | Not started |
| 8 | AI-Synthesized Answers | Not started |
| 9 | Import Pipeline | Not started |
| 10 | Export + Polish | Not started |

---

## Performance Metrics

**Plans completed:** 2
**Plans failed:** 0
**Requirements delivered:** 0/28
**Phases completed:** 1/10

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01 | 01 | 371s | 3/3 | 28 |
| 01 | 02 | 771s | 3/3 | 16 |

---

## Accumulated Context

### Architectural Decisions (Non-Negotiable)

- **Alarm-driven queue from Phase 1:** Chrome terminates service workers after ~30s. The processing queue must be alarm-driven and persisted to `chrome.storage.local` from day one. Cannot be retrofitted.
- **API key lives in service worker only:** MV3 CORS rules + security require that no LLM calls happen from popup or content scripts. All AI calls route through `chrome.runtime.sendMessage` to the service worker.
- **Dexie.js is the only viable storage choice:** `chrome.storage.local` has no query API and a 10MB cap. Dexie wraps IndexedDB with migrations, reactive queries, and a sane API.
- **Separate evictable content from permanent metadata:** `pageContent` table is evictable; `bookmarks` metadata is permanent. Prevents quota exhaustion from eating core data.
- **Schema versioning from Phase 1:** Include `updatedAt` and `deviceId` fields from the start for v2 sync compatibility.

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

**Last action:** Completed 01-02-PLAN.md (2026-03-06) — branded UI, icons, shadcn/ui setup
**Next action:** Phase 1 complete. Proceed to Phase 2 (Data Layer + Processing Queue)

**To resume after context loss:**
1. Read `.planning/ROADMAP.md` for phase structure and success criteria
2. Read `.planning/REQUIREMENTS.md` for requirement IDs and traceability
3. Read `.planning/STATE.md` (this file) for decisions and current position
4. Check which phases have plan files in `.planning/plans/`

---

*State initialized: 2026-03-06*
*Last updated: 2026-03-06 after completing 01-02 branded UI and shadcn/ui plan*
