import type { TimeObject } from '@utils/create-time-object'
import type { Playable } from '@interfaces/playable'
import type { Connectable, Connection } from '@interfaces/connectable'
import type { ControlType, ParamController, RampType, RatioType } from '@controllers/base-param-controller'
import type { SoundEventMap } from './events/event-types'
import audioContextAwareTimeout from '@utils/timeout'

export interface BaseSoundOptions {
  /**
   * @see BaseSound.name
   */
  name?: string

  /**
   * @method setTimeout
   *
   * A function that behaves like the native `setTimeout` function. This is used to schedule the stop method to be called after the sound has finished playing.
   * By default, an `AudioContext`-aware version of `setTimeout` is used throughout `ez-web-audio`, but you can override this implementation if you need to.
   *
   * @default setTimeout from 'ez-web-audio/utils/timeout'
   * @param fn
   * @param delayMillis
   */
  setTimeout?: (fn: () => void, delayMillis: number) => number
}

export abstract class BaseSound extends EventTarget implements Connectable, Playable {
  protected _isPlaying = false
  public gainNode: GainNode
  protected pannerNode: StereoPannerNode
  protected setTimeout: (fn: () => void, delayMillis: number) => number
  protected startedPlayingAt: number = 0

  /**
   * @property connections
   * An array of connections that will be placed in between the `audioSourceNode` (where the audio comes from) and the gain/panner nodes.
   *
   * This is useful for adding effects to a sound. For example, to add a reverb effect, you can create a `ConvolverNode` and add it to this array.
   *
   * The `audioSourceNode` is mandatory and always first, and the gain/panner nodes are mandatory and always last, but the nodes in between can be in any order.
   *
   * You can use the `addConnection` and `removeConnection` methods to add and remove connections from this array, or you can set/mutate the array directly.
   *
   * The `wireConnections` method is called automatically when the sound is played, and it will connect all the nodes in this array in the correct order.
   *
   * @example
   * const sound = new Oscillator(audioContext, { type: 'sine', frequency: 440 })
   * const convolverNode = audioContext.createConvolver()
   * sound.connections = [convolverNode]
   * sound.play()
   *
   */
  public connections: Connection[] = []

  /**
   * @property startOffset
   *
   * See Web Audio API documentation for this one, as it is just passed into the `start` method of the `audioSourceNode`.
   *
   * This is useful for starting a sound at a specific offset from the beginning of the sound. Manipulation of this value is used
   * extensively in the `Track` class to allow for starting the track at specific positions.
   *
   * @default 0
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start
   */
  public startOffset: number = 0

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

  constructor(public audioContext: AudioContext, opts?: BaseSoundOptions) {
    super()
    const gainNode = audioContext.createGain()
    const pannerNode = audioContext.createStereoPanner()

    this.gainNode = gainNode
    this.pannerNode = pannerNode

    this.name = opts?.name || ''

    if (opts?.setTimeout) {
      this.setTimeout = opts.setTimeout
    }
    else {
      this.setTimeout = audioContextAwareTimeout(audioContext).setTimeout
    }
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
    options?: boolean | AddEventListenerOptions
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
    options?: boolean | EventListenerOptions
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
    detail: SoundEventMap[K]['detail']
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
    listener: (event: SoundEventMap[K]) => void
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
    listener: (event: SoundEventMap[K]) => void
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
    listener: (event: SoundEventMap[K]) => void
  ): this {
    this.removeEventListener(type, listener)
    return this
  }

  public addConnection(connection: Connection): this {
    this.connections.push(connection)
    this.wireConnections()
    return this
  }

  public removeConnection(name: string): this {
    const connection = this.getConnection(name)
    if (connection) {
      const index = this.connections.indexOf(connection)
      if (index > -1) {
        this.connections.splice(index, 1)
        this.wireConnections()
      }
    }
    return this
  }

  // Allows you to get any user created connection in the connections array
  public getConnection(name: string): Connection | undefined {
    return this.connections.find(c => c.name === name)
  }

  // Allows you to get node from any user created connection in the connections array
  public getNodeFrom<T extends AudioNode | StereoPannerNode>(connectionName: string): T | undefined {
    return this.getConnection(connectionName)?.audioNode as T | undefined
  }

  public update(type: ControlType): {
    to: (value: number) => {
      from: (method: RatioType) => void
    }
  } {
    return this.controller.update(type)
  }

  public changePanTo(value: number): this {
    this.controller.update('pan').to(value).from('ratio')
    return this
  }

  public changeGainTo(value: number): this {
    this.controller.update('gain').to(value).from('ratio')
    return this
  }

  public onPlaySet(type: ControlType): {
    to: (value: number) => {
      at: (time: number) => void
      endingAt: (time: number, rampType?: RampType) => void
    }
  } {
    return this.controller.onPlaySet(type)
  }

  public onPlayRamp(type: ControlType, rampType?: RampType): {
    from: (startValue: number) => {
      to: (endValue: number) => {
        in: (endTime: number) => void
      }
    }
  } {
    return this.controller.onPlayRamp(type, rampType)
  }

  public async play(): Promise<void> {
    await this.playAt(this.audioContext.currentTime)
  }

  public playIn(when: number): void {
    this.playAt(this.audioContext.currentTime + when)
  }

  public playFor(duration: number): void {
    this.playAt(this.audioContext.currentTime)
    this.setTimeout(() => this.stop(), duration * 1000)
  }

  /**
   * Starts playing the audio source after `playIn` seconds have elapsed, then
   * stops the audio source `stopAfter` seconds after it started playing.
   *
   * @public
   * @method playInAndStopAfter
   *
   * @param {number} playIn Number of seconds from "now" that the audio source
   * should play.
   *
   * @param {number} stopAfter Number of seconds from when the audio source
   * started playing that the audio source should be stopped.
   */
  public playInAndStopAfter(playIn: number, stopAfter: number): void {
    this.playIn(playIn)
    this.stopIn(playIn + stopAfter)
  }

  /**
   * The underlying method that backs all of the `play` methods. Plays the audio source at
   * the specified moment in time. A "moment in time" is measured in seconds from the moment
   * that the {{#crossLink "AudioContext"}}{{/crossLink}} was instantiated.
   *
   * @param {number} time The moment in time (in seconds, relative to the
   * {{#crossLink "AudioContext"}}AudioContext's{{/crossLink}} "beginning of
   * time") when the audio source should be played.
   *
   * @method playAt
   */
  public async playAt(time: number): Promise<void> {
    const { audioContext } = this
    const { currentTime } = audioContext
    const duration = this.duration.raw

    await audioContext.resume()

    this.setup()

    // Emit play event
    this.emit('play', {
      time: currentTime,
      source: this
    })

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
          duration: this.duration.raw
        })
      }
    }

    // if duration exists and is finite, schedule _isPlaying to false after duration has elapsed
    if (duration && Number.isFinite(duration)) {
      this.setTimeout(() => {
        this._isPlaying = false
      }, this.duration.pojo.seconds * 1000)
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
   * Hook method called after playback starts. Override in subclasses to add
   * behavior that should run for all play variants (play, playIn, playFor, etc.).
   *
   * @protected
   * @method _onPlaybackStarted
   */
  protected _onPlaybackStarted(): void {
    // Override in subclasses (e.g., Track for position tracking)
  }

  /**
   * Stops the audio source after specified seconds have elapsed.
   *
   * @public
   * @method stopIn
   *
   * @param {number} seconds Number of seconds from "now" that the audio source
   * should be stopped.
   */
  public async stopIn(seconds: number): Promise<void> {
    await this.stopAt(this.audioContext.currentTime + seconds)
  }

  /**
   * The underlying method that backs all of the `stop` methods. Stops sound and
   * set `isPlaying` to false at specified time.
   *
   * Functionally equivalent to the `stopAt` method.
   *
   * @method stopAt
   *
   * @param {number} time The moment in time (in seconds, relative to the
   * {{#crossLink "AudioContext"}}AudioContext's{{/crossLink}} "beginning of
   * time") when the audio source should be stopped.
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
          source: this
        })

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

  public async stop(): Promise<void> {
    await this.stopAt(this.audioContext.currentTime)
  }

  public get isPlaying(): boolean {
    return this._isPlaying
  }

  public get percentGain(): number {
    return this.controller.gain * 100
  }

  protected later(fn: () => void): void {
    this.setTimeout(fn, 1)
  }
}
