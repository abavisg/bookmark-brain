export type BookmarkStatus = 'unprocessed' | 'queued' | 'processing' | 'done' | 'failed'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Bookmark {
  id: number           // auto-increment primary key — omit on insert
  url: string          // unique indexed — duplicate inserts throw
  title: string
  favicon?: string
  summary?: string     // populated by Phase 5 AI pipeline
  tags: string[]       // multiEntry indexed — each tag queryable individually
  entities?: string[]  // populated by Phase 5 — not yet displayed
  status: BookmarkStatus
  createdAt: number    // epoch ms
  updatedAt: number    // epoch ms — included for v2 sync compatibility
  deviceId: string     // stable device fingerprint — included for v2 sync compatibility
}

export interface PageContent {
  id: number
  bookmarkId: number   // FK to bookmarks.id
  rawText: string
  extractedAt: number  // epoch ms
}

export interface ProcessingJob {
  id: number
  bookmarkId: number   // FK to bookmarks.id
  status: JobStatus
  attempts: number     // starts at 0; incremented on each failed attempt
  nextRetryAt: number  // epoch ms — set to Date.now() for immediate; future for backoff
  lastError?: string   // stored on failure — used by requeueFailedApiKeyJobs to detect missing-key errors
  createdAt: number    // epoch ms
}
