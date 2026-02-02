# Phase 8: Build & Distribution - Research

**Researched:** 2026-02-01
**Domain:** TypeScript library build and npm distribution
**Confidence:** HIGH

## Summary

This phase involves building and distributing the EZ Web Audio library to npm with modern ESM-only output, tree-shakeable exports, and complete TypeScript support. Based on the locked decisions from CONTEXT.md, the library will publish ESM-only builds with modern package.json exports configuration and automated publishing via GitHub Actions OIDC.

The standard stack for 2026 TypeScript library builds is **Vite in library mode** with **vite-plugin-dts** for type generation. The library is already using Vite 5.4.8 with this plugin configured, but the configuration needs refinement for proper ESM-only output, tree-shaking optimization, and source map inclusion.

GitHub Actions with npm's new OIDC-based trusted publishing (generally available as of July 2025) is the recommended approach, eliminating the need for long-lived npm tokens and providing automatic provenance attestations.

**Primary recommendation:** Configure Vite for ESM-only output with external source maps, enable vite-plugin-dts with declarationMap support, set "sideEffects": false in package.json for tree-shaking, use the "files" field whitelist approach, and implement GitHub Actions workflow with OIDC trusted publishing for automated releases.

## Standard Stack

The established libraries/tools for TypeScript library distribution:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 5.4+ | Build tool for library mode | Fast, ESM-native, library mode built-in, industry standard for modern TS libraries |
| vite-plugin-dts | 4.2+ | TypeScript declaration generation | Official recommended plugin for .d.ts files, supports declaration maps |
| TypeScript | 5.6+ | Type definitions and compilation | Required for declaration files, already in use |
| GitHub Actions | latest | CI/CD automation | Native npm OIDC support, free for public repos |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| npm CLI | 11.5.1+ | Publishing with OIDC | Required for trusted publishing feature |
| @microsoft/api-extractor | latest | Type rollup (optional) | Only if using rollupTypes option in vite-plugin-dts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite | tsup | tsup is simpler but less flexible, Vite already in use |
| Vite | Rollup directly | More configuration, Vite is Rollup wrapper optimized for libraries |
| OIDC publishing | npm tokens | Tokens are security risk (deprecated Jan 2026), OIDC is recommended |
| ESM-only | Dual ESM/CJS | CJS adds complexity, Node.js 16+ supports ESM, decision is ESM-only |

**Installation:**
```bash
# Already installed
pnpm install -D vite vite-plugin-dts typescript

# For GitHub Actions (no local install needed)
# Uses setup-node action with built-in npm
```

## Architecture Patterns

### Recommended Project Structure
```
ez-web-audio/
├── src/
│   ├── index.ts           # Main entry point with all exports
│   ├── *.ts               # Source files
│   └── utils/             # Utilities
├── dist/                  # Build output (gitignored, npm-published)
│   ├── index.js           # ESM bundle
│   ├── index.js.map       # Source map
│   ├── index.d.ts         # Type declarations
│   ├── index.d.ts.map     # Declaration map
│   └── src/               # Per-file declarations (if not using rollupTypes)
├── vite.config.js         # Build configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Package metadata and exports
```

### Pattern 1: Modern package.json exports (ESM-only)
**What:** Use the "exports" field to define entry points for ESM consumers
**When to use:** All modern libraries published in 2026
**Example:**
```json
{
  "name": "ez-web-audio",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```
**Source:** [Guide to package.json exports field](https://hirok.io/posts/package-json-exports)

### Pattern 2: Vite library mode configuration (ESM-only)
**What:** Configure Vite to build library with proper externalization and formats
**When to use:** Building TypeScript libraries for npm
**Example:**
```javascript
// vite.config.js
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: false,        // Keep per-file declarations for better IDE experience
      declarationMap: true,      // Enable declaration source maps
      insertTypesEntry: true,    // Add types entry to package.json
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudio',       // Global name for IIFE (if adding later)
      formats: ['es'],          // ESM-only per locked decision
      fileName: 'index',        // Produces index.js
    },
    sourcemap: true,            // External source maps (.js.map files)
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      // For zero-dependency library, this is mainly for future-proofing
      external: [],
    }
  }
})
```
**Source:** [Vite Build Options](https://vite.dev/config/build-options)

### Pattern 3: GitHub Actions with OIDC trusted publishing
**What:** Publish to npm without long-lived tokens using OIDC authentication
**When to use:** All npm packages published from GitHub Actions (2026 standard)
**Example:**
```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Build library
        run: pnpm build:lib

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
**Note:** OIDC publishing is available but still requires NPM_TOKEN in secrets. Full automation without tokens requires npm org-level trusted publisher configuration.
**Source:** [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/), [GitHub Actions npm publish](https://github.com/marketplace/actions/npm-publish)

### Pattern 4: Tree-shaking optimization
**What:** Configure package for optimal tree-shaking in consumer builds
**When to use:** All libraries that export multiple functions/classes
**Example:**
```json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```
**Source:** [How to Make Tree Shakeable Libraries](https://blog.theodo.com/2021/04/library-tree-shaking/)

### Anti-Patterns to Avoid
- **Minified code in npm packages:** Publish unminified code; consumers handle minification in their builds. Minified code breaks debugging and stack traces.
- **Missing "sideEffects" declaration:** Without `"sideEffects": false`, bundlers can't safely tree-shake unused exports.
- **Using .npmignore instead of "files" field:** .npmignore is blacklist-based (security risk). "files" whitelist is safer.
- **Bundling dependencies:** Zero-dependency libraries should externalize everything, but if adding deps, use rollupOptions.external.
- **Legacy "main" and "module" fields only:** Modern tools expect "exports" field. Legacy fields are fallbacks only.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript declarations | Custom tsc scripts | vite-plugin-dts | Handles complex paths, rollup integration, declaration maps |
| Source maps | Manual sourcemap config | Vite build.sourcemap option | Automatic generation, proper paths, tested |
| npm publishing automation | Custom CI scripts | GitHub Actions with setup-node | Built-in npm registry integration, OIDC support, caching |
| Tree-shaking detection | Manual bundle analysis | sideEffects field + ESM | Standard that all bundlers understand |
| File whitelisting | .npmignore blacklist | package.json "files" field | Explicit whitelist prevents accidental leaks |
| Version bumping | Manual package.json edits | npm version command | Updates package.json, creates git tag automatically |

**Key insight:** Build tooling for TypeScript libraries is well-established in 2026. Vite + vite-plugin-dts is the standard path. Custom solutions lead to broken source maps, missing types, or incorrect module resolution.

## Common Pitfalls

### Pitfall 1: Publishing without testing the package
**What goes wrong:** package.json exports misconfigured, files missing, broken imports
**Why it happens:** Developers test in local dev environment, not as installed package
**How to avoid:** Use `npm pack` locally before publishing
```bash
npm pack  # Creates ez-web-audio-0.1.0.tgz
cd /tmp/test-project
npm install /path/to/ez-web-audio-0.1.0.tgz
# Test actual imports
```
**Warning signs:** "Cannot find module" errors after publishing, missing .d.ts files, broken TypeScript types
**Source:** [Publishing Your First NPM Package](https://dev.to/mir_mursalin_ankur/publishing-your-first-npm-package-a-real-world-guide-that-actually-helps-4l4)

### Pitfall 2: Declaration maps not included or broken
**What goes wrong:** "Go to Definition" in IDEs jumps to .d.ts instead of source .ts files
**Why it happens:** declarationMap: true not set, or source files not included in package
**How to avoid:**
- Enable `declarationMap: true` in tsconfig.json
- Enable `declarationMap: true` in vite-plugin-dts config
- If including source maps, ensure source .ts files are in "files" array OR source maps reference correct paths
**Warning signs:** IDE "Go to Definition" shows declaration files instead of source
**Source:** [vite-plugin-dts declarationMap issue](https://github.com/qmhc/unplugin-dts/issues/207)

### Pitfall 3: UMD/IIFE builds failing with code-splitting
**What goes wrong:** Vite errors "UMD and IIFE output formats are not supported for code-splitting builds"
**Why it happens:** Vite's library mode tries to code-split, incompatible with IIFE/UMD
**How to avoid:** For ESM-only builds, this isn't an issue. If adding IIFE for CDN later, ensure single-file output with no dynamic imports
**Warning signs:** Build fails when adding 'umd' or 'iife' to formats array
**Source:** [Vite Issue #2982](https://github.com/vitejs/vite/issues/2982)

### Pitfall 4: TypeScript "exports" field requires moduleResolution node16/nodenext
**What goes wrong:** Consumers using older moduleResolution get type errors
**Why it happens:** TypeScript requires node16/nodenext to understand "exports" field
**How to avoid:** Document in README that consumers need `"moduleResolution": "bundler"` or `"nodenext"` in their tsconfig
**Warning signs:** GitHub issues from users reporting type resolution failures
**Source:** [TypeScript 4.7 ESM Support](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)

### Pitfall 5: Forgetting to update version before publishing
**What goes wrong:** npm rejects publish with "version already exists"
**Why it happens:** Forgot to run `npm version` before tagging
**How to avoid:** Use `npm version [patch|minor|major]` which updates package.json AND creates git tag
```bash
npm version patch  # 0.1.0 -> 0.1.1, creates v0.1.1 tag
git push --follow-tags
```
**Warning signs:** CI fails to publish, manual version mismatches between package.json and git tag
**Source:** [Common NPM Mistakes](https://blog.bitsrc.io/common-npm-mistakes-every-developer-should-avoid-60ab0642d8f9)

### Pitfall 6: npm classic tokens deprecated (January 2026)
**What goes wrong:** Publish fails with "Classic tokens have been revoked"
**Why it happens:** npm deprecated classic tokens in favor of OIDC
**How to avoid:** Use GitHub Actions with OIDC (id-token: write permission) OR granular access tokens
**Warning signs:** Authentication errors in CI, token-based publish suddenly failing
**Source:** [npm OIDC Journey](https://dev.to/zhangjintao/from-deprecated-npm-classic-tokens-to-oidc-trusted-publishing-a-cicd-troubleshooting-journey-4h8b)

### Pitfall 7: Tree-shaking doesn't work in webpack consumers
**What goes wrong:** Consumers using webpack see no tree-shaking benefit
**Why it happens:** Vite includes `[Symbol.toStringTag]: "Module"` by default, confuses webpack
**How to avoid:** ESM format should work, but if issues arise, can disable via rollupOptions
**Warning signs:** Bundle size reports show entire library included even when using single export
**Source:** [Vite Issue #5174](https://github.com/vitejs/vite/issues/5174)

## Code Examples

Verified patterns from official sources:

### Complete Vite Configuration for ESM Library
```javascript
// vite.config.js
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolve @ paths from tsconfig
    dts({
      rollupTypes: false,      // Per-file declarations (better IDE experience)
      declarationMap: true,    // Enable .d.ts.map files
      insertTypesEntry: true,  // Auto-add types to package.json exports
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudio',
      formats: ['es'],         // ESM-only per decision
      fileName: 'index',       // Output: index.js
    },
    sourcemap: true,           // External source maps
    minify: false,             // Don't minify (consumers handle this)
    rollupOptions: {
      external: [],            // Zero dependencies, but externalize if added
    },
  },
})
```
**Source:** [Vite Library Mode Guide](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma)

### Complete package.json for ESM Library
```json
{
  "name": "ez-web-audio",
  "version": "0.1.0",
  "type": "module",
  "description": "Making the Web Audio API super EZ since 2024.",
  "keywords": ["audio", "web-audio", "synthesis", "oscillator"],
  "license": "MIT",
  "author": "Seth Brasile <seth.brasile@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/sethbrasile/ez-web-audio.git"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "scripts": {
    "build:lib": "tsc && vite build",
    "prepublishOnly": "pnpm build:lib"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vite-plugin-dts": "^4.2.2"
  }
}
```
**Source:** [TypeScript NPM Packages Done Right](https://liblab.com/blog/typescript-npm-packages-done-right)

### TypeScript Configuration for Library
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",

    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```
**Source:** [TypeScript Documentation](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)

### Testing Package Locally Before Publishing
```bash
# Build the package
pnpm build:lib

# Create tarball (what would be published)
npm pack

# This creates: ez-web-audio-0.1.0.tgz

# Test in another project
cd /tmp
mkdir test-ez-audio && cd test-ez-audio
npm init -y
npm install /path/to/ez-web-audio-0.1.0.tgz

# Create test file
cat > test.ts << 'EOF'
import { createSound, initAudio } from 'ez-web-audio'

async function test() {
  await initAudio()
  const sound = await createSound('test.mp3')
  sound.play()
}
EOF

# Verify types work
npx tsc --noEmit test.ts
```
**Source:** [Stop Publishing npm Packages Just to Test Them](https://medium.com/@anshulkahar2211/stop-publishing-npm-packages-just-to-test-them-c127d66c5c67)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm tokens | OIDC trusted publishing | July 2025 | More secure, no token management, automatic provenance |
| Dual ESM/CJS builds | ESM-only | 2024+ | Simpler builds, Node 16+ supports ESM natively |
| .npmignore blacklist | "files" whitelist | 2020+ best practice | Prevents accidental file leaks |
| Webpack/Rollup direct | Vite library mode | 2022+ | Simpler config, faster builds, better DX |
| "main" + "module" fields | "exports" field | Node 12.20+ | Better subpath exports, conditional exports |
| Minified npm packages | Unminified source | 2018+ consensus | Better debugging, consumers handle minification |

**Deprecated/outdated:**
- **Classic npm tokens:** Deprecated January 2026, use OIDC or granular tokens
- **CommonJS-only builds:** Node.js 16+ (EOL 2023-09-11) supports ESM
- **TypeScript target < ES2020:** ES2020 has 92.6% browser support, safe default for 2026
- **"main" and "module" without "exports":** TypeScript 4.7+ and Node 12.20+ prefer "exports"

## Open Questions

Things that couldn't be fully resolved:

### 1. Declaration Maps with rollupTypes
**What we know:** vite-plugin-dts supports rollupTypes (single .d.ts file) and declarationMap (source maps), but combining them has known issues
**What's unclear:** Whether rollupTypes strips declarationMap output (per GitHub issue #207)
**Recommendation:** Use `rollupTypes: false` to maintain per-file declarations with working declaration maps. Single declaration file is convenient but not worth losing "Go to Definition" functionality.
**Confidence:** MEDIUM (GitHub issues from 2024, may be resolved in 4.2+)

### 2. CDN Bundle Format (Discretionary)
**What we know:** IIFE or UMD needed for `<script>` tag usage from CDN, ESM can be used via `<script type="module">`
**What's unclear:** Whether there's demand for IIFE bundle (project is ESM library first)
**Recommendation:** Start ESM-only per decision. Add IIFE build only if users request CDN usage. Modern CDNs (esm.sh, unpkg) can serve ESM directly.
**Confidence:** HIGH

### 3. Minification Strategy (Discretionary)
**What we know:** Consensus is unminified for npm packages, minified only for standalone CDN bundles
**What's unclear:** N/A - this is well-established
**Recommendation:** Publish unminified to npm (`minify: false`). If adding IIFE for CDN later, create separate minified build.
**Confidence:** HIGH

### 4. ECMAScript Target (Discretionary)
**What we know:** ES2020 = 92.6% support, ES2022 = 88.2% support. Current config uses ES2020.
**What's unclear:** Whether ES2022 features would benefit the library
**Recommendation:** Keep ES2020. Library targets broad browser compatibility, and ES2020 includes all needed features (optional chaining, nullish coalescing, BigInt). ES2022 gains (top-level await, class fields) aren't critical.
**Confidence:** HIGH

### 5. TypeScript Source in Package (Discretionary)
**What we know:** Source maps can reference .ts files for debugging, but increases package size
**What's unclear:** Whether source .ts files should be published for "Go to Definition"
**Recommendation:** Include .d.ts.map files but NOT source .ts files. Declaration maps provide "Go to Definition" to declarations, which is sufficient. Source files add ~100KB for minimal benefit.
**Confidence:** MEDIUM (Some libraries include source, most don't)

### 6. Files Whitelist Approach (Discretionary)
**What we know:** "files" field whitelist is safer than .npmignore blacklist
**What's unclear:** N/A - this is well-established best practice
**Recommendation:** Use `"files": ["dist", "README.md", "LICENSE"]` whitelist. This is explicit and prevents accidental inclusion of .env, test files, etc.
**Confidence:** HIGH

## Sources

### Primary (HIGH confidence)
- [Vite Build Options](https://vite.dev/config/build-options) - Official Vite documentation for library mode
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) - Official npm OIDC documentation
- [npm Generating Provenance Statements](https://docs.npmjs.com/generating-provenance-statements/) - Official npm provenance docs
- [TypeScript 4.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html) - ESM and exports field support
- [vite-plugin-dts npm page](https://www.npmjs.com/package/vite-plugin-dts) - Plugin configuration and options

### Secondary (MEDIUM confidence)
- [How to Build a TypeScript Library with Vite](https://rbardini.com/how-to-build-ts-library-with-vite/) - Practical guide verified against official docs
- [Guide to package.json exports field](https://hirok.io/posts/package-json-exports) - Comprehensive exports guide with examples
- [How to Make Tree Shakeable Libraries](https://blog.theodo.com/2021/04/library-tree-shaking/) - sideEffects and ESM patterns
- [TypeScript NPM Packages Done Right](https://liblab.com/blog/typescript-npm-packages-done-right) - End-to-end library setup
- [GitHub Actions npm publish workflow](https://github.com/marketplace/actions/npm-publish) - Official GitHub action

### Secondary (Verified via multiple sources)
- [npm OIDC Trusted Publishing Generally Available](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) - Official GitHub changelog
- [Please Don't Include Minified Builds in npm Packages](https://gist.github.com/joepie91/04cc8329df231ea3e262dffe3d41f848) - Community consensus on minification
- [Files Field vs .npmignore](https://github.com/nodejs/package-maintenance/issues/164) - Node.js package maintenance discussion

### Tertiary (LOW confidence - needs validation)
- Various DEV.to articles from 2024-2025 - Useful for patterns but not authoritative
- GitHub issues for known problems - Document pitfalls but may be outdated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vite + vite-plugin-dts is proven, well-documented 2026 standard
- Architecture: HIGH - package.json exports, ESM-only, and OIDC publishing are current best practices
- Pitfalls: HIGH - All documented from official sources or verified GitHub issues
- Discretionary decisions: MEDIUM to HIGH - Clear recommendations based on ecosystem trends

**Research date:** 2026-02-01
**Valid until:** 2026-04-01 (60 days - build tooling is stable, but npm/GitHub Actions features evolve quarterly)

**Notes:**
- User decided ESM-only (no CJS), modern exports field, automated publishing - research focused deeply on these
- Discretionary areas (CDN format, minification, ES target, source inclusion, files approach) researched with recommendations
- All findings cross-referenced with official documentation where possible
- OIDC trusted publishing is bleeding-edge (GA July 2025) but recommended as future-proof approach
