import type {
  AnalyzerOptions,
  AudioInput,
  Beat,
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
import { reactive } from 'vue'
import { createFactoryComposable } from './create-factory-composable'

// Escape hatch: for components that create MANY concurrent/ephemeral
// instances (e.g. one oscillator per held key, per-hit drum voices), call the
// raw `createX()` factory directly and register each instance with
// `useCleanup().register(inst)`, rather than a factory composable — the
// composables here model a single lifecycle-managed instance.

export const useSound = createFactoryComposable(
  async (input: AudioInput) => createSound(input),
)

export const useTrack = createFactoryComposable(
  async (input: AudioInput) => createTrack(input),
)

export const useOscillator = createFactoryComposable(
  async (options?: OscillatorOptions) => createOscillator(options),
)

export const useSampler = createFactoryComposable(
  async (inputs: AudioInput[], opts?: SamplerOptions) => createSampler(inputs, opts),
)

export const usePolySynth = createFactoryComposable(
  async (options?: PolySynthOptions) => createPolySynth(options),
)

export const useGrainPlayer = createFactoryComposable(
  async (buffer: AudioBuffer, options?: GrainPlayerOptions) => createGrainPlayer(buffer, options),
)

export const useLFO = createFactoryComposable(
  async (options?: LFOOptions) => createLFO(options),
)

export const useTransport = createFactoryComposable(
  async (options: TransportOptions) => createTransport(options),
)

// `reactive()`'s generic signature returns `Reactive<T>`, which — being a mapped
// type — cannot preserve the private fields of a class instance like `Beat`. The
// Proxy it returns behaves exactly like a `Beat` at runtime, so the cast is safe;
// it only routes around a TS structural-typing limitation with private members.
const reactiveBeat = reactive as unknown as (beat: Beat) => Beat

export const useBeatTrack = createFactoryComposable(
  async (inputs: AudioInput[], opts?: BeatTrackOptions) =>
    createBeatTrack(inputs, { wrapWith: reactiveBeat, ...opts }),
)

export const useWhiteNoise = createFactoryComposable(
  async () => createWhiteNoise(),
)

export const useLayeredSound = createFactoryComposable(
  async (layers: (Sound | Oscillator)[], opts?: LayeredSoundOptions) => createLayeredSound(layers, opts),
)

export const useSprite = createFactoryComposable(
  async (audioUrl: string, manifest: SpriteManifest) => createSprite(audioUrl, manifest),
)

export const useFont = createFactoryComposable(
  async (url: string) => createFont(url),
)

export const useAnalyzer = createFactoryComposable(
  async (options?: AnalyzerOptions) => createAnalyzer(options),
)

export const useSequence = createFactoryComposable(
  async (transport: Transport, options: SequenceOptions) => createSequence(transport, options),
)
