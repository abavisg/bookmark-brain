import { useState } from 'react'
import type { Bookmark } from '@/shared/types/db'

function getFaviconUrl(pageUrl: string): string {
  try {
    const domain = new URL(pageUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface BookmarkCardProps {
  bookmark: Bookmark
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const [showFavicon, setShowFavicon] = useState(true)
  const faviconUrl = getFaviconUrl(bookmark.url)

  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="flex items-start gap-2">
        {showFavicon && faviconUrl && (
          <img
            src={faviconUrl}
            alt="favicon"
            width={16}
            height={16}
            className="mt-0.5 shrink-0"
            onError={() => setShowFavicon(false)}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
            {bookmark.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {bookmark.url}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Added {formatDate(bookmark.createdAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
