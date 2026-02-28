import type { Effect } from './index'
import { applyEqualPowerCrossfade } from '@utils/equal-power-crossfade'

/**
 * Abstract base class for audio effects that provides shared wet/dry mixing,
 * bypass, and parameter ramping functionality.
 *
 * Subclasses must:
 * 1. Call `super(audioContext)` in their constructor
 * 2. Wire their effect chain: `this.inputNode -> [effect nodes] -> this.wetGain`
 * 3. Implement `getAudioParam()` to map parameter names to AudioParams
 *
 * BaseEffect handles:
 * - Wet/dry mixing via equal-power crossfade
 * - Bypass (routes signal fully dry)
 * - `rampTo()` for smooth parameter transitions
 *
 * @example
 * ```typescript
 * class MyEffect extends BaseEffect {
 *   private readonly myNode: GainNode
 *
 *   constructor(audioContext: AudioContext) {
 *     super(audioContext)
 *     this.myNode = audioContext.createGain()
 *     this.inputNode.connect(this.myNode)
 *     this.myNode.connect(this.wetGain)
 *   }
 *
 *   protected getAudioParam(name: string): AudioParam | null {
 *     if (name === 'gain') return this.myNode.gain
 *     return null
 *   }
 * }
 * ```
 */
export abstract class BaseEffect implements Effect {
  /** @internal */
  protected readonly inputNode: GainNode
  /** @internal */
  protected readonly outputNode: GainNode
  /** @internal */
  protected readonly dryGain: GainNode
  /** @internal */
  protected readonly wetGain: GainNode
  /** @internal */
  protected readonly audioContext: AudioContext

  private _bypass = false
  private _mix = 1

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    this.dryGain = audioContext.createGain()
    this.wetGain = audioContext.createGain()

    // Dry path: input -> dryGain -> output
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet merge: wetGain -> output
    // Subclass wires: inputNode -> [effect chain] -> wetGain
    this.wetGain.connect(this.outputNode)

    // Apply initial mix (full wet by default)
    this.applyMix()
  }

  /** The input AudioNode (receives signal from chain) */
  get input(): AudioNode {
    return this.inputNode
  }

  /** The output AudioNode (sends signal to next in chain) */
  get output(): AudioNode {
    return this.outputNode
  }

  /**
   * When true, signal bypasses the effect entirely (100% dry).
   */
  get bypass(): boolean {
    return this._bypass
  }

  set bypass(v: boolean) {
    this._bypass = v
    this.applyMix()
  }

  /**
   * Wet/dry mix: 0 = fully dry (no effect), 1 = fully wet (all through effect).
   * Uses equal-power crossfade for natural mixing.
   */
  get mix(): number {
    return this._mix
  }

  set mix(v: number) {
    this._mix = Math.max(0, Math.min(1, v))
    this.applyMix()
  }

  /**
   * Get the AudioContext used by this effect.
   * Useful for external tools (e.g., LFO) that need the context.
   */
  public getAudioContext(): AudioContext {
    return this.audioContext
  }

  /**
   * Get a named AudioParam from this effect for external modulation.
   *
   * Delegates to the subclass's getAudioParam() implementation.
   * Returns null if the parameter name is not recognized.
   *
   * @param name - The parameter name (e.g., 'frequency', 'time', 'feedback')
   * @returns The AudioParam, or null if not recognized
   */
  public getParam(name: string): AudioParam | null {
    return this.getAudioParam(name)
  }

  /**
   * Smoothly ramp a parameter to a target value over a duration.
   *
   * Uses `AudioParam.setTargetAtTime` for glitch-free transitions.
   * If the parameter name is not recognized, this is a no-op.
   *
   * @param param - Parameter name (e.g., 'frequency', 'time', 'feedback')
   * @param value - Target value
   * @param duration - Ramp duration in seconds
   *
   * @example
   * ```typescript
   * delay.rampTo('time', 0.5, 2)      // Ramp delay time to 0.5s over 2 seconds
   * filter.rampTo('frequency', 800, 1) // Ramp cutoff to 800Hz over 1 second
   * ```
   */
  rampTo(param: string, value: number, duration: number): void {
    if (param === 'mix') {
      // Ramp wet/dry mix via gain nodes
      const targetAngle = Math.max(0, Math.min(1, value)) * 0.5 * Math.PI
      const timeConstant = duration / 3
      const now = this.audioContext.currentTime
      this.wetGain.gain.setTargetAtTime(Math.sin(targetAngle), now, timeConstant)
      this.dryGain.gain.setTargetAtTime(Math.cos(targetAngle), now, timeConstant)
      this._mix = Math.max(0, Math.min(1, value))
      return
    }

    const audioParam = this.getAudioParam(param)
    if (!audioParam)
      return

    const timeConstant = duration / 3
    audioParam.setTargetAtTime(value, this.audioContext.currentTime, timeConstant)
  }

  /**
   * Disconnect all internal audio nodes. Subclasses should override
   * to also disconnect effect-specific nodes (e.g., feedback loops).
   */
  public dispose(): void {
    try { this.inputNode.disconnect() } catch { /* already disconnected */ }
    try { this.outputNode.disconnect() } catch { /* already disconnected */ }
    try { this.dryGain.disconnect() } catch { /* already disconnected */ }
    try { this.wetGain.disconnect() } catch { /* already disconnected */ }
  }

  /**
   * Map a parameter name to its underlying AudioParam.
   * Subclasses implement this to expose their effect-specific parameters.
   *
   * @param name - The parameter name
   * @returns The AudioParam, or null if not recognized
   */
  protected abstract getAudioParam(name: string): AudioParam | null

  /**
   * Apply wet/dry mix using equal-power crossfade.
   * @internal
   */
  private applyMix(): void {
    applyEqualPowerCrossfade(this.dryGain, this.wetGain, this._mix, this._bypass)
  }
}
