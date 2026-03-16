import Dexie, { type EntityTable } from 'dexie'
// fake-indexeddb is a devDependency used only via createTestDb() — never called in production paths
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import type { Bookmark, DeletedBookmark, PageContent, ProcessingJob } from '@/shared/types/db'

export class BookmarkBrainDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>
  pageContent!: EntityTable<PageContent, 'id'>
  processingQueue!: EntityTable<ProcessingJob, 'id'>
  deletedBookmarks!: EntityTable<DeletedBookmark, 'id'>

  constructor(options?: {
    indexedDB?: IDBFactory
    IDBKeyRange?: typeof IDBKeyRange
  }) {
    super('bookmark-brain', options)
    this.version(1).stores({
      bookmarks: '++id, &url, *tags, [status+createdAt], updatedAt, deviceId',
      pageContent: '++id, bookmarkId',
      processingQueue: '++id, bookmarkId, [status+nextRetryAt]',
    })
    this.version(2).stores({
      deletedBookmarks: '++id, url, deletedAt',
    })
  }
}

export const db = new BookmarkBrainDB()

export function createTestDb(): BookmarkBrainDB {
  return new BookmarkBrainDB({ indexedDB: new IDBFactory(), IDBKeyRange })
}
