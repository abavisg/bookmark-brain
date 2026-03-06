---
phase: 01-project-scaffold
plan: 01
subsystem: build-pipeline
tags: [scaffold, vite, crxjs, typescript, react, tailwind, vitest, biome]
dependency_graph:
  requires: []
  provides: [build-pipeline, typed-message-bus, test-infrastructure, extension-entry-points]
  affects: [all-subsequent-phases]
tech_stack:
  added: [vite-7.3.1, crxjs-2.3.0, typescript-5.9.3, react-19.2.4, tailwindcss-4.2.1, vitest-4.0.18, biome-2.4.6, vitest-chrome-0.1.0]
  patterns: [discriminated-union-messages, split-tsconfig-dom-webworker, manifest-driven-crxjs, system-dark-mode]
key_files:
  created:
    - manifest.json
    - vite.config.ts
    - vitest.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - biome.json
    - src/shared/types/messages.ts
    - src/shared/messages/bus.ts
    - src/background/index.ts
    - src/content/index.ts
    - src/popup/App.tsx
    - src/popup/index.tsx
    - src/popup/index.html
    - src/popup/index.css
    - src/dashboard/App.tsx
    - src/dashboard/index.tsx
    - src/dashboard/index.html
    - src/dashboard/index.css
    - src/test/setup.ts
    - src/popup/App.test.tsx
    - src/dashboard/App.test.tsx
    - src/shared/messages/bus.test.ts
    - public/icons/icon16.png
    - public/icons/icon32.png
    - public/icons/icon48.png
    - public/icons/icon128.png
  modified:
    - package.json
    - .gitignore
decisions:
  - pnpm as package manager (fastest, crxjs ecosystem standard)
  - Biome 2.x for linting+formatting (single tool, TypeScript-native)
  - Separate vitest.config.ts from vite.config.ts (crxjs incompatible with Vitest)
  - Split tsconfig into app (DOM) and node (WebWorker) contexts
  - vitest-chrome ESM alias workaround for Vitest 4.x compatibility
  - tsc --noEmit in build script to prevent emitting JS into src/
metrics:
  duration: 371s
  completed: 2026-03-06T20:12:00Z
  tasks_completed: 3
  tasks_total: 3
  test_count: 7
  test_pass: 7
---

# Phase 01 Plan 01: Project Scaffold Summary

Complete Chrome MV3 extension scaffold with Vite 7 + crxjs 2.3 build pipeline, TypeScript 5.9 split-tsconfig (DOM vs WebWorker), React 19 popup/dashboard placeholders with Tailwind 4 system dark mode, discriminated-union typed message bus, and Vitest 4 test infrastructure with 7 passing tests.

## What Was Built

### Build Pipeline
- **Vite 7.3.1** with `@crxjs/vite-plugin 2.3.0` reads `manifest.json` and auto-wires all four entry points (popup, dashboard, content script, service worker)
- **@tailwindcss/vite** plugin for zero-config Tailwind 4 integration
- **Biome 2.4.6** for linting and formatting (single tool, replaces ESLint+Prettier)
- `pnpm build` produces `dist/` with valid MV3 manifest

### TypeScript Configuration
- Root `tsconfig.json` with project references
- `tsconfig.app.json`: DOM context (popup, dashboard, content script, shared)
- `tsconfig.node.json`: WebWorker context (background service worker, shared, vite config)
- Test files excluded from both tsconfigs (Vitest handles its own TS compilation)

### Extension Entry Points
- **Popup** (`src/popup/`): Branded placeholder with "Bookmark Brain" heading, "Bookmark Brain is ready" text, 380x200px, system dark mode via Tailwind `dark:` variants
- **Dashboard** (`src/dashboard/`): Full layout skeleton with header, 240px sidebar (Library, Search, Settings nav), and main content area
- **Service Worker** (`src/background/index.ts`): Message handler (PING, GET_STATUS), keepalive alarm (0.4min interval), onInstalled listener
- **Content Script** (`src/content/index.ts`): Console.log placeholder

### Typed Message Bus
- `AppMessage` discriminated union with `PING` and `GET_STATUS` types
- `AppResponse<T>` conditional type mapping each message to its response shape
- `sendMessage<T>()` wrapper enforces types at compile time, handles `chrome.runtime.lastError`

### Test Infrastructure
- **Vitest 4.0.18** with separate config (crxjs incompatible with Vitest)
- **vitest-chrome** for Chrome API mocks (ESM alias required for Vitest 4.x)
- **jsdom** environment with `@testing-library/react`
- 7 tests across 3 files, all passing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @types/node for vite.config.ts**
- **Found during:** Task 1 verification
- **Issue:** `tsc -b --noEmit` failed with "Cannot find module 'path'" and "Cannot find name '__dirname'"
- **Fix:** Installed `@types/node` and added `"node"` to tsconfig.node.json types
- **Files modified:** tsconfig.node.json, package.json

**2. [Rule 3 - Blocking] Missing placeholder PNG icons for crxjs build**
- **Found during:** Task 2 verification (`pnpm build`)
- **Issue:** crxjs requires manifest-referenced icon files to exist at build time
- **Fix:** Generated minimal 16/32/48/128px placeholder PNGs in `public/icons/`
- **Files created:** public/icons/icon{16,32,48,128}.png

**3. [Rule 3 - Blocking] vitest-chrome CJS incompatible with Vitest 4.x**
- **Found during:** Task 3 test execution
- **Issue:** vitest-chrome package lacks ESM `exports` field, Node resolves to CJS `main` which fails with Vitest 4.x
- **Fix:** Added ESM alias in vitest.config.ts pointing directly to `lib/index.esm.js`
- **Files modified:** vitest.config.ts

**4. [Rule 1 - Bug] Test files included in tsconfig causing type errors**
- **Found during:** Final verification
- **Issue:** `*.test.ts` and `*.test.tsx` files caught by tsconfig `include` globs but lack vitest global types
- **Fix:** Added `exclude` patterns for test files to both tsconfig.app.json and tsconfig.node.json
- **Files modified:** tsconfig.app.json, tsconfig.node.json

**5. [Rule 1 - Bug] Biome 2.x config schema changes from 1.x**
- **Found during:** Final verification (`pnpm lint`)
- **Issue:** Biome 2.4.6 removed `organizeImports` key, renamed `files.ignore` to `files.experimentalScannerIgnores`
- **Fix:** Rewrote biome.json for Biome 2.x schema with `assist.actions.source.organizeImports`
- **Files modified:** biome.json

**6. [Rule 1 - Bug] tsc -b emitting JS files into src/ directory**
- **Found during:** Final verification
- **Issue:** `tsc -b` (without `--noEmit`) in build script emitted `.js` and `.d.ts` files into `src/`, causing Biome to lint compiled output
- **Fix:** Changed build script to `tsc -b --noEmit && vite build` (Vite handles actual transpilation)
- **Files modified:** package.json

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| `pnpm type-check` | PASS | Zero TypeScript errors across all bundles |
| `pnpm test:run` | PASS | 7/7 tests passing (3 suites) |
| `pnpm build` | PASS | dist/ with valid MV3 manifest, all entry points wired |
| `pnpm lint` | PASS | Biome reports no errors |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7746980 | Initialize project with build pipeline and tooling |
| 2 | bcac532 | Create extension entry points, typed message bus, and placeholder UIs |
| 3 | 31af903 | Add unit tests for popup, dashboard, and message bus |
| fix | 58c715a | Fix build and lint issues discovered during verification |

## Self-Check: PASSED

All 23 key files verified present. All 4 commits verified in git history.
