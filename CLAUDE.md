# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EZ Web Audio is a TypeScript library that wraps the Web Audio API with a simpler, more intuitive interface. It's a rewrite of [Ember Audio](https://sethbrasile.github.io/ember-audio) for vanilla TypeScript with no dependencies.

## Commands

```bash
# Development (runs docs site with hot reload)
pnpm dev

# Build library only
pnpm build:lib

# Build everything (lib + docs app + typedoc)
pnpm build

# Run tests (Vitest with happy-dom)
pnpm test

# Run a single test file
pnpm test src/beat.test.ts

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
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

- `src/index.ts` - Public API with factory functions (`createSound`, `createOscillator`, `createBeatTrack`, etc.)
- `src/interfaces/` - `Playable` (play/stop methods) and `Connectable` (audio routing)
- `src/controllers/` - Parameter management with scheduled value changes
- `src/utils/` - Frequency map, time formatting, base64 decoding for sound fonts

### Path Aliases

Defined in `tsconfig.json`:
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
