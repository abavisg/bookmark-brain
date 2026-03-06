# Bookmark Brain

## What This Is

A Chrome extension that makes bookmarks useful by automatically reading, summarizing, and tagging every saved page. Users get a searchable AI-powered library where they can ask natural language questions like "what did I save about productivity last month?" instead of scrolling through hundreds of forgotten links. Aimed at researchers, writers, and obsessive bookmarkers.

## Core Value

When a user asks a question about something they bookmarked weeks ago, they find it — with a summary reminding them why they saved it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] One-click bookmark saving with background AI processing
- [ ] Automatic 2-3 sentence page summarization
- [ ] Automatic topic tagging
- [ ] Entity/concept extraction from pages (foundation for future knowledge graph)
- [ ] Natural language search in extension popup (quick search)
- [ ] Full-page dashboard for browsing and deeper search
- [ ] AI-synthesized answers from saved bookmarks with source cards below
- [ ] Bookmark cards showing title, summary, tags, and date saved
- [ ] Manual import of existing browser bookmarks with retroactive processing
- [ ] Local-first storage (no account required, all data stays in browser)
- [ ] LLM-provider-agnostic design (swappable AI backend)

### Out of Scope

- Cloud sync / multi-device — deferred to v2 (local-only for v1 simplicity)
- User authentication — not needed without cloud sync
- Firefox / Safari support — Chrome-only for v1
- Knowledge graph visualization — v2 feature (but data model supports it from v1)
- Real-time collaboration / sharing — not part of the vision
- Mobile app — browser extension only

## Context

- **Target users:** Researchers, writers, knowledge workers who bookmark obsessively but never revisit. The "I saved something about this..." moment is the core use case.
- **Competitive landscape:** Raindrop.io, Pocket, browser bookmarks — all store links but none *understand* content. No existing tool offers natural language search over bookmark content.
- **Key insight:** The save moment should be invisible (one click, no friction). The value is entirely in retrieval — finding things weeks later by asking questions.
- **Data model consideration:** v1 must extract entities/concepts during summarization (not just tags) to support v2 knowledge graph where concepts are nodes and bookmarks attach to them.
- **Architecture note:** Local-first means IndexedDB or similar browser storage. AI calls go directly from extension to LLM API (user provides their own API key). No backend server in v1.

## Constraints

- **Browser:** Chrome/Chromium only (Manifest V3) — reduces testing surface
- **Storage:** Local-only (IndexedDB) — no server infrastructure needed for v1
- **AI provider:** Must be swappable — abstract behind a provider interface, start with best available
- **Privacy:** Page content sent to LLM API for summarization — user must be aware and consent
- **API key:** User provides their own LLM API key — no SaaS billing in v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chrome-only for v1 | Reduce scope, Manifest V3 is the future standard | — Pending |
| Local-first, no backend | Faster to ship, privacy-friendly, no infrastructure cost | — Pending |
| Defer cloud sync to v2 | Simplifies v1 dramatically — no auth, no server, no sync conflicts | — Pending |
| Extract entities in v1 for v2 graph | Small incremental cost now, huge unlock later | — Pending |
| User-provided API key | Avoids billing complexity, lets power users choose their provider | — Pending |
| LLM-agnostic design | Future-proof against API changes, lets users pick preferred provider | — Pending |

---
*Last updated: 2026-03-06 after initialization*
