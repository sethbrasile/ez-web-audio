import type { ControlType, RampType, RatioType, SoundControlType } from '@controllers/base-param-controller'
import type { TimeObject } from '@utils/create-time-object'
import type { BaseSoundOptions } from './base-sound'
import type { EnvelopeOptions } from './envelope'
import { convertValue } from '@utils/convert-value'
import createTimeObject from '@utils/create-time-object'
import frequencyMap from '@utils/frequency-map'
import { get } from '@utils/prop-access'
import { BaseSound } from './base-sound'
import { OscillatorController } from './controllers/oscillator-controller'
import { Envelope } from './envelope'
import { InvalidNoteError } from './errors'

/**
 * Filter configuration for oscillator frequency shaping.
 */
export interface OscillatorFilterOptions {
  /** Filter cutoff frequency in Hz. */
  frequency?: number
  /** Filter Q factor (resonance). Higher values create more pronounced peaks. */
  q?: number
}

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
  /**
   * Note name (e.g., 'A4', 'C3', 'Eb5'). Looked up in the frequency map.
   * Takes precedence over `frequency` if both provided.
   * Use flat notation (Db, Eb, Gb, Ab, Bb) not sharp notation.
   *
   * @example
   * ```typescript
   * // Play middle C
   * const osc = await createOscillator({ note: 'C4', type: 'sine' })
   * ```
   */
  note?: string
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

const FILTERS: BiquadFilterType[] = [
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

    if (options?.note) {
      const freq = (frequencyMap as Record<string, number>)[options.note]
      if (freq === undefined) {
        throw new InvalidNoteError(
          `Unknown note "${options.note}". Valid notes: C0-B8 with accidentals (e.g., A4, Db3, Eb5). `
          + `Use flat notation (Db, Eb, Gb, Ab, Bb) not sharp notation.`,
          options.note,
        )
      }
      this.freq = freq
    }
    else {
      this.freq = options?.frequency || 440
    }

    if (this.freq <= 0) {
      throw new Error(`Oscillator frequency must be greater than 0. Received: ${this.freq}`)
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
      const vals = options ? get<OscillatorFilterOptions | undefined>(options as Record<string, unknown>, filter) : undefined
      if (vals) {
        const filterNode = audioContext.createBiquadFilter()
        filterNode.type = filter
        filterNode.frequency.setValueAtTime(vals.frequency || 440, audioContext.currentTime)
        filterNode.Q.setValueAtTime(vals.q || 1, audioContext.currentTime)
        this.filters.push(filterNode)
      }
    })
  }

  /**
   * Update an audio parameter immediately.
   *
   * Overrides BaseSound.update() to accept the full ControlType including 'frequency',
   * which is only valid on Oscillator instances.
   *
   * @param type - The parameter to update ('gain', 'pan', 'detune', or 'frequency')
   * @returns Fluent builder: `.to(value).as(unit)`
   *
   * @example
   * ```typescript
   * osc.update('frequency').to(880).as('ratio')
   * osc.update('gain').to(0.5).as('ratio')
   * ```
   */
  public override update(type: ControlType): {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  } {
    // 'frequency' is oscillator-specific; everything else (gain, pan, detune) delegates to
    // BaseSound.update() which handles _targetGain interception for 'gain'.
    if (type === 'frequency') {
      return {
        to: (value: number) => ({
          as: (method: RatioType): void => {
            this.controller.update(type).to(value).as(method)
            // Persist on the instance: setup() re-applies this.freq to the fresh
            // OscillatorNode on every play(), so without this the update would
            // silently revert to the constructor frequency on the next play.
            const resolved = convertValue(value, method)
            if (resolved > 0) {
              this.freq = resolved
            }
          },
        }),
      }
    }
    return super.update(type as SoundControlType)
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
   * The GainNode is reused across plays to keep cached references from `getGainNode()` stable.
   * @protected
   */
  protected setup(): void {
    // Neutralize the previous source node before replacing it.
    const oldNode = this.audioSourceNode
    if (oldNode) {
      oldNode.onended = null

      if (this._isPlaying) {
        // Still audibly playing — this is a retrigger with no stop() in
        // between (e.g. a caller driving its own gain envelope directly via
        // getGainNode(), like TransportSequencerDemo's per-note fades).
        // Hard-cutting the node here stops the waveform at a non-zero,
        // non-zero-crossing amplitude — an audible click/screech (gate-2
        // ez-audio-a30). Route it through a short independent release gain
        // instead, decoupled from the shared gainNode so it can never
        // collide with the new note's gain automation. Mirrors
        // Sound.setup()'s identical fix for AudioBufferSourceNode retriggers.
        const now = this.audioContext.currentTime
        const releaseGain = this.audioContext.createGain()
        releaseGain.gain.setValueAtTime(1, now)
        releaseGain.gain.linearRampToValueAtTime(0, now + 0.05)
        try {
          oldNode.disconnect()
        }
        catch {
          // Already disconnected
        }
        oldNode.connect(releaseGain)
        releaseGain.connect(this.effectChainInput)
        try {
          oldNode.stop(now + 0.06)
        }
        catch {
          // Never started — nothing to stop
        }
      }
      else {
        // Not "playing" from the library's perspective — either never
        // started, or an explicit stop() already told this node to end. A
        // prior stop() may have scheduled a delayed node.stop() (envelope
        // release / anti-click fade) that hasn't landed yet — without
        // neutralizing immediately, the old node keeps sounding through the
        // shared gain node (riding the new note's envelope) and then
        // hard-stops at nonzero amplitude (audible pop). Since stop() was
        // already requested, cutting the tail short here is expected.
        try {
          oldNode.stop()
        }
        catch {
          // Never started (constructor placeholder) — nothing to stop
        }
        try {
          oldNode.disconnect()
        }
        catch {
          // Already disconnected
        }
      }
    }

    // Create a new oscillator on every play (OscillatorNode is single-use per Web Audio spec)
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = this.type || 'sine'
    oscillator.frequency.setValueAtTime(this.freq || 440, this.audioContext.currentTime)
    this.audioSourceNode = oscillator

    // Cancel any scheduled values on the existing gain node instead of replacing it.
    // Restore _targetGain (user's intended gain) rather than gainNode.gain.value which
    // may be 0 after an anti-click fade-out from a previous stop().
    this.gainNode.gain.cancelScheduledValues(0)
    this.gainNode.gain.setValueAtTime(this._targetGain, this.audioContext.currentTime)

    // give the controller the new oscillator node (gain node is stable)
    this.controller.updateAudioSource(oscillator)

    // Pass envelope to controller if configured
    if (this.envelope) {
      this.controller.setEnvelope(this.envelope)
    }

    // wire everything up (connects source to effect chain)
    this.wireConnections()
    this.controller.setValuesAtTimes()
  }

  /**
   * Wire oscillator through filters to effect chain.
   * @protected
   */
  protected wireConnections(): void {
    // Chain: audioSourceNode -> [filters] -> effectChainInput -> [effects] -> gain -> panner -> destination
    const { filters, effectChainInput, audioSourceNode } = this

    const nodes: AudioNode[] = [audioSourceNode]

    // Add all the Oscillator-specific filters
    for (let i = 0; i < filters.length; i++) {
      nodes.push(filters[i])
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
   * Get a readonly snapshot of the oscillator's filter nodes.
   *
   * Returns a shallow copy of the internal filters array so callers can
   * inspect filter state (type, frequency, Q) without mutating the chain.
   *
   * @returns Readonly array of BiquadFilterNode instances
   *
   * @example
   * ```typescript
   * const osc = await createOscillator({
   *   frequency: 440,
   *   lowpass: { frequency: 800, q: 1 },
   *   highpass: { frequency: 200 }
   * })
   * const filters = osc.getFilters()
   * console.log(filters.length) // 2
   * console.log(filters[0].type) // 'highpass'
   * ```
   */
  public getFilters(): readonly BiquadFilterNode[] {
    return [...this.filters]
  }

  /**
   * Get the duration in seconds without allocating a TimeObject.
   * Oscillators have infinite duration.
   */
  public get durationRaw(): number {
    return Infinity
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
  /**
   * Stop the oscillator at a specific AudioContext time.
   *
   * Applies a quick 10ms gain fade-out before stopping to prevent click/pop
   * artifacts from abrupt waveform cutoff. If an ADSR envelope is active,
   * the fade-out is skipped since the envelope's release handles it.
   *
   * @param time - The AudioContext time when playback should stop
   */
  public async stopAt(time: number): Promise<void> {
    if (!this._isPlaying) {
      await super.stopAt(time)
      return
    }

    const now = this.audioContext.currentTime
    const fadeTime = 0.01 // 10ms anti-click ramp
    const fadeEnd = Math.max(time, now) + fadeTime

    // Cancel any in-progress gain automation (envelope release, etc.)
    // and ramp to exact silence before stopping the node
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
    this.gainNode.gain.linearRampToValueAtTime(0, fadeEnd)

    // Stop the oscillator node after the fade completes
    this.audioSourceNode.stop(fadeEnd)
    this.emitEndWhenNodeEnds(this.audioSourceNode)

    // Mark as stopped immediately — the fade is an implementation detail
    this._isPlaying = false
    this.emit('stop', { time: now, source: this })
  }

  /**
   * Emit 'end' when the given source node actually finishes rendering
   * (after a scheduled stop — envelope release tail or anti-click fade).
   *
   * Oscillators never end naturally, so the base playAt() handler's
   * `_isPlaying` guard means 'end' would otherwise never fire for them.
   * Consumers (e.g. PolySynth voice pooling) rely on 'end' to know a
   * voice's tail has fully rung out.
   *
   * The handler is bound to ITS node: if a later play() supersedes this
   * node, the stale ended event cleans up only itself and emits nothing.
   * @private
   */
  private emitEndWhenNodeEnds(node: OscillatorNode): void {
    node.onended = () => {
      try {
        node.disconnect()
      }
      catch {
        // Already disconnected
      }
      node.onended = null
      if (node !== this.audioSourceNode) {
        return
      }
      this.emit('end', {
        time: this.audioContext.currentTime,
        source: this,
        duration: this.durationRaw,
      })
    }
  }

  public async stop(): Promise<void> {
    if (this.envelope && this._isPlaying) {
      const now = this.audioContext.currentTime
      const release = this.envelope.release

      // Trigger envelope release — handles cancelAndHoldAtTime + linear ramp
      // to exact zero. All gain automation is managed by the envelope.
      this.controller.triggerRelease(now)

      // Stop oscillator slightly after release completes. The gain is already
      // at zero by releaseEnd; the extra 10ms is a safety margin to ensure
      // the zero-gain state has been rendered before the node is killed.
      const padding = release < 0.001 ? 0 : 0.01
      this.audioSourceNode.stop(now + release + padding)
      this.emitEndWhenNodeEnds(this.audioSourceNode)

      this._isPlaying = false
      this.emit('stop', { time: now, source: this })
    }
    else {
      await super.stop()
    }
  }
}
