import type { BookmarkBrainDB } from '@/shared/db/db'
import { db as defaultDb } from '@/shared/db/db'
import { enqueueJob } from '@/shared/db/processingQueue'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'
import type { Bookmark } from '@/shared/types/db'

export async function addBookmark(
  data: Omit<Bookmark, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  dbInstance?: BookmarkBrainDB,
): Promise<number> {
  const instance = dbInstance ?? defaultDb
  const now = Date.now()
  const id = await instance.bookmarks.add({
    ...data,
    status: 'unprocessed',
    createdAt: now,
    updatedAt: now,
  })
  await enqueueJob(id as number, instance)
  await checkAndUpdateQuotaWarning()
  return id as number
}

export async function getBookmark(
  id: number,
  dbInstance?: BookmarkBrainDB,
): Promise<Bookmark | undefined> {
  const instance = dbInstance ?? defaultDb
  return instance.bookmarks.get(id)
}

export async function getBookmarkByUrl(
  url: string,
  dbInstance?: BookmarkBrainDB,
): Promise<Bookmark | undefined> {
  const instance = dbInstance ?? defaultDb
  return instance.bookmarks.where('url').equals(url).first()
}

export async function updateBookmark(
  id: number,
  changes: Partial<Omit<Bookmark, 'id'>>,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  await instance.bookmarks.update(id, { ...changes, updatedAt: Date.now() })
}

export async function deleteBookmark(
  id: number,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  await instance.bookmarks.delete(id)
}
