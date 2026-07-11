import type { Envelope } from '../envelope'
import type { ControlType, ParamController } from './base-param-controller'
import { BaseParamController } from './base-param-controller'

/**
 * Parameter controller for Oscillator instances.
 *
 * Extends BaseParamController with frequency control and ADSR envelope support.
 * Created automatically by Oscillator's constructor.
 */
export class OscillatorController extends BaseParamController implements ParamController {
  private envelope?: Envelope

  /** Absolute peak the envelope attack ramps to (the oscillator's target gain) */
  private envelopePeak: number = 1

  constructor(private oscillator: OscillatorNode, protected gainNode: GainNode, protected pannerNode: StereoPannerNode) {
    super(oscillator, gainNode, pannerNode)
  }

  /**
   * Sets the envelope to be applied during playback.
   * @param envelope - The Envelope instance to use for ADSR control
   * @param peak - Absolute amplitude the attack ramps to — the sound's target gain (default: 1)
   */
  public setEnvelope(envelope: Envelope, peak: number = 1): void {
    this.envelope = envelope
    this.envelopePeak = peak
  }

  /**
   * Triggers the release phase of the envelope.
   * @param releaseTime - The audio context time to start the release phase
   */
  public triggerRelease(releaseTime: number): void {
    if (this.envelope) {
      this.envelope.triggerRelease(this.gainNode.gain, releaseTime)
    }
  }

  /**
   * Replace the oscillator node (called on each play() since OscillatorNode is single-use).
   *
   * @param source - The new OscillatorNode
   */
  public updateAudioSource(source: OscillatorNode | AudioBufferSourceNode): void {
    this.transferDetuneTo(source)
    this.oscillator = source as OscillatorNode
    this.audioSource = this.oscillator
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

    // Apply envelope first (sets initial gain to 0, schedules attack-decay-sustain ramps
    // scaled to the oscillator's target gain)
    if (this.envelope) {
      this.envelope.applyTo(this.gainNode.gain, currentTime, this.envelopePeak)
    }

    // Then apply other parameter automation
    this.clampPendingZeroBeforeExponentialRamp()
    this.applyValues(this.startingValues, currentTime)
    this.applyValues(this.valuesAtTime, currentTime)
    this.applyRampValues(this.exponentialValues, currentTime, 'exponential')
    this.applyRampValues(this.linearValues, currentTime, 'linear')
    this.clearScheduledValues()
  }

  /**
   * Resolve a control type to its corresponding AudioParam.
   * Extends BaseParamController.resolveParam() with 'frequency' support.
   *
   * @param type - The control type to resolve
   * @returns The AudioParam corresponding to the control type
   * @protected
   */
  protected override resolveParam(type: ControlType): AudioParam {
    if (type === 'frequency') {
      return this.oscillator.frequency
    }
    return super.resolveParam(type)
  }
}
