---
phase: 02-data-layer-processing-queue
plan: 02
subsystem: queue-processor
tags: [queue, processor, alarm, exponential-backoff, stale-recovery, message-types]
dependency_graph:
  requires:
    - 02-01 (src/shared/db — dequeueNextBatch, markJobDone, markJobFailed)
  provides:
    - src/background/queue/processor (processQueueBatch, processJob)
    - src/background/index.ts (keepalive alarm wired to processQueueBatch)
    - src/shared/types/messages (SAVE_BOOKMARK, PROCESSING_STATUS message variants)
  affects:
    - Phase 3 (will call addBookmark, add SAVE_BOOKMARK message handler)
    - Phase 5 (will replace processJob stub body with AI processing logic)
tech_stack:
  added: []
  patterns:
    - Optional jobProcessor parameter for test injection (avoids ESM spy limitations)
    - Stale recovery pass before batch fetch (ordering guarantees no double-processing)
    - Sequential job processing (no concurrent await — avoids service worker race conditions)
key_files:
  created:
    - src/background/queue/processor.ts
    - src/background/queue/processor.test.ts
  modified:
    - src/background/index.ts
    - src/shared/types/messages.ts
decisions:
  - "jobProcessor optional parameter chosen over vi.spyOn for processJob — ESM module boundaries prevent spy interception of same-module calls; injectable fn parameter is the clean Vitest-compatible solution"
  - "Stale recovery sets nextRetryAt=Date.now() meaning recovered jobs are immediately eligible for same-tick processing — acceptable because they receive standard backoff handling on next failure"
  - "backoffDelayMs function kept only in processingQueue.ts — processor.ts delegates entirely to markJobFailed for backoff logic, no duplication"
metrics:
  duration: ~600s
  completed: 2026-03-14
  tasks_completed: 2/2
  files_created: 2
  files_modified: 2
  tests_passed: 11/11 (processor) + 32 pre-existing = 43/43 total
---

# Phase 2 Plan 2: Queue Processor + Alarm Integration Summary

**One-liner:** Alarm-driven queue processor with stale-job recovery, base-5 exponential backoff, and extended AppMessage union for bookmark-saving and status messages

---

## What Was Built

### Queue Processor (`src/background/queue/processor.ts`)

Exports two functions:

**`processJob(_job: ProcessingJob): Promise<void>`** — Phase 5 stub, resolves as no-op. Exported as named export so Phase 5 can replace the body without touching call sites.

**`processQueueBatch(dbInstance?, jobProcessor?): Promise<void>`** — The operational heart of the extension. Called every 24 seconds via the keepalive alarm. Algorithm:

1. **Stale recovery pass (runs first):** Queries `processingQueue` for jobs with `status='processing'` AND `createdAt <= Date.now() - 120_000ms`. Resets each to `{status: 'pending', nextRetryAt: Date.now()}`. Handles service worker termination mid-batch without permanent job loss. Uses plain `.filter()` (no compound index on `[status+createdAt]` exists for processingQueue — acceptable because stale jobs are rare and the queue is small).

2. **Batch fetch:** Calls `dequeueNextBatch(3, Date.now(), dbInstance)` — uses the `[status+nextRetryAt]` compound index for fast O(log n) lookup of pending jobs with `nextRetryAt <= now`.

3. **Sequential processing:** For each job:
   - Sets `status='processing'` before work begins (prevents double-pick-up by a concurrent alarm tick)
   - Awaits `doProcessJob(job)` (injectable via `jobProcessor` param, defaults to `processJob` stub)
   - On success: `markJobDone(job.id, job.bookmarkId)` — sets job+bookmark to `done`
   - On error: `markJobFailed(job, errorMessage)` — delegates backoff logic to processingQueue module

**Constants:**
```
BATCH_SIZE = 3
STALE_THRESHOLD_MS = 120_000ms (2 minutes)
```

**Backoff** (delegated to `markJobFailed` in processingQueue.ts):
```
attempt 0 → 1 failure  → nextRetryAt + 60_000ms  (1 min)
attempt 1 → 2 failures → nextRetryAt + 300_000ms (5 min)
attempt 2 → 3 failures → status = 'failed' (permanent)
```

### Alarm Handler Integration (`src/background/index.ts`)

The keepalive alarm handler now calls the processor:

```typescript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    processQueueBatch().catch(console.error)
  }
})
```

The `onMessage` and `onInstalled` listeners are unchanged.

### Message Types (`src/shared/types/messages.ts`)

`AppMessage` extended from 2 to 4 variants:

```typescript
export type AppMessage =
  | { type: 'PING' }
  | { type: 'GET_STATUS' }
  | { type: 'SAVE_BOOKMARK'; payload: { url: string; title: string; favicon?: string } }
  | { type: 'PROCESSING_STATUS'; payload: { bookmarkId: number } }
```

`AppResponse` extended with chained conditionals for all 4 types:

```typescript
export type AppResponse<T extends AppMessage> = T extends { type: 'PING' }
  ? { alive: boolean }
  : T extends { type: 'GET_STATUS' }
    ? { version: string }
    : T extends { type: 'SAVE_BOOKMARK' }
      ? { bookmarkId: number; alreadyExists: boolean }
      : T extends { type: 'PROCESSING_STATUS' }
        ? { status: BookmarkStatus }
        : never
```

`BookmarkStatus` imported from `@/shared/types/db`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Design] Added `jobProcessor` optional parameter for test isolation**

- **Found during:** Task 1 — initial test implementation
- **Issue:** The plan specified "Export `processJob` as a named export so tests can spy on it." In Vitest with ESM modules, `vi.spyOn` on a named export cannot intercept calls to the same function within its own module — the local binding is used directly, not the module namespace reference.
- **Fix:** Added optional `jobProcessor?: (job: ProcessingJob) => Promise<void>` parameter to `processQueueBatch()`. Tests pass a `vi.fn()` mock; production callers (background/index.ts) call `processQueueBatch()` with no args, which defaults to the real `processJob` stub. This is cleaner than module-level variable assignment and matches the `dbInstance` injection pattern already established by Plan 01.
- **Files modified:** `src/background/queue/processor.ts`, `src/background/queue/processor.test.ts`
- **Impact:** Phase 5 replaces the `processJob` function body directly — the injection parameter is only for tests.

**2. [Rule 3 - Lint] Fixed Biome import ordering and line length in new files**

- **Found during:** Task 1 — `pnpm lint` run
- **Issue:** Biome requires `import type` before value imports from the same module, and enforces max line length causing long mock chains to wrap.
- **Fix:** `npx biome check --write src/background/queue/` + `pnpm format` — auto-fixed all issues.
- **Files modified:** `src/background/queue/processor.ts`, `src/background/queue/processor.test.ts`, `src/shared/types/messages.ts`

---

## Verification Output

### `pnpm test:run --reporter=verbose`

```
Test Files  7 passed (7)
Tests       43 passed (43)
Duration    ~1.78s
```

New tests (processor.test.ts — 11 tests):
- `processQueueBatch - no pending jobs`: returns without error; does not call processJob
- `processQueueBatch - pending job processing`: marks processing before call; markJobDone on success; backoff re-queue on attempt 0 failure; permanent fail on attempt 2
- `processQueueBatch - stale job recovery`: resets stale jobs (does not leave stuck); preserves recent processing jobs
- `processQueueBatch - backoff enforcement`: does not dequeue future-nextRetryAt jobs
- `processQueueBatch - batch size limit`: processes at most 3 jobs per call
- `processJob stub`: exported, resolves as no-op

Pre-existing tests (32 tests across 6 files): all still passing.

### `pnpm type-check`

Exit 0. No errors.

### `pnpm lint`

```
Checked 31 files in 9ms. No fixes applied.
```

Exit 0. No errors.

---

## Key Patterns for Downstream Plans

### processJob stub entry point (Phase 5)

Phase 5 replaces only the body of `processJob` in `src/background/queue/processor.ts`:

```typescript
export async function processJob(job: ProcessingJob): Promise<void> {
  // Phase 5: extract page content, call AI API, write summary/tags back to DB
}
```

The call site in `processQueueBatch` does not change.

### SAVE_BOOKMARK message handler (Phase 3)

Phase 3 adds the `case 'SAVE_BOOKMARK':` handler to the `onMessage` switch in `src/background/index.ts`. The type is already declared in `messages.ts` — TypeScript will enforce the response shape `{ bookmarkId: number; alreadyExists: boolean }`.

### processQueueBatch production call

```typescript
// background/index.ts — called on every keepalive alarm (every 24 seconds)
processQueueBatch().catch(console.error)

// Test injection pattern:
processQueueBatch(testDb, mockProcessJob)
```

---

## Self-Check

### Files exist

```
src/background/queue/processor.ts   — FOUND
src/background/queue/processor.test.ts — FOUND
src/background/index.ts (modified)  — FOUND
src/shared/types/messages.ts (modified) — FOUND
```

### Commits

- `239f595` — feat(02-02): queue processor with stale-job recovery and exponential backoff
- `6ec3ae0` — feat(02-02): wire processQueueBatch into alarm handler and extend AppMessage types

## Self-Check: PASSED
