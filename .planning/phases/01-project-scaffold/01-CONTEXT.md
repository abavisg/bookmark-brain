# Phase 1: Project Scaffold - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Working Chrome extension shell with Vite + @crxjs/vite-plugin build pipeline, TypeScript compiling cleanly, MV3 manifest, and a typed message bus connecting popup, dashboard, content script, and service worker. No user-facing features — pure infrastructure enabling all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Popup & Dashboard Shell
- Popup: branded placeholder — logo/name + "Bookmark Brain is ready" message, sets visual tone early
- Dashboard: full layout skeleton — header, sidebar, main content area (empty but structured)
- Color scheme: follow system preference (OS dark/light mode setting)

### Extension Identity
- Extension name: "Bookmark Brain" (full name in toolbar and manifest)
- Icon: stylized brain icon — matches the "Brain" in the name
- Icon needed in 16, 32, 48, 128px sizes for Chrome manifest

### Claude's Discretion
- **Project structure:** Folder layout, shared code organization, file naming conventions — pick what works best for a multi-bundle Chrome extension with crxjs
- **Package manager:** npm, pnpm, or bun — pick what works best with the Vite + crxjs toolchain
- **Linting/formatting:** ESLint + Prettier or Biome — pick based on stack compatibility
- **Test setup:** Vitest configured with or without sample tests — Claude decides the right level
- **Popup dimensions:** Pick a sensible width based on what the popup needs to display
- **Chrome permissions:** Pick the right set for v1 scope — start minimal or declare all upfront as appropriate

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user delegated all technical decisions (structure, tooling, formatting, package manager) to Claude, focusing only on visual identity decisions (branding, skeleton layout, system theme).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, empty directory

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- None — this phase creates the foundation all other phases integrate with

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-scaffold*
*Context gathered: 2026-03-06*
