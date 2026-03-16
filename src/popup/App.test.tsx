import { render, screen } from '@testing-library/react'
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
