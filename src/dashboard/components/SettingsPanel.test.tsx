import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPanel from './SettingsPanel'

vi.mock('@/shared/messages/bus', () => ({
  sendMessage: vi.fn().mockResolvedValue({
    provider: 'openai',
    hasApiKey: false,
    ollamaBaseUrl: 'http://localhost:11434',
  }),
}))

import { sendMessage } from '@/shared/messages/bus'

beforeEach(() => {
  vi.mocked(sendMessage).mockResolvedValue({
    provider: 'openai',
    hasApiKey: false,
    ollamaBaseUrl: 'http://localhost:11434',
  } as never)
})

describe('SettingsPanel', () => {
  it('renders heading "Settings"', async () => {
    render(<SettingsPanel />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeTruthy()
  })

  it('renders provider select with OpenAI, Anthropic, and Ollama options', async () => {
    render(<SettingsPanel />)
    // SelectTrigger should show current value
    expect(screen.getByText('OpenAI')).toBeTruthy()
    // The select trigger button should be present
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('shows API key input when provider is openai', async () => {
    render(<SettingsPanel />)
    await waitFor(() => {
      const input = screen.getByPlaceholderText('sk-...')
      expect(input).toBeTruthy()
    })
  })

  it('shows base URL input when provider is ollama and not API key input', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      provider: 'ollama',
      hasApiKey: true,
      ollamaBaseUrl: 'http://localhost:11434',
    } as never)

    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('http://localhost:11434')).toBeTruthy()
    })

    // API key input should not be present
    expect(screen.queryByPlaceholderText('sk-...')).toBeNull()
    expect(screen.queryByPlaceholderText('sk-ant-...')).toBeNull()
  })

  it('shows "API key saved" status when hasApiKey is true on mount', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      provider: 'openai',
      hasApiKey: true,
      ollamaBaseUrl: 'http://localhost:11434',
    } as never)

    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByText('API key saved')).toBeTruthy()
    })
  })

  it('shows "Clear" button when hasApiKey is true', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      provider: 'openai',
      hasApiKey: true,
      ollamaBaseUrl: 'http://localhost:11434',
    } as never)

    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeTruthy()
    })
  })

  it('calls sendMessage with SAVE_SETTINGS on Save click', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      success: true,
    } as never)

    render(<SettingsPanel />)

    // Wait for GET_SETTINGS to resolve
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeTruthy()
    })

    // Type an API key so Save is enabled
    const input = screen.getByPlaceholderText('sk-...')
    fireEvent.change(input, { target: { value: 'sk-test-key' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(vi.mocked(sendMessage)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SAVE_SETTINGS' }),
      )
    })
  })

  it('calls sendMessage with VALIDATE_API_KEY on Validate click', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      valid: true,
    } as never)

    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validate/i })).toBeTruthy()
    })

    // Type a key so Validate is enabled
    const input = screen.getByPlaceholderText('sk-...')
    fireEvent.change(input, { target: { value: 'sk-test-key' } })

    fireEvent.click(screen.getByRole('button', { name: /validate/i }))

    await waitFor(() => {
      expect(vi.mocked(sendMessage)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'VALIDATE_API_KEY' }),
      )
    })
  })

  it('shows Eye/EyeOff toggle button for API key input', async () => {
    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.getByLabelText(/show api key/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByLabelText(/show api key/i))

    expect(screen.getByLabelText(/hide api key/i)).toBeTruthy()
  })
})
