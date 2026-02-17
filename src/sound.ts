import type { TimeObject } from '@utils/create-time-object'
import createTimeObject from '@utils/create-time-object'
import { BaseSound } from './base-sound'
import { SoundController } from './controllers/sound-controller'

/**
 * One-shot audio playback from an AudioBuffer.
 *
 * Sound is the core class for playing audio files. Each `.play()` call creates
 * a new AudioBufferSourceNode, allowing simultaneous overlapping playback.
 * Use {@link Track} instead if you need pause/resume/seek functionality.
 *
 * Sound extends {@link BaseSound} and inherits all audio parameter controls
 * (gain, pan) and the fluent API for scheduling parameter changes.
 *
 * @example
 * ```typescript
 * import { createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('click.mp3')
 * sound.play()
 *
 * // Adjust volume before playing
 * sound.changeGainTo(0.5)
 * sound.play()
 *
 * // Schedule a fade-in
 * sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')
 * sound.play()
 * ```
 */
export class Sound extends BaseSound {
  /** The underlying AudioBufferSourceNode that plays the audio. */
  public audioSourceNode: AudioBufferSourceNode

  /** Controller for managing gain, pan, and other audio parameters. */
  protected controller: SoundController

  /**
   * Create a Sound instance.
   *
   * Note: Use {@link createSound} factory function instead of calling this directly.
   *
   * @param audioContext - The AudioContext to use for audio operations
   * @param audioBuffer - The decoded audio data to play
   * @param opts - Optional configuration (name, setTimeout override)
   */
  constructor(audioContext: AudioContext, private audioBuffer: AudioBuffer, opts?: any) {
    super(audioContext, opts)

    const audioSourceNode = audioContext.createBufferSource()
    audioSourceNode.buffer = audioBuffer

    this.audioSourceNode = audioSourceNode
    this.audioBuffer = audioBuffer
    this.controller = new SoundController(this.audioSourceNode, this.gainNode, this.pannerNode)
  }

  /**
   * Set up a new AudioBufferSourceNode for playback.
   * Called automatically before each play() - creates fresh source nodes
   * since AudioBufferSourceNode is single-use.
   * @protected
   */
  protected setup(): void {
    // Disconnect old source if exists (prevents memory leak from accumulated nodes)
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect()
        this.audioSourceNode.onended = null
      }
      catch {
        // Already disconnected, ignore
      }
    }

    // Create new source node (AudioBufferSourceNode is single-use)
    const audioSourceNode = this.audioContext.createBufferSource()
    audioSourceNode.buffer = this.audioBuffer
    this.audioSourceNode = audioSourceNode

    // Connect source to effect chain input
    this.wireConnections()
    this.controller.setValuesAtTimes()

    // Cleanup after playback ends to free memory
    audioSourceNode.onended = () => {
      try {
        audioSourceNode.disconnect()
        audioSourceNode.onended = null
      }
      catch {
        // Already disconnected
      }
    }
  }

  /**
   * Wire audio source to the effect chain input.
   * @protected
   */
  protected wireConnections(): void {
    // Chain: audioSourceNode -> effectChainInput -> [effects] -> gain -> panner -> destination
    this.audioSourceNode.connect(this.effectChainInput)
    // Effect chain is already wired (gain -> panner -> destination) in BaseSound
  }

  /**
   * Get the duration of the audio buffer.
   *
   * Returns a TimeObject with the duration in multiple formats:
   * - `raw`: Duration in seconds
   * - `string`: Formatted as 'MM:SS'
   * - `pojo`: Object with `minutes` and `seconds` properties
   *
   * @example
   * ```typescript
   * const sound = await createSound('song.mp3')
   * console.log(sound.duration.raw)    // 180.5
   * console.log(sound.duration.string) // '3:00'
   * console.log(sound.duration.pojo)   // { minutes: 3, seconds: 0 }
   * ```
   */
  public get duration(): TimeObject {
    const buffer = this.audioSourceNode.buffer
    if (buffer === null)
      return createTimeObject(0, 0, 0)
    const { duration } = buffer
    const min = Math.floor(duration / 60)
    const sec = duration % 60
    return createTimeObject(duration, min, sec)
  }
}
