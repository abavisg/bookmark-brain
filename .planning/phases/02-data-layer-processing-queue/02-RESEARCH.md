# Phase 2: Data Layer + Processing Queue - Research

**Researched:** 2026-03-14
**Domain:** Dexie 4 / IndexedDB / Chrome MV3 alarm-driven queue / fake-indexeddb testing
**Confidence:** HIGH (Dexie 4 API, chrome.alarms, storage.estimate verified from official/authoritative sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dexie version:** Dexie 4 (TypeScript-first API, latest stable — v4.3.0)
- **Schema:** 3 tables: `bookmarks`, `pageContent`, `processingQueue`
- **`bookmarks` indexes:** `[status+createdAt]`, `url` (unique), `tags` (multiEntry), plus `updatedAt` and `deviceId` sync fields included from day one
- **`processingQueue` indexes:** `[status+nextRetryAt]`, `bookmarkId`
- **`pageContent` indexes:** `bookmarkId`
- **Max 3 retries with exponential backoff:** 1min → 5min → 25min progression
- **Failed jobs:** Kept in DB with status `failed`, never auto-deleted
- **API key self-healing:** Failed jobs with missing-key errors re-enqueued when key is added — `requeueFailedApiKeyJobs()` function must be ready but not triggered (Phase 4 triggers it)
- **Storage quota warning at 70%** via `navigator.storage.estimate()` after every write
- **Warning state stored in `chrome.storage.local`** as `{ storageWarning: boolean }`
- **Test adapter:** `fake-indexeddb` for tests; `vitest-chrome` already installed
- **Test isolation:** Public API only, fresh data per test
- **Path alias:** `@/` maps to `src/`
- **Code style:** Biome — 2-space indent, single quotes, no semicolons
- **Package manager:** `pnpm`

### Claude's Discretion
- Exact Dexie 4 API patterns and migration syntax
- Internal queue processor implementation details (concurrency, batch size)
- File/module organization within `src/shared/db/` and `src/background/`
- Exact exponential backoff formula (within the spirit of 1min → 5min → 25min progression)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SET-04 | All bookmark data is stored locally in the browser (no server, no account required) | Dexie + IndexedDB is 100% local; no network calls in any CRUD operation |
</phase_requirements>

---

## Summary

Phase 2 delivers the persistence and queue infrastructure that all later phases build upon. The primary work is: (1) defining a typed Dexie 4 database with 3 tables and their indexes, (2) writing a CRUD layer as pure async functions that other modules import, (3) implementing an alarm-driven queue processor in the service worker that reads pending jobs from IndexedDB and survives termination, and (4) writing a quota check helper that runs after every write and persists a `storageWarning` flag to `chrome.storage.local`.

None of this phase requires a network call, a user account, or a UI. The output is a set of modules other phases import. Dexie 4 is the right tool — it is the standard IndexedDB abstraction in the TypeScript ecosystem, its `EntityTable<T, KeyPropName>` type provides tight TypeScript inference without boilerplate, and `fake-indexeddb` integrates directly with Dexie for unit tests.

The alarm-driven queue pattern is the canonical approach for MV3 service workers: all queue state lives in IndexedDB (never in memory), the alarm fires every 0.4 minutes (already set up in Phase 1), and each alarm tick reads pending jobs, processes a small batch, and commits results back to IndexedDB. Because state lives in Dexie and not in a variable, service worker termination between alarm ticks loses nothing.

**Primary recommendation:** Define the database as a typed singleton module exported from `src/shared/db/db.ts`. All CRUD functions live in `src/shared/db/`. Queue processing lives in `src/background/queue/`. Test files use `fake-indexeddb` with explicit per-test Dexie construction to guarantee isolation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `dexie` | 4.3.0 | IndexedDB wrapper — schema, CRUD, transactions | De-facto standard; TypeScript-first in v4; 100K+ dependents |
| `dexie-react-hooks` | 4.x | `useLiveQuery` hook for reactive UI queries | Separate package required for React integration; needed from Phase 6 onwards |
| `fake-indexeddb` | 6.2.5 | In-memory IndexedDB for unit tests | Official Dexie-recommended test adapter; no jsdom quirks |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest-chrome` | 0.1.0 (already installed) | Mock `chrome.storage.local`, `chrome.alarms` in tests | All tests touching Chrome API calls |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `dexie` | `idb` (Jake Archibald's thin wrapper) | `idb` has no compound index helpers, no reactive queries, no ORM-style CRUD — more boilerplate for the same outcome |
| `fake-indexeddb` | jsdom's built-in IDB | jsdom IDB is incomplete and has known issues with Dexie; `fake-indexeddb` is Dexie's own recommended adapter |

### Installation

```bash
pnpm add dexie dexie-react-hooks
pnpm add -D fake-indexeddb
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
  shared/
    db/
      db.ts              # Dexie instance + schema — the ONE export all code imports
      bookmarks.ts       # CRUD functions: addBookmark, getBookmark, updateBookmark, deleteBookmark
      pageContent.ts     # CRUD functions: savePageContent, getPageContent, evictPageContent
      processingQueue.ts # CRUD functions: enqueueJob, dequeueNextBatch, markJobDone, markJobFailed, requeueFailedApiKeyJobs
      quota.ts           # checkAndUpdateQuotaWarning() — called after every write
      index.ts           # Re-exports public API from all db modules
    types/
      messages.ts        # (existing) — extend with SAVE_BOOKMARK, PROCESSING_STATUS
      db.ts              # Shared TypeScript interfaces: Bookmark, PageContent, ProcessingJob
  background/
    index.ts             # (existing) — plug processQueueBatch() into alarms.onAlarm
    queue/
      processor.ts       # processQueueBatch() — reads pending jobs, dispatches, writes results
```

### Pattern 1: Dexie 4 Typed Singleton Database

**What:** One Dexie instance declared per browser context, exported as a module-level singleton. All CRUD functions import from this singleton.

**When to use:** Always — Dexie recommends a single instance per database name. Service workers and UI pages each have their own process so each gets their own instance of the module, but within one process there is exactly one.

```typescript
// src/shared/db/db.ts
// Source: https://dexie.org/docs/Typescript (EntityTable pattern, Dexie 4)
import Dexie, { type EntityTable } from 'dexie'
import type { Bookmark, PageContent, ProcessingJob } from '@/shared/types/db'

export class BookmarkBrainDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>
  pageContent!: EntityTable<PageContent, 'id'>
  processingQueue!: EntityTable<ProcessingJob, 'id'>

  constructor() {
    super('bookmark-brain')
    this.version(1).stores({
      bookmarks: '++id, &url, *tags, [status+createdAt], updatedAt, deviceId',
      pageContent: '++id, bookmarkId',
      processingQueue: '++id, bookmarkId, [status+nextRetryAt]',
    })
  }
}

export const db = new BookmarkBrainDB()
```

**Key notes on `EntityTable<T, KeyPropName>`:**
- First generic `T` is the full entity type (including primary key)
- Second generic `KeyPropName` is the **string name** of the primary key property (not its type)
- `EntityTable` makes the key field optional on inserts — you do not pass `id` when calling `db.bookmarks.add()`
- This is Dexie 4's preferred alternative to the older `Table<T, TKey>` pattern

### Pattern 2: TypeScript Entity Interfaces

**What:** Plain TypeScript interfaces for each table row. No classes needed — Dexie 4 with `EntityTable` works cleanly with plain interfaces.

```typescript
// src/shared/types/db.ts
export type BookmarkStatus = 'unprocessed' | 'queued' | 'processing' | 'done' | 'failed'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Bookmark {
  id: number            // auto-increment, omitted on insert
  url: string           // unique index — duplicates rejected at DB level
  title: string
  favicon?: string
  status: BookmarkStatus
  tags: string[]        // multiEntry indexed — each tag queryable individually
  createdAt: number     // epoch ms
  updatedAt: number     // epoch ms — included for v2 sync
  deviceId: string      // device fingerprint — included for v2 sync
}

export interface PageContent {
  id: number
  bookmarkId: number    // FK to bookmarks.id
  rawText: string
  extractedAt: number
}

export interface ProcessingJob {
  id: number
  bookmarkId: number
  status: JobStatus
  attempts: number      // starts at 0; incremented on each try
  nextRetryAt: number   // epoch ms — set to Date.now() for immediate; future for backoff
  lastError?: string    // stores error message on failure — used by requeueFailedApiKeyJobs
  createdAt: number
}
```

### Pattern 3: Dexie Index Syntax Reference

**What:** The complete index notation. All syntax verified against Dexie documentation.

```
++id          → auto-increment primary key (no value needed on insert)
&url          → unique secondary index (insert fails if url already exists)
*tags         → multiEntry index (tags is string[]; each element is indexed separately)
[A+B]         → compound index (queryable with .where('[A+B]').equals([a, b]))
fieldName     → plain secondary index (non-unique, single value)
```

**Compound index query — exact syntax:**
```typescript
// Source: https://github.com/dexie/Dexie.js/wiki/Compound-Index
// Query processingQueue for pending jobs ready to run
const jobs = await db.processingQueue
  .where('[status+nextRetryAt]')
  .between(['pending', 0], ['pending', Date.now()], true, true)
  .limit(batchSize)
  .toArray()
```

**MultiEntry query — exact syntax:**
```typescript
// Find all bookmarks with a specific tag
const bookmarks = await db.bookmarks
  .where('tags')
  .equals('typescript')
  .toArray()
```

### Pattern 4: Alarm-Driven Queue Processor

**What:** The service worker's alarm handler calls `processQueueBatch()`. This function is a pure async function that reads from IndexedDB, does work, and writes results back. Zero in-memory state survives between alarm ticks.

**When to use:** On every `keepalive` alarm tick. Processing must complete before the alarm fires again (24s window).

```typescript
// src/background/queue/processor.ts
import { db } from '@/shared/db/db'
import type { ProcessingJob } from '@/shared/types/db'

const BATCH_SIZE = 3    // small — MV3 service worker has 5min hard limit per event
const BACKOFF_DELAYS_MS = [
  1 * 60 * 1000,    // attempt 1 → retry in 1 min
  5 * 60 * 1000,    // attempt 2 → retry in 5 min
  25 * 60 * 1000,   // attempt 3 → final; mark failed after this
]
const MAX_ATTEMPTS = 3

export async function processQueueBatch(): Promise<void> {
  const now = Date.now()
  // Compound index query: status='pending' AND nextRetryAt <= now
  const jobs = await db.processingQueue
    .where('[status+nextRetryAt]')
    .between(['pending', 0], ['pending', now], true, true)
    .limit(BATCH_SIZE)
    .toArray()

  for (const job of jobs) {
    // Mark in-flight to prevent double-processing if alarm fires again
    await db.processingQueue.update(job.id, { status: 'processing' })
    try {
      await processJob(job)
      await db.processingQueue.update(job.id, { status: 'done' })
      await db.bookmarks.update(job.bookmarkId, { status: 'done' })
    } catch (err) {
      await handleJobFailure(job, err)
    }
  }
}

async function handleJobFailure(job: ProcessingJob, err: unknown): Promise<void> {
  const errorMessage = err instanceof Error ? err.message : String(err)
  const newAttempts = job.attempts + 1

  if (newAttempts >= MAX_ATTEMPTS) {
    await db.processingQueue.update(job.id, {
      status: 'failed',
      attempts: newAttempts,
      lastError: errorMessage,
    })
    await db.bookmarks.update(job.bookmarkId, { status: 'failed' })
  } else {
    const delayMs = BACKOFF_DELAYS_MS[newAttempts - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]
    await db.processingQueue.update(job.id, {
      status: 'pending',
      attempts: newAttempts,
      nextRetryAt: Date.now() + delayMs,
      lastError: errorMessage,
    })
  }
}

// Placeholder — Phase 5 fills in real processing logic
async function processJob(_job: ProcessingJob): Promise<void> {
  // Phase 5: extract page content, call AI API, write summary/tags back
}
```

**Integration into existing alarm handler (`src/background/index.ts`):**
```typescript
// Replace the empty keepalive handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    processQueueBatch().catch(console.error)
  }
})
```

### Pattern 5: Quota Check After Every Write

**What:** After any write that could grow storage, call `checkAndUpdateQuotaWarning()`. It reads `navigator.storage.estimate()` and writes a boolean to `chrome.storage.local`.

**Why `chrome.storage.local` not IndexedDB:** The warning flag must be readable by popup/dashboard without initializing Dexie. `chrome.storage.local` is always available.

```typescript
// src/shared/db/quota.ts
// Source: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
const QUOTA_WARNING_THRESHOLD = 0.70  // 70%

export async function checkAndUpdateQuotaWarning(): Promise<void> {
  if (!navigator.storage?.estimate) return  // guard: not available in all contexts
  const { usage = 0, quota = 1 } = await navigator.storage.estimate()
  const ratio = usage / quota
  const storageWarning = ratio >= QUOTA_WARNING_THRESHOLD
  await chrome.storage.local.set({ storageWarning })
}
```

`navigator.storage.estimate()` is available in Web Workers (including service workers). It is HTTPS-only, but Chrome extensions run in a secure extension origin — this is safe.

### Pattern 6: API Key Self-Healing

**What:** A function that finds all `failed` jobs whose `lastError` indicates a missing API key, and resets them to `pending` for immediate retry.

**When triggered:** Phase 4 (settings page) calls this after the user saves their API key. Phase 2 only creates the function.

```typescript
// src/shared/db/processingQueue.ts
const API_KEY_ERROR_SUBSTRING = 'api key'  // match case-insensitively

export async function requeueFailedApiKeyJobs(): Promise<number> {
  const failedJobs = await db.processingQueue
    .where('status')
    .equals('failed')
    .filter(job =>
      job.lastError?.toLowerCase().includes(API_KEY_ERROR_SUBSTRING) ?? false
    )
    .toArray()

  const ids = failedJobs.map(j => j.id)
  await db.processingQueue
    .where('id')
    .anyOf(ids)
    .modify({ status: 'pending', nextRetryAt: Date.now(), attempts: 0 })

  return ids.length
}
```

### Pattern 7: Testing with fake-indexeddb — Per-Test Isolation

**What:** Create a fresh Dexie instance in each test by passing `fake-indexeddb`'s objects explicitly. This avoids shared state between tests.

**Why explicit constructor injection over `fake-indexeddb/auto`:** The `/auto` import mutates the global scope once. If tests share the global, state leaks between them. Explicit injection creates a new in-memory database per test.

```typescript
// Any db test file — e.g., src/shared/db/bookmarks.test.ts
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { BookmarkBrainDB } from '@/shared/db/db'

let db: BookmarkBrainDB

beforeEach(() => {
  // New IDBFactory instance = completely empty in-memory database
  db = new BookmarkBrainDB()
  // Pass fake implementations at construction time
  // NOTE: Dexie constructor accepts { indexedDB, IDBKeyRange } as second argument
  // but this requires a small testable factory — see db.ts note below
})

afterEach(async () => {
  await db.close()
})
```

**The key design decision:** `BookmarkBrainDB` must accept optional `indexedDB` / `IDBKeyRange` overrides. This is a standard Dexie constructor option:

```typescript
// src/shared/db/db.ts — testable constructor
export class BookmarkBrainDB extends Dexie {
  constructor(options?: { indexedDB?: IDBFactory; IDBKeyRange?: typeof IDBKeyRange }) {
    super('bookmark-brain', options)
    // ... version().stores() as above
  }
}

// Production singleton
export const db = new BookmarkBrainDB()

// Test helper
export function createTestDb(): BookmarkBrainDB {
  return new BookmarkBrainDB({
    indexedDB: new IDBFactory(),
    IDBKeyRange: IDBKeyRange,
  })
}
```

Test files import `createTestDb()` rather than the singleton `db`.

### Pattern 8: Mocking chrome.storage.local in Tests

**What:** `vitest-chrome` provides the `chrome` global, but functions have no default implementation. For `chrome.storage.local.set/get`, provide a simple in-memory mock.

```typescript
// Per-test mock (inline in test file or shared setup)
import * as chrome from 'vitest-chrome'
// vitest-chrome is already assigned to global in src/test/setup.ts

beforeEach(() => {
  const store: Record<string, unknown> = {}
  vi.mocked(chrome.storage.local.set).mockImplementation(
    (items: Record<string, unknown>, callback?: () => void) => {
      Object.assign(store, items)
      callback?.()
    }
  )
  vi.mocked(chrome.storage.local.get).mockImplementation(
    (keys: string | string[] | Record<string, unknown>, callback: (result: Record<string, unknown>) => void) => {
      if (typeof keys === 'string') callback({ [keys]: store[keys] })
      else callback(store)
    }
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

### Anti-Patterns to Avoid

- **Importing `db` singleton in tests:** Leads to shared state across tests. Always use `createTestDb()` in tests.
- **Storing queue state in memory:** Any JS variable is lost on service worker termination. The queue lives exclusively in IndexedDB.
- **Using `setInterval`/`setTimeout` in service worker:** Chrome cancels these when the worker is idle. Only `chrome.alarms` survives.
- **Querying without a compound index:** `db.processingQueue.filter(j => j.status === 'pending')` does a full table scan. Use the `[status+nextRetryAt]` compound index with `.where().between()`.
- **Mixing multiEntry with compound index:** IndexedDB spec does not allow a single index to be both compound and multiEntry. `*tags` and `[status+createdAt]` are separate indexes — correct as specified.
- **Calling `db.open()` manually:** Dexie opens automatically on first operation. Manual `open()` is not needed unless you want to pre-warm.
- **Running processQueueBatch() concurrently:** If the alarm fires while a batch is still in-progress, a second batch starts. Guard with the `status: 'processing'` write at the start of each job — the second batch won't re-pick jobs already marked `processing`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB schema + migrations | Custom IDB version upgrade code | `Dexie version().stores()` | IDB upgrade transactions are notoriously tricky; Dexie handles version ordering, upgrade callbacks, and error rollback |
| Compound/multiEntry index querying | Manual `.filter()` over all rows | Dexie `.where('[A+B]').between()` | Full table scans won't scale; Dexie's query optimizer uses native IDB indexes |
| Test-time IDB environment | jsdom fake or custom mock | `fake-indexeddb` | Passes 82% of the Web Platform Tests for IDB; handles edge cases Dexie exercises |
| Reactive queries in React UI | `useEffect` + polling | `useLiveQuery` from `dexie-react-hooks` | Uses IndexedDB mutation observers — zero polling, instant updates |
| Storage quota calculation | `caches.keys()` + manual sum | `navigator.storage.estimate()` | Browser-native API, covers all storage (IDB + Cache + etc.), works in service workers |

**Key insight:** The IDB upgrade transaction is the hardest part of raw IndexedDB. One missed `createIndex()` call with the right `multiEntry: true` flag and queries silently return wrong results. Dexie's schema string handles all of this declaratively.

---

## Common Pitfalls

### Pitfall 1: Compound Index Objects Missing a Key

**What goes wrong:** A `ProcessingJob` is inserted without setting `status` or `nextRetryAt`. Dexie silently omits the object from the `[status+nextRetryAt]` compound index. The queue processor never picks up the job.

**Why it happens:** IndexedDB only indexes objects where all compound key paths have valid values.

**How to avoid:** TypeScript interfaces enforce required fields. Never use `Partial<ProcessingJob>` on insert. Always set `status: 'pending'` and `nextRetryAt: Date.now()` on job creation.

**Warning signs:** Jobs visible in DevTools IndexedDB panel but never processed.

### Pitfall 2: Service Worker Termination Mid-Batch

**What goes wrong:** The worker terminates after marking a job `processing` but before marking it `done`. On next alarm tick, the job is stuck in `processing` state and skipped by the batch query.

**Why it happens:** `between(['pending', 0], ['pending', now])` only picks up `status='pending'` jobs.

**How to avoid:** Add a "stale processing" recovery pass: on each alarm tick, also fetch jobs with `status='processing'` AND `createdAt` older than some threshold (e.g. 2 minutes), and reset them to `pending`. Alternatively, treat `processing` as idempotent — safe to restart.

**Warning signs:** Jobs permanently stuck in `processing` state.

### Pitfall 3: Dexie Not Installed Yet

**What goes wrong:** TypeScript errors on import because `dexie` is not in `package.json`.

**Why it happens:** The project was scaffolded without Dexie in Phase 1.

**How to avoid:** `pnpm add dexie dexie-react-hooks` and `pnpm add -D fake-indexeddb` are Wave 0 prerequisites.

**Warning signs:** `Cannot find module 'dexie'` at compile time.

### Pitfall 4: vitest.config.ts Environment Conflict

**What goes wrong:** Dexie and fake-indexeddb tests fail because the jsdom environment doesn't expose `structuredClone` (required by fake-indexeddb v5+).

**Why it happens:** Node 17+ has native `structuredClone`; jsdom has it too (recent versions). But older jsdom may not. Vitest uses `jsdom` per the existing config.

**How to avoid:** `fake-indexeddb` v6 requires `structuredClone` but Node 17+ provides it. Check with `vitest --version`. The existing `vitest.config.ts` uses `jsdom` — verify `structuredClone` is available. If not, upgrade jsdom or add a polyfill in `src/test/setup.ts`.

**Warning signs:** `structuredClone is not defined` in test output.

### Pitfall 5: chrome.storage.local.set is async but callback-based

**What goes wrong:** After calling `chrome.storage.local.set({ storageWarning: true })`, tests assert the value was written, but the mock callback was not called because it was synchronous.

**Why it happens:** `vitest-chrome` mocks have no default implementation — they are no-ops unless you wire them up.

**How to avoid:** Always mock `chrome.storage.local.set` and `.get` in tests that exercise quota logic. The mock pattern in Pattern 8 above covers this.

**Warning signs:** Quota warning tests pass vacuously — `storageWarning` is never actually set.

### Pitfall 6: Compound Index Query Direction

**What goes wrong:** `where('[status+nextRetryAt]').between(['pending', 0], ['pending', now])` returns empty even when pending jobs exist.

**Why it happens:** The `between()` bounds must be arrays matching the compound key structure exactly. Swapping the order or using a non-array key throws silently.

**How to avoid:** Test the compound query in isolation with known test data before integrating into the processor.

---

## Code Examples

### Full Schema Definition

```typescript
// Source: verified Dexie 4 EntityTable pattern + Dexie index syntax docs
import Dexie, { type EntityTable } from 'dexie'
import type { Bookmark, PageContent, ProcessingJob } from '@/shared/types/db'

export class BookmarkBrainDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>
  pageContent!: EntityTable<PageContent, 'id'>
  processingQueue!: EntityTable<ProcessingJob, 'id'>

  constructor(options?: { indexedDB?: IDBFactory; IDBKeyRange?: typeof IDBKeyRange }) {
    super('bookmark-brain', options)
    this.version(1).stores({
      // bookmarks: auto-increment PK, unique url, multiEntry tags,
      //            compound [status+createdAt] for sorted status queries,
      //            plain updatedAt and deviceId for v2 sync
      bookmarks: '++id, &url, *tags, [status+createdAt], updatedAt, deviceId',
      // pageContent: auto-increment PK, FK index on bookmarkId
      pageContent: '++id, bookmarkId',
      // processingQueue: auto-increment PK, compound [status+nextRetryAt] for batch fetch,
      //                  plain bookmarkId for lookup by bookmark
      processingQueue: '++id, bookmarkId, [status+nextRetryAt]',
    })
  }
}

export const db = new BookmarkBrainDB()

export function createTestDb(): BookmarkBrainDB {
  const { IDBFactory, IDBKeyRange } = require('fake-indexeddb')
  return new BookmarkBrainDB({ indexedDB: new IDBFactory(), IDBKeyRange })
}
```

### Enqueue a Job

```typescript
// src/shared/db/processingQueue.ts
import { db } from '@/shared/db/db'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'

export async function enqueueJob(bookmarkId: number): Promise<number> {
  const id = await db.processingQueue.add({
    bookmarkId,
    status: 'pending',
    attempts: 0,
    nextRetryAt: Date.now(),
    createdAt: Date.now(),
  })
  await checkAndUpdateQuotaWarning()
  return id as number
}
```

### Add a Bookmark

```typescript
// src/shared/db/bookmarks.ts
import { db } from '@/shared/db/db'
import { enqueueJob } from '@/shared/db/processingQueue'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'
import type { Bookmark } from '@/shared/types/db'

export async function addBookmark(
  data: Omit<Bookmark, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const now = Date.now()
  const id = await db.bookmarks.add({
    ...data,
    status: 'unprocessed',
    createdAt: now,
    updatedAt: now,
  })
  await enqueueJob(id as number)
  await checkAndUpdateQuotaWarning()
  return id as number
}

export async function getBookmarkByUrl(url: string): Promise<Bookmark | undefined> {
  return db.bookmarks.where('url').equals(url).first()
}
```

### Exponential Backoff Formula

The target delays are 1min, 5min, 25min (each ~5x the previous). This is base-5 exponential backoff:

```typescript
// delay for attempt N (0-indexed): 5^N minutes
// attempt 0 → 1 min (5^0 = 1)
// attempt 1 → 5 min (5^1 = 5)
// attempt 2 → 25 min (5^2 = 25)
function backoffDelayMs(attemptIndex: number): number {
  return Math.pow(5, attemptIndex) * 60 * 1000
}
```

### Test: CRUD isolation

```typescript
// src/shared/db/bookmarks.test.ts
import { createTestDb, BookmarkBrainDB } from '@/shared/db/db'

let testDb: BookmarkBrainDB

beforeEach(() => {
  testDb = createTestDb()
})

afterEach(async () => {
  await testDb.close()
})

it('persists a bookmark and retrieves it by URL', async () => {
  await testDb.bookmarks.add({
    url: 'https://example.com',
    title: 'Example',
    tags: [],
    status: 'unprocessed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceId: 'test-device',
  })

  const found = await testDb.bookmarks.where('url').equals('https://example.com').first()
  expect(found?.title).toBe('Example')
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Table<T, TKey>` typing | `EntityTable<T, KeyPropName>` | Dexie 4.0 (2023) | Primary key is auto-optional on insert; no need to pass `id: undefined` |
| `dexie-react-hooks` separate install | Same — still a separate package | Dexie 4.x | No change; must install separately |
| `liveQuery` not cross-worker | Works cross-worker via BroadcastChannel | Dexie 3.1+ | Service worker writes trigger React hook updates automatically |
| Alarm minimum 1 minute | Alarm minimum 30 seconds (Chrome 120+) | Chrome 120 (late 2023) | 0.4min keepalive interval in Phase 1 is valid; below 30s would be throttled in production |
| `fake-indexeddb` needed `structuredClone` polyfill | Node 17+ provides it natively | fake-indexeddb v5 | No manual polyfill needed if Node ≥ 17 |

**Deprecated/outdated:**
- `mapToClass()` pattern: Still works but no longer needed with `EntityTable` — plain interfaces are preferred in Dexie 4
- `Dexie.Observable` add-on for service worker change detection: Superseded by Dexie's built-in BroadcastChannel support in v3.1+

---

## Open Questions

1. **Stale `processing` job recovery**
   - What we know: A job marked `processing` that never resolves will be stuck forever
   - What's unclear: Whether Phase 2 should include the recovery logic or leave it for Phase 5
   - Recommendation: Include a simple recovery pass in `processQueueBatch()` — reset any job with `status='processing'` older than 2 minutes back to `pending`. Low cost to add now, avoids a painful bug in Phase 5.

2. **`deviceId` generation strategy**
   - What we know: `deviceId` field must be present per locked schema decisions for v2 sync
   - What's unclear: How to generate a stable device ID without a backend (no UUID v4 stored in `chrome.storage.local` was specified)
   - Recommendation: Generate once with `crypto.randomUUID()` (available in extension contexts), persist to `chrome.storage.local` as `deviceId`. Read on first use, reuse thereafter. This can be a small helper in `src/shared/db/`.

3. **Dexie `liveQuery` in service worker context**
   - What we know: `liveQuery` uses BroadcastChannel, which works in service workers
   - What's unclear: Whether the service worker needs reactive queries or if polling on alarm tick is sufficient
   - Recommendation: The service worker does not need `liveQuery`. It reads from DB on alarm tick — polling is fine here. `useLiveQuery` is for the UI in Phase 6+.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:run --reporter=verbose src/shared/db` |
| Full suite command | `pnpm test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SET-04 | Bookmark data stored locally — no network call | unit | `pnpm test:run src/shared/db` | ❌ Wave 0 |
| (Implicit) | Bookmark persists after Dexie close/reopen | unit | `pnpm test:run src/shared/db/bookmarks.test.ts` | ❌ Wave 0 |
| (Implicit) | Queue job created when bookmark added | unit | `pnpm test:run src/shared/db/processingQueue.test.ts` | ❌ Wave 0 |
| (Implicit) | Alarm handler calls processQueueBatch | unit | `pnpm test:run src/background/queue/processor.test.ts` | ❌ Wave 0 |
| (Implicit) | Failed job retried with backoff delay | unit | `pnpm test:run src/background/queue/processor.test.ts` | ❌ Wave 0 |
| (Implicit) | Job marked `failed` after 3 attempts | unit | `pnpm test:run src/background/queue/processor.test.ts` | ❌ Wave 0 |
| (Implicit) | storageWarning written to chrome.storage.local at 70% | unit | `pnpm test:run src/shared/db/quota.test.ts` | ❌ Wave 0 |
| (Implicit) | requeueFailedApiKeyJobs resets matching jobs to pending | unit | `pnpm test:run src/shared/db/processingQueue.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test:run src/shared/db`
- **Per wave merge:** `pnpm test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/shared/db/bookmarks.test.ts` — covers bookmark CRUD and persistence
- [ ] `src/shared/db/processingQueue.test.ts` — covers enqueue, retry, backoff, requeueFailedApiKeyJobs
- [ ] `src/shared/db/quota.test.ts` — covers checkAndUpdateQuotaWarning
- [ ] `src/background/queue/processor.test.ts` — covers processQueueBatch, error handling, stale job recovery
- [ ] `src/shared/types/db.ts` — entity interfaces (not a test but required before any test compiles)
- [ ] Install: `pnpm add dexie dexie-react-hooks && pnpm add -D fake-indexeddb`

---

## Sources

### Primary (HIGH confidence)

- Dexie.js GitHub Releases — verified v4.3.0 is current stable (Jan 30, 2025)
- [Dexie Compound Index Wiki](https://github.com/dexie/Dexie.js/wiki/Compound-Index) — exact `.where('[A+B]').between()` query syntax
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms) — 30s minimum period, alarm creation syntax, onAlarm handler pattern
- [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — termination conditions, global variable loss, storage recommendations
- [MDN StorageManager.estimate()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate) — `{ usage, quota }` return shape, Web Worker availability, secure context requirement
- [fake-indexeddb GitHub](https://github.com/dumbmatter/fakeIndexedDB) — v6.2.5, explicit constructor injection pattern for Dexie
- [vitest-chrome GitHub](https://github.com/probil/vitest-chrome) — mock capabilities, no-default-implementation constraint

### Secondary (MEDIUM confidence)

- [Dexie TypeScript Guide (deepwiki)](https://deepwiki.com/dexie/dexie-website/1.1-getting-started) — `EntityTable<T, KeyPropName>` pattern, index prefix syntax table (verified against Dexie releases)
- [Dexie npm page](https://www.npmjs.com/package/dexie) — v4.3.0 confirmed, 956 dependents
- [firefly semantics Dexie TypeScript guide](https://developer.fireflysemantics.com/guides/guides--dexie--browser-big-data-with-dexie-and-typescript/) — class-based Dexie pattern (older style, still valid, superseded by EntityTable)

### Tertiary (LOW confidence)

- Various WebSearch results on MV3 queue patterns — directionally correct but not from official Chrome docs; cross-verified with Chrome official docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Dexie v4.3.0 confirmed on npm; fake-indexeddb v6.2.5 confirmed on GitHub
- Architecture: HIGH — Dexie EntityTable pattern confirmed; compound index query syntax from official wiki; alarm/storage patterns from official Chrome docs
- Pitfalls: HIGH — compound index silent omission is in official Dexie docs; service worker termination behavior from official Chrome docs; vitest-chrome no-default-impl from official README
- Test patterns: MEDIUM — explicit fake-indexeddb constructor injection confirmed; chrome.storage.local mock derived from vitest-chrome's documented mock pattern

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (Dexie is stable; Chrome API behavior is stable; 90 days conservative estimate)
