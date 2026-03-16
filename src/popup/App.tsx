import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { toast } from 'sonner'
import { BookmarkCard } from '@/popup/components/BookmarkCard'
import { useCurrentTab } from '@/popup/hooks/useCurrentTab'
import { useHasApiKey } from '@/popup/hooks/useHasApiKey'
import { sendMessage } from '@/shared/messages/bus'
import type { Bookmark } from '@/shared/types/db'

function getSyntheticBookmark(
  tab: chrome.tabs.Tab,
  bookmarkId: number,
): Bookmark {
  return {
    id: bookmarkId,
    url: tab.url ?? '',
    title: tab.title ?? tab.url ?? '',
    favicon: tab.favIconUrl,
    tags: [],
    status: 'unprocessed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deviceId: '',
  }
}

function FooterLink({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void
  children: React.ReactNode
}) {
  return (
    // biome-ignore lint/a11y/useValidAnchor: opens new tab via chrome.tabs.create
    <a
      href="#"
      onClick={onClick}
      className="w-full text-sm text-indigo-600 dark:text-indigo-400 hover:underline text-center block"
    >
      {children}
    </a>
  )
}

export default function App() {
  const tab = useCurrentTab()
  const hasApiKey = useHasApiKey()
  const isRestricted = !tab?.url || !tab.url.startsWith('http')

  const [savedBookmark, setSavedBookmark] = useState<Bookmark | null>(null)
  const [statusChecked, setStatusChecked] = useState(false)

  // Check if the current page is already saved
  useEffect(() => {
    if (!tab?.url || isRestricted) {
      setStatusChecked(true)
      return
    }

    // Use callback form so state updates occur synchronously within React act cycles
    chrome.runtime.sendMessage(
      { type: 'GET_BOOKMARK_STATUS', payload: { url: tab.url } },
      (
        response: { bookmarkId: number; alreadyExists: boolean } | undefined,
      ) => {
        if (response?.alreadyExists) {
          setSavedBookmark(getSyntheticBookmark(tab, response.bookmarkId))
        }
        setStatusChecked(true)
      },
    )
  }, [tab?.url, isRestricted, tab])

  // Show pending toast from keyboard shortcut
  useEffect(() => {
    chrome.storage.local.get(['pendingToast'], (result) => {
      const pending = result.pendingToast as { message: string } | undefined
      if (pending?.message) {
        toast.success(pending.message)
        chrome.storage.local.remove(['pendingToast'])
      }
    })
  }, [])

  const handleSave = async () => {
    if (!tab?.url || !tab.title) return
    const favicon = tab.favIconUrl
    const response = await sendMessage({
      type: 'SAVE_BOOKMARK',
      payload: { url: tab.url, title: tab.title, favicon },
    })
    setSavedBookmark(getSyntheticBookmark(tab, response.bookmarkId))
    toast.success('Saved!')
  }

  const handleUnsave = async () => {
    if (!tab?.url) return
    await sendMessage({ type: 'UNSAVE_BOOKMARK', payload: { url: tab.url } })
    setSavedBookmark(null)
    toast.success('Removed')
  }

  const handleViewDashboard = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/dashboard/index.html'),
    })
  }

  const handleOpenSettings = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/dashboard/index.html') + '#settings',
    })
  }

  const footer = (
    <footer className="pt-3 border-t border-gray-100 dark:border-gray-800">
      <FooterLink onClick={handleViewDashboard}>
        View saved bookmarks
      </FooterLink>
    </footer>
  )

  // Loading: tab not yet resolved
  if (tab === null && !statusChecked) {
    return (
      <div className="w-[380px] min-h-[200px] bg-white dark:bg-gray-900 p-6 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
        {footer}
      </div>
    )
  }

  return (
    <div className="w-[380px] min-h-[200px] bg-white dark:bg-gray-900 p-4 flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-2">
        <img
          src="/icons/icon32.png"
          alt="Bookmark Brain icon"
          className="w-6 h-6"
        />
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          Bookmark Brain
        </h1>
        <button
          type="button"
          onClick={handleOpenSettings}
          className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Onboarding banner */}
      {!hasApiKey && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
          <span className="text-amber-800 dark:text-amber-200">
            Add API key to enable AI features
          </span>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Set up now &rarr;
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        {isRestricted ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span>Cannot save this page</span>
          </div>
        ) : savedBookmark ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <span>&#10003;</span>
              <span>Bookmarked</span>
            </div>
            <BookmarkCard bookmark={savedBookmark} />
            <button
              type="button"
              onClick={handleUnsave}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Unsave
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tab && (
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {tab.title ?? tab.url}
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      {footer}
    </div>
  )
}
