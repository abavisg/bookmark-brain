import { sendMessage } from '@/shared/messages/bus'

describe('sendMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls chrome.runtime.sendMessage with the message and resolves with response', async () => {
    const mockResponse = { alive: true }
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        callback(mockResponse)
      },
    )

    const result = await sendMessage({ type: 'PING' })
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'PING' },
      expect.any(Function),
    )
    expect(result).toEqual({ alive: true })
  })

  it('rejects when chrome.runtime.lastError is set', async () => {
    const error = { message: 'Extension context invalidated' }
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        Object.defineProperty(chrome.runtime, 'lastError', {
          value: error,
          configurable: true,
        })
        callback(undefined)
      },
    )

    await expect(sendMessage({ type: 'PING' })).rejects.toEqual(error)

    // Clean up lastError
    Object.defineProperty(chrome.runtime, 'lastError', {
      value: undefined,
      configurable: true,
    })
  })
})
