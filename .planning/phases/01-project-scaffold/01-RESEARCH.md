# Phase 1: Project Scaffold - Research

**Researched:** 2026-03-06
**Domain:** Chrome Extension MV3 build tooling — Vite + @crxjs/vite-plugin + TypeScript + React + Tailwind CSS 4 + shadcn/ui
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Popup: branded placeholder — logo/name + "Bookmark Brain is ready" message, sets visual tone early
- Dashboard: full layout skeleton — header, sidebar, main content area (empty but structured)
- Color scheme: follow system preference (OS dark/light mode setting)
- Extension name: "Bookmark Brain" (full name in toolbar and manifest)
- Icon: stylized brain icon — matches the "Brain" in the name
- Icon needed in 16, 32, 48, 128px sizes for Chrome manifest

### Claude's Discretion
- **Project structure:** Folder layout, shared code organization, file naming conventions
- **Package manager:** npm, pnpm, or bun
- **Linting/formatting:** ESLint + Prettier or Biome
- **Test setup:** Vitest configured with or without sample tests
- **Popup dimensions:** Pick a sensible width
- **Chrome permissions:** Pick the right set for v1 scope

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 1 creates the complete project scaffold for a Chrome MV3 extension: a Vite build pipeline wired up with `@crxjs/vite-plugin` to produce four independent bundles (popup, dashboard, content script, service worker), TypeScript compiling cleanly across all contexts, a typed message bus connecting all components, branded placeholder UIs with system dark/light mode support, and a working Vitest configuration.

The technology choices are locked in STATE.md: Vite 5/6 + `@crxjs/vite-plugin` 2.x + TypeScript 5.x + React 18.x + Tailwind CSS 4.x + shadcn/ui. @crxjs/vite-plugin 2.0 was released in June 2025 (maintained again after a transition period) and supports Vite 3 through 8-beta. The setup is well-understood with production examples.

The key complexity in Phase 1 is the tsconfig split: popup/dashboard/content scripts need the `DOM` lib, while the service worker background script needs the `WebWorker` lib. These cannot coexist in one tsconfig without conflicts. The solution is two tsconfig files (`tsconfig.app.json` for DOM contexts, `tsconfig.node.json` for the service worker). crxjs handles bundle wiring automatically from `manifest.json` — there is no manual Rollup entry point configuration needed.

**Primary recommendation:** Use `pnpm` as the package manager (fastest, used by crxjs team internally, well-supported by the full stack). Use Biome for linting/formatting (single tool, 10x faster, zero config fights, excellent TypeScript support). Use `@crxjs/vite-plugin` 2.x as locked in STATE.md — it is active and maintained as of March 2026.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 5.x or 6.x | Build bundler | ESM-native, fastest HMR, peer dep for crxjs |
| @crxjs/vite-plugin | 2.x (latest: 2.3.0) | Chrome extension build | Manifest-driven multi-bundle, HMR in extension context, handles web_accessible_resources automatically |
| TypeScript | 5.x | Type safety | Required for the message bus typing and multi-context code |
| React | 18.x | UI framework | Standard for extension UIs; compatible with crxjs and shadcn/ui |
| @vitejs/plugin-react | 4.x | React JSX transform for Vite | Needed alongside crxjs plugin |
| @types/chrome | 0.1.x (latest) | Chrome API TypeScript types | DefinitelyTyped package; 0.1.37 as of early 2026 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x | Utility CSS | Shared across popup and dashboard; zero runtime |
| @tailwindcss/vite | 4.x | Vite integration for Tailwind 4 | Replaces PostCSS in Tailwind 4 — no postcss.config.js needed |
| shadcn/ui | latest (Tailwind v4 + React 19 compatible) | Component primitives | Card, Button, Input — initialize via `pnpm dlx shadcn@latest init` |
| Vitest | 2.x | Unit tests | Same config as Vite, native TypeScript, faster than Jest |
| @testing-library/react | 14.x | Component tests | DOM-based React testing |
| vitest-chrome | latest | Chrome API mocks for Vitest | Provides complete chrome.* mock objects in test environment |
| Biome | 1.x | Linting + formatting | Single Rust binary; replaces ESLint + Prettier; 10–25x faster |
| jsdom | 24.x | DOM simulation for tests | Used as Vitest test environment |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @crxjs/vite-plugin | WXT framework | WXT is more opinionated, file-based entrypoints, better cross-browser — but the project stack is locked to crxjs |
| Biome | ESLint + Prettier | ESLint has more rules and plugins; Biome is faster and simpler for greenfield TypeScript projects |
| pnpm | npm or bun | npm has wider compatibility; bun is fastest install but youngest ecosystem; pnpm is the sweet spot |
| Tailwind 4 | Tailwind 3 | Tailwind 3 requires PostCSS config; shadcn/ui now defaults to Tailwind 4 for new projects |

**Installation:**
```bash
pnpm create vite@latest bookmark-brain -- --template react-ts
cd bookmark-brain
pnpm add -D @crxjs/vite-plugin @tailwindcss/vite vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom vitest-chrome biome
pnpm add -D @types/chrome
pnpm add tailwindcss react react-dom
pnpm dlx shadcn@latest init
```

---

## Architecture Patterns

### Recommended Project Structure

```
bookmark-brain/
├── manifest.json              # MV3 manifest — single source of truth for crxjs
├── vite.config.ts             # Vite + crxjs + tailwindcss + react plugins
├── tsconfig.json              # Base tsconfig (references app + node)
├── tsconfig.app.json          # DOM context: popup, dashboard, content script
├── tsconfig.node.json         # WebWorker context: service worker, vite config
├── biome.json                 # Biome linting + formatting config
├── vitest.config.ts           # Vitest config (separate from vite.config.ts)
├── components.json            # shadcn/ui config (generated by CLI)
├── src/
│   ├── background/            # Service worker bundle
│   │   └── index.ts           # SW entry: message handler, alarm setup
│   ├── content/               # Content script bundle
│   │   └── index.ts           # Content script entry (minimal in Phase 1)
│   ├── popup/                 # Popup React app bundle
│   │   ├── index.html         # Popup HTML entry (referenced in manifest)
│   │   ├── index.tsx          # React root mount
│   │   └── App.tsx            # Branded placeholder UI
│   ├── dashboard/             # Dashboard React app bundle
│   │   ├── index.html         # Dashboard HTML entry (options_page in manifest)
│   │   ├── index.tsx          # React root mount
│   │   └── App.tsx            # Layout skeleton (header, sidebar, main)
│   └── shared/                # Shared across all contexts
│       ├── types/
│       │   └── messages.ts    # Discriminated union message types
│       └── messages/
│           └── bus.ts         # Typed sendMessage wrapper
├── public/
│   └── icons/                 # Extension icons: icon16.png, icon32.png, icon48.png, icon128.png
└── dist/                      # Build output (gitignored)
```

### Pattern 1: Manifest-Driven Multi-Bundle (crxjs)

**What:** `@crxjs/vite-plugin` reads `manifest.json` and automatically configures all Vite/Rollup entry points. No manual `rollupOptions.input` configuration is needed or recommended (adding manual inputs alongside crxjs causes conflicts).

**When to use:** Always with crxjs — it is the primary design of the plugin.

**Example manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "Bookmark Brain",
  "version": "0.1.0",
  "description": "AI-powered bookmark manager — find anything you've saved",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "alarms",
    "bookmarks"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "Bookmark Brain",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "src/dashboard/index.html",
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Example vite.config.ts:**
```typescript
// Source: crxjs docs + official article verification
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.json'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Keep filenames deterministic for extension loading
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
```

### Pattern 2: Split tsconfig for DOM vs WebWorker Contexts

**What:** TypeScript's `DOM` and `WebWorker` lib settings conflict. Popup, dashboard, and content scripts need `DOM`. The service worker needs `WebWorker`. Having both in one tsconfig causes type errors.

**When to use:** Any Chrome extension with both React UI code and a service worker.

**Example tsconfig.json (base, references):**
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Example tsconfig.app.json (popup, dashboard, content script):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["chrome"]
  },
  "include": ["src/popup/**/*", "src/dashboard/**/*", "src/content/**/*", "src/shared/**/*"]
}
```

**Example tsconfig.node.json (service worker + vite config):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["chrome"],
    "composite": true
  },
  "include": ["src/background/**/*", "src/shared/**/*", "vite.config.ts", "manifest.json"]
}
```

Note: `manifest.json` must be in the `include` of the tsconfig that crxjs reads, or you will get a resolution error on the `import manifest from './manifest.json'` line.

### Pattern 3: Typed Message Bus Using Discriminated Unions

**What:** Type-safe `chrome.runtime.sendMessage` using TypeScript discriminated unions so every message type has a corresponding response type, enforced at compile time.

**When to use:** All inter-component communication in Phase 1 and forward.

**Example — src/shared/types/messages.ts:**
```typescript
// Source: TypeScript discriminated union pattern for Chrome MV3

// Request types
export type AppMessage =
  | { type: 'PING' }
  | { type: 'SAVE_BOOKMARK'; url: string; title: string }
  | { type: 'GET_STATUS' }

// Response types mapped to request types
export type AppResponse<T extends AppMessage> =
  T extends { type: 'PING' } ? { alive: boolean } :
  T extends { type: 'SAVE_BOOKMARK' } ? { bookmarkId: string; success: boolean } :
  T extends { type: 'GET_STATUS' } ? { version: string } :
  never

// Typed sendMessage wrapper
export function sendMessage<T extends AppMessage>(
  message: T
): Promise<AppResponse<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(response as AppResponse<T>)
      }
    })
  })
}
```

**Example — service worker message handler (src/background/index.ts):**
```typescript
import type { AppMessage } from '@/shared/types/messages'

chrome.runtime.onMessage.addListener(
  (message: AppMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'PING':
        sendResponse({ alive: true })
        break
      case 'GET_STATUS':
        sendResponse({ version: chrome.runtime.getManifest().version })
        break
      default:
        break
    }
    // Return true if response is async; false/undefined for sync
    return false
  }
)

// Register keepalive alarm on install/startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // Service worker stays alive; process queue in future phases
  }
})
```

### Pattern 4: Tailwind 4 System Dark Mode

**What:** Tailwind CSS 4 uses `prefers-color-scheme` by default for the `dark:` variant, which maps directly to the OS dark/light setting.

**When to use:** For popup and dashboard — add `dark:` prefixed variants to every component.

**Example CSS entrypoint (src/popup/index.css):**
```css
/* Source: Tailwind CSS 4 docs */
@import "tailwindcss";
```

**Example component using system dark mode:**
```tsx
// Tailwind 4 "dark:" variant uses prefers-color-scheme by default
// No configuration needed — dark: responds to OS preference automatically
export function PopupApp() {
  return (
    <div className="w-[380px] min-h-[200px] bg-white dark:bg-gray-900 p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        Bookmark Brain
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Bookmark Brain is ready
      </p>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Adding `rollupOptions.input` alongside crxjs:** This conflicts with the plugin's manifest-driven entry point system and breaks builds. crxjs manages entries from `manifest.json` exclusively.
- **Putting DOM and WebWorker lib in the same tsconfig:** Causes TypeScript errors; use separate tsconfigs per context.
- **Using `type: "module"` in `package.json` without confirming CJS/ESM compat:** Vite's config file needs `type: "module"` in package.json for `defineConfig` ESM imports, or use `.mts` extension.
- **Importing `chrome.*` in React components directly:** Do not call chrome APIs in render — call in event handlers or `useEffect` to avoid errors during testing with jsdom.
- **Dynamic imports in content scripts:** Blocked by strict CSP on many pages. Content script must be a single self-contained bundle.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chrome extension multi-bundle build pipeline | Custom Rollup config with multiple inputs | `@crxjs/vite-plugin` | HMR, manifest injection, web_accessible_resources, content script wiring — all handled automatically |
| TypeScript for Chrome APIs | Manual chrome type declarations | `@types/chrome` 0.1.x | Complete, up-to-date DefinitelyTyped package |
| Code formatting + linting | Custom ESLint rules + Prettier | Biome | Single binary, 10-25x faster, no config conflicts |
| Chrome API mocks in tests | Manual `global.chrome = {...}` | `vitest-chrome` | Complete typed mock of the Chrome API for Vitest |
| Tailwind PostCSS setup | `postcss.config.js` | `@tailwindcss/vite` plugin | Tailwind 4's native Vite plugin — no PostCSS needed |
| shadcn/ui component setup | Copying component code manually | `pnpm dlx shadcn@latest add [component]` | CLI handles imports, Tailwind tokens, types |

**Key insight:** The crxjs plugin eliminates the hardest part of Chrome extension build setup — wiring multiple independent bundles, handling HMR in the extension context, and auto-generating `web_accessible_resources`. Attempting a custom solution would require understanding Rollup internals and Chrome's extension API for asset loading.

---

## Common Pitfalls

### Pitfall 1: crxjs `rollupOptions.input` Conflict

**What goes wrong:** Adding `build.rollupOptions.input` in `vite.config.ts` alongside `crx({ manifest })` breaks the build. crxjs issues a warning and the dashboard/options entry may not bundle correctly.

**Why it happens:** Developers try to add the dashboard as an extra Rollup input, not realizing crxjs handles this automatically via `options_page` in `manifest.json`.

**How to avoid:** Reference the dashboard via `manifest.json`'s `options_page` field. crxjs picks it up automatically. Never add manual `rollupOptions.input`.

**Warning signs:** Build error about duplicate inputs, or missing `options_page` in the `dist/` output.

### Pitfall 2: tsconfig DOM/WebWorker Conflict

**What goes wrong:** TypeScript throws errors like "Cannot find name 'window'" in the service worker, or "Cannot find name 'self'" in React code. With both libs in one config, types collide.

**Why it happens:** `lib: ["DOM", "WebWorker"]` in one tsconfig is unsupported — they overlap and contradict each other.

**How to avoid:** Use two tsconfig files with `"composite": true` and a root `tsconfig.json` with `"references"`. Point `vite.config.ts` at the node tsconfig; let crxjs and TypeScript resolve per-file context.

**Warning signs:** TypeScript errors about missing globals in background scripts, or DOM types bleeding into service worker context.

### Pitfall 3: crxjs HMR Fails Without Extension Reload Protocol

**What goes wrong:** Vite's standard HMR uses WebSocket connections that don't work inside the extension popup context. UI changes in dev mode don't update without reloading the extension.

**Why it happens:** This is a known limitation. crxjs works around it by injecting its own HMR bridge into the extension.

**How to avoid:** Use `npm run dev` (not `vite preview`). Load the `dist/` directory in Chrome dev mode. crxjs HMR will work for popup and options page. Service worker changes require full extension reload (Ctrl+Shift+R on the extensions page).

**Warning signs:** Edit popup component → no change visible in Chrome popup.

### Pitfall 4: Icon Format SVG Not Supported in manifest.json

**What goes wrong:** Chrome MV3 does NOT support SVG files for extension icons declared in `manifest.json`. The extension loads but shows no icon in the toolbar.

**Why it happens:** Chrome requires raster images (PNG) for manifest icons.

**How to avoid:** Convert the brain SVG to PNG files at 16, 32, 48, and 128px. Use tabler-icons or similar MIT-licensed icon library. Store PNGs in `public/icons/` (crxjs copies public assets to dist automatically).

**Warning signs:** Toolbar icon shows Chrome's default puzzle piece icon instead of the brain.

### Pitfall 5: Tailwind Styles Not Applied in Popup

**What goes wrong:** The popup loads but has no Tailwind styles. The built CSS is empty or missing.

**Why it happens:** Each entry point (popup, dashboard) needs to import its own CSS file. Tailwind 4 scans only files that import it.

**How to avoid:** Add `import './index.css'` (which contains `@import "tailwindcss"`) in each entry's `index.tsx`. Do NOT rely on a single shared CSS entry — each HTML page needs its own CSS import.

**Warning signs:** Popup renders unstyled. Inspect the popup's `<head>` — no `<link>` to a stylesheet.

### Pitfall 6: shadcn/ui Path Aliases Not Set Up Before Init

**What goes wrong:** `pnpm dlx shadcn@latest init` fails or creates a broken `components.json` if `@/` path aliases are not configured in both `vite.config.ts` and `tsconfig.app.json` first.

**Why it happens:** shadcn/ui uses `@/components/ui/...` import paths. The CLI checks for alias configuration before writing files.

**How to avoid:** Add path aliases in `vite.config.ts` (`resolve.alias`) AND in `tsconfig.app.json` (`compilerOptions.paths`) BEFORE running `shadcn init`. Then run the init, which confirms the setup and writes `components.json`.

---

## Code Examples

### Chrome Extension HTML Entry Point (same pattern for popup and dashboard)

```html
<!-- src/popup/index.html -->
<!-- Source: verified pattern from crxjs documentation examples -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bookmark Brain</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

### Popup React Entry

```typescript
// src/popup/index.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### Vitest Configuration

```typescript
// vitest.config.ts — SEPARATE from vite.config.ts (crxjs conflicts with Vitest)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

```typescript
// src/test/setup.ts — Chrome API mocks
import * as chrome from 'vitest-chrome'
Object.assign(global, chrome)
```

Note: Vitest config MUST be separate from `vite.config.ts`. The crxjs plugin is incompatible with Vitest's test runner and causes errors if included. Use `vitest.config.ts` without `crx({ manifest })`.

### Biome Configuration

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  },
  "files": {
    "ignore": ["dist/**", "node_modules/**"]
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "biome check src/",
    "format": "biome format --write src/",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc -b --noEmit"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rollup-plugin-chrome-extension` (crxjs v1) | `@crxjs/vite-plugin` 2.x | 2022→2025 | Stable, maintained, Vite 5/6/7 compatible |
| PostCSS + tailwind.config.js | `@tailwindcss/vite` plugin + CSS-based config | Tailwind v4 (Jan 2025) | No postcss.config.js, no tailwind.config.js needed; `@import "tailwindcss"` in CSS |
| ESLint + Prettier (separate tools) | Biome 1.x | 2023-2025 | Single tool, 10-25x faster, TypeScript-aware |
| Multiple tsconfig files manually patched | TypeScript project references with `composite: true` | TS 3.0+ (now standard) | Correct per-context type checking without conflicts |
| `chrome.storage.local` for all data | IndexedDB via Dexie (later phases) | Ongoing MV3 best practice | Covered in Phase 2 — Phase 1 just declares `storage` permission |

**Deprecated/outdated:**
- `rollup-plugin-chrome-extension`: Replaced by `@crxjs/vite-plugin`. Do not use.
- `tailwind.config.js` with PostCSS: Not needed for Tailwind 4 + Vite — use `@tailwindcss/vite` plugin.
- `sinon-chrome` for test mocking: Superseded by `vitest-chrome` for Vitest users.
- Plasmo framework: In maintenance mode as of 2025; Parcel-based, stale dependencies. Avoid for new projects.

---

## Open Questions

1. **crxjs HMR reliability with Vite 6**
   - What we know: crxjs 2.x declares Vite 6 support in peer dependencies; version 2.3.0 published ~3 months ago
   - What's unclear: Whether the team has tested HMR specifically in the extension popup context with Vite 6 (vs 5)
   - Recommendation: Start with Vite 5.x if crxjs HMR issues arise; upgrade to 6.x after first successful dev loop

2. **Tailwind 4 shadcn/ui color tokens in popup context**
   - What we know: shadcn/ui updated all components for Tailwind 4 + OKLCH colors; works in standard Vite apps
   - What's unclear: Whether the OKLCH color space renders identically in Chrome's extension popup iframe vs a regular tab
   - Recommendation: Test popup with shadcn/ui button after scaffold is up; use standard hex fallback if OKLCH causes issues

3. **Brain icon source**
   - What we know: SVG not supported in Chrome manifest icons; need 16/32/48/128px PNGs
   - What's unclear: Exact source for the stylized brain icon (project has no assets yet)
   - Recommendation: Use tabler-icons `IconBrain` SVG (MIT licensed), convert to PNG using Sharp or Squoosh at required sizes. This is a task within Phase 1 Wave 0.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` (separate from vite.config.ts) |
| Quick run command | `pnpm test:run` |
| Full suite command | `pnpm test:coverage` |

### Phase Requirements → Test Map

Phase 1 is pure infrastructure. The success criteria map to smoke tests, not functional unit tests:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| TypeScript compiles without errors across all bundles | type-check | `pnpm type-check` | ❌ Wave 0 (no tsconfig yet) |
| Popup renders "Bookmark Brain is ready" | unit (component) | `pnpm test:run src/popup/App.test.tsx` | ❌ Wave 0 |
| Dashboard renders header, sidebar, main layout | unit (component) | `pnpm test:run src/dashboard/App.test.tsx` | ❌ Wave 0 |
| sendMessage PING reaches service worker handler and returns typed response | unit (message bus) | `pnpm test:run src/shared/messages/bus.test.ts` | ❌ Wave 0 |
| Build produces dist/ with valid manifest | smoke (build) | `pnpm build` (exit code 0) | ❌ Wave 0 (no build pipeline yet) |

### Sampling Rate

- **Per task commit:** `pnpm test:run` (fast Vitest run, no coverage)
- **Per wave merge:** `pnpm test:coverage` (full suite with coverage report)
- **Phase gate:** `pnpm build && pnpm type-check && pnpm test:run` all green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework config
- [ ] `src/test/setup.ts` — Chrome API mocks via vitest-chrome
- [ ] `src/popup/App.test.tsx` — popup component smoke test
- [ ] `src/dashboard/App.test.tsx` — dashboard layout smoke test
- [ ] `src/shared/messages/bus.test.ts` — typed message bus unit test
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom vitest-chrome`

---

## Chrome Permissions for Phase 1

Phase 1 is pure scaffold with no user-facing features, but permissions must be declared upfront for the architecture to work. The typed message bus requires the service worker to be active; the alarm system for service worker keepalive requires `alarms`.

**Phase 1 minimum permissions:**
```json
{
  "permissions": ["storage", "activeTab", "scripting", "alarms"],
  "host_permissions": ["https://*/*", "http://*/*"]
}
```

**Declare but don't implement in Phase 1 (for architecture compatibility):**
- `bookmarks` — needed in Phase 9 (import pipeline); declaring it upfront avoids a manifest version bump

**Never declare:** `unlimitedStorage` until IndexedDB quota needs grow (Phase 2+). Declaring it upfront raises Chrome Web Store review flags.

---

## Popup Dimensions

Based on research: Chrome popup maximum is 800×600px. Popular production extensions (1Password, Grammarly, Bardeen) use 380–420px wide. The popup for Phase 1 shows only "Bookmark Brain is ready" — no content list yet.

**Recommendation:** `width: 380px`, `min-height: 200px`, `max-height: 500px`. Set via CSS on the root `<div>` in the popup, not as a manifest property (MV3 has no popup size manifest field).

---

## Sources

### Primary (HIGH confidence)
- crxjs/chrome-extension-tools GitHub discussions/974 — confirmed crxjs 2.0 released June 2025, maintained
- crxjs npm package — version 2.3.0, Vite 3–8 support declared in peerDependencies
- Tailwind CSS docs — confirmed v4 uses `@tailwindcss/vite`, CSS-only config, `prefers-color-scheme` default for `dark:`
- shadcn/ui docs — confirmed Tailwind v4 + React 19 compatibility, `pnpm dlx shadcn@latest init -t vite`
- Chrome for Developers (MV3) — icon format requirements (PNG only, no SVG), permissions model
- TypeScript DefinitelyTyped — `@types/chrome` 0.1.37

### Secondary (MEDIUM confidence)
- artmann.co article (2025) — verified vite.config.ts pattern with crxjs + tailwindcss + react
- vitest-chrome GitHub (probil/vitest-chrome) — Chrome API mock for Vitest
- Multiple WebSearch results cross-referenced — biome 10-25x faster claim, pnpm crxjs internal usage

### Tertiary (LOW confidence)
- Popup dimension "380px" recommendation — community convention from examining production extensions, not official Chrome docs
- Tailwind 4 OKLCH in popup context — no extension-specific test data found; flagged as open question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm, crxjs maintenance confirmed, Tailwind 4 docs verified
- Architecture patterns: HIGH — tsconfig split is established TypeScript pattern; crxjs manifest-driven approach is documented
- Pitfalls: HIGH — crxjs/Rollup conflict and DOM/WebWorker tsconfig conflict are documented GitHub issues
- Icon format: HIGH — Chrome for Developers explicitly states SVG not supported in manifest icons
- Popup dimensions: MEDIUM — community convention, no official Chrome spec

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (90 days — stack is stable, crxjs maintenance confirmed through 2025)
