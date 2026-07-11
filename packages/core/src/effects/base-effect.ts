import type { Effect } from './index'
import { applyEqualPowerCrossfade } from '@utils/equal-power-crossfade'
import { TypedEventEmitter } from '../events/typed-event-emitter'

/**
 * Event map for BaseEffect instances.
 * Defined inline to avoid circular imports with event-types.ts.
 */
export interface BaseEffectEventMap {
  dispose: CustomEvent<{ source: BaseEffect }>
}

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
export abstract class BaseEffect extends TypedEventEmitter<BaseEffectEventMap> implements Effect {
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
  private _disposed = false

  constructor(audioContext: AudioContext) {
    super()
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

    // Apply initial mix (full wet by default) — instant, no signal yet
    this.applyMix(false)
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
   * If the parameter name is not recognized, this is a no-op (a `console.warn`
   * is emitted if the name is a real, documented effect property that just
   * isn't backed by a single AudioParam — see {@link getUnrampableParams}).
   *
   * **Single write path:** every ramped write is funneled through
   * {@link onParamRamped}, the same hook subclasses use to keep their shadow
   * getters honest. This guarantees `effect.someParam` reflects the ramp
   * target immediately after calling `rampTo()`, and that the exact same
   * validation/clamping a synchronous property-set would apply is also
   * applied to ramped writes — the AudioParam and the getter can never
   * diverge from each other.
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
    // L3: Guard against duration <= 0 — setTargetAtTime requires positive timeConstant
    if (duration <= 0) {
      if (param === 'mix') {
        this.mix = value // Use the setter for instant change (also respects bypass)
        return
      }
      const audioParam = this.getAudioParam(param)
      if (!audioParam) {
        this.warnIfUnrampable(param)
        return
      }
      const clamped = this.onParamRamped(param, value)
      audioParam.setValueAtTime(clamped, this.audioContext.currentTime)
      return
    }

    if (param === 'mix') {
      // H11: bypass locks the signal fully dry (see applyMix()). Ramping
      // mix must respect that lock too — always update the shadow value
      // (so the getter reflects the pending mix) but only touch the
      // wet/dry gain nodes when not bypassed, so a bypassed rampTo('mix')
      // can't audibly re-fade the wet path in.
      const clamped = Math.max(0, Math.min(1, value))
      this._mix = clamped
      if (!this._bypass) {
        const targetAngle = clamped * 0.5 * Math.PI
        const timeConstant = duration / 3
        const now = this.audioContext.currentTime
        this.wetGain.gain.setTargetAtTime(Math.sin(targetAngle), now, timeConstant)
        this.dryGain.gain.setTargetAtTime(Math.cos(targetAngle), now, timeConstant)
      }
      return
    }

    const audioParam = this.getAudioParam(param)
    if (!audioParam) {
      this.warnIfUnrampable(param)
      return
    }

    const clamped = this.onParamRamped(param, value)
    const timeConstant = duration / 3
    audioParam.setTargetAtTime(clamped, this.audioContext.currentTime, timeConstant)
  }

  /**
   * Hook invoked by `rampTo()` for every recognized non-`'mix'` parameter,
   * immediately before the value is written to the AudioParam.
   *
   * Subclasses that expose shadow-state getters (any param whose setter
   * uses `smoothParamSet`/clamping instead of a raw AudioParam) MUST
   * override this to:
   *   1. Apply the exact same validation/clamping their public setter uses
   *   2. Store the clamped value in the shadow field so the getter stays honest
   *   3. Return the clamped value
   *
   * `rampTo()` writes the value this hook returns to the AudioParam — so the
   * ramped path can never write (or report via the getter) a value the
   * synchronous setter would have rejected/clamped. Default: identity
   * passthrough (no shadow state to keep in sync).
   *
   * @param _param - The parameter name being ramped
   * @param value - The raw, caller-supplied target value
   * @returns The value actually written to the AudioParam (and getter)
   */
  protected onParamRamped(_param: string, value: number): number {
    return value
  }

  /**
   * Names of documented effect properties that are NOT backed by a single
   * AudioParam (e.g. WaveShaper curve swaps, multi-node comb/allpass
   * networks) and therefore cannot be smoothly ramped via `rampTo()`.
   * `rampTo()` warns instead of silently no-op-ing when called with one of
   * these names, so callers don't mistake "no-op" for "it worked."
   *
   * Default: none. Subclasses override where applicable.
   */
  protected getUnrampableParams(): readonly string[] {
    return []
  }

  private warnIfUnrampable(param: string): void {
    if (this.getUnrampableParams().includes(param)) {
      console.warn(
        `[ez-web-audio] rampTo("${param}", ...) is a no-op — "${param}" is not backed by a single AudioParam and cannot be smoothly ramped. Use the direct property setter instead.`,
      )
    }
  }

  /**
   * Disconnect all internal audio nodes and emit a 'dispose' event.
   *
   * **Subclass disposal contract:** Subclasses that create additional audio nodes
   * (e.g., BiquadFilterNode, DynamicsCompressorNode, WaveShaperNode) MUST override
   * dispose() to disconnect those nodes before calling super.dispose().
   *
   * @example
   * ```typescript
   * public override dispose(): void {
   *   try { this.myNode.disconnect() } catch { /* already disconnected *\/ }
   *   super.dispose()
   * }
   * ```
   *
   * Idempotent — safe to call multiple times.
   */
  public dispose(): void {
    if (this._disposed)
      return

    try {
      this.inputNode.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.outputNode.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.dryGain.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.wetGain.disconnect()
    }
    catch { /* already disconnected */ }

    // Emit dispose BEFORE silencing (matches BaseSound pattern)
    this.dispatchEvent(new CustomEvent('dispose', { detail: { source: this } }))
    this.dispatchEvent = () => false
    this._disposed = true
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
  private applyMix(smooth: boolean = true): void {
    applyEqualPowerCrossfade(
      this.dryGain,
      this.wetGain,
      this._mix,
      this._bypass,
      smooth ? this.audioContext.currentTime : undefined,
    )
  }
}
