# Requirements: Bookmark Brain

**Defined:** 2026-03-06
**Core Value:** When a user asks a question about something they bookmarked weeks ago, they find it — with a summary reminding them why they saved it.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Bookmark Saving

- [ ] **SAVE-01**: User can save the current page as a bookmark with one click from the extension toolbar
- [ ] **SAVE-02**: User sees visual confirmation (badge/toast) that a bookmark was saved
- [ ] **SAVE-03**: User can save a bookmark via keyboard shortcut
- [ ] **SAVE-04**: User is alerted when saving a page that is already bookmarked (duplicate detection)
- [ ] **SAVE-05**: Bookmark card displays title, URL, favicon, and date saved

### AI Processing

- [ ] **AI-01**: Saved bookmark automatically receives a 2-3 sentence summary generated from page content in the background
- [ ] **AI-02**: Saved bookmark automatically receives AI-generated topic tags based on page content
- [ ] **AI-03**: Saved bookmark has entities/concepts extracted from page content (stored for future knowledge graph)
- [ ] **AI-04**: Extension handles content extraction failures gracefully (paywalls, SPAs, missing API key) — bookmark is saved with title/URL even if AI processing fails
- [ ] **AI-05**: User can see processing status on bookmark cards (queued, processing, complete, failed)

### Search & Retrieval

- [ ] **SRCH-01**: User can search bookmarks by title, URL, and summary content via full-text search
- [ ] **SRCH-02**: User can search bookmarks using natural language queries (LLM-powered query expansion)
- [ ] **SRCH-03**: User can filter bookmarks by tags
- [ ] **SRCH-04**: User can filter bookmarks by date range
- [ ] **SRCH-05**: User can perform quick search from the extension popup
- [ ] **SRCH-06**: User can perform full search from the dashboard page
- [ ] **SRCH-07**: User receives AI-synthesized answers to questions, citing specific saved bookmarks as sources with cards displayed below the answer

### Library Management

- [ ] **LIB-01**: User can browse all bookmarks in a list/grid view on a full-page dashboard
- [ ] **LIB-02**: User can delete or archive a bookmark
- [ ] **LIB-03**: User can open the original URL from any bookmark card
- [ ] **LIB-04**: User can import existing Chrome bookmarks with retroactive AI processing (summarization, tagging, entity extraction)
- [ ] **LIB-05**: User sees a cost estimate before importing bookmarks (estimated API calls and cost)
- [ ] **LIB-06**: User can pause and resume bookmark import processing
- [ ] **LIB-07**: User can export their bookmark library to Markdown or JSON format

### Settings & Onboarding

- [ ] **SET-01**: User can enter and manage their LLM API key on first run and in settings
- [ ] **SET-02**: User can select their preferred LLM provider (OpenAI, Anthropic)
- [ ] **SET-03**: User's API key is stored securely in the browser and never exposed to content scripts
- [x] **SET-04**: All bookmark data is stored locally in the browser (no server, no account required)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cloud & Sync

- **SYNC-01**: User can sync bookmarks across devices via cloud storage
- **SYNC-02**: User can create an account to enable sync

### Knowledge Graph

- **GRAPH-01**: User can view a knowledge graph where concepts/entities are nodes and bookmarks attach to them
- **GRAPH-02**: User can explore connections between bookmarks through shared concepts

### Cross-Browser

- **XBROW-01**: Extension available for Firefox
- **XBROW-02**: Extension available for Safari

### Advanced Search

- **ASRCH-01**: User can search via embedding-based semantic similarity (upgrade from LLM query expansion)
- **ASRCH-02**: User can search by highlighting text on any page and finding related bookmarks

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Reading mode / article view | Pocket/Instapaper own this; separate product category |
| Social features (sharing, public collections) | Dilutes personal second brain positioning |
| Browser history integration | Privacy risk, scope creep — explicit opt-in saves only |
| Automated re-crawling of saved pages | Burns API quota, surprises users |
| Recommendation engine | Requires cross-user data or heavy ML |
| In-app reading / web viewer | iframes blocked by many sites; link to original URL |
| Note-taking beyond bookmark context | Notion/Obsidian do this better |
| Mobile app | Browser extension only for foreseeable future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SET-04 | Phase 2: Data Layer + Processing Queue | Complete |
| SAVE-01 | Phase 3: Bookmark Saving | Pending |
| SAVE-02 | Phase 3: Bookmark Saving | Pending |
| SAVE-03 | Phase 3: Bookmark Saving | Pending |
| SAVE-04 | Phase 3: Bookmark Saving | Pending |
| SAVE-05 | Phase 3: Bookmark Saving | Pending |
| SET-01 | Phase 4: Settings + Onboarding | Pending |
| SET-02 | Phase 4: Settings + Onboarding | Pending |
| SET-03 | Phase 4: Settings + Onboarding | Pending |
| AI-01 | Phase 5: AI Processing Pipeline | Pending |
| AI-02 | Phase 5: AI Processing Pipeline | Pending |
| AI-03 | Phase 5: AI Processing Pipeline | Pending |
| AI-04 | Phase 5: AI Processing Pipeline | Pending |
| AI-05 | Phase 5: AI Processing Pipeline | Pending |
| LIB-01 | Phase 6: Library + Basic Search | Pending |
| LIB-02 | Phase 6: Library + Basic Search | Pending |
| LIB-03 | Phase 6: Library + Basic Search | Pending |
| SRCH-01 | Phase 6: Library + Basic Search | Pending |
| SRCH-03 | Phase 6: Library + Basic Search | Pending |
| SRCH-04 | Phase 6: Library + Basic Search | Pending |
| SRCH-02 | Phase 7: Natural Language Search | Pending |
| SRCH-05 | Phase 7: Natural Language Search | Pending |
| SRCH-06 | Phase 7: Natural Language Search | Pending |
| SRCH-07 | Phase 8: AI-Synthesized Answers | Pending |
| LIB-04 | Phase 9: Import Pipeline | Pending |
| LIB-05 | Phase 9: Import Pipeline | Pending |
| LIB-06 | Phase 9: Import Pipeline | Pending |
| LIB-07 | Phase 10: Export + Polish | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation — traceability complete*
