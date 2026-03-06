---
phase: 1
slug: project-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` (separate from vite.config.ts — crxjs plugin incompatible with Vitest) |
| **Quick run command** | `pnpm test:run` |
| **Full suite command** | `pnpm test:coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:run`
- **After every plan wave:** Run `pnpm test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 0 | (infra) | type-check | `pnpm type-check` | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 0 | (infra) | unit | `pnpm test:run src/popup/App.test.tsx` | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 0 | (infra) | unit | `pnpm test:run src/dashboard/App.test.tsx` | ❌ W0 | ⬜ pending |
| 01-04 | 01 | 0 | (infra) | unit | `pnpm test:run src/shared/messages/bus.test.ts` | ❌ W0 | ⬜ pending |
| 01-05 | 01 | 0 | (infra) | smoke | `pnpm build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config (separate from vite.config.ts)
- [ ] `src/test/setup.ts` — Chrome API mocks via vitest-chrome
- [ ] `src/popup/App.test.tsx` — popup component smoke test
- [ ] `src/dashboard/App.test.tsx` — dashboard layout smoke test
- [ ] `src/shared/messages/bus.test.ts` — typed message bus unit test
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom vitest-chrome`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extension loads in Chrome without errors | (infra) | Requires real Chrome browser | Load via chrome://extensions, check for errors in console |
| Popup opens and displays branded placeholder | (infra) | Requires Chrome extension popup | Click extension icon, verify "Bookmark Brain is ready" |
| Dashboard page loads with layout skeleton | (infra) | Requires chrome-extension:// URL | Navigate to dashboard URL, verify header/sidebar/main |
| System dark/light mode responds correctly | (infra) | OS-level preference change | Toggle OS dark mode, verify extension follows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
