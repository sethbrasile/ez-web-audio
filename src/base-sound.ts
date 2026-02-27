import type { ParamController, RampType, RatioType, SoundControlType } from '@controllers/base-param-controller'
import type { Connectable } from '@interfaces/connectable'
import type { Playable } from '@interfaces/playable'
import type { TimeObject } from '@utils/create-time-object'
import type { Analyzer } from './analyzer'
import type { Effect } from './effects'
import type { BaseSoundEventMap } from './events/event-types'
import audioContextAwareTimeout from '@utils/timeout'
import { debugConnection, debugEvent } from './debug'
import { TypedEventEmitter } from './events/typed-event-emitter'

/**
 * Configuration options for BaseSound and its subclasses.
 */
export interface BaseSoundOptions {
  /**
   * Optional name for identifying this sound instance.
   * Useful for debugging and when managing multiple sounds.
   */
  name?: string

  /**
   * Custom setTimeout implementation.
   *
   * By default, an AudioContext-aware setTimeout is used that compensates
   * for browser throttling. Override this if you need different timing behavior.
   *
   * @param fn - Function to call after delay
   * @param delayMillis - Delay in milliseconds
   * @returns Timeout ID for cancellation
   */
  setTimeout?: (fn: () => void, delayMillis: number) => number

  /**
   * Custom clearTimeout implementation.
   *
   * Must match the setTimeout implementation. By default, the AudioContext-aware
   * clearTimeout is used.
   *
   * @param id - Timeout ID returned by setTimeout
   */
  clearTimeout?: (id: number) => void
}

/**
 * Abstract base class for all playable audio sources.
 *
 * BaseSound provides the core audio infrastructure that Sound, Track, and Oscillator
 * build upon. It handles:
 * - Audio node routing (gain, panner, effect chain, destination)
 * - Playback control (play, stop, timing methods)
 * - Parameter control via fluent API (update, onPlaySet, onPlayRamp)
 * - Event system for lifecycle events (play, stop, end)
 * - Effect chain management (addEffect, removeEffect)
 * - Analyzer attachment for visualization
 *
 * @example
 * ```typescript
 * // Inherited by Sound, Track, Oscillator
 * const sound = await createSound('click.mp3')
 *
 * // Immediate parameter update
 * sound.update('gain').to(0.5).as('ratio')
 *
 * // Schedule parameter for next play
 * sound.onPlaySet('gain').to(0).endingAt(1, 'exponential') // fade in
 *
 * // Ramp parameter during playback
 * sound.onPlayRamp('gain').from(1).to(0).in(2) // fade out over 2s
 *
 * // Add effects
 * const filter = createFilterEffect('lowpass', { frequency: 1000 })
 * sound.addEffect(filter)
 *
 * // Listen for events
 * sound.on('play', () => console.log('Started'))
 * sound.on('end', () => console.log('Finished'))
 * ```
 */
export abstract class BaseSound<TMap extends BaseSoundEventMap & { [K in keyof TMap]: CustomEvent<unknown> } = BaseSoundEventMap> extends TypedEventEmitter<TMap> implements Connectable, Playable {
  protected _isPlaying = false
  private _disposed = false

  /**
   * The GainNode controlling this sound's volume.
   *
   * For simple volume control, use changeGainTo() or update('gain').
   * For advanced routing, use getGainNode().
   */
  protected gainNode: GainNode

  protected pannerNode: StereoPannerNode
  protected setTimeout: (fn: () => void, delayMillis: number) => number
  protected clearTimeout: (id: number) => void
  private _pendingTimeoutIds: number[] = []
  protected startedPlayingAt: number = 0

  /**
   * The user's intended gain level (0–1). Tracks the last value set via
   * changeGainTo() / volume setter so that gain can be restored after a
   * fadeOut() or Oscillator anti-click stop that ramps gainNode.gain to 0.
   * @protected
   */
  protected _targetGain: number = 1

  /**
   * Wrap setTimeout to track the returned ID for later cancellation.
   * @private
   */
  private _trackedTimeout(fn: () => void, delayMillis: number): number {
    const id = this.setTimeout(fn, delayMillis)
    this._pendingTimeoutIds.push(id)
    return id
  }

  /**
   * Cancel all pending tracked timeouts (prevents stale callbacks from corrupting state).
   * @private
   */
  private _cancelPendingTimeouts(): void {
    for (const id of this._pendingTimeoutIds) {
      this.clearTimeout(id)
    }
    this._pendingTimeoutIds = []
  }

  private static _hasWarnedAboutSuspended = false

  /**
   * @property effects
   * An array of Effect instances that form the persistent effect chain.
   * Effects are wired once and persist across multiple play() calls - only the source reconnects.
   *
   * Use addEffect() and removeEffect() to manage the effect chain.
   * Chain order: source -> effectChainInput -> [effects] -> gainNode -> pannerNode -> destination
   */
  protected effects: Effect[] = []

  /**
   * @property effectChainInput
   * The entry point for the effect chain. The audio source connects to this node,
   * which then routes through any effects before reaching gain/panner/destination.
   */
  protected effectChainInput: GainNode

  /**
   * @property _destination
   * The final destination node for audio output. Defaults to audioContext.destination.
   * Can be changed with setDestination() to route audio elsewhere (e.g., for sub-mixing).
   */
  protected _destination: AudioNode

  /**
   * @property _analyzer
   * Optional Analyzer attached to the end of the signal chain for visualization.
   * Audio flows through the analyzer (passthrough) before reaching destination.
   */
  protected _analyzer: Analyzer | null = null

  /**
   * Offset in seconds from the beginning of the audio buffer where playback starts.
   * Used internally by Track for seek/resume functionality.
   *
   * @default 0
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start
   */
  protected startOffset: number = 0

  protected abstract controller: ParamController
  protected abstract wireConnections(): void
  protected abstract setup(): void

  /**
   * @property audioSourceNode
   *
   * The audio source node that this sound is using. This is the first node in the chain and is the node that actually provides audio.
   */
  public abstract audioSourceNode: OscillatorNode | AudioBufferSourceNode

  /**
   * @property duration
   *
   * The duration of this sound. This is used to schedule the stop method to be called after the sound has finished playing. Not all
   * `Sound` types have a useful `duration`, such as `Oscillator`
   */
  public abstract duration: TimeObject

  /**
   * @property name
   *
   * A name for this sound. Optional. Useful for identification of a given sound and debugging.
   */
  public name: string

  /**
   * @property debug
   *
   * Per-sound debug override. Set to true to enable debug logging for this sound only,
   * or false to disable logging even when global debug is enabled.
   *
   * @default undefined (follows global debug mode)
   *
   * @example
   * sound.debug = true  // enable debug for this sound
   * sound.debug = false // silence this sound even when global debug is on
   */
  public debug?: boolean

  constructor(public readonly audioContext: AudioContext, opts?: BaseSoundOptions) {
    super()
    const gainNode = audioContext.createGain()
    const pannerNode = audioContext.createStereoPanner()

    this.gainNode = gainNode
    this.pannerNode = pannerNode

    // Initialize effect chain infrastructure
    this.effectChainInput = audioContext.createGain()
    this._destination = audioContext.destination

    // Wire up the initial effect chain (no effects yet)
    this.wireEffectChain()

    this.name = opts?.name || ''

    if (opts?.setTimeout) {
      this.setTimeout = opts.setTimeout
      this.clearTimeout = opts?.clearTimeout ?? (() => {})
    }
    else {
      const timer = audioContextAwareTimeout(audioContext)
      this.setTimeout = timer.setTimeout
      this.clearTimeout = timer.clearTimeout
    }
  }

  /**
   * Tracks the original bypass property descriptors for effects that have been
   * intercepted with auto-rewire behavior. Used to restore original behavior
   * when effects are removed.
   * @private
   */
  private bypassInterceptions = new WeakMap<Effect, PropertyDescriptor | undefined>()

  // ===== Effect Chain System =====

  /**
   * Intercept an effect's bypass setter to auto-rewire the chain when toggled.
   * Saves the original descriptor so removeEffect can restore it.
   * @private
   */
  private interceptBypass(effect: Effect): void {
    // Get the existing bypass descriptor from the prototype chain or instance
    const proto = Object.getPrototypeOf(effect)
    const existingDesc = Object.getOwnPropertyDescriptor(effect, 'bypass')
      ?? Object.getOwnPropertyDescriptor(proto, 'bypass')

    this.bypassInterceptions.set(effect, existingDesc)

    Object.defineProperty(effect, 'bypass', {
      get: (): boolean => {
        if (existingDesc?.get) {
          return existingDesc.get.call(effect)
        }
        return (effect as Effect & { _bypass?: boolean })._bypass ?? false
      },
      set: (v: boolean) => {
        if (existingDesc?.set) {
          existingDesc.set.call(effect, v)
        }
        else {
          (effect as Effect & { _bypass?: boolean })._bypass = v
        }
        this.wireEffectChain()
      },
      configurable: true,
      enumerable: true,
    })
  }

  /**
   * Restore original bypass behavior on an effect.
   * @private
   */
  private restoreBypass(effect: Effect): void {
    const original = this.bypassInterceptions.get(effect)
    if (original) {
      // Delete instance override to expose prototype descriptor again
      delete (effect as unknown as Record<string, unknown>).bypass
      // If original was an own property (not prototype), restore it
      if (Object.getOwnPropertyDescriptor(Object.getPrototypeOf(effect), 'bypass') !== original) {
        Object.defineProperty(effect, 'bypass', original)
      }
    }
    else {
      // No original found, just delete instance override
      delete (effect as unknown as Record<string, unknown>).bypass
    }
    this.bypassInterceptions.delete(effect)
  }

  /**
   * Safely disconnect an AudioNode, ignoring errors if already disconnected.
   * @private
   */
  private safeDisconnect(node: AudioNode): void {
    try {
      node.disconnect()
    }
    catch {
      // Already disconnected, ignore
    }
  }

  /**
   * Wires the effect chain from effectChainInput through all non-bypassed effects
   * to gainNode -> pannerNode -> [analyzer] -> destination.
   *
   * If an analyzer is attached, audio flows through it before reaching destination.
   * The analyzer is a passthrough node that also provides visualization data.
   *
   * Called when effects are added/removed/reordered, destination changes, or analyzer changes.
   * NOT called on every play() - the chain persists.
   *
   * @private
   */
  private wireEffectChain(): void {
    const { effectChainInput, effects, gainNode, pannerNode, _destination, _analyzer } = this

    // Disconnect existing chain safely
    this.safeDisconnect(effectChainInput)

    // Disconnect effects
    for (const effect of effects) {
      if (!effect)
        continue
      this.safeDisconnect(effect.output)
    }

    // Disconnect gain -> panner chain
    this.safeDisconnect(gainNode)
    this.safeDisconnect(pannerNode)

    // Disconnect analyzer if it exists
    if (_analyzer) {
      this.safeDisconnect(_analyzer.input)
    }

    // Build the new chain
    // Start from effectChainInput
    let currentNode: AudioNode = effectChainInput

    // Connect through non-bypassed effects in order
    for (const effect of effects) {
      if (!effect)
        continue
      if (!effect.bypass) {
        currentNode.connect(effect.input)
        currentNode = effect.output
      }
    }

    // Connect to gain -> panner
    currentNode.connect(gainNode)
    gainNode.connect(pannerNode)

    // Connect through analyzer if present, then to destination
    // Chain: panner -> analyzer.input -> destination
    // AnalyserNode passes audio through, so this works as expected
    if (_analyzer) {
      pannerNode.connect(_analyzer.input)
      _analyzer.input.connect(_destination)
    }
    else {
      pannerNode.connect(_destination)
    }
  }

  /**
   * Add an effect to the effect chain.
   * Effects persist across multiple play() calls.
   *
   * @param effect - The Effect instance to add
   * @param position - Optional index to insert at (defaults to end of chain)
   * @returns this for chaining
   *
   * @example
   * const filter = createFilterEffect('lowpass', { frequency: 1000 })
   * sound.addEffect(filter)
   */
  public addEffect(effect: Effect, position?: number): this {
    if (position !== undefined && position < 0) {
      throw new Error(`addEffect() position must be >= 0. Received: ${position}`)
    }
    if (position !== undefined && position <= this.effects.length) {
      this.effects.splice(position, 0, effect)
    }
    else {
      this.effects.push(effect)
    }
    this.interceptBypass(effect)
    this.wireEffectChain()
    // Debug log for effect chain change
    debugConnection(
      this,
      `Effect added${position !== undefined ? ` at position ${position}` : ''}`,
      this.audioContext.currentTime,
      {
        effectCount: this.effects.length,
        effects: this.effects.map((e, i) => `[${i}] ${e.bypass ? '(bypassed)' : 'active'}`),
      },
    )
    return this
  }

  /**
   * Remove an effect from the effect chain.
   *
   * @param effect - The Effect instance to remove
   * @returns this for chaining
   *
   * @example
   * sound.removeEffect(filter)
   */
  public removeEffect(effect: Effect): this {
    const index = this.effects.indexOf(effect)
    if (index > -1) {
      this.restoreBypass(effect)
      this.effects.splice(index, 1)
      this.wireEffectChain()
      // Debug log for effect chain change
      debugConnection(
        this,
        'Effect removed',
        this.audioContext.currentTime,
        {
          effectCount: this.effects.length,
          effects: this.effects.map((e, i) => `[${i}] ${e.bypass ? '(bypassed)' : 'active'}`),
        },
      )
    }
    return this
  }

  /**
   * Add multiple effects to the effect chain in one call.
   * The chain is rewired only once after all effects are added, which is more
   * efficient than calling addEffect() multiple times.
   *
   * @param effects - Array of Effect instances to add
   * @param position - Optional index to insert at (defaults to end of chain)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const filter = createFilterEffect('lowpass', { frequency: 800 })
   * const boost = createGainEffect(1.5)
   * sound.addEffects([filter, boost])
   * ```
   */
  public addEffects(effects: Effect[], position?: number): this {
    if (effects.length === 0)
      return this

    if (position !== undefined && position < 0) {
      throw new Error(`addEffects() position must be >= 0. Received: ${position}`)
    }

    if (position !== undefined && position <= this.effects.length) {
      // Insert all at position, preserving order
      this.effects.splice(position, 0, ...effects)
    }
    else {
      this.effects.push(...effects)
    }

    // Intercept bypass on all added effects
    for (const effect of effects) {
      this.interceptBypass(effect)
    }

    // Wire chain once for all effects
    this.wireEffectChain()

    // Debug log
    debugConnection(
      this,
      `${effects.length} effects added${position !== undefined ? ` at position ${position}` : ''}`,
      this.audioContext.currentTime,
      {
        effectCount: this.effects.length,
        effects: this.effects.map((e, i) => `[${i}] ${e.bypass ? '(bypassed)' : 'active'}`),
      },
    )

    return this
  }

  /**
   * Get a readonly copy of the current effects array.
   *
   * @returns Shallow copy of the effects array
   */
  public getEffects(): readonly Effect[] {
    return [...this.effects]
  }

  /**
   * Set a custom destination for audio output instead of audioContext.destination.
   * Useful for routing to sub-mixes, analyzers, or other processing chains.
   *
   * @param node - The AudioNode to route output to
   * @returns this for chaining
   *
   * @example
   * const analyzer = audioContext.createAnalyser()
   * analyzer.connect(audioContext.destination)
   * sound.setDestination(analyzer)
   */
  public setDestination(node: AudioNode): this {
    this._destination = node
    this.wireEffectChain()
    return this
  }

  /**
   * Re-wire the effect chain. Call this after toggling effect.bypass
   * to update the audio routing.
   */
  public rewireEffects(): void {
    this.wireEffectChain()
  }

  // ===== Analyzer System =====

  /**
   * Attach an analyzer to this sound for visualization.
   * The analyzer is inserted at the end of the signal chain (after effects and panner,
   * before destination), showing the fully processed signal.
   *
   * The analyzer is a passthrough node - audio flows through it unchanged while
   * providing frequency and waveform data for visualization.
   *
   * @param analyzer - The Analyzer instance to attach, or null to detach
   * @returns this for chaining
   *
   * @example
   * const analyzer = createAnalyzer(audioContext, { fftSize: 2048 })
   * sound.setAnalyzer(analyzer)
   *
   * function draw() {
   *   const freqData = analyzer.getFrequencyData()
   *   // Draw frequency bars
   *   requestAnimationFrame(draw)
   * }
   */
  public setAnalyzer(analyzer: Analyzer | null): this {
    this._analyzer = analyzer
    this.wireEffectChain()
    return this
  }

  /**
   * Get the currently attached analyzer, if any.
   *
   * @returns The attached Analyzer instance, or null if none attached
   */
  public getAnalyzer(): Analyzer | null {
    return this._analyzer
  }

  /**
   * Get the GainNode for this sound.
   *
   * Provides controlled access to the underlying GainNode for advanced
   * audio routing scenarios (e.g., crossfading between tracks).
   * For simple volume control, use changeGainTo() or update('gain').
   *
   * @returns The GainNode controlling this sound's volume
   *
   * @example
   * ```typescript
   * const node = sound.getGainNode()
   * node.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)
   * ```
   */
  public getGainNode(): GainNode {
    return this.gainNode
  }

  /**
   * Update an audio parameter immediately.
   *
   * Returns a fluent builder for setting the parameter value. Use `.to(value)`
   * to set the value, then `.as(unit)` for unit interpretation.
   *
   * @param type - The parameter to update ('gain' or 'pan')
   * @returns Fluent builder for setting the value
   *
   * @example
   * ```typescript
   * // Set gain to 50%
   * sound.update('gain').to(0.5).as('ratio')
   *
   * // Set pan to left
   * sound.update('pan').to(-1).as('ratio')
   * ```
   */
  public update(type: SoundControlType): {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  } {
    // Intercept gain updates to keep _targetGain in sync so that
    // setup() on the next play() restores the correct gain level.
    if (type === 'gain') {
      return {
        to: (value: number) => {
          return {
            as: (method: RatioType) => {
              this.controller.update(type).to(value).as(method)
              // Mirror the resolved gain in _targetGain
              if (method === 'ratio') {
                this._targetGain = value
              }
              else if (method === 'percent') {
                this._targetGain = value / 100
              }
              else if (method === 'inverseRatio') {
                this._targetGain = 1 - value
              }
            },
          }
        },
      }
    }
    return this.controller.update(type)
  }

  /**
   * Set the pan position immediately.
   *
   * Convenience method for `update('pan').to(value).as('ratio')`.
   *
   * @param value - Pan position from -1 (left) to 1 (right), 0 is center
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * sound.changePanTo(-1)  // Hard left
   * sound.changePanTo(0)   // Center
   * sound.changePanTo(1)   // Hard right
   * ```
   */
  public changePanTo(value: number): this {
    this.controller.update('pan').to(value).as('ratio')
    return this
  }

  /**
   * Set the gain (volume) immediately.
   *
   * Convenience method for `update('gain').to(value).as('ratio')`.
   *
   * @param value - Gain from 0 (silent) to 1 (full volume)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * sound.changeGainTo(0.5)  // Half volume
   * sound.changeGainTo(0)    // Muted
   * sound.changeGainTo(1)    // Full volume
   * ```
   */
  public changeGainTo(value: number): this {
    if (value < 0) {
      throw new Error(`Gain must be >= 0. Received: ${value}`)
    }
    if (value > 1) {
      console.warn(`ez-web-audio: Gain value ${value} exceeds 1.0. Values above 1 amplify the signal and may cause distortion.`)
    }
    this._targetGain = value
    this.controller.update('gain').to(value).as('ratio')
    return this
  }

  /**
   * Schedule a parameter value to be set when play() is called.
   *
   * Use this for fade-ins, fade-outs, or precise parameter timing.
   * The value is applied relative to when play() is called.
   *
   * @param type - The parameter to control ('gain' or 'pan')
   * @returns Fluent builder for setting value and timing
   *
   * @remarks
   * **Important: Schedules are consumed after each play() call.**
   * The values set via onPlaySet() are applied once when play() runs,
   * then cleared. If you need the same schedule on every play, call
   * onPlaySet() again before each play() call.
   *
   * ```typescript
   * // This fade-in only applies to the FIRST play:
   * sound.onPlaySet('gain').to(0).at(0)
   * sound.onPlaySet('gain').to(1).endingAt(0.5, 'linear')
   * sound.play() // fades in
   * sound.play() // no fade — schedule was consumed
   *
   * // To repeat the schedule, re-call onPlaySet() before each play():
   * function playWithFadeIn() {
   *   sound.onPlaySet('gain').to(0).at(0)
   *   sound.onPlaySet('gain').to(1).endingAt(0.5, 'linear')
   *   sound.play()
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Fade in: start at 0, ramp to 1 over 0.5 seconds
   * sound.onPlaySet('gain').to(0).at(0)
   * sound.onPlaySet('gain').to(1).endingAt(0.5, 'linear')
   * sound.play()
   *
   * // Start panned left, move to center over 2 seconds
   * sound.onPlaySet('pan').to(-1).at(0)
   * sound.onPlaySet('pan').to(0).endingAt(2, 'linear')
   * sound.play()
   * ```
   */
  public onPlaySet(type: SoundControlType): {
    to: (value: number) => {
      at: (time: number) => void
      endingAt: (time: number, rampType?: RampType) => void
    }
  } {
    return this.controller.onPlaySet(type)
  }

  /**
   * Schedule a parameter ramp when play() is called.
   *
   * Use this for smooth transitions like vibrato, tremolo, or automation.
   *
   * @param type - The parameter to ramp ('gain' or 'pan')
   * @param rampType - Type of ramp curve ('linear' or 'exponential')
   * @returns Fluent builder for setting start value, end value, and duration
   *
   * @remarks
   * **Important: Schedules are consumed after each play() call.**
   * The ramp set via onPlayRamp() is applied once when play() runs,
   * then cleared. If you need the same ramp on every play, call
   * onPlayRamp() again before each play() call.
   *
   * ```typescript
   * // This fade-out only applies to the FIRST play:
   * sound.onPlayRamp('gain', 'linear').from(1).to(0).in(2)
   * sound.play() // fades out over 2 seconds
   * sound.play() // no fade — schedule was consumed
   *
   * // To repeat, re-schedule before each play:
   * function playWithFadeOut() {
   *   sound.onPlayRamp('gain', 'linear').from(1).to(0).in(2)
   *   sound.play()
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Fade out over 2 seconds
   * sound.onPlayRamp('gain', 'linear').from(1).to(0).in(2)
   * sound.play()
   *
   * // Pan sweep from left to right over 4 seconds
   * sound.onPlayRamp('pan', 'linear').from(-1).to(1).in(4)
   * sound.play()
   * ```
   */
  public onPlayRamp(type: SoundControlType, rampType?: RampType): {
    from: (startValue: number) => {
      to: (endValue: number) => {
        in: (endTime: number) => void
      }
    }
  } {
    return this.controller.onPlayRamp(type, rampType)
  }

  /**
   * Play the sound immediately.
   *
   * Resumes the AudioContext if suspended, sets up the audio source,
   * and starts playback. For finite-duration sounds (Sound, Track),
   * automatically schedules an 'end' event when playback completes.
   *
   * @returns Promise that resolves when playback begins
   *
   * @example
   * ```typescript
   * const sound = await createSound('click.mp3')
   * await sound.play()
   * ```
   */
  public async play(): Promise<void> {
    await this.playAt(this.audioContext.currentTime)
  }

  /**
   * Schedule playback after a delay.
   *
   * @param when - Seconds from now until playback starts
   *
   * @example
   * ```typescript
   * // Play in 2 seconds
   * sound.playIn(2)
   * ```
   */
  public playIn(when: number): void {
    void this.playAt(this.audioContext.currentTime + when).catch(() => {})
  }

  /**
   * Play for a specific duration, then stop automatically.
   *
   * @param duration - Seconds of playback before stopping
   *
   * @example
   * ```typescript
   * // Play for 3 seconds
   * sound.playFor(3)
   * ```
   */
  public playFor(duration: number): void {
    void this.playAt(this.audioContext.currentTime).catch(() => {})
    this._trackedTimeout(() => this.stop(), duration * 1000)
  }

  /**
   * Play after a delay, then stop after a duration.
   *
   * Combines playIn() and stopIn() for precise timed playback.
   *
   * @param playIn - Seconds from now until playback starts
   * @param stopAfter - Seconds of playback before stopping (from play start)
   *
   * @example
   * ```typescript
   * // Start in 1 second, play for 3 seconds
   * sound.playInAndStopAfter(1, 3)
   * ```
   */
  public playInAndStopAfter(playIn: number, stopAfter: number): void {
    this.playIn(playIn)
    this.stopIn(playIn + stopAfter)
  }

  /**
   * Play the audio source at a specific time.
   *
   * This is the underlying method for all play variants. Time is measured in seconds
   * from when the AudioContext was created (audioContext.currentTime).
   *
   * @param time - The AudioContext time when playback should start
   *
   * @example
   * ```typescript
   * // Play immediately
   * sound.playAt(audioContext.currentTime)
   *
   * // Play in 2 seconds
   * sound.playAt(audioContext.currentTime + 2)
   *
   * // Sync multiple sounds
   * const startTime = audioContext.currentTime + 0.1
   * sound1.playAt(startTime)
   * sound2.playAt(startTime)
   * ```
   */
  public async playAt(time: number): Promise<void> {
    if (this._disposed) {
      throw new Error('Cannot play a disposed sound. Create a new instance.')
    }

    const { audioContext } = this
    const { currentTime } = audioContext
    const duration = this.duration.raw

    // Cancel stale timeouts from any previous play cycle to prevent _isPlaying corruption
    this._cancelPendingTimeouts()

    await audioContext.resume()

    // Warn if AudioContext remains suspended after resume attempt
    if (audioContext.state === 'suspended' && !BaseSound._hasWarnedAboutSuspended) {
      console.warn(
        'ez-web-audio: AudioContext is suspended. Audio will not play until a user interaction (click, tap, keypress) occurs. '
        + 'Call initAudio() from a user gesture handler, or ensure play() is called after user interaction.',
      )
      BaseSound._hasWarnedAboutSuspended = true
    }

    this.setup()

    // Set _isPlaying before emitting 'play' so listeners see correct state (M-11)
    // For the immediate case (time <= currentTime), set to true now so 'play' listeners
    // see isPlaying === true. For scheduled-future case, setTimeout is still correct.
    if (time <= currentTime) {
      this._isPlaying = true
    }
    else {
      this._trackedTimeout(() => {
        this._isPlaying = true
      }, (time - currentTime) * 1000)
    }

    // Emit play event
    this.emit('play', {
      time: currentTime,
      source: this,
    })

    // Debug log for play event
    debugEvent(this, 'play', currentTime, { startOffset: this.startOffset })

    this.audioSourceNode.start(time, this.startOffset)
    this.startedPlayingAt = time

    // Consolidated onended handler: cleanup + 'end' event emission (H-1 fix)
    // Merges disconnect cleanup (previously in Sound.setup()) with end event emission.
    // This handler is the single owner of onended — Track._onPlaybackStarted() will
    // override it with its own version that also emits 'end' (H-2 fix in Task 2).
    this.audioSourceNode.onended = () => {
      // Cleanup: disconnect nodes to free memory (merged from Sound.setup())
      try {
        this.audioSourceNode.disconnect()
        this.audioSourceNode.onended = null
      }
      catch {
        // Already disconnected
      }

      // Only emit 'end' if still playing (natural completion)
      // If _isPlaying is false, it means stop() was called which already emitted 'stop'
      if (this._isPlaying) {
        this._isPlaying = false
        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: this.duration.raw,
        })
        // Debug log for end event
        debugEvent(this, 'end', this.audioContext.currentTime, { duration: this.duration.raw })
      }
    }

    // if duration exists and is finite and not looping, schedule _isPlaying to false after duration has elapsed
    if (duration && Number.isFinite(duration) && !this._isLooping) {
      this._trackedTimeout(() => {
        this._isPlaying = false
      }, (duration - this.startOffset) * 1000)
    }

    // Hook for subclasses to add behavior when playback starts
    this._onPlaybackStarted()
  }

  /**
   * Hook method called after playback starts.
   * Override in subclasses to add behavior that runs for all play variants.
   * @protected
   */
  protected _onPlaybackStarted(): void {
    // Override in subclasses (e.g., Track for position tracking)
  }

  /**
   * Stop the audio source after a delay.
   *
   * @param seconds - Seconds from now until playback stops
   *
   * @example
   * ```typescript
   * sound.play()
   * // Stop after 5 seconds
   * sound.stopIn(5)
   * ```
   */
  public async stopIn(seconds: number): Promise<void> {
    await this.stopAt(this.audioContext.currentTime + seconds)
  }

  /**
   * Stop the audio source at a specific time.
   *
   * This is the underlying method for all stop variants. Time is measured in seconds
   * from when the AudioContext was created (audioContext.currentTime).
   *
   * @param time - The AudioContext time when playback should stop
   *
   * @example
   * ```typescript
   * // Stop immediately
   * sound.stopAt(audioContext.currentTime)
   *
   * // Stop in 5 seconds
   * sound.stopAt(audioContext.currentTime + 5)
   * ```
   */
  public async stopAt(time: number): Promise<void> {
    await this.audioContext.resume()

    const node = this.audioSourceNode
    const currentTime = this.audioContext.currentTime

    if (time <= currentTime) {
      // Immediate stop
      this._cancelPendingTimeouts()
      if (this._isPlaying) {
        this._isPlaying = false
        this.emit('stop', {
          time: this.audioContext.currentTime,
          source: this,
        })
        debugEvent(this, 'stop', this.audioContext.currentTime)
        node.stop()
      }
    }
    else {
      // Schedule precise audio stop via Web Audio API (sample-accurate)
      node.stop(time)
      // Schedule state cleanup via JS timeout (approximate timing is fine for state/events)
      this._trackedTimeout(() => {
        this._cancelPendingTimeouts()
        if (this._isPlaying) {
          this._isPlaying = false
          this.emit('stop', {
            time: this.audioContext.currentTime,
            source: this,
          })
          debugEvent(this, 'stop', this.audioContext.currentTime)
        }
      }, (time - currentTime) * 1000)
    }
  }

  /**
   * Stop the sound immediately.
   *
   * Emits a 'stop' event. Safe to call when not playing (no-op).
   *
   * @returns Promise that resolves when the stop is processed
   *
   * @example
   * ```typescript
   * await sound.stop()
   * ```
   */
  public async stop(): Promise<void> {
    await this.stopAt(this.audioContext.currentTime)
  }

  /**
   * Whether the sound is currently playing.
   *
   * @example
   * ```typescript
   * if (sound.isPlaying) {
   *   await sound.stop()
   * }
   * ```
   */
  public get isPlaying(): boolean {
    return this._isPlaying
  }

  /**
   * Current gain as a percentage (0-100).
   *
   * @example
   * ```typescript
   * console.log(`Volume: ${sound.percentGain}%`) // "Volume: 50%"
   * ```
   */
  public get percentGain(): number {
    return this.controller.gain * 100
  }

  /**
   * Alias for gain. Get/set the volume (0 = silent, 1 = full volume).
   *
   * Values above 1 amplify the signal and may cause distortion. The setter
   * delegates to `changeGainTo()`, which throws if the value is negative and
   * warns if it exceeds 1.
   *
   * Inherited by Sound, Track, and Oscillator.
   *
   * @example
   * ```typescript
   * sound.volume = 0.5  // set to half volume
   * console.log(sound.volume) // 0.5
   *
   * // Works on all BaseSound subclasses
   * const osc = await createOscillator()
   * osc.volume = 0.8
   * ```
   */
  public get volume(): number {
    return this._targetGain
  }

  public set volume(value: number) {
    this.changeGainTo(value)
  }

  protected later(fn: () => void): void {
    this._trackedTimeout(fn, 1)
  }

  /**
   * Whether this instance has been disposed.
   *
   * Once disposed, the instance cannot be used for playback.
   * Create a new instance if you need to play the sound again.
   *
   * @example
   * ```typescript
   * sound.dispose()
   * console.log(sound.disposed) // true
   * ```
   */
  public get disposed(): boolean {
    return this._disposed
  }

  /**
   * Protected getter for looping state. Override in subclasses that support looping.
   * Used by playAt() to skip the duration timeout when looping is active.
   * @protected
   */
  protected get _isLooping(): boolean {
    return false
  }

  /**
   * Fade in the sound from silence to its current gain over `duration` seconds, then play.
   *
   * Schedules a gain ramp from 0 to the current gain value and calls play().
   * The current gain is restored after playback — use changeGainTo() to set a target volume before calling fadeIn().
   *
   * @param duration - Fade-in duration in seconds
   * @returns Promise that resolves when playback begins
   *
   * @example
   * ```typescript
   * const sound = await createSound('music.mp3')
   * await sound.fadeIn(2) // fade in over 2 seconds
   * ```
   */
  public async fadeIn(duration: number): Promise<void> {
    const targetGain = this._targetGain
    this.onPlaySet('gain').to(0).at(0)
    this.onPlaySet('gain').to(targetGain).endingAt(duration, 'linear')
    await this.play()
  }

  /**
   * Fade out the sound from its current gain to silence over `duration` seconds, then stop.
   *
   * If the sound is not playing, this is a no-op.
   * Returns a Promise that resolves after the fade completes and stop() has been called.
   *
   * @param duration - Fade-out duration in seconds
   * @returns Promise that resolves when the fade and stop are complete
   *
   * @example
   * ```typescript
   * const sound = await createSound('music.mp3')
   * await sound.play()
   * await sound.fadeOut(2) // fade out over 2 seconds then stop
   * ```
   */
  public fadeOut(duration: number): Promise<void> {
    if (!this._isPlaying)
      return Promise.resolve()

    const now = this.audioContext.currentTime
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
    this.gainNode.gain.linearRampToValueAtTime(0, now + duration)

    return new Promise<void>((resolve) => {
      this._trackedTimeout(() => {
        void this.stop().then(resolve)
      }, duration * 1000)
    })
  }

  /**
   * Dispose this sound instance, releasing all audio resources.
   *
   * Disconnects all audio nodes, clears the effect chain, cancels pending timeouts,
   * and marks the instance as unusable. After disposing, calling play() will throw an error.
   *
   * Dispose is idempotent — calling it multiple times is safe.
   *
   * @example
   * ```typescript
   * const sound = await createSound('click.mp3')
   * await sound.play()
   *
   * // When done with the sound
   * sound.dispose()
   * console.log(sound.disposed) // true
   *
   * // Attempting to play after dispose will throw
   * // sound.play() // throws Error: Cannot play a disposed sound
   * ```
   */
  public dispose(): void {
    if (this._disposed)
      return

    // Stop playback if currently playing
    if (this._isPlaying) {
      try {
        this.audioSourceNode.stop()
      }
      catch {
        // Already stopped, ignore
      }
      this._isPlaying = false
    }

    // Disconnect audio source node and clear its onended handler
    try {
      this.audioSourceNode.disconnect()
    }
    catch {
      // Already disconnected
    }
    this.audioSourceNode.onended = null

    // Cancel all pending timeouts
    this._cancelPendingTimeouts()

    // Disconnect all audio nodes
    this.safeDisconnect(this.effectChainInput)
    this.safeDisconnect(this.gainNode)
    this.safeDisconnect(this.pannerNode)

    // Restore and clear effects
    for (const e of this.effects) {
      this.restoreBypass(e)
    }
    this.effects = []

    // Detach analyzer
    this._analyzer = null

    this._disposed = true
  }
}
