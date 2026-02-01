import type { Sound } from './sound'
import type { Oscillator } from './oscillator'
import type { LayeredSoundEventMap } from './events/event-types'

/**
 * Options for creating a LayeredSound.
 */
export interface LayeredSoundOptions {
  /** Optional name for identification */
  name?: string
  /** Layer count threshold at which to warn (default: 8) */
  warnLayerCount?: number
}

/**
 * LayeredSound synchronizes multiple Sound/Oscillator instances for
 * simultaneous playback with master gain/pan control and individual layer access.
 *
 * All layers start at exactly the same audioContext.currentTime for precise sync.
 * Layers end independently - LayeredSound emits 'end' when the last layer finishes.
 *
 * @example
 * ```typescript
 * const bass = await createSound('bass.mp3')
 * const melody = await createSound('melody.mp3')
 * const synth = await createOscillator({ frequency: 440 })
 *
 * const layered = new LayeredSound(audioContext, [bass, melody, synth])
 * layered.play() // All layers start at exact same time
 * layered.setGain(0.5) // Affects all layers
 * layered.getLayer(2)?.changeGainTo(0.8) // Control individual layer
 * ```
 */
export class LayeredSound extends EventTarget {
  private layers: (Sound | Oscillator)[]
  private failedLayers: { index: number; error: Error }[] = []
  public name: string

  constructor(
    private audioContext: AudioContext,
    layers: (Sound | Oscillator | null | undefined)[],
    opts?: LayeredSoundOptions
  ) {
    super()
    this.name = opts?.name || ''

    // Filter out null/undefined layers (graceful degradation)
    this.layers = layers.filter((layer, index) => {
      if (!layer) {
        this.failedLayers.push({
          index,
          error: new Error(`Layer ${index} is null/undefined`)
        })
        return false
      }
      return true
    }) as (Sound | Oscillator)[]

    // Soft limit warning
    const warnThreshold = opts?.warnLayerCount ?? 8
    if (this.layers.length >= warnThreshold) {
      console.warn(
        `LayeredSound "${this.name}" has ${this.layers.length} layers. ` +
        `High layer counts may impact performance on some devices.`
      )
    }

    if (this.failedLayers.length > 0) {
      this.emit('warning', {
        message: `${this.failedLayers.length} layer(s) failed to load`,
        failedLayers: this.failedLayers,
        source: this
      })
    }
  }

  /**
   * Get a layer by index for individual control.
   *
   * @param index - The layer index (0-based)
   * @returns The Sound or Oscillator at that index, or undefined if out of bounds
   */
  getLayer(index: number): Sound | Oscillator | undefined {
    return this.layers[index]
  }

  /**
   * Get the number of valid layers in this LayeredSound.
   */
  get layerCount(): number {
    return this.layers.length
  }

  /**
   * Play all layers simultaneously at exactly the same audioContext.currentTime.
   * This ensures perfect synchronization across all layers.
   */
  async play(): Promise<void> {
    // CRITICAL: Capture startTime FIRST, then pass same value to all layers
    // This is the exact sync pattern from RESEARCH.md Pattern 1
    const startTime = this.audioContext.currentTime

    // All layers start at EXACTLY same time (exact sync)
    await Promise.all(
      this.layers.map(layer => layer.playAt(startTime))
    )

    this.emit('play', { time: startTime, source: this })

    // Track when each layer ends
    this.setupLayerEndTracking()
  }

  /**
   * Stop all layers.
   */
  async stop(): Promise<void> {
    await Promise.all(this.layers.map(layer => layer.stop()))
    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this
    })
  }

  /**
   * Set the gain for all layers.
   *
   * @param value - The gain value (0-1 range typical)
   */
  setGain(value: number): void {
    this.layers.forEach(layer => layer.changeGainTo(value))
  }

  /**
   * Set the pan for all layers.
   *
   * @param value - The pan value (-1 to 1, where -1 is full left, 1 is full right)
   */
  setPan(value: number): void {
    this.layers.forEach(layer => layer.changePanTo(value))
  }

  /**
   * Set up tracking for when each layer ends. Emits 'end' event when
   * the last layer finishes (layers end independently).
   *
   * Creates a fresh Set per play() call to support multiple playbacks.
   */
  private setupLayerEndTracking(): void {
    const endedLayers = new Set<Sound | Oscillator>()

    const handleEnd = (layer: Sound | Oscillator) => {
      endedLayers.add(layer)

      // Emit when last layer finishes
      if (endedLayers.size === this.layers.length) {
        // Calculate max duration from all layers
        const durations = this.layers.map(l => l.duration.raw)
        const maxDuration = Math.max(...durations)

        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: maxDuration
        })
      }
    }

    this.layers.forEach(layer => {
      layer.once('end', () => handleEnd(layer))
    })
  }

  // ===== Event System (EventTarget extension with typed events) =====

  /**
   * Add a typed event listener for LayeredSound lifecycle events.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with EventTarget.
   *
   * @param type - The event type ('play', 'stop', 'end', 'warning')
   * @param listener - The event handler function
   * @param options - Standard addEventListener options
   */
  override addEventListener<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void,
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
   * Remove a typed event listener for LayeredSound lifecycle events.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with EventTarget.
   *
   * @param type - The event type ('play', 'stop', 'end', 'warning')
   * @param listener - The event handler function to remove
   * @param options - Standard removeEventListener options
   */
  override removeEventListener<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void,
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
  protected emit<K extends keyof LayeredSoundEventMap>(
    type: K,
    detail: LayeredSoundEventMap[K]['detail']
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
   * layered.on('play', handlePlay).on('stop', handleStop);
   * layered.on(['play', 'stop'], handleBoth);
   * ```
   *
   * @param type - The event type(s) to subscribe to
   * @param listener - The event handler function
   * @returns this for chaining
   */
  on<K extends keyof LayeredSoundEventMap>(
    type: K | K[],
    listener: (event: LayeredSoundEventMap[K]) => void
  ): this {
    if (Array.isArray(type)) {
      type.forEach(t => this.addEventListener(t, listener as (event: LayeredSoundEventMap[typeof t]) => void))
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
   * layered.once('end', () => console.log('All layers finished'));
   * ```
   *
   * @param type - The event type to subscribe to
   * @param listener - The event handler function
   * @returns this for chaining
   */
  once<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void
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
   * layered.on('play', handler);
   * // later...
   * layered.off('play', handler);
   * ```
   *
   * @param type - The event type to unsubscribe from
   * @param listener - The event handler function to remove
   * @returns this for chaining
   */
  off<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void
  ): this {
    this.removeEventListener(type, listener)
    return this
  }
}
