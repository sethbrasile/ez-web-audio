# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Vitest v2.1.1
- Config: `vite.config.js`
- Environment: happy-dom (lightweight DOM simulation for browser APIs)

**Assertion Library:**
- Vitest built-in `expect()` and `assert()`
- Mix of both: some tests use `expect()`, others use `assert.strictEqual()` or `assert.deepEqual()`

**Run Commands:**
```bash
pnpm test                      # Run all tests
pnpm test src/beat.test.ts     # Run single test file
```

**Additional Commands:**
```bash
pnpm typecheck                 # TypeScript type checking
pnpm lint                      # ESLint checking
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Convention: `.test.ts` suffix before file extension

**File Patterns:**
- `src/beat.test.ts` → tests for `src/beat.ts`
- `src/sound.test.ts` → tests for `src/sound.ts`
- `src/musical-identity.test.ts` → tests for `src/musical-identity.ts`
- `src/utils/array-methods.test.ts` → tests for `src/utils/array-methods.ts`

**Structure:**
Test files are flat (no nested describe blocks) with simple `it()` statements.

## Test Structure

**Suite Organization:**
```typescript
import { expect, it } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { settle } from './test/helpers'
import { Sound } from '@/sound'

// Factory function pattern
function createSound() {
  const context = new Mock() as unknown as AudioContext
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

// Simple test structure
it('exists', () => {
  expect(Sound).toBeTruthy()
})

it('can be created', () => {
  const sound = createSound()
  expect(sound).toBeTruthy()
})

it('plays', async () => {
  const sound = createSound()
  expect(sound.isPlaying).toBe(false)
  sound.play()
  expect(await settle(() => sound.isPlaying)).toBe(true)
})
```

**Patterns:**
- No setup/teardown hooks (`beforeEach`/`afterEach`) in current codebase
- Factory functions handle test object creation (`createSound()`, `createBeat()`, `createBeatTrack()`)
- Each test is independent and self-contained

## Mocking

**Framework:** `standardized-audio-context-mock` (v9.7.9)
- Provides mock `AudioContext` for testing Web Audio API code

**Patterns:**
```typescript
import { AudioContext as Mock } from 'standardized-audio-context-mock'

function createSound() {
  const context = new Mock() as unknown as AudioContext
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}
```

**Custom Mocks:**
- Parent class mocks for testing child behavior: `MockParentClass` in `src/beat.test.ts`
  ```typescript
  class MockParentClass {
    playCalled = false
    playInCalled = false
    playInValue = 0
    play() {
      this.playCalled = true
    }
    playIn(time: number) {
      this.playInCalled = true
      this.playInValue = time
    }
  }
  ```

- Test double mixin classes: `Note extends MusicallyAware(class {})` in `src/musical-identity.test.ts`
  ```typescript
  class Note extends MusicallyAware(class {}) implements IMusicallyAware {
    constructor(opts?: { letter?: NoteLetter, accidental?: Accidental, octave?: Octave, frequency?: number, identifier?: AcceptableNote }) {
      super()
      this.letter = opts?.letter || 'A'
      // ...
    }
  }
  ```

**Mocking setTimeout:**
Custom mock in test helpers for controlling timing:
```typescript
export function mockSetTimeout(fn: () => void, time: number = 1): number {
  setTimeout(fn, time)
  return time
}
```

Used in tests when you need to control async behavior:
```typescript
const beat = createBeat({
  play: parent.play.bind(parent),
  playIn: parent.playIn.bind(parent),
  duration: 1,
  setTimeout: mockSetTimeout,  // Use mock to control timing
})
```

**What to Mock:**
- AudioContext (always, via `standardized-audio-context-mock`)
- Parent class methods (dependency injection for testing isolation)
- setTimeout (when testing time-dependent behavior)

**What NOT to Mock:**
- Core library functionality being tested
- Standard JavaScript methods unless timing is critical
- Utility functions (test them directly)

## Fixtures and Factories

**Test Data:**
Two factory patterns used:

1. **Direct factory functions in test file:**
```typescript
function createSound() {
  const context = new Mock() as unknown as AudioContext
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}
```

2. **Named helper factory in `src/test/helpers/note-factory.ts`:**
```typescript
// Usage in src/utils/note-methods.test.ts
import noteFactory from '@test/helpers/note-factory'

const A0 = noteFactory('A', '', '0')
const Bb0 = noteFactory('B', 'b', '0')
const B0 = noteFactory('B', '', '0')
```

**Location:**
- Test-specific factories: defined in the test file itself
- Reusable factories: `src/test/helpers/note-factory.ts` and `src/test/helpers/index.ts`

**Test Helpers Available** in `src/test/helpers/index.ts`:
```typescript
export function settle(valueFn: () => any, wait: number = 2): Promise<any>
  // Wait for async state changes, then read value
  // Default wait: 2ms

export function mockSetTimeout(fn: () => void, time: number = 1): number
  // Mock setTimeout that still executes immediately
  // Returns the time value
```

## Coverage

**Requirements:** Not enforced (no coverage config in vite.config.js or package.json)

**Test Count:**
- Simple test suite: ~15-30 tests per core component
- Utility functions: 6-10 tests per utility
- Heavy use of assertion-based testing (checking state, not coverage metrics)

## Test Types

**Unit Tests:**
- Scope: Individual classes and utility functions
- Approach: Test single responsibility with mocked dependencies
- Examples: `src/beat.test.ts`, `src/sound.test.ts`, `src/utils/exponential-ratio.test.ts`

**Integration Tests:**
- Scope: Component interactions (e.g., Beat with parent Sound)
- Approach: Create mock parents, verify callbacks are called correctly
- Example from `src/beat.test.ts`:
  ```typescript
  it('can playIn and calls parent playIn, passing time value', () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
    })
    expect(parent.playCalled).toBe(false)
    beat.playIn(10)
    expect(parent.playInCalled).toBe(true)
    expect(parent.playInValue).toBe(10)
  })
  ```

**E2E Tests:**
- Framework: Not used
- Current testing strategy focuses on unit + integration patterns

## Common Patterns

**Async Testing:**
Use `settle()` helper to wait for async state changes:

```typescript
it('plays', async () => {
  const sound = createSound()
  expect(sound.isPlaying).toBe(false)
  sound.play()
  expect(await settle(() => sound.isPlaying)).toBe(true)
})
```

The `settle()` helper:
- Accepts a value function that returns the value to test
- Waits (default 2ms) for state to propagate
- Returns promise that resolves to the computed value

**Error Testing:**
Tests verify that appropriate properties are set, but explicit error throws are not extensively tested. Example of what IS tested:

```typescript
// From musical-identity.test.ts - testing property validation
it('setting frequency properly calculates other props', () => {
  expect(5)  // Assert we make 5 assertions

  const note = new Note({ frequency: 440 })

  assert.strictEqual(note.identifier, 'A4')
  assert.strictEqual(note.name, 'A')
  assert.strictEqual(note.octave, '4')
  assert.strictEqual(note.letter, 'A')
  assert.strictEqual(note.accidental, '')
})
```

**State Verification:**
Heavily used to test side effects:

```typescript
it(`remembers beats' 'active' state when numBeats changes`, () => {
  const beatTrack = createBeatTrack()
  let [beat1, beat2, beat3] = beatTrack.beats

  beat1.active = true
  beat3.active = true

  beatTrack.numBeats = 6

  beat1 = beatTrack.beats[0]
  beat2 = beatTrack.beats[1]
  beat3 = beatTrack.beats[2]

  expect(beat1.active).toBe(true)
  expect(beat2.active).toBe(false)
  expect(beat3.active).toBe(true)
})
```

## Test Assertion Styles

**Vitest expect():**
```typescript
expect(Sound).toBeTruthy()
expect(sound.isPlaying).toBe(false)
expect(beat1.active).toBe(true)
```

**Vitest assert():**
```typescript
assert.ok(sortNotes)
assert.strictEqual(note.identifier, 'A4')
assert.deepEqual(result, [A0, Bb0, B0])
```

**Mixed Usage:**
No strict convention enforced; both are acceptable. Common to see both in the same file or even same test suite.

## Test Naming

**Convention:**
- Simple, descriptive English sentences
- Start with verb when possible: "can be created", "plays", "stops"
- Include the behavior being tested: "remembers beats' 'active' state when numBeats changes"
- Quote syntax for special cases: `it('identifier is formatted properly')`

**Examples:**
- `it('exists')` - library/class exists
- `it('can be created')` - instantiation works
- `it('plays')` - method invocation works
- `it('sets isPlaying to true when played...')` - complex behavior
- `it('noteSort compares two letters correctly')` - comparison logic

---

*Testing analysis: 2026-01-31*
