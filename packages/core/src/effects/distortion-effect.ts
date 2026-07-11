import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { ValidationError } from '@/errors'
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
 * Total duration of the dual-waveshaper crossfade triggered on every
 * `amount`/`type` change — fast enough to feel instant on a knob, long
 * enough that the curve swap (which happens on the currently-silent/
 * fading-out node) is masked rather than heard as a click. Converted to a
 * `setTargetAtTime` time constant the same way every other smoothed
 * parameter in this library is (duration / 3 ≈ 95% settled by `duration`).
 */
const CURVE_CROSSFADE_DURATION = 0.015
const CURVE_CROSSFADE_TIME_CONSTANT = CURVE_CROSSFADE_DURATION / 3

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
  // M8: dual-waveshaper crossfade. `curve` is a plain array property, not an
  // AudioParam, so a synchronous swap on a single WaveShaperNode is a hard
  // discontinuity in the transfer function that clicks if audio is actively
  // flowing through it. Two WaveShaperNodes run in parallel, each feeding
  // its own GainNode into a shared sum point; a curve change writes the new
  // curve into the currently-inactive (silent-or-fading-out) node, then
  // crossfades the two gains over ~15ms so the swap itself is masked. See
  // {@link crossfadeToCurve} for the scheme.
  private readonly waveShaperNodeA: WaveShaperNode
  private readonly waveShaperNodeB: WaveShaperNode
  private readonly shaperGainA: GainNode
  private readonly shaperGainB: GainNode
  /** True when shaper A holds the currently-audible curve (target gain 1). */
  private _activeIsA = true
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
      throw new ValidationError('DistortionEffect: cannot set type to "custom" without providing a curve via constructor options.')
    }

    // Create nodes
    this.waveShaperNodeA = audioContext.createWaveShaper()
    this.waveShaperNodeB = audioContext.createWaveShaper()
    this.shaperGainA = audioContext.createGain()
    this.shaperGainB = audioContext.createGain()
    this.toneFilter = audioContext.createBiquadFilter()

    // Configure waveshapers (oversample kept in sync on both)
    this.waveShaperNodeA.oversample = options.oversample ?? '4x'
    this.waveShaperNodeB.oversample = options.oversample ?? '4x'

    const initialCurve = this._type === 'custom' && options.curve
      ? (this._customCurve = options.curve)
      : generateCurve(this._type, this._amount)

    // A starts active (full gain), B starts silent — B gets a curve written
    // to it the first time amount/type changes (crossfadeToCurve).
    this.waveShaperNodeA.curve = initialCurve
    this.shaperGainA.gain.value = 1
    this.shaperGainB.gain.value = 0

    // Configure tone filter (lowpass) — instant, no signal yet
    this.toneFilter.type = 'lowpass'
    this.applyTone(false)

    // Wire effect chain: input -> [shaperA, shaperB] -> [gainA, gainB] -> toneFilter -> wetGain
    this.inputNode.connect(this.waveShaperNodeA)
    this.inputNode.connect(this.waveShaperNodeB)
    this.waveShaperNodeA.connect(this.shaperGainA)
    this.waveShaperNodeB.connect(this.shaperGainB)
    this.shaperGainA.connect(this.toneFilter)
    this.shaperGainB.connect(this.toneFilter)
    this.toneFilter.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /**
   * Distortion amount (0-100).
   *
   * **M8 fix (dual-waveshaper crossfade):** `curve` is a plain array
   * property, not an AudioParam, so it can't be smoothed with
   * `setTargetAtTime` the way every other effect parameter in this library
   * is — a synchronous swap on a single WaveShaperNode is a hard
   * discontinuity in the transfer function and clicks if audio is actively
   * flowing through it. This setter instead writes the new curve into the
   * currently-inactive of two parallel WaveShaperNodes, then crossfades the
   * two nodes' gains over ~15ms via `setTargetAtTime` so the swap is masked
   * rather than heard. See {@link crossfadeToCurve}. The crossfade is
   * entirely internal — `amount` still isn't rampable via `rampTo()` (it's
   * not a single AudioParam), but ordinary synchronous sets like
   * `effect.amount = 80` are now click-free at knob-drag rates, including
   * rapid successive changes mid-crossfade.
   */
  get amount(): number {
    return this._amount
  }

  set amount(v: number) {
    this._amount = Math.max(0, Math.min(100, v))
    if (this._type !== 'custom') {
      this.crossfadeToCurve(generateCurve(this._type, this._amount))
    }
  }

  /**
   * Distortion curve type.
   *
   * **M8 fix:** same dual-waveshaper crossfade as {@link amount} — see its
   * JSDoc for the full explanation.
   */
  get type(): DistortionType {
    return this._type
  }

  set type(v: DistortionType) {
    // M5: Guard against 'custom' type without a curve
    if (v === 'custom' && !this._customCurve) {
      throw new ValidationError('DistortionEffect: cannot set type to "custom" without providing a curve via constructor options.')
    }
    this._type = v
    if (v === 'custom' && this._customCurve) {
      this.crossfadeToCurve(this._customCurve)
    }
    else if (v !== 'custom') {
      this.crossfadeToCurve(generateCurve(v, this._amount))
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
    return this.waveShaperNodeA.oversample
  }

  set oversample(v: OverSampleType) {
    this.waveShaperNodeA.oversample = v
    this.waveShaperNodeB.oversample = v
  }

  public override dispose(): void {
    try {
      this.waveShaperNodeA.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.waveShaperNodeB.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.shaperGainA.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.shaperGainB.disconnect()
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
   * aren't backed by a single AudioParam — they drive a curve swap on one
   * of two internal WaveShaperNodes, crossfaded via `crossfadeToCurve()`
   * (see the M8 JSDoc on those setters). That crossfade is internal
   * machinery, not something `rampTo()` can drive over an arbitrary caller
   * duration, so rampTo() warns rather than silently no-op-ing if called
   * with either name.
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

  /**
   * M8: dual-waveshaper crossfade — the click-free replacement for a
   * synchronous `waveShaperNode.curve = ...` swap.
   *
   * Writes `curve` into whichever of the two parallel WaveShaperNodes is
   * currently targeted silent (its gain is heading toward, or already at,
   * 0), then retargets both gains via `setTargetAtTime` so the
   * just-written node fades in while the previously-active one fades out.
   * Both nodes process the input in parallel at all times — only the gain
   * stage after each one determines what's audible, so writing a new curve
   * into the silent one never touches the signal path that's currently
   * live.
   *
   * **Rapid successive changes (knob drag):** each call flips
   * `_activeIsA` and retargets both gains from wherever they currently
   * are — `setTargetAtTime` retargeting is a native AudioParam operation
   * with no discontinuity, so a change that lands mid-crossfade just
   * smoothly redirects the in-flight fade rather than restarting or
   * glitching it. The one edge case this doesn't fully eliminate: if a
   * new change lands before the previous crossfade has settled, the node
   * that gets the new curve written to it may still carry some audible
   * gain (mid fade-out) — at normal knob-drag rates (well above the ~15ms
   * crossfade window) this doesn't happen in practice, and mid-crossfade
   * changes still leave the effect in a consistent, glitch-free-on-the-gain-
   * automation state either way.
   */
  private crossfadeToCurve(curve: Float32Array<ArrayBuffer>): void {
    const inactiveShaper = this._activeIsA ? this.waveShaperNodeB : this.waveShaperNodeA
    const inactiveGain = this._activeIsA ? this.shaperGainB : this.shaperGainA
    const activeGain = this._activeIsA ? this.shaperGainA : this.shaperGainB

    inactiveShaper.curve = curve

    const now = this.audioContext.currentTime
    inactiveGain.gain.setTargetAtTime(1, now, CURVE_CROSSFADE_TIME_CONSTANT)
    activeGain.gain.setTargetAtTime(0, now, CURVE_CROSSFADE_TIME_CONSTANT)

    this._activeIsA = !this._activeIsA
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
