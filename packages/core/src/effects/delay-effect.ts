import { getOrCreateAudioContext } from '@/audio-context'
import { BaseEffect } from './base-effect'

/**
 * Options for creating a DelayEffect.
 */
export interface DelayOptions {
  /** Delay time in seconds (default: 0.3) */
  time?: number
  /** Feedback amount 0-0.99 (default: 0.4). Higher values = more repeats */
  feedback?: number
  /** Wet/dry mix 0-1 (default: 1) */
  mix?: number
  /** Maximum delay time in seconds (default: 2.0). Set at construction, read-only after */
  maxTime?: number
}

/**
 * DelayEffect - Echo/delay effect with configurable time, feedback, and wet/dry mix.
 *
 * Uses a DelayNode with a feedback loop to create repeating echoes.
 * Feedback is clamped to [0, 0.99] to prevent infinite volume growth.
 *
 * Extends BaseEffect for shared wet/dry mixing, bypass, and rampTo() functionality.
 *
 * @example
 * ```typescript
 * import { createDelay, createSound } from 'ez-web-audio'
 *
 * const sound = await createSound('guitar.mp3')
 * const delay = createDelay({ time: 0.3, feedback: 0.5, mix: 0.4 })
 * sound.addEffect(delay)
 * sound.play()
 *
 * // Real-time control
 * delay.time = 0.5
 * delay.feedback = 0.7
 * delay.rampTo('time', 0.1, 2) // Smooth ramp over 2 seconds
 * ```
 */
export class DelayEffect extends BaseEffect {
  private readonly delayNode: DelayNode
  private readonly feedbackGain: GainNode
  private readonly _maxTime: number

  constructor(
    audioContext: AudioContext,
    options: DelayOptions = {},
  ) {
    super(audioContext)

    this._maxTime = options.maxTime ?? 2.0

    // Create nodes
    this.delayNode = audioContext.createDelay(this._maxTime)
    this.feedbackGain = audioContext.createGain()

    // Configure
    this.delayNode.delayTime.value = options.time ?? 0.3
    this.feedbackGain.gain.value = Math.min(options.feedback ?? 0.4, 0.99)

    // Wire effect chain with feedback loop:
    // input -> delayNode -> feedbackGain -> delayNode (loop)
    //       -> delayNode -> wetGain -> output
    this.inputNode.connect(this.delayNode)
    this.delayNode.connect(this.feedbackGain)
    this.feedbackGain.connect(this.delayNode)
    this.delayNode.connect(this.wetGain)

    // Apply initial mix if provided
    if (options.mix !== undefined) {
      this.mix = options.mix
    }
  }

  /** Delay time in seconds */
  get time(): number {
    return this.delayNode.delayTime.value
  }

  set time(v: number) {
    // M9: Clamp to valid range [0, maxTime]
    this.delayNode.delayTime.value = Math.max(0, Math.min(this._maxTime, v))
  }

  /** Feedback amount (0-0.99). Higher values = more repeats */
  get feedback(): number {
    return this.feedbackGain.gain.value
  }

  set feedback(v: number) {
    this.feedbackGain.gain.value = Math.max(0, Math.min(0.99, v))
  }

  /** Maximum delay time in seconds (read-only, set at construction) */
  get maxTime(): number {
    return this._maxTime
  }

  public override dispose(): void {
    try {
      this.delayNode.disconnect()
    }
    catch { /* already disconnected */ }
    try {
      this.feedbackGain.disconnect()
    }
    catch { /* already disconnected */ }
    super.dispose()
  }

  protected getAudioParam(name: string): AudioParam | null {
    switch (name) {
      case 'time': return this.delayNode.delayTime
      case 'feedback': return this.feedbackGain.gain
      default: return null
    }
  }
}

/**
 * Factory function to create a DelayEffect.
 *
 * AudioContext is optional. If omitted, uses the shared library AudioContext.
 *
 * @param options - Optional delay parameters
 * @returns A new DelayEffect instance
 *
 * @example
 * ```typescript
 * // Without AudioContext (recommended)
 * const delay = createDelay({ time: 0.3, feedback: 0.5, mix: 0.4 })
 *
 * // With explicit AudioContext
 * const delay2 = createDelay(audioContext, { time: 0.5 })
 *
 * // Zero-config (good defaults)
 * const delay3 = createDelay()
 * ```
 */
export function createDelay(options?: DelayOptions): DelayEffect
export function createDelay(audioContext: BaseAudioContext, options?: DelayOptions): DelayEffect
export function createDelay(
  audioContextOrOptions?: BaseAudioContext | DelayOptions,
  options?: DelayOptions,
): DelayEffect {
  if (audioContextOrOptions instanceof BaseAudioContext) {
    // Called as createDelay(audioContext, options?)
    return new DelayEffect(audioContextOrOptions as AudioContext, options ?? {})
  }
  // Called as createDelay() or createDelay(options)
  return new DelayEffect(getOrCreateAudioContext(), (audioContextOrOptions as DelayOptions) ?? {})
}
