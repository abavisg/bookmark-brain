import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type BookmarkBrainDB, createTestDb } from '@/shared/db/db'
import {
  dequeueNextBatch,
  enqueueJob,
  markJobDone,
  markJobFailed,
  requeueFailedApiKeyJobs,
} from '@/shared/db/processingQueue'

vi.mock('@/shared/db/quota', () => ({
  checkAndUpdateQuotaWarning: vi.fn().mockResolvedValue(undefined),
}))

let testDb: BookmarkBrainDB

beforeEach(() => {
  testDb = createTestDb()
})

afterEach(async () => {
  await testDb.close()
})

// Helper to add a fake bookmark and return its id
async function addFakeBookmark(testDb: BookmarkBrainDB): Promise<number> {
  return testDb.bookmarks.add({
    url: `https://example.com/${Date.now()}-${Math.random()}`,
    title: 'Test',
    tags: [],
    status: 'unprocessed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceId: 'test-device',
  })
}

describe('enqueueJob', () => {
  it('creates a job with status=pending, attempts=0, nextRetryAt approx now', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const before = Date.now()
    const id = await enqueueJob(bookmarkId, testDb)
    const after = Date.now()

    const job = await testDb.processingQueue.get(id)
    expect(job).toBeDefined()
    expect(job?.status).toBe('pending')
    expect(job?.attempts).toBe(0)
    expect(job?.nextRetryAt).toBeGreaterThanOrEqual(before)
    expect(job?.nextRetryAt).toBeLessThanOrEqual(after)
  })
})

describe('dequeueNextBatch', () => {
  it('returns only jobs with status=pending AND nextRetryAt <= now', async () => {
    const bookmarkId = await addFakeBookmark(testDb)

    // Job ready now
    await testDb.processingQueue.add({
      bookmarkId,
      status: 'pending',
      attempts: 0,
      nextRetryAt: Date.now() - 1000,
      createdAt: Date.now(),
    })

    // Job scheduled for the future
    await testDb.processingQueue.add({
      bookmarkId,
      status: 'pending',
      attempts: 0,
      nextRetryAt: Date.now() + 60000,
      createdAt: Date.now(),
    })

    const batch = await dequeueNextBatch(10, Date.now(), testDb)
    expect(batch).toHaveLength(1)
    expect(batch[0].nextRetryAt).toBeLessThanOrEqual(Date.now())
  })

  it('respects batchSize limit', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const now = Date.now()

    for (let i = 0; i < 5; i++) {
      await testDb.processingQueue.add({
        bookmarkId,
        status: 'pending',
        attempts: 0,
        nextRetryAt: now - 1000,
        createdAt: now,
      })
    }

    const batch = await dequeueNextBatch(3, now, testDb)
    expect(batch).toHaveLength(3)
  })
})

describe('markJobDone', () => {
  it('sets status=done on the job', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await enqueueJob(bookmarkId, testDb)

    await markJobDone(jobId, bookmarkId, testDb)

    const job = await testDb.processingQueue.get(jobId)
    expect(job?.status).toBe('done')

    const bookmark = await testDb.bookmarks.get(bookmarkId)
    expect(bookmark?.status).toBe('done')
  })
})

describe('markJobFailed', () => {
  it('with attempts < MAX_ATTEMPTS sets status=pending and nextRetryAt in future (backoff)', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await enqueueJob(bookmarkId, testDb)
    const job = await testDb.processingQueue.get(jobId)

    const before = Date.now()
    if (!job) throw new Error('job not found')
    await markJobFailed(job, 'some error', testDb)

    const updated = await testDb.processingQueue.get(jobId)
    expect(updated?.status).toBe('pending')
    expect(updated?.nextRetryAt).toBeGreaterThan(before)
    // First backoff: 5^0 * 60 * 1000 = 60000ms = 1 min
    const expectedDelay = 5 ** 0 * 60 * 1000
    expect(updated?.nextRetryAt).toBeGreaterThanOrEqual(
      before + expectedDelay - 500,
    )
    expect(updated?.nextRetryAt).toBeLessThanOrEqual(
      before + expectedDelay + 500,
    )
  })

  it('with attempts >= MAX_ATTEMPTS (3rd attempt) sets status=failed', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await enqueueJob(bookmarkId, testDb)

    // Simulate 2 prior attempts
    await testDb.processingQueue.update(jobId, { attempts: 2 })
    const job = await testDb.processingQueue.get(jobId)

    if (!job) throw new Error('job not found')
    await markJobFailed(job, 'some error', testDb)

    const updated = await testDb.processingQueue.get(jobId)
    expect(updated?.status).toBe('failed')
  })
})

describe('requeueFailedApiKeyJobs', () => {
  it('resets jobs whose lastError contains "api key" back to pending with attempts=0', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    const jobId = await testDb.processingQueue.add({
      bookmarkId,
      status: 'failed',
      attempts: 3,
      nextRetryAt: Date.now(),
      lastError: 'Missing api key for OpenAI',
      createdAt: Date.now(),
    })

    const count = await requeueFailedApiKeyJobs(testDb)
    expect(count).toBe(1)

    const job = await testDb.processingQueue.get(jobId)
    expect(job?.status).toBe('pending')
    expect(job?.attempts).toBe(0)
  })

  it('does NOT reset failed jobs whose lastError is unrelated to api keys', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    await testDb.processingQueue.add({
      bookmarkId,
      status: 'failed',
      attempts: 3,
      nextRetryAt: Date.now(),
      lastError: 'Network timeout',
      createdAt: Date.now(),
    })

    const count = await requeueFailedApiKeyJobs(testDb)
    expect(count).toBe(0)
  })

  it('does NOT reset failed jobs with no lastError', async () => {
    const bookmarkId = await addFakeBookmark(testDb)
    await testDb.processingQueue.add({
      bookmarkId,
      status: 'failed',
      attempts: 3,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
    })

    const count = await requeueFailedApiKeyJobs(testDb)
    expect(count).toBe(0)
  })
})
