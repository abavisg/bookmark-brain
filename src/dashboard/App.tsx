export default function App() {
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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            Library
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            Search
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            Settings
          </span>
        </nav>
        <span className="text-xs text-gray-400 dark:text-gray-600 px-3">
          v0.1.0
        </span>
      </aside>

      <main className="p-8 flex flex-col items-center justify-center gap-3">
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
      </main>
    </div>
  )
}
