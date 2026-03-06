# Architecture Research

**Domain:** AI-powered Chrome Extension — Bookmark Management
**Project:** Bookmark Brain
**Researched:** 2026-03-06

---

## Component Overview

### 1. Service Worker (Background Script)

The central orchestrator. All LLM API calls, storage writes, and cross-component coordination go through here.

**Responsibilities:**
- Receives bookmark save events from popup/content script
- Manages the AI processing queue (summarization, tagging, entity extraction)
- Makes all outbound LLM API calls (API key never leaves this context)
- Writes results to IndexedDB via Dexie
- Handles `chrome.alarms` for batch processing and retries
- Manages import pipeline

**MV3 constraint:** Ephemeral — terminated after ~30s inactivity. All state must be persisted to IndexedDB or `chrome.storage.local` immediately. Cannot hold in-memory state between activations.

### 2. Content Script

Injected into web pages to extract content when a bookmark is saved.

**Responsibilities:**
- Extracts page content using `@mozilla/readability`
- Sends extracted content to service worker via `chrome.runtime.sendMessage`
- Falls back to `document.title + meta description` when Readability fails

**Constraints:**
- Cannot make cross-origin requests (no direct LLM API calls)
- Cannot access `chrome.storage.local` for the API key
- Must handle pages with strict CSP — keep code simple, no dynamic imports

### 3. Popup UI

Minimal Chrome extension popup — the "quick search" surface.

**Responsibilities:**
- One-click bookmark save button
- Quick natural language search input
- Display last few saved bookmarks
- "Open Dashboard" button
- API key setup prompt (first run)

**Constraints:**
- Destroyed on every close — restore state from `chrome.storage.session`
- Must load fast (<200ms) — minimal bundle, no heavy data loading on mount
- Reads from IndexedDB via Dexie for bookmark data

### 4. Dashboard Page

Full-page tab opened via `chrome-extension://[id]/dashboard.html`. The primary browsing and search experience.

**Responsibilities:**
- Full bookmark library with card grid/list view
- Natural language search with AI-synthesized answers
- Filter by tags, date range
- Import existing bookmarks flow
- Settings management (API key, provider selection)
- Processing status for queued bookmarks

**Architecture:** Standalone React app reading directly from IndexedDB. Separate bundle from popup.

### 5. Storage Layer (Dexie + IndexedDB)

Single source of truth for all bookmark data.

**Tables:**
- `bookmarks` — id, url, title, summary, tags, entities, status, createdAt, processedAt
- `pageContent` — id, bookmarkId, content, extractedAt (evictable for quota management)
- `processingQueue` — id, bookmarkId, status, attempts, lastError, nextRetryAt

**Design principles:**
- Versioned schema from day one (Dexie migrations)
- Separate evictable content from permanent metadata
- Compound indexes for common queries (tags, dates, status)

### 6. AI Provider Abstraction

LLM-agnostic interface using Vercel AI SDK.

**Interface:**
- `summarize(content: string): Promise<Summary>` — returns summary + tags + entities
- `search(query: string, bookmarks: Bookmark[]): Promise<SearchResult>` — semantic search with synthesis
- `expandQuery(query: string): Promise<string[]>` — query expansion for better full-text search recall

**Providers:** OpenAI (default), Anthropic (alternative). Provider swapped via settings.

### 7. Settings Store

Small key-value store in `chrome.storage.local`.

**Contents:**
- API key (encrypted by Chrome)
- Selected LLM provider
- Processing preferences (auto-process on save, batch size)

---

## Data Flow

### Flow 1: Bookmark Save

```
User clicks save → Popup sends message to Service Worker
  → Service Worker writes bookmark (status: "queued") to IndexedDB
  → Service Worker responds immediately (optimistic save)
  → Service Worker injects content script into active tab
  → Content Script extracts page content via Readability
  → Content Script sends content to Service Worker
  → Service Worker calls LLM API (summarize + tag + extract entities)
  → Service Worker writes summary/tags/entities to IndexedDB (status: "complete")
  → Badge/popup updates to show completed state
```

**Key:** Save is instant. AI processing is async. Bookmark is usable immediately even without summary.

### Flow 2: Natural Language Search (Popup)

```
User types query in popup search bar
  → Popup sends query to Service Worker
  → Service Worker expands query via LLM (keywords/concepts)
  → Service Worker runs full-text search over IndexedDB (summaries + tags + entities)
  → Results returned to popup
  → Popup displays matching bookmark cards
```

### Flow 3: AI-Synthesized Answer (Dashboard)

```
User types question in dashboard search
  → Dashboard runs full-text search locally via Dexie
  → Top N results sent to Service Worker
  → Service Worker calls LLM with question + bookmark summaries as context
  → LLM synthesizes answer citing specific bookmarks
  → Dashboard displays AI answer + source bookmark cards below
```

### Flow 4: Retroactive Import

```
User triggers import from dashboard
  → Dashboard reads Chrome bookmarks API
  → Cost estimate shown (N bookmarks × estimated API cost)
  → User confirms
  → All bookmarks written to IndexedDB (status: "queued")
  → Service Worker processes queue via chrome.alarms (throttled, 3-5 concurrent)
  → Dashboard shows progress bar (X/N processed)
  → Pause/resume available at any time
```

---

## Message Passing Protocol

All inter-component communication via typed messages:

```typescript
type Message =
  | { type: 'SAVE_BOOKMARK'; url: string; title: string }
  | { type: 'EXTRACT_CONTENT'; tabId: number }
  | { type: 'CONTENT_EXTRACTED'; bookmarkId: string; content: string }
  | { type: 'SEARCH'; query: string }
  | { type: 'SEARCH_RESULTS'; results: Bookmark[] }
  | { type: 'SYNTHESIZE'; query: string; bookmarks: Bookmark[] }
  | { type: 'SYNTHESIS_RESULT'; answer: string; sources: Bookmark[] }
  | { type: 'IMPORT_START' }
  | { type: 'IMPORT_PROGRESS'; processed: number; total: number }
  | { type: 'PROCESSING_STATUS'; bookmarkId: string; status: string }
```

---

## Build Architecture

```
src/
├── background/          # Service worker entry
│   ├── index.ts         # Service worker main
│   ├── queue.ts         # Processing queue manager
│   └── alarms.ts        # Chrome alarms handlers
├── content/             # Content script entry
│   └── extractor.ts     # Readability-based extraction
├── popup/               # Popup React app entry
│   ├── App.tsx
│   ├── SearchBar.tsx
│   └── BookmarkList.tsx
├── dashboard/           # Dashboard React app entry
│   ├── App.tsx
│   ├── SearchPage.tsx
│   ├── ImportPage.tsx
│   └── SettingsPage.tsx
├── shared/              # Shared across all contexts
│   ├── db/              # Dexie schema + queries
│   ├── ai/              # Provider abstraction
│   ├── types/           # TypeScript types
│   └── messages/        # Typed message protocol
└── manifest.json        # MV3 manifest
```

Three separate bundles: popup, dashboard, service worker. Content script is a fourth small bundle.

---

## Suggested Build Order

| Order | Component | Rationale |
|-------|-----------|-----------|
| 1 | Project scaffolding + MV3 manifest + build pipeline | Foundation everything else depends on |
| 2 | Storage layer (Dexie schema + CRUD) | Data model must exist before anything reads/writes |
| 3 | Service worker + message passing | Orchestration layer that connects everything |
| 4 | Content script + Readability extraction | Produces the raw content for AI to process |
| 5 | AI provider abstraction + summarization pipeline | Core value — turning pages into summaries/tags/entities |
| 6 | Processing queue + chrome.alarms | Resilience against service worker termination |
| 7 | Popup UI (save button + quick search) | First user-facing surface |
| 8 | Dashboard (browse + search + settings) | Full library experience |
| 9 | NL search + AI-synthesized answers | Killer feature — requires content pipeline to be stable |
| 10 | Import pipeline | Depends on summarization pipeline being stable |

---

## Anti-Patterns to Avoid

- **In-memory service worker state** — will be lost on termination
- **Content scripts calling LLM APIs** — CORS block + API key exposure
- **Overusing chrome.storage.sync** — 100KB total limit, not for bookmark data
- **Blocking message channels** — service worker should respond immediately, process async
- **Monolithic DB table** — separate metadata from evictable content
- **Dynamic imports in content scripts** — blocked by strict CSP pages
