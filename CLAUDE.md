# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EZ Web Audio is a TypeScript library that wraps the Web Audio API with a simpler, more intuitive interface. It's a rewrite of [Ember Audio](https://sethbrasile.github.io/ember-audio) for vanilla TypeScript with no dependencies.

## Commands

This is a pnpm workspace. The library lives in `packages/core` (npm name `ez-web-audio`); `packages/vue` (`@ez-web-audio/vue`) and `packages/react` (`@ez-web-audio/react`) hold framework bindings. The root package is a private orchestration shell for docs (VitePress at `docs/`), E2E, and lint tooling. All packages are version-locked at the same version.

```bash
# Development (runs docs site with hot reload)
pnpm dev

# Build library only
pnpm build:lib          # = pnpm --filter ez-web-audio build

# Build everything (lib + docs app + typedoc)
pnpm build

# Run all workspace tests (Vitest with happy-dom)
pnpm test

# Run a single core test file (watch: pnpm test:watch)
pnpm --filter ez-web-audio test src/beat.test.ts

# Type checking (recursive)
pnpm typecheck

# Linting (repo-wide from root)
pnpm lint
pnpm lint:fix

# E2E (Playwright, starts docs dev server itself)
pnpm test:e2e
```

## Architecture

### Core Class Hierarchy

```
BaseSound (abstract)
├── Sound        - One-shot audio playback from AudioBuffer
│   └── Track    - Music track with position tracking, pause/resume, seek
├── Oscillator   - Synthesizer with filters (highpass, lowpass, etc.)
└── SampledNote  - Note with musical identity (via MusicallyAware mixin)

Sampler          - Round-robin playback of multiple Sounds
└── BeatTrack    - Drum machine lane with Beat instances for rhythmic patterns
```

### Key Design Patterns

**Mixin Pattern (`MusicallyAware`)**: Adds musical identity (letter, accidental, octave, frequency) to any class. Used via `class SampledNote extends MusicallyAware(Sound)`.

**Controller Pattern**: Each sound type has a controller (`SoundController`, `OscillatorController`) that manages audio parameters (gain, pan, frequency, detune) and schedules value changes.

**Fluent API for Parameter Control**:
```typescript
// Immediate update
sound.update('gain').to(0.5).as('ratio')

// Schedule on next play
sound.onPlaySet('gain').to(0).endingAt(1, 'exponential') // fade in over 1 sec
sound.onPlayRamp('gain').from(0).to(1).in(0.5) // ramp 0→1 in 0.5 sec
```

**Connection Chain**: Audio flows through: `audioSourceNode → [filters] → [connections] → gainNode → pannerNode → destination`. Custom effects can be added via the `connections` array.

### Module Structure

Library source lives in `packages/core/src/`:

- `packages/core/src/index.ts` - Public API with factory functions (`createSound`, `createOscillator`, `createBeatTrack`, etc.)
- `packages/core/src/interfaces/` - `Playable` (play/stop methods) and `Connectable` (audio routing)
- `packages/core/src/controllers/` - Parameter management with scheduled value changes
- `packages/core/src/utils/` - Frequency map, time formatting, base64 decoding for sound fonts

Docs demo components live in `docs/.vitepress/theme/components/` and import the library by package name (`ez-web-audio`, resolved via `workspace:*`).

### Path Aliases

Defined in `packages/core/tsconfig.json` (core-internal only; docs/e2e don't use them):
- `@/*` → `src/*`
- `@utils/*` → `src/utils/*`
- `@controllers/*` → `src/controllers/*`
- `@interfaces/*` → `src/interfaces/*`

### Testing

Tests use Vitest with happy-dom environment and `standardized-audio-context-mock` for mocking AudioContext. Test files are co-located with source files (e.g., `beat.test.ts` next to `beat.ts`).

### Important Concepts

**AudioContext Initialization**: `initAudio()` must be called in response to user interaction (browser requirement). The library handles iOS audio workarounds automatically.

**Beat/BeatTrack**: A `Beat` represents a single rhythmic position that can be active (plays sound) or inactive (rest). `BeatTrack` manages an array of beats for drum machine patterns.

**TimeObject**: Duration and position are returned as `{ raw: seconds, string: 'MM:SS', pojo: { minutes, seconds } }`.

### Demo/Example Components

**No loading buttons**: Demo components must NOT have a separate "Load" or "Init" button that hides the example until clicked. The user's first interaction (e.g. clicking "Play") is what initializes the AudioContext and loads audio. Examples should render fully visible immediately and lazily initialize audio on first user interaction.
