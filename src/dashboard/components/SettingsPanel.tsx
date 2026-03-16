import { Eye, EyeOff } from 'lucide-react'
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
  const [provider, setProvider] = useState<Provider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sendMessage({ type: 'GET_SETTINGS' }).then((response) => {
      if (response) {
        if (response.provider === 'openai' || response.provider === 'anthropic' || response.provider === 'ollama') {
          setProvider(response.provider)
        }
        setHasApiKey(response.hasApiKey)
        if (response.ollamaBaseUrl) {
          setOllamaBaseUrl(response.ollamaBaseUrl)
        }
      }
    })
  }, [])

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
        setHasApiKey(false)
        setApiKey('')
        setOllamaBaseUrl('http://localhost:11434')
        setValidationStatus('idle')
        setValidationError('')
      }
    } catch {
      // ignore
    }
  }

  const isSaveDisabled =
    saving ||
    !provider ||
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

          {hasApiKey && apiKey === '' ? (
            <div className="flex items-center gap-3">
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

          <div className="relative mt-2">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyPlaceholder}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
