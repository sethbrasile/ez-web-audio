import type { RatioType, SoundControlType } from '@controllers/base-param-controller'

/**
 * Interface for audio sources with parameter control and routing.
 *
 * Provides gain/pan control and audio parameter management via the fluent API.
 * The `update` method accepts {@link SoundControlType} ('gain', 'pan', 'detune').
 * Oscillator overrides this to also accept 'frequency'.
 */
export interface Connectable {
  percentGain: number
  audioSourceNode: AudioNode
  changePanTo: (value: number) => this
  changeGainTo: (value: number) => this
  update: (type: SoundControlType) => {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  }
}
