import type { BookmarkBrainDB } from '@/shared/db/db'
import { db as defaultDb } from '@/shared/db/db'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'
import type { ProcessingJob } from '@/shared/types/db'

const MAX_ATTEMPTS = 3
const API_KEY_ERROR_SUBSTRING = 'api key'

function backoffDelayMs(attemptIndex: number): number {
  // Base-5 exponential: 5^0=1min, 5^1=5min, 5^2=25min
  return 5 ** attemptIndex * 60 * 1000
}

export async function enqueueJob(
  bookmarkId: number,
  dbInstance?: BookmarkBrainDB,
): Promise<number> {
  const instance = dbInstance ?? defaultDb
  const now = Date.now()
  const id = await instance.processingQueue.add({
    bookmarkId,
    status: 'pending',
    attempts: 0,
    nextRetryAt: now,
    createdAt: now,
  })
  await checkAndUpdateQuotaWarning()
  return id as number
}

export async function dequeueNextBatch(
  batchSize: number,
  now: number,
  dbInstance?: BookmarkBrainDB,
): Promise<ProcessingJob[]> {
  const instance = dbInstance ?? defaultDb
  return instance.processingQueue
    .where('[status+nextRetryAt]')
    .between(['pending', 0], ['pending', now], true, true)
    .limit(batchSize)
    .toArray()
}

export async function markJobDone(
  id: number,
  bookmarkId: number,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  await instance.processingQueue.update(id, { status: 'done' })
  await instance.bookmarks.update(bookmarkId, {
    status: 'done',
    updatedAt: Date.now(),
  })
}

export async function markJobFailed(
  job: ProcessingJob,
  errorMessage: string,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  const newAttempts = job.attempts + 1

  if (newAttempts >= MAX_ATTEMPTS) {
    await instance.processingQueue.update(job.id, {
      status: 'failed',
      attempts: newAttempts,
      lastError: errorMessage,
    })
    await instance.bookmarks.update(job.bookmarkId, {
      status: 'failed',
      updatedAt: Date.now(),
    })
  } else {
    const delayMs = backoffDelayMs(newAttempts - 1)
    await instance.processingQueue.update(job.id, {
      status: 'pending',
      attempts: newAttempts,
      nextRetryAt: Date.now() + delayMs,
      lastError: errorMessage,
    })
  }
}

export async function requeueFailedApiKeyJobs(
  dbInstance?: BookmarkBrainDB,
): Promise<number> {
  const instance = dbInstance ?? defaultDb
  const failedJobs = await instance.processingQueue
    .where('status')
    .equals('failed')
    .filter(
      (job) =>
        job.lastError?.toLowerCase().includes(API_KEY_ERROR_SUBSTRING) ?? false,
    )
    .toArray()

  const ids = failedJobs.map((j) => j.id)
  if (ids.length > 0) {
    await instance.processingQueue
      .where('id')
      .anyOf(ids)
      .modify({ status: 'pending', nextRetryAt: Date.now(), attempts: 0 })
  }

  return ids.length
}
