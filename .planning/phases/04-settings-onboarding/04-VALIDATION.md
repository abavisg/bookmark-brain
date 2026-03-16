---
phase: 4
slug: settings-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Testing Library + jsdom + vitest-chrome |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:run --reporter=dot` |
| **Full suite command** | `pnpm test:run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:run --reporter=dot`
- **After every plan wave:** Run `pnpm test:run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | SET-01 | unit | `pnpm test:run src/background/__tests__/settings.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | SET-03 | unit | `pnpm test:run src/background/__tests__/settings.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | SET-01 | unit | `pnpm test:run src/background/__tests__/settings.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 2 | SET-02 | unit | `pnpm test:run src/background/__tests__/settings.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | SET-01 | component | `pnpm test:run src/dashboard/__tests__/SettingsPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | SET-01 | component | `pnpm test:run src/dashboard/__tests__/SettingsPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | SET-02 | component | `pnpm test:run src/dashboard/__tests__/SettingsPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | SET-01 | component | `pnpm test:run src/popup/__tests__/onboarding.test.tsx` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 1 | SET-03 | component | `pnpm test:run src/popup/__tests__/onboarding.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/background/__tests__/settings.test.ts` — stubs for SET-01, SET-02, SET-03 (CRUD message handlers, security boundary)
- [ ] `src/dashboard/__tests__/SettingsPanel.test.tsx` — stubs for SET-01, SET-02 (settings form render, provider switch)
- [ ] `src/popup/__tests__/onboarding.test.tsx` — stubs for SET-01, SET-03 (banner display, storage.onChanged reactivity)

*Existing Vitest infrastructure covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| API key validation makes real network call to provider | SET-01 | Requires live API key; network calls cannot be mocked end-to-end in jsdom | Load unpacked extension, enter valid key, observe "✓ API key verified" status |
| Banner disappears in open popup after key saved in dashboard | SET-01 | Requires two real browser windows/tabs open simultaneously | Open popup, open dashboard in new tab, save key, verify popup banner disappears without re-opening |
| API key not accessible from DevTools console in popup context | SET-03 | Security boundary verification requires real browser runtime | In popup DevTools: `chrome.storage.local.get(null, console.log)` — verify `apiKeySecret` key is absent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
