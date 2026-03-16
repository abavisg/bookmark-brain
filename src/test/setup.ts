import { vi } from 'vitest'
import * as chrome from 'vitest-chrome'

Object.assign(global, chrome)

// vitest-chrome@0.1.0 includes browserAction but not action (MV3 API).
// Add chrome.action mock so saveBookmark tests can verify badge calls.
const actionMock = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
  setBadgeTextColor: vi.fn(),
  setIcon: vi.fn(),
  setTitle: vi.fn(),
  setPopup: vi.fn(),
  getBadgeText: vi.fn(),
  getBadgeBackgroundColor: vi.fn(),
  getTitle: vi.fn(),
  getPopup: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  openPopup: vi.fn(),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
  },
}

// @ts-expect-error — chrome type does not include action in vitest-chrome@0.1.0
global.chrome = { ...global.chrome, action: actionMock }

// Make chrome.storage.local.get respond immediately with empty object so
// getOrCreateDeviceId() (and similar) don't hang in tests.
// Tests that need specific storage values can override via vi.mocked().
chrome.chrome.storage.local.get.mockImplementation(
  (_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
    callback({})
  },
)

// Make chrome.storage.local.set respond immediately
chrome.chrome.storage.local.set.mockImplementation(
  (_items: unknown, callback?: () => void) => {
    if (callback) callback()
  },
)
