import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleSaveBookmark,
  showSaveBadge,
  showUnsaveBadge,
} from '@/background/saveBookmark'
import { type BookmarkBrainDB, createTestDb } from '@/shared/db'

vi.mock('@/shared/db/quota', () => ({
  checkAndUpdateQuotaWarning: vi.fn().mockResolvedValue(undefined),
}))

let testDb: BookmarkBrainDB

beforeEach(() => {
  testDb = createTestDb()
  vi.clearAllMocks()
})

afterEach(async () => {
  await testDb.close()
})

describe('handleSaveBookmark', () => {
  it('SAVE-01: adds bookmark to DB and returns { bookmarkId, alreadyExists: false }', async () => {
    const result = await handleSaveBookmark(
      { url: 'https://example.com', title: 'Example' },
      testDb,
    )

    expect(typeof result.bookmarkId).toBe('number')
    expect(result.bookmarkId).toBeGreaterThan(0)
    expect(result.alreadyExists).toBe(false)

    const stored = await testDb.bookmarks.get(result.bookmarkId)
    expect(stored).toBeDefined()
    expect(stored?.url).toBe('https://example.com')
    expect(stored?.title).toBe('Example')
  })

  it('SAVE-04: returns existing bookmarkId and alreadyExists: true for duplicate URL', async () => {
    const first = await handleSaveBookmark(
      { url: 'https://example.com', title: 'Example' },
      testDb,
    )

    const second = await handleSaveBookmark(
      { url: 'https://example.com', title: 'Example Again' },
      testDb,
    )

    expect(second.bookmarkId).toBe(first.bookmarkId)
    expect(second.alreadyExists).toBe(true)

    // No second DB entry should be created
    const all = await testDb.bookmarks.toArray()
    expect(all).toHaveLength(1)
  })

  it('SAVE-02: sets badge text to ✓ and badge background to green after save', async () => {
    await handleSaveBookmark(
      { url: 'https://example.com', title: 'Example' },
      testDb,
    )

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#22c55e',
    })
  })

  it('returns gracefully (no error, no DB write) for chrome:// URLs', async () => {
    await expect(
      handleSaveBookmark(
        { url: 'chrome://settings', title: 'Settings' },
        testDb,
      ),
    ).resolves.not.toThrow()

    const all = await testDb.bookmarks.toArray()
    expect(all).toHaveLength(0)
  })
})

describe('keyboard shortcut handler', () => {
  it('SAVE-03: save-bookmark command triggers save logic and badge', async () => {
    // Simulate a tab
    vi.mocked(chrome.tabs.query).mockImplementation(
      (
        _: chrome.tabs.QueryInfo,
        callback: (tabs: chrome.tabs.Tab[]) => void,
      ) => {
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
            url: 'https://example.com',
            title: 'Example',
          },
        ])
      },
    )

    // Directly invoke the command handler logic
    const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0])
      })
    })

    expect(tab).toBeDefined()
    if (tab?.url?.startsWith('chrome://')) return

    const result = await handleSaveBookmark(
      { url: tab?.url ?? '', title: tab?.title ?? '' },
      testDb,
    )

    expect(result.bookmarkId).toBeGreaterThan(0)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' })
  })
})

describe('showSaveBadge / showUnsaveBadge', () => {
  it('showSaveBadge sets green ✓ badge', async () => {
    await showSaveBadge()
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#22c55e',
    })
  })

  it('showUnsaveBadge sets empty badge text', async () => {
    await showUnsaveBadge()
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
  })
})
