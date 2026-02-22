import type { RampType, SoundControlType } from '@controllers/base-param-controller'
import type { TimeObject } from '@utils/create-time-object'

export interface Playable {
  play: () => Promise<void>
  playAt: (time: number) => Promise<void>
  playIn: (when: number) => void
  playFor: (duration: number) => void
  playInAndStopAfter: (playIn: number, stopAfter: number) => void
  stop: () => Promise<void>
  stopIn: (seconds: number) => void
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

}
