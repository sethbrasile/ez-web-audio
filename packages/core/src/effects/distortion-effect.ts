import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * Available distortion curve types.
 */
export type DistortionType = 'soft' | 'hard' | 'fuzz' | 'overdrive' | 'custom'

/**
 * Options for creating a DistortionEffect.
 */
export interface DistortionOptions {
  /** Distortion curve type (default: 'soft') */
  type?: DistortionType
  /** Distortion amount 0-100 (default: 50). Higher = more distortion */
  amount?: number
  /** Post-distortion tone control 0-1 (default: 0.5). 0 = dark, 1 = bright */
  tone?: number
  /** Oversampling to prevent aliasing (default: '4x') */
  oversample?: OverSampleType
  /** Custom waveshaper curve (only used when type is 'custom') */
  curve?: Float32Array<ArrayBuffer>
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
}

/** Number of samples in the waveshaper transfer curve. 1024 gives excellent fidelity at 43x less memory than 44100. */
const CURVE_SAMPLES = 1024

/**
 * Generate a waveshaper transfer curve for the given distortion type and amount.
 * @internal
 */
function generateCurve(type: DistortionType, amount: number): Float32Array<ArrayBuffer> {
  const samples = CURVE_SAMPLES
  const curve: Float32Array<ArrayBuffer> = new Float32Array(samples)
  const k = amount / 10

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1

    switch (type) {
      case 'soft':
        // Soft clipping via tanh — warm/tube character
        curve[i] = Math.tanh(k * x)
        break
      case 'hard':
        // Hard clipping — aggressive
        curve[i] = Math.max(-1, Math.min(1, (amount / 25) * x))
        break
      case 'fuzz': {
        // Aggressive sigmoid — heavy fuzz
        const fk = amount * 2
        curve[i] = ((3 + fk) * x * 20 * (Math.PI / 180)) / (Math.PI + fk * Math.abs(x))
        break
      }
      case 'overdrive':
        // Asymmetric soft clip — classic overdrive
        if (x < 0) {
          curve[i] = -Math.tanh(-x * k * 0.5)
        }
        else {
          curve[i] = Math.tanh(x * k)
        }
        break
      default:
        curve[i] = x
    }
  }
  return curve
}

/**
 * DistortionEffect - WaveShaper-based distortion with selectable curve types and tone control.
 *
 * Supports four built-in curve types (soft, hard, fuzz, overdrive) plus custom curves.
 * Includes a post-distortion tone control (lowpass filter) to shape the output.
 * Uses 4x oversampling by default to prevent aliasing artifacts.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * import { createDistortion, createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('guitar.mp3')
 * const dist = createDistortion({ type: 'overdrive', amount: 50, tone: 0.6, mix: 0.7 })
 * sound.addEffect(dist)
 * sound.play()
 *
 * // Real-time control
 * dist.amount = 80
 * dist.tone = 0.3  // Darker tone
 * dist.type = 'fuzz'  // Switch curve type
 * ```
 */
export class DistortionEffect extends BaseEffect {
  private readonly waveShaperNode: WaveShaperNode
  private readonly toneFilter: BiquadFilterNode
  private _type: DistortionType
  private _amount: number
  private _tone: number
  private _customCurve?: Float32Array<ArrayBuffer>

  constructor(
    audioContext: AudioContext,
    options: DistortionOptions = {},
  ) {
    super(audioContext)

    this._type = options.type ?? 'soft'
    this._amount = Math.max(0, Math.min(100, options.amount ?? 50))
    this._tone = Math.max(0, Math.min(1, options.tone ?? 0.5))

    // M5: Guard against 'custom' type without a curve
    if (this._type === 'custom' && !options.curve) {
      throw new Error('DistortionEffect: cannot set type to "custom" without providing a curve via constructor options.')
    }

    // Create nodes
    this.waveShaperNode = audioContext.createWaveShaper()
    this.toneFilter = audioContext.createBiquadFilter()

    // Configure waveshaper
    this.waveShaperNode.oversample = options.oversample ?? '4x'
    if (this._type === 'custom' && options.curve) {
      this._customCurve = options.curve
      this.waveShaperNode.curve = options.curve
    }
    else {
      this.waveShaperNode.curve = generateCurve(this._type, this._amount)
    }

    // Configure tone filter (lowpass) — instant, no signal yet
    this.toneFilter.type = 'lowpass'
    this.applyTone(false)

    // Wire effect chain: input -> waveshaper -> toneFilter -> wetGain
    this.inputNode.connect(this.waveShaperNode)
    this.waveShaperNode.connect(this.toneFilter)
    this.toneFilter.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /**
   * Distortion amount (0-100).
   *
   * **Known gap (M8):** this regenerates `waveShaperNode.curve` and swaps
   * it in synchronously. `curve` is a plain array property, not an
   * AudioParam, so it can't be smoothed with `setTargetAtTime` the way
   * every other effect parameter in this library is — the swap is a hard
   * discontinuity in the transfer function and can click if audio is
   * actively flowing through the waveshaper at the moment of the change.
   * A true fix requires either a dual-waveshaper crossfade (two
   * WaveShaperNodes summed through a short gain crossfade) or a
   * duck-under-swap-restore mix-gain ramp around the assignment — both
   * add a real chunk of new audio-graph machinery. Deliberately left
   * unfixed for this pass (documented gap, not silently dropped); use
   * `rampTo('mix', 0, ...)` / back up around a type or large amount change
   * if the click is audible in your context.
   */
  get amount(): number {
    return this._amount
  }

  set amount(v: number) {
    this._amount = Math.max(0, Math.min(100, v))
    if (this._type !== 'custom') {
      this.waveShaperNode.curve = generateCurve(this._type, this._amount)
    }
  }

  /**
   * Distortion curve type.
   *
   * **Known gap (M8):** same curve-swap click as {@link amount} — see its
   * JSDoc for the full explanation and workaround.
   */
  get type(): DistortionType {
    return this._type
  }

  set type(v: DistortionType) {
    // M5: Guard against 'custom' type without a curve
    if (v === 'custom' && !this._customCurve) {
      throw new Error('DistortionEffect: cannot set type to "custom" without providing a curve via constructor options.')
    }
    this._type = v
    if (v === 'custom' && this._customCurve) {
      this.waveShaperNode.curve = this._customCurve
    }
    else if (v !== 'custom') {
      this.waveShaperNode.curve = generateCurve(v, this._amount)
    }
  }

  /** Post-distortion tone control (0 = dark/200Hz, 1 = bright/8000Hz) */
  get tone(): number {
    return this._tone
  }

  set tone(v: number) {
    this._tone = Math.max(0, Math.min(1, v))
    this.applyTone()
  }

  /** Oversampling mode for aliasing prevention */
  get oversample(): OverSampleType {
    return this.waveShaperNode.oversample
  }

  set oversample(v: OverSampleType) {
    this.waveShaperNode.oversample = v
  }

  public override dispose(): void {
    try {
      this.waveShaperNode.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.toneFilter.disconnect()
    }
    catch { /* already disconnected */ }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'tone': return this.toneFilter.frequency
      default: return null
    }
  }

  /**
   * `amount` and `type` are documented DistortionEffect properties but
   * aren't backed by a single AudioParam (they swap `waveShaperNode.curve`
   * directly — see the M8 JSDoc on those setters) — rampTo() warns rather
   * than silently no-op-ing if called with either name.
   */
  protected override getUnrampableParams(): readonly string[] {
    return ['amount', 'type']
  }

  /**
   * ramp-setter-desync fix: `tone`'s public domain is 0-1 (mapped
   * exponentially to the toneFilter's Hz range by `applyTone()`), but
   * `getAudioParam('tone')` exposes the underlying Hz-valued AudioParam
   * directly — before this fix, `rampTo('tone', v, duration)` wrote the
   * raw 0-1 `v` straight into the Hz AudioParam (e.g. `rampTo('tone', 0.8,
   * 1)` set the filter to 0.8 Hz, not ~3.5kHz), silently diverging from
   * what `effect.tone = 0.8` actually does. This re-applies the exact same
   * clamp + Hz mapping the `tone` setter uses, so both paths agree.
   */
  protected override onParamRamped(param: string, value: number): number {
    if (param === 'tone') {
      this._tone = Math.max(0, Math.min(1, value))
      return 200 * 40 ** this._tone
    }
    return value
  }

  /**
   * Map tone 0-1 to lowpass frequency using exponential scale.
   * 0 = 200Hz (dark), 1 = 8000Hz (bright)
   */
  private applyTone(smooth: boolean = true): void {
    const freq = 200 * 40 ** this._tone
    if (smooth) {
      smoothParamSet(this.toneFilter.frequency, freq, this.audioContext.currentTime)
    }
    else {
      this.toneFilter.frequency.value = freq
    }
  }
}

/**
 * Factory function to create a DistortionEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param options - Optional distortion parameters
 * @returns A new DistortionEffect instance
 *
 * @example
 * ```typescript
 * // Zero-config (good defaults)
 * const dist = createDistortion()
 *
 * // With options
 * const dist2 = createDistortion({ type: 'overdrive', amount: 60, tone: 0.7, mix: 0.8 })
 *
 * // Custom curve
 * const dist3 = createDistortion({ type: 'custom', curve: myFloat32Array })
 *
 * // With explicit AudioContext
 * const dist4 = createDistortion(audioContext, { amount: 50 })
 * ```
 */
export function createDistortion(options?: DistortionOptions): DistortionEffect
export function createDistortion(audioContext: BaseAudioContext, options?: DistortionOptions): DistortionEffect
export function createDistortion(
  audioContextOrOptions?: BaseAudioContext | DistortionOptions,
  options?: DistortionOptions,
): DistortionEffect {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    return new DistortionEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new DistortionEffect(getOrCreateAudioContext(), (audioContextOrOptions as DistortionOptions) ?? {})
}
