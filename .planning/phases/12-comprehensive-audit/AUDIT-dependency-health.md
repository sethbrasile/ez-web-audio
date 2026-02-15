# Dependency Health Audit (MAINT-03)

**Audit Date:** 2026-02-15
**Package Manager:** pnpm 10.28.1
**Project:** ez-web-audio v0.1.0

## Executive Summary

- **Total DevDependencies:** 20
- **Runtime Dependencies:** 0 (CONFIRMED)
- **Outdated Packages:** 15
- **Vulnerabilities:** 25 total (3 critical, 1 high, 16 moderate, 5 low)
- **Deprecated Packages:** 0
- **Recommended Immediate Upgrades:** 4 (critical security fixes)

**Critical Actions Required:**
1. Upgrade `happy-dom` from 15.7.4 to 20.6.1 (fixes 2 critical RCE vulnerabilities)
2. Upgrade `vitest` from 2.1.1 to 4.0.18 (fixes 1 critical RCE vulnerability + sync with Vite)
3. Upgrade `vite` from 5.4.8 to 7.3.1 (fixes multiple vulnerabilities + major version bump)
4. Upgrade `eslint` from 9.5.0 to 10.0.0 (major version bump)

---

## Runtime Dependencies

**Status:** ZERO RUNTIME DEPENDENCIES ✓

The library ships with no runtime dependencies, as promised in the project's core value proposition. All packages listed in `devDependencies` are build-time and testing tools only.

---

## DevDependency Status

| Package | Current | Latest | Status | Breaking? | Action |
|---------|---------|--------|--------|-----------|--------|
| **@antfu/eslint-config** | 2.27.3 | 7.4.3 | outdated | YES (2→7) | Upgrade with care |
| **@dotenvx/dotenvx** | 1.14.2 | 1.52.0 | outdated | Likely minor | Upgrade |
| **@nx-js/observer-util** | 4.2.2 | 4.2.2 | current | - | None |
| **@types/prismjs** | 1.26.4 | 1.26.6 | outdated | No | Upgrade |
| **concurrently** | 9.0.1 | 9.2.1 | outdated | No | Upgrade |
| **eslint** | 9.5.0 | 10.0.0 | outdated | YES (9→10) | Upgrade with care |
| **happy-dom** | 15.7.4 | 20.6.1 | outdated | YES (15→20) | **URGENT** |
| **prismjs** | 1.29.0 | 1.30.0 | outdated | No | Upgrade |
| **standardized-audio-context** | 25.3.77 | 25.3.77 | current | - | None |
| **standardized-audio-context-mock** | 9.7.9 | 9.7.26 | outdated | No | Upgrade |
| **typedoc** | 0.28.16 | 0.28.17 | outdated | No | Upgrade |
| **typedoc-plugin-markdown** | 4.9.0 | 4.10.0 | outdated | No | Upgrade |
| **typedoc-vitepress-theme** | 1.1.2 | 1.1.2 | current | - | None |
| **typescript** | 5.6.2 | 5.9.3 | outdated | No | Upgrade |
| **vite** | 5.4.8 | 7.3.1 | outdated | YES (5→7) | **URGENT** |
| **vite-plugin-dts** | 4.2.2 | 4.5.4 | outdated | No | Upgrade |
| **vite-plugin-prismjs** | 0.0.11 | 0.0.11 | current | - | None |
| **vite-tsconfig-paths** | 5.0.1 | 6.1.1 | outdated | YES (5→6) | Upgrade |
| **vitepress** | 1.6.4 | 1.6.4 | current | - | None |
| **vitest** | 2.1.1 | 4.0.18 | outdated | YES (2→4) | **URGENT** |

---

## Vulnerability Report

### Critical (3)

| Package | CVE/Advisory | Severity | Fix | Impact |
|---------|--------------|----------|-----|--------|
| **happy-dom** | GHSA-96g7-g7g9-jxw8 | Critical | >=15.10.2 | Server-side code execution via `<script>` tag |
| **happy-dom** | GHSA-37j7-fg3j-429f | Critical | >=20.0.0 | VM context escape leading to RCE |
| **vitest** | GHSA-9crc-q9x8-hgqq | Critical | >=2.1.9 | RCE when accessing malicious website while API server listening |

**Notes:**
- `happy-dom` has TWO critical RCE vulnerabilities. Current version 15.7.4 is vulnerable to both.
- Minimum safe version: 20.0.0 (patches both)
- Current latest: 20.6.1
- **Action:** Upgrade to 20.6.1 immediately

### High (1)

| Package | CVE/Advisory | Severity | Fix | Impact |
|---------|--------------|----------|-----|--------|
| **cross-spawn** (transitive via @dotenvx/dotenvx) | GHSA-3xgq-45jj-v275 | High | >=7.0.5 | ReDoS vulnerability |

**Notes:**
- Transitive dependency — will be fixed by upgrading @dotenvx/dotenvx
- @dotenvx/dotenvx 1.52.0 likely includes fix

### Moderate (16)

All moderate vulnerabilities are related to:
- **esbuild** (GHSA-r26h-9qwf-cjcp, GHSA-qrpm-p2h7-hrv2) — development server CORS issues
- **vite** (multiple) — development server path traversal, CSRF, and file serving issues
- **send** (transitive via vitepress) — template injection
- **serve-static** (transitive via vitepress) — XSS vulnerability
- **brace-expansion** (transitive via @antfu/eslint-config) — ReDoS vulnerabilities

**Impact:** These are primarily dev-server vulnerabilities. Since this library is published to npm and the dev server is not part of the shipped package, the risk is local development environment only.

**Action:** Upgrade affected packages to latest versions to eliminate warnings.

### Low (5)

All low-severity vulnerabilities are related to:
- **vite** (GHSA-g4jq-h2w9-997c, GHSA-jqfw-vq24-v9c3) — development server file serving issues
- **diff** (transitive via standardized-audio-context-mock) — DoS in parsePatch/applyPatch
- **brace-expansion** (transitive) — ReDoS vulnerabilities

**Action:** Low priority. Upgrade when convenient.

---

## Deprecated Packages

**Status:** None found

No packages in the dependency tree are marked as deprecated or archived.

---

## Build Toolchain Assessment

| Tool | Current | Latest | Breaking Changes? | Recommendation |
|------|---------|--------|-------------------|----------------|
| **Vite** | 5.4.8 | 7.3.1 | YES (5→6→7) | Upgrade to 7.x — requires migration guide review |
| **Vitest** | 2.1.1 | 4.0.18 | YES (2→3→4) | Upgrade to 4.x — major API changes likely |
| **VitePress** | 1.6.4 | 1.6.4 | No | Current |
| **TypeScript** | 5.6.2 | 5.9.3 | No | Upgrade to 5.9.3 — patch release |
| **TypeDoc** | 0.28.16 | 0.28.17 | No | Upgrade to 0.28.17 — patch release |
| **ESLint** | 9.5.0 | 10.0.0 | YES (9→10) | Upgrade to 10.x — review changelog |

### Key Migration Paths

**Vite 5 → 7:**
- Vite 6 introduced breaking changes to plugin APIs and config structure
- Vite 7 continued modernization, dropped Node 16/18 support
- Migration guide: https://vite.dev/guide/migration
- **Risk:** Medium — plugins may need updates

**Vitest 2 → 4:**
- Vitest 3 aligned with Vite 6 breaking changes
- Vitest 4 aligned with Vite 7, dropped older Node versions
- Configuration changes likely needed
- **Risk:** Medium — test config may need updates

**ESLint 9 → 10:**
- Flat config is now the only config format
- Some rules deprecated/removed
- **Risk:** Low — already using flat config via @antfu/eslint-config

**@antfu/eslint-config 2 → 7:**
- Major version jumps suggest significant changes
- Likely tied to ESLint 10 support
- **Risk:** Medium — may require config adjustments

---

## Lock File Health

**Status:** In sync

`pnpm-lock.yaml` is in sync with `package.json`. No drift detected.

---

## Evaluation: Are These Dependencies Still Needed?

| Package | Still Needed? | Notes |
|---------|---------------|-------|
| **@antfu/eslint-config** | YES | Core linting setup |
| **@dotenvx/dotenvx** | MAYBE | Used for environment variables — check usage |
| **@nx-js/observer-util** | YES | Used for reactive wrappers in BeatTrack |
| **@types/prismjs** | YES | TypeScript types for prismjs |
| **concurrently** | MAYBE | Check if used in npm scripts |
| **eslint** | YES | Core linting |
| **happy-dom** | YES | Test environment |
| **prismjs** | YES | Code syntax highlighting in docs |
| **standardized-audio-context** | YES | Polyfill for Web Audio API |
| **standardized-audio-context-mock** | YES | Test mocking for AudioContext |
| **typedoc** | YES | API documentation generation |
| **typedoc-plugin-markdown** | YES | Markdown output for typedoc |
| **typedoc-vitepress-theme** | YES | VitePress integration for typedoc |
| **typescript** | YES | Core language |
| **vite** | YES | Build tool |
| **vite-plugin-dts** | YES | TypeScript declaration file generation |
| **vite-plugin-prismjs** | YES | Prism.js Vite integration |
| **vite-tsconfig-paths** | YES | Path alias resolution for Vite |
| **vitepress** | YES | Documentation site |
| **vitest** | YES | Test runner |

**Notes on @dotenvx/dotenvx:**
- Not found in any npm scripts or source files in a quick scan
- May have been used during development but no longer needed
- **Action:** Search codebase for usage before removing

**Notes on concurrently:**
- Not found in package.json scripts
- Likely remnant from earlier development
- **Action:** Safe to remove if not used

---

## Recommended Upgrade Plan

### Phase 1: Critical Security Fixes (Immediate)

```bash
# Fix critical RCE vulnerabilities
pnpm add -D happy-dom@20.6.1
pnpm add -D vitest@4.0.18

# Run tests to verify no breakage
pnpm test

# If tests pass, commit
git add package.json pnpm-lock.yaml
git commit -m "fix(deps): upgrade happy-dom and vitest for critical security fixes"
```

**Expected Impact:** Test configuration may need updates for Vitest 4.x API changes.

### Phase 2: Build Toolchain Upgrades (High Priority)

```bash
# Upgrade Vite (major version bump)
pnpm add -D vite@7.3.1

# Upgrade related Vite plugins
pnpm add -D vite-plugin-dts@4.5.4
pnpm add -D vite-tsconfig-paths@6.1.1

# Test build
pnpm build:lib
pnpm build

# If successful, commit
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): upgrade Vite to 7.x and related plugins"
```

**Expected Impact:** May require vite.config.ts updates. Review Vite 6 and 7 migration guides.

### Phase 3: Linting Toolchain (Medium Priority)

```bash
# Upgrade ESLint and config
pnpm add -D eslint@10.0.0
pnpm add -D @antfu/eslint-config@7.4.3

# Test linting
pnpm lint

# If successful, commit
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): upgrade ESLint to 10.x and @antfu config to 7.x"
```

**Expected Impact:** Linting rules may change. Review new errors/warnings.

### Phase 4: TypeScript and Tooling (Low Priority)

```bash
# Upgrade TypeScript and related tools
pnpm add -D typescript@5.9.3
pnpm add -D typedoc@0.28.17
pnpm add -D typedoc-plugin-markdown@4.10.0

# Test typecheck and docs build
pnpm typecheck
pnpm docs:build

# If successful, commit
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): upgrade TypeScript and documentation tools"
```

**Expected Impact:** Minimal. Patch-level changes.

### Phase 5: Cleanup (Low Priority)

```bash
# Remove unused dependencies (if confirmed not needed)
pnpm remove @dotenvx/dotenvx concurrently

# Commit
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): remove unused dependencies"
```

**Expected Impact:** None if truly unused.

### Phase 6: Minor Updates (Low Priority)

```bash
# Upgrade remaining outdated packages
pnpm add -D @types/prismjs@1.26.6
pnpm add -D prismjs@1.30.0
pnpm add -D standardized-audio-context-mock@9.7.26

# Test
pnpm test
pnpm build

# If successful, commit
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): upgrade remaining outdated packages"
```

**Expected Impact:** Minimal.

---

## Summary

The project has **25 vulnerabilities** primarily concentrated in:
1. **happy-dom** (2 critical RCE vulnerabilities)
2. **vitest** (1 critical RCE vulnerability)
3. **vite** (multiple moderate/low dev-server vulnerabilities)

**Good news:**
- Zero runtime dependencies confirmed
- No deprecated packages
- Lock file is healthy
- Most vulnerabilities are dev-time only (not in shipped package)

**Action required:**
- **Immediate:** Upgrade happy-dom to 20.6.1 (critical)
- **Immediate:** Upgrade vitest to 4.0.18 (critical)
- **High priority:** Upgrade Vite to 7.3.1 (moderate security + modernization)
- **Medium priority:** Upgrade ESLint toolchain (ecosystem alignment)
- **Low priority:** Clean up unused dependencies
- **Low priority:** Upgrade remaining outdated packages

**Estimated effort:**
- Phase 1 (critical): 1-2 hours (includes test verification)
- Phase 2 (Vite): 2-4 hours (may require config adjustments)
- Phase 3 (ESLint): 1-2 hours (may require rule adjustments)
- Phases 4-6: 1-2 hours total

**Total:** 5-10 hours to achieve full dependency health.
