---
phase: 03-bookmark-saving
plan: "02"
subsystem: ui
tags: [react, sonner, dexie, chrome-extension, popup, tailwind]

# Dependency graph
requires:
  - phase: 03-01
    provides: Service worker SAVE_BOOKMARK/UNSAVE_BOOKMARK handlers and GET_BOOKMARK_STATUS message type
  - phase: 02-01
    provides: Dexie db with bookmarks table, getBookmarkByUrl, dexie-react-hooks for reactive queries

provides:
  - useCurrentTab hook — returns active chrome.tabs.Tab | null
  - BookmarkCard component — renders title, truncated URL, favicon (Google S2), date saved
  - Full popup App.tsx with save/unsave toggle, Sonner toasts, pending toast recovery, useLiveQuery reactive state
  - Sonner Toaster integrated into popup root index.tsx

affects: [04-settings-onboarding, 06-library-search]

# Tech tracking
tech-stack:
  added: [sonner]
  patterns:
    - useLiveQuery for reactive bookmark state in popup (Dexie + dexie-react-hooks)
    - Pending toast recovery pattern via chrome.storage.local on popup mount
    - Google S2 favicon URL pattern for bookmark favicons

key-files:
  created:
    - src/popup/hooks/useCurrentTab.ts
    - src/popup/components/BookmarkCard.tsx
  modified:
    - src/popup/App.tsx
    - src/popup/index.tsx
    - src/background/index.ts
    - src/shared/types/messages.ts
    - src/shared/db/db.ts

key-decisions:
  - "sonner added via pnpm dlx shadcn@latest add sonner — integrates cleanly with Tailwind, Toaster placed in popup root"
  - "useLiveQuery over useState+useEffect for bookmark state — reactive DB updates without manual polling"
  - "Pending toast recovery on mount enables shortcut-save-then-open-popup UX flow without state sync complexity"
  - "isRestricted check on tab.url (startsWith http) covers chrome://, about:, edge:// uniformly"

patterns-established:
  - "Pending toast pattern: write to chrome.storage.local in service worker, read+clear in popup on mount"
  - "Favicon URL helper: https://www.google.com/s2/favicons?domain={hostname}&sz=32"
  - "useLiveQuery with [tab?.url] dependency for reactive per-URL DB checks"

requirements-completed: [SAVE-01, SAVE-02, SAVE-04, SAVE-05]

# Metrics
duration: ~30min
completed: 2026-03-16
---

# Phase 3 Plan 02: Popup UI Summary

**React popup with save/unsave toggle, BookmarkCard, Sonner toasts, and pending toast recovery — delivering the full one-click save user experience**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-16T14:00:00Z
- **Completed:** 2026-03-16T14:30:00Z
- **Tasks:** 2 auto + 1 checkpoint (human-verify approved)
- **Files modified:** 7

## Accomplishments

- useCurrentTab hook queries chrome.tabs.query and returns the active tab reactively
- BookmarkCard renders title, truncated URL, Google S2 favicon with error fallback, and formatted date saved
- App.tsx implements full save/unsave toggle with useLiveQuery reactive state, Sonner toasts ("Saved!" / "Removed"), restricted URL detection ("Cannot save this page"), footer with "View saved bookmarks" dashboard link
- Pending toast recovery reads chrome.storage.local on popup mount — enables shortcut-save UX flow
- All 56 tests GREEN; pnpm build exits 0; human checkpoint passed with all 8 manual tests verified

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCurrentTab hook and BookmarkCard component** - `fbfe29b` (feat)
2. **Task 2: Build full popup App.tsx and install Sonner** - `44faafe` (feat)

## Files Created/Modified

- `src/popup/hooks/useCurrentTab.ts` — chrome.tabs.query wrapper returning Tab | null
- `src/popup/components/BookmarkCard.tsx` — card UI with favicon, title, URL, date
- `src/popup/App.tsx` — full save/unsave popup with Sonner toasts and pending toast recovery
- `src/popup/index.tsx` — added Sonner Toaster to popup root render
- `src/background/index.ts` — GET_BOOKMARK_STATUS handler added for popup status queries
- `src/shared/types/messages.ts` — GET_BOOKMARK_STATUS message type added
- `src/shared/db/db.ts` — minor updates supporting bookmark status queries

## Decisions Made

- **sonner via shadcn CLI:** Integrated cleanly with existing Tailwind setup; Toaster placed in popup root (index.tsx) not inside App.tsx so it persists across re-renders.
- **useLiveQuery for reactive state:** Eliminates manual polling or event-driven refresh — Dexie reactivity handles state sync automatically when service worker writes to IndexedDB.
- **Pending toast pattern:** Service worker writes `{ message: 'Saved!' }` to chrome.storage.local; popup reads and clears on mount — decouples shortcut trigger from popup open timing.
- **isRestricted = !tab?.url || !tab.url.startsWith('http'):** Single condition covers all non-saveable URL schemes uniformly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Popup save/unsave UI is fully functional and verified in a live extension load
- All SAVE requirements (SAVE-01, SAVE-02, SAVE-04, SAVE-05) delivered
- Phase 4 (Settings + Onboarding) can proceed — popup foundation is stable
- Dashboard "View saved bookmarks" link is wired but dashboard content is placeholder until Phase 6

---
*Phase: 03-bookmark-saving*
*Completed: 2026-03-16*
