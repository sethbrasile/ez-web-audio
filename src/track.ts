import type { TimeObject } from '@utils/create-time-object'
import createTimeObject from '@utils/create-time-object'
import { Sound } from './sound'
import type { SeekType } from './controllers/base-param-controller'
import withinRange from './utils/within-range'

/**
 * A class that represents a "track" of music, similar in concept to a track on
 * a CD or an MP3 player. Provides methods for tracking the play position of the
 * underlying {{#crossLink "AudioBuffer"}}{{/crossLink}}, and pausing/resuming.
 *
 * @class Track
 * @extends Sound
 */
export class Track extends Sound {
  /**
   * Stores the requestAnimationFrame ID for position tracking cleanup.
   * @private
   */
  private rafId: number | null = null

  /**
   * @property position Value is an object containing the current play position
   * of the audioBuffer in three formats. The three
   * formats are `raw`, `string`, and `pojo`.
   *
   * Play position of 6 minutes would be output as:
   *
   *     {
   *       raw: 360, // seconds
   *       string: '06:00',
   *       pojo: {
   *         minutes: 6,
   *         seconds: 0
   *       }
   *     }
   */
  public get position(): TimeObject {
    const offset = this.startOffset
    const min = Math.floor(offset / 60)
    const sec = offset - min * 60
    return createTimeObject(offset, min, sec)
  }

  /**
   * @property percentPlayed
   * Value is the current play position of the
   * audioBuffer, formatted as a percentage.
   */
  public get percentPlayed(): number {
    const ratio = this.startOffset / this.duration.raw
    return ratio * 100
  }

  /**
   * Hook called after playback starts (from any play method).
   * Sets up the onended handler and starts position tracking.
   *
   * @protected
   * @override
   */
  protected override _onPlaybackStarted(): void {
    this.audioSourceNode.onended = () => this.stop()
    this.later(this.trackPlayPosition.bind(this))
  }

  /**
   * @method pause
   * Pauses the audio source by stopping without
   * setting startOffset back to 0.
   *
   * Emits 'pause' event with the current playback position.
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

      // Emit pause event
      this.emit('pause', {
        time: this.audioContext.currentTime,
        source: this,
        position,
      })
    }
  }

  /**
   * @method resume
   * Resume playback from paused position.
   *
   * Emits 'resume' event with the current playback position.
   */
  public resume(): void {
    if (!this._isPlaying && this.startOffset > 0) {
      // Emit resume event before starting
      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        position: this.startOffset,
      })

      // Use inherited play which will use startOffset
      this.play()
    }
  }

  /**
   * @method stop
   * Stops the audio source and sets
   * startOffset to 0.
   */
  public override async stop(): Promise<void> {
    // Cancel RAF first to prevent runaway loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    this.startOffset = 0

    if (this._isPlaying) {
      this.audioSourceNode.onended = function () {}
      await super.stop()
    }
  }

  /**
   * @method trackPlayPosition
   * Sets up a `requestAnimationFrame` based loop that updates the
   * startOffset as `audioContext.currentTime` grows.
   * Loop ends when `_isPlaying` is false or when cancelled via stop/pause.
   */
  private trackPlayPosition(): void {
    const { audioContext, startedPlayingAt, startOffset } = this

    const animate = (): void => {
      // Exit early if stopped (defensive check)
      if (!this._isPlaying) {
        this.rafId = null
        return
      }
      this.startOffset = startOffset + audioContext.currentTime - startedPlayingAt
      this.rafId = requestAnimationFrame(animate)
    }

    this.rafId = requestAnimationFrame(animate)
  }

  /**
   * Gets the bufferSource and stops the initAudio,
   * changes it's play position, and restarts the audio.
   *
   * Emits 'seek' event with the new and previous playback positions.
   *
   * returns a pojo with the `from` method that `value` is curried to, allowing
   * one to specify which type of value is being provided.
   *
   * @example
   *     // for a Sound instance with a duration of 100 seconds, these will all
   *     // move the play position to 90 seconds.
   *     soundInstance.seek(0.9).from('ratio');
   *     soundInstance.seek(0.1).from('inverseRatio')
   *     soundInstance.seek(90).from('percent');
   *     soundInstance.seek(90).from('seconds');
   *
   * @param {number} amount The new play position value.
   */
  public seek(amount: number): { from: (type: SeekType) => void } {
    const duration = this.duration.raw
    const previousPosition = this.startOffset

    const moveToOffset = (offset: number): void => {
      const _isPlaying = this._isPlaying
      const adjustedOffset = withinRange(offset, 0, duration)

      if (_isPlaying) {
        this.stop()
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
      from: (type: SeekType) => {
        switch (type) {
          case 'ratio':
            moveToOffset(amount * duration)
            break
          case 'percent':
            moveToOffset(amount * duration * 0.01)
            break
          case 'inverseRatio':
            moveToOffset(duration - amount * duration)
            break
          case 'seconds':
            moveToOffset(amount)
            break
        }
      },
    }
  }
}

export default Track
