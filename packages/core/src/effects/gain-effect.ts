import type { Effect } from './index'
import { getOrCreateAudioContext } from '@/audio-context'

/**
 * GainEffect - A thin wrapper around GainNode that implements the Effect interface.
 *
 * For a single-node effect like GainEffect:
 * - `input` and `output` both point to the same GainNode
 * - `bypass` sets gain to 1.0 (passthrough), stores/restores the previous value
 * - `mix` controls how much of the effect is applied (0=passthrough, 1=full effect)
 * - `value` is the gain amount applied when not bypassed
 *
 * @example
 * ```typescript
 * const gain = createGainEffect(audioContext, 0.5)
 * gain.value = 0.8  // Set gain to 80%
 * gain.bypass = true  // Passthrough (gain becomes 1.0)
 * gain.bypass = false // Restore to 0.8
 * ```
 */
export class GainEffect implements Effect {
  private readonly gainNode: GainNode
  private _bypass = false
  private _mix = 1
  private _value: number

  constructor(audioContext: AudioContext, initialValue = 1.0) {
    this.gainNode = audioContext.createGain()
    this._value = initialValue
    this.gainNode.gain.value = initialValue
  }

  /** The input AudioNode (same as output for single-node effect) */
  get input(): AudioNode {
    return this.gainNode
  }

  /** The output AudioNode (same as input for single-node effect) */
  get output(): AudioNode {
    return this.gainNode
  }

  /** The gain value (0.0 to any positive number) */
  get value(): number {
    return this._value
  }

  set value(v: number) {
    this._value = v
    if (!this._bypass) {
      this.applyEffectiveGain()
    }
  }

  /**
   * When true, gain becomes 1.0 (passthrough).
   * When false, restores the previous gain value.
   */
  get bypass(): boolean {
    return this._bypass
  }

  set bypass(v: boolean) {
    this._bypass = v
    if (v) {
      // Bypass: set gain to 1.0 (passthrough)
      this.gainNode.gain.value = 1.0
    }
    else {
      // Restore effect
      this.applyEffectiveGain()
    }
  }

  /**
   * Wet/dry mix: 0 = passthrough (gain of 1.0), 1 = full effect.
   * Mix interpolates between 1.0 and the set value.
   */
  get mix(): number {
    return this._mix
  }

  set mix(v: number) {
    this._mix = Math.max(0, Math.min(1, v)) // Clamp to 0-1
    if (!this._bypass) {
      this.applyEffectiveGain()
    }
  }

  /**
   * Apply the effective gain based on mix level using equal-power crossfade.
   * Uses cosine/sine curves to avoid volume dip at the midpoint compared to linear.
   * When mix = 0: effectiveGain = 1 (passthrough — dry)
   * When mix = 1: effectiveGain = value (full effect — wet)
   */
  private applyEffectiveGain(): void {
    // Equal-power crossfade: constant power, no volume dip at midpoint
    const dryGain = Math.cos(this._mix * Math.PI / 2)
    const wetGain = Math.sin(this._mix * Math.PI / 2)
    const effectiveGain = dryGain * 1 + wetGain * this._value
    this.gainNode.gain.value = effectiveGain
  }
}

/**
 * Factory function to create a GainEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext
 * (created lazily on first use).
 *
 * @param initialValue - Initial gain value (default: 1.0). Pass AudioContext as first arg for backwards compatibility.
 * @returns A new GainEffect instance
 *
 * @example
 * ```typescript
 * // Without AudioContext (recommended)
 * const gain = createGainEffect(0.5)
 *
 * // With explicit AudioContext (backwards compatible)
 * const gain = createGainEffect(audioContext, 0.5)
 * ```
 */
export function createGainEffect(initialValue?: number): GainEffect
export function createGainEffect(audioContext: BaseAudioContext, initialValue?: number): GainEffect
export function createGainEffect(
  audioContextOrValue?: BaseAudioContext | number,
  initialValue?: number,
): GainEffect {
  if (audioContextOrValue === undefined || typeof audioContextOrValue === 'number') {
    // Called as createGainEffect() or createGainEffect(value)
    return new GainEffect(getOrCreateAudioContext(), audioContextOrValue ?? 1.0)
  }
  // Called as createGainEffect(audioContext, value?)
  return new GainEffect(audioContextOrValue as AudioContext, initialValue ?? 1.0)
}
