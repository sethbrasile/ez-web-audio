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

  constructor(
    audioContext: AudioContext,
    options: EQOptions = {},
  ) {
    super(audioContext)

    // Create and configure three-band EQ
    this.lowFilter = audioContext.createBiquadFilter()
    this.lowFilter.type = 'lowshelf'
    this.lowFilter.frequency.value = options.lowFrequency ?? 200
    this.lowFilter.gain.value = options.low ?? 0

    this.midFilter = audioContext.createBiquadFilter()
    this.midFilter.type = 'peaking'
    this.midFilter.frequency.value = options.midFrequency ?? 1000
    this.midFilter.Q.value = options.midQ ?? 0.7
    this.midFilter.gain.value = options.mid ?? 0

    this.highFilter = audioContext.createBiquadFilter()
    this.highFilter.type = 'highshelf'
    this.highFilter.frequency.value = options.highFrequency ?? 3000
    this.highFilter.gain.value = options.high ?? 0

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
    return this.lowFilter.gain.value
  }

  set low(v: number) {
    this.lowFilter.gain.value = v
  }

  /** Mid band gain in dB */
  get mid(): number {
    return this.midFilter.gain.value
  }

  set mid(v: number) {
    this.midFilter.gain.value = v
  }

  /** High band gain in dB */
  get high(): number {
    return this.highFilter.gain.value
  }

  set high(v: number) {
    this.highFilter.gain.value = v
  }

  /** Low band crossover frequency in Hz */
  get lowFrequency(): number {
    return this.lowFilter.frequency.value
  }

  set lowFrequency(v: number) {
    this.lowFilter.frequency.value = v
  }

  /** Mid band center frequency in Hz */
  get midFrequency(): number {
    return this.midFilter.frequency.value
  }

  set midFrequency(v: number) {
    this.midFilter.frequency.value = v
  }

  /** High band crossover frequency in Hz */
  get highFrequency(): number {
    return this.highFilter.frequency.value
  }

  set highFrequency(v: number) {
    this.highFilter.frequency.value = v
  }

  /** Mid band Q factor (bandwidth) */
  get midQ(): number {
    return this.midFilter.Q.value
  }

  set midQ(v: number) {
    this.midFilter.Q.value = v
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
export function createEQ(audioContext: AudioContext, options?: EQOptions): EQEffect
export function createEQ(
  audioContextOrOptions?: AudioContext | EQOptions,
  options?: EQOptions,
): EQEffect {
  if (audioContextOrOptions !== undefined && typeof (audioContextOrOptions as AudioContext).createGain === 'function') {
    return new EQEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  return new EQEffect(getOrCreateAudioContext(), (audioContextOrOptions as EQOptions) ?? {})
}
