import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'

export interface SamplerOptions {
  name?: string
}

/**
 * Round-robin playback of multiple sounds.
 *
 * Sampler holds multiple Sound instances and automatically alternates between them
 * on each play() call. This creates realistic variation when playing repeated samples
 * (e.g., multiple recordings of the same drum hit).
 *
 * @example
 * ```typescript
 * import { createSampler } from 'ez-web-audio'
 *
 * // Load multiple kick drum samples for variation
 * const kick = await createSampler([
 *   'kick-1.mp3',
 *   'kick-2.mp3',
 *   'kick-3.mp3'
 * ])
 *
 * // Each play() uses the next sample in rotation
 * kick.play() // plays kick-1
 * kick.play() // plays kick-2
 * kick.play() // plays kick-3
 * kick.play() // back to kick-1
 * ```
 */
export class Sampler {
  constructor(sounds: (Playable & Connectable)[], opts?: SamplerOptions) {
    this.sounds = new Set<Playable & Connectable>(sounds)
    this.soundIterator = sounds.values()
    this.name = opts?.name || ''
  }

  /**
   * Optional name to aid in identification.
   */
  public name: string

  /**
   * Gain level applied to each sample when played.
   * This value is applied to the underlying Sound on every play() call,
   * overriding any per-sound gain customization.
   * @default 1
   */
  public gain: number = 1

  /**
   * Stereo pan position applied to each sample (-1 = left, 0 = center, 1 = right).
   * This value is applied to the underlying Sound on every play() call,
   * overriding any per-sound pan customization.
   * @default 0
   */
  public pan: number = 0

  /**
   * Iterator over the sounds Set for round-robin cycling.
   * @internal
   */
  private soundIterator: Iterator<Playable & Connectable>

  /**
   * Collection of sounds that are cycled through on each play.
   * @internal
   */
  protected sounds: Set<Playable & Connectable>

  /**
   * Play the next sound in the rotation immediately.
   *
   * @example
   * ```typescript
   * sampler.play() // plays sound 1
   * sampler.play() // plays sound 2
   * sampler.play() // plays sound 3 (then wraps to 1)
   * ```
   */
  public play(): void {
    this.getNextSound().play()
  }

  /**
   * Play the next sound in the rotation after a delay.
   *
   * @param seconds - Number of seconds from now to play the sound
   *
   * @example
   * ```typescript
   * sampler.playIn(0.5) // plays next sound in 0.5 seconds
   * ```
   */
  public playIn(seconds: number): void {
    this.getNextSound().playIn(seconds)
  }

  /**
   * Play the next sound at a specific AudioContext time.
   *
   * @param time - The AudioContext.currentTime value when to play
   *
   * @example
   * ```typescript
   * const startTime = audioContext.currentTime + 1
   * sampler.playAt(startTime) // plays next sound at exactly startTime
   * ```
   */
  public playAt(time: number): void {
    this.getNextSound().playAt(time)
  }

  /**
   * Get a readonly snapshot of the sampler's sounds.
   *
   * Returns a shallow copy as an array so callers can inspect which sounds
   * are loaded without mutating the internal Set.
   *
   * @returns Readonly array of sounds in the sampler
   *
   * @example
   * ```typescript
   * const sampler = await createSampler(['kick-1.mp3', 'kick-2.mp3'])
   * const sounds = sampler.getSounds()
   * console.log(sounds.length) // 2
   * ```
   */
  public getSounds(): readonly (Playable & Connectable)[] {
    return [...this.sounds]
  }

  /**
   * Get the next sound from the round-robin rotation.
   * When the iterator reaches the end, it automatically restarts.
   * @internal
   */
  private getNextSound(): Playable & Connectable {
    if (this.sounds.size === 0) {
      throw new Error('Sampler has no sounds. Add sounds before calling play().')
    }

    let soundIterator = this.soundIterator
    let nextSound

    nextSound = soundIterator.next()

    if (nextSound.done) {
      soundIterator = this.sounds.values()
      nextSound = soundIterator.next()
    }

    this.soundIterator = soundIterator

    return this.setGainAndPan(nextSound.value)
  }

  /**
   * Apply the sampler's gain and pan settings to a sound before playing.
   *
   * **Note:** This overwrites any per-sound gain/pan customization on every
   * play cycle. The Sampler applies its own gain and pan uniformly to whichever
   * sound plays next. If you need individual sound gain/pan, call
   * `getNextSound()` manually and set gain/pan after retrieval instead of
   * using `play()`.
   * @internal
   */
  private setGainAndPan(sound: Playable & Connectable): Playable & Connectable {
    sound.changeGainTo(this.gain)
    sound.changePanTo(this.pan)

    return sound
  }
}
