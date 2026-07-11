import { convertValue } from '@utils/convert-value'
import { validateGain, validatePan } from '@utils/validate-param'
import { ValidationError } from '../errors'

/**
 * Map of built-in control type names to their string literals.
 * @internal
 */
export interface ControlTypeMap {
  frequency: 'frequency'
  gain: 'gain'
  detune: 'detune'
  pan: 'pan'
}

/** Union of all control type names. */
export type ControlType = ControlTypeMap[keyof ControlTypeMap]

/**
 * Control types available on Sound and Track.
 *
 * Derived from {@link ControlTypeMap} (excluding 'frequency', since Sound/Track
 * instances play pre-recorded audio buffers which do not have a frequency
 * AudioParam) rather than hardcoded, so that module augmentation of
 * `ControlTypeMap` (see the "Extending ControlType" docs) actually extends
 * this type too — not just {@link ControlType} / {@link OscillatorControlType}.
 * Use {@link OscillatorControlType} for oscillator-specific parameters.
 */
export type SoundControlType = Exclude<ControlType, 'frequency'>

/**
 * Control types available on Oscillator (full set including frequency).
 *
 * Oscillator supports all built-in control types including 'frequency' for
 * real-time pitch control. Equivalent to {@link ControlType}.
 */
export type OscillatorControlType = ControlType
export type RatioType = 'ratio' | 'inverseRatio' | 'percent'
export type RampType = 'linear' | 'exponential'
export type SeekType = RatioType | 'seconds'
export interface ParamValue {
  type: ControlType
  value: number
}
export interface ValueAtTime extends ParamValue {
  time: number
}

/**
 * exponentialRampToValueAtTime cannot ramp to or from exactly 0 (Web Audio API
 * constraint): a 0 target throws a RangeError, and a 0 previous-event value
 * makes the param hold at 0 for the whole interval then jump to the target at
 * the end (an audible pop). This near-zero value approximates silence safely.
 * @internal
 */
const SAFE_NEAR_ZERO = 0.00001
/**
 * Contract for audio parameter controllers.
 *
 * SoundController and OscillatorController implement this interface to provide
 * fluent API access to audio parameters (gain, pan, frequency, detune).
 */
export interface ParamController {
  gain: number
  pan: number
  setValuesAtTimes: () => void
  updateAudioSource: (source: OscillatorNode | AudioBufferSourceNode) => void
  updateGainNode: (gainNode: GainNode) => void
  updatePannerNode: (pannerNode: StereoPannerNode) => void
  update: (type: ControlType) => {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  }
  onPlaySet: (type: ControlType) => {
    to: (value: number) => {
      at: (time: number) => void
      endingAt: (time: number, rampType?: RampType) => void
    }
  }
  onPlayRamp: (type: ControlType, rampType?: RampType) => {
    from: (startValue: number) => {
      to: (endValue: number) => {
        in: (endTime: number) => void
      }
    }
  }
}

/**
 * Duck-type interface for audio source nodes.
 *
 * Represents the minimum AudioParam surface needed by the controller system.
 * Both OscillatorNode and AudioBufferSourceNode satisfy this interface.
 * The `frequency` property is optional because only OscillatorNode has it.
 */
interface AudioSource {
  detune: AudioParam
  frequency?: AudioParam
}

/**
 * Shared base class for audio parameter automation.
 *
 * Provides the core fluent API implementation (update, onPlaySet, onPlayRamp)
 * and manages scheduled parameter changes. SoundController and OscillatorController
 * extend this class to add control-type-specific logic.
 */
export class BaseParamController {
  constructor(protected audioSource: AudioSource, protected gainNode: GainNode, protected pannerNode: StereoPannerNode) {}

  protected startingValues: ParamValue[] = []
  protected valuesAtTime: ValueAtTime[] = []
  protected exponentialValues: ValueAtTime[] = []
  protected linearValues: ValueAtTime[] = []

  /**
   * Current gain value (0-1 typical range).
   */
  public get gain(): number {
    return this.gainNode.gain.value
  }

  protected set gain(value: number) {
    this.gainNode.gain.value = value
  }

  public get pan(): number {
    return this.pannerNode.pan.value
  }

  protected set pan(value: number) {
    this.pannerNode.pan.value = value
  }

  /**
   * Replace the gain node, preserving the current gain value.
   * Called by Oscillator.setup() when recreating nodes for each play().
   *
   * @param gainNode - The new GainNode to use
   */
  public updateGainNode(gainNode: GainNode): void {
    gainNode.gain.value = this.gain
    this.gainNode = gainNode
  }

  /**
   * Replace the panner node, preserving the current pan value.
   * Called by Oscillator.setup() when recreating nodes for each play().
   *
   * @param pannerNode - The new StereoPannerNode to use
   */
  public updatePannerNode(pannerNode: StereoPannerNode): void {
    pannerNode.pan.value = this.pan
    this.pannerNode = pannerNode
  }

  /**
   * Carry the current detune value over to a replacement audio source node.
   *
   * Unlike gain/pan (which live on the persistent gain/panner nodes and
   * therefore survive node replacement automatically), detune lives on the
   * audioSource itself — the single-use OscillatorNode/AudioBufferSourceNode
   * that gets swapped out on every play(). Without this, `update('detune')`
   * would silently revert to 0 the next time the source node is replaced.
   * Mirrors the copy-before-swap pattern used by updateGainNode/updatePannerNode.
   * Call this BEFORE reassigning `this.audioSource` to the new node.
   *
   * @param newSource - The replacement audio source node
   * @protected
   */
  protected transferDetuneTo(newSource: AudioSource): void {
    if (newSource.detune) {
      newSource.detune.value = this.audioSource?.detune?.value ?? 0
    }
  }

  protected _update(type: ControlType, value: number): void {
    switch (type) {
      case 'pan':
        // Validated here (not just in changePanTo()) so update('pan').to() and
        // changePanTo() enforce the identical rule — previously only
        // changePanTo() warned on out-of-range pan (R1#1: "same instance, two
        // behaviors").
        validatePan(value)
        this.pan = value
        break
      case 'gain':
        // Same rationale as pan above: update('gain').to(-1) now throws the
        // same ValidationError changeGainTo(-1) does, instead of silently
        // writing a negative gain to the AudioParam.
        validateGain(value)
        this.gain = value
        break
      case 'detune':
        if (!this.audioSource.detune)
          throw new ValidationError('Audio source does not support detune. Only Oscillator instances support the \'detune\' control type.')
        this.audioSource.detune.value = value
        break
      default:
        throw new ValidationError(`Unsupported control type: '${type}'. Supported types: 'gain', 'pan', 'detune', 'frequency' (Oscillator only).`)
    }
  }

  /**
   * Update an audio parameter immediately.
   *
   * @param type - The parameter to update ('gain', 'pan', 'detune', or 'frequency')
   * @returns Fluent builder: `.to(value).as(unit)`
   *
   * @example
   * ```typescript
   * controller.update('gain').to(0.5).as('ratio')
   * controller.update('gain').to(50).as('percent')
   * ```
   */
  public update(type: ControlType): { to: (value: number) => { as: (method: RatioType) => void } } {
    return {
      to: (value: number) => {
        return {
          as: (method: RatioType) => {
            this._update(type, convertValue(value, method, type))
          },
        }
      },
    }
  }

  /**
   * Schedule a parameter value to be set when play() is called.
   *
   * @param type - The parameter to schedule
   * @returns Fluent builder: `.to(value).at(time)` or `.to(value).endingAt(time, rampType)`
   *
   * @remarks
   * Schedules set via onPlaySet() are consumed (cleared) after each
   * play() call by {@link clearScheduledValues}. Re-schedule before
   * each play() if you need repeated automation.
   *
   * Accumulate-vs-replace semantics differ by call shape: `.to(value)` alone
   * (no `.at()`/`.endingAt()`) REPLACES any prior un-timed schedule for the
   * same type — calling it twice before play() keeps only the latest value.
   * `.at(time)` and `.endingAt(time)` ACCUMULATE instead — each call pushes
   * a new timed/ramp event, so calling either twice before play() applies
   * both the stale and the new event on the next play(). Call
   * {@link onPlaySet} again per-type only once per play() cycle unless you
   * intend to schedule multiple timed events for that type.
   *
   * @example
   * ```typescript
   * // Set gain to 0 at start, ramp to 1 over 0.5s
   * controller.onPlaySet('gain').to(0).at(0)
   * controller.onPlaySet('gain').to(1).endingAt(0.5, 'linear')
   * ```
   */
  public onPlaySet(type: ControlType): { to: (value: number) => { at: (time: number) => void, endingAt: (time: number, rampType?: RampType) => void } } {
    return {
      to: (value: number) => {
        // Deduplicate: replace any prior startingValues entry for the same type so that
        // calling onPlaySet('gain').to(X) twice replaces rather than accumulates.
        // Only startingValues is filtered here — valuesAtTime/exponentialValues/linearValues
        // are managed by at()/endingAt() and must not be cleared.
        this.startingValues = this.startingValues.filter(v => v.type !== type)
        const paramValue: ParamValue = { type, value }
        this.startingValues.push(paramValue)
        return {
          at: (time: number) => {
            this.removeStartingValue(paramValue)
            this.valuesAtTime.push({ ...paramValue, time })
          },
          endingAt: (time: number, rampType: RampType = 'exponential') => {
            this.removeStartingValue(paramValue)
            this.addRampValue({ ...paramValue, time }, rampType)
          },
        }
      },
    }
  }

  /**
   * Schedule a parameter ramp when play() is called.
   *
   * @param type - The parameter to ramp
   * @param rampType - Ramp curve type ('linear' or 'exponential')
   * @returns Fluent builder: `.from(startValue).to(endValue).in(duration)`
   *
   * @example
   * ```typescript
   * // Fade out over 2 seconds
   * controller.onPlayRamp('gain', 'linear').from(1).to(0).in(2)
   * ```
   */
  public onPlayRamp(type: ControlType, rampType?: RampType): { from: (startValue: number) => { to: (endValue: number) => { in: (endTime: number) => void } } } {
    return {
      from: (startValue: number) => {
        return {
          to: (endValue: number) => {
            return {
              in: (endTime: number) => {
                const resolvedRampType = rampType ?? 'exponential'
                // An exponential ramp whose previous event value is exactly 0
                // never ramps — the spec holds the param at 0 for the whole
                // interval, then jumps to the target at the end (audible pop).
                // Clamp a 0 start to near-zero so the ramp is actually smooth.
                const safeStartValue = resolvedRampType === 'exponential' && startValue === 0
                  ? SAFE_NEAR_ZERO
                  : startValue
                // Push startValue directly to valuesAtTime (time 0) so it is
                // not filtered out by the dedup logic in onPlaySet().
                // This ensures setValueAtTime(startValue, startTime) is called
                // before the ramp when setValuesAtTimes() runs.
                this.valuesAtTime.push({ type, value: safeStartValue, time: 0 })
                this.addRampValue({ type, value: endValue, time: endTime }, resolvedRampType)
              },
            }
          },
        }
      },
    }
  }

  /**
   * Resolve a control type to its corresponding AudioParam.
   * Override in subclasses to add type-specific params (e.g., frequency for Oscillator).
   *
   * @param type - The control type to resolve
   * @returns The AudioParam corresponding to the control type
   * @throws {ValidationError} if the type is not supported by this controller
   * @protected
   */
  protected resolveParam(type: ControlType): AudioParam {
    switch (type) {
      case 'gain':
        return this.gainNode.gain
      case 'pan':
        return this.pannerNode.pan
      case 'detune':
        return this.audioSource.detune
      default:
        throw new ValidationError(`Unsupported control type: '${type}'. Supported types: 'gain', 'pan', 'detune'.`)
    }
  }

  /**
   * Apply a list of immediate parameter values at the current time.
   * Uses resolveParam() to map control types to AudioParams.
   *
   * @param values - Array of ParamValue to apply
   * @param currentTime - The audio context current time
   * @protected
   */
  protected applyValues(values: ParamValue[], currentTime: number): void {
    for (const item of values) {
      this.resolveParam(item.type).setValueAtTime(item.value, currentTime)
    }
  }

  /**
   * Apply a list of ramped parameter values relative to the current time.
   * Uses resolveParam() to map control types to AudioParams.
   *
   * @param values - Array of ValueAtTime to apply
   * @param currentTime - The audio context current time
   * @param rampType - The ramp curve type ('exponential' or 'linear')
   * @protected
   */
  protected applyRampValues(values: ValueAtTime[], currentTime: number, rampType: 'exponential' | 'linear'): void {
    for (const item of values) {
      const time = currentTime + item.time
      this.applyRampToParam(this.resolveParam(item.type), item.value, time, rampType)
    }
  }

  /**
   * Clamp any zero-valued startingValues/valuesAtTime entries that share a
   * control type with a pending exponential ramp, to SAFE_NEAR_ZERO.
   *
   * An exponentialRampToValueAtTime whose previous scheduled value is
   * exactly 0 holds the param at 0 for the entire ramp duration and then
   * jumps to the target right at the end — an audible pop. onPlayRamp()'s
   * `.from()` already guards this (see SAFE_NEAR_ZERO above), but the
   * documented two-call fade-in idiom —
   * `onPlaySet('gain').to(0).at(0)` followed by
   * `onPlaySet('gain').to(1).endingAt(1)` (default exponential) —
   * pushes a raw, unclamped 0 via `.at()` and reproduces the same pop.
   * Call this before applying startingValues/valuesAtTime so every path
   * into an exponential ramp is protected consistently.
   *
   * @see onPlaySet
   * @protected
   */
  protected clampPendingZeroBeforeExponentialRamp(): void {
    const exponentialTypes = new Set(this.exponentialValues.map(v => v.type))
    if (exponentialTypes.size === 0)
      return

    this.startingValues = this.startingValues.map(item =>
      (item.value === 0 && exponentialTypes.has(item.type))
        ? { ...item, value: SAFE_NEAR_ZERO }
        : item)

    this.valuesAtTime = this.valuesAtTime.map(item =>
      (item.value === 0 && exponentialTypes.has(item.type))
        ? { ...item, value: SAFE_NEAR_ZERO }
        : item)
  }

  /**
   * Clear all scheduled parameter arrays after they have been applied.
   *
   * Called at the end of setValuesAtTimes() in each controller subclass to ensure
   * that parameter schedules set via onPlaySet() and onPlayRamp() are consumed once
   * per play() call. If the same schedule is needed on every play, call onPlaySet()
   * or onPlayRamp() before each play() call.
   *
   * @see onPlaySet
   * @see onPlayRamp
   */
  protected clearScheduledValues(): void {
    this.startingValues = []
    this.valuesAtTime = []
    this.exponentialValues = []
    this.linearValues = []
  }

  private removeStartingValue(startValue: ParamValue): void {
    this.startingValues = this.startingValues.filter(item => item !== startValue)
  }

  private addRampValue(valueAtTime: ValueAtTime, rampType: RampType): void {
    switch (rampType) {
      case 'exponential':
        this.exponentialValues.push(valueAtTime)
        break
      case 'linear':
        this.linearValues.push(valueAtTime)
        break
      default:
        throw new ValidationError(`Unsupported ramp type: '${rampType}'. Supported types: 'linear', 'exponential'.`)
    }
  }

  /**
   * Apply a ramp to an AudioParam using the specified ramp type.
   * Shared helper to eliminate duplication between controllers.
   *
   * @param param - The AudioParam to apply the ramp to
   * @param value - The target value
   * @param time - The absolute audio context time to reach the target value
   * @param rampType - 'exponential' or 'linear' ramp
   * @protected
   */
  protected applyRampToParam(
    param: AudioParam,
    value: number,
    time: number,
    rampType: 'exponential' | 'linear',
  ): void {
    switch (rampType) {
      case 'exponential': {
        // exponentialRampToValueAtTime throws RangeError if value is 0 (Web Audio API constraint).
        // Use a near-zero value to approximate silence without throwing.
        const safeValue = value === 0 ? SAFE_NEAR_ZERO : value
        // exponentialRampToValueAtTime is undefined by spec when the ramp
        // crosses zero (the previous value and the target have opposite
        // sign) — e.g. a default-exponential pan ramp from -1 to 1. Fall
        // back to a linear ramp so the transition stays well-defined instead
        // of relying on unspecified engine behavior.
        const currentValue = param.value
        const crossesSign = currentValue !== 0 && safeValue !== 0 && Math.sign(currentValue) !== Math.sign(safeValue)
        if (crossesSign) {
          param.linearRampToValueAtTime(value, time)
        }
        else {
          param.exponentialRampToValueAtTime(safeValue, time)
        }
        break
      }
      case 'linear':
        param.linearRampToValueAtTime(value, time)
        break
      default:
        throw new ValidationError(`Unsupported ramp type: ${rampType}`)
    }
  }
}
