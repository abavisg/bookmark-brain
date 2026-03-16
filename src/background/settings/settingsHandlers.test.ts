import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleGetSettings,
  handleSaveSettings,
  handleValidateApiKey,
} from '@/background/settings/settingsHandlers'

vi.mock('@/shared/db/processingQueue', () => ({
  requeueFailedApiKeyJobs: vi.fn().mockResolvedValue(0),
}))

import { requeueFailedApiKeyJobs } from '@/shared/db/processingQueue'

beforeEach(() => {
  vi.clearAllMocks()
  // Reset storage mock to default empty
  chrome.storage.local.get.mockImplementation(
    (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
      callback({})
    },
  )
  chrome.storage.local.set.mockImplementation(
    (_items: unknown, callback?: () => void) => {
      if (callback) callback()
    },
  )
  chrome.storage.local.remove.mockImplementation(
    (_keys: unknown, callback?: () => void) => {
      if (callback) callback()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleSaveSettings', () => {
  it('Test 1: stores provider and hasApiKey=true in chrome.storage.local when apiKey is provided', async () => {
    const result = await handleSaveSettings({
      provider: 'openai',
      apiKey: 'sk-test123',
    })

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bbProvider: 'openai',
        bbHasApiKey: true,
      }),
      expect.any(Function),
    )
    expect(result).toEqual({ success: true })
  })

  it('Test 2: stores apiKey under bbApiKeySecret key separately from the flag', async () => {
    await handleSaveSettings({
      provider: 'openai',
      apiKey: 'sk-secret-key',
    })

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bbApiKeySecret: 'sk-secret-key',
      }),
      expect.any(Function),
    )
  })

  it('Test 3: with provider=ollama sets hasApiKey=true even without apiKey, stores ollamaBaseUrl', async () => {
    const result = await handleSaveSettings({
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
    })

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bbProvider: 'ollama',
        bbHasApiKey: true,
        bbOllamaBaseUrl: 'http://localhost:11434',
      }),
      expect.any(Function),
    )
    expect(result).toEqual({ success: true })
  })

  it('Test 4: calls requeueFailedApiKeyJobs after saving', async () => {
    await handleSaveSettings({
      provider: 'openai',
      apiKey: 'sk-test123',
    })

    expect(requeueFailedApiKeyJobs).toHaveBeenCalledTimes(1)
  })

  it('Test 11: with action=clear removes apiKey and sets hasApiKey=false', async () => {
    const result = await handleSaveSettings({
      provider: 'openai',
      action: 'clear',
    })

    expect(chrome.storage.local.remove).toHaveBeenCalledWith(
      ['bbApiKeySecret'],
      expect.any(Function),
    )
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bbHasApiKey: false,
        bbProvider: '',
      }),
      expect.any(Function),
    )
    expect(result).toEqual({ success: true })
  })
})

describe('handleGetSettings', () => {
  it('Test 5: returns { provider, hasApiKey, ollamaBaseUrl } but NOT the raw API key', async () => {
    chrome.storage.local.get.mockImplementation(
      (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
        callback({
          bbProvider: 'openai',
          bbHasApiKey: true,
          bbOllamaBaseUrl: 'http://localhost:11434',
        })
      },
    )

    const result = await handleGetSettings()

    expect(result).toEqual({
      provider: 'openai',
      hasApiKey: true,
      ollamaBaseUrl: 'http://localhost:11434',
    })
    // Verify raw API key is never in the result
    expect(result).not.toHaveProperty('apiKey')
    expect(result).not.toHaveProperty('bbApiKeySecret')
  })

  it('Test 6: returns defaults when nothing is configured', async () => {
    chrome.storage.local.get.mockImplementation(
      (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
        callback({})
      },
    )

    const result = await handleGetSettings()

    expect(result).toEqual({
      provider: '',
      hasApiKey: false,
      ollamaBaseUrl: 'http://localhost:11434',
    })
  })
})

describe('handleValidateApiKey', () => {
  it('Test 7: with provider=openai calls GET https://api.openai.com/v1/models with Bearer token and returns { valid: true } on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    const result = await handleValidateApiKey({
      provider: 'openai',
      apiKey: 'sk-test123',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test123',
        }),
      }),
    )
    expect(result).toEqual({ valid: true })
  })

  it('Test 8: with provider=openai returns { valid: false, error: Invalid API key } on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const result = await handleValidateApiKey({
      provider: 'openai',
      apiKey: 'invalid-key',
    })

    expect(result).toEqual({ valid: false, error: 'Invalid API key' })
  })

  it('Test 9: with provider=anthropic calls POST https://api.anthropic.com/v1/messages with x-api-key header and max_tokens:1', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    await handleValidateApiKey({
      provider: 'anthropic',
      apiKey: 'ant-test-key',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'ant-test-key',
          'anthropic-version': '2023-06-01',
        }),
        body: expect.stringContaining('"max_tokens":1'),
      }),
    )
  })

  it('Test 10: with provider=ollama calls GET {baseUrl}/ and returns { valid: true } on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    const result = await handleValidateApiKey({
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
    })

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/')
    expect(result).toEqual({ valid: true })
  })

  it('returns { valid: false, error } when fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await handleValidateApiKey({
      provider: 'openai',
      apiKey: 'sk-test123',
    })

    expect(result).toEqual({ valid: false, error: 'Network failure' })
  })
})
