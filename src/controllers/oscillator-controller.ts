import type { Envelope } from '../envelope'
import type { ControlType, ParamController, ParamValue, ValueAtTime } from './base-param-controller'
import { BaseParamController } from './base-param-controller'

/**
 * Parameter controller for Oscillator instances.
 *
 * Extends BaseParamController with frequency control and ADSR envelope support.
 * Created automatically by Oscillator's constructor.
 */
export class OscillatorController extends BaseParamController implements ParamController {
  private envelope?: Envelope

  constructor(private oscillator: OscillatorNode, protected gainNode: GainNode, protected pannerNode: StereoPannerNode) {
    super(oscillator, gainNode, pannerNode)
  }

  /**
   * Sets the envelope to be applied during playback.
   * @param envelope - The Envelope instance to use for ADSR control
   */
  public setEnvelope(envelope: Envelope): void {
    this.envelope = envelope
  }

  /**
   * Triggers the release phase of the envelope.
   * @param releaseTime - The audio context time to start the release phase
   */
  public triggerRelease(releaseTime: number): void {
    if (this.envelope) {
      this.envelope.release(this.gainNode.gain, releaseTime)
    }
  }

  /**
   * Replace the oscillator node (called on each play() since OscillatorNode is single-use).
   *
   * @param oscillator - The new OscillatorNode
   */
  public updateAudioSource(oscillator: OscillatorNode): void {
    this.oscillator = oscillator
  }

  protected _update(type: ControlType, value: number): void {
    switch (type) {
      case 'frequency':
        this.oscillator.frequency.value = value
        break
      default:
        super._update(type, value)
    }
  }

  /**
   * Apply all scheduled parameter values and envelope to the current audio nodes.
   * Called by Oscillator.setup() before each play().
   */
  public setValuesAtTimes(): void {
    const { oscillator: { context: { currentTime } } } = this

    // Apply envelope first (sets initial gain to 0, schedules attack-decay-sustain ramps)
    if (this.envelope) {
      this.envelope.applyTo(this.gainNode.gain, currentTime)
    }

    // Then apply other parameter automation
    this.applyValues(this.startingValues, currentTime)
    this.applyValues(this.valuesAtTime, currentTime)
    this.applyRampValues(this.exponentialValues, currentTime, 'exponential')
    this.applyRampValues(this.linearValues, currentTime, 'linear')
  }

  private applyValues(values: ParamValue[], currentTime: number): void {
    const { oscillator, gainNode } = this
    values.forEach((item) => {
      switch (item.type) {
        case 'frequency':
          oscillator.frequency.setValueAtTime(item.value, currentTime)
          break
        case 'gain':
          gainNode.gain.setValueAtTime(item.value, currentTime)
          break
        default:
          throw new Error(`Unsupported control type: '${item.type}'. Supported types for OscillatorController: 'gain', 'frequency'.`)
      }
    })
  }

  private applyRampValues(values: ValueAtTime[], currentTime: number, rampType: 'exponential' | 'linear'): void {
    const { oscillator, gainNode } = this
    values.forEach((item) => {
      const time = currentTime + item.time
      switch (item.type) {
        case 'frequency':
          this.applyRampToParam(oscillator.frequency, item.value, time, rampType)
          break
        case 'gain':
          this.applyRampToParam(gainNode.gain, item.value, time, rampType)
          break
        default:
          throw new Error(`Unsupported control type: '${item.type}'. Supported types for OscillatorController: 'gain', 'frequency'.`)
      }
    })
  }
}
