import type { Effect } from './index'
import { getOrCreateAudioContext } from '@/audio-context'
import { applyEqualPowerCrossfade } from '@utils/equal-power-crossfade'

/**
 * Minimal interface for external effects that can be wrapped.
 * Any effect with a connect() method can be wrapped to provide bypass/mix controls.
 */
export interface ExternalEffect {
  /**
   * Connect the effect's output to a destination node.
   * This is the minimum requirement for wrapping an external effect.
   */
  connect: (destination: AudioNode) => void
}

/**
 * EffectWrapper - Wraps external effects (like Tuna.js, custom WaveShaperNode, etc.)
 * to provide a standard Effect interface with bypass and wet/dry mix controls.
 *
 * External effects only need a connect() method to be wrapped. The wrapper creates
 * the necessary infrastructure for wet/dry mixing and bypass functionality.
 *
 * ## Supported Effect Types
 *
 * Supports three types of external effects:
 * 1. **Tuna.js effects** — Have an `input` AudioNode property
 * 2. **Native AudioNodes** — WaveShaperNode, ConvolverNode, etc.
 * 3. **Any object with connect()** — Minimum interface requirement
 *
 * Routing:
 * - Dry path: input -> dryGain -> output
 * - Wet path: input -> externalEffect -> wetGain -> output
 *
 * @example
 * ```typescript
 * // Wrap a Tuna.js effect
 * const tuna = new Tuna(audioContext)
 * const chorus = tuna.Chorus({ rate: 1.5 })
 * const wrapped = wrapEffect(audioContext, chorus)
 *
 * // Now use standard Effect interface
 * wrapped.bypass = true  // Bypass the effect
 * wrapped.mix = 0.5  // 50% wet/dry blend
 *
 * // Access original effect
 * wrapped.effect.rate = 2.0
 * ```
 */
export class EffectWrapper implements Effect {
  private readonly _effect: ExternalEffect
  private readonly inputNode: GainNode
  private readonly outputNode: GainNode
  private readonly dryGain: GainNode
  private readonly wetGain: GainNode

  private _bypass = false
  private _mix = 1

  constructor(audioContext: AudioContext, externalEffect: ExternalEffect) {
    this._effect = externalEffect

    // Create nodes for wet/dry mixing
    this.inputNode = audioContext.createGain()
    this.outputNode = audioContext.createGain()
    this.dryGain = audioContext.createGain()
    this.wetGain = audioContext.createGain()

    // Set up routing
    // Dry path: input -> dryGain -> output
    this.inputNode.connect(this.dryGain)
    this.dryGain.connect(this.outputNode)

    // Wet path: input -> externalEffect -> wetGain -> output
    // Note: We connect the input to wherever the external effect receives signal from
    // and have the external effect connect to our wetGain
    // Since external effects may have complex internal routing, we need to assume
    // they have an input node or we connect to them directly

    // Branch 1: Effects with an `input` property (e.g., Tuna.js effects)
    // Tuna effects expose an `input` AudioNode for receiving signal.
    // We detect this via duck-typing: check for .input.connect method.
    const effectWithInput = externalEffect as { input?: { connect?: (dest: AudioNode) => void } }
    if (effectWithInput.input && typeof effectWithInput.input.connect === 'function') {
      this.inputNode.connect(effectWithInput.input as AudioNode)
    }
    else if (typeof (externalEffect as { connect: (dest: AudioNode) => void }).connect === 'function' && 'disconnect' in externalEffect) {
      // Branch 2: Effects that ARE AudioNodes (e.g., WaveShaperNode, ConvolverNode)
      // Native AudioNodes have both connect() and disconnect() methods.
      // We detect this by checking for both methods (duck-typing).
      this.inputNode.connect(externalEffect as unknown as AudioNode)
    }

    // Connect external effect output to wetGain
    externalEffect.connect(this.wetGain)
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
    this._mix = Math.max(0, Math.min(1, v)) // Clamp to 0-1
    this.applyMix()
  }

  /**
   * Access the wrapped external effect for configuration.
   * This allows direct manipulation of the effect's native properties.
   */
  get effect(): ExternalEffect {
    return this._effect
  }

  /**
   * Apply wet/dry mix using equal-power crossfade.
   * Delegates to shared utility for consistent mixing across all effects.
   */
  private applyMix(): void {
    applyEqualPowerCrossfade(this.dryGain, this.wetGain, this._mix, this._bypass)
  }
}

/**
 * Factory function to wrap an external effect with the Effect interface.
 *
 * Use this for effects from libraries like Tuna.js, or custom AudioNodes like
 * WaveShaperNode that only have a connect() method.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param audioContextOrEffect - Either an AudioContext or the external effect
 * @param externalEffect - The external effect (when AudioContext is provided)
 * @returns A new EffectWrapper instance implementing the Effect interface
 *
 * @example
 * ```typescript
 * // Without AudioContext (recommended)
 * const wrapped = wrapEffect(distortion)
 *
 * // With explicit AudioContext (backwards compatible)
 * const wrapped = wrapEffect(audioContext, distortion)
 * ```
 */
export function wrapEffect(externalEffect: ExternalEffect): EffectWrapper
export function wrapEffect(audioContext: AudioContext, externalEffect: ExternalEffect): EffectWrapper
export function wrapEffect(
  audioContextOrEffect: AudioContext | ExternalEffect,
  externalEffect?: ExternalEffect,
): EffectWrapper {
  if (externalEffect !== undefined) {
    // Called as wrapEffect(audioContext, effect)
    return new EffectWrapper(audioContextOrEffect as AudioContext, externalEffect)
  }
  // Called as wrapEffect(effect)
  return new EffectWrapper(getOrCreateAudioContext(), audioContextOrEffect as ExternalEffect)
}

/**
 * Factory function to wrap any AudioNode into the Effect interface.
 *
 * This is a convenience for wrapping native Web Audio API nodes (WaveShaperNode,
 * ConvolverNode, etc.) that are already AudioNodes with connect/disconnect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param node - The AudioNode to wrap
 * @param audioContext - Optional AudioContext (uses shared context if omitted)
 * @returns A new EffectWrapper instance implementing the Effect interface
 *
 * @example
 * ```typescript
 * import { createEffect } from 'ez-web-audio'
 *
 * const distortion = audioContext.createWaveShaper()
 * distortion.curve = makeDistortionCurve(400)
 * const effect = createEffect(distortion)
 * sound.addEffect(effect)
 * ```
 */
export function createEffect(node: AudioNode, audioContext?: AudioContext): EffectWrapper {
  const ctx = audioContext ?? getOrCreateAudioContext()
  return new EffectWrapper(ctx, node as unknown as ExternalEffect)
}
