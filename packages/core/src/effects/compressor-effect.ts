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

  constructor(
    audioContext: AudioContext,
    options: CompressorOptions = {},
  ) {
    super(audioContext)

    // Create and configure compressor
    this.compressorNode = audioContext.createDynamicsCompressor()
    this.compressorNode.threshold.value = options.threshold ?? -24
    this.compressorNode.ratio.value = options.ratio ?? 4
    this.compressorNode.knee.value = options.knee ?? 30
    this.compressorNode.attack.value = options.attack ?? 0.003
    this.compressorNode.release.value = options.release ?? 0.25

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
    return this.compressorNode.threshold.value
  }

  set threshold(v: number) {
    // M8: Clamp to valid range [-100, 0] dB
    this.compressorNode.threshold.value = Math.max(-100, Math.min(0, v))
  }

  /** Compression ratio (e.g., 4 = 4:1) */
  get ratio(): number {
    return this.compressorNode.ratio.value
  }

  set ratio(v: number) {
    // M8: Clamp to valid range [1, 20]
    this.compressorNode.ratio.value = Math.max(1, Math.min(20, v))
  }

  /** Knee width in dB */
  get knee(): number {
    return this.compressorNode.knee.value
  }

  set knee(v: number) {
    // M8: Clamp to valid range [0, 40] dB
    this.compressorNode.knee.value = Math.max(0, Math.min(40, v))
  }

  /** Attack time in seconds */
  get attack(): number {
    return this.compressorNode.attack.value
  }

  set attack(v: number) {
    // M8: Clamp to valid range [0, 1] seconds
    this.compressorNode.attack.value = Math.max(0, Math.min(1, v))
  }

  /** Release time in seconds */
  get release(): number {
    return this.compressorNode.release.value
  }

  set release(v: number) {
    // M8: Clamp to valid range [0, 1] seconds
    this.compressorNode.release.value = Math.max(0, Math.min(1, v))
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
