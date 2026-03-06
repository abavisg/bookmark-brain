# Domain Pitfalls

**Domain:** AI-powered Chrome Extension — Bookmark Management (Local-first, LLM-integrated)
**Project:** Bookmark Brain
**Researched:** 2026-03-06

---

## Critical Pitfalls

### Pitfall 1: MV3 Service Worker Termination During Long AI Operations

**Confidence:** HIGH

**What goes wrong:** Chrome MV3 service workers terminate after ~30 seconds of inactivity. An AI summarization pipeline — read page content, call LLM, write to IndexedDB — can exceed this window. When the worker is killed mid-operation, the bookmark is saved but never processed, and the failure is completely silent.

**Why it happens:** Developers build the happy path assuming the worker stays alive across an async chain. This works in DevTools (which artificially keeps the worker alive) but fails silently in production.

**Prevention:**
- Use `chrome.alarms` as the batch processing scheduler rather than a continuous loop
- Persist a processing queue to `chrome.storage.local` immediately on bookmark save; process one item per alarm tick
- Design the AI pipeline as a resumable state machine: each step is a discrete checkpoint written to storage before proceeding
- Never assume an async chain completes — assume termination can happen between any two `await` statements
- Always test with DevTools panel closed

**Phase to address:** Bookmark saving + background AI processing (Phase 1/2)

---

### Pitfall 2: Page Content Extraction Is Much Harder Than It Looks

**Confidence:** HIGH

**What goes wrong:** `document.body.innerText` on a real bookmark collection returns wildly different content: SPAs that haven't finished rendering, paywalled pages, YouTube/Twitter where content is in API responses not the DOM, PDFs, cookie consent walls, and `chrome://` internal pages that content scripts cannot access at all.

**Prevention:**
- Use `Readability.js` (Mozilla) as the primary content extractor
- Fall back to `document.title + meta description` for pages that fail full extraction
- Inject content scripts after a debounced load event, not immediately on `tabs.onUpdated`
- Handle inaccessible pages explicitly (`chrome://`, `file://`, extension pages)
- Token-limit content before sending to LLM (truncate at ~8K tokens)

**Phase to address:** Content extraction / bookmark saving pipeline (Phase 1/2)

---

### Pitfall 3: LLM API Key Accessible From Content Script Contexts

**Confidence:** HIGH

**What goes wrong:** Storing the API key in `chrome.storage.local` feels correct, but if any content script reads it — or if there is ever an XSS vector in the extension — the key is exposed.

**Prevention:**
- API key is only ever read in the service worker background context
- Content scripts and popup must never read the API key — all LLM calls route through the service worker via `chrome.runtime.sendMessage`
- Show a clear privacy notice before key entry
- Give users a "clear API key" button
- Never log or stringify the key in console output

**Phase to address:** Settings / onboarding (Phase 1)

---

### Pitfall 4: IndexedDB Quota Exhaustion With Silent Failures

**Confidence:** HIGH

**What goes wrong:** IndexedDB quota is a percentage of available disk space. When exceeded, write operations fail with `QuotaExceededError`. If uncaught, this causes silent data loss.

**Prevention:**
- Always wrap IndexedDB writes in try/catch; surface quota errors to the user
- Separate `bookmarks` table (metadata, summaries, tags — keep forever) from `page_content` table (raw extracted text — evictable)
- Implement a content eviction policy: delete raw page text after 30 days or when approaching 70% quota
- Call `navigator.storage.estimate()` on startup; warn at 70% usage
- Call `navigator.storage.persist()` to request persistent storage

**Phase to address:** Data model / storage design (Phase 1)

---

### Pitfall 5: Retroactive Import Creates Uncontrolled API Cost Spike

**Confidence:** HIGH

**What goes wrong:** Importing 500 existing bookmarks triggers 500 LLM API calls in rapid succession. This hits rate limits, can surprise users with unexpected costs, and interacts catastrophically with Pitfall 1 (service worker termination mid-batch).

**Prevention:**
- Process import queue with explicit throttling: max 3-5 concurrent calls with a delay between batches
- Make processing idempotent: check if a summary already exists before processing
- Show a cost estimate before import begins
- Allow pause/resume of the import at any time
- Process recently saved bookmarks first (most relevant), not oldest first

**Phase to address:** Import feature (Phase 2/3)

---

## Moderate Pitfalls

### Pitfall 6: Content Script Injection Timing on SPAs

**Confidence:** HIGH

`chrome.tabs.onUpdated` with `status === 'complete'` still races SPA rendering. Content script runs on near-empty DOM.

**Prevention:** Use a `MutationObserver` with debounce (500ms-1000ms after last mutation). Extract content at the moment of the bookmark save action. Set a minimum content length threshold (500 chars) before triggering LLM.

**Phase to address:** Content extraction (Phase 1/2)

---

### Pitfall 7: Vector Search Complexity Chosen Too Early

**Confidence:** HIGH

Teams assume "AI-powered natural language search" requires embeddings + vector database. For thousands of bookmarks, full-text search over summaries and tags with BM25 scoring works well. Embeddings double LLM costs and add ~6KB per bookmark in storage.

**Prevention:** Start with `minisearch` or `flexsearch` (both run entirely in-browser). Reserve embeddings for v2. Entity/concept extraction already provides strong semantic signal without embeddings.

**Phase to address:** Search implementation (Phase 2/3)

---

### Pitfall 8: Popup vs. Dashboard Architecture Conflict

**Confidence:** MEDIUM

Chrome popups are destroyed on every close. Building the popup as a mini-dashboard creates a slow, jarring UX.

**Prevention:** Popup stays minimal — search input + last 5 bookmarks + "Open Dashboard" button. Dashboard is a standalone tab reading directly from IndexedDB. IndexedDB is the single source of truth.

**Phase to address:** UI architecture (Phase 1)

---

### Pitfall 9: MV3 Content Scripts Cannot Make Cross-Origin Fetch Requests

**Confidence:** HIGH

Content scripts cannot call the LLM API directly — CORS wall.

**Prevention:** Content script extracts DOM → sends message to service worker → service worker calls LLM API → stores result → notifies popup/dashboard. Establish this message-passing pattern from day one.

**Phase to address:** Core architecture (Phase 1)

---

### Pitfall 10: Summarization Blocks the Save Action

**Confidence:** HIGH

If the extension waits for the LLM before confirming the save, the save feels slow (3-10 seconds). Users abandon an extension that makes saving feel heavy.

**Prevention:** Saving must be instantaneous. Optimistic UI: bookmark appears immediately with a "processing..." indicator. If the LLM fails, the bookmark is still saved with a retry option.

**Phase to address:** Bookmark saving UX (Phase 1)

---

### Pitfall 11: No Graceful Degradation When LLM Is Unavailable

**Confidence:** HIGH

No API key (first run), invalid key, provider outage, or quota exhaustion — all cause cryptic failures if not explicitly handled.

**Prevention:** Define a bookmark state machine: `saved → queued → processing → complete | failed`. Distinguish failure types: `no_key`, `invalid_key`, `rate_limited`, `provider_error`, `extraction_failed`. Show human-readable errors. Allow saving bookmarks without a key; queue for processing once a key is provided.

**Phase to address:** Error handling / resilience (Phase 1/2)

---

## Minor Pitfalls

### Pitfall 12: Extension Updates Break Existing IndexedDB Schema

Use Dexie's versioned schema migrations from day one. Always test the upgrade path.

**Phase to address:** Data model (Phase 1)

---

### Pitfall 13: Popup Reopening Loses In-Flight Search State

Persist ephemeral UI state to `chrome.storage.session` (MV3 feature). Restore on mount.

**Phase to address:** Popup UI (Phase 2)

---

### Pitfall 14: Tag Proliferation From LLM Inconsistency

Multiple LLM calls generate inconsistent tag strings: "machine-learning", "Machine Learning", "ML" — all the same concept.

**Prevention:** Normalize tags on write (lowercase, slug-format, deduplicate). Constrain LLM output: "Return tags as a JSON array of lowercase hyphenated strings, max 5 tags."

**Phase to address:** LLM prompting / data model (Phase 1/2)

---

### Pitfall 15: "Natural Language Search" Returns Zero Results for Paraphrased Queries

Full-text search matches exact keywords. User who saved "machine learning" and searches "how to train neural nets" gets zero results.

**Prevention:** Use the LLM to expand the search query into keywords before full-text search. Entity/concept extraction serves as additional search signal. Set correct expectations at v1; semantic search is a v2 feature.

**Phase to address:** Search (Phase 2/3)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core architecture | Content scripts calling LLM APIs directly (P9) | Service worker message-passing from day one |
| Bookmark saving | Synchronous AI blocking save (P10) | Optimistic save, background-only processing |
| Background AI processing | Service worker termination mid-pipeline (P1) | Alarm-based queue, resumable state machine |
| Content extraction | SPA timing, paywalls, empty DOM (P2 + P6) | Readability.js, debounced MutationObserver, fallback hierarchy |
| Data model | Missing migration strategy (P12) | Version schema from day one |
| Data model | IndexedDB quota exhaustion (P4) | Separate content vs. metadata stores, eviction policy |
| Settings / onboarding | API key security and privacy (P3) | Service worker-only access, clear privacy notice |
| LLM prompting | Tag inconsistency (P14) | Structured output format, normalize on write |
| Search | Over-engineering with vectors too early (P7) | Ship with full-text first |
| Search | Semantic mismatch / zero results (P15) | LLM query expansion, entity index as search signal |
| Import feature | API cost spike and rate limits (P5) | Throttled queue, idempotent processing, cost estimate UI |
| Error handling | Missing LLM failure states (P11) | Explicit state machine, human-readable errors |
| Popup UI | State lost on close (P13) | `chrome.storage.session` for ephemeral state |
