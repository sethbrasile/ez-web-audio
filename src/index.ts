import type { OscillatorOptsFilterValues } from './oscillator'
import { Envelope } from './envelope'
import type { EnvelopeOptions } from './envelope'
import { stopAll, pauseAll, playAll } from './utils/collections'
import { SampledNote } from './sampled-note'
import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import { Font } from './font'
import { AudioContextError, AudioError, AudioLoadError, InvalidNoteError } from './errors'
import { mungeSoundFont } from './utils/decode-base64'
import { createNoteObjectsForFont, extractDecodedKeyValuePairs } from './utils/note-methods'
import frequencyMap from './utils/frequency-map'
import type { BeatTrackOptions } from './beat-track'
import { BeatTrack } from './beat-track'
// @ts-expect-error: don't need types, it's just a function and we're accepting it as-is
import unmuteIosAudio from './utils/unmute'
import { Beat } from '@/beat'
import { MusicallyAware } from '@/musical-identity'
import type { SamplerOptions } from '@/sampler'
import { Sampler } from '@/sampler'
import { Oscillator } from '@/oscillator'
import { Sound } from '@/sound'
import { Track } from '@/track'
import { Note } from '@/note'
import type { OscillatorOpts } from '@/oscillator'
import { clearPreloadCache, isPreloaded, preload, responseCache } from './preload'
import { AudioSprite } from './sprite'
import type { SpriteDefinition, SpriteManifest, SpritePlayOptions } from './sprite'
import { crossfade } from './utils/crossfade'
import { setDebugMode, setDebugHandler } from './debug'
import type { DebugMessage } from './debug'
import { Analyzer, createAnalyzer } from './analyzer'
import type { AnalyzerOptions } from './analyzer'
import {
  createGainEffect,
  createFilterEffect,
  wrapEffect,
  GainEffect,
  FilterEffect,
  EffectWrapper,
} from './effects'
import type { Effect, FilterType, FilterEffectOptions, ExternalEffect } from './effects'

let audioContext: AudioContext

async function unlockAudioContext(): Promise<void> {
  if (audioContext.state !== 'suspended')
    return

  const b = document.body
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown']

  async function unlock(): Promise<void> {
    await audioContext.resume().then(clean)
  }

  function clean(): void {
    events.forEach(e => b.removeEventListener(e, unlock))
  }

  events.forEach(e => b.addEventListener(e, unlock, false))

  await audioContext.resume()
}

let iosWorkaroundPerformed = false

/**
 * Initialize the audio system. Must be called in response to a user interaction
 * (click, tap, keypress) due to browser autoplay policies.
 *
 * This function creates the AudioContext if it doesn't exist and handles
 * iOS-specific workarounds for audio playback while the mute switch is on.
 *
 * @param useIosMuteWorkaround - Whether to apply iOS mute switch workaround (default: true)
 * @throws {AudioContextError} If AudioContext cannot be created or is interrupted
 *
 * @example
 * ```typescript
 * import { initAudio, createSound } from 'ez-web-audio'
 *
 * // Call initAudio on user interaction
 * button.addEventListener('click', async () => {
 *   await initAudio()
 *   const sound = await createSound('click.mp3')
 *   sound.play()
 * })
 * ```
 */
export async function initAudio(useIosMuteWorkaround = true): Promise<void> {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  if (!audioContext) {
    throw new AudioContextError(
      'AudioContext could not be created. Call initAudio() after a user interaction (click, tap, keypress).',
      'closed',
    )
  }

  // Handle interrupted state (iOS backgrounded)
  if (audioContext.state === 'interrupted' as AudioContextState) {
    throw new AudioContextError(
      'AudioContext interrupted (iOS backgrounded). Resume playback after returning to foreground.',
      audioContext.state,
    )
  }

  // only run this workaround code once
  if (useIosMuteWorkaround && !iosWorkaroundPerformed) {
    unmuteIosAudio(audioContext)
    iosWorkaroundPerformed = true
  }
  // TODO: without this, synth note hangs on first press?
  await unlockAudioContext()
}

/**
 * Get the shared AudioContext instance, initializing it if needed.
 *
 * The library uses a single AudioContext instance for all audio operations.
 * This function ensures the context is initialized before returning it.
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
  return audioContext
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
export function createNotes(json?: any): Note[] {
  const notes = []
  if (!json) {
    json = frequencyMap
  }

  for (const key in json) {
    const note = json[key]
    const noteObject = new Note()
    noteObject.frequency = note
    notes.push(noteObject)
  }
  return notes
}

/**
 * Create a Sound from an audio file URL.
 *
 * Sound is for one-shot audio playback (sound effects, UI sounds). Each call to
 * `.play()` creates a new audio source, allowing overlapping playback.
 * Use {@link createTrack} instead for music with pause/resume/seek.
 *
 * @param url - URL to the audio file (local path, relative URL, or absolute URL)
 * @returns Promise resolving to a Sound instance
 * @throws {AudioLoadError} If the audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createSound } from 'ez-web-audio'
 *
 * const click = await createSound('click.mp3')
 * click.play()
 *
 * // Sounds can overlap
 * click.play()
 * click.play()
 *
 * // Control volume
 * click.changeGainTo(0.5)
 * click.play()
 * ```
 */
export function createSound(url: string): Promise<Sound> {
  return load(url, 'sound') as Promise<Sound>
}

/**
 * Create a Track from an audio file URL.
 *
 * Track extends Sound with position tracking, pause/resume, and seeking.
 * Use Track for music or longer audio where users need playback control.
 * Unlike Sound, only one playback can be active at a time.
 *
 * @param url - URL to the audio file (local path, relative URL, or absolute URL)
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
 * // Seek to 30 seconds
 * song.seek(30).from('seconds')
 *
 * // Get current position
 * console.log(song.position.string) // '0:30'
 * ```
 */
export async function createTrack(url: string): Promise<Track> {
  return load(url, 'track') as Promise<Track>
}

/**
 * Create a BeatTrack for drum machine-style rhythmic patterns.
 *
 * A BeatTrack manages a sequence of Beats, where each Beat can be active (plays sound)
 * or inactive (rest). Sounds are played in round-robin fashion to prevent overlapping.
 *
 * @param urls - Array of audio file URLs to load as sound sources
 * @param opts - Optional BeatTrack configuration
 * @returns Promise resolving to a BeatTrack instance
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createBeatTrack } from 'ez-web-audio'
 *
 * // Create a kick drum track with 3 sounds for round-robin
 * const kick = await createBeatTrack(['kick1.mp3', 'kick2.mp3', 'kick3.mp3'])
 *
 * // Set up a 4/4 beat pattern (kick on 1 and 3)
 * kick.beats[0].active = true  // Beat 1
 * kick.beats[2].active = true  // Beat 3
 *
 * // Play the pattern
 * kick.play()
 * ```
 */
export async function createBeatTrack(urls: string[], opts?: BeatTrackOptions): Promise<BeatTrack> {
  const sounds = await Promise.all(urls.map(async url => load(url, 'sound') as Promise<Sound>))
  return new BeatTrack(audioContext, sounds, opts)
}

/**
 * Create a Sampler for round-robin playback of multiple sounds.
 *
 * Sampler holds multiple Sound instances and cycles through them on each play,
 * providing natural variation and preventing the "machine gun" effect of
 * identical sounds played rapidly.
 *
 * @param urls - Array of audio file URLs to load as sound sources
 * @param opts - Optional Sampler configuration
 * @returns Promise resolving to a Sampler instance
 * @throws {AudioLoadError} If any audio file cannot be loaded or decoded
 *
 * @example
 * ```typescript
 * import { createSampler } from 'ez-web-audio'
 *
 * // Create a sampler with multiple gunshot variations
 * const gunshot = await createSampler([
 *   'shot1.mp3', 'shot2.mp3', 'shot3.mp3'
 * ])
 *
 * // Each play uses the next sound in rotation
 * gunshot.play() // shot1
 * gunshot.play() // shot2
 * gunshot.play() // shot3
 * gunshot.play() // shot1 (wraps around)
 * ```
 */
export async function createSampler(urls: string[], opts?: SamplerOptions): Promise<Sampler> {
  const sounds = await Promise.all(urls.map(async url => load(url, 'sound') as Promise<Sound>))
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
 * ```
 */
export async function createOscillator(options?: OscillatorOpts): Promise<Oscillator> {
  await initAudio()
  return new Oscillator(audioContext, options)
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
  opts?: import('./layered-sound').LayeredSoundOptions
): Promise<import('./layered-sound').LayeredSound> {
  await initAudio()
  const { LayeredSound } = await import('./layered-sound')
  return new LayeredSound(audioContext, layers, opts)
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
  const response = await fetch(url)
  const text = await response.text()
  const audioData = mungeSoundFont(text)
  await initAudio()
  const keyValuePairs = await extractDecodedKeyValuePairs(audioContext, audioData)
  const notes = createNoteObjectsForFont(audioContext, keyValuePairs)
  return new Font(notes)
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
  let buffer: AudioBuffer

  if (responseCache.has(audioUrl)) {
    const res = await responseCache.get(audioUrl)!.clone()
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
    responseCache.set(audioUrl, response)
    buffer = await audioContext.decodeAudioData(await response.clone().arrayBuffer())
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
 * const lowpass = createFilterEffect(await getAudioContext(), 'lowpass', {
 *   frequency: 400
 * })
 * wind.addEffect(lowpass)
 * wind.play()
 * ```
 */
export async function createWhiteNoise(): Promise<Sound> {
  const bufferSize = audioContext.sampleRate
  const audioBuffer = audioContext.createBuffer(1, bufferSize, bufferSize)
  const output = audioBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1
  }

  return new Sound(audioContext, audioBuffer)
}

/**
 * Factory function to create the appropriate sound class based on type.
 *
 * @private
 * @param type - The type of sound class to create ('sound', 'track', or 'sampler')
 * @param props - Audio buffer or configuration to pass to the constructor
 * @returns Sound, Track, or Sampler instance
 */
function createSoundFor(type: 'sound' | 'track' | 'sampler', props: any): Sound | Sampler | Track {
  switch (type) {
    case 'track':
      return new Track(audioContext, props)
    case 'sampler':
      return new Sampler(props)
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
async function load(src: string, type: 'sound' | 'track' | 'sampler'): Promise<Sound | Sampler | Track> {
  if (responseCache.has(src)) {
    const res = await responseCache.get(src)!.clone()
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

  responseCache.set(src, response)

  await initAudio()

  let buffer: AudioBuffer
  try {
    buffer = await audioContext.decodeAudioData(await response.clone().arrayBuffer())
  }
  catch {
    throw new AudioLoadError(
      `Failed to decode audio. File may be corrupted or unsupported format. URL: ${src}`,
      src,
    )
  }

  return createSoundFor(type, buffer)
}

interface Player {
  play: () => void
  stop: () => void
}

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
export function preventEventDefaults(key: HTMLElement): void {
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
export async function useInteractionMethods(key: HTMLElement, player: Player): Promise<void> {
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
  // key.addEventListener('touchcancel', stop)
  key.addEventListener('mousedown', play)
  key.addEventListener('mouseup', stop)
  key.addEventListener('mouseleave', stop)
}

export {
  Font,
  Note,
  Sound,
  Sampler,
  SampledNote,
  Oscillator,
  Track,
  MusicallyAware,
  frequencyMap,
  Beat,
  BeatTrack,
  // Envelope
  Envelope,
  // Audio Sprites
  AudioSprite,
  // Preload utilities
  preload,
  isPreloaded,
  clearPreloadCache,
  // Collection utilities
  stopAll,
  pauseAll,
  playAll,
  // Crossfade utility
  crossfade,
  // Debug utilities
  setDebugMode,
  setDebugHandler,
  // Effects
  createGainEffect,
  createFilterEffect,
  wrapEffect,
  GainEffect,
  FilterEffect,
  EffectWrapper,
  // Analyzer
  Analyzer,
  createAnalyzer,
  // Errors
  AudioError,
  AudioContextError,
  AudioLoadError,
  InvalidNoteError,
}

// Re-export LayeredSound types
export { LayeredSound } from './layered-sound'
export type { LayeredSoundOptions } from './layered-sound'
export type { LayeredSoundEventMap, WarningEventDetail } from './events/event-types'

export type {
  Connectable,
  Playable,
  OscillatorOpts,
  OscillatorOptsFilterValues,
  EnvelopeOptions,
  SpriteDefinition,
  SpriteManifest,
  SpritePlayOptions,
  DebugMessage,
  // Effect types
  Effect,
  FilterType,
  FilterEffectOptions,
  ExternalEffect,
  // Analyzer types
  AnalyzerOptions,
}
