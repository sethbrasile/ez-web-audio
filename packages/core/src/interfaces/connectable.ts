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
  audioSourceNode: OscillatorNode | AudioBufferSourceNode
  changePanTo: (value: number) => this
  changeGainTo: (value: number) => this
  /**
   * Update an audio parameter immediately: `update(type).to(value).as(method)`.
   *
   * Validation semantics (as of the R1#1 unification): `'gain'` throws a
   * {@link ValidationError} for negative values and warns on the console for
   * values above 1; `'pan'` warns for values outside [-1, 1] (the Web Audio
   * API clamps these automatically, so it is not an error). This is the same
   * validation `changeGainTo()`/`changePanTo()` apply — implementations route
   * both through the same underlying check (see `BaseParamController._update()`)
   * so `update('gain').to(-1).as('ratio')` and `changeGainTo(-1)` throw
   * identically. `'detune'` and `'frequency'` (Oscillator only) are not
   * range-validated.
   */
  update: (type: SoundControlType) => {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  }
}
