import { requeueFailedApiKeyJobs } from '@/shared/db/processingQueue'

const STORAGE_KEY_PROVIDER = 'bbProvider'
const STORAGE_KEY_HAS_API_KEY = 'bbHasApiKey'
const STORAGE_KEY_API_KEY_SECRET = 'bbApiKeySecret'
const STORAGE_KEY_OLLAMA_BASE_URL = 'bbOllamaBaseUrl'

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'

function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as Record<string, unknown>)
    })
  })
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve()
    })
  })
}

function storageRemove(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => {
      resolve()
    })
  })
}

export async function handleSaveSettings(payload: {
  provider: 'openai' | 'anthropic' | 'ollama'
  apiKey?: string
  ollamaBaseUrl?: string
  action?: 'clear'
}): Promise<{ success: boolean }> {
  if (payload.action === 'clear') {
    await storageRemove([STORAGE_KEY_API_KEY_SECRET])
    await storageSet({
      [STORAGE_KEY_HAS_API_KEY]: false,
      [STORAGE_KEY_PROVIDER]: '',
    })
    return { success: true }
  }

  const items: Record<string, unknown> = {
    [STORAGE_KEY_PROVIDER]: payload.provider,
    [STORAGE_KEY_OLLAMA_BASE_URL]:
      payload.ollamaBaseUrl ?? DEFAULT_OLLAMA_BASE_URL,
  }

  if (payload.apiKey) {
    items[STORAGE_KEY_API_KEY_SECRET] = payload.apiKey
    items[STORAGE_KEY_HAS_API_KEY] = true
  } else if (payload.provider === 'ollama') {
    items[STORAGE_KEY_HAS_API_KEY] = true
  }

  await storageSet(items)
  await requeueFailedApiKeyJobs()

  return { success: true }
}

export async function handleGetSettings(): Promise<{
  provider: string
  hasApiKey: boolean
  ollamaBaseUrl: string
}> {
  const result = await storageGet([
    STORAGE_KEY_PROVIDER,
    STORAGE_KEY_HAS_API_KEY,
    STORAGE_KEY_OLLAMA_BASE_URL,
  ])

  return {
    provider: (result[STORAGE_KEY_PROVIDER] as string) || '',
    hasApiKey: (result[STORAGE_KEY_HAS_API_KEY] as boolean) || false,
    ollamaBaseUrl:
      (result[STORAGE_KEY_OLLAMA_BASE_URL] as string) || DEFAULT_OLLAMA_BASE_URL,
  }
}

export async function handleValidateApiKey(payload: {
  provider: 'openai' | 'anthropic' | 'ollama'
  apiKey?: string
  ollamaBaseUrl?: string
}): Promise<{ valid: boolean; error?: string }> {
  try {
    if (payload.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${payload.apiKey}` },
      })
      if (response.status === 200) return { valid: true }
      if (response.status === 401) return { valid: false, error: 'Invalid API key' }
      return { valid: false, error: response.statusText }
    }

    if (payload.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': payload.apiKey ?? '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
      if (response.status === 200) return { valid: true }
      if (response.status === 401 || response.status === 403)
        return { valid: false, error: 'Invalid API key' }
      return { valid: false, error: response.statusText }
    }

    if (payload.provider === 'ollama') {
      const url = (payload.ollamaBaseUrl ?? DEFAULT_OLLAMA_BASE_URL) + '/'
      const response = await fetch(url)
      if (response.status === 200) return { valid: true }
      return { valid: false, error: `Ollama is not running at ${url}` }
    }

    return { valid: false, error: 'Unknown provider' }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
