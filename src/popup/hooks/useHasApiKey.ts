import { useEffect, useState } from 'react'

export function useHasApiKey(): boolean {
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    // Read initial value
    chrome.storage.local.get(['bbHasApiKey'], (result) => {
      setHasApiKey(result.bbHasApiKey === true)
    })

    // Subscribe to changes from other contexts (dashboard settings tab)
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && 'bbHasApiKey' in changes) {
        setHasApiKey(changes.bbHasApiKey.newValue === true)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return hasApiKey
}
