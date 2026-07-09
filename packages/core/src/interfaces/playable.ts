import type { RampType, SoundControlType } from '@controllers/base-param-controller'
import type { TimeObject } from '@utils/create-time-object'

/**
 * Minimal contract for playable audio sources.
 *
 * This interface defines the core playback lifecycle methods shared by all
 * audio classes. Convenience methods like `fadeIn()`, `fadeOut()`, and `dispose()`
 * are available on {@link BaseSound} but are not part of this minimal contract,
 * as they depend on implementation details (gain ramping, node disconnection).
 */
export interface Playable {
  play: () => Promise<void>
  playAt: (time: number) => Promise<void>
  playIn: (when: number) => void
  playFor: (duration: number) => void
  playInAndStopAfter: (playIn: number, stopAfter: number) => void
  stop: () => Promise<void>
  stopIn: (seconds: number) => Promise<void>
  stopAt: (time: number) => Promise<void>
  isPlaying: boolean
  duration: TimeObject

  onPlaySet: (type: SoundControlType) => {
    to: (value: number) => {
      at: (time: number) => void
      endingAt: (time: number, rampType?: RampType) => void
    }
  }

  onPlayRamp: (type: SoundControlType, rampType?: RampType) => {
    from: (startValue: number) => {
      to: (endValue: number) => {
        in: (endTime: number) => void
      }
    }
  }

  /** Fade in over the given duration (seconds). Optional — available on BaseSound. */
  fadeIn?: (duration: number) => Promise<void>
  /** Fade out over the given duration (seconds) and stop. Optional — available on BaseSound. */
  fadeOut?: (duration: number) => Promise<void>
  /** Release all audio resources. Optional — available on BaseSound. */
  dispose?: () => void
}
