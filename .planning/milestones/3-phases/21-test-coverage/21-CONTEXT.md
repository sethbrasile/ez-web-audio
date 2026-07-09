# Phase 21: Test Coverage - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the test suite with integration tests for end-to-end audio chains and soundfont workflows, add concurrent operation tests (play-while-playing, rapid seek, double-stop), and split base-sound.test.ts into focused files by concern. No new library features — this phase validates existing behavior.

</domain>

<decisions>
## Implementation Decisions

### Concurrent operation behavior
- **Play-while-playing:** Layer/overlap — both instances play simultaneously (like a drum machine hitting the same pad fast). No limit on simultaneous instances; let the browser's Web Audio mixer handle it.
- **Rapid seek:** Debounce/coalesce — only the last seek in a rapid burst actually takes effect.
- **Double-stop:** Second stop() call is a silent no-op — already stopped, nothing to do.

### Test file organization
- Split base-sound.test.ts by concern as stated in requirements: events, effects, debug, analyzer as separate files.

### Claude's Discretion
- Integration test assertion depth (node connection checks vs AnalyserNode data — pick what's practical with happy-dom mocks)
- Soundfont workflow test depth (full end-to-end vs load-and-verify — pick based on mock infrastructure support)
- Test environment choice (happy-dom mocks vs Playwright — pick best approach for the integration tests)
- Exact file size thresholds for the test split
- Shared test setup patterns across split files

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The concurrent behavior decisions above are the key product-level inputs.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-test-coverage*
*Context gathered: 2026-02-17*
