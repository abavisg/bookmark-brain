# Feature Landscape

**Domain:** AI-powered bookmark and knowledge management (Chrome extension)
**Project:** Bookmark Brain
**Researched:** 2026-03-06

---

## Table Stakes

Features users expect from any modern bookmark manager. Missing these means users don't consider the product viable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click save from current tab | Every bookmark tool does this; friction here is fatal | Low | Extension popup or toolbar button. Core gesture of the product. |
| Bookmark card with title + URL + date | Minimum information users need to recognize a saved item | Low | Auto-populated from page metadata (`<title>`, `og:title`, favicon). |
| Search by title/URL | Raindrop, Pocket, all browsers offer this; absence is disorienting | Low-Med | Full-text index over titles and URLs at minimum. |
| Tag-based organization | Power users organize by tags; expected in any bookmark tool | Low-Med | Manual tagging is baseline; auto-tagging is the AI upgrade. |
| List/grid view of saved bookmarks | Browse mode for when users don't have a specific query | Low | Dashboard requirement; not needed in popup. |
| Delete / archive a bookmark | Users need to manage their library | Low | Soft-delete with undo preferred. |
| Import existing browser bookmarks | Users have years of bookmarks already; onboarding requires this | Med | Chrome exposes bookmarks API. Retroactive AI processing is the differentiator. |
| Visual feedback that a page was saved | Confirmation that the save happened; without it users re-save | Low | Toast/badge in extension icon. |
| Filter by date range | "What did I save last week?" is a common navigation pattern | Low-Med | Date facet on dashboard. |
| Keyboard shortcut to save | Power users (researchers, writers) use keyboard heavily | Low | Chrome extension can register commands. |
| Open original URL from bookmark card | Bookmarks are links; this is non-negotiable | Low | Trivial but must be present. |

---

## AI-Specific Table Stakes

Features that define "AI-powered" in this category.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automatic page summarization | This is the product's stated core value | High | Must run in background post-save. 2-3 sentences. Quality matters — bad summaries erode trust faster than no summaries. |
| Auto-tagging from content | Users expect AI to reduce manual work | Med-High | Requires content analysis. Tags must be consistent (not "AI", "A.I.", "artificial intelligence" as separate tags). |
| Display AI-generated summary on card | The summary is only valuable if it's visible | Low | Pure UI — depends on summarization feature existing. |
| Natural language search | The headline feature that separates AI tools from plain bookmark managers | High | Semantic/vector search or LLM-mediated retrieval. |
| Graceful degradation when AI fails | Pages behind login, paywalls, or JS-heavy SPAs often can't be scraped | Med | Must handle gracefully: show bookmark without summary, not a broken state. |

---

## Differentiators

Features that go beyond what competitors offer.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-synthesized answers with source cards | User asks a question, gets a synthesized answer citing specific bookmarks below | High | The "second brain" moment. Requires RAG over stored summaries/content. |
| Entity/concept extraction | Extracts named entities — invisible in v1 but unlocks v2 knowledge graph | Med-High | Run during summarization pipeline. Store separately for future use. |
| Retroactive processing of imported bookmarks | Existing bookmark libraries become useful — users don't start from zero | High | Batch processing pipeline. UX challenge: communicate progress. |
| Provider-agnostic LLM backend | User can choose OpenAI, Anthropic, Gemini, local models | Med | Abstract provider interface. Swappable with a single config change. |
| User brings their own API key | No SaaS billing, no subscription | Low-Med | Key stored securely in Chrome storage (not synced). |
| Local-first / zero-backend privacy story | All data stays in the browser | Med | IndexedDB storage. Privacy as a feature, not just a constraint. |
| Duplicate detection | Alert when saving a page already bookmarked | Low-Med | URL normalization + comparison against existing store. |
| Export to Markdown / JSON | Data portability for researchers | Low-Med | Markdown with frontmatter is the Obsidian/Notion-compatible format. |

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud sync / multi-device (v1) | Requires auth, backend, sync conflict resolution — triples complexity | Ship local-first; design storage layer to be portable for v2 |
| User authentication / accounts | No server = no accounts needed; adds friction with zero v1 benefit | User's Chrome profile IS their identity |
| Social features (sharing, public collections) | Dilutes "personal second brain" positioning | Export to URL is sufficient if sharing is needed later |
| Reading mode / article view | Pocket/Instapaper own this; separate product | Stay focused: retrieve knowledge, not format articles |
| Browser history integration | Privacy risk, scope creep | Explicit opt-in saves only; never passive crawling |
| Automated re-crawling of saved pages | Burns API quota and surprises users | Save once, summarize once; user can manually refresh |
| Recommendation engine | Requires cross-user data or heavy ML | The library is already curated by the user |
| Firefox / Safari support (v1) | Different extension APIs, doubles QA surface | Chrome MV3 only; design manifest to be portable for v2 |
| Note-taking beyond bookmark context | Notion, Obsidian, Roam do this better | Keep notes scoped to bookmark context |

---

## Feature Dependencies

```
Chrome Extension (MV3 manifest)
  └── Content Script (page content extraction)
        └── Background Service Worker
              ├── Summarization Pipeline
              │     ├── Auto-tagging
              │     ├── Entity/Concept Extraction
              │     └── Summary Storage → IndexedDB
              ├── LLM Provider Interface
              │     ├── OpenAI adapter
              │     ├── Anthropic adapter
              │     └── [future: local model adapter]
              └── IndexedDB Storage Layer
                    ├── Bookmark CRUD
                    └── Search Index
                          ├── Natural Language Search (popup)
                          └── AI-Synthesized Answers (dashboard)

Dashboard (full-page)
  ├── Depends on: IndexedDB Storage Layer
  ├── Depends on: Natural Language Search
  ├── Depends on: AI-Synthesized Answers
  └── Depends on: Bookmark cards with summaries/tags

Import Pipeline
  ├── Depends on: Chrome Bookmarks API
  ├── Depends on: Summarization Pipeline (same code path, batched)
  └── Depends on: IndexedDB Storage Layer
```

---

## Competitive Positioning

| Tool | Save | Full-text Search | AI Summary | NL Search | Local-first | BYOK |
|------|------|-----------------|------------|-----------|-------------|------|
| Browser bookmarks | Yes | Title only | No | No | Yes | N/A |
| Pocket | Yes | Yes | No | No | No | No |
| Raindrop.io | Yes | Yes | Partial (Pro) | No | No | No |
| Readwise Reader | Yes | Yes | Yes (GPT) | Partial | No | No |
| Liner | Yes | Highlights | Yes | No | No | No |
| Memex | Yes | Yes | Partial | No | Yes | Partial |
| **Bookmark Brain** | **Yes** | **Semantic** | **Yes** | **Yes** | **Yes** | **Yes** |

---

## Roadmap Implications

- Phase 1 should establish the summarization pipeline before any search work
- NL search can come once content pipeline is proven
- Import/retroactive processing can share the summarization pipeline code path
- AI-synthesized answers (RAG) is a natural later phase
- Entity extraction should be wired into summarization even if data unused until later
