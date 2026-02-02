import audioContextAwareTimeout from './utils/timeout'

/**
 * A single beat position in a rhythmic pattern.
 *
 * Beat represents one position in a drum machine lane. When active, it triggers
 * playback when its time comes. When inactive, it creates a rest (silence).
 * Beat tracks timing and provides properties for UI synchronization.
 *
 * @example
 * ```typescript
 * // Beats are typically created by BeatTrack, not directly
 * const track = await createBeatTrack(['snare.mp3'], { numBeats: 8 })
 *
 * // Toggle a beat on/off
 * track.beats[2].active = true
 * track.beats[2].active = false
 *
 * // Check if this beat was just played
 * if (beat.isPlaying) {
 *   // Highlight in UI
 * }
 * ```
 */
export interface BeatOptions {
  duration?: number
  playIn: (time: number) => void
  play: () => void
  setTimeout?: (fn: () => void, delayMillis: number) => number
}

export class Beat {
  constructor(audioContext: AudioContext, opts: BeatOptions) {
    this.parentPlayIn = opts.playIn
    this.parentPlay = opts.play
    this.duration = opts.duration || 100

    if (opts.setTimeout) {
      this.setTimeout = opts.setTimeout
    }
    else {
      const { setTimeout } = audioContextAwareTimeout(audioContext)
      this.setTimeout = setTimeout
    }
  }

  private parentPlayIn: ((time: number) => void)
  private parentPlay: (() => void)
  private setTimeout: (fn: () => void, delayMillis: number) => number

  /**
   * Whether this beat should play when triggered.
   * When false, the beat position becomes a rest (silence).
   * @default false
   */
  public active = false

  /**
   * Whether this beat's time position is currently active (playing or resting).
   * True for both active beats and rests during their time slot.
   * Automatically resets to false after `duration` milliseconds.
   * @default false
   */
  public currentTimeIsPlaying = false

  /**
   * Whether this beat is currently playing audio (only true for active beats).
   * Automatically resets to false after `duration` milliseconds.
   * Use this for visual feedback that should only appear when sound plays.
   * @default false
   */
  public isPlaying = false

  /**
   * How long (in milliseconds) the `isPlaying` flags stay true.
   * Useful for controlling visual feedback duration.
   * @default 100
   */
  public duration: number

  /**
   * Play this beat after a delay.
   *
   * Sets `isPlaying` and `currentTimeIsPlaying` to true after the offset elapses,
   * then resets them after `duration` milliseconds.
   *
   * @param offset - Number of seconds from now to play
   *
   * @example
   * ```typescript
   * beat.playIn(0.5) // plays in 0.5 seconds
   * ```
   */
  public playIn(offset = 0): void {
    const msOffset = offset * 1000

    this.parentPlayIn(offset)

    this.setTimeout(() => {
      this.isPlaying = true
      this.currentTimeIsPlaying = true
    }, msOffset)
  }

  /**
   * Play this beat after a delay, but only if active.
   *
   * If active, plays and sets `isPlaying` to true after the offset.
   * Always sets `currentTimeIsPlaying` to true (for UI beat indicators).
   *
   * @param offset - Number of seconds from now to play
   */
  public ifActivePlayIn(offset = 0): void {
    const msOffset = offset * 1000

    if (this.active) {
      this.parentPlayIn(offset)
      this.setTimeout(() => this.markPlaying(), msOffset)
    }

    this.setTimeout(() => this.markCurrentTimePlaying(), msOffset)
  }

  /**
   * Play this beat immediately.
   *
   * Sets `isPlaying` and `currentTimeIsPlaying` to true immediately,
   * then resets them after `duration` milliseconds.
   *
   * @example
   * ```typescript
   * beat.play() // plays immediately
   * ```
   */
  public play(): void {
    this.parentPlay()
    this.markPlaying()
    this.markCurrentTimePlaying()
  }

  /**
   * Play this beat immediately, but only if active.
   *
   * If active, plays and sets `isPlaying` to true.
   * Always sets `currentTimeIsPlaying` to true (for UI beat indicators).
   */
  public playIfActive(): void {
    if (this.active) {
      this.parentPlay()
      this.markPlaying()
    }

    this.markCurrentTimePlaying()
  }

  /**
   * Mark this beat as currently playing and schedule reset.
   * @internal
   */
  private markPlaying(): void {
    this.isPlaying = true
    this.setTimeout(() => this.isPlaying = false, this.duration)
  }

  /**
   * Mark this beat's time slot as active and schedule reset.
   * @internal
   */
  private markCurrentTimePlaying(): void {
    this.currentTimeIsPlaying = true
    this.setTimeout(() => this.currentTimeIsPlaying = false, this.duration)
  }
}

export default Beat
