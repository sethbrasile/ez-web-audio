---
phase: 08-build-distribution
plan: 02
subsystem: build
tags: [github-actions, npm, publishing, ci-cd, provenance, package-testing]

# Dependency graph
requires:
  - phase: 08-build-distribution
    plan: 01
    provides: Vite build configuration and package.json exports
provides:
  - GitHub Actions workflow for automated npm publishing on version tags
  - npm pack verification process for package integrity
  - Release process documentation in README
  - Clean package output (no demo app or test files)
affects: [08-03, future-releases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GitHub Actions automated publishing on v* tags
    - npm provenance for supply chain security
    - Local npm pack testing before publish
    - Test-before-publish CI workflow

key-files:
  created:
    - .github/workflows/publish.yml
  modified:
    - vite.config.js
    - tsconfig.json
    - readme.md

key-decisions:
  - "Use pnpm 10 in CI to match packageManager field"
  - "Run tests before publishing (fail fast on broken builds)"
  - "Include --provenance flag for supply chain attestation"
  - "Use --access public explicitly for public package"
  - "Exclude src/app and src/test from npm package via dts plugin"

patterns-established:
  - "npm version + git push --follow-tags workflow for releases"
  - "Automated publishing via GitHub Actions on tag push"
  - "npm pack local verification before first publish"
  - "Build exclusion patterns in both vite config and tsconfig"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 08 Plan 02: npm Publishing Pipeline Summary

**Automated npm publishing on v* tags with provenance attestation, test verification, and clean package output (98 files, 142.2 KB)**

## Performance

- **Duration:** 3 min 1 sec
- **Started:** 2026-02-02T04:10:26Z
- **Completed:** 2026-02-02T04:13:27Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- GitHub Actions workflow publishes to npm on version tags with provenance
- Package size reduced from 147.3 KB (168 files) to 142.2 KB (98 files)
- Demo app and test files excluded from npm package
- Release process documented in README for maintainers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GitHub Actions publish workflow** - `117351c` (feat)
2. **Task 2: Test package locally with npm pack** - `c0910c2` (fix - build config fixes)
3. **Task 3: Document release process in README** - `49be8ba` (docs)

## Files Created/Modified
- `.github/workflows/publish.yml` - Automated npm publishing on v* tags with tests and provenance
- `vite.config.js` - Added exclude patterns to dts plugin (src/app, src/test)
- `tsconfig.json` - Excluded src/app and src/test from compilation
- `readme.md` - Added Release Process section with version bump workflow

## Decisions Made

**Publishing workflow:**
- Use pnpm 10 to match project's packageManager field (consistency)
- Run `pnpm test run` before publishing to fail fast on broken builds
- Include `--provenance` flag for npm supply chain security attestation
- Use `--access public` explicitly even though scoped packages default to public
- Require NPM_TOKEN secret (user will configure in GitHub repo settings)

**Package cleanup:**
- Exclude src/app (demo components) and src/test (test helpers) from package
- Applied exclusions at both dts plugin level and tsconfig level for consistency
- Verified package contents with npm pack before documenting publish workflow

**Release workflow:**
- Standard `npm version` + `git push --follow-tags` pattern
- Documented in README for maintainer reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Excluded demo app and test files from npm package**
- **Found during:** Task 2 (npm pack verification)
- **Issue:** npm pack produced tarball with 168 files including entire src/app (demo components) and src/test (test helpers) directories. These are not library code and should not be distributed to consumers.
- **Fix:**
  - Added `exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/app/**', 'src/test/**']` to vite-plugin-dts config
  - Added `src/app` and `src/test` to tsconfig.json exclude array
  - Rebuilt and verified with npm pack
- **Files modified:** vite.config.js, tsconfig.json
- **Verification:**
  - Package size reduced from 147.3 KB (168 files) to 142.2 KB (98 files)
  - `tar -tzf` shows no package/dist/app or package/dist/test directories
  - npm install from tarball succeeds
  - TypeScript types resolve correctly in consumer project
- **Committed in:** c0910c2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correct package distribution. Demo and test code should never be published to npm. No scope creep - this is correctness work.

## Issues Encountered

**TypeScript lib configuration in consumer projects:**
- During package testing, TypeScript complained about `Map` and `Set` types in declaration files
- Not a package bug - consumers need standard lib settings (ES2015+ with DOM)
- This is reasonable requirement for any modern TypeScript project using DOM APIs
- Verified package works correctly with `--lib ES2015,DOM` flag

## User Setup Required

**NPM_TOKEN secret configuration:**
After merging this PR, configure the GitHub secret:

1. Create npm access token:
   - Visit https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. Add to GitHub repository:
   - Go to repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: [paste token]

3. Verify configuration:
   - Create a test tag: `git tag v0.1.0-test && git push origin v0.1.0-test`
   - Check Actions tab for workflow run
   - Delete test tag after: `git tag -d v0.1.0-test && git push origin :refs/tags/v0.1.0-test`

## Next Phase Readiness

**Ready for first publish:**
- Build produces clean npm-ready package (142.2 KB, 98 files)
- Package contains only library code and types
- GitHub Actions workflow configured for automated publishing
- Release process documented in README
- Local verification successful (types resolve, package installs)

**Next phase needs:**
- Plan 03: Pre-publish checklist and first npm publish
- NPM_TOKEN secret configured in GitHub
- Version bump to 0.1.0 (already set in package.json)

**Package verification results:**
- npm pack: 142.2 KB tarball, 587.6 KB unpacked
- File count: 98 (down from 168)
- Contains: dist/, readme.md, LICENSE, package.json
- Does NOT contain: src/, tests, .planning/, docs/, node_modules/
- Types resolve correctly with standard TypeScript lib settings
- Zero dependencies maintained

---
*Phase: 08-build-distribution*
*Completed: 2026-02-02*
