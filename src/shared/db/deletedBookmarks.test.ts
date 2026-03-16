import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type BookmarkBrainDB, createTestDb } from '@/shared/db'
import { deleteBookmark } from '@/shared/db/bookmarks'
import { logDeletedBookmark } from '@/shared/db/deletedBookmarks'
import type { Bookmark } from '@/shared/types/db'

let testDb: BookmarkBrainDB

beforeEach(() => {
  testDb = createTestDb()
})

afterEach(async () => {
  await testDb.close()
})

// Helper: insert a raw bookmark record without going through addBookmark
// (avoids processingQueue enqueue side-effects)
async function insertBookmark(
  db: BookmarkBrainDB,
  overrides: Partial<Bookmark> = {},
): Promise<Bookmark> {
  const now = Date.now()
  const data: Omit<Bookmark, 'id'> = {
    url: 'https://example.com',
    title: 'Example',
    tags: [],
    status: 'unprocessed',
    createdAt: now,
    updatedAt: now,
    deviceId: 'test-device',
    ...overrides,
  }
  const id = await db.bookmarks.add(data)
  return { id: id as number, ...data }
}

describe('Dexie v2 migration — deletedBookmarks table', () => {
  it('createTestDb() creates a DB instance where deletedBookmarks table exists', () => {
    // After v2 migration the table must be present
    expect(testDb.deletedBookmarks).toBeDefined()
  })
})

describe('logDeletedBookmark', () => {
  it('inserts a record into deletedBookmarks with all original bookmark fields plus deletedAt', async () => {
    const bookmark = await insertBookmark(testDb)

    await logDeletedBookmark(bookmark, testDb)

    const records = await testDb.deletedBookmarks.toArray()
    expect(records).toHaveLength(1)

    const record = records[0]
    expect(record.url).toBe(bookmark.url)
    expect(record.title).toBe(bookmark.title)
    expect(record.tags).toEqual(bookmark.tags)
    expect(record.status).toBe(bookmark.status)
    expect(record.deviceId).toBe(bookmark.deviceId)
    expect(typeof record.deletedAt).toBe('number')
    expect(record.deletedAt).toBeGreaterThan(0)
  })

  it('preserves the original createdAt value (not overwritten with current time)', async () => {
    const originalCreatedAt = Date.now() - 100_000 // 100 seconds ago
    const bookmark = await insertBookmark(testDb, {
      createdAt: originalCreatedAt,
    })

    await logDeletedBookmark(bookmark, testDb)

    const records = await testDb.deletedBookmarks.toArray()
    expect(records[0].createdAt).toBe(originalCreatedAt)
  })

  it('after log+delete: bookmark absent from bookmarks, present in deletedBookmarks', async () => {
    const bookmark = await insertBookmark(testDb)

    // Log first, then delete — preserves record in deletedBookmarks
    await logDeletedBookmark(bookmark, testDb)
    await deleteBookmark(bookmark.id, testDb)

    const inBookmarks = await testDb.bookmarks.get(bookmark.id)
    expect(inBookmarks).toBeUndefined()

    const inDeleted = await testDb.deletedBookmarks.toArray()
    expect(inDeleted).toHaveLength(1)
    expect(inDeleted[0].url).toBe(bookmark.url)
  })
})
