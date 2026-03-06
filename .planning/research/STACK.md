# Technology Stack — Bookmark Brain

**Project:** Bookmark Brain — AI-powered Chrome extension
**Researched:** 2026-03-06

## Recommended Stack

### Extension Framework & Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Chrome Manifest V3 | — | Extension platform | Required; MV2 deprecated and blocked since June 2024 |
| Vite | 5.x | Build bundler | Fastest HMR, ESM-native, excellent plugin ecosystem |
| @crxjs/vite-plugin | 2.x | Chrome extension build | Handles manifest injection, hot reload, multi-entry-point bundling |
| TypeScript | 5.x | Type safety | Mandatory for the complex bookmark + embedding + entity data model |
| React | 18.x | UI framework | Standard for extension UIs; works well with crxjs and shadcn/ui |

### Storage (Local-First)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Dexie.js | 4.x | IndexedDB ORM | Only viable local storage for embedding data volumes; clean async API, schema versioning, compound queries |
| dexie-react-hooks | same major | Live reactive queries | `useLiveQuery()` makes bookmark lists reactively update on data changes |

**Why not chrome.storage.local:** 10MB default quota, no query API. Even with `unlimitedStorage` permission, it's key-value only — cannot filter/sort/index bookmarks.

**Why not SQLite WASM:** Adds ~1.5MB bundle weight for no benefit over IndexedDB at v1 scale.

### AI Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel AI SDK (`ai`) | 4.x | Provider-agnostic LLM abstraction | Unified interface over OpenAI, Anthropic, Gemini. Fulfills the swappable-provider requirement. Includes structured output, streaming, retry logic. |
| `openai` | 4.x | Default provider | User supplies API key. Used for summarization, tagging, entity extraction. |
| `@anthropic-ai/sdk` | 0.x | Alternative provider | Enables Claude as swappable option; light to include. |
| OpenAI `text-embedding-3-small` | — | Embedding generation | 1536-dim, fast, low-cost. Stored as Float32Array per bookmark in IndexedDB. |

**Why not LangChain.js:** Heavy bundle, breaking changes between minors, over-abstracted for this scope.

### Semantic Search

Manual cosine similarity over in-memory Float32Arrays. At 10,000 bookmarks: ~60MB RAM, <50ms scan. No vector database needed — there is no server in v1.

**v2 upgrade path:** Drop in `usearch` (WebAssembly HNSW) if user corpus exceeds 50,000 bookmarks.

### Content Extraction

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@mozilla/readability` | 0.5.x | Article extraction | Firefox Reader View library. De facto standard, handles ads/nav/boilerplate. Run in content script context. |

**Limitation:** Cannot extract from auth-gated or unfinished SPA renders. Run after `document.readyState === 'complete'`.

### UI / Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility CSS | Zero runtime, fast iteration, shared tokens across popup and dashboard |
| shadcn/ui | latest | Component primitives | Radix-backed, zero bundle penalty, bookmark cards and search UI ready |
| Radix UI | 2.x | Accessible headless components | ARIA, keyboard nav, focus management handled automatically |

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 4.x | Ephemeral UI state | 1KB, no boilerplate. Manages search query, filters, loading flags. Dexie handles persistent state; Zustand handles UI state only. |

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 2.x | Unit tests | Same config as Vite, faster than Jest, native TypeScript |
| @testing-library/react | 14.x | Component tests | DOM-based React testing |

## Critical Architecture Constraints (MV3)

1. **Service worker is ephemeral** — Chrome terminates it at any time. Persist all state to IndexedDB immediately; do not rely on in-memory service worker state between activations.
2. **CSP blocks remote code** — Everything must be bundled. No CDN imports.
3. **API calls from service worker only** — LLM calls must go through service worker to protect the API key.
4. **Bundle size** — Target <500KB for popup entry point. Use code splitting: popup bundle, dashboard bundle, service worker bundle.
5. **API key storage** — Store in `chrome.storage.local` (encrypted by Chrome, small size), not IndexedDB.

## Confidence Summary

| Area | Confidence | Note |
|------|------------|------|
| MV3 platform constraints | HIGH | Hard documented Chrome requirements |
| Vite + crxjs build | HIGH | Established community pattern |
| IndexedDB + Dexie | HIGH | Documented API limits drive this choice |
| Vercel AI SDK | HIGH | Purpose-built for provider abstraction |
| Mozilla Readability | HIGH | De facto standard for browser extraction |
| React + Tailwind + shadcn | HIGH | Standard combination |
| Zustand | HIGH | Dominant lightweight option at this scale |
| Linear cosine search at 10K bookmarks | MEDIUM | Extrapolated from benchmarks; profile in testing |
