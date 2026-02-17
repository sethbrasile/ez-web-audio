export type ControlType = 'frequency' | 'gain' | 'detune' | 'pan'
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
  updateAudioSource: (source: any) => void
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
   * Currently exposes gain and pan. Additional AudioParam properties
   * (e.g., for spatial audio) should be added via mapped types in v2.
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

  public updateGainNode(gainNode: GainNode): void {
    gainNode.gain.value = this.gain
    this.gainNode = gainNode
  }

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

  public onPlaySet(type: ControlType): { to: (value: number) => { at: (time: number) => void, endingAt: (time: number, rampType?: RampType) => void } } {
    return {
      to: (value: number) => {
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

  public onPlayRamp(type: ControlType, rampType?: RampType): { from: (startValue: number) => { to: (endValue: number) => { in: (endTime: number) => void } } } {
    return {
      from: (startValue: number) => {
        return {
          to: (endValue: number) => {
            return {
              in: (endTime: number) => {
                this.onPlaySet(type).to(startValue)
                this.onPlaySet(type).to(endValue).endingAt(endTime, rampType)
              },
            }
          },
        }
      },
    }
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
      case 'exponential':
        param.exponentialRampToValueAtTime(value, time)
        break
      case 'linear':
        param.linearRampToValueAtTime(value, time)
        break
      default:
        throw new Error(`Unsupported ramp type: ${rampType}`)
    }
  }
}
