import { useEffect, useState } from 'react'

export function useCurrentTab(): chrome.tabs.Tab | null {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      setTab(activeTab ?? null)
    })
  }, [])

  return tab
}
