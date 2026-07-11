import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * Options for creating a CompressorEffect.
 */
export interface CompressorOptions {
  /** Threshold in dB above which compression starts (default: -24) */
  threshold?: number
  /** Compression ratio (default: 4). e.g., 4:1 means 4dB above threshold → 1dB output */
  ratio?: number
  /** Knee width in dB (default: 30). Wider knee = gentler transition */
  knee?: number
  /** Attack time in seconds (default: 0.003). How fast compression engages */
  attack?: number
  /** Release time in seconds (default: 0.25). How fast compression releases */
  release?: number
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
}

/**
 * CompressorEffect - Dynamics compression using the native DynamicsCompressorNode.
 *
 * Reduces the dynamic range of audio by attenuating signals above the threshold.
 * All parameters map 1:1 to the DynamicsCompressorNode API.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * import { createCompressor, createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('drums.mp3')
 * const comp = createCompressor({
 *   threshold: -24,
 *   ratio: 4,
 *   knee: 30,
 *   attack: 0.003,
 *   release: 0.25
 * })
 * sound.addEffect(comp)
 * sound.play()
 *
 * // Check gain reduction
 * console.log(comp.reduction) // -6.5 (dB)
 * ```
 */
export class CompressorEffect extends BaseEffect {
  private readonly compressorNode: DynamicsCompressorNode

  // Shadow state: setters smooth via setTargetAtTime, so node .value lags
  // the target — getters return these instead
  private _threshold!: number
  private _ratio!: number
  private _knee!: number
  private _attack!: number
  private _release!: number

  constructor(
    audioContext: AudioContext,
    options: CompressorOptions = {},
  ) {
    super(audioContext)

    // Create the compressor node first...
    this.compressorNode = audioContext.createDynamicsCompressor()

    // ...then initialize via the public setters (ctor-setter-parity) so
    // ctor values can't diverge from the setters' clamp ranges.
    this.threshold = options.threshold ?? -24
    this.ratio = options.ratio ?? 4
    this.knee = options.knee ?? 30
    this.attack = options.attack ?? 0.003
    this.release = options.release ?? 0.25

    // Wire effect chain: input -> compressor -> wetGain
    this.inputNode.connect(this.compressorNode)
    this.compressorNode.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /** Threshold in dB above which compression starts */
  get threshold(): number {
    return this._threshold
  }

  set threshold(v: number) {
    // M8: Clamp to valid range [-100, 0] dB
    this._threshold = this.clampThreshold(v)
    smoothParamSet(this.compressorNode.threshold, this._threshold, this.audioContext.currentTime)
  }

  /** Compression ratio (e.g., 4 = 4:1) */
  get ratio(): number {
    return this._ratio
  }

  set ratio(v: number) {
    // M8: Clamp to valid range [1, 20]
    this._ratio = this.clampRatio(v)
    smoothParamSet(this.compressorNode.ratio, this._ratio, this.audioContext.currentTime)
  }

  /** Knee width in dB */
  get knee(): number {
    return this._knee
  }

  set knee(v: number) {
    // M8: Clamp to valid range [0, 40] dB
    this._knee = this.clampKnee(v)
    smoothParamSet(this.compressorNode.knee, this._knee, this.audioContext.currentTime)
  }

  /** Attack time in seconds */
  get attack(): number {
    return this._attack
  }

  set attack(v: number) {
    // M8: Clamp to valid range [0, 1] seconds
    this._attack = this.clampAttack(v)
    smoothParamSet(this.compressorNode.attack, this._attack, this.audioContext.currentTime)
  }

  /** Release time in seconds */
  get release(): number {
    return this._release
  }

  set release(v: number) {
    // M8: Clamp to valid range [0, 1] seconds
    this._release = this.clampRelease(v)
    smoothParamSet(this.compressorNode.release, this._release, this.audioContext.currentTime)
  }

  /** Current gain reduction in dB (read-only). Useful for metering */
  get reduction(): number {
    return this.compressorNode.reduction
  }

  public override dispose(): void {
    try {
      this.compressorNode.disconnect()
    }
    catch { /* already disconnected */ }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'threshold': return this.compressorNode.threshold
      case 'ratio': return this.compressorNode.ratio
      case 'knee': return this.compressorNode.knee
      case 'attack': return this.compressorNode.attack
      case 'release': return this.compressorNode.release
      default: return null
    }
  }

  /**
   * ramp-setter-desync fix: rampTo() re-applies the same clamp each
   * property setter uses and updates the shadow field, so getters stay
   * honest after a ramp and the AudioParam can never receive an
   * out-of-range value the setter would have rejected.
   */
  protected override onParamRamped(param: string, value: number): number {
    switch (param) {
      case 'threshold':
        this._threshold = this.clampThreshold(value)
        return this._threshold
      case 'ratio':
        this._ratio = this.clampRatio(value)
        return this._ratio
      case 'knee':
        this._knee = this.clampKnee(value)
        return this._knee
      case 'attack':
        this._attack = this.clampAttack(value)
        return this._attack
      case 'release':
        this._release = this.clampRelease(value)
        return this._release
      default:
        return value
    }
  }

  private clampThreshold(v: number): number {
    return Math.max(-100, Math.min(0, v))
  }

  private clampRatio(v: number): number {
    return Math.max(1, Math.min(20, v))
  }

  private clampKnee(v: number): number {
    return Math.max(0, Math.min(40, v))
  }

  private clampAttack(v: number): number {
    return Math.max(0, Math.min(1, v))
  }

  private clampRelease(v: number): number {
    return Math.max(0, Math.min(1, v))
  }
}

/**
 * Factory function to create a CompressorEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param options - Optional compressor parameters
 * @returns A new CompressorEffect instance
 *
 * @example
 * ```typescript
 * // Zero-config (good defaults)
 * const comp = createCompressor()
 *
 * // With options
 * const comp2 = createCompressor({ threshold: -30, ratio: 8, attack: 0.001 })
 *
 * // With explicit AudioContext
 * const comp3 = createCompressor(audioContext, { threshold: -20 })
 * ```
 */
export function createCompressor(options?: CompressorOptions): CompressorEffect
export function createCompressor(audioContext: BaseAudioContext, options?: CompressorOptions): CompressorEffect
export function createCompressor(
  audioContextOrOptions?: BaseAudioContext | CompressorOptions,
  options?: CompressorOptions,
): CompressorEffect {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    return new CompressorEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new CompressorEffect(getOrCreateAudioContext(), (audioContextOrOptions as CompressorOptions) ?? {})
}
