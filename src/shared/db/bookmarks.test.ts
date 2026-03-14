import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addBookmark,
  deleteBookmark,
  getBookmark,
  getBookmarkByUrl,
  updateBookmark,
} from '@/shared/db/bookmarks'
import { type BookmarkBrainDB, createTestDb } from '@/shared/db/db'

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

const sampleData = {
  url: 'https://example.com',
  title: 'Example Site',
  tags: ['test'],
  deviceId: 'test-device',
}

describe('addBookmark', () => {
  it('returns a numeric id > 0', async () => {
    const id = await addBookmark(sampleData, testDb)
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('automatically creates a processing job after add', async () => {
    await addBookmark(sampleData, testDb)
    const jobs = await testDb.processingQueue.toArray()
    expect(jobs).toHaveLength(1)
    expect(jobs[0].status).toBe('pending')
  })

  it('throws on duplicate URL', async () => {
    await addBookmark(sampleData, testDb)
    await expect(addBookmark(sampleData, testDb)).rejects.toThrow()
  })
})

describe('getBookmarkByUrl', () => {
  it('finds the bookmark just added', async () => {
    await addBookmark(sampleData, testDb)
    const found = await getBookmarkByUrl(sampleData.url, testDb)
    expect(found).toBeDefined()
    expect(found?.title).toBe('Example Site')
  })

  it('returns undefined for unknown URL', async () => {
    const found = await getBookmarkByUrl('https://unknown.com', testDb)
    expect(found).toBeUndefined()
  })
})

describe('getBookmark', () => {
  it('retrieves bookmark by id', async () => {
    const id = await addBookmark(sampleData, testDb)
    const found = await getBookmark(id, testDb)
    expect(found).toBeDefined()
    expect(found?.url).toBe(sampleData.url)
  })
})

describe('deleteBookmark', () => {
  it('removes the bookmark; getBookmark returns undefined after deletion', async () => {
    const id = await addBookmark(sampleData, testDb)
    await deleteBookmark(id, testDb)
    const found = await getBookmark(id, testDb)
    expect(found).toBeUndefined()
  })
})

describe('updateBookmark', () => {
  it('modifies the title; subsequent getBookmark returns updated title', async () => {
    const id = await addBookmark(sampleData, testDb)
    await updateBookmark(id, { title: 'Updated Title' }, testDb)
    const found = await getBookmark(id, testDb)
    expect(found?.title).toBe('Updated Title')
  })
})
