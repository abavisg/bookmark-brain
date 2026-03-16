import type { BookmarkBrainDB } from '@/shared/db/db'
import { db as defaultDb } from '@/shared/db/db'
import type { Bookmark } from '@/shared/types/db'

export async function logDeletedBookmark(
  bookmark: Bookmark,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  const { id: _id, ...rest } = bookmark
  await instance.deletedBookmarks.add({ ...rest, deletedAt: Date.now() })
}
