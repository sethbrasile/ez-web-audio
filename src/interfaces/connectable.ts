import type { ControlType, RatioType } from '@controllers/base-param-controller'

/**
 * Interface for audio sources with parameter control and routing.
 *
 * Provides gain/pan control and audio parameter management via the fluent API.
 */
export interface Connectable {
  percentGain: number
  audioSourceNode: AudioNode
  changePanTo: (value: number) => this
  changeGainTo: (value: number) => this
  update: (type: ControlType) => {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  }
}
