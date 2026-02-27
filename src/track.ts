import type { TimeObject } from '@utils/create-time-object'
import type { SeekType } from './controllers/base-param-controller'
import type { TrackEventMap } from './events/event-types'
import createTimeObject from '@utils/create-time-object'
import { Sound } from './sound'
import withinRange from './utils/within-range'

/**
 * Music track with position tracking, pause/resume, and seeking.
 *
 * Track extends {@link Sound} with playback position awareness. Use Track for longer
 * audio files where users need to pause, resume, or seek to specific positions.
 * Each Track can only play once at a time (unlike Sound which allows overlap).
 *
 * @example
 * ```typescript
 * import { createTrack } from 'ez-web-audio'
 *
 * const track = await createTrack('song.mp3')
 * track.play()
 *
 * // Pause and resume
 * track.pause()
 * track.resume()
 *
 * // Seek to 30 seconds
 * track.seek(30).as('seconds')
 *
 * // Get current position
 * console.log(track.position)
 * // { raw: 30.5, string: '0:30', pojo: { minutes: 0, seconds: 30 } }
 *
 * // Check playback state
 * console.log(track.isPlaying)     // true
 * console.log(track.percentPlayed) // 15.5
 * ```
 */
export class Track extends Sound<TrackEventMap> {
  /** Stores the requestAnimationFrame ID for position tracking cleanup. */
  private rafId: number | null = null

  /** Counter for seek race condition prevention — last seek wins. */
  private _seekId = 0

  /**
   * Tracks whether the track was paused (vs. stopped).
   * Used by resume() to distinguish a paused state from a stopped state.
   * Fixes H-4: resume() at position 0 was impossible with the old `startOffset > 0` guard.
   * @private
   */
  private _isPaused = false

  /**
   * Get the current playback position.
   *
   * Returns a TimeObject with the position in multiple formats:
   * - `raw`: Position in seconds
   * - `string`: Formatted as 'MM:SS'
   * - `pojo`: Object with `minutes` and `seconds` properties
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   * track.play()
   *
   * // After playing for a while
   * console.log(track.position.raw)    // 65.5
   * console.log(track.position.string) // '1:05'
   * console.log(track.position.pojo)   // { minutes: 1, seconds: 5 }
   * ```
   */
  public get position(): TimeObject {
    const offset = this.startOffset
    const min = Math.floor(offset / 60)
    const sec = offset - min * 60
    return createTimeObject(offset, min, sec)
  }

  /**
   * Get the current playback position as a percentage (0-100).
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   * track.play()
   *
   * // Use for progress bar
   * progressBar.style.width = `${track.percentPlayed}%`
   * ```
   */
  public get percentPlayed(): number {
    const duration = this.duration.raw
    if (duration === 0)
      return 0
    return (this.startOffset / duration) * 100
  }

  /**
   * Hook called after playback starts.
   * Sets up the onended handler for natural completion detection and starts position tracking.
   * Fixes H-2: emits 'end' event on natural completion instead of swallowing it.
   * @protected
   */
  protected override _onPlaybackStarted(): void {
    this.audioSourceNode.onended = () => {
      // Cleanup: disconnect nodes to free memory
      try {
        this.audioSourceNode.disconnect()
        this.audioSourceNode.onended = null
      }
      catch {
        // Already disconnected
      }

      // Only handle natural completion — stop() sets _isPlaying=false BEFORE the node stops,
      // so if _isPlaying is still true here, this is a natural end (not a user-initiated stop).
      if (this._isPlaying) {
        this._isPlaying = false
        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: this.duration.raw,
        })
        // Reset position tracking state without re-emitting stop event
        this._resetPosition()
      }
    }
    this.later(this.trackPlayPosition.bind(this))
  }

  /**
   * Reset playback position to start and cancel position tracking.
   * Called on natural completion to clean up state without triggering stop events.
   * Extracted from onended handler for clarity (review finding M8).
   * @internal
   */
  private _resetPosition(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this._isPaused = false
    this.startOffset = 0
  }

  /**
   * Pause playback at the current position.
   *
   * The track remembers its position so it can be resumed later.
   * Emits a 'pause' event with the current playback position.
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   * track.play()
   *
   * // Pause after 5 seconds
   * setTimeout(() => track.pause(), 5000)
   *
   * // Listen for pause events
   * track.on('pause', (e) => {
   *   console.log('Paused at', e.detail.position)
   * })
   * ```
   */
  public pause(): void {
    // Cancel RAF first to prevent runaway loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this._isPlaying) {
      // Capture position before stopping
      const position = this.startOffset

      const node = this.audioSourceNode
      node.onended = function () {}
      node.stop()
      this._isPlaying = false
      this._isPaused = true

      // Emit pause event
      this.emit('pause', {
        time: this.audioContext.currentTime,
        source: this,
        position,
      })
    }
  }

  /**
   * Resume playback from the paused position.
   *
   * If the track was paused, resumes from where it left off.
   * Emits a 'resume' event with the playback position.
   * Fixes H-4: now works correctly even when paused at position 0.
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   * track.play()
   * track.pause()
   *
   * // Resume later
   * track.resume()
   *
   * // Listen for resume events
   * track.on('resume', (e) => {
   *   console.log('Resumed at', e.detail.position)
   * })
   * ```
   */
  public resume(): void {
    // Use _isPaused flag instead of startOffset > 0 to support resuming at position 0 (H-4)
    if (!this._isPlaying && this._isPaused) {
      this._isPaused = false

      // Emit resume event before starting
      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        position: this.startOffset,
      })

      // Use inherited play which will use startOffset
      void this.play().catch(() => {})
    }
  }

  /**
   * Stop playback and reset position to the beginning.
   *
   * Unlike pause(), stop() resets the playback position to 0.
   * The next play() will start from the beginning.
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   * track.play()
   *
   * // Stop and reset
   * await track.stop()
   * console.log(track.position.raw) // 0
   * ```
   */
  public override async stop(): Promise<void> {
    // Cancel RAF first to prevent runaway loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    this._isPaused = false
    this.startOffset = 0

    if (this._isPlaying) {
      this.audioSourceNode.onended = function () {}
      await super.stop()
    }
  }

  /**
   * Update startOffset using requestAnimationFrame for smooth position tracking.
   * Loop ends when playback stops or is paused.
   * @private
   */
  private trackPlayPosition(): void {
    const animate = (): void => {
      // Exit early if stopped (defensive check)
      if (!this._isPlaying) {
        this.rafId = null
        return
      }
      this.startOffset = this.startOffset + this.audioContext.currentTime - this.startedPlayingAt
      this.startedPlayingAt = this.audioContext.currentTime
      this.rafId = requestAnimationFrame(animate)
    }

    this.rafId = requestAnimationFrame(animate)
  }

  /**
   * Seek to a specific position in the track.
   *
   * Returns a fluent builder with `.as(type)` to specify the unit of the value:
   * - `'seconds'`: Absolute position in seconds
   * - `'percent'`: Percentage of total duration (0-100)
   * - `'ratio'`: Ratio of total duration (0-1)
   * - `'inverseRatio'`: Distance from end as ratio (0 = end, 1 = start)
   *
   * Emits a 'seek' event with the new and previous positions.
   * Fixes C-4: awaits stop() before setting new offset to prevent race condition.
   *
   * @param amount - The position value (meaning depends on the `.as()` type)
   * @returns Fluent builder with `.as(type)` method returning `Promise<void>`
   *
   * @example
   * ```typescript
   * const track = await createTrack('song.mp3')
   *
   * // For a track with 100 second duration, all of these seek to 90 seconds:
   * track.seek(90).as('seconds')
   * track.seek(90).as('percent')
   * track.seek(0.9).as('ratio')
   * track.seek(0.1).as('inverseRatio')
   *
   * // Listen for seek events
   * track.on('seek', (e) => {
   *   console.log('Seeked from', e.detail.previousPosition, 'to', e.detail.position)
   * })
   * ```
   */
  public seek(amount: number): { as: (type: SeekType) => Promise<void> } {
    const duration = this.duration.raw
    const previousPosition = this.startOffset

    const moveToOffset = async (offset: number): Promise<void> => {
      const seekId = ++this._seekId
      const _isPlaying = this._isPlaying
      const adjustedOffset = withinRange(offset, 0, duration)

      // L-3: Only proceed if position actually changed or track is playing
      if (adjustedOffset === this.startOffset && !_isPlaying)
        return

      if (_isPlaying) {
        await this.stop() // await ensures startOffset=0 completes before new offset is set (C-4)
        if (seekId !== this._seekId)
          return // superseded by newer seek
        this.startOffset = adjustedOffset
        this.later(() => this.play())
      }
      else {
        this.startOffset = adjustedOffset
      }

      // Emit seek event
      this.emit('seek', {
        time: this.audioContext.currentTime,
        source: this,
        position: adjustedOffset,
        previousPosition,
      })
    }

    return {
      as: (type: SeekType): Promise<void> => {
        switch (type) {
          case 'ratio':
            return moveToOffset(amount * duration)
          case 'percent':
            return moveToOffset(amount * duration * 0.01)
          case 'inverseRatio':
            return moveToOffset(duration - amount * duration)
          case 'seconds':
            return moveToOffset(amount)
        }
      },
    }
  }
}

export default Track
