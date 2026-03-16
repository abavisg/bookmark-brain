import {
  addBookmark,
  deleteBookmark,
  getBookmarkByUrl,
} from '@/shared/db/bookmarks'
import type { BookmarkBrainDB } from '@/shared/db/db'
import { logDeletedBookmark } from '@/shared/db/deletedBookmarks'
import { getOrCreateDeviceId } from '@/shared/db/deviceId'

export async function showSaveBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '✓' })
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
  }, 2000)
}

export async function showUnsaveBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' })
  }, 2000)
}

export async function handleSaveBookmark(
  { url, title, favicon }: { url: string; title: string; favicon?: string },
  dbInstance?: BookmarkBrainDB,
): Promise<{ bookmarkId: number; alreadyExists: boolean }> {
  // Silently skip non-http URLs
  if (!url.startsWith('http')) {
    return { bookmarkId: 0, alreadyExists: false }
  }

  const existing = await getBookmarkByUrl(url, dbInstance)
  if (existing) {
    await showSaveBadge()
    return { bookmarkId: existing.id, alreadyExists: true }
  }

  const deviceId = await getOrCreateDeviceId()
  const bookmarkId = await addBookmark(
    { url, title, favicon, tags: [], deviceId },
    dbInstance,
  )
  await showSaveBadge()
  return { bookmarkId, alreadyExists: false }
}

export async function handleUnsaveBookmark(
  { url }: { url: string },
  dbInstance?: BookmarkBrainDB,
): Promise<{ bookmarkId: number; alreadyExists: boolean }> {
  const existing = await getBookmarkByUrl(url, dbInstance)
  if (!existing) {
    return { bookmarkId: 0, alreadyExists: false }
  }

  await logDeletedBookmark(existing, dbInstance)
  await deleteBookmark(existing.id, dbInstance)
  await showUnsaveBadge()
  return { bookmarkId: existing.id, alreadyExists: true }
}
