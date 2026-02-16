import { BaseParamController } from './base-param-controller'
import type { ParamController, ParamValue, ValueAtTime } from './base-param-controller'

export class SoundController extends BaseParamController implements ParamController {
  constructor(private bufferSourceNode: AudioBufferSourceNode, protected gainNode: GainNode, protected pannerNode: StereoPannerNode) {
    super(bufferSourceNode, gainNode, pannerNode)
  }

  public updateAudioSource(source: AudioBufferSourceNode): void {
    this.bufferSourceNode = source
  }

  public setValuesAtTimes(): void {
    const { bufferSourceNode } = this
    const currentTime = bufferSourceNode.context.currentTime

    this.applyValues(this.startingValues, currentTime)
    this.applyValues(this.valuesAtTime, currentTime)
    this.applyRampValues(this.exponentialValues, currentTime, 'exponential')
    this.applyRampValues(this.linearValues, currentTime, 'linear')
  }

  private applyValues(values: ParamValue[], currentTime: number): void {
    values.forEach((item) => {
      switch (item.type) {
        case 'detune':
          this.bufferSourceNode.detune.setValueAtTime(item.value, currentTime)
          break
        case 'gain':
          this.gainNode.gain.setValueAtTime(item.value, currentTime)
          break
        default:
          throw new Error("Unsupported control type: '" + item.type + "'. Supported types for SoundController: 'gain', 'detune'.")
      }
    })
  }

  private applyRampValues(values: ValueAtTime[], currentTime: number, rampType: 'exponential' | 'linear'): void {
    values.forEach((item) => {
      const time = currentTime + item.time
      switch (item.type) {
        case 'detune':
          this.applyRampToParam(this.bufferSourceNode.detune, item.value, time, rampType)
          break
        case 'gain':
          this.applyRampToParam(this.gainNode.gain, item.value, time, rampType)
          break
        default:
          throw new Error("Unsupported control type: '" + item.type + "'. Supported types for SoundController: 'gain', 'detune'.")
      }
    })
  }
}
