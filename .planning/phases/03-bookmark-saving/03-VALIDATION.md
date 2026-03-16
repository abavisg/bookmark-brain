---
phase: 3
slug: bookmark-saving
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + Testing Library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:run` |
| **Full suite command** | `pnpm test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:run`
- **After every plan wave:** Run `pnpm test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | SAVE-01, SAVE-02, SAVE-03, SAVE-04 | unit | `pnpm test:run -- --reporter=verbose src/background/` | ❌ W0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | SAVE-05 | unit | `pnpm test:run -- --reporter=verbose src/popup/` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | SAVE-01 | unit | `pnpm test:run -- --reporter=verbose src/background/` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | SAVE-02 | unit | `pnpm test:run -- --reporter=verbose src/background/` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | SAVE-03 | unit | `pnpm test:run -- --reporter=verbose src/background/` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | SAVE-04 | unit | `pnpm test:run -- --reporter=verbose src/background/` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | SAVE-05 | unit | `pnpm test:run -- --reporter=verbose src/popup/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/background/saveBookmark.test.ts` — stubs for SAVE-01, SAVE-02, SAVE-03, SAVE-04 (handler + badge + shortcut)
- [ ] `src/shared/db/deletedBookmarks.test.ts` — covers logDeletedBookmark behavior
- [ ] `src/popup/App.test.tsx` — extend existing file to cover SAVE-05 (bookmark card render)
- [ ] `src/shared/db/db.ts` — Dexie v2 migration test: verify `deletedBookmarks` table exists post-migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard shortcut Option+Shift+S triggers save on Mac | SAVE-03 | OS-level key binding behavior | Load unpacked extension, press shortcut, verify badge appears and bookmark saved |
| `chrome://` page shows graceful "Cannot save this page" | SAVE-01 | `chrome://` URLs not testable in jsdom | Navigate to `chrome://extensions`, click toolbar button, verify error toast not crash |
| Sonner toast z-index renders correctly in popup | SAVE-01 | Extension popup DOM differs from regular page | Click save, verify toast is visible (not clipped or hidden behind popup chrome) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
