import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// Helper: mock chrome.tabs.query to return a fake tab
function mockTab(tab: Partial<chrome.tabs.Tab>) {
  vi.mocked(chrome.tabs.query).mockImplementation(
    (_: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([
        {
          id: 1,
          index: 0,
          pinned: false,
          highlighted: false,
          windowId: 1,
          active: true,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
          url: 'https://example.com/article',
          title: 'An Example Article',
          favIconUrl: 'https://example.com/favicon.ico',
          ...tab,
        },
      ])
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no API key configured
  vi.mocked(chrome.storage.local.get).mockImplementation(
    (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
      callback({})
    },
  )
  // Default runtime.getURL mock
  vi.mocked(chrome.runtime.getURL).mockReturnValue(
    'chrome-extension://abc/src/dashboard/index.html',
  )
})

describe('Popup App — unsaved state', () => {
  it('SAVE-05 unsaved: shows a Save button when the page is not yet bookmarked', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        // No existing bookmark
        callback(undefined)
      },
    )

    render(<App />)

    // Save button must be present (primary CTA)
    expect(screen.getByRole('button', { name: /save/i })).toBeTruthy()
  })

  it('does NOT show an Unsave button when in unsaved state', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    render(<App />)

    expect(screen.queryByRole('button', { name: /unsave/i })).toBeNull()
  })
})

describe('Popup App — saved state', () => {
  it('SAVE-05 saved: renders BookmarkCard with title, URL, favicon, and date saved', async () => {
    mockTab({
      url: 'https://example.com/article',
      title: 'An Example Article',
      favIconUrl: 'https://example.com/favicon.ico',
    })

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        callback({ bookmarkId: 42, alreadyExists: true })
      },
    )

    render(<App />)

    // BookmarkCard should show title
    expect(screen.getByText('An Example Article')).toBeTruthy()
    // BookmarkCard should show the URL (may be truncated)
    expect(screen.getByText(/example\.com/)).toBeTruthy()
    // Favicon image
    const favIcon = screen.getByRole('img', { name: /favicon/i })
    expect(favIcon).toBeTruthy()
    // Date saved label
    expect(screen.getByText(/saved/i)).toBeTruthy()
  })

  it('shows an Unsave button and no Save button when in saved state', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        callback({ bookmarkId: 42, alreadyExists: true })
      },
    )

    render(<App />)

    expect(screen.getByRole('button', { name: /unsave/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^save$/i })).toBeNull()
  })
})

describe('Popup App — footer', () => {
  it('always shows "View saved bookmarks" link regardless of state', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    render(<App />)

    expect(screen.getByText(/view saved bookmarks/i)).toBeTruthy()
  })
})

describe('Popup App — chrome:// page', () => {
  it('shows "Cannot save this page" and no Save/Unsave buttons for chrome:// URLs', async () => {
    mockTab({ url: 'chrome://settings', title: 'Settings' })

    render(<App />)

    expect(screen.getByText(/cannot save this page/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /unsave/i })).toBeNull()
  })
})

describe('Popup App -- onboarding banner', () => {
  it('renders gear icon (Settings) button in the header', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    render(<App />)

    expect(screen.getByRole('button', { name: /settings/i })).toBeTruthy()
  })

  it('gear icon click calls chrome.tabs.create with URL ending in #settings', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })
    const user = userEvent.setup()

    render(<App />)

    const gearBtn = screen.getByRole('button', { name: /settings/i })
    await user.click(gearBtn)

    expect(chrome.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('#settings'),
      }),
    )
  })

  it('shows banner "Add API key to enable AI features" when hasApiKey is false', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })
    // Default mock returns {} so bbHasApiKey is falsy

    render(<App />)

    expect(
      screen.getByText(/add api key to enable ai features/i),
    ).toBeTruthy()
  })

  it('shows "Set up now" link/button when hasApiKey is false', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })

    render(<App />)

    expect(screen.getByRole('button', { name: /set up now/i })).toBeTruthy()
  })

  it('does NOT show the banner when hasApiKey is true', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
        callback({ bbHasApiKey: true })
      },
    )

    render(<App />)

    expect(
      screen.queryByText(/add api key to enable ai features/i),
    ).toBeNull()
  })

  it('Save button is still present when hasApiKey is false (soft gate)', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })
    // Default: no API key

    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      (_message: unknown, callback: (response: unknown) => void) => {
        callback(undefined)
      },
    )

    render(<App />)

    // Banner should show
    expect(
      screen.getByText(/add api key to enable ai features/i),
    ).toBeTruthy()
    // Save button must also be present (soft gate)
    expect(screen.getByRole('button', { name: /^save$/i })).toBeTruthy()
  })

  it('banner "Set up now" click calls chrome.tabs.create with URL ending in #settings', async () => {
    mockTab({ url: 'https://example.com', title: 'Example' })
    const user = userEvent.setup()

    render(<App />)

    const setUpBtn = screen.getByRole('button', { name: /set up now/i })
    await user.click(setUpBtn)

    expect(chrome.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('#settings'),
      }),
    )
  })
})
