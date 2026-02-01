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

export async function getAudioContext(): Promise<AudioContext> {
  await initAudio()
  return audioContext
}

// Notes do not require AudioContext
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

export function createSound(url: string): Promise<Sound> {
  return load(url, 'sound') as Promise<Sound>
}

export async function createTrack(url: string): Promise<Track> {
  return load(url, 'track') as Promise<Track>
}

export async function createBeatTrack(urls: string[], opts?: BeatTrackOptions): Promise<BeatTrack> {
  const sounds = await Promise.all(urls.map(async url => load(url, 'sound') as Promise<Sound>))
  return new BeatTrack(audioContext, sounds, opts)
}

export async function createSampler(urls: string[], opts?: SamplerOptions): Promise<Sampler> {
  const sounds = await Promise.all(urls.map(async url => load(url, 'sound') as Promise<Sound>))
  await initAudio()
  return new Sampler(sounds, opts)
}

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
 * Creates an {{#crossLinkModule "Audio"}}Audio Class{{/crossLinkModule}}
 * instance (which is based on which "type" is specified), and passes "props"
 * to the new instance.
 *
 * @private
 * @method createSoundFor
 *
 * @param {string} type The type of
 * {{#crossLinkModule "Audio"}}Audio Class{{/crossLinkModule}} to be created.
 *
 * @param {object} props POJO to pass to the new instance
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
 * Loads and decodes an audio file, creating a Sound, Track, or BeatTrack
 * instance (as determined by the "type" parameter) and places the instance
 * into it's corresponding register.
 *
 * @private
 * @method _load
 *
 * @param {string} src The URI location of an audio file. Will be used by
 * "fetch" to get the audio file. Can be a local or a relative URL
 *
 * @param {string} type Determines the type of object that should be created,
 * as well as which register the instance should be placed in. Can be 'sound',
 * 'track', or 'beatTrack'.
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
}
