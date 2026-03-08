# Phase 62: Multiple AudioContext Support - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable power users to use multiple AudioContexts by adding optional `audioContext` first-param overloads to all factory functions that internally use `getOrCreateAudioContext()`. Migrate existing effect factories to use the same detection pattern. Add documentation guide page. Zero breaking changes.

</domain>

<decisions>
## Implementation Decisions

### Detection pattern
- Use `instanceof BaseAudioContext` for runtime detection (not duck-typing)
- Migrate existing effect factories (createDelay, createDistortion, createCompressor, createEQ, createReverb, createGainEffect) from duck-typing to `instanceof BaseAudioContext` for consistency
- TypeScript overload signatures type the parameter as `BaseAudioContext` (not `AudioContext`) — this accepts both AudioContext and OfflineAudioContext with no friction for typical users since AudioContext extends BaseAudioContext

### Overload scope
- Add overloads only to functions that call `getOrCreateAudioContext()` internally
- Skip createLFO (infers context from target), createSequence (takes Transport), createNotes (pure data)
- createBeatTrack gets the overload (it calls getOrCreateAudioContext() for timing)
- createFont gets the overload (it creates audio nodes internally)
- Full list: createSound, createSounds, createTrack, createTracks, createOscillator, createPolySynth, createGrainPlayer, createBeatTrack, createSprite, createNoise, createWhiteNoise, createFont, createLayeredSound, createTransport, createSampler, playTogether

### Documentation
- New dedicated guide page: `docs/guide/multiple-contexts.md`
- Code examples only, no interactive demo (advanced pattern, static snippets sufficient)
- Highlight four use cases: separate output devices (sinkId), context isolation (clean teardown), multiple widgets on one page, different sample rates
- Include browser limitations (Chrome caps ~6 contexts)
- Include the constraint: sounds and effects must share a context to connect
- Include when NOT to use multiple contexts (most apps should use the singleton)

### Claude's Discretion
- JSDoc wording for new overloads
- Test structure and organization
- Exact code examples in the guide page
- Order of function updates

</decisions>

<specifics>
## Specific Ideas

- The spec at `.planning/specs/multiple-audiocontext.md` has detailed deliverables and technical notes
- createAnalyzer already has the overload pattern using `instanceof AudioContext` — this becomes the reference implementation, updated to use `BaseAudioContext`
- Effect factories currently use `typeof (arg as AudioContext).createGain === 'function'` — all migrate to `instanceof BaseAudioContext`

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createAnalyzer` in `src/index.ts:644-655`: Already has the AudioContext overload pattern — reference implementation
- Effect factories in `src/effects/`: All have AudioContext-first overloads with duck-typing detection — need migration
- `getOrCreateAudioContext()` and `initAudio()`: Singleton pattern stays unchanged

### Established Patterns
- Effect factory overload pattern: `fn(options?)` + `fn(audioContext, options?)` with implementation function detecting first arg type
- All async factory functions call `await initAudio()` before `getOrCreateAudioContext()` — when explicit context is passed, skip `initAudio()` (context already exists)
- `createAnalyzer` shows the pattern: explicit context path skips `await initAudio()`

### Integration Points
- `src/index.ts`: All factory functions live here — this is the primary file to modify
- `src/effects/*.ts`: Each effect factory file needs detection pattern migration
- `docs/guide/`: New page added here, referenced from `.vitepress/config.mts` sidebar
- `src/utils/play-together.ts`: Already has `instanceof AudioContext` check for extracting context from playables

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 62-multiple-audiocontext-support*
*Context gathered: 2026-03-07*
