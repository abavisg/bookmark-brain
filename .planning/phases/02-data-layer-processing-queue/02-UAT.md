---
status: testing
phase: 02-data-layer-processing-queue
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Run `pnpm test:run` from a clean state. All 43 tests across 7 files pass with exit 0.
  Then run `pnpm type-check` and `pnpm lint` — both exit 0 with no errors.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Run `pnpm test:run` from a clean state. All 43 tests across 7 files pass with exit 0. Then run `pnpm type-check` and `pnpm lint` — both exit 0 with no errors.
result: pending

### 2. Bookmark Persists in IndexedDB
expected: |
  In a test (or browser console via extension), call `addBookmark({ url, title, ... })`.
  After closing and reopening the Dexie instance, `getBookmarkByUrl(url)` returns the same record.
  The bookmark has `status: 'pending'` and a matching `processingQueue` job was created automatically.
result: pending

### 3. Duplicate URL Rejection
expected: |
  Calling `addBookmark()` with a URL that already exists throws an error (or rejects the promise).
  The duplicate is not saved — only one record exists in `bookmarks` for that URL.
result: pending

### 4. Queue Job Retry and Backoff
expected: |
  When a processing job fails once, it is re-queued with `nextRetryAt` approximately 1 minute in the future (not immediately).
  After a second failure, `nextRetryAt` is ~5 minutes out.
  After a third failure, the job status is permanently `failed` with no further retries scheduled.
result: pending

### 5. Stale Job Recovery
expected: |
  If a job is stuck in `status: 'processing'` for more than 2 minutes (simulating a service worker crash mid-job), the next `processQueueBatch()` call resets it to `pending`.
  The job is then eligible to be picked up and retried normally.
result: pending

### 6. Storage Quota Warning
expected: |
  When `navigator.storage.estimate()` reports usage >= 70% of quota, `chrome.storage.local` is updated with `{ storageWarning: true }`.
  When usage drops below 70%, it is updated to `{ storageWarning: false }`.
result: pending

### 7. API Key Self-Healing
expected: |
  Jobs in `failed` state whose `lastError` contains "api key" are reset to `pending` (with `attempts: 0`) when `requeueFailedApiKeyJobs()` is called.
  Jobs failed for other reasons are not affected.
result: pending

### 8. Alarm Handler Wiring
expected: |
  `src/background/index.ts` imports and calls `processQueueBatch()` inside the keepalive alarm handler.
  `pnpm type-check` confirms the wiring is type-safe with no errors.
result: pending

### 9. New Message Types Compile
expected: |
  `src/shared/types/messages.ts` contains `SAVE_BOOKMARK` and `PROCESSING_STATUS` variants in `AppMessage`.
  `pnpm type-check` exits 0 — the new types are valid TypeScript with no errors.
result: pending

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
