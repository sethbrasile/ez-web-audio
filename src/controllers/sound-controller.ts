import type { ParamController } from './base-param-controller'
import { BaseParamController } from './base-param-controller'

/**
 * Parameter controller for Sound and Track instances.
 *
 * Manages gain and detune parameters. Created automatically by Sound's constructor.
 */
export class SoundController extends BaseParamController implements ParamController {
  constructor(private bufferSourceNode: AudioBufferSourceNode, protected gainNode: GainNode, protected pannerNode: StereoPannerNode) {
    super(bufferSourceNode, gainNode, pannerNode)
  }

  /**
   * Replace the audio source node (called on each play() since AudioBufferSourceNode is single-use).
   *
   * @param source - The new AudioBufferSourceNode
   */
  public updateAudioSource(source: OscillatorNode | AudioBufferSourceNode): void {
    this.bufferSourceNode = source as AudioBufferSourceNode
    this.audioSource = this.bufferSourceNode
  }

  /**
   * Apply all scheduled parameter values to the current audio nodes.
   * Called by Sound.setup() before each play().
   */
  public setValuesAtTimes(): void {
    const { bufferSourceNode } = this
    const currentTime = bufferSourceNode.context.currentTime

    this.applyValues(this.startingValues, currentTime)
    this.applyValues(this.valuesAtTime, currentTime)
    this.applyRampValues(this.exponentialValues, currentTime, 'exponential')
    this.applyRampValues(this.linearValues, currentTime, 'linear')
    this.clearScheduledValues()
  }
}
