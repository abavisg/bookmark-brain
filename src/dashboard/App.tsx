import { useState } from 'react'

import { cn } from '@/lib/utils'
import SettingsPanel from '@/dashboard/components/SettingsPanel'

type DashboardTab = 'library' | 'search' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    if (window.location.hash === '#settings') return 'settings'
    return 'library'
  })

  return (
    <div className="min-h-screen grid grid-cols-[16rem_1fr] grid-rows-[4rem_1fr] bg-gray-50 dark:bg-gray-950">
      <header className="col-span-2 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <img
          src="/icons/icon32.png"
          alt="Bookmark Brain icon"
          className="w-8 h-8"
        />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Bookmark Brain
        </h1>
      </header>

      <aside className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between">
        <nav className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={cn(
              'text-sm font-medium px-3 py-2 rounded-md text-left transition-colors',
              activeTab === 'library'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={cn(
              'text-sm font-medium px-3 py-2 rounded-md text-left transition-colors',
              activeTab === 'search'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={cn(
              'text-sm font-medium px-3 py-2 rounded-md text-left transition-colors',
              activeTab === 'settings'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
          >
            Settings
          </button>
        </nav>
        <span className="text-xs text-gray-400 dark:text-gray-600 px-3">
          v0.1.0
        </span>
      </aside>

      <main className="p-8">
        {activeTab === 'library' && (
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <img
              src="/icons/icon48.png"
              alt="Bookmark Brain icon"
              className="w-12 h-12 opacity-60"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Welcome to Bookmark Brain
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your AI-powered bookmark library
            </p>
          </div>
        )}
        {activeTab === 'search' && (
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">Search coming soon</p>
          </div>
        )}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}
