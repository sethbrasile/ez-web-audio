# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5.6.2 - All source code in `src/` and `src/app/`
- JavaScript - Configuration files and build scripts

**Secondary:**
- HTML - Documentation app in `src/app/`

## Runtime

**Environment:**
- Node.js (via package manager)
- Browser/Web Audio API - Runtime environment for library

**Package Manager:**
- pnpm 10.28.1
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Web Audio API (native browser API) - Audio processing and synthesis

**Testing:**
- Vitest 2.1.1 - Test runner
- happy-dom 15.7.4 - Test DOM environment
- standardized-audio-context-mock 9.7.9 - AudioContext mocking

**Build/Dev:**
- Vite 5.4.8 - Module bundler
- TypeScript Compiler (tsc) 5.6.2 - Type checking and compilation
- Vite Plugin DTS 4.2.2 - Generate `.d.ts` declaration files
- Vite TSConfig Paths 5.0.1 - Path alias resolution
- dotenvx 1.14.2 - Environment variable management

**Documentation:**
- TypeDoc 0.26.7 - Generate API documentation
- Prism.js 1.29.0 - Syntax highlighting
- vite-plugin-prismjs 0.0.11 - Vite integration for Prism

**Linting:**
- ESLint 9.5.0 - Code linting
- @antfu/eslint-config 2.27.3 - Shared ESLint config (strict TypeScript/lib mode)

**Development Utilities:**
- concurrently 9.0.1 - Run multiple commands in parallel (dev server + docs server)

## Key Dependencies

**Critical:**
- Web Audio API - Native browser API, no external dependency needed
- TypeScript - Strict typing with `strict: true`, `strictNullChecks: true`

**Testing:**
- standardized-audio-context - Real AudioContext polyfill for testing environments

**Build/Dev:**
- @nx-js/observer-util 4.2.2 - Reactive state management utility

## Configuration

**Environment:**
- `.env.local` - Local development environment variables
  - `VITE_DOCS_URL` - Base URL for TypeDoc hosted docs (e.g., `http://localhost:5173/ez-web-audio/docs`)
- `.env.ci` - CI/CD environment variables (same setup as local)

**Build Targets:**
- Library build: ES2020 modules with CommonJS and UMD formats
- App build: Documentation site using Vite
- Types: Full declaration files with declaration maps

**TypeScript Configuration:**
- Target: ES2020
- Module: ESNext
- Module Detection: force (treats all files as modules)
- Bundler module resolution
- Strict null checking enabled
- No unused locals/parameters allowed
- Path aliases: `@/*`, `@app/*`, `@common/*`, `@controllers/*`, `@components/*`, `@utils/*`, `@interfaces/*`, `@test/*`

## Platform Requirements

**Development:**
- Node.js with pnpm 10.28.1
- Modern terminal/shell
- TypeScript 5.6.2+

**Production:**
- Deployment target: Browser (any modern browser with Web Audio API support)
- Exports as UMD (`dist/index.umd.cjs`) and ESM (`dist/index.js`)
- No external runtime dependencies

## Build Output

- **Library:** `dist/index.js` (ESM), `dist/index.umd.cjs` (UMD), `dist/index.d.ts` (types)
- **Documentation App:** `dist-app/` (Vite build output)
- **API Docs:** `docs/` (TypeDoc output)

## Scripts

```bash
pnpm dev          # Vite dev server + local docs server (concurrent)
pnpm build        # Full build with env vars from .env.local
pnpm build:ci     # Full build with env vars from .env.ci
pnpm build:lib    # Library only (TypeScript + Vite)
pnpm build:app    # Documentation app only
pnpm build:docs   # API documentation only
pnpm test         # Vitest runner
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
pnpm lint:fix     # ESLint with auto-fix
```

---

*Stack analysis: 2026-01-31*
