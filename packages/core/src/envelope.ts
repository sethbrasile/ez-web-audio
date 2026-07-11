/**
 * Options for configuring an ADSR envelope.
 *
 * @property attack - Duration in seconds to ramp from 0 to peak (1.0). Default: 0.01
 * @property decay - Duration in seconds to ramp from peak to sustain level. Default: 0.1
 * @property sustain - Amplitude level (0-1) held during sustain phase. Default: 0.7
 * @property release - Duration in seconds for release to silence. Default: 0.3
 */
export interface EnvelopeOptions {
  attack?: number
  decay?: number
  sustain?: number
  release?: number
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
 * - **Attack**: Ramp from 0 to peak (the sound's target gain, 1.0 by default)
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
 *   attack: 0.05,
 *   decay: 0.1,
 *   sustain: 0.7,
 *   release: 0.3
 * })
 *
 * // Apply on note start
 * envelope.applyTo(gainNode.gain, audioContext.currentTime)
 *
 * // Release on note end
 * envelope.triggerRelease(gainNode.gain, audioContext.currentTime)
 * ```
 */
export class Envelope {
  /** Duration in seconds to ramp from 0 to peak (1.0) */
  readonly attack: number

  /** Duration in seconds to ramp from peak to sustain level */
  readonly decay: number

  /** Amplitude level (0-1) held during sustain phase */
  readonly sustain: number

  /** Duration in seconds for release to silence */
  readonly release: number

  /** Whether the envelope is currently active (between applyTo and triggerRelease) */
  private _isActive: boolean = false

  /** The time when the current attack phase started */
  private _attackStartTime: number = 0

  /** The value the attack started from (for retriggering) */
  private _attackStartValue: number = 0

  /** The absolute peak the attack ramps to (the sound's target gain) */
  private _peak: number = 1

  /** The time when the current release phase started (set by triggerRelease) */
  private _releaseStartTime: number = 0

  /** The value the release ramp started from (for mid-release retriggering) */
  private _releaseStartValue: number = 0

  /** Whether a release ramp is currently the active phase (vs attack/decay/sustain) */
  private _isReleasing: boolean = false

  /**
   * Creates a new Envelope with the specified ADSR parameters.
   *
   * @param options - ADSR configuration options
   */
  constructor(options: EnvelopeOptions = {}) {
    this.attack = options.attack ?? 0.01
    this.decay = options.decay ?? 0.1
    this.sustain = clamp(options.sustain ?? 0.7, 0, 1)
    this.release = options.release ?? 0.3
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
   * @returns The estimated absolute envelope value (0 to peak)
   */
  estimateCurrentValue(currentTime: number): number {
    if (!this._isActive) {
      return 0
    }

    if (this._isReleasing) {
      const releaseElapsed = currentTime - this._releaseStartTime

      // Queried before the release actually started — shouldn't normally
      // happen, but hold at the release's starting value rather than
      // extrapolating backwards.
      if (releaseElapsed < 0) {
        return this._releaseStartValue
      }

      if (this.release < 0.001 || releaseElapsed >= this.release) {
        return 0
      }

      const releaseProgress = releaseElapsed / this.release
      // Linear interpolation from the release's starting value to zero,
      // matching the linearRampToValueAtTime(0, ...) scheduled by triggerRelease.
      return this._releaseStartValue * (1 - releaseProgress)
    }

    const timeSinceStart = currentTime - this._attackStartTime

    // Before attack started
    if (timeSinceStart < 0) {
      return 0
    }

    const attackEndTime = this.attack
    const decayEndTime = attackEndTime + this.decay
    const peak = this._peak
    const sustainValue = this.sustain * peak

    // During attack phase
    if (timeSinceStart < attackEndTime) {
      if (this.attack === 0) {
        return peak
      }
      const attackProgress = timeSinceStart / this.attack
      // Linear interpolation from start value to peak
      return (
        this._attackStartValue + (peak - this._attackStartValue) * attackProgress
      )
    }

    // During decay phase
    if (timeSinceStart < decayEndTime) {
      if (this.decay === 0) {
        return sustainValue
      }
      const decayProgress = (timeSinceStart - attackEndTime) / this.decay
      // Linear interpolation from peak to sustain level
      return peak - (peak - sustainValue) * decayProgress
    }

    // Sustain phase
    return sustainValue
  }

  /**
   * Applies the attack-decay-sustain phases to an AudioParam.
   *
   * Schedules:
   * 1. setValueAtTime(startValue, startTime) - Start from current value (0 for first trigger)
   * 2. linearRampToValueAtTime(peak, startTime + attackTime) - Attack to peak
   * 3. linearRampToValueAtTime(sustain * peak, startTime + attackTime + decayTime) - Decay to sustain
   *
   * If retriggering (envelope already active), cancels scheduled values and
   * starts the attack from the current estimated value to prevent clicks.
   *
   * @param gainParam - The AudioParam to schedule the envelope on (typically gainNode.gain)
   * @param startTime - The audio context time to start the envelope
   * @param peak - Absolute amplitude the attack ramps to — the sound's target gain (default: 1)
   */
  applyTo(gainParam: AudioParam, startTime: number, peak: number = 1): void {
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

    // Update state — a fresh attack/decay/sustain cycle begins here, so any
    // in-flight release phase this retrigger picked up from is now superseded.
    this._isActive = true
    this._isReleasing = false
    this._attackStartTime = startTime
    this._attackStartValue = startValue
    this._peak = peak

    // Attack: ramp to peak
    const attackEndTime = startTime + this.attack
    gainParam.linearRampToValueAtTime(peak, attackEndTime)

    // Decay: ramp to sustain level (scaled by peak)
    const decayEndTime = attackEndTime + this.decay
    gainParam.linearRampToValueAtTime(this.sustain * peak, decayEndTime)

    // Sustain: held at sustain level until triggerRelease() called
  }

  /**
   * Applies the release phase to an AudioParam.
   *
   * Cancels any in-progress attack/decay automation (preserving the current
   * value via cancelAndHoldAtTime) and schedules a linear ramp to zero over
   * the release duration. A linear ramp is used instead of setTargetAtTime
   * because setTargetAtTime is an asymptotic exponential that never reaches
   * zero — the residual amplitude causes an audible click when the oscillator
   * node is stopped, especially on smooth waveforms (sine, triangle).
   *
   * @param gainParam - The AudioParam to schedule the release on
   * @param startTime - The audio context time to start the release phase
   */
  triggerRelease(gainParam: AudioParam, startTime: number): void {
    // Cancel in-progress attack/decay while preserving current computed value.
    // cancelAndHoldAtTime freezes the param at whatever value the automation
    // would have computed at startTime — unlike cancelScheduledValues which
    // reverts to the last explicitly set value (causing clicks).
    const paramWithCancelAndHold = gainParam as AudioParamWithCancelAndHold
    let currentValue: number
    if (typeof paramWithCancelAndHold.cancelAndHoldAtTime === 'function') {
      paramWithCancelAndHold.cancelAndHoldAtTime(startTime)
      currentValue = this.estimateCurrentValue(startTime)
    }
    else {
      // Fallback: estimate current value and anchor manually
      currentValue = this.estimateCurrentValue(startTime)
      gainParam.cancelScheduledValues(startTime)
      gainParam.setValueAtTime(currentValue, startTime)
    }

    // Track release-phase state so a retrigger (applyTo) called before this
    // ramp has actually rendered picks up the correct decaying value instead
    // of jumping straight to 0. _isActive is intentionally NOT cleared
    // synchronously below (except for the instant-release case, which really
    // is done immediately) — clearing it here regardless of real elapsed time
    // previously let applyTo() treat an in-flight release as "fresh," writing
    // a competing setValueAtTime(0, ...) on top of the still-rendering ramp
    // and producing an audible click on stop-then-retrigger (C1).
    this._releaseStartTime = startTime
    this._releaseStartValue = currentValue
    this._isReleasing = true

    if (this.release < 0.001) {
      // Instant release — snaps to zero immediately, so it's genuinely
      // finished now; safe to mark inactive right away.
      gainParam.setValueAtTime(0, startTime)
      this._isActive = false
      this._isReleasing = false
    }
    else {
      // Linear ramp guarantees reaching exactly zero
      gainParam.linearRampToValueAtTime(0, startTime + this.release)
    }
  }
}
