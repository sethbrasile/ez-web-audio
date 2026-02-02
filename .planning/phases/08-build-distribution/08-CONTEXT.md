# Phase 8: Build & Distribution - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Package and publish the EZ Web Audio library to npm with tree-shakeable exports, TypeScript support, and proper build outputs. Users can install via npm/pnpm/yarn and import into their projects.

</domain>

<decisions>
## Implementation Decisions

### Package exports
- Single entry point: everything from 'ez-web-audio'
- Named exports only (no default export namespace)
- Modern 'exports' field in package.json (no legacy main/module fallback)
- Types exported inline with runtime code (no separate /types path)

### Module formats
- ESM only (no CommonJS build)
- Zero runtime dependencies maintained
- Tree-shaking handles unused code elimination

### TypeScript config
- Source maps included in published package (external files)
- Declaration maps (.d.ts.map) included for IDE "Go to Definition"

### npm publishing
- Package name: `ez-web-audio`
- Initial version: 0.1.0 (pre-1.0 for flexibility)
- Automated publishing via GitHub Actions on release tag (v*)

### Claude's Discretion
- CDN bundle format (IIFE vs ESM-only)
- Minification strategy (minified-only vs dual builds)
- ECMAScript target version
- Whether to include original TypeScript source in package
- 'files' whitelist vs .npmignore approach

</decisions>

<specifics>
## Specific Ideas

- Package name "ez-web-audio" explicitly communicates Web Audio focus
- 0.1.0 starting version allows breaking changes before 1.0 stabilization
- Release tag workflow (v0.1.0) triggers publish — consistent with most npm libraries

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-build-distribution*
*Context gathered: 2026-02-01*
