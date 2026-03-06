import type { AppMessage, AppResponse } from '@/shared/types/messages'

export function sendMessage<T extends AppMessage>(
  message: T,
): Promise<AppResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: AppResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(response)
      }
    })
  })
}
