import { get } from '@utils/prop-access'
import type { TimeObject } from '@utils/create-time-object'
import createTimeObject from '@utils/create-time-object'
import type { ControlType, RampType } from '@controllers/base-param-controller'
import { OscillatorController } from './controllers/oscillator-controller'
import type { BaseSoundOptions } from './base-sound'
import { BaseSound } from './base-sound'
import { Envelope, type EnvelopeOptions } from './envelope'

/**
 * Filter configuration for oscillator frequency shaping.
 */
export interface OscillatorFilterOptions {
  /** Filter cutoff frequency in Hz. */
  frequency?: number
  /** Filter Q factor (resonance). Higher values create more pronounced peaks. */
  q?: number
}

/** @deprecated Use OscillatorFilterOptions instead */
export type OscillatorOptsFilterValues = OscillatorFilterOptions

/**
 * Configuration options for creating an Oscillator.
 *
 * @example
 * ```typescript
 * const opts: OscillatorOptions = {
 *   frequency: 440,      // A4
 *   type: 'sawtooth',    // Rich harmonic content
 *   gain: 0.5,           // Half volume
 *   lowpass: {           // Filter out harsh highs
 *     frequency: 2000,
 *     q: 1
 *   },
 *   envelope: {          // ADSR for note shaping
 *     attack: 0.01,
 *     decay: 0.2,
 *     sustain: 0.5,
 *     release: 0.3
 *   }
 * }
 * ```
 */
export interface OscillatorOptions extends BaseSoundOptions {
  /** Starting offset in seconds (rarely used for oscillators). */
  startOffset?: number
  /** Base frequency in Hz (default: 440). */
  frequency?: number
  /** Detune in cents (100 cents = 1 semitone). */
  detune?: number
  /** Initial gain/volume (0-1). */
  gain?: number
  /** Waveform type: 'sine', 'square', 'sawtooth', or 'triangle'. */
  type?: OscillatorType
  /** Highpass filter - removes frequencies below cutoff. */
  highpass?: OscillatorFilterOptions
  /** Bandpass filter - allows frequencies near cutoff, attenuates others. */
  bandpass?: OscillatorFilterOptions
  /** Lowpass filter - removes frequencies above cutoff. */
  lowpass?: OscillatorFilterOptions
  /** Lowshelf filter - boosts/cuts frequencies below cutoff. */
  lowshelf?: OscillatorFilterOptions
  /** Highshelf filter - boosts/cuts frequencies above cutoff. */
  highshelf?: OscillatorFilterOptions
  /** Peaking filter - boosts/cuts frequencies around cutoff. */
  peaking?: OscillatorFilterOptions
  /** Notch filter - attenuates frequencies at cutoff. */
  notch?: OscillatorFilterOptions
  /** Allpass filter - shifts phase without changing amplitude. */
  allpass?: OscillatorFilterOptions
  /** ADSR envelope for amplitude shaping. */
  envelope?: EnvelopeOptions
}

/** @deprecated Use OscillatorOptions instead */
export type OscillatorOpts = OscillatorOptions

const FILTERS = [
  'highpass',
  'bandpass',
  'lowpass',
  'lowshelf',
  'highshelf',
  'peaking',
  'notch',
  'allpass',
]

/**
 * Synthesizer that generates audio from oscillator waveforms.
 *
 * Oscillator creates sound from scratch using sine, square, sawtooth, or triangle
 * waves. Supports ADSR envelopes for professional-quality synthesis, filters for
 * tone shaping, and all the gain/pan controls from {@link BaseSound}.
 *
 * Unlike {@link Sound} which plays pre-recorded audio, Oscillator generates audio
 * in real-time. Oscillators have infinite duration and must be explicitly stopped.
 *
 * @example
 * ```typescript
 * import { createOscillator } from 'ez-web-audio'
 *
 * // Simple sine wave at 440Hz (A4)
 * const synth = await createOscillator({ frequency: 440, type: 'sine' })
 * synth.play()
 * setTimeout(() => synth.stop(), 500)
 *
 * // With ADSR envelope for piano-like decay
 * const piano = await createOscillator({
 *   frequency: 440,
 *   type: 'triangle',
 *   envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 }
 * })
 * piano.play()
 * setTimeout(() => piano.stop(), 500) // Release phase plays after stop
 *
 * // With lowpass filter
 * const muted = await createOscillator({
 *   frequency: 440,
 *   type: 'sawtooth',
 *   lowpass: { frequency: 800, q: 1 }
 * })
 * muted.play()
 * ```
 */
export class Oscillator extends BaseSound {
  /** The underlying OscillatorNode that generates the audio signal. */
  public audioSourceNode: OscillatorNode

  /** Array of BiquadFilterNodes for frequency filtering. */
  private filters: BiquadFilterNode[] = []

  /** Oscillator waveform type (sine, square, sawtooth, triangle). */
  private type: OscillatorType

  /** Base frequency in Hz. */
  protected freq: number

  /** Controller for managing gain, pan, frequency, and detune parameters. */
  protected controller: OscillatorController

  /** Optional ADSR envelope for amplitude shaping. */
  private envelope?: Envelope

  /**
   * Create an Oscillator instance.
   *
   * Note: Use {@link createOscillator} factory function instead of calling this directly.
   *
   * @param audioContext - The AudioContext to use for audio operations
   * @param options - Oscillator configuration (frequency, type, filters, envelope)
   */
  constructor(audioContext: AudioContext, options?: OscillatorOptions) {
    super(audioContext, options)
    this.type = options?.type || 'sine'
    this.freq = options?.frequency || 440

    if (this.freq <= 0) {
      throw new Error("Oscillator frequency must be greater than 0. Received: " + this.freq)
    }

    // This is just to keep the null checks down, this oscillator instance will never be used
    // Because it's created again when connections are established in wireConnections
    this.audioSourceNode = audioContext.createOscillator()
    this.controller = new OscillatorController(this.audioSourceNode, this.gainNode, this.pannerNode)

    if (options && options.gain !== undefined)
      this.changeGainTo(options.gain)

    // Create envelope if options provided
    if (options?.envelope) {
      this.envelope = new Envelope(options.envelope)
    }

    FILTERS.forEach((filter) => {
      const vals = get<OscillatorFilterOptions | undefined>(options, filter)
      if (vals) {
        const filterNode = audioContext.createBiquadFilter()
        filterNode.type = filter as any
        filterNode.frequency.setValueAtTime(vals.frequency || 440, audioContext.currentTime)
        filterNode.Q.setValueAtTime(vals.q || 1, audioContext.currentTime)
        this.filters.push(filterNode)
      }
    })
  }

  /**
   * Schedule a parameter value to be set when play() is called.
   *
   * Oscillator supports additional parameters beyond Sound:
   * - 'gain': Volume level (0-1)
   * - 'pan': Stereo position (-1 to 1)
   * - 'frequency': Oscillator frequency in Hz
   * - 'detune': Detune in cents
   *
   * @param type - The parameter to control
   * @returns Fluent builder for setting value and timing
   *
   * @example
   * ```typescript
   * // Start at frequency 220, glide up to 440 over 0.5 seconds
   * osc.onPlaySet('frequency').to(220).at(0)
   * osc.onPlaySet('frequency').to(440).endingAt(0.5, 'linear')
   * osc.play()
   * ```
   */
  public onPlaySet(type: ControlType): { to: (value: number) => { at: (time: number) => void, endingAt: (time: number, rampType?: RampType) => void } } {
    return this.controller.onPlaySet(type)
  }

  /**
   * Schedule a parameter ramp when play() is called.
   *
   * @param type - The parameter to ramp ('gain', 'pan', 'frequency', 'detune')
   * @param rampType - Type of ramp curve ('linear' or 'exponential')
   * @returns Fluent builder for setting start value, end value, and duration
   *
   * @example
   * ```typescript
   * // Vibrato effect: ramp frequency up and down
   * osc.onPlayRamp('frequency', 'linear').from(440).to(450).in(0.1)
   * osc.play()
   * ```
   */
  public onPlayRamp(type: ControlType, rampType?: RampType): { from: (startValue: number) => { to: (endValue: number) => { in: (endTime: number) => void } } } {
    return this.controller.onPlayRamp(type, rampType)
  }

  /**
   * Set up a fresh OscillatorNode for playback.
   * Called automatically before each play() since OscillatorNode is single-use.
   * @protected
   */
  protected setup(): void {
    // Create a new oscillator on every play
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = this.type || 'sine'
    oscillator.frequency.setValueAtTime(this.freq || 440, this.audioContext.currentTime)
    this.audioSourceNode = oscillator

    // Create a new gain node on every play and update the effect chain
    const gainNode = this.audioContext.createGain()
    this.gainNode = gainNode

    // give the controller the new nodes
    this.controller.updateAudioSource(oscillator)
    this.controller.updateGainNode(gainNode)

    // Pass envelope to controller if configured
    if (this.envelope) {
      this.controller.setEnvelope(this.envelope)
    }

    // wire everything up (connects source to effect chain)
    this.wireConnections()
    // Re-wire effect chain with new gain node
    this.rewireEffects()
    this.controller.setValuesAtTimes()
  }

  /**
   * Wire oscillator through filters and connections to effect chain.
   * @protected
   */
  protected wireConnections(): void {
    // Connect source through Oscillator-specific filters and legacy connections to effect chain
    // Chain: audioSourceNode -> [filters] -> [legacy connections] -> effectChainInput -> [effects] -> gain -> panner -> destination
    const { connections, filters, effectChainInput, audioSourceNode } = this

    const nodes: AudioNode[] = [audioSourceNode]

    // Add all the Oscillator-specific filters
    for (let i = 0; i < filters.length; i++) {
      nodes.push(filters[i])
    }

    // Add legacy connections (if any)
    for (let i = 0; i < connections.length; i++) {
      nodes.push(connections[i].audioNode)
    }

    // Connect to effect chain input
    nodes.push(effectChainInput)

    // Connect them all together
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1])
    }
    // Effect chain is already wired (gain -> panner -> destination) in BaseSound
  }

  /**
   * Get the duration of the oscillator.
   *
   * Oscillators have no inherent duration - they play indefinitely until stopped.
   * Returns Infinity to indicate continuous playback, distinguishing from finite
   * Sound/Track durations.
   *
   * @example
   * ```typescript
   * const osc = await createOscillator({ frequency: 440 })
   * console.log(osc.duration.raw) // Infinity
   *
   * // Oscillators must be explicitly stopped
   * osc.play()
   * setTimeout(() => osc.stop(), 1000)
   * ```
   */
  public get duration(): TimeObject {
    return createTimeObject(Infinity, Infinity, Infinity)
  }

  /**
   * Stop the oscillator.
   *
   * If an ADSR envelope is configured, triggers the release phase and schedules
   * the actual stop after the release completes. This ensures the release tail
   * plays fully rather than being cut off abruptly.
   *
   * Note: stopAt() and stopIn() bypass the envelope release phase. For scheduled
   * stops with proper release, use the regular stop() method.
   *
   * @example
   * ```typescript
   * // Without envelope - stops immediately
   * const simple = await createOscillator({ frequency: 440 })
   * simple.play()
   * await simple.stop() // Immediate stop
   *
   * // With envelope - release phase plays
   * const piano = await createOscillator({
   *   frequency: 440,
   *   envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 }
   * })
   * piano.play()
   * await piano.stop() // Fades out over 0.5 seconds
   * ```
   */
  public async stop(): Promise<void> {
    if (this.envelope && this._isPlaying) {
      const releaseTime = this.audioContext.currentTime
      this.controller.triggerRelease(releaseTime)
      // Schedule actual stop after release completes
      const releaseEndTime = releaseTime + this.envelope.releaseTime
      await this.stopAt(releaseEndTime)
    } else {
      await super.stop()
    }
  }
}
