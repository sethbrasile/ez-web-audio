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
 * Type for AudioParam with optional cancelAndHoldAtTime method.
 * cancelAndHoldAtTime is available in Chrome/Edge but not all browsers.
 */
type AudioParamWithCancelAndHold = AudioParam & {
  cancelAndHoldAtTime?: (cancelTime: number) => AudioParam
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
 * Supports clickless retriggering: when a note is retriggered while the
 * envelope is still active, it picks up from the current value instead
 * of jumping to zero, preventing audible clicks.
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

  /** Whether the envelope is currently active (between applyTo and release) */
  private _isActive: boolean = false

  /** The time when the current attack phase started */
  private _attackStartTime: number = 0

  /** The value the attack started from (for retriggering) */
  private _attackStartValue: number = 0

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
  }

  /**
   * Whether the envelope is currently active (between applyTo and release).
   */
  get isActive(): boolean {
    return this._isActive
  }

  /**
   * Estimates the current envelope value at a given time.
   *
   * Used for retriggering to determine where to pick up from.
   * Returns 0 if envelope is not active.
   *
   * @param currentTime - The time to estimate the value at
   * @returns The estimated envelope value (0-1)
   */
  estimateCurrentValue(currentTime: number): number {
    if (!this._isActive) {
      return 0
    }

    const timeSinceStart = currentTime - this._attackStartTime

    // Before attack started
    if (timeSinceStart < 0) {
      return 0
    }

    const attackEndTime = this.attackTime
    const decayEndTime = attackEndTime + this.decayTime

    // During attack phase
    if (timeSinceStart < attackEndTime) {
      if (this.attackTime === 0) {
        return 1
      }
      const attackProgress = timeSinceStart / this.attackTime
      // Linear interpolation from start value to peak (1)
      return (
        this._attackStartValue + (1 - this._attackStartValue) * attackProgress
      )
    }

    // During decay phase
    if (timeSinceStart < decayEndTime) {
      if (this.decayTime === 0) {
        return this.sustainLevel
      }
      const decayProgress = (timeSinceStart - attackEndTime) / this.decayTime
      // Linear interpolation from peak (1) to sustain level
      return 1 - (1 - this.sustainLevel) * decayProgress
    }

    // Sustain phase
    return this.sustainLevel
  }

  /**
   * Applies the attack-decay-sustain phases to an AudioParam.
   *
   * Schedules:
   * 1. setValueAtTime(startValue, startTime) - Start from current value (0 for first trigger)
   * 2. linearRampToValueAtTime(1, startTime + attackTime) - Attack to peak
   * 3. linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime) - Decay to sustain
   *
   * If retriggering (envelope already active), cancels scheduled values and
   * starts the attack from the current estimated value to prevent clicks.
   *
   * @param gainParam - The AudioParam to schedule the envelope on (typically gainNode.gain)
   * @param startTime - The audio context time to start the envelope
   */
  applyTo(gainParam: AudioParam, startTime: number): void {
    let startValue = 0

    if (this._isActive) {
      // Retriggering - cancel existing automation and pick up from current value
      const paramWithCancelAndHold = gainParam as AudioParamWithCancelAndHold

      if (typeof paramWithCancelAndHold.cancelAndHoldAtTime === 'function') {
        // Chrome/Edge: cancelAndHoldAtTime preserves current value
        paramWithCancelAndHold.cancelAndHoldAtTime(startTime)
        startValue = this.estimateCurrentValue(startTime)
      }
      else {
        // Fallback: estimate current value manually
        startValue = this.estimateCurrentValue(startTime)
        gainParam.cancelScheduledValues(startTime)
      }
    }

    // Set starting value
    gainParam.setValueAtTime(startValue, startTime)

    // Update state
    this._isActive = true
    this._attackStartTime = startTime
    this._attackStartValue = startValue

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
   * @param startTime - The audio context time to start the release phase
   */
  release(gainParam: AudioParam, startTime: number): void {
    // Use setTargetAtTime for smooth exponential decay to zero
    // Time constant = releaseTime/5 gives ~99% completion in releaseTime seconds
    const timeConstant = this.releaseTime / 5
    gainParam.setTargetAtTime(0, startTime, timeConstant)

    // Mark envelope as inactive
    this._isActive = false
  }
}
