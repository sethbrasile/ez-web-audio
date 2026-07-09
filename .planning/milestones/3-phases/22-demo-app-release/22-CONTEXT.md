# Phase 22: Demo App & Release - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Update all demo Vue components and VitePress markdown examples for the final 1.0 API, regenerate TypeDoc API reference, write a comprehensive 1.0.0 changelog, and publish npm 1.0.0 via GitHub Actions. This is the final phase of the v1.0 Stable milestone.

</domain>

<decisions>
## Implementation Decisions

### Changelog content
- **Audience:** Both — breaking changes + migration guide at top, feature highlights below
- **Scope:** All changes since 0.1.0 (v1.0 MVP + v1.1 + v1.0 Stable milestones — comprehensive first-release changelog)
- **Migration:** Inline migration steps in the changelog under breaking changes (no separate MIGRATION.md)
- **Format:** Claude decides whether to extend the existing CHANGELOG.md from Phase 18 or rewrite it for a clean 1.0.0 release

### npm publish
- **Package name:** Keep `ez-web-audio` — same package, bump to 1.0.0
- **Publish method:** GitHub Actions — use/update the existing `.github/workflows/publish.yml`
- **Pre-publish verification:** Full test suite + build verification + E2E tests must all pass before publish (Claude decides exact CI gate structure)
- **Access:** Public (already public on npm)

### Demo app update depth
- **Scope:** Fix broken API calls AND adopt new convenience APIs (addEffects, playTogether, context-free factories) where they simplify the demos
- **Coverage:** Both Vue components AND VitePress markdown examples — update any code referencing old APIs
- **Deployment:** Build and deploy the demo site as part of this phase (not just code updates)

### TypeDoc configuration
- **Protected members:** Show them (clearly marked as protected — useful for advanced users extending classes)
- **Theme and internals:** Claude's discretion — pick whatever looks best and is most useful for the library's users

### Claude's Discretion
- Whether to extend or rewrite the existing CHANGELOG.md
- CI gate structure for pre-publish verification
- TypeDoc theme choice
- Whether internal classes (controllers, mixins) appear in TypeDoc output
- Demo site deployment mechanism (check existing setup)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — the key decisions above (changelog scope, demo update depth, TypeDoc visibility) provide sufficient direction.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-demo-app-release*
*Context gathered: 2026-02-17*
