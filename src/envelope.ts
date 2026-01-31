/**
 * Options for configuring an ADSR envelope.
 *
 * @property attackTime - Duration in seconds to ramp from 0 to peak (1.0). Default: 0.01
 * @property decayTime - Duration in seconds to ramp from peak to sustain level. Default: 0.1
 * @property sustainLevel - Amplitude level (0-1) held during sustain phase. Default: 0.7
 * @property releaseTime - Duration in seconds for release to silence. Default: 0.3
 */
export interface EnvelopeOptions {
  attackTime?: number
  decayTime?: number
  sustainLevel?: number
  releaseTime?: number
}

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * ADSR Envelope class for managing amplitude envelope scheduling.
 *
 * The envelope controls how a sound's amplitude evolves over time:
 * - **Attack**: Ramp from 0 to peak (1.0)
 * - **Decay**: Ramp from peak to sustain level
 * - **Sustain**: Hold at sustain level until release() called
 * - **Release**: Exponential decay to silence
 *
 * @example
 * ```typescript
 * const envelope = new Envelope({
 *   attackTime: 0.05,
 *   decayTime: 0.1,
 *   sustainLevel: 0.7,
 *   releaseTime: 0.3
 * })
 *
 * // Apply on note start
 * envelope.applyTo(gainNode.gain, audioContext.currentTime)
 *
 * // Release on note end
 * envelope.release(gainNode.gain, audioContext.currentTime)
 * ```
 */
export class Envelope {
  /** Duration in seconds to ramp from 0 to peak (1.0) */
  readonly attackTime: number

  /** Duration in seconds to ramp from peak to sustain level */
  readonly decayTime: number

  /** Amplitude level (0-1) held during sustain phase */
  readonly sustainLevel: number

  /** Duration in seconds for release to silence */
  readonly releaseTime: number

  /**
   * Creates a new Envelope with the specified ADSR parameters.
   *
   * @param options - ADSR configuration options
   */
  constructor(options: EnvelopeOptions = {}) {
    this.attackTime = options.attackTime ?? 0.01
    this.decayTime = options.decayTime ?? 0.1
    this.sustainLevel = clamp(options.sustainLevel ?? 0.7, 0, 1)
    this.releaseTime = options.releaseTime ?? 0.3

    // Freeze the object to make properties truly readonly at runtime
    Object.freeze(this)
  }

  /**
   * Applies the attack-decay-sustain phases to an AudioParam.
   *
   * Schedules:
   * 1. setValueAtTime(0, startTime) - Start from silence
   * 2. linearRampToValueAtTime(1, startTime + attackTime) - Attack to peak
   * 3. linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime) - Decay to sustain
   *
   * The sustain phase holds indefinitely until release() is called.
   *
   * @param gainParam - The AudioParam to schedule the envelope on (typically gainNode.gain)
   * @param startTime - The audio context time to start the envelope
   */
  applyTo(gainParam: AudioParam, startTime: number): void {
    // Start from silence
    gainParam.setValueAtTime(0, startTime)

    // Attack: ramp to peak (1.0)
    const attackEndTime = startTime + this.attackTime
    gainParam.linearRampToValueAtTime(1, attackEndTime)

    // Decay: ramp to sustain level
    const decayEndTime = attackEndTime + this.decayTime
    gainParam.linearRampToValueAtTime(this.sustainLevel, decayEndTime)

    // Sustain: held at sustainLevel until release() called
  }

  /**
   * Applies the release phase to an AudioParam.
   *
   * Uses setTargetAtTime for smooth exponential decay to zero.
   * The time constant is calculated as releaseTime/5, which gives
   * approximately 99% completion within releaseTime seconds.
   *
   * @param gainParam - The AudioParam to schedule the release on
   * @param releaseTime - The audio context time to start the release
   */
  release(gainParam: AudioParam, releaseTime: number): void {
    // Use setTargetAtTime for smooth exponential decay to zero
    // Time constant = releaseTime/5 gives ~99% completion in releaseTime seconds
    const timeConstant = this.releaseTime / 5
    gainParam.setTargetAtTime(0, releaseTime, timeConstant)
  }
}
