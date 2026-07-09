import type {
  AudioInput,
  Beat,
  BeatTrackOptions,
  GrainPlayerOptions,
  LFOOptions,
  OscillatorOptions,
  PolySynthOptions,
  SamplerOptions,
  TransportOptions,
} from 'ez-web-audio'
import {
  createBeatTrack,
  createGrainPlayer,
  createLFO,
  createOscillator,
  createPolySynth,
  createSampler,
  createSound,
  createTrack,
  createTransport,
} from 'ez-web-audio'
import { reactive } from 'vue'
import { createFactoryComposable } from './create-factory-composable'

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
