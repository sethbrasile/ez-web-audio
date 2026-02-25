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
 * Excludes 'frequency' since Sound/Track instances play pre-recorded audio
 * buffers which do not have a frequency AudioParam.
 * Use {@link OscillatorControlType} for oscillator-specific parameters.
 */
export type SoundControlType = 'gain' | 'pan' | 'detune'

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
  detune: {
    value: number
  }
  frequency?: {
    value: number
  }
  // Add other properties as needed
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

  protected _update(type: ControlType, value: number): void {
    switch (type) {
      case 'pan':
        this.pan = value
        break
      case 'gain':
        this.gain = value
        break
      case 'detune':
        if (!this.audioSource.detune)
          throw new Error('Audio source does not support detune. Only Oscillator instances support the \'detune\' control type.')
        this.audioSource.detune.value = value
        break
      default:
        throw new Error(`Unsupported control type: '${type}'. Supported types: 'gain', 'pan', 'detune', 'frequency' (Oscillator only).`)
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
            switch (method) {
              case 'ratio':
                this._update(type, value)
                break
              case 'inverseRatio':
                this._update(type, 1 - value)
                break
              case 'percent':
                this._update(type, value / 100)
                break
              default:
                throw new Error(`Unsupported ratio type: '${method}'. Supported types: 'ratio', 'inverseRatio', 'percent'.`)
            }
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
                // Push startValue directly to valuesAtTime (time 0) so it is
                // not filtered out by the dedup logic in onPlaySet().
                // This ensures setValueAtTime(startValue, startTime) is called
                // before the ramp when setValuesAtTimes() runs.
                this.valuesAtTime.push({ type, value: startValue, time: 0 })
                this.addRampValue({ type, value: endValue, time: endTime }, rampType ?? 'exponential')
              },
            }
          },
        }
      },
    }
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
        throw new Error(`Unsupported ramp type: '${rampType}'. Supported types: 'linear', 'exponential'.`)
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
        const SAFE_NEAR_ZERO = 0.00001
        const safeValue = value === 0 ? SAFE_NEAR_ZERO : value
        param.exponentialRampToValueAtTime(safeValue, time)
        break
      }
      case 'linear':
        param.linearRampToValueAtTime(value, time)
        break
      default:
        throw new Error(`Unsupported ramp type: ${rampType}`)
    }
  }
}
