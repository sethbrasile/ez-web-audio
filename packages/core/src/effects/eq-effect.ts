import { smoothParamSet } from '@utils/param-smoothing'
import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * Options for creating an EQEffect.
 */
export interface EQOptions {
  /** Low band gain in dB (default: 0) */
  low?: number
  /** Mid band gain in dB (default: 0) */
  mid?: number
  /** High band gain in dB (default: 0) */
  high?: number
  /** Low band crossover frequency in Hz (default: 200) */
  lowFrequency?: number
  /** Mid band center frequency in Hz (default: 1000) */
  midFrequency?: number
  /** High band crossover frequency in Hz (default: 3000) */
  highFrequency?: number
  /** Mid band Q factor / bandwidth (default: 0.7) */
  midQ?: number
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
}

/**
 * EQEffect - Three-band equalizer using cascaded BiquadFilterNodes.
 *
 * Uses lowshelf (low), peaking (mid), and highshelf (high) filters for
 * independent control of three frequency bands. Gain values are in dB.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * import { createEQ, createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('music.mp3')
 * const eq = createEQ({ low: 3, mid: -2, high: 4 })
 * sound.addEffect(eq)
 * sound.play()
 *
 * // Real-time control
 * eq.low = 6    // Boost bass
 * eq.mid = 0    // Flat mids
 * eq.high = -3  // Cut highs
 * eq.rampTo('low', 0, 2)  // Smooth ramp back to flat over 2 seconds
 * ```
 */
export class EQEffect extends BaseEffect {
  private readonly lowFilter: BiquadFilterNode
  private readonly midFilter: BiquadFilterNode
  private readonly highFilter: BiquadFilterNode

  // Shadow state: setters smooth via setTargetAtTime, so node .value lags
  // the target — getters return these instead
  private _low: number
  private _mid: number
  private _high: number
  private _lowFrequency: number
  private _midFrequency: number
  private _highFrequency: number
  private _midQ: number

  constructor(
    audioContext: AudioContext,
    options: EQOptions = {},
  ) {
    super(audioContext)

    this._low = options.low ?? 0
    this._mid = options.mid ?? 0
    this._high = options.high ?? 0
    this._lowFrequency = options.lowFrequency ?? 200
    this._midFrequency = options.midFrequency ?? 1000
    this._highFrequency = options.highFrequency ?? 3000
    this._midQ = options.midQ ?? 0.7

    // Create and configure three-band EQ
    this.lowFilter = audioContext.createBiquadFilter()
    this.lowFilter.type = 'lowshelf'
    this.lowFilter.frequency.value = this._lowFrequency
    this.lowFilter.gain.value = this._low

    this.midFilter = audioContext.createBiquadFilter()
    this.midFilter.type = 'peaking'
    this.midFilter.frequency.value = this._midFrequency
    this.midFilter.Q.value = this._midQ
    this.midFilter.gain.value = this._mid

    this.highFilter = audioContext.createBiquadFilter()
    this.highFilter.type = 'highshelf'
    this.highFilter.frequency.value = this._highFrequency
    this.highFilter.gain.value = this._high

    // Wire effect chain: input -> low -> mid -> high -> wetGain
    this.inputNode.connect(this.lowFilter)
    this.lowFilter.connect(this.midFilter)
    this.midFilter.connect(this.highFilter)
    this.highFilter.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /** Low band gain in dB */
  get low(): number {
    return this._low
  }

  set low(v: number) {
    this._low = v
    smoothParamSet(this.lowFilter.gain, v, this.audioContext.currentTime)
  }

  /** Mid band gain in dB */
  get mid(): number {
    return this._mid
  }

  set mid(v: number) {
    this._mid = v
    smoothParamSet(this.midFilter.gain, v, this.audioContext.currentTime)
  }

  /** High band gain in dB */
  get high(): number {
    return this._high
  }

  set high(v: number) {
    this._high = v
    smoothParamSet(this.highFilter.gain, v, this.audioContext.currentTime)
  }

  /** Low band crossover frequency in Hz */
  get lowFrequency(): number {
    return this._lowFrequency
  }

  set lowFrequency(v: number) {
    this._lowFrequency = v
    smoothParamSet(this.lowFilter.frequency, v, this.audioContext.currentTime)
  }

  /** Mid band center frequency in Hz */
  get midFrequency(): number {
    return this._midFrequency
  }

  set midFrequency(v: number) {
    this._midFrequency = v
    smoothParamSet(this.midFilter.frequency, v, this.audioContext.currentTime)
  }

  /** High band crossover frequency in Hz */
  get highFrequency(): number {
    return this._highFrequency
  }

  set highFrequency(v: number) {
    this._highFrequency = v
    smoothParamSet(this.highFilter.frequency, v, this.audioContext.currentTime)
  }

  /** Mid band Q factor (bandwidth) */
  get midQ(): number {
    return this._midQ
  }

  set midQ(v: number) {
    this._midQ = v
    smoothParamSet(this.midFilter.Q, v, this.audioContext.currentTime)
  }

  public override dispose(): void {
    try {
      this.lowFilter.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.midFilter.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.highFilter.disconnect()
    }
    catch { /* already disconnected */ }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'low': return this.lowFilter.gain
      case 'mid': return this.midFilter.gain
      case 'high': return this.highFilter.gain
      case 'lowFrequency': return this.lowFilter.frequency
      case 'midFrequency': return this.midFilter.frequency
      case 'highFrequency': return this.highFilter.frequency
      case 'midQ': return this.midFilter.Q
      default: return null
    }
  }
}

/**
 * Factory function to create an EQEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param options - Optional EQ parameters
 * @returns A new EQEffect instance
 *
 * @example
 * ```typescript
 * // Zero-config (flat EQ)
 * const eq = createEQ()
 *
 * // With gain adjustments (dB)
 * const eq2 = createEQ({ low: 3, mid: -2, high: 4 })
 *
 * // With custom crossover frequencies
 * const eq3 = createEQ({ low: 3, lowFrequency: 150, midFrequency: 800, highFrequency: 4000 })
 *
 * // With explicit AudioContext
 * const eq4 = createEQ(audioContext, { low: 6 })
 * ```
 */
export function createEQ(options?: EQOptions): EQEffect
export function createEQ(audioContext: BaseAudioContext, options?: EQOptions): EQEffect
export function createEQ(
  audioContextOrOptions?: BaseAudioContext | EQOptions,
  options?: EQOptions,
): EQEffect {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    return new EQEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new EQEffect(getOrCreateAudioContext(), (audioContextOrOptions as EQOptions) ?? {})
}
