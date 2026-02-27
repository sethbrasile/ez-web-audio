import type { TimeObject } from '@utils/create-time-object'
import type { BaseSoundOptions } from './base-sound'
import type { BaseSoundEventMap } from './events/event-types'
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
export class Sound<TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> } = BaseSoundEventMap> extends BaseSound<TMap> {
  /** The underlying AudioBufferSourceNode that plays the audio. */
  public audioSourceNode: AudioBufferSourceNode

  /** Controller for managing gain, pan, and other audio parameters. */
  protected controller: SoundController

  /** Internal loop state. Applied to AudioBufferSourceNode on each play. */
  private _loop: boolean = false

  /**
   * Enable or disable native looping for this sound.
   *
   * When `loop` is true, the audio replays from the beginning when it reaches the end,
   * providing gapless looping via the native `AudioBufferSourceNode.loop` property.
   * Call `stop()` to end looped playback.
   *
   * @example
   * ```typescript
   * const sfx = await createSound('rain.mp3')
   * sfx.loop = true
   * sfx.play() // plays continuously until stop()
   *
   * // Stop looped playback
   * await sfx.stop()
   * ```
   */
  public get loop(): boolean {
    return this._loop
  }

  public set loop(value: boolean) {
    this._loop = value
  }

  /**
   * Returns whether this sound is set to loop. Used by BaseSound.playAt() to
   * skip the duration timeout when looping is enabled.
   * @protected
   */
  protected override get _isLooping(): boolean {
    return this._loop
  }

  /**
   * Create a Sound instance.
   *
   * Note: Use {@link createSound} factory function instead of calling this directly.
   *
   * @param audioContext - The AudioContext to use for audio operations
   * @param audioBuffer - The decoded audio data to play
   * @param opts - Optional configuration (name, setTimeout override)
   */
  constructor(audioContext: AudioContext, private audioBuffer: AudioBuffer, opts?: BaseSoundOptions) {
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
    audioSourceNode.loop = this._loop
    this.audioSourceNode = audioSourceNode

    // Restore the user's intended gain level in case a fadeOut() or other ramp
    // left gainNode.gain at 0 from the previous playback cycle.
    this.gainNode.gain.setValueAtTime(this._targetGain, this.audioContext.currentTime)

    // Update controller with new source node so scheduled detune/param automation targets the active node
    this.controller.updateAudioSource(audioSourceNode)

    // Connect source to effect chain input
    this.wireConnections()
    this.controller.setValuesAtTimes()
    // Note: onended cleanup is handled by BaseSound.playAt() to avoid overwrite chain (H-1 fix)
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
   * Get the duration of the audio buffer in seconds.
   *
   * Use this instead of `duration.raw` in performance-sensitive code paths
   * to avoid allocating a TimeObject.
   */
  public get durationRaw(): number {
    const buffer = this.audioSourceNode.buffer
    return buffer === null ? 0 : buffer.duration
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
    const raw = this.durationRaw
    if (raw === 0)
      return createTimeObject(0, 0, 0)
    const min = Math.floor(raw / 60)
    const sec = raw % 60
    return createTimeObject(raw, min, sec)
  }
}
