import type { BookmarkBrainDB } from '@/shared/db'
import { db, dequeueNextBatch, markJobDone, markJobFailed } from '@/shared/db'
import type { ProcessingJob } from '@/shared/types/db'

const BATCH_SIZE = 3
const STALE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

export async function processJob(_job: ProcessingJob): Promise<void> {
  // Phase 5 will implement: extract page content, call AI API, write summary/tags back
}

export async function processQueueBatch(
  dbInstance?: BookmarkBrainDB,
  jobProcessor?: (job: ProcessingJob) => Promise<void>,
): Promise<void> {
  const instance = dbInstance ?? db
  const doProcessJob = jobProcessor ?? processJob

  // 1. Stale job recovery pass (runs first, before dequeue)
  // Find jobs stuck in 'processing' state older than STALE_THRESHOLD_MS
  // Uses a plain filter (no compound index on [status+createdAt] for processingQueue)
  const staleJobs = await instance.processingQueue
    .where('status')
    .equals('processing')
    .filter((j) => j.createdAt <= Date.now() - STALE_THRESHOLD_MS)
    .toArray()

  for (const staleJob of staleJobs) {
    await instance.processingQueue.update(staleJob.id, {
      status: 'pending',
      nextRetryAt: Date.now(),
    })
  }

  // 2. Batch fetch — uses compound index [status+nextRetryAt]
  const jobs = await dequeueNextBatch(BATCH_SIZE, Date.now(), dbInstance)

  // 3. Process each job sequentially (not concurrently — avoids race conditions)
  for (const job of jobs) {
    // Mark as processing before starting work
    await instance.processingQueue.update(job.id, { status: 'processing' })

    try {
      await doProcessJob(job)
      await markJobDone(job.id, job.bookmarkId, dbInstance)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await markJobFailed(job, errorMessage, dbInstance)
    }
  }
}
