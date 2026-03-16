import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sendMessage } from '@/shared/messages/bus'

type Provider = 'openai' | 'anthropic' | 'ollama'
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export default function SettingsPanel() {
  const [savedProvider, setSavedProvider] = useState<Provider>('openai')
  const [savedOllamaBaseUrl, setSavedOllamaBaseUrl] = useState('http://localhost:11434')
  const [savedHasApiKey, setSavedHasApiKey] = useState(false)

  const [provider, setProvider] = useState<Provider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sendMessage({ type: 'GET_SETTINGS' }).then((response) => {
      if (response) {
        const p: Provider =
          response.provider === 'openai' || response.provider === 'anthropic' || response.provider === 'ollama'
            ? response.provider
            : 'openai'
        const url = response.ollamaBaseUrl ?? 'http://localhost:11434'
        setProvider(p)
        setSavedProvider(p)
        setHasApiKey(response.hasApiKey)
        setSavedHasApiKey(response.hasApiKey)
        setOllamaBaseUrl(url)
        setSavedOllamaBaseUrl(url)
      }
    })
  }, [])

  const isDirty = (() => {
    if (provider !== savedProvider) return true
    if (apiKey !== '') return true
    if (provider === 'ollama' && ollamaBaseUrl !== savedOllamaBaseUrl) return true
    return false
  })()

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await sendMessage({
        type: 'SAVE_SETTINGS',
        payload: {
          provider,
          apiKey: apiKey || undefined,
          ollamaBaseUrl,
        },
      })
      if (response?.success) {
        setSavedProvider(provider)
        setSavedOllamaBaseUrl(ollamaBaseUrl)
        setSavedHasApiKey(true)
        setHasApiKey(true)
        setApiKey('')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    setValidationStatus('validating')
    setValidationError('')
    try {
      const response = await sendMessage({
        type: 'VALIDATE_API_KEY',
        payload: {
          provider,
          apiKey: apiKey || undefined,
          ollamaBaseUrl,
        },
      })
      if (response?.valid) {
        setValidationStatus('valid')
      } else {
        setValidationStatus('invalid')
        setValidationError(response?.error ?? 'Validation failed')
      }
    } catch {
      setValidationStatus('invalid')
      setValidationError('Validation failed')
    }
  }

  const handleClear = async () => {
    try {
      const response = await sendMessage({
        type: 'SAVE_SETTINGS',
        payload: {
          provider,
          action: 'clear',
        },
      })
      if (response?.success) {
        setSavedHasApiKey(false)
        setHasApiKey(false)
        setApiKey('')
        setOllamaBaseUrl('http://localhost:11434')
        setSavedOllamaBaseUrl('http://localhost:11434')
        setValidationStatus('idle')
        setValidationError('')
      }
    } catch {
      // ignore
    }
  }

  const isSaveDisabled =
    saving ||
    !isDirty ||
    (provider !== 'ollama' && !apiKey && !hasApiKey)

  const isValidateDisabled =
    saving ||
    (provider !== 'ollama' && !apiKey && !hasApiKey)

  const apiKeyPlaceholder = provider === 'openai' ? 'sk-...' : 'sk-ant-...'

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h2>

      {/* Provider Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          LLM Provider
        </label>
        <Select
          value={provider}
          onValueChange={(value) => {
            setProvider(value as Provider)
            setApiKey('')
            setValidationStatus('idle')
            setValidationError('')
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="ollama">Ollama (Local)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* API Key Section — shown for cloud providers */}
      {provider !== 'ollama' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>

          {savedHasApiKey && apiKey === '' ? (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                API key saved
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}

          <textarea
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiKeyPlaceholder}
            rows={3}
            className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      )}

      {/* Ollama Base URL Section */}
      {provider === 'ollama' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ollama Base URL
          </label>
          <Input
            type="text"
            value={ollamaBaseUrl}
            onChange={(e) => setOllamaBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          onClick={handleSave}
          disabled={isSaveDisabled}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          onClick={handleValidate}
          disabled={isValidateDisabled}
        >
          Validate
        </Button>
      </div>

      {/* Validation Status */}
      {validationStatus === 'validating' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Validating...</p>
      )}
      {validationStatus === 'valid' && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          API key verified
        </p>
      )}
      {validationStatus === 'invalid' && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Invalid key{validationError ? `: ${validationError}` : ''}
        </p>
      )}
    </div>
  )
}
