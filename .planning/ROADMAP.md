# Roadmap: Bookmark Brain

**Project:** Bookmark Brain — AI-powered Chrome Extension
**Core Value:** When a user asks a question about something they bookmarked weeks ago, they find it — with a summary reminding them why they saved it.
**Granularity:** Fine
**Total Phases:** 10
**Requirements Coverage:** 28/28 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Project Scaffold** — Vite + MV3 manifest + crxjs build pipeline + TypeScript skeleton with typed message bus
- [ ] **Phase 2: Data Layer + Processing Queue** — Dexie schema, IndexedDB storage, alarm-driven processing queue, local-first data guarantee
- [ ] **Phase 3: Bookmark Saving** — One-click save, keyboard shortcut, visual confirmation, duplicate detection, bookmark card UI
- [ ] **Phase 4: Settings + Onboarding** — API key entry, LLM provider selection, secure key storage, first-run onboarding flow
- [ ] **Phase 5: AI Processing Pipeline** — Content extraction, summarization, auto-tagging, entity extraction, graceful degradation, processing status
- [ ] **Phase 6: Library + Basic Search** — Full-page dashboard browse, full-text search, tag/date filtering, delete/archive, open URL
- [ ] **Phase 7: Natural Language Search** — Popup quick search and dashboard NL search powered by LLM query expansion
- [ ] **Phase 8: AI-Synthesized Answers** — RAG over saved bookmarks with synthesized answer and source cards
- [ ] **Phase 9: Import Pipeline** — Chrome bookmark import with cost estimate, throttled retroactive AI processing, pause/resume
- [ ] **Phase 10: Export + Polish** — Export library to Markdown/JSON, edge case handling, performance hardening

---

## Phase Details

### Phase 1: Project Scaffold

**Goal:** A working Chrome extension shell loads in Chrome with the full build pipeline, TypeScript compiling cleanly, and the typed message bus connecting all extension components.

**Depends on:** Nothing (first phase)

**Requirements:** (none — pure infrastructure enabling all other phases)

**Success Criteria** (what must be TRUE):
  1. Developer can run `pnpm dev` and load the extension in Chrome via `chrome://extensions` without errors
  2. Popup, dashboard, content script, and service worker are all separate Vite bundles that load cleanly
  3. A typed `chrome.runtime.sendMessage` call from popup reaches the service worker and returns a typed response
  4. TypeScript compiles without errors across all four bundles
  5. `pnpm build` produces a distributable `dist/` folder with valid MV3 manifest

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Project init, build pipeline, entry points, typed message bus, test infrastructure
- [x] 01-02-PLAN.md — Brain icons, branded popup/dashboard UIs, shadcn/ui init, dark mode, visual checkpoint

---

### Phase 2: Data Layer + Processing Queue

**Goal:** Bookmark data persists across browser sessions in IndexedDB, and a resilient alarm-driven processing queue survives service worker termination without losing work.

**Depends on:** Phase 1

**Requirements:** SET-04

**Success Criteria** (what must be TRUE):
  1. A bookmark saved to Dexie persists after closing and reopening Chrome
  2. Service worker termination mid-queue does not lose pending processing jobs — they resume on next alarm tick
  3. `chrome.alarms` fires the queue processor on schedule even after DevTools panel is closed
  4. Storage quota monitoring is active — a warning state is observable when nearing the 70% threshold
  5. No server, no account, no network call is required for any data operation

**Plans:** TBD

---

### Phase 3: Bookmark Saving

**Goal:** Users can capture any web page as a bookmark instantly with one click or a keyboard shortcut, see immediate confirmation, and view a clean bookmark card in the popup.

**Depends on:** Phase 2

**Requirements:** SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05

**Success Criteria** (what must be TRUE):
  1. Clicking the extension toolbar button saves the current page and shows a toast/badge confirmation within 1 second
  2. Pressing the assigned keyboard shortcut saves the current page with the same confirmation
  3. Saving a page that was already bookmarked shows a duplicate warning instead of creating a second entry
  4. Each saved bookmark displays as a card with title, URL, favicon, and date saved in the popup
  5. A bookmark is saved (title + URL) even when the page cannot be read (chrome:// pages, PDFs)

**Plans:** TBD

---

### Phase 4: Settings + Onboarding

**Goal:** First-time users are guided to enter their API key and choose an LLM provider, and returning users can update these settings at any time — with the API key never exposed outside the service worker.

**Depends on:** Phase 1 (scaffold), Phase 2 (storage)

**Requirements:** SET-01, SET-02, SET-03

**Success Criteria** (what must be TRUE):
  1. On first run (no API key configured), the extension guides the user to the settings page before they can use AI features
  2. User can enter an OpenAI or Anthropic API key in settings and switch between providers
  3. The API key is readable from the service worker but is not accessible from popup or content script contexts
  4. User can update or remove their API key at any time from settings without reinstalling the extension

**Plans:** TBD

---

### Phase 5: AI Processing Pipeline

**Goal:** Every saved bookmark automatically receives a 2-3 sentence summary, topic tags, and extracted entities — processed asynchronously in the background — with processing status visible on each bookmark card and graceful behavior when processing fails.

**Depends on:** Phase 2 (queue), Phase 4 (API key)

**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05

**Success Criteria** (what must be TRUE):
  1. Within seconds of saving, a bookmark card shows a "processing" state; within ~30 seconds it shows a complete summary and tags
  2. Saving a page behind a paywall or with JavaScript-heavy content still saves the bookmark with title/URL — the card shows a "failed" state rather than blocking the save
  3. A bookmark saved without an API key configured shows a "failed — no API key" state and can be re-processed after the key is added
  4. AI-generated tags are normalized (lowercase, deduplicated) and consistently formatted across all bookmarks
  5. Extracted entities (people, organizations, concepts) are stored on each bookmark record even though they are not yet displayed in the UI

**Plans:** TBD

---

### Phase 6: Library + Basic Search

**Goal:** Users can open the full-page dashboard to browse their entire bookmark library, search by title/URL/summary content, filter by tags or date, and manage bookmarks (delete, archive, open original).

**Depends on:** Phase 3 (saved bookmarks), Phase 5 (AI enrichment)

**Requirements:** LIB-01, LIB-02, LIB-03, SRCH-01, SRCH-03, SRCH-04

**Success Criteria** (what must be TRUE):
  1. Opening the dashboard shows all saved bookmarks in a list/grid view with title, summary, tags, and date
  2. Typing in the search box returns bookmarks matching title, URL, or summary content — results appear as the user types
  3. Clicking a tag filters the library to show only bookmarks with that tag; selecting a date range further narrows results
  4. User can delete or archive a bookmark from the dashboard and the change is reflected immediately
  5. Clicking "Open" on any bookmark card opens the original URL in a new tab

**Plans:** TBD

---

### Phase 7: Natural Language Search

**Goal:** Users can ask questions in plain English — both from the popup and the dashboard — and the extension finds relevant bookmarks by expanding the query through the LLM rather than requiring exact keyword matches.

**Depends on:** Phase 5 (AI pipeline), Phase 6 (search infrastructure)

**Requirements:** SRCH-02, SRCH-05, SRCH-06

**Success Criteria** (what must be TRUE):
  1. Typing "what did I save about productivity habits?" in the popup returns relevant bookmarks even when no bookmark contains those exact words
  2. The same natural language query in the dashboard search bar returns results consistent with popup results
  3. Natural language search completes within 5 seconds for a library of 500 bookmarks
  4. When no relevant bookmarks are found, the user sees a clear "no results" message rather than an empty screen

**Plans:** TBD

---

### Phase 8: AI-Synthesized Answers

**Goal:** Users can ask a question in the dashboard and receive a synthesized AI answer drawn from their saved bookmarks, with the specific source bookmarks displayed as cards below the answer.

**Depends on:** Phase 7 (NL search)

**Requirements:** SRCH-07

**Success Criteria** (what must be TRUE):
  1. Submitting a question in the dashboard returns a 2-5 sentence synthesized answer above the search results
  2. Each claim in the answer is traceable to a specific bookmark — source cards appear below the answer with the supporting excerpt highlighted
  3. When no bookmarks are relevant to the question, the answer section tells the user so rather than hallucinating
  4. The synthesized answer and source cards render within 10 seconds for a library of 500 bookmarks

**Plans:** TBD

---

### Phase 9: Import Pipeline

**Goal:** Users can import their existing Chrome bookmarks into Bookmark Brain with a clear cost estimate upfront, throttled AI processing, and the ability to pause and resume the import at any time.

**Depends on:** Phase 5 (AI pipeline — import reuses it), Phase 6 (library view)

**Requirements:** LIB-04, LIB-05, LIB-06

**Success Criteria** (what must be TRUE):
  1. User can trigger "Import Chrome Bookmarks" from the dashboard and sees a preview of how many bookmarks will be imported
  2. Before processing begins, the user sees an estimated number of API calls and approximate cost in USD
  3. Import processing runs at a throttled rate (3-5 concurrent) and does not block normal bookmark saving during import
  4. User can pause the import and resume it later — already-processed bookmarks are not re-processed
  5. Imported bookmarks appear in the library with full AI enrichment (summary, tags, entities) once processed

**Plans:** TBD

---

### Phase 10: Export + Polish

**Goal:** Users can export their entire bookmark library as a portable Markdown or JSON file, and the extension handles all known edge cases and performance concerns for a polished, production-ready experience.

**Depends on:** Phase 6 (library), Phase 9 (import complete)

**Requirements:** LIB-07

**Success Criteria** (what must be TRUE):
  1. User can click "Export" in the dashboard and download their full library as a JSON file containing all metadata (title, URL, summary, tags, entities, date)
  2. User can choose Markdown export format and receive a human-readable file with one bookmark per section
  3. Export completes within 5 seconds for a library of 1,000 bookmarks
  4. The exported file can be re-imported into a fresh Bookmark Brain installation without data loss (round-trip fidelity)

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffold | 2/2 | Complete | 2026-03-06 |
| 2. Data Layer + Processing Queue | 0/? | Not started | - |
| 3. Bookmark Saving | 0/? | Not started | - |
| 4. Settings + Onboarding | 0/? | Not started | - |
| 5. AI Processing Pipeline | 0/? | Not started | - |
| 6. Library + Basic Search | 0/? | Not started | - |
| 7. Natural Language Search | 0/? | Not started | - |
| 8. AI-Synthesized Answers | 0/? | Not started | - |
| 9. Import Pipeline | 0/? | Not started | - |
| 10. Export + Polish | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase | Category |
|-------------|-------|----------|
| SET-04 | Phase 2 | Settings |
| SAVE-01 | Phase 3 | Bookmark Saving |
| SAVE-02 | Phase 3 | Bookmark Saving |
| SAVE-03 | Phase 3 | Bookmark Saving |
| SAVE-04 | Phase 3 | Bookmark Saving |
| SAVE-05 | Phase 3 | Bookmark Saving |
| SET-01 | Phase 4 | Settings |
| SET-02 | Phase 4 | Settings |
| SET-03 | Phase 4 | Settings |
| AI-01 | Phase 5 | AI Processing |
| AI-02 | Phase 5 | AI Processing |
| AI-03 | Phase 5 | AI Processing |
| AI-04 | Phase 5 | AI Processing |
| AI-05 | Phase 5 | AI Processing |
| LIB-01 | Phase 6 | Library |
| LIB-02 | Phase 6 | Library |
| LIB-03 | Phase 6 | Library |
| SRCH-01 | Phase 6 | Search |
| SRCH-03 | Phase 6 | Search |
| SRCH-04 | Phase 6 | Search |
| SRCH-02 | Phase 7 | Search |
| SRCH-05 | Phase 7 | Search |
| SRCH-06 | Phase 7 | Search |
| SRCH-07 | Phase 8 | Search |
| LIB-04 | Phase 9 | Library |
| LIB-05 | Phase 9 | Library |
| LIB-06 | Phase 9 | Library |
| LIB-07 | Phase 10 | Library |

**Coverage: 28/28 v1 requirements mapped. No orphans.**

---

*Roadmap created: 2026-03-06*
*Last updated: 2026-03-06 after 01-02 plan execution — Phase 1 complete*
