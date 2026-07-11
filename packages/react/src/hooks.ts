import type {
  AnalyzerOptions,
  AudioInput,
  BeatTrackOptions,
  GrainPlayerOptions,
  LayeredSoundOptions,
  LFOOptions,
  Oscillator,
  OscillatorOptions,
  PolySynthOptions,
  SamplerOptions,
  SequenceOptions,
  Sound,
  SpriteManifest,
  Transport,
  TransportOptions,
} from 'ez-web-audio'
import {
  createAnalyzer,
  createBeatTrack,
  createFont,
  createGrainPlayer,
  createLayeredSound,
  createLFO,
  createOscillator,
  createPolySynth,
  createSampler,
  createSequence,
  createSound,
  createSprite,
  createTrack,
  createTransport,
  createWhiteNoise,
} from 'ez-web-audio'
import { createFactoryHook } from './create-factory-hook'

// Escape hatch: for components that create MANY concurrent/ephemeral
// instances (e.g. one oscillator per held key, per-hit drum voices), call the
// raw `createX()` factory directly and register each instance with
// `useCleanup().register(inst)`, rather than a factory hook — the hooks
// here model a single lifecycle-managed instance.

export const useSound = createFactoryHook(
  async (input: AudioInput) => createSound(input),
)

export const useTrack = createFactoryHook(
  async (input: AudioInput) => createTrack(input),
)

export const useOscillator = createFactoryHook(
  async (options?: OscillatorOptions) => createOscillator(options),
)

export const useSampler = createFactoryHook(
  async (inputs: AudioInput[], opts?: SamplerOptions) => createSampler(inputs, opts),
)

export const usePolySynth = createFactoryHook(
  async (options?: PolySynthOptions) => createPolySynth(options),
)

export const useGrainPlayer = createFactoryHook(
  async (buffer: AudioBuffer, options?: GrainPlayerOptions) => createGrainPlayer(buffer, options),
)

export const useLFO = createFactoryHook(
  async (options?: LFOOptions) => createLFO(options),
)

export const useTransport = createFactoryHook(
  async (options: TransportOptions) => createTransport(options),
)

/**
 * Unlike the Vue composable (which defaults `wrapWith` to `reactive()`),
 * this hook does NOT wrap `Beat` objects in anything — React has no
 * built-in equivalent of Vue's `reactive()` proxy that would let mutations
 * on a `Beat` instance (`active`, `isPlaying`, `currentTimeIsPlaying`, ...)
 * automatically trigger a re-render. `beatTrack.beats` stays an array of
 * plain `Beat` instances; mutating one directly will NOT update your UI.
 *
 * To reflect BeatTrack playback state in React, either:
 * - Poll `beatTrack.beats` on a `requestAnimationFrame` loop and copy the
 *   fields you care about into `useState`, or
 * - Subscribe to the library's `beat` event and call `setState` from the
 *   listener.
 *
 * See the framework integration guide for worked examples of both patterns.
 */
export const useBeatTrack = createFactoryHook(
  async (inputs: AudioInput[], opts?: BeatTrackOptions) => createBeatTrack(inputs, opts),
)

export const useWhiteNoise = createFactoryHook(
  async () => createWhiteNoise(),
)

export const useLayeredSound = createFactoryHook(
  async (layers: (Sound | Oscillator)[], opts?: LayeredSoundOptions) => createLayeredSound(layers, opts),
)

export const useSprite = createFactoryHook(
  async (audioUrl: string, manifest: SpriteManifest) => createSprite(audioUrl, manifest),
)

export const useFont = createFactoryHook(
  async (url: string) => createFont(url),
)

export const useAnalyzer = createFactoryHook(
  async (options?: AnalyzerOptions) => createAnalyzer(options),
)

export const useSequence = createFactoryHook(
  async (transport: Transport, options: SequenceOptions) => createSequence(transport, options),
)
