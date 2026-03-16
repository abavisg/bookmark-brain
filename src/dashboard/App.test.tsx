import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@/shared/messages/bus', () => ({
  sendMessage: vi.fn().mockResolvedValue({
    provider: 'openai',
    hasApiKey: false,
    ollamaBaseUrl: 'http://localhost:11434',
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Reset hash to default
  Object.defineProperty(window, 'location', {
    value: { hash: '' },
    writable: true,
  })
})

describe('Dashboard App', () => {
  it('renders header with "Bookmark Brain"', () => {
    render(<App />)
    const headings = screen.getAllByRole('heading', { name: /bookmark brain/i })
    expect(headings.length).toBeGreaterThanOrEqual(1)
    expect(headings[0].tagName).toBe('H1')
    expect(headings[0].textContent).toBe('Bookmark Brain')
  })

  it('renders sidebar with navigation items as buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Library' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })

  it('renders main content area with welcome message by default', () => {
    render(<App />)
    expect(screen.getByText('Welcome to Bookmark Brain')).toBeTruthy()
  })

  it('renders header with brain icon', () => {
    render(<App />)
    const icons = screen.getAllByAltText('Bookmark Brain icon')
    expect(icons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders version number', () => {
    render(<App />)
    expect(screen.getByText('v0.1.0')).toBeTruthy()
  })

  it('clicking Settings nav renders SettingsPanel', async () => {
    render(<App />)

    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    fireEvent.click(settingsButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^settings$/i })).toBeTruthy()
    })

    // Welcome message should no longer be visible
    expect(screen.queryByText('Welcome to Bookmark Brain')).toBeNull()
  })

  it('hash #settings shows Settings tab by default', async () => {
    Object.defineProperty(window, 'location', {
      value: { hash: '#settings' },
      writable: true,
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^settings$/i })).toBeTruthy()
    })

    // Welcome message should not be shown
    expect(screen.queryByText('Welcome to Bookmark Brain')).toBeNull()
  })
})
