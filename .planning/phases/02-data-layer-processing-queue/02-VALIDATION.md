# Phase 02 Validation Architecture

**Phase:** 02-data-layer-processing-queue
**Generated:** 2026-03-14

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test:run --reporter=verbose src/shared/db` |
| Full suite command | `pnpm test:run` |

---

## Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| SET-04 | Bookmark data stored locally — no network call | unit | `pnpm test:run src/shared/db` | `bookmarks.test.ts` |
| SC-1 | Bookmark persists after Dexie close/reopen | unit | `pnpm test:run src/shared/db/bookmarks.test.ts` | `bookmarks.test.ts` |
| SC-2 | Queue job survives service worker termination (stale recovery) | unit | `pnpm test:run src/background/queue/processor.test.ts` | `processor.test.ts` |
| SC-3 | Alarm handler calls processQueueBatch | unit | `pnpm test:run src/background/queue/processor.test.ts` | `processor.test.ts` |
| SC-4 | storageWarning written to chrome.storage.local at 70% threshold | unit | `pnpm test:run src/shared/db/quota.test.ts` | `quota.test.ts` |
| SC-5 | No network calls in any data operation | unit | `pnpm test:run src/shared/db` | all db tests |
| (queue) | Failed job retried with exponential backoff | unit | `pnpm test:run src/background/queue/processor.test.ts` | `processor.test.ts` |
| (queue) | Job marked `failed` after 3 attempts | unit | `pnpm test:run src/background/queue/processor.test.ts` | `processor.test.ts` |
| (queue) | requeueFailedApiKeyJobs resets matching jobs to pending | unit | `pnpm test:run src/shared/db/processingQueue.test.ts` | `processingQueue.test.ts` |
| (queue) | Queue job created when bookmark added | unit | `pnpm test:run src/shared/db/processingQueue.test.ts` | `processingQueue.test.ts` |

---

## Sampling Rate

- **Per task commit:** `pnpm test:run src/shared/db`
- **Per wave merge:** `pnpm test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Test Files Required

- [ ] `src/shared/db/bookmarks.test.ts` — CRUD and persistence
- [ ] `src/shared/db/processingQueue.test.ts` — enqueue, retry, backoff, requeueFailedApiKeyJobs
- [ ] `src/shared/db/quota.test.ts` — checkAndUpdateQuotaWarning at 70%
- [ ] `src/background/queue/processor.test.ts` — processQueueBatch, error handling, stale job recovery

---

## Pre-requisites Before Tests Can Compile

- [ ] `src/shared/types/db.ts` — entity interfaces (typed before any test file)
- [ ] Install: `pnpm add dexie dexie-react-hooks && pnpm add -D fake-indexeddb`
