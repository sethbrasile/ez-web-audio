# Test Quality Audit (TEST-03)

**Date:** 2026-02-15
**Scope:** 29 test files, ~711 tests
**Purpose:** Identify false positives, weak assertions, missing edge cases, and coverage gaps before v1.1 publish

---

## Summary

- **Total test files:** 29
- **Total tests:** ~711
- **Files with no tests:** 9 source files (see Coverage Gaps section)
- **Overall quality assessment:** Good test coverage with some notable gaps and improvement opportunities

**Strengths:**
- Comprehensive coverage of core classes (Sound, Track, Oscillator, BeatTrack, Envelope)
- Strong event payload testing across all event-emitting classes
- Good use of mocking for AudioContext and Web Audio API nodes
- Tests verify both positive paths and method chaining behavior

**Weaknesses:**
- Several tests check only that methods don't throw (weak assertions)
- Missing edge cases for error paths, boundary values, and rapid successive calls
- Some tests mock so heavily they may not catch integration issues
- Untested files include critical path helpers and error classes

---

## False Positives

Tests that would pass even if the feature were broken:

| Test File | Test Name | Issue | Risk | Fix |
|-----------|-----------|-------|------|-----|
| `sound.test.ts` | "update("pan").to(-0.5).from("ratio") sets pan" | Only checks `toBe(true)` after update, doesn't verify pan value | Medium | Add assertion: `expect(sound.pannerNode.pan.value).toBeCloseTo(-0.5)` |
| `sound.test.ts` | "changePanTo() sets pan value" | Only checks `toBe(true)`, doesn't verify pan was actually set | Medium | Add assertion checking actual pan value |
| `sound.test.ts` | "playFor(duration)" line 171 | Calls playFor but then asserts `expect(true).toBe(true)` | High | Verify stop was scheduled or use fake timers to test timing |
| `sampler.test.ts` | "handles empty sounds array" | Documents that `play()` throws but doesn't assert the throw | Low | Already has comment "This test documents the current behavior" - consider adding guard |
| `layered-sound.test.ts` | "warns when layer count >= warnLayerCount" (line 66) | Comment says "we can't catch it with addEventListener after construction" but doesn't verify emission | Low | Add listener before construction or verify via console.warn spy |
| `beat-track.test.ts` | "playActiveBeats method calls callPlayMethodOnBeats" (line 102) | Uses `assert.strictEqual(arg1, 'playIn')` but no return value, test would pass if method never called | Low | Better handled by checking a side effect or call count |

---

## Weak Assertions

Tests that assert too little and could be strengthened:

| Test File | Test Name | Current Assertion | Stronger Alternative |
|-----------|-----------|-------------------|---------------------|
| `base-sound.test.ts` | "play event includes time and source" | Checks `time: expect.any(Number)` | Check time is >= audioContext.currentTime |
| `base-sound.test.ts` | "addEffect with position" | Only checks order, not that insertion happened at index | Add assertion: `expect(effects).toHaveLength(3)` before order checks |
| `base-sound.test.ts` | "setDestination()" | Only verifies return for chaining | Verify destination was actually wired (check connection) |
| `sound.test.ts` | "percentGain returns gain as percentage" | Only checks `typeof percent === 'number'` | Check value matches expected percentage calculation |
| `sound.test.ts` | "playFor plays for specified duration" | Only asserts `expect(true).toBe(true)` | Use fake timers and verify stop called after duration |
| `oscillator.test.ts` | "applies envelope on play" | Only checks `isPlaying === true` | Verify gainNode automation was scheduled (spy on linearRampToValueAtTime) |
| `track.test.ts` | "pause() preserves position (startOffset > 0)" | Checks `startOffset > 0` | Check exact value or verify it increased from play time |
| `beat-track.test.ts` | "beat event has beatIndex property" | Only checks property exists and type | Verify beatIndex increments correctly across events |
| `layered-sound.test.ts` | "filters out null/undefined layers gracefully" | Only checks layer count | Verify getLayer doesn't return null/undefined |
| `sprite.test.ts` | "sets loop property from sprite definition" | Only checks `loop === true` | Also verify loopStart/loopEnd are set correctly |
| `preload.test.ts` | "works with empty array (no-op)" | Only checks fetch not called | Could also verify it resolves successfully |
| `analyzer.test.ts` | "returns Uint8Array" | Only checks type | Also check length matches frequencyBinCount |
| `envelope.test.ts` | "readonly properties (compile-time only)" | Tests mutate readonly properties | These tests verify TypeScript checking but allow mutation at runtime - consider removing or documenting |

---

## Missing Edge Cases

Critical scenarios not covered by current tests:

| Source File | Missing Scenario | Priority | Recommendation |
|------------|-----------------|----------|----------------|
| `sound.ts` | Play when already playing (without stop) | High | Test play() while isPlaying === true, verify new source created or error |
| `sound.ts` | Stop when not playing (already tested but verify no event emitted) | Medium | Already covered (line 291) but could verify return value |
| `sound.ts` | Negative startOffset | High | Test sound.startOffset = -5, verify clamped to 0 or error |
| `sound.ts` | startOffset > duration | High | Test sound.startOffset = 999, verify clamped or error |
| `sound.ts` | Rapid play-stop-play cycles | Medium | Call play(), stop(), play() synchronously, verify no race conditions |
| `track.ts` | Seek to negative position | High | Already tested (line 494) - clamping works |
| `track.ts` | Pause when not playing | Medium | Test pause() when isPlaying === false, verify no event |
| `track.ts` | Resume when not paused | Medium | Already tested (line 240) - does nothing |
| `track.ts` | Concurrent seek calls | Low | Call seek() twice rapidly, verify final position is correct |
| `oscillator.ts` | Play with 0 frequency | Medium | Test oscillator with frequency: 0, verify behavior (silent or error?) |
| `oscillator.ts` | Invalid wave type | Low | Test invalid `type` value, verify error or default |
| `sampler.ts` | Empty sounds array | Medium | Already tested (line 290) but throws - should guard or document |
| `sampler.ts` | Null sound in array | Medium | Test [sound1, null, sound2], verify null skipped or error |
| `beat-track.ts` | setTempo(0) | High | Test with zero BPM, verify error or guard |
| `beat-track.ts` | setTempo(negative) | High | Test with negative BPM, verify error or guard |
| `beat-track.ts` | numBeats = 0 | Medium | Test setting beats to 0, verify behavior |
| `layered-sound.ts` | Play with 0 layers | Medium | Already tested implicitly - verify behavior with empty array |
| `layered-sound.ts` | Layer play() fails | Low | Mock layer.playAt to throw, verify error handling |
| `envelope.ts` | Negative attack/decay/release times | Medium | Test with negative values, verify clamped to 0 or error |
| `envelope.ts` | Very large attack time (> buffer duration) | Low | Test with attackTime: 9999, verify behavior |
| `analyzer.ts` | Change fftSize while reading data | Low | Set fftSize during getFrequencyData(), verify no errors |
| `sprite.ts` | Sprite end < start | Medium | Test {start: 5, end: 2}, verify error or clamping |
| `sprite.ts` | Sprite start > buffer duration | Medium | Test sprite start beyond buffer length, verify error |
| `preload.ts` | Concurrent preload of same URL | Low | Call preload(url) twice simultaneously, verify only one fetch |
| `musical-identity.ts` | Invalid identifier format | Medium | Test identifier: "invalid123", verify error handling |
| `musical-identity.ts` | Frequency out of range (negative, 0) | Medium | Test with frequency: -1 or 0, verify behavior |
| **Error Path Coverage** | Most classes lack tests for catch blocks | High | Add tests that trigger error conditions and verify error messages |
| **AudioContext null/undefined** | No tests for missing AudioContext | High | Test factory functions without calling initAudio(), verify error |
| **AudioBuffer null** | AudioBufferSourceNode with null buffer | Medium | Test Sound with null buffer edge case |
| **Web Audio API failures** | Mock API throwing errors | Medium | Test AudioContext.createGain() throwing, verify graceful failure |

---

## Coverage Gaps (Untested Files)

Files with no corresponding test file:

| File | Reason Untested | Should Test? | Priority |
|------|----------------|-------------|----------|
| `src/note.ts` | Small wrapper, but used in Note class | Yes | Medium |
| `src/sampled-note.ts` | Musical note with identity, core feature | Yes | High |
| `src/font.ts` | Soundfont loading, critical for soundfont-piano | Yes | High |
| `src/interfaces/playable.ts` | Interface only | No | N/A |
| `src/interfaces/connectable.ts` | Interface only | No | N/A |
| `src/errors/context-error.ts` | Error class, minimal logic | Maybe | Low |
| `src/errors/load-error.ts` | Error class, minimal logic | Maybe | Low |
| `src/errors/invalid-note-error.ts` | Error class, minimal logic | Maybe | Low |
| `src/errors/audio-error.ts` | Base error class | Maybe | Low |
| `src/utils/create-time-object.ts` | Time formatting utility, used everywhere | Yes | High |
| `src/utils/frequency-map.ts` | Musical frequency lookup, core feature | Yes | High |
| `src/utils/prop-access.ts` | Property access helper | Maybe | Medium |
| `src/utils/timeout.ts` | setTimeout wrapper | Maybe | Low |
| `src/events/event-types.ts` | Type definitions only | No | N/A |

**Recommended new test files:**
1. `sampled-note.test.ts` - Test musical note playback with frequency
2. `font.test.ts` - Test soundfont loading and Base64 decoding (mock fetch)
3. `create-time-object.test.ts` - Test TimeObject formatting edge cases
4. `frequency-map.test.ts` - Test frequency lookup accuracy
5. `note.test.ts` - Test Note class creation and properties
6. `prop-access.test.ts` - Test property access patterns
7. `error-classes.test.ts` - Single file testing all custom error classes (message formatting, instanceof checks)

---

## Test Organization Issues

| Test File | Issue | Recommendation |
|-----------|-------|----------------|
| `base-sound.test.ts` | Contains tests for Event System, Debug Mode, Effect System, Analyzer - very long (697 lines) | Split into separate test files: `base-sound-events.test.ts`, `base-sound-effects.test.ts`, `base-sound-debug.test.ts` |
| `beat-track.test.ts` | Extended BeatTrack class exposes internals for testing (line 11-51) | Consider testing via public API or extract test helpers to separate file |
| `musical-identity.test.ts` | Uses `expect(1)` placeholders (lines 31, 39, 46, 54, 66, 78, 90, 100) | Remove placeholder expects, unnecessary with modern Vitest |
| `index.test.ts` | Very long (346 lines), covers multiple concerns (init, factories, errors, lazy init) | Consider splitting by concern |
| `envelope.test.ts` | Very comprehensive (476 lines) but well-organized | No change needed - good example |
| `analyzer.test.ts` | Accesses private properties via `['_frequencyData']` | Acceptable for testing internal state, but document why |
| `within-range.test.ts` | Only 4 tests for simple utility | Add edge cases: NaN, Infinity, equal min/max |

---

## Top Priority Improvements

Ranked list of the most impactful test improvements for Phase 15:

### 1. **Add Tests for Untested Core Files (HIGH PRIORITY)**
- `src/font.ts` - Soundfont loading is critical, no tests
- `src/sampled-note.ts` - Musical note playback, no tests
- `src/utils/create-time-object.ts` - Used in Track/Sound duration display, no tests
- `src/utils/frequency-map.ts` - Musical pitch accuracy depends on this, no tests

**Impact:** These files are in critical paths but have zero test coverage.

---

### 2. **Fix False Positives (HIGH PRIORITY)**
- `sound.test.ts` line 171 - playFor() test asserts `expect(true).toBe(true)`
- `sound.test.ts` lines 319, 344 - Pan tests only check `toBe(true)`, don't verify pan value
- `layered-sound.test.ts` line 66 - Warning test can't verify emission

**Impact:** Tests will pass even if features are broken.

---

### 3. **Add Error Path Tests (HIGH PRIORITY)**
- Test invalid inputs (negative values, null, undefined, out of range)
- Test Web Audio API errors (createGain() throws, resume() fails)
- Test AudioContext interrupted state handling
- Test load() failures (404, network error, invalid audio data)

**Impact:** Current tests only cover happy paths. Error handling is untested.

---

### 4. **Add Edge Case Tests for BeatTrack (MEDIUM PRIORITY)**
- `setTempo(0)` - Should guard or error
- `setTempo(-120)` - Should guard or error
- `numBeats = 0` - Verify behavior
- Rapid pause/resume/stop cycles

**Impact:** BeatTrack is used in drum machine demos, edge cases could crash UI.

---

### 5. **Strengthen Weak Assertions (MEDIUM PRIORITY)**
- `sound.test.ts` - Verify percentGain calculation
- `oscillator.test.ts` - Verify envelope automation was scheduled (spy on gainNode methods)
- `beat-track.test.ts` - Verify beatIndex increments correctly
- `sprite.test.ts` - Verify loopStart/loopEnd are set

**Impact:** Tests verify behavior exists but not correctness.

---

### 6. **Add Boundary Value Tests (MEDIUM PRIORITY)**
- `sound.startOffset = -5` - Verify clamped to 0
- `sound.startOffset = 9999` - Verify clamped to duration
- `track.seek(-10)` - Already tested, works
- `track.seek(9999)` - Already tested, works
- `oscillator.frequency = 0` - Verify behavior
- `analyzer.fftSize = 16` - Too small, should error
- `envelope.attackTime = -1` - Should clamp or error

**Impact:** Prevents crashes from invalid user input.

---

### 7. **Add Concurrent Operation Tests (MEDIUM PRIORITY)**
- Play while already playing
- Stop while stopping
- Rapid seek calls
- Concurrent preload of same URL
- BeatTrack pause/resume during playback

**Impact:** Real-world usage often involves rapid UI interactions.

---

### 8. **Split Large Test Files (LOW PRIORITY)**
- `base-sound.test.ts` (697 lines) - Split by concern
- `index.test.ts` (346 lines) - Split by feature

**Impact:** Improves maintainability and test readability.

---

### 9. **Remove Placeholder Expects (LOW PRIORITY)**
- `musical-identity.test.ts` - Remove `expect(1)` placeholders

**Impact:** Code cleanliness only, no functional benefit.

---

### 10. **Add Integration Tests (FUTURE)**
- Sound → Effect → Analyzer chain
- BeatTrack → Sampler → multiple concurrent plays
- LayeredSound with effects on each layer
- Full soundfont-piano workflow

**Impact:** Current tests are mostly unit tests. Integration tests would catch cross-component issues.

---

## Recommendations for Phase 15

**Immediate Actions:**
1. Create test files for `font.ts`, `sampled-note.ts`, `create-time-object.ts`, `frequency-map.ts`
2. Fix false positive tests in `sound.test.ts`
3. Add error path tests across all core classes
4. Add boundary value tests for BeatTrack (tempo, numBeats)
5. Add edge case tests for Sound/Track (startOffset, rapid play/stop)

**Future Actions:**
- Split `base-sound.test.ts` into smaller files
- Add integration test suite
- Add performance tests (memory leaks, rapid allocation)
- Consider visual regression tests for docs examples

**Test Quality Metrics to Track:**
- % of source files with test coverage
- % of tests with specific value assertions (vs type-only)
- % of catch blocks exercised
- % of boundary values tested

---

## Notes

**Testing Philosophy:**
- Tests use `standardized-audio-context-mock` which doesn't fully implement Web Audio API
- Some tests (like Analyzer) work around mock limitations by spying on methods
- Heavy mocking means some integration issues won't be caught until runtime

**Test Patterns Observed:**
- Good: Event payload testing (time, source, detail) is consistent
- Good: Fluent API testing verifies chaining and final values
- Good: Before/after hooks clean up mocks properly
- Needs improvement: Error path coverage
- Needs improvement: Boundary value testing
- Needs improvement: Concurrent operation testing

**CI/CD Readiness:**
- All tests run in Node environment via Vitest + happy-dom
- No browser-specific tests (good for CI)
- No manual testing required (except iOS-specific audio unlock behavior)
