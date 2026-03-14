import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAndUpdateQuotaWarning } from '@/shared/db/quota'

// vitest-chrome assigns chrome.* to global in setup.ts via Object.assign(global, chrome)
// We declare chrome as existing on global so TypeScript is happy
declare const chrome: typeof globalThis.chrome

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('checkAndUpdateQuotaWarning', () => {
  it('calls chrome.storage.local.set with { storageWarning: true } when usage/quota >= 0.70', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 700, quota: 1000 }),
      },
    })

    vi.mocked(chrome.storage.local.set).mockImplementation(
      (_items: object, callback?: () => void) => {
        callback?.()
      },
    )

    await checkAndUpdateQuotaWarning()

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      storageWarning: true,
    })
  })

  it('calls chrome.storage.local.set with { storageWarning: false } when usage/quota < 0.70', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 300, quota: 1000 }),
      },
    })

    vi.mocked(chrome.storage.local.set).mockImplementation(
      (_items: object, callback?: () => void) => {
        callback?.()
      },
    )

    await checkAndUpdateQuotaWarning()

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      storageWarning: false,
    })
  })

  it('returns without throwing when navigator.storage.estimate is unavailable', async () => {
    vi.stubGlobal('navigator', {})

    await expect(checkAndUpdateQuotaWarning()).resolves.toBeUndefined()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })
})
