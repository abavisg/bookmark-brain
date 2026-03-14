export async function getOrCreateDeviceId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('deviceId', (result) => {
      if (result.deviceId) {
        resolve(result.deviceId as string)
      } else {
        const newId = crypto.randomUUID()
        chrome.storage.local.set({ deviceId: newId }, () => {
          resolve(newId)
        })
      }
    })
  })
}
