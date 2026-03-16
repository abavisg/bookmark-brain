# Bookmark Brain

AI-powered Chrome extension bookmark manager — find anything you've saved.

## Tech Stack

- **Runtime**: Chrome Extension Manifest V3
- **Framework**: React 19 + TypeScript
- **Build**: Vite + `@crxjs/vite-plugin`
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **Linter/Formatter**: Biome (replaces ESLint + Prettier)
- **Testing**: Vitest + Testing Library + jsdom + vitest-chrome
- **Package manager**: pnpm

## Project Structure

```
src/
  background/   # Service worker (background/index.ts)
  content/      # Content script (content/index.ts)
  popup/        # Extension popup UI
  dashboard/    # Options page / full dashboard UI
  components/   # Shared React components
  lib/          # Shared utilities (utils.ts)
  shared/       # Shared types/constants
  test/         # Test helpers/setup
public/
  icons/        # Extension icons (16/32/48/128px)
```

## Common Commands

```bash
pnpm dev          # Dev server (Vite)
pnpm build        # Type-check + Vite build → dist/
pnpm lint         # Biome check src/
pnpm format       # Biome format --write src/
pnpm test         # Vitest watch
pnpm test:run     # Vitest single run
pnpm type-check   # tsc --noEmit
```

## Code Style

- **Formatter**: Biome — 2-space indent, single quotes, no semicolons
- Import organization is automatic via Biome assist
- Run `pnpm lint` and `pnpm type-check` before committing

## Extension Permissions

`storage`, `activeTab`, `scripting`, `alarms`, `bookmarks` + all http/https host permissions.
