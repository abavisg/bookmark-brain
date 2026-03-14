import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { processJob, processQueueBatch } from '@/background/queue/processor'
import { type BookmarkBrainDB, createTestDb } from '@/shared/db'
import type { ProcessingJob } from '@/shared/types/db'

// Constants must match processor.ts
const STALE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes
const BATCH_SIZE = 3

// Helper to add a fake bookmark and return its id
async function addFakeBookmark(db: BookmarkBrainDB): Promise<number> {
  return db.bookmarks.add({
    url: `https://example.com/${Date.now()}-${Math.random()}`,
    title: 'Test Bookmark',
    tags: [],
    status: 'unprocessed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceId: 'test-device',
  })
}

// Helper to add a fake pending job
async function addPendingJob(
  db: BookmarkBrainDB,
  bookmarkId: number,
  nextRetryAt: number = Date.now() - 100,
): Promise<number> {
  return db.processingQueue.add({
    bookmarkId,
    status: 'pending',
    attempts: 0,
    nextRetryAt,
    createdAt: Date.now(),
  })
}

let testDb: BookmarkBrainDB
let mockProcessJob: ReturnType<typeof vi.fn<[ProcessingJob], Promise<void>>>

beforeEach(() => {
  testDb = createTestDb()
  mockProcessJob = vi
    .fn<[ProcessingJob], Promise<void>>()
    .mockResolvedValue(undefined)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await testDb.close()
})

describe('processQueueBatch - no pending jobs', () => {
  it('returns without error when there are no pending jobs', async () => {
    await expect(
      processQueueBatch(testDb, mockProcessJob),
    ).resolves.toBeUndefined()
  })

  it('does not call processJob when queue is empty', async () => {
    await processQueueBatch(testDb, mockProcessJob)
    expect(mockProcessJob).not.toHaveBeenCalled()
  })
})

describe('processQueueBatch - pending job processing', () => {
  it('marks job as processing before calling processJob', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await addPendingJob(testDb, bookmarkId)

    let statusDuringProcessing: string | undefined
    mockProcessJob.mockImplementation(async () => {
      const job = await testDb.processingQueue.get(jobId)
      statusDuringProcessing = job?.status
    })

    await processQueueBatch(testDb, mockProcessJob)

    expect(statusDuringProcessing).toBe('processing')
  })

  it('calls markJobDone when processJob resolves successfully', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await addPendingJob(testDb, bookmarkId)

    mockProcessJob.mockResolvedValue(undefined)
    await processQueueBatch(testDb, mockProcessJob)

    const job = await testDb.processingQueue.get(jobId)
    expect(job?.status).toBe('done')
  })

  it('re-queues job as pending with backoff when processJob rejects on attempt 0', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await addPendingJob(testDb, bookmarkId)

    const before = Date.now()
    mockProcessJob.mockRejectedValue(new Error('simulated failure'))

    await processQueueBatch(testDb, mockProcessJob)

    const job = await testDb.processingQueue.get(jobId)
    // After 1st failure (attempt 0 -> 1), backoff = 5^0 * 60 * 1000 = 60000ms
    expect(job?.status).toBe('pending')
    expect(job?.attempts).toBe(1)
    expect(job?.nextRetryAt).toBeGreaterThan(before + 59_000)
  })

  it('permanently marks job as failed after MAX_ATTEMPTS (3rd failure)', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await addPendingJob(testDb, bookmarkId)
    // Simulate 2 prior attempts so this is the 3rd
    await testDb.processingQueue.update(jobId, { attempts: 2 })

    mockProcessJob.mockRejectedValue(new Error('third failure'))

    await processQueueBatch(testDb, mockProcessJob)

    const job = await testDb.processingQueue.get(jobId)
    expect(job?.status).toBe('failed')
    expect(job?.attempts).toBe(3)
  })
})

describe('processQueueBatch - stale job recovery', () => {
  it('resets a stale processing job (older than STALE_THRESHOLD_MS) back to pending and does not leave it stuck', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    // Insert a job that got stuck in processing state (service worker terminated mid-job)
    const jobId = await testDb.processingQueue.add({
      bookmarkId,
      status: 'processing',
      attempts: 1,
      nextRetryAt: Date.now() - 5000,
      createdAt: Date.now() - STALE_THRESHOLD_MS - 1000,
    })

    await processQueueBatch(testDb, mockProcessJob)

    const job = await testDb.processingQueue.get(jobId)
    // The job must no longer be stuck in 'processing' state.
    // It may be 'done' (if immediately re-processed in same tick) or 'pending' (if deferred).
    // What must NOT happen: the job remains 'processing' (that would mean it's permanently stuck).
    expect(job?.status).not.toBe('processing')
  })

  it('does NOT reset a recent processing job (within STALE_THRESHOLD_MS)', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    // Insert a job that is processing but was created recently
    const jobId = await testDb.processingQueue.add({
      bookmarkId,
      status: 'processing',
      attempts: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now() - 30_000, // 30 seconds ago — not stale
    })

    await processQueueBatch(testDb, mockProcessJob)

    const job = await testDb.processingQueue.get(jobId)
    expect(job?.status).toBe('processing')
  })
})

describe('processQueueBatch - backoff enforcement', () => {
  it('does NOT pick up a job with nextRetryAt in the future', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    // Job scheduled 1 minute in the future
    await addPendingJob(testDb, bookmarkId, Date.now() + 60_000)

    await processQueueBatch(testDb, mockProcessJob)

    expect(mockProcessJob).not.toHaveBeenCalled()
  })
})

describe('processQueueBatch - batch size limit', () => {
  it('processes at most BATCH_SIZE (3) jobs per call', async () => {
    mockProcessJob.mockResolvedValue(undefined)

    // Add 5 pending jobs all ready now
    for (let i = 0; i < 5; i++) {
      const bookmarkId = await addFakeBookmark(testDb)
      await addPendingJob(testDb, bookmarkId)
    }

    await processQueueBatch(testDb, mockProcessJob)

    expect(mockProcessJob).toHaveBeenCalledTimes(BATCH_SIZE)
  })
})

describe('processJob stub', () => {
  it('is exported as a named export and resolves as a no-op', async () => {
    const fakeJob = {
      id: 1,
      bookmarkId: 1,
      status: 'pending' as const,
      attempts: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    }
    await expect(processJob(fakeJob)).resolves.toBeUndefined()
  })
})
