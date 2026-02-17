import type { ControlType, ParamController, RampType, RatioType } from '@controllers/base-param-controller'
import type { Connectable } from '@interfaces/connectable'
import type { Playable } from '@interfaces/playable'
import type { TimeObject } from '@utils/create-time-object'
import type { Analyzer } from './analyzer'
import type { Effect } from './effects'
import type { SoundEventMap } from './events/event-types'
import audioContextAwareTimeout from '@utils/timeout'
import { debugConnection, debugEvent } from './debug'

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
 * const filter = createFilterEffect(ctx, 'lowpass', { frequency: 1000 })
 * sound.addEffect(filter)
 *
 * // Listen for events
 * sound.on('play', () => console.log('Started'))
 * sound.on('end', () => console.log('Finished'))
 * ```
 */
export abstract class BaseSound extends EventTarget implements Connectable, Playable {
  protected _isPlaying = false

  /**
   * The GainNode controlling this sound's volume.
   *
   * For simple volume control, use changeGainTo() or update('gain').
   * For advanced routing, use getGainNode().
   */
  protected gainNode: GainNode

  protected pannerNode: StereoPannerNode
  protected setTimeout: (fn: () => void, delayMillis: number) => number
  protected startedPlayingAt: number = 0
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

  constructor(public audioContext: AudioContext, opts?: BaseSoundOptions) {
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
    }
    else {
      this.setTimeout = audioContextAwareTimeout(audioContext).setTimeout
    }
  }

  // ===== Effect Chain System =====

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
   * const filter = createFilterEffect(audioContext, 'lowpass', { frequency: 1000 })
   * sound.addEffect(filter)
   */
  public addEffect(effect: Effect, position?: number): this {
    if (position !== undefined && position >= 0 && position <= this.effects.length) {
      this.effects.splice(position, 0, effect)
    }
    else {
      this.effects.push(effect)
    }
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

  // ===== Event System (EventTarget extension with typed events) =====

  /**
   * Add a typed event listener for sound lifecycle events.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with EventTarget.
   *
   * @param type - The event type ('play', 'stop', 'end', etc.)
   * @param listener - The event handler function
   * @param options - Standard addEventListener options
   */
  override addEventListener<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((event: CustomEvent) => void) | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, listener as EventListener, options)
  }

  /**
   * Remove a typed event listener for sound lifecycle events.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with EventTarget.
   *
   * @param type - The event type ('play', 'stop', 'end', etc.)
   * @param listener - The event handler function to remove
   * @param options - Standard removeEventListener options
   */
  override removeEventListener<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((event: CustomEvent) => void) | null,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, listener as EventListener, options)
  }

  /**
   * Emit a typed event with the given detail.
   * @protected
   * @param type - The event type to emit
   * @param detail - The event detail object
   */
  protected emit<K extends keyof SoundEventMap>(
    type: K,
    detail: SoundEventMap[K]['detail'],
  ): void {
    const event = new CustomEvent(type, { detail })
    this.dispatchEvent(event)
  }

  // ===== Convenience Methods (.on/.once/.off) =====

  /**
   * Subscribe to one or more events. Supports chaining.
   *
   * @example
   * ```typescript
   * sound.on('play', handlePlay).on('stop', handleStop);
   * sound.on(['play', 'stop'], handleBoth);
   * ```
   *
   * @param type - The event type(s) to subscribe to
   * @param listener - The event handler function
   * @returns this for chaining
   */
  on<K extends keyof SoundEventMap>(
    type: K | K[],
    listener: (event: SoundEventMap[K]) => void,
  ): this {
    if (Array.isArray(type)) {
      type.forEach(t => this.addEventListener(t, listener as (event: SoundEventMap[typeof t]) => void))
    }
    else {
      this.addEventListener(type, listener)
    }
    return this
  }

  /**
   * Subscribe to an event once. Handler is removed after first invocation.
   *
   * @example
   * ```typescript
   * sound.once('end', () => console.log('Playback finished'));
   * ```
   *
   * @param type - The event type to subscribe to
   * @param listener - The event handler function
   * @returns this for chaining
   */
  once<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }

  /**
   * Unsubscribe from an event.
   *
   * Note: Due to native EventTarget limitations, you must provide the same
   * listener function reference that was used when subscribing. To remove
   * listeners, store the function reference when adding it.
   *
   * @example
   * ```typescript
   * const handler = (e) => console.log(e.detail);
   * sound.on('play', handler);
   * // later...
   * sound.off('play', handler);
   * ```
   *
   * @param type - The event type to unsubscribe from
   * @param listener - The event handler function to remove
   * @returns this for chaining
   */
  off<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
  ): this {
    this.removeEventListener(type, listener)
    return this
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
  public update(type: ControlType): {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  } {
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
  public onPlaySet(type: ControlType): {
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
  public onPlayRamp(type: ControlType, rampType?: RampType): {
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
    this.playAt(this.audioContext.currentTime + when)
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
    this.playAt(this.audioContext.currentTime)
    this.setTimeout(() => this.stop(), duration * 1000)
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
    const { audioContext } = this
    const { currentTime } = audioContext
    const duration = this.duration.raw

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

    // Emit play event
    this.emit('play', {
      time: currentTime,
      source: this,
    })

    // Debug log for play event
    debugEvent(this, 'play', currentTime, { startOffset: this.startOffset })

    this.audioSourceNode.start(time, this.startOffset)
    this.startedPlayingAt = time

    // Set up end event via onended (fires when playback completes naturally)
    // Note: onended fires for both natural completion AND stop() calls,
    // so we check _isPlaying to only emit 'end' for natural completion
    this.audioSourceNode.onended = () => {
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

    // if duration exists and is finite, schedule _isPlaying to false after duration has elapsed
    if (duration && Number.isFinite(duration)) {
      this.setTimeout(() => {
        this._isPlaying = false
      }, (duration - this.startOffset) * 1000)
    }

    if (time <= currentTime) {
      this._isPlaying = true
    }
    else {
      this.setTimeout(() => {
        this._isPlaying = true
      }, (time - currentTime) * 1000)
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

    const stop = (): void => {
      if (this._isPlaying) {
        this._isPlaying = false

        // Emit stop event before actually stopping the node
        this.emit('stop', {
          time: this.audioContext.currentTime,
          source: this,
        })

        // Debug log for stop event
        debugEvent(this, 'stop', this.audioContext.currentTime)

        node.stop(time)
      }
    }

    if (time === currentTime) {
      stop()
    }
    else {
      this.setTimeout(() => {
        stop()
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

  protected later(fn: () => void): void {
    this.setTimeout(fn, 1)
  }
}
