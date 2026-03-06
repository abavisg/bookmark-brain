export default function App() {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] grid-rows-[64px_1fr] bg-white dark:bg-gray-900">
      <header className="col-span-2 flex items-center px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Bookmark Brain
        </h1>
      </header>

      <aside className="border-r border-gray-200 dark:border-gray-700 p-4">
        <nav className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            Library
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            Search
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            Settings
          </span>
        </nav>
      </aside>

      <main className="p-8">
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to Bookmark Brain
        </p>
      </main>
    </div>
  )
}
