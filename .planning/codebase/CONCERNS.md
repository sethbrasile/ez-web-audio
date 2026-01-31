# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Oscillator Duration Not Implemented:**
- Issue: `Oscillator.duration` always returns a zero `TimeObject` and has a TODO comment noting uncertainty about dynamic duration inference from ADSR parameters or scheduled stops
- Files: `src/oscillator.ts` (line 128-130)
- Impact: Oscillators cannot be reliably scheduled with duration-based stopping. Code that depends on `duration` for timing will fail silently or behave unpredictably
- Fix approach: Evaluate whether oscillators need duration tracking at all, or implement duration tracking based on scheduled value changes stored in the controller

**Incomplete Parameter Control Implementation:**
- Issue: BaseParamController has TODO to "handle all gainNode and pannerNode props" - currently only handles `gain` and `pan`, missing other audio node properties
- Files: `src/controllers/base-param-controller.ts` (line 57)
- Impact: Cannot fully control all audio node parameters. API is incomplete for advanced use cases
- Fix approach: Add support for additional GainNode and StereoPannerNode properties, potentially by expanding the ControlType union

**API Naming Ambiguity:**
- Issue: `from` parameter in update method is marked as needing reconsideration; author suggests it should be `using` or `as` instead
- Files: `src/controllers/base-param-controller.ts` (line 102)
- Impact: API clarity issue - developers may be confused about what `from` means in `.update('gain').to(0.5).from('ratio')`
- Fix approach: Consider renaming `from` to `as` or `using` in a major version bump with deprecation warning in current version

**BeatTrack Stop Mechanism Missing:**
- Issue: JSDoc comment indicates BeatTrack needs a way to stop once started, suggesting scheduling be refactored to create times in advance rather than calling play dynamically
- Files: `src/beat-track.ts` (line 34-36)
- Impact: BeatTrack instances cannot be reliably stopped mid-pattern, only by stopping underlying sounds. Scheduling approach is inflexible
- Fix approach: Refactor beat scheduling to pre-calculate all beat times and use scheduled playback rather than dynamic play calls

**Track Play Override Fragility:**
- Issue: JSDoc indicates Track.play needs to be moved to a private _play method so all super.play methods work correctly
- Files: `src/track.ts` (line 14)
- Impact: Inheritance chain behavior is fragile. Methods like playIn, playAt, etc. may not properly set up track position tracking due to bypass of play override
- Fix approach: Create protected _play method and refactor setup to occur there, allowing all play variants to work correctly

## Test Coverage Gaps

**No Tests for Core Classes:**
- What's not tested: `BaseSound`, `Sound`, `Oscillator`, `Track`, `Sampler`, `Sampler`-based classes lack dedicated test suites
- Files: `src/base-sound.ts`, `src/sound.ts`, `src/oscillator.ts`, `src/track.ts`, `src/sampler.ts`
- Risk: Core playback functionality (play/stop/pause/seek, gain/pan control, connection wiring, timer scheduling) is untested. Breaking changes in base-sound could go undetected
- Priority: High - These are the most critical classes

**Incomplete Musical Identity Testing:**
- What's not tested: `musical-identity.test.ts` exists but test coverage is incomplete. No verification of error handling for invalid identifiers (e.g., "H9", "C10")
- Files: `src/musical-identity.ts` with partial tests in `src/musical-identity.test.ts`
- Risk: Invalid note identifiers could crash or behave unexpectedly
- Priority: Medium

**No Tests for Controller Classes:**
- What's not tested: Parameter scheduling logic (`BaseParamController.onPlaySet`, `onPlayRamp`), value ramping, time-based value scheduling
- Files: `src/controllers/base-param-controller.ts`, `src/controllers/sound-controller.ts`, `src/controllers/oscillator-controller.ts`
- Risk: Parameter automation is untested. Scheduled gain changes, frequency sweeps, and ramp curves could fail silently
- Priority: High - parameter control is core functionality

**No Tests for Font/SampledNote:**
- What's not tested: Font loading, SampledNote initialization, note-to-sample mapping, bank selection
- Files: `src/font.ts`, `src/sampled-note.ts`
- Risk: Sound font library loading could fail undetected
- Priority: Medium

**No Tests for Audio Context Initialization:**
- What's not tested: `initAudio()`, `unlockAudioContext()`, iOS workaround, AudioContext state management
- Files: `src/index.ts` (lines 28-65)
- Risk: Browser-specific audio context startup behavior is critical but untested. iOS muting workaround could fail silently
- Priority: High

**No Tests for Web Audio Wiring:**
- What's not tested: Connection chain wiring (`wireConnections`), filter node connections, custom effect integration
- Files: `src/sound.ts`, `src/oscillator.ts` (wireConnections methods)
- Risk: Audio routing could silently fail or produce no sound output
- Priority: High

**Insufficient Base64 Decoding Tests:**
- What's not tested: Error handling for invalid base64 data, buffer overflow, malformed soundfont data
- Files: `src/utils/decode-base64.ts`, `src/utils/decode-base64.test.ts` (line 4-6 shows omitted test data)
- Risk: Malformed or malicious base64 data could cause crashes or memory issues
- Priority: Medium

**No Tests for Connectable/Playable Interfaces:**
- What's not tested: Implementation correctness of Connectable/Playable interface contract across all classes
- Files: `src/interfaces/connectable.ts`, `src/interfaces/playable.ts`
- Risk: Type contracts could be violated at runtime without detection
- Priority: Low

## Known Issues

**Synth Note Hanging on First Press:**
- Symptoms: Oscillator notes hang/don't play correctly on first interaction
- Files: `src/index.ts` (line 63)
- Workaround: `unlockAudioContext()` call in `initAudio()` appears to work around the issue, but the root cause is unexplained
- Context: TODO comment suggests this is a browser/iOS audio context initialization quirk that was discovered empirically but not fully understood

**Soundfont Parsing Fragility:**
- Symptoms: `mungeSoundFont` depends on finding `MIDI.Soundfont.` and specific quote positions
- Files: `src/utils/decode-base64.ts` (lines 32-40)
- Trigger: Soundfont files with different formatting or structure will fail to parse
- Impact: Breaks sound font loading if format changes

## Security Considerations

**Base64 Decoding of Untrusted Data:**
- Risk: `base64ToUint8` uses `atob()` on user-supplied soundfont data without validation. Malformed input could cause performance issues
- Files: `src/utils/decode-base64.ts` (lines 14-20)
- Current mitigation: `atob()` has size limits, reduces arbitrary memory exhaustion risk
- Recommendations: Add try-catch around `atob()` call; validate decoded data size; add logging for decode failures; consider length checks before attempting decode

**Unvalidated JSON Parsing:**
- Risk: `mungeSoundFont` uses `JSON.parse()` on extracted soundfont string without validation
- Files: `src/utils/decode-base64.ts` (line 40)
- Current mitigation: None
- Recommendations: Add try-catch around JSON.parse; validate structure before use; reject soundfonts that exceed reasonable size limits

**AudioContext State Not Validated:**
- Risk: Code assumes AudioContext is always initialized; if `initAudio()` fails, subsequent calls will crash
- Files: `src/index.ts` (line 50-51)
- Current mitigation: Check for AudioContext existence before using
- Recommendations: Add explicit state machine for AudioContext initialization; throw meaningful errors when state is invalid; add logging for initialization failures

## Performance Bottlenecks

**Track Position Tracking via RequestAnimationFrame Loop:**
- Problem: `Track.trackPlayPosition()` spins up a `requestAnimationFrame` loop every time track plays, not cleaned up if track is stopped abnormally
- Files: `src/track.ts` (lines 94-105)
- Cause: RAF loop continues running even after stop if `_isPlaying` is never set to false. No explicit cleanup
- Improvement path: Store RAF ID and explicitly cancel it in stop method; consider using AudioContext time instead of RAF for timing

**Base64 Decoding Creates Multiple Intermediate Strings:**
- Problem: `base64ToUint8` converts entire soundfont to string, splits on each character, then maps to charCode
- Files: `src/utils/decode-base64.ts` (lines 15-19)
- Cause: Inefficient algorithm for large soundfonts; creates intermediate array of characters
- Improvement path: Use `Uint8Array.from()` directly; batch decode in chunks; consider using TextEncoder/TextDecoder APIs

**Soundfont Parsing Uses String Search and Slice:**
- Problem: `mungeSoundFont` uses `indexOf()` twice and `lastIndexOf()` to parse soundfont, fragile for large files
- Files: `src/utils/decode-base64.ts` (lines 32-40)
- Cause: String operations on potentially large soundfont content
- Improvement path: Use regex or streaming parser; validate format before processing

**BeatTrack Beat Creation Repeated:**
- Problem: `.beats` getter recomputes all beats on every access if `numBeats` or `duration` changes, using WeakMap cache that's re-read every time
- Files: `src/beat-track.ts` (lines 85-117)
- Cause: Beats array is regenerated on property changes, but WeakMap lookup happens on every getter access
- Improvement path: Cache computed beats array; only recompute on explicit property changes; consider using Proxy or observable pattern

## Fragile Areas

**Oscillator Node Lifecycle Management:**
- Files: `src/oscillator.ts`
- Why fragile: New oscillator created on every play; old oscillator disconnected without explicit cleanup; multiple overlapping plays could create orphaned nodes
- Safe modification: When adding features to oscillator: always call `stop()` before creating new oscillator; track active oscillators; add explicit node cleanup
- Test coverage: Zero - no tests for node creation/destruction cycles

**Sound Font Loading Chain:**
- Files: `src/index.ts` (lines 112-120), `src/utils/decode-base64.ts`, `src/font.ts`
- Why fragile: Depends on exact soundfont format; base64 decode can fail silently; JSON parse can throw; no validation of decoded data structure
- Safe modification: Add comprehensive validation at each step; wrap in try-catch; log failures; validate note structure before creating Font
- Test coverage: No tests for end-to-end Font creation

**Beat Timing with setTimeout:**
- Files: `src/beat.ts`, `src/beat-track.ts`
- Why fragile: Relies on `audioContextAwareTimeout` to convert acoustic time to wall clock time; timing can drift; multiple overlapping setTimeout calls not coordinated
- Safe modification: When modifying beat scheduling: test with rapid plays; verify RAF/setTimeout coordination; add safeguards for stopped context
- Test coverage: Tests exist for beat but not for timing accuracy under stress

**Track Position Tracking:**
- Files: `src/track.ts` (lines 94-105)
- Why fragile: RAF loop only stops if `_isPlaying` is exactly false; if stop() is called from outside, loop orphans; seek() during playback is complex
- Safe modification: When adding seek/pause features: always set `_isPlaying` in all stop paths; explicitly cancel RAF; test pause/resume/seek combinations
- Test coverage: Zero tests for track position tracking

**Parameter Scheduling with Weak References:**
- Files: `src/controllers/base-param-controller.ts`
- Why fragile: Scheduled values stored in arrays; no validation that parameter exists on source node; removeStartingValue uses reference equality which could break with object mutations
- Safe modification: When adding parameter types: validate parameter name exists; test with invalid parameters; use unique IDs instead of reference equality
- Test coverage: Zero tests for parameter scheduling

## Dependencies at Risk

**No Version Lock:**
- Risk: Package version is `0.0.0-notready` indicating pre-release. No explicit version strategy
- Impact: Unclear what constitutes a breaking change; users cannot rely on version numbers
- Migration plan: Define semver strategy; move to 1.0.0 when API stable; document breaking changes clearly

**Standardized Audio Context Mock Dependency:**
- Risk: `standardized-audio-context-mock@9.7.9` may not track Web Audio API spec updates. Mock could diverge from real browser behavior
- Impact: Tests pass but real-world audio could fail
- Migration plan: Monitor spec changes; test regularly against real browsers; consider contributing spec updates to mock library

**Loose Dependency Versions:**
- Risk: Several dependencies use `^` which allows minor/patch updates. No pinned versions
- Impact: Build could break unexpectedly with dependency updates
- Migration plan: Consider pinning major versions; monitor dependency updates; add CI tests against latest versions

## Missing Critical Features

**No Pitch Shift/Time Stretch:**
- Problem: Cannot modify pitch without changing speed or vice versa
- Blocks: Advanced synthesis, real-time pitch correction, time-shifted playback
- Impact: Library is limited to basic playback

**No Amplitude Envelope (ADSR) Abstraction:**
- Problem: Oscillator notes can't easily apply ADSR - must use manual onPlaySet/onPlayRamp calls
- Blocks: Realistic synthetic sound generation
- Impact: Users must manually schedule envelope changes

**No Recording/Capture:**
- Problem: Cannot capture output or record what user plays
- Blocks: Composition apps, real-time visualization, performance analysis
- Impact: Library is output-only

**No Comprehensive Error Handling:**
- Problem: Many operations can fail silently (init, decode, parse) without meaningful error feedback
- Blocks: User debugging, production diagnostics
- Impact: Hard to diagnose why audio isn't working

**No Event System:**
- Problem: Cannot subscribe to play/stop/seek events without accessing private state
- Blocks: Synchronizing visuals with audio, building music production tools
- Impact: Limited integration with application state

---

*Concerns audit: 2026-01-31*
