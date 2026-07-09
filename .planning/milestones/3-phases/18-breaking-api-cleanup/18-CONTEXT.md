# Phase 18: Breaking API Cleanup - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply all breaking API changes before 1.0 locks the API: rename fluent methods, enforce encapsulation via protected visibility, remove deprecated APIs and type aliases, clean up dead code, standardize all JSDoc, and document all breaking changes. No new capabilities — this is cleanup only.

</domain>

<decisions>
## Implementation Decisions

### Migration strategy
- Each rename/change is atomic: method rename + all call sites (tests, docs, demo) updated in the same plan
- Claude decides how to group API-01 through API-07 into plans (grouping by type or logical dependency)
- A dedicated separate plan for JSDoc standardization (not bundled with API changes)
- Breaking changes documented in both CHANGELOG.md (repo root) and a "Migrating to 1.0" page in the docs site

### Deprecation approach
- Hard-remove everything — no deprecation warnings, no bridge methods, no transition period
- Old method names (.from(), ifActivePlayIn) disappear entirely
- Old type aliases (OscillatorOpts, OscillatorOptsFilterValues) deleted entirely
- Connections API (addConnection, removeConnection, getConnection, getNodeFrom, connections) deleted entirely
- Commented-out stopAfter in Playable interface deleted (was never implemented; playFor() covers the use case)
- No deprecation logging infrastructure exists or is needed
- TypeScript compiler catches remaining usages at compile time; migration guide covers the rest

### Protected enforcement
- TypeScript `protected` keyword only — no runtime enforcement (compile-time sufficient for TS-first library)
- Properties going protected: gainNode, pannerNode, effectChainInput on BaseSound; startOffset on BaseSound
- `protected` allows downstream users to subclass BaseSound and access internals for custom sound types
- Claude to determine whether Track should re-expose startOffset as public or rely on existing position API
- Claude to check for additional subclasses/mixins that may need access during research

### JSDoc standardization
- Standardize JSDoc on ALL public methods, not just changed ones
- Style: detailed — full descriptions, all @param with types and descriptions, @returns, @throws
- Every public method gets at least one @example block showing typical usage
- JSDoc work is a dedicated plan, separate from API change plans

### Claude's Discretion
- How to group API-01 through API-07 into plans (by type, dependency, or other logical grouping)
- Whether Track re-exposes startOffset as public or relies on existing position/time API
- Which additional subclasses or mixins need access to protected properties
- Ordering of plans within the phase

</decisions>

<specifics>
## Specific Ideas

- "Hard remove, but let's clearly notate all breaking changes in both readme and the demo docs app"
- CHANGELOG.md + migration guide page in docs site — both required for breaking change documentation
- stopAfter was never implemented; playFor(duration) on Sound/LayeredSound covers the use case

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-breaking-api-cleanup*
*Context gathered: 2026-02-17*
