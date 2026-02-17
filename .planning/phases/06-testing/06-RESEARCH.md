# Phase 6: Testing - Research

**Researched:** 2026-02-01
**Domain:** Testing Web Audio API libraries with Vitest
**Confidence:** HIGH

## Summary

Comprehensive testing for Web Audio API libraries requires specialized patterns for mocking audio contexts, testing asynchronous timing behavior, and validating event emission. The project already uses Vitest with standardized-audio-context-mock, which is the industry-standard approach for testing Web Audio code without actual audio rendering.

The existing test suite (~7,857 lines across 22+ test files) demonstrates solid patterns: mock AudioContext creation, async `settle()` helper for timing, spy-based verification of Web Audio API calls, and event listener testing. However, several core classes (Track, Sampler) and all controller classes lack test coverage.

Testing Web Audio libraries presents unique challenges: AudioContext state management, timing-based behavior (requestAnimationFrame, setTimeout), event emission during audio playback, and AudioParam automation scheduling. Vitest's fake timers (`vi.useFakeTimers()`, `vi.advanceTimersByTime()`), async polling (`expect.poll()`), and spy utilities (`vi.spyOn()`) provide the necessary tools.

**Primary recommendation:** Use existing test patterns (mock AudioContext, settle() helper, spy-based verification) to achieve comprehensive coverage. Focus on behavior verification over implementation details. Leverage Vitest's V8 coverage provider for accurate reporting with minimal performance overhead.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 2.1.1+ | Test framework | Modern, fast, Vite-native replacement for Jest with excellent TypeScript support |
| standardized-audio-context-mock | 9.7.9+ | Web Audio API mocking | Only maintained mock library for standardized-audio-context, provides Sinon-based mocks |
| happy-dom | 15.7.4+ | DOM environment | Lightweight DOM implementation for Vitest, faster than jsdom |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 2.1.1+ | Code coverage reporting | Default coverage provider, faster than Istanbul with equal accuracy (as of Vitest 3+) |
| @vitest/coverage-istanbul | 2.1.1+ | Alternative coverage | Only if V8 provider has issues or non-V8 runtime required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest is slower (10-20x on large codebases), less Vite integration, but more ecosystem plugins |
| standardized-audio-context-mock | web-audio-test-api | web-audio-test-api is unmaintained since 2019, lacks modern features |
| happy-dom | jsdom | jsdom is more complete but significantly slower for most use cases |

**Installation:**
```bash
# Already installed in project
pnpm add -D vitest @vitest/coverage-v8 happy-dom standardized-audio-context-mock
```

## Architecture Patterns

### Recommended Test File Structure
```
src/
├── sound.ts
├── sound.test.ts          # Co-located with source
├── controllers/
│   ├── base-param-controller.ts
│   └── base-param-controller.test.ts
└── test/
    └── helpers/
        ├── index.ts       # Test utilities (settle, mockSetTimeout)
        └── note-factory.ts
```

### Pattern 1: Mock AudioContext Factory
**What:** Centralized function for creating mock AudioContext instances
**When to use:** Every test that needs audio functionality
**Example:**
```typescript
// Source: Existing test files (sound.test.ts, oscillator.test.ts)
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'

function createMockContext() {
  return new MockAudioContext() as unknown as AudioContext
}

// Usage in tests
let audioContext: AudioContext
beforeEach(() => {
  audioContext = createMockContext()
})
```

### Pattern 2: Async Settle Helper
**What:** Utility to wait for async state changes
**When to use:** Testing async operations that don't return promises (requestAnimationFrame, setTimeout)
**Example:**
```typescript
// Source: src/test/helpers/index.ts
export function settle(valueFn: () => any, wait: number = 2): Promise<any> {
  return new Promise(resolve => setTimeout(() => resolve(valueFn()), wait))
}

// Usage
it('plays sound', async () => {
  sound.play()
  expect(await settle(() => sound.isPlaying)).toBe(true)
})
```

### Pattern 3: Spy-Based AudioParam Verification
**What:** Verify Web Audio API calls using Vitest spies
**When to use:** Testing controller methods that schedule parameter changes
**Example:**
```typescript
// Source: envelope.test.ts
it('schedules setValueAtTime(0) at startTime', () => {
  const envelope = new Envelope()
  const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

  envelope.applyTo(gainNode.gain, 1.0)

  expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, 1.0)
})
```

### Pattern 4: Event Testing with addEventListener
**What:** Test event emission and payload structure
**When to use:** All Playable classes (Sound, Track, Oscillator, BeatTrack, LayeredSound)
**Example:**
```typescript
// Source: base-sound.test.ts
it('play event includes time and source', async () => {
  const handler = vi.fn()
  sound.on('play', handler)
  sound.play()
  await settle(() => sound.isPlaying)

  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        time: expect.any(Number),
        source: sound,
      }),
    }),
  )
})
```

### Pattern 5: Fake Timers for Timing-Dependent Code
**What:** Control time progression in tests
**When to use:** BeatTrack (requestAnimationFrame loops), Track (position tracking)
**Example:**
```typescript
// Source: Vitest documentation
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('advances beat position over time', () => {
  beatTrack.play()
  vi.advanceTimersByTime(1000) // Simulate 1 second
  expect(beatTrack.currentBeatIndex).toBe(expectedIndex)
})
```

### Pattern 6: Describe Block Organization
**What:** Group tests by feature area
**When to use:** All test files, especially complex classes
**Example:**
```typescript
// Source: envelope.test.ts, oscillator.test.ts
describe('ClassName', () => {
  describe('constructor', () => { /* creation tests */ })
  describe('methodName()', () => { /* method behavior tests */ })
  describe('edge cases', () => { /* boundary conditions */ })
  describe('integration with X', () => { /* integration tests */ })
})
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't verify internal state; test public API behavior
- **Skipping async/await on settle():** Always await async helpers or tests become flaky
- **Over-mocking:** Only mock what's necessary; use real instances when possible
- **Ignoring event timing:** Events may be async; use `settle()` or `vi.waitFor()` before assertions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async state polling | Custom setTimeout loops | `expect.poll()` or `vi.waitFor()` | Built-in retry logic, cleaner syntax, better error messages |
| Timer mocking | Manual Date.now() override | `vi.useFakeTimers()` | Handles setTimeout, setInterval, requestAnimationFrame, Date.now() consistently |
| AudioContext mocking | Custom mock objects | standardized-audio-context-mock | Battle-tested, complete API coverage, Sinon integration |
| Coverage reporting | Manual code instrumentation | @vitest/coverage-v8 | Accurate source mapping, multiple reporter formats, threshold enforcement |
| Event testing | Promise wrappers | addEventListener + vi.fn() | Direct verification of event payload, no extra abstraction |

**Key insight:** Vitest and standardized-audio-context-mock provide purpose-built solutions for all common testing scenarios in this domain. Custom test utilities should be minimal and focused on project-specific patterns (like the `settle()` helper).

## Common Pitfalls

### Pitfall 1: Forgetting to await settle() for async state
**What goes wrong:** Tests pass/fail inconsistently due to race conditions
**Why it happens:** Web Audio operations (play, stop) update state asynchronously but don't return promises
**How to avoid:** Always `await settle()` when checking state after triggering audio operations
**Warning signs:** Tests fail intermittently, especially in CI environments

### Pitfall 2: Not cleaning up timers between tests
**What goes wrong:** Tests leak timers, causing timeout errors or affecting subsequent tests
**Why it happens:** `vi.useFakeTimers()` persists between tests unless explicitly restored
**How to avoid:** Use `afterEach(() => vi.useRealTimers())` or `vi.restoreAllMocks()`
**Warning signs:** Tests fail when run together but pass in isolation

### Pitfall 3: Testing implementation instead of behavior
**What goes wrong:** Tests break when refactoring even though behavior is unchanged
**Why it happens:** Tests verify internal methods/state instead of public API outcomes
**How to avoid:** Test from user perspective: "Does calling X produce outcome Y?" not "Does X call internal method Z?"
**Warning signs:** Minor refactors require extensive test rewrites

### Pitfall 4: Incomplete event payload testing
**What goes wrong:** Event structure changes break consumers silently
**Why it happens:** Only testing that event fires, not validating payload shape
**How to avoid:** Use `expect.objectContaining()` to verify all required event detail fields
**Warning signs:** Event listeners fail at runtime despite passing tests

### Pitfall 5: Not testing controller state persistence
**What goes wrong:** Scheduled parameter changes lost during play/stop cycles
**Why it happens:** Controllers store pending values that must persist across playback
**How to avoid:** Test that `onPlaySet()` and `onPlayRamp()` calls survive stop/play cycles
**Warning signs:** Parameter automation works on first play but not subsequent plays

### Pitfall 6: Missing edge case coverage for timing
**What goes wrong:** Zero-duration or negative values cause crashes
**Why it happens:** Web Audio API has strict timing requirements
**How to avoid:** Test boundary conditions: zero attack/decay/release times, immediate changes
**Warning signs:** Runtime errors with unusual timing parameters

## Code Examples

Verified patterns from official sources and existing codebase:

### Testing Controller Parameter Updates
```typescript
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
// Source: Project pattern (to be implemented)
import { beforeEach, describe, expect, it } from 'vitest'
import { SoundController } from './sound-controller'

describe('SoundController', () => {
  let audioContext: AudioContext
  let controller: SoundController

  beforeEach(() => {
    audioContext = new MockAudioContext() as unknown as AudioContext
    const source = audioContext.createBufferSource()
    const gain = audioContext.createGain()
    const pan = audioContext.createStereoPanner()
    controller = new SoundController(source, gain, pan)
  })

  describe('update()', () => {
    it('updates gain using ratio method', () => {
      controller.update('gain').to(0.5).from('ratio')
      expect(controller.gain).toBe(0.5)
    })

    it('updates gain using percent method', () => {
      controller.update('gain').to(50).from('percent')
      expect(controller.gain).toBe(0.5)
    })
  })

  describe('onPlaySet()', () => {
    it('schedules value at specific time', () => {
      controller.onPlaySet('gain').to(0.3).at(1.0)
      // Verify scheduled values stored for playback
      controller.setValuesAtTimes()
      // Spy on gainNode.gain.setValueAtTime would verify scheduling
    })
  })
})
```

### Testing Track Position and Seeking
```typescript
// Source: Project pattern (to be implemented)
describe('Track', () => {
  it('updates position during playback', async () => {
    const track = createTrack()
    track.play()
    await settle(() => track.isPlaying)

    // Position should advance
    const initialPosition = track.position.raw
    await settle(() => track.position.raw > initialPosition, 100)
    expect(track.position.raw).toBeGreaterThan(initialPosition)
  })

  it('seek updates startOffset and position', async () => {
    const track = createTrack()
    track.seek(5.0, 'seconds')

    expect(track.position.raw).toBeCloseTo(5.0, 1)
    expect(track.startOffset).toBeCloseTo(5.0, 1)
  })

  it('emits seek event with position', async () => {
    const track = createTrack()
    const handler = vi.fn()
    track.on('seek', handler)

    track.seek(3.0, 'seconds')

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          position: expect.any(Number),
        }),
      }),
    )
  })
})
```

### Testing Sampler Round-Robin Playback
```typescript
// Source: Project pattern (to be implemented)
describe('Sampler', () => {
  it('plays sounds in round-robin fashion', () => {
    const sound1 = createSound()
    const sound2 = createSound()
    const sound3 = createSound()

    const play1Spy = vi.spyOn(sound1, 'play')
    const play2Spy = vi.spyOn(sound2, 'play')
    const play3Spy = vi.spyOn(sound3, 'play')

    const sampler = new Sampler([sound1, sound2, sound3])

    sampler.play()
    expect(play1Spy).toHaveBeenCalledTimes(1)

    sampler.play()
    expect(play2Spy).toHaveBeenCalledTimes(1)

    sampler.play()
    expect(play3Spy).toHaveBeenCalledTimes(1)

    // Loop back to first
    sampler.play()
    expect(play1Spy).toHaveBeenCalledTimes(2)
  })
})
```

### Testing BeatTrack Timing with Fake Timers
```typescript
// Source: Vitest documentation + existing beat-track.test.ts patterns
describe('BeatTrack', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers beats at correct intervals', () => {
    const beatTrack = createBeatTrack()
    const beatHandler = vi.fn()
    beatTrack.addEventListener('beat', beatHandler)

    beatTrack.playActiveBeats(120, 1 / 4) // 120 BPM, quarter notes

    // At 120 BPM, quarter note = 500ms
    vi.advanceTimersByTime(500)
    expect(beatHandler).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(500)
    expect(beatHandler).toHaveBeenCalledTimes(2)
  })
})
```

### Testing Effect Chain Integration
```typescript
// Source: base-sound.test.ts
describe('Effect System', () => {
  it('maintains effect order', () => {
    const effect1 = createMockEffect(audioContext)
    const effect2 = createMockEffect(audioContext)
    const effect3 = createMockEffect(audioContext)

    sound.addEffect(effect1)
    sound.addEffect(effect2)
    sound.addEffect(effect3)

    const effects = sound.getEffects()
    expect(effects[0]).toBe(effect1)
    expect(effects[1]).toBe(effect2)
    expect(effects[2]).toBe(effect3)
  })

  it('effects persist across play cycles', async () => {
    const effect = createMockEffect(audioContext)
    sound.addEffect(effect)

    sound.play()
    await settle(() => sound.isPlaying)
    sound.stop()
    await settle(() => !sound.isPlaying)

    expect(sound.getEffects()).toContain(effect)
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest for testing | Vitest | 2023-2024 | 10-20x faster test execution, better Vite integration, native ESM |
| Istanbul coverage only | V8 coverage with AST remapping | Vitest 3.0 (2025) | Equal accuracy to Istanbul with better performance |
| Manual async polling | `expect.poll()` and `vi.waitFor()` | Vitest 2.0+ | Cleaner syntax, built-in retry logic |
| Coverage ignores via comments | `@preserve` annotation | TypeScript transpilation era | Ensures coverage hints survive build |

**Deprecated/outdated:**
- **web-audio-test-api**: Unmaintained since 2019; use standardized-audio-context-mock
- **Jest's `jest.useFakeTimers('legacy')`**: Modern fake timers are now default
- **NYC CLI for coverage**: Vitest has integrated coverage via `--coverage` flag

## Open Questions

Things that couldn't be fully resolved:

1. **Coverage thresholds for audio library**
   - What we know: General recommendation is 80%+ for critical paths
   - What's unclear: Whether 100% coverage is achievable/valuable for Web Audio API wrappers
   - Recommendation: Start with 80% line/branch coverage threshold, increase incrementally

2. **Testing real-time audio glitches**
   - What we know: Mock doesn't simulate timing glitches or buffer underruns
   - What's unclear: How to test performance-critical audio code without real audio
   - Recommendation: Unit tests verify logic; manual testing on devices for performance

3. **Track RAF loop testing reliability**
   - What we know: requestAnimationFrame can be flaky in tests even with fake timers
   - What's unclear: Best pattern for testing RAF-based position tracking
   - Recommendation: May need to spy on RAF calls or refactor to use setInterval for testing

## Sources

### Primary (HIGH confidence)
- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html) - Coverage providers and configuration
- [standardized-audio-context-mock npm](https://www.npmjs.com/package/standardized-audio-context-mock) - Official package documentation
- Existing test files in project (sound.test.ts, oscillator.test.ts, envelope.test.ts, base-sound.test.ts)

### Secondary (MEDIUM confidence)
- [Vitest Best Practices - Project Rules](https://www.projectrules.ai/rules/vitest) - Modern testing patterns
- [Web Audio API Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Audio context lifecycle
- [Vitest Timer Mocks Documentation](https://vitest.dev/api/vi.html) - Fake timers API
- [Unit Testing with Vitest - CS4530 Spring 2026](https://neu-se.github.io/CS4530-Spring-2026/tutorials/week1-unit-testing) - Academic testing patterns

### Tertiary (LOW confidence)
- [V8 Coverage vs Istanbul Performance](https://dev.to/stevez/v8-coverage-vs-istanbul-performance-and-accuracy-3ei8) - Coverage comparison
- [Testing Asynchronous Behavior - Vue Test Utils](https://v1.test-utils.vuejs.org/guides/testing-async-components.html) - Async patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already uses these tools successfully
- Architecture: HIGH - Existing tests demonstrate proven patterns
- Pitfalls: HIGH - Based on existing test patterns and common Web Audio testing issues
- Code examples: MEDIUM - Derived from existing tests but controllers need implementation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable testing ecosystem)
