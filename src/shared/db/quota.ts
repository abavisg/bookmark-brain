const QUOTA_WARNING_THRESHOLD = 0.7 // 70%

export async function checkAndUpdateQuotaWarning(): Promise<void> {
  if (!navigator.storage?.estimate) return
  const { usage = 0, quota = 1 } = await navigator.storage.estimate()
  const ratio = usage / quota
  const storageWarning = ratio >= QUOTA_WARNING_THRESHOLD
  await chrome.storage.local.set({ storageWarning })
}
