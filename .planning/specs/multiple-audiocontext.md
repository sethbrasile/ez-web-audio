# Spec: Multiple AudioContext Support

## Goal

Enable power users to use multiple AudioContexts by adding optional `audioContext` first-param overloads to all factory functions, following the convention already established by the effect factories.

## Motivation

The library uses a singleton AudioContext by default, which is the right default for 95% of users. But advanced use cases exist:
- Separate output destinations (`new AudioContext({ sinkId })`) for monitoring vs. main mix
- Separate sample rates (44.1kHz playback, 48kHz recording)
- Context isolation (closing one doesn't orphan everything)

The core classes already accept AudioContext in their constructors. The effect factories already have the overload pattern. The factory functions in `index.ts` are the only gap.

## Deliverables

### 1. Add AudioContext Overloads to Factory Functions

Apply the existing effect factory pattern to all factory functions that currently use `getOrCreateAudioContext()` internally.

**Pattern** (already used by `createFilter`, `createDelay`, `createDistortion`, etc.):
```typescript
// Existing (unchanged)
export async function createSound(input: AudioInput): Promise<Sound>
// New overload
export async function createSound(audioContext: AudioContext, input: AudioInput): Promise<Sound>
// Implementation detects first arg type
```

**Functions to update**:
- `createSound`
- `createSounds`
- `createTrack`
- `createTracks`
- `createOscillator`
- `createPolySynth`
- `createGrainPlayer`
- `createBeatTrack`
- `createSprite`
- `createNoise` / `createWhiteNoise`
- `createFont`
- `createLayeredSound`
- `createTransport`
- `createSampler`
- `playTogether`

### 2. Documentation

Add an "Advanced: Multiple AudioContexts" section to the guide covering:
- Why you'd want multiple contexts (output devices, sample rates, isolation)
- Browser limitations (Chrome caps ~6 contexts)
- The constraint: sounds and effects must share a context to connect
- Full example showing the pattern
- When NOT to use multiple contexts (most apps should use the singleton)

### 3. Tests

Add tests verifying:
- Factory functions work with explicit AudioContext
- Factory functions still work without (singleton default, no regression)
- Sounds created with different contexts can't accidentally cross-connect (this is a Web Audio constraint, but worth documenting in a test)

## Technical Notes

- Zero breaking changes — all existing code continues to work identically
- The detection pattern is simple: `if (firstArg instanceof AudioContext)`
- For `createBeatTrack`, the AudioContext is used internally but the public API takes Sound arrays — the sounds themselves carry their context, so this one may not need the overload. Evaluate during implementation.
- `initAudio()` and `getAudioContext()` continue to work with the singleton — they're not affected.
