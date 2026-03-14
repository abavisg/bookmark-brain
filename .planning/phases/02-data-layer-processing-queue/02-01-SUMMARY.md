---
phase: 02-data-layer-processing-queue
plan: 01
subsystem: data-layer
tags: [dexie, indexeddb, crud, processing-queue, storage-quota, device-id]
dependency_graph:
  requires: []
  provides:
    - src/shared/db (full CRUD API)
    - src/shared/types/db (entity types)
  affects:
    - All phases 03-10 (consumers of this data layer)
tech_stack:
  added:
    - dexie@4.3.0
    - dexie-react-hooks@4.2.0
    - fake-indexeddb@6.2.5 (devDependency)
  patterns:
    - Dexie 4 EntityTable<T, KeyPropName> typing pattern
    - Optional dbInstance parameter for test injection
    - createTestDb() factory with explicit fake-indexeddb injection
key_files:
  created:
    - src/shared/types/db.ts
    - src/shared/db/db.ts
    - src/shared/db/bookmarks.ts
    - src/shared/db/pageContent.ts
    - src/shared/db/processingQueue.ts
    - src/shared/db/quota.ts
    - src/shared/db/deviceId.ts
    - src/shared/db/index.ts
    - src/shared/db/bookmarks.test.ts
    - src/shared/db/processingQueue.test.ts
    - src/shared/db/quota.test.ts
  modified:
    - package.json (added dexie, dexie-react-hooks, fake-indexeddb)
    - src/shared/types/db.ts (reformatted by Biome)
decisions:
  - "Dexie schema: '++id, &url, *tags, [status+createdAt], updatedAt, deviceId' for bookmarks; '++id, bookmarkId, [status+nextRetryAt]' for processingQueue"
  - "dbInstance optional parameter pattern chosen for testability — no module mock swapping needed"
  - "createTestDb() uses top-level import (not dynamic require) from fake-indexeddb to avoid TypeScript ESM require errors"
  - "quota.test.ts uses globalThis.chrome (set via setup.ts) not direct vitest-chrome import (which exports chrome as a named export, not the object itself)"
  - "Backoff formula: 5^attemptIndex * 60 * 1000ms (1min, 5min, 25min for attempts 0,1,2)"
  - "MAX_ATTEMPTS = 3 — on 3rd failure (newAttempts >= 3), job is permanently failed"
metrics:
  duration: ~600s
  completed: 2026-03-14
  tasks_completed: 2/2
  files_created: 11
  tests_passed: 20/20
---

# Phase 2 Plan 1: Data Layer (Dexie + CRUD + Queue) Summary

**One-liner:** Dexie 4 EntityTable schema with 3-table IndexedDB + full typed CRUD layer + compound-index queue + quota monitor

---

## What Was Built

### Package installations

- `dexie@4.3.0` — IndexedDB wrapper (production dependency)
- `dexie-react-hooks@4.2.0` — `useLiveQuery` for Phase 6+ UI (production dependency)
- `fake-indexeddb@6.2.5` — In-memory IDB for tests (devDependency)

### TypeScript Entity Types (`src/shared/types/db.ts`)

Defines `BookmarkStatus`, `JobStatus` unions plus `Bookmark`, `PageContent`, `ProcessingJob` interfaces. The `Bookmark` interface includes `summary`, `tags`, `entities` fields from day one so Phase 5 can write them without a schema migration. The `updatedAt` and `deviceId` fields are included for v2 sync compatibility.

### Dexie Database Class (`src/shared/db/db.ts`)

`BookmarkBrainDB extends Dexie` with the exact schema:

```
bookmarks:       '++id, &url, *tags, [status+createdAt], updatedAt, deviceId'
pageContent:     '++id, bookmarkId'
processingQueue: '++id, bookmarkId, [status+nextRetryAt]'
```

Production singleton `db` exported. Test factory `createTestDb()` constructs with explicit `fake-indexeddb` IDBFactory per call — guarantees per-test isolation.

### Bookmark CRUD (`src/shared/db/bookmarks.ts`)

All functions accept optional `dbInstance?: BookmarkBrainDB` parameter (defaults to `db` singleton). `addBookmark()` automatically calls `enqueueJob()` and `checkAndUpdateQuotaWarning()` after insert. `updateBookmark()` always sets `updatedAt = Date.now()`.

### Page Content CRUD (`src/shared/db/pageContent.ts`)

`savePageContent()`, `getPageContent(bookmarkId)`, `evictPageContent(bookmarkId)`. `evictPageContent` used by quota monitor when storage is critical — deletes by `bookmarkId` index.

### Processing Queue (`src/shared/db/processingQueue.ts`)

- `enqueueJob()` — inserts `status:'pending'`, `attempts:0`, `nextRetryAt:now`
- `dequeueNextBatch(batchSize, now)` — uses compound index `.where('[status+nextRetryAt]').between(['pending', 0], ['pending', now])` — no full table scans
- `markJobDone(id, bookmarkId)` — sets job and bookmark status to `done`
- `markJobFailed(job, errorMessage)` — increments attempts; if `newAttempts >= MAX_ATTEMPTS (3)`: sets `failed`; else: backoff delay `5^(attempts-1) * 60 * 1000` ms
- `requeueFailedApiKeyJobs()` — filters failed jobs by `lastError.includes('api key')`, resets to pending with `attempts=0`

### Storage Quota Monitor (`src/shared/db/quota.ts`)

`checkAndUpdateQuotaWarning()` reads `navigator.storage.estimate()`, writes `{ storageWarning: boolean }` to `chrome.storage.local` when ratio >= 0.70. Called after every write operation (add/save). Guards with `if (!navigator.storage?.estimate) return` for unsupported contexts.

### Device ID Helper (`src/shared/db/deviceId.ts`)

`getOrCreateDeviceId()` — reads `chrome.storage.local.get('deviceId')`, generates `crypto.randomUUID()` if absent, persists and returns. Stable across service worker restarts.

### Barrel Export (`src/shared/db/index.ts`)

Exports all public symbols: `BookmarkBrainDB`, `db`, `createTestDb`, `addBookmark`, `getBookmark`, `getBookmarkByUrl`, `updateBookmark`, `deleteBookmark`, `savePageContent`, `getPageContent`, `evictPageContent`, `enqueueJob`, `dequeueNextBatch`, `markJobDone`, `markJobFailed`, `requeueFailedApiKeyJobs`, `checkAndUpdateQuotaWarning`, `getOrCreateDeviceId`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `require` usage in createTestDb() causing TypeScript error**

- **Found during:** Task 2 — type-check run
- **Issue:** The plan suggested `const { IDBFactory, IDBKeyRange } = require('fake-indexeddb')` inside the function body. The project's `tsconfig.app.json` has `"types": ["chrome"]` only — no `node` types — so `require` is not declared in scope (TS2591)
- **Fix:** Replaced dynamic `require` with top-level ESM `import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'` at the top of `db.ts`. The production singleton `db = new BookmarkBrainDB()` never uses these imports (it passes no options), so fake-indexeddb is effectively a test-only dependency at runtime even though it is statically imported.
- **Files modified:** `src/shared/db/db.ts`

**2. [Rule 1 - Bug] Fixed quota.test.ts chrome global access**

- **Found during:** Task 2 — first test run (quota tests failed with "Cannot read properties of undefined")
- **Issue:** The plan suggested `import * as chrome from 'vitest-chrome'` for accessing chrome mocks. However, `vitest-chrome`'s ESM module exports `{ chrome }` as a named export — the `* as chrome` import gives an object where `chrome.storage` is the actual thing, but `chrome` itself (the imported namespace) has no `.storage` property at top level. The global `chrome` object is correctly set by `setup.ts` via `Object.assign(global, chrome)` (where `chrome` is the named `chrome` export from vitest-chrome).
- **Fix:** Removed the `import * as chrome from 'vitest-chrome'` and added `declare const chrome: typeof globalThis.chrome` to use the globally-set mock directly.
- **Files modified:** `src/shared/db/quota.test.ts`

**3. [Rule 2 - Lint] Fixed Biome lint issues in initial implementation**

- **Found during:** Task 2 — `pnpm lint` run
- **Issues:** `Math.pow()` → `**` operator, bracket notation → dot notation, import order, trailing commas, non-null assertions in tests
- **Fix:** Applied `pnpm format` + `biome check --write` for fixable issues; manually replaced `job!` non-null assertions with `if (!job) throw` guards; replaced `Math.pow(5, x)` with `5 ** x`
- **Files modified:** `src/shared/db/processingQueue.ts`, `src/shared/db/processingQueue.test.ts`, `src/shared/db/deviceId.ts`, all import ordering in db files

---

## Verification Output

### `pnpm test:run src/shared/db --reporter=verbose`

```
Test Files  3 passed (3)
Tests       20 passed (20)
Duration    ~800ms
```

All 20 tests pass:
- `bookmarks.test.ts`: 8 tests (addBookmark returns id, enqueues job, rejects duplicate URL; getBookmarkByUrl finds/misses; getBookmark; deleteBookmark; updateBookmark)
- `processingQueue.test.ts`: 9 tests (enqueueJob creates pending job; dequeueNextBatch respects status+time+batchSize; markJobDone; markJobFailed backoff and failure; requeueFailedApiKeyJobs with/without matching errors)
- `quota.test.ts`: 3 tests (sets storageWarning:true at >=70%, false at <70%, no-op when estimate unavailable)

### `pnpm type-check`

Exit 0. No errors.

### `pnpm lint`

```
Checked 29 files in 60ms. No fixes applied.
```

Exit 0. No errors.

---

## Key Patterns for Downstream Plans

### dbInstance injection pattern
All CRUD functions accept `dbInstance?: BookmarkBrainDB` defaulting to the singleton. Plan 02 tests call functions with a `createTestDb()` instance — no module mock swapping needed.

```typescript
await addBookmark(data, testDb)           // test
await addBookmark(data)                    // production (uses singleton)
```

### createTestDb() factory
Per-test isolation: each test creates a fresh `BookmarkBrainDB` with a new `IDBFactory()` instance. No shared state between tests.

```typescript
let testDb: BookmarkBrainDB
beforeEach(() => { testDb = createTestDb() })
afterEach(async () => { await testDb.close() })
```

### Compound index dequeue pattern
```typescript
instance.processingQueue
  .where('[status+nextRetryAt]')
  .between(['pending', 0], ['pending', now], true, true)
  .limit(batchSize)
  .toArray()
```

### Backoff formula
`5 ** attemptIndex * 60 * 1000` ms — attempt 0→1min, 1→5min, 2→25min. Applied at `newAttempts - 1` (0-indexed relative to failures).

---

## Self-Check

### Files exist
- `src/shared/types/db.ts` — FOUND
- `src/shared/db/db.ts` — FOUND
- `src/shared/db/bookmarks.ts` — FOUND
- `src/shared/db/pageContent.ts` — FOUND
- `src/shared/db/processingQueue.ts` — FOUND
- `src/shared/db/quota.ts` — FOUND
- `src/shared/db/deviceId.ts` — FOUND
- `src/shared/db/index.ts` — FOUND
- `src/shared/db/bookmarks.test.ts` — FOUND
- `src/shared/db/processingQueue.test.ts` — FOUND
- `src/shared/db/quota.test.ts` — FOUND

### Commits
- `57b3eae` — feat(02-01): install Dexie 4 + define TypeScript entity types
- `c7cf394` — feat(02-01): Dexie 4 DB class + full CRUD layer + tests

## Self-Check: PASSED
