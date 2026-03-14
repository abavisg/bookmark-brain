import { processQueueBatch } from '@/background/queue/processor'
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
