# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- kebab-case for file names: `base-sound.ts`, `beat-track.ts`, `sound-controller.ts`
- Test files append `.test` before extension: `beat.test.ts`, `array-methods.test.ts`
- Exception: Factory/helper files use natural names: `note-factory.ts`

**Classes:**
- PascalCase: `Sound`, `Beat`, `Oscillator`, `BeatTrack`, `BaseSound`
- Abstract classes: `BaseSound`, `BaseParamController`
- Mixins: Function names in camelCase that return class: `MusicallyAware(Base)`
- Controller classes suffix with `Controller`: `SoundController`, `OscillatorController`, `BaseParamController`

**Functions:**
- camelCase for both exported and private functions: `createSound()`, `playIn()`, `markPlaying()`, `wireConnections()`
- Factory functions prefix with `create`: `createSound()`, `createOscillator()`, `createTimeObject()`
- Getters/setters use standard property names: `get duration()`, `set frequency(value)`

**Variables:**
- camelCase for local variables: `audioContext`, `parentPlayIn`, `msOffset`, `audioBuffer`
- Private properties prefix with underscore: `_isPlaying`, `_update()`
- Constants in UPPER_SNAKE_CASE when appropriate: `FILTERS` (array of filter type strings)

**Types:**
- PascalCase for interfaces: `BeatOptions`, `BaseSoundOptions`, `ParamController`, `Playable`
- PascalCase for type aliases: `TimeObject`, `OscillatorType`, `NoteLetter`, `Accidental`
- Type predicates/guards in camelCase: `isPlaying` (property)

**Path Aliases:**
Defined in `tsconfig.json` and used consistently throughout:
- `@/*` → `src/*` (root imports)
- `@utils/*` → `src/utils/*` (utilities)
- `@controllers/*` → `src/controllers/*` (controllers)
- `@interfaces/*` → `src/interfaces/*` (interfaces)
- `@test/*` → `src/test/*` (test helpers)

Usage example from `src/beat.ts`:
```typescript
import audioContextAwareTimeout from '@utils/timeout'
import { Beat } from '@/beat'
import { MusicallyAware } from '@/musical-identity'
```

## Code Style

**Formatting:**
- ESLint with `@antfu/eslint-config` (v2.27.3)
- Enforced via `eslint.config.js` with type set to 'lib'
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix

**Linting:**
- Strict TypeScript mode enabled in `tsconfig.json`:
  - `"strict": true`
  - `"strictNullChecks": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
- Rule exclusions documented with `// eslint-disable-next-line`: See `src/musical-identity.ts` line 43

**Indentation & Line Length:**
- Standard 2-space indentation (inferred from code)
- No explicit line length limit observed, but prefer readability

## Import Organization

**Order:**
1. Type imports from external packages: `import type { ... } from 'package'`
2. Value imports from external packages: `import { ... } from 'package'`
3. Type imports from local modules: `import type { ... } from './path'`
4. Value imports from local modules: `import { ... } from './path'`
5. Path alias imports (mixed type/value): `import { ... } from '@/path'`

**Example from `src/oscillator.ts`:**
```typescript
// Type import from controllers
import type { ControlType, RampType } from '@controllers/base-param-controller'

// Type import from utils
import type { TimeObject } from '@utils/create-time-object'
// Type and value imports from local
import type { BaseSoundOptions } from './base-sound'

// Value imports from utils
import createTimeObject from '@utils/create-time-object'

import { get } from '@utils/prop-access'

import { BaseSound } from './base-sound'
// Value imports from controllers
import { OscillatorController } from './controllers/oscillator-controller'
```

**Path Aliases:**
- Prefer path aliases over relative paths for cross-directory imports
- Use relative imports (`./*`) only within same directory or closely related modules
- Exceptions: Controller imports sometimes use relative paths from class files

## Error Handling

**Patterns:**
- Throw `Error` objects with descriptive messages for validation failures
- Use `throw new Error()` for control type validation: `throw new Error('Control type ... not supported')`
- Validation occurs in controller setter methods and parameter update methods

**Example from `src/controllers/base-param-controller.ts`:**
```typescript
case 'detune':
  if (!this.audioSource.detune)
    throw new Error('Audio source does not support detune')
  this.audioSourceNode.detune.value = value
  break
```

**Null/Undefined Handling:**
- Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate
- Check for `null` explicitly when needed: `if (buffer === null) return createTimeObject(0, 0, 0)`
- Type guards with strict equality: `if (value === currentTime)`

## Logging

**Framework:** `console` object (native browser API)

**Patterns:**
- Warning logs in mixin for configuration issues: `const { warn } = console` in `src/musical-identity.ts`
- Usage: `warn('ez-web-audio: upon instantiation, multiple note identifiers were provided...')`
- Reserved for user-facing library warnings, not debug logging

**When to Log:**
- Configuration conflicts or validation warnings to library users
- Not used for internal debug/trace logging in current codebase

## Comments

**When to Comment:**
- Class-level JSDoc for public API: See `src/beat.ts` lines 3-24
- Method-level JSDoc for complex public methods: See `src/base-sound.ts` lines 188-215
- Inline comments for non-obvious implementation details: See `src/sound.ts` line 44 (`// always start with the audio source`)

**JSDoc/TSDoc:**
- Full JSDoc blocks for public classes and methods
- Include `@param`, `@method`, `@property` tags
- Link to related classes with `{{#crossLink}}` format (legacy docs format)
- Example from `src/beat.ts`:
```typescript
/**
 * @property active
 *
 * If `active` is `true`, all methods of play will cause this instance to play.
 * If `active` is `false`, the `playIfActive()` and `ifActivePlayIn()`
 * methods will treat this instance as a rest (a timed period of silence).
 */
public active = false
```

- Private methods and implementation details get minimal comments
- Assumptions and workarounds documented: See `src/oscillator.ts` line 53-54

## Function Design

**Size:**
- Most functions 20-50 lines
- Complex orchestration functions can reach 100+ lines (e.g., `playAt()` in `src/base-sound.ts`)
- Prefer splitting setup and execution logic (see `setup()` vs `wireConnections()`)

**Parameters:**
- Constructor options pattern: Accept an `opts` parameter of type `SoundOptions` / `BeatOptions`
- Dependency injection via constructor: `constructor(audioContext: AudioContext, opts?: Options)`
- Callback functions for parent communication: `playIn: (time: number) => void`

**Return Values:**
- Void for mutation operations: `play(): Promise<void>`
- Typed objects for data return: `duration: TimeObject`
- Builder/fluent patterns return `this` for chaining: `changeGainTo(value: number): this`
- Computed getters for derived properties: `get frequency(): number`

**Example Fluent Pattern from `src/base-sound.ts`:**
```typescript
public changePanTo(value: number): this {
  this.controller.update('pan').to(value).from('ratio')
  return this
}
```

## Module Design

**Exports:**
- Default export rarely used; prefer named exports
- Public API surface exports at `src/index.ts` via named exports
- Example: `export { Sound, Oscillator, Track, MusicallyAware }`
- Type exports separate: `export type { Connectable, Playable, OscillatorOpts }`

**Barrel Files:**
- Not extensively used; some in `src/test/helpers/index.ts`
- Minimal re-exports to keep dependency clarity

**Private vs Public:**
- Use private/protected modifiers: `private parentPlayIn`, `protected controller`
- Abstract methods for subclass implementation: `protected abstract setup(): void`
- Public methods for API surface

## Async/Await

**Patterns:**
- Async functions return `Promise<T>`: `async play(): Promise<void>`
- Proper await of async operations: `await audioContext.resume()`
- Schedule work in setTimeout instead of blocking: See `this.setTimeout()` pattern
- Async initialization required before audio operations: `await initAudio()`

## Class Hierarchy Patterns

**Inheritance:**
- Mixins for cross-cutting concerns: `class SampledNote extends MusicallyAware(Sound) {}`
- Abstract base classes define interface: `abstract class BaseSound`
- Controllers composed into sound classes: `protected controller: ParamController`

**Mixin Implementation:**
```typescript
export function MusicallyAware<TBase extends Constructor>(Base: TBase) {
  return class MusicalIdentity extends Base implements IMusicallyAware {
    // implementation
  }
}
```

---

*Convention analysis: 2026-01-31*
