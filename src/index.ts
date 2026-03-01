import type { TimeObject } from '@utils/create-time-object'
import type { AnalyzerOptions } from './analyzer'
import type { BeatTrackOptions } from './beat-track'
import type { ControlType, ControlTypeMap, OscillatorControlType, RatioType, SeekType, SoundControlType } from './controllers/base-param-controller'
import type { DebugMessage } from './debug'
import type { AlgorithmicReverbOptions, CompressorOptions, ConvolutionReverbOptions, DelayOptions, DistortionOptions, DistortionType, Effect, EQOptions, ExternalEffect, FilterEffectOptions, FilterType } from './effects'
import type { EnvelopeOptions } from './envelope'
import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import type { LayeredSoundOptions } from './layered-sound'
import type { LFOConnectOptions, LFOOptions, LFOWaveform } from './lfo'
import type { OscillatorFilterOptions, OscillatorOptions } from './oscillator'
import type { PlayOptions, PolySynthOptions, StealStrategy } from './poly-synth'
import type { SequenceCallback, SequenceOptions } from './sequence'
import type { SpriteDefinition, SpriteManifest, SpritePlayOptions } from './sprite'
import type { TransportOptions, TransportPosition } from './transport'
import type { CrossfadeOptions } from './utils/crossfade'
import type { MusicalTimeNotation } from './utils/musical-time'
import type { Accidental, NoteLetter, Octave } from '@/musical-identity'
import type { SamplerOptions } from '@/sampler'
import { OscillatorController } from '@controllers/oscillator-controller'
import { SoundController } from '@controllers/sound-controller'
import { Beat } from '@/beat'
import { MusicallyAware } from '@/musical-identity'
import { Note } from '@/note'
import { Oscillator } from '@/oscillator'
import { Sampler } from '@/sampler'
import { Sound } from '@/sound'
import { Track } from '@/track'
import { Analyzer } from './analyzer'
import { getOrCreateAudioContext, iosWorkaround, markIosWorkaroundPerformed, unlockAudioContext } from './audio-context'
import { BeatTrack } from './beat-track'
import { setDebugHandler, setDebugMode } from './debug'
import {
  BaseEffect,
  CompressorEffect,
  createCompressor,
  createDelay,
  createDistortion,
  createEffect,
  createEQ,
  createFilterEffect,
  createGainEffect,
  createReverb,
  DelayEffect,
  DistortionEffect,
  EffectWrapper,
  EQEffect,
  FilterEffect,
  GainEffect,
  ReverbEffect,
  wrapEffect,
} from './effects'
import { Envelope } from './envelope'
import { AudioContextError, AudioError, AudioLoadError, InvalidNoteError } from './errors'
import { Font } from './font'
import { LayeredSound } from './layered-sound'
import { LFO } from './lfo'
import { PolySynth, VoiceHandle } from './poly-synth'
import { clearPreloadCache, evictIfNeeded, getFromCache, hasInCache, isPreloaded, preload, setInCache, setPreloadCacheLimit } from './preload'
import { SampledNote } from './sampled-note'
import { Sequence } from './sequence'
import { AudioSprite } from './sprite'
import { formatPosition, Transport } from './transport'
import { pauseAll, playAll, stopAll } from './utils/collections'
import { crossfade } from './utils/crossfade'
import { mungeSoundFont } from './utils/decode-base64'
import frequencyMap from './utils/frequency-map'
import { isMusicalTimeNotation, musicalTimeToBeats, parseMusicalTime } from './utils/musical-time'
import { createBrownNoiseBuffer, createPinkNoiseBuffer } from './utils/noise'
import { createNoteObjectsForFont, extractDecodedKeyValuePairs } from './utils/note-methods'
import { playTogether } from './utils/play-together'
import audioContextAwareTimeout from './utils/timeout'
import unmuteIosAudio from './utils/unmute'

/** Dispose handle returned by unmute.js — stored so listeners can be cleaned up. @internal */
let _unmuteDispose: (() => void) | null = null

/** Clean up global iOS mute workaround listeners. @internal */
function disposeUnmute(): void {
  _unmuteDispose?.()
  _unmuteDispose = null
}

/**
 * Optionally initialize the audio system explicitly.
 *
 * The library creates the AudioContext lazily on first use, so calling this
 * function is not required. Use it when you need explicit control over
 * initialization timing (iOS mute workaround, pre-warming the context).
 *
 * Note: If called explicitly, it must be in response to a user interaction
 * (click, tap, keypress) due to browser autoplay policies.
 *
 * @param useIosMuteWorkaround - Whether to apply iOS mute switch workaround (default: true)
 * @throws {AudioContextError} If AudioContext cannot be created or is interrupted
 *
 * @example
 * ```typescript
 * import { initAudio, createSound } from 'ez-web-audio'
 *
 * // Optional explicit initialization
 * button.addEventListener('click', async () => {
 *   await initAudio() // Optional — for explicit control
 *   const sound = await createSound('click.mp3')
 *   sound.play()
 * })
 *
 * // Or just use factory functions directly (AudioContext created automatically)
 * button.addEventListener('click', async () => {
 *   const sound = await createSound('click.mp3')
 *   sound.play()
 * })
 * ```
 */
export async function initAudio(useIosMuteWorkaround = true): Promise<void> {
  const audioContext = getOrCreateAudioContext()

  // Handle interrupted state (iOS backgrounded)
  if (audioContext.state === 'interrupted' as AudioContextState) {
    throw new AudioContextError(
      'AudioContext interrupted (iOS backgrounded). Resume playback after returning to foreground.',
      audioContext.state,
    )
  }

  // only run this workaround code once
  if (useIosMuteWorkaround && !iosWorkaround.performed) {
    disposeUnmute() // Clean up any previous listeners before re-registering
    const result = unmuteIosAudio(audioContext)
    if (result && typeof result.dispose === 'function') {
      _unmuteDispose = result.dispose
    }
    markIosWorkaroundPerformed()
  }
  // unlockAudioContext handles Safari/iOS where AudioContext starts suspended and requires
  // a user gesture to resume. Without this, the first synth note may hang because the context never resumes.
  await unlockAudioContext(audioContext)
}

/**
 * Get the shared AudioContext instance, creating it lazily if it doesn't exist.
 *
 * The library uses a single AudioContext instance for all audio operations.
 * This function creates the context automatically on first call.
 *
 * @returns The shared AudioContext instance
 *
 * @example
 * ```typescript
 * import { getAudioContext } from 'ez-web-audio'
 *
 * // Get the AudioContext for custom Web Audio operations
 * const ctx = await getAudioContext()
 * const oscillator = ctx.createOscillator()
 * ```
 */
export async function getAudioContext(): Promise<AudioContext> {
  await initAudio()
  return getOrCreateAudioContext()
}

/**
 * Create an array of Note objects from a frequency map.
 *
 * Notes represent musical pitches with letter, accidental, octave, and frequency.
 * If no frequency map is provided, uses the default 12-TET frequency map.
 *
 * @param json - Optional frequency map object (default: built-in frequencyMap)
 * @returns Array of Note objects
 *
 * @example
 * ```typescript
 * import { createNotes } from 'ez-web-audio'
 *
 * // Create notes from default frequency map
 * const notes = createNotes()
 * const a4 = notes.find(n => n.frequency === 440)
 * ```
 */
export function createNotes(json?: Record<string, number>): Note[] {
  const notes = []
  if (!json) {
    json = frequencyMap
  }

  for (const key in json) {
    const note = json[key]
    const noteObject = new Note()
    noteObject.frequency = note

    // Parse standard note names like "A4", "Bb3", "C#5", "Db2"
    const match = key.match(/^([A-G])(b|#)?(\d)$/)
    if (match) {
      noteObject.letter = match[1] as NoteLetter
      noteObject.accidental = (match[2] || '') as Accidental
      noteObject.octave = match[3] as Octave
    }

    notes.push(noteObject)
  }
  return notes
}

/**
 * Union type for audio input sources accepted by factory functions.
 *
 * - `string`: URL to an audio file (fetched via network)
 * - `ArrayBuffer`: Raw decoded audio data (decoded directly)
 * - `Blob`: Binary audio data (e.g., from File API or fetch response)
 * - `File`: File selected via `<input type="file">` or drag-and-drop
 *
 * @example
 * ```typescript
 * import type { AudioInput } from 'ez-web-audio'
 *
 * async function loadAudio(input: AudioInput) {
 *   return createSound(input)
 * }
 * ```
 */
export type AudioInput = string | ArrayBuffer | Blob | File

/**
 * Load an ArrayBuffer (or Blob/File converted to ArrayBuffer) into a Sound or Track.
 * @private
 */
async function loadFromBuffer(
  buffer: ArrayBuffer,
  type: 'sound' | 'track',
): Promise<Sound | Track> {
  await initAudio()
  const audioContext = getOrCreateAudioContext()
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await audioContext.decodeAudioData(buffer)
  }
  catch {
    throw new AudioLoadError(
      'Failed to decode audio. ArrayBuffer may be corrupted or unsupported format.',
      '[ArrayBuffer]',
    )
  }
  return createSoundFor(type, audioBuffer)
}

/**
 * Resolve an AudioInput to a Sound instance.
 * Handles string URLs via load() and ArrayBuffer/Blob/File via loadFromBuffer().
 * @private
 */
async function resolveSound(input: AudioInput): Promise<Sound> {
  if (typeof input === 'string') {
    return load(input, 'sound') as Promise<Sound>
  }
  if (input instanceof ArrayBuffer) {
    return loadFromBuffer(input, 'sound') as Promise<Sound>
  }
  // Blob or File
  const buffer = await input.arrayBuffer()
  return loadFromBuffer(buffer, 'sound') as Promise<Sound>
}

/**
 * Create a Sound from an audio file URL, ArrayBuffer, Blob, or File.
 *
 * Sound is for one-shot audio playback (sound effects, UI sounds). Each call to
 * `.play()` creates a new audio source, allowing overlapping playback.
 * Use {@link createTrack} instead for music with pause/resume/seek.
 *
 * @param input - URL string, ArrayBuffer, Blob, or File containing audio data
 * @returns Promise resolving to a Sound instance
 * @throws {AudioLoadError} If the audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createSound } from 'ez-web-audio'
 *
 * // From URL
 * const click = await createSound('click.mp3')
 * click.play()
 *
 * // From ArrayBuffer (e.g., from fetch or File API)
 * const response = await fetch('click.mp3')
 * const buffer = await response.arrayBuffer()
 * const click2 = await createSound(buffer)
 *
 * // From File (e.g., drag-and-drop)
 * input.addEventListener('change', async (e) => {
 *   const file = e.target.files[0]
 *   const sound = await createSound(file)
 *   sound.play()
 * })
 * ```
 */
export async function createSound(input: AudioInput): Promise<Sound> {
  return resolveSound(input)
}

/**
 * Create a Track from an audio file URL, ArrayBuffer, Blob, or File.
 *
 * Track extends Sound with position tracking, pause/resume, and seeking.
 * Use Track for music or longer audio where users need playback control.
 * Unlike Sound, only one playback can be active at a time.
 *
 * @param input - URL string, ArrayBuffer, Blob, or File containing audio data
 * @returns Promise resolving to a Track instance
 * @throws {AudioLoadError} If the audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createTrack } from 'ez-web-audio'
 *
 * const song = await createTrack('song.mp3')
 * song.play()
 *
 * // Pause and resume
 * song.pause()
 * song.resume()
 *
 * // From ArrayBuffer
 * const buffer = await fetch('song.mp3').then(r => r.arrayBuffer())
 * const song2 = await createTrack(buffer)
 *
 * // Get current position
 * console.log(song.position.string) // '0:30'
 * ```
 */
export async function createTrack(input: AudioInput): Promise<Track> {
  if (typeof input === 'string') {
    return load(input, 'track') as Promise<Track>
  }
  if (input instanceof ArrayBuffer) {
    return loadFromBuffer(input, 'track') as Promise<Track>
  }
  // Blob or File
  const buffer = await input.arrayBuffer()
  return loadFromBuffer(buffer, 'track') as Promise<Track>
}

/**
 * Load multiple sounds from an array of URLs with optional progress tracking.
 *
 * Loads all sounds in parallel for speed. Progress callback fires after each
 * sound finishes loading, providing loaded count, total count, and the URL
 * that just completed.
 *
 * @param urls - Array of audio file URLs to load
 * @param onProgress - Optional callback fired after each sound loads
 * @returns Promise resolving to array of Sound instances
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createSounds } from 'ez-web-audio'
 *
 * const sounds = await createSounds(
 *   ['click.mp3', 'whoosh.mp3', 'ding.mp3'],
 *   (loaded, total, url) => console.log(`Loaded ${loaded}/${total}: ${url}`)
 * )
 * ```
 */
export async function createSounds(
  urls: string[],
  onProgress?: (loaded: number, total: number, url: string) => void,
): Promise<Sound[]> {
  const total = urls.length
  let loaded = 0

  const promises = urls.map(async (url) => {
    const sound = await load(url, 'sound') as Sound
    loaded++
    onProgress?.(loaded, total, url)
    return sound
  })

  return Promise.all(promises)
}

/**
 * Load multiple tracks from an array of URLs with optional progress tracking.
 *
 * Mirrors {@link createSounds} but returns Track instances. Loads all tracks
 * in parallel for speed. Progress callback fires after each track finishes loading.
 *
 * @param urls - Array of audio file URLs to load
 * @param onProgress - Optional callback fired after each track loads
 * @returns Promise resolving to array of Track instances
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createTracks } from 'ez-web-audio'
 *
 * const tracks = await createTracks(
 *   ['intro.mp3', 'verse.mp3', 'chorus.mp3'],
 *   (loaded, total, url) => console.log(`Loaded ${loaded}/${total}: ${url}`)
 * )
 * ```
 */
export async function createTracks(
  urls: string[],
  onProgress?: (loaded: number, total: number, url: string) => void,
): Promise<Track[]> {
  const total = urls.length
  let loaded = 0

  const promises = urls.map(async (url) => {
    const track = await load(url, 'track') as Track
    loaded++
    onProgress?.(loaded, total, url)
    return track
  })

  return Promise.all(promises)
}

/**
 * Create a BeatTrack for drum machine-style rhythmic patterns.
 *
 * A BeatTrack manages a sequence of Beats, where each Beat can be active (plays sound)
 * or inactive (rest). Sounds are played in round-robin fashion to prevent overlapping.
 *
 * @param inputs - Array of audio file URLs, ArrayBuffers, Blobs, or Files to load as sound sources
 * @param opts - Optional BeatTrack configuration
 * @returns Promise resolving to a BeatTrack instance
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createBeatTrack } from 'ez-web-audio'
 *
 * // From URLs
 * const kick = await createBeatTrack(['kick1.mp3', 'kick2.mp3', 'kick3.mp3'])
 *
 * // From mixed inputs (URLs, ArrayBuffers, Files)
 * const snare = await createBeatTrack([snareUrl, snareBuffer, snareFile])
 *
 * // Set up a 4/4 beat pattern (kick on 1 and 3)
 * kick.beats[0].active = true  // Beat 1
 * kick.beats[2].active = true  // Beat 3
 *
 * // Play the pattern
 * kick.play()
 * ```
 */
export async function createBeatTrack(inputs: AudioInput[], opts?: BeatTrackOptions): Promise<BeatTrack> {
  const sounds = await Promise.all(inputs.map(resolveSound))
  return new BeatTrack(getOrCreateAudioContext(), sounds, opts)
}

/**
 * Create a Sampler for round-robin playback of multiple sounds.
 *
 * Sampler holds multiple Sound instances and cycles through them on each play,
 * providing natural variation and preventing the "machine gun" effect of
 * identical sounds played rapidly.
 *
 * @param inputs - Array of audio file URLs, ArrayBuffers, Blobs, or Files to load as sound sources
 * @param opts - Optional Sampler configuration
 * @returns Promise resolving to a Sampler instance
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createSampler } from 'ez-web-audio'
 *
 * // From URLs
 * const gunshot = await createSampler([
 *   'shot1.mp3', 'shot2.mp3', 'shot3.mp3'
 * ])
 *
 * // From mixed inputs (URLs, ArrayBuffers, Files)
 * const snare = await createSampler([snareUrl, snareBuffer, snareFile])
 *
 * // Each play uses the next sound in rotation
 * gunshot.play() // shot1
 * gunshot.play() // shot2
 * gunshot.play() // shot3
 * gunshot.play() // shot1 (wraps around)
 * ```
 */
export async function createSampler(inputs: AudioInput[], opts?: SamplerOptions): Promise<Sampler> {
  const sounds = await Promise.all(inputs.map(resolveSound))
  await initAudio()
  return new Sampler(sounds, opts)
}

/**
 * Create an Oscillator for synthesizing audio from waveforms.
 *
 * Oscillators generate sound from sine, square, sawtooth, or triangle waves.
 * They support filters for tone shaping and ADSR envelopes for
 * professional-quality synthesis.
 *
 * @param options - Optional oscillator configuration (frequency, type, filters, envelope)
 * @returns Promise resolving to an Oscillator instance
 *
 * @example
 * ```typescript
 * import { createOscillator } from 'ez-web-audio'
 *
 * // Simple sine wave at 440Hz (A4)
 * const synth = await createOscillator({ frequency: 440, type: 'sine' })
 * synth.play()
 * setTimeout(() => synth.stop(), 500)
 *
 * // With ADSR envelope for piano-like decay
 * const piano = await createOscillator({
 *   frequency: 440,
 *   type: 'triangle',
 *   envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 }
 * })
 * piano.play()
 *
 * // Using note name instead of frequency
 * const a4 = await createOscillator({ note: 'A4', type: 'sine' })
 * a4.play()
 * ```
 */
export async function createOscillator(options?: OscillatorOptions): Promise<Oscillator> {
  await initAudio()
  return new Oscillator(getOrCreateAudioContext(), options)
}

/**
 * Create a PolySynth for polyphonic synthesis with automatic voice management.
 *
 * PolySynth manages a pool of Oscillator voices, handling allocation, recycling,
 * and voice stealing automatically. All voices route through a shared output bus
 * with master gain/pan controls and effect chain support.
 *
 * @param options - PolySynth configuration (maxVoices, stealStrategy, oscillator settings)
 * @returns Promise resolving to a PolySynth instance
 *
 * @example
 * ```typescript
 * import { createPolySynth } from 'ez-web-audio'
 *
 * const synth = await createPolySynth({
 *   maxVoices: 8,
 *   type: 'sawtooth',
 *   envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
 *   lowpass: { frequency: 2000, q: 1 }
 * })
 *
 * // Play a chord
 * synth.play({ frequency: 261.63 }) // C4
 * synth.play({ frequency: 329.63 }) // E4
 * synth.play({ frequency: 392.00 }) // G4
 *
 * // Add effects to all voices
 * const delay = createDelay({ time: 0.3, feedback: 0.4, wet: 0.3 })
 * synth.addEffect(delay)
 * ```
 */
export async function createPolySynth(options?: PolySynthOptions): Promise<PolySynth> {
  await initAudio()
  return new PolySynth(getOrCreateAudioContext(), options)
}

/**
 * Create an Analyzer for audio visualization.
 *
 * The context-free overload uses the shared AudioContext created by the library,
 * so you do not need to obtain an AudioContext manually.
 *
 * @param options - Optional analyzer configuration (fftSize, minDecibels, maxDecibels, smoothingTimeConstant)
 * @returns Analyzer instance
 *
 * @example
 * ```typescript
 * import { createAnalyzer } from 'ez-web-audio'
 *
 * // Context-free — no AudioContext needed
 * const analyzer = await createAnalyzer({ fftSize: 1024 })
 * sound.setAnalyzer(analyzer)
 *
 * // With explicit AudioContext
 * const ctx = await getAudioContext()
 * const analyzer2 = await createAnalyzer(ctx, { fftSize: 2048 })
 *
 * function visualize() {
 *   const freqData = analyzer.getFrequencyData()
 *   // Use freqData for visualization
 *   requestAnimationFrame(visualize)
 * }
 * visualize()
 * ```
 */
export async function createAnalyzer(options?: AnalyzerOptions): Promise<Analyzer>
export async function createAnalyzer(audioContext: AudioContext, options?: AnalyzerOptions): Promise<Analyzer>
export async function createAnalyzer(
  audioContextOrOptions?: AudioContext | AnalyzerOptions,
  maybeOptions?: AnalyzerOptions,
): Promise<Analyzer> {
  if (audioContextOrOptions instanceof AudioContext) {
    return new Analyzer(audioContextOrOptions, maybeOptions)
  }
  await initAudio()
  return new Analyzer(getOrCreateAudioContext(), audioContextOrOptions)
}

/**
 * Create a Low Frequency Oscillator (LFO) for modulating audio parameters.
 *
 * An LFO produces a slow oscillation that can be connected to any audio parameter
 * (gain, pan, frequency, filter cutoff, etc.) to create effects like tremolo, vibrato,
 * auto-pan, and auto-filter.
 *
 * The LFO does not require an AudioContext upfront — it infers the context from the
 * first target connected via connect().
 *
 * @param options - Optional LFO configuration (frequency, depth, waveform type)
 * @returns LFO instance ready to connect to audio targets
 *
 * @example
 * ```typescript
 * import { createLFO, createOscillator } from 'ez-web-audio'
 *
 * // Tremolo: modulate gain at 5 Hz
 * const synth = await createOscillator({ frequency: 440 })
 * const tremolo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })
 * tremolo.connect(synth, 'gain')
 * tremolo.start()
 * synth.play()
 *
 * // Vibrato: modulate frequency in cents
 * const vibrato = createLFO({ frequency: 6, depth: 50, type: 'sine' })
 * vibrato.connect(synth, 'frequency') // depth=50 cents by default for frequency
 * vibrato.start()
 *
 * // Auto-pan: modulate pan position
 * const autoPan = createLFO({ frequency: 0.5, depth: 0.8, type: 'triangle' })
 * autoPan.connect(synth, 'pan')
 * autoPan.start()
 *
 * // BPM sync: set LFO rate to match quarter notes at 120 BPM
 * tremolo.syncToBPM(120, '1/4') // sets frequency to 2 Hz
 * ```
 */
export function createLFO(options?: LFOOptions): LFO {
  return new LFO(options)
}

/**
 * Create a global Transport clock for multi-track synchronization.
 *
 * The Transport provides a Worker-backed clock that multiple BeatTracks can lock to,
 * enabling perfect multi-track synchronization that survives background tab throttling.
 *
 * @param options - Transport configuration (bpm, timeSignature, ticksPerBeat)
 * @returns Promise resolving to a Transport instance
 *
 * @example
 * ```typescript
 * import { createTransport, createBeatTrack } from 'ez-web-audio'
 *
 * const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })
 * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 4 })
 *
 * kick.syncTo(transport, { noteType: 1/4 })
 * transport.start()
 *
 * transport.on('tick', (e) => {
 *   console.log(`Position: ${e.detail.bar}:${e.detail.beat}:${e.detail.tick}`)
 * })
 * ```
 */
export async function createTransport(options: TransportOptions): Promise<Transport> {
  await initAudio()
  return new Transport(getOrCreateAudioContext(), options)
}

/**
 * Create a Sequence that schedules arbitrary callbacks at musical time positions.
 *
 * Sequences are tied to a Transport at creation and follow its lifecycle.
 * Events are stored as beat positions, so live BPM changes automatically affect
 * subsequent scheduling without re-scheduling.
 *
 * @param transport - The Transport to sync to
 * @param options - Sequence configuration (length, loop, initial events)
 * @returns Sequence instance
 *
 * @example
 * ```typescript
 * import { createTransport, createSequence, createSound } from 'ez-web-audio'
 *
 * const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })
 * const kick = await createSound('kick.mp3')
 *
 * const seq = createSequence(transport, { length: '1m' })
 * seq.at('1:1:0', (time) => kick.playIn(time - ctx.currentTime))
 * seq.at('1:3:0', (time) => kick.playIn(time - ctx.currentTime))
 *
 * transport.start()
 *
 * // Change BPM — events adjust automatically
 * transport.bpm = 140
 * ```
 */
export function createSequence(transport: Transport, options: SequenceOptions): Sequence {
  return new Sequence(transport, options)
}

/**
 * Create a LayeredSound that plays multiple Sound/Oscillator instances simultaneously.
 * All layers start at exactly the same audioContext.currentTime for perfect sync.
 *
 * @param layers - Array of Sound or Oscillator instances to layer
 * @param opts - Optional configuration (name, warnLayerCount)
 * @returns LayeredSound instance
 *
 * @example
 * const bass = await createSound('bass.mp3')
 * const melody = await createSound('melody.mp3')
 * const synth = await createOscillator({ frequency: 440 })
 *
 * const layered = await createLayeredSound([bass, melody, synth])
 * layered.play() // All layers start at exact same time
 * layered.setGain(0.5) // Affects all layers
 * layered.getLayer(2)?.changeGainTo(0.8) // Control individual layer
 */
export async function createLayeredSound(
  layers: (Sound | Oscillator)[],
  opts?: LayeredSoundOptions,
): Promise<LayeredSound> {
  await initAudio()
  return new LayeredSound(getOrCreateAudioContext(), layers, opts)
}

/**
 * Create a Font from a soundfont file.
 *
 * A Font is a collection of sampled notes (like a piano or organ) that can be
 * played by note name. Soundfont files contain base64-encoded audio samples
 * for each note.
 *
 * @param url - URL to the soundfont JavaScript file
 * @returns Promise resolving to a Font instance
 * @throws {AudioLoadError} If the soundfont cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createFont } from 'ez-web-audio'
 *
 * // Load a piano soundfont
 * const piano = await createFont('acoustic_grand_piano-mp3.js')
 *
 * // Play notes by name
 * piano.play('C4')  // Middle C
 * piano.play('E4')  // E above middle C
 * piano.play('G4')  // G above middle C
 * ```
 */
export async function createFont(url: string): Promise<Font> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new AudioLoadError(
        `Failed to load soundfont from "${url}": HTTP ${response.status} ${response.statusText}`,
        url,
      )
    }
    const text = await response.text()
    const audioData = mungeSoundFont(text)
    await initAudio()
    const audioContext = getOrCreateAudioContext()
    const keyValuePairs = await extractDecodedKeyValuePairs(audioContext, audioData)
    const notes = createNoteObjectsForFont(audioContext, keyValuePairs)
    return new Font(notes)
  }
  catch (error) {
    if (error instanceof AudioLoadError) {
      throw error
    }
    throw new AudioLoadError(
      `Failed to load soundfont from "${url}": ${error instanceof Error ? error.message : String(error)}`,
      url,
    )
  }
}

/**
 * Create an audio sprite from an audio file and manifest.
 * Sprites allow playing segments of a single audio file by name.
 *
 * @param audioUrl - URL of the audio file
 * @param manifest - Sprite manifest with timing definitions
 * @returns AudioSprite instance
 *
 * @example
 * const sprite = await createSprite('sounds.mp3', {
 *   spritemap: {
 *     laser: { start: 0, end: 0.3 },
 *     explosion: { start: 1.0, end: 2.5 }
 *   }
 * })
 * sprite.play('laser', { gain: 0.5 })
 */
export async function createSprite(audioUrl: string, manifest: SpriteManifest): Promise<AudioSprite> {
  await initAudio()
  const audioContext = getOrCreateAudioContext()
  let buffer: AudioBuffer

  if (hasInCache(audioUrl)) {
    const res = await getFromCache(audioUrl)!.clone()
    buffer = await audioContext.decodeAudioData(await res.arrayBuffer())
  }
  else {
    const response = await fetch(audioUrl)
    if (!response.ok) {
      throw new AudioLoadError(
        `HTTP ${response.status} loading sprite audio. URL: ${audioUrl}`,
        audioUrl,
      )
    }
    // Store a clone so the cached response body is always unconsumed.
    // Response.body can only be read once; always store a fresh clone.
    setInCache(audioUrl, response.clone())
    evictIfNeeded()
    buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
  }

  return new AudioSprite(audioContext, buffer, manifest)
}

/**
 * Create a Sound containing white noise.
 *
 * White noise is useful for sound effects (rain, static, wind) and as a
 * synthesis building block when combined with filters.
 *
 * @returns Promise resolving to a Sound containing 1 second of white noise
 *
 * @example
 * ```typescript
 * import { createWhiteNoise, createFilterEffect } from 'ez-web-audio'
 *
 * // Create white noise
 * const noise = await createWhiteNoise()
 * noise.play()
 *
 * // Filter white noise to create wind-like sound
 * const wind = await createWhiteNoise()
 * const lowpass = createFilterEffect('lowpass', {
 *   frequency: 400
 * })
 * wind.addEffect(lowpass)
 * wind.play()
 * ```
 */
export async function createWhiteNoise(): Promise<Sound> {
  await initAudio()
  const audioContext = getOrCreateAudioContext()
  const bufferSize = audioContext.sampleRate
  const audioBuffer = audioContext.createBuffer(1, bufferSize, bufferSize)
  const output = audioBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1
  }

  const sound = new Sound(audioContext, audioBuffer)
  sound.loop = true
  return sound
}

/**
 * Create a Sound containing a specific type of noise.
 *
 * A convenient unified API for all three noise types:
 * - `'white'`: Equal energy across all frequencies (hiss/static)
 * - `'pink'`: Equal energy per octave (1/f spectrum; sounds balanced and natural)
 * - `'brown'`: Heavier bass, deeper rumble (cumulative random walk)
 *
 * All types return 1 second of loopable mono audio.
 *
 * @param type - The noise type: 'white', 'pink', or 'brown'
 * @returns Promise resolving to a Sound containing the generated noise
 *
 * @example
 * ```typescript
 * import { createNoise } from 'ez-web-audio'
 *
 * // Pink noise for focus/sleep
 * const pink = await createNoise('pink')
 * pink.loop = true
 * pink.play()
 *
 * // Brown noise for deep rumble
 * const brown = await createNoise('brown')
 * brown.play()
 *
 * // White noise (same as createWhiteNoise())
 * const white = await createNoise('white')
 * white.play()
 * ```
 */
export async function createNoise(type: 'white' | 'pink' | 'brown'): Promise<Sound> {
  await initAudio()
  const audioContext = getOrCreateAudioContext()

  let audioBuffer: AudioBuffer

  switch (type) {
    case 'pink':
      audioBuffer = createPinkNoiseBuffer(audioContext)
      break
    case 'brown':
      audioBuffer = createBrownNoiseBuffer(audioContext)
      break
    case 'white':
    default: {
      const bufferSize = audioContext.sampleRate
      audioBuffer = audioContext.createBuffer(1, bufferSize, bufferSize)
      const output = audioBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
      break
    }
  }

  const sound = new Sound(audioContext, audioBuffer)
  sound.loop = true
  return sound
}

/**
 * Factory function to create the appropriate sound class based on type.
 *
 * @private
 * @param type - The type of sound class to create ('sound' or 'track' - samplers use createSampler)
 * @param props - Audio buffer to pass to the constructor
 * @returns Sound or Track instance
 */
function createSoundFor(type: 'sound' | 'track', props: AudioBuffer): Sound | Track {
  const audioContext = getOrCreateAudioContext()
  switch (type) {
    case 'track':
      return new Track(audioContext, props)
    default:
      return new Sound(audioContext, props)
  }
}

/**
 * Load and decode an audio file, creating the appropriate sound instance.
 *
 * Handles caching via responseCache to avoid duplicate network requests.
 *
 * @private
 * @param src - URL to the audio file
 * @param type - Type of sound instance to create ('sound', 'track', or 'sampler')
 * @returns Promise resolving to Sound, Track, or Sampler instance
 * @throws {AudioLoadError} If the file cannot be loaded or decoded
 */
async function load(src: string, type: 'sound' | 'track'): Promise<Sound | Track> {
  await initAudio()
  const audioContext = getOrCreateAudioContext()

  if (hasInCache(src)) {
    const res = await getFromCache(src)!.clone()
    const buffer = await audioContext.decodeAudioData(await res.arrayBuffer())
    return createSoundFor(type, buffer)
  }

  let response: Response
  try {
    response = await fetch(src)
  }
  catch {
    throw new AudioLoadError(
      `Network error loading audio. Check URL and connection. URL: ${src}`,
      src,
    )
  }

  if (!response.ok) {
    throw new AudioLoadError(
      `HTTP ${response.status} loading audio. Check URL and CORS headers. URL: ${src}`,
      src,
    )
  }

  // Store a clone so the cached response body is always unconsumed.
  // Response.body can only be read once; always store a fresh clone.
  setInCache(src, response.clone())
  evictIfNeeded()

  let buffer: AudioBuffer
  try {
    buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
  }
  catch {
    throw new AudioLoadError(
      `Failed to decode audio. File may be corrupted or unsupported format. URL: ${src}`,
      src,
    )
  }

  return createSoundFor(type, buffer)
}

export interface InteractionTarget {
  play: () => void | Promise<void>
  stop: () => void | Promise<void>
}

/** @deprecated Use `InteractionTarget` instead. */
export type Player = InteractionTarget

/**
 * Prevent default behavior for common interaction events on an element.
 *
 * Useful for piano keys or other interactive audio controls where you want
 * to prevent text selection, context menus, and drag-and-drop behaviors.
 *
 * @param key - HTML element to attach event prevention to
 *
 * @example
 * ```typescript
 * import { preventEventDefaults } from 'ez-web-audio'
 *
 * const pianoKey = document.getElementById('key-c4')
 * preventEventDefaults(pianoKey)
 * ```
 */
export function preventEventDefaults(key: HTMLElement): () => void {
  function prevent(e: Event): void {
    e.preventDefault()
  }

  const events = [
    'touchstart',
    'touchend',
    'touchcancel',
    'touchmove',
    'mousedown',
    'mouseup',
    'click',
    'contextmenu',
    'dragstart',
    'dragend',
    'dragenter',
    'dragover',
    'drag',
    'dragleave',
    'drop',
  ]

  events.forEach(event => key.addEventListener(event, prevent))

  // Return cleanup function to remove all added listeners
  return () => {
    events.forEach(event => key.removeEventListener(event, prevent))
  }
}

/**
 * Attach play/stop handlers to an element for touch and mouse interactions.
 *
 * Binds touchstart/mousedown to play() and touchend/mouseup/mouseleave to stop().
 * Automatically initializes audio on first interaction.
 *
 * @param key - HTML element to attach handlers to
 * @param player - Object with play() and stop() methods
 *
 * @example
 * ```typescript
 * import { useInteractionMethods, createOscillator } from 'ez-web-audio'
 *
 * const synth = await createOscillator({ frequency: 440 })
 * const pianoKey = document.getElementById('key-a4')
 *
 * await useInteractionMethods(pianoKey, synth)
 * // Now touching/clicking the element plays the synth
 * ```
 */
export async function useInteractionMethods(key: HTMLElement, player: InteractionTarget): Promise<() => void> {
  async function play(): Promise<void> {
    await initAudio()
    player.play()
  }

  async function stop(): Promise<void> {
    await initAudio()
    player.stop()
  }

  key.addEventListener('touchstart', play)
  key.addEventListener('touchend', stop)
  key.addEventListener('touchcancel', stop)
  key.addEventListener('mousedown', play)
  key.addEventListener('mouseup', stop)
  key.addEventListener('mouseleave', stop)

  // Return cleanup function to remove all added listeners
  return () => {
    key.removeEventListener('touchstart', play)
    key.removeEventListener('touchend', stop)
    key.removeEventListener('touchcancel', stop)
    key.removeEventListener('mousedown', play)
    key.removeEventListener('mouseup', stop)
    key.removeEventListener('mouseleave', stop)
  }
}

export {
  Analyzer,
  audioContextAwareTimeout,
  AudioContextError,
  AudioError,
  AudioLoadError,
  AudioSprite,
  BaseEffect,
  Beat,
  BeatTrack,
  clearPreloadCache,
  CompressorEffect,
  createCompressor,
  createDelay,
  createDistortion,
  createEffect,
  createEQ,
  createFilterEffect,
  createGainEffect,
  createReverb,
  crossfade,
  CrossfadeOptions,
  DelayEffect,
  DistortionEffect,
  EffectWrapper,
  Envelope,
  EQEffect,
  FilterEffect,
  Font,
  formatPosition,
  frequencyMap,
  GainEffect,
  InvalidNoteError,
  isMusicalTimeNotation,
  isPreloaded,
  LFO,
  MusicallyAware,
  musicalTimeToBeats,
  Note,
  Oscillator,
  OscillatorController,
  parseMusicalTime,
  pauseAll,
  playAll,
  playTogether,
  PolySynth,
  preload,
  ReverbEffect,
  SampledNote,
  Sampler,
  Sequence,
  setDebugHandler,
  setDebugMode,
  setPreloadCacheLimit,
  Sound,
  SoundController,
  stopAll,
  Track,
  Transport,
  VoiceHandle,
  wrapEffect,
}

export type {
  AudioEventSource,
  BaseSoundEventMap,
  BeatEventDetail,
  BeatTrackEventMap,
  EndEventDetail,
  EventDetailFor,
  LayeredSoundEventMap,
  PauseEventDetail,
  PlayEventDetail,
  PolySynthEventMap,
  ResumeEventDetail,
  SeekEventDetail,
  SequenceEventDetail,
  SequenceEventMap,
  SequenceLoopDetail,
  SoundEventMap,
  SoundEventType,
  StopEventDetail,
  TrackEventMap,
  TransportEventMap,
  TransportLifecycleDetail,
  TransportTickDetail,
  VoiceStolenEventDetail,
  WarningEventDetail,
} from './events/event-types'
// Re-export LayeredSound types
export { TypedEventEmitter } from './events/typed-event-emitter'
export { LayeredSound } from './layered-sound'
export type { LayeredSoundOptions } from './layered-sound'

export type {
  AlgorithmicReverbOptions,
  AnalyzerOptions,
  BeatTrackOptions,
  CompressorOptions,
  Connectable,
  ControlType,
  ControlTypeMap,
  ConvolutionReverbOptions,
  DebugMessage,
  DelayOptions,
  DistortionOptions,
  DistortionType,
  Effect,
  EnvelopeOptions,
  EQOptions,
  ExternalEffect,
  FilterEffectOptions,
  FilterType,
  LFOConnectOptions,
  LFOOptions,
  LFOWaveform,
  MusicalTimeNotation,
  OscillatorControlType,
  OscillatorFilterOptions,
  OscillatorOptions,
  Playable,
  PlayOptions,
  PolySynthOptions,
  RatioType,
  SamplerOptions,
  SeekType,
  SequenceCallback,
  SequenceOptions,
  SoundControlType,
  SpriteDefinition,
  SpriteManifest,
  SpritePlayOptions,
  StealStrategy,
  TimeObject,
  TransportOptions,
  TransportPosition,
}
