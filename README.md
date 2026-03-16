# Bookmark Brain

AI-powered Chrome extension bookmark manager — find anything you've saved.

> Save any page in one click. Ask a question weeks later. Get an answer with the exact bookmark that has it.

---

## What it does

Bookmark Brain is a Chrome extension that saves web pages and uses AI to make them findable again. Every bookmark is automatically summarized, tagged, and indexed — so you can search in plain English instead of trying to remember what you saved.

- **Save instantly** — one click or `Option+Shift+S`
- **AI enrichment** — automatic summaries, tags, and entity extraction in the background
- **Natural language search** — "what did I save about productivity habits?" works
- **Synthesized answers** — ask a question, get an answer drawn from your own bookmarks with sources

---

## Status

| Phase | What it builds | Status |
|-------|----------------|--------|
| 1. Project Scaffold | Build pipeline, typed message bus, extension shell | ✓ Complete |
| 2. Data Layer | Dexie IndexedDB schema, CRUD, alarm-driven processing queue | ✓ Complete |
| 3. Bookmark Saving | One-click save, keyboard shortcut, bookmark card UI | ✓ Complete |
| 4. Settings + Onboarding | API key entry, LLM provider selection | Planned |
| 5. AI Processing Pipeline | Summarization, auto-tagging, entity extraction | Planned |
| 6. Library + Search | Full dashboard, full-text search, tag/date filters | Planned |
| 7. Natural Language Search | LLM-powered query expansion | Planned |
| 8. AI-Synthesized Answers | RAG over saved bookmarks | Planned |
| 9. Import Pipeline | Chrome bookmark import with cost estimate | Planned |
| 10. Export + Polish | Markdown/JSON export, edge cases, performance | Planned |

---

## Tech stack

- **Runtime:** Chrome Extension Manifest V3
- **Framework:** React 19 + TypeScript
- **Build:** Vite + `@crxjs/vite-plugin`
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Storage:** Dexie 4 (IndexedDB) — fully local, no account required
- **Testing:** Vitest + Testing Library
- **Linting:** Biome

---

## Development

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # production build → dist/
pnpm test:run     # run tests
pnpm lint         # lint
pnpm type-check   # TypeScript check
```

**Load the extension in Chrome:**

1. `pnpm build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder

---

## Current features (Phase 3)

- Click the toolbar icon on any `https://` page to save it
- Keyboard shortcut `Option+Shift+S` (Mac) / `Alt+Shift+S` (Windows/Linux) saves without opening the popup
- Popup shows save/unsave toggle with bookmark card (title, URL, favicon, date)
- Duplicate detection — saving an already-saved page shows "Bookmarked" state instead of creating a duplicate
- Restricted pages (`chrome://`) show a graceful "Cannot save this page" message
- Soft-delete: removed bookmarks are logged to a `deletedBookmarks` table for future restore UI
