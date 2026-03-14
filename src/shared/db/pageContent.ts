import type { BookmarkBrainDB } from '@/shared/db/db'
import { db as defaultDb } from '@/shared/db/db'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'
import type { PageContent } from '@/shared/types/db'

export async function savePageContent(
  data: Omit<PageContent, 'id'>,
  dbInstance?: BookmarkBrainDB,
): Promise<number> {
  const instance = dbInstance ?? defaultDb
  const id = await instance.pageContent.add(data)
  await checkAndUpdateQuotaWarning()
  return id as number
}

export async function getPageContent(
  bookmarkId: number,
  dbInstance?: BookmarkBrainDB,
): Promise<PageContent | undefined> {
  const instance = dbInstance ?? defaultDb
  return instance.pageContent.where('bookmarkId').equals(bookmarkId).first()
}

export async function evictPageContent(
  bookmarkId: number,
  dbInstance?: BookmarkBrainDB,
): Promise<void> {
  const instance = dbInstance ?? defaultDb
  await instance.pageContent.where('bookmarkId').equals(bookmarkId).delete()
}
