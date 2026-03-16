import { processQueueBatch } from '@/background/queue/processor'
import {
  handleSaveBookmark,
  handleUnsaveBookmark,
} from '@/background/saveBookmark'
import {
  handleGetSettings,
  handleSaveSettings,
  handleValidateApiKey,
} from '@/background/settings/settingsHandlers'
import { getBookmarkByUrl } from '@/shared/db/bookmarks'
import type { AppMessage } from '@/shared/types/messages'

chrome.runtime.onMessage.addListener(
  (message: AppMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ alive: true })
        break
      case 'GET_STATUS':
        sendResponse({ version: chrome.runtime.getManifest().version })
        break
      case 'SAVE_BOOKMARK': {
        const { url, title, favicon } = message.payload
        handleSaveBookmark({ url, title, favicon })
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true // keep channel open for async
      }
      case 'UNSAVE_BOOKMARK': {
        const { url } = message.payload
        handleUnsaveBookmark({ url })
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true // keep channel open for async
      }
      case 'GET_BOOKMARK_STATUS': {
        const { url } = message.payload
        getBookmarkByUrl(url)
          .then((bookmark) => {
            if (bookmark) {
              sendResponse({ bookmarkId: bookmark.id, alreadyExists: true })
            } else {
              sendResponse(undefined)
            }
          })
          .catch((err) => sendResponse({ error: String(err) }))
        return true // keep channel open for async
      }
      case 'SAVE_SETTINGS': {
        handleSaveSettings(message.payload)
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true
      }
      case 'GET_SETTINGS': {
        handleGetSettings()
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true
      }
      case 'VALIDATE_API_KEY': {
        handleValidateApiKey(message.payload)
          .then(sendResponse)
          .catch((err) => sendResponse({ error: String(err) }))
        return true
      }
      default:
        break
    }
    return false
  },
)

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    processQueueBatch().catch(console.error)
  }
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })
    if (!tab?.url || !tab.url.startsWith('http')) return
    const existing = await getBookmarkByUrl(tab.url)
    let toastMessage: string
    if (existing) {
      await handleUnsaveBookmark({ url: tab.url })
      toastMessage = 'Unsaved'
    } else {
      await handleSaveBookmark({
        url: tab.url,
        title: tab.title ?? tab.url,
        favicon: tab.favIconUrl,
      })
      toastMessage = 'Saved!'
    }
    await chrome.storage.local.set({
      pendingToast: { message: toastMessage, type: 'success' },
    })
  }
})
