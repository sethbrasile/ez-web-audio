import type { Effect } from './effects/index'
import type { LayeredSoundEventMap } from './events/event-types'
import type { Oscillator } from './oscillator'
import type { Sound } from './sound'
import { TypedEventEmitter } from './events/typed-event-emitter'
import audioContextAwareTimeout from './utils/timeout'

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
export class LayeredSound extends TypedEventEmitter<LayeredSoundEventMap> {
  private layers: (Sound | Oscillator)[]
  private failedLayers: { index: number, error: Error }[] = []
  private setTimeout: (fn: () => void, delayMillis: number) => number
  /** Tracks 'end' handlers per layer so they can be removed before adding new ones. */
  private layerEndHandlers: Map<Sound | Oscillator, () => void> = new Map()
  private _disposed = false
  private outputBus: GainNode
  private _destination: AudioNode
  private effects: Effect[] = []
  public name: string

  constructor(
    private audioContext: AudioContext,
    layers: (Sound | Oscillator | null | undefined)[],
    opts?: LayeredSoundOptions,
  ) {
    super()
    this.name = opts?.name || ''
    this.setTimeout = audioContextAwareTimeout(audioContext).setTimeout

    // Filter out null/undefined layers (graceful degradation)
    this.layers = layers.filter((layer, index) => {
      if (!layer) {
        this.failedLayers.push({
          index,
          error: new Error(`Layer ${index} is null/undefined`),
        })
        return false
      }
      return true
    }) as (Sound | Oscillator)[]

    // Create shared output bus — all layers route through this
    this.outputBus = audioContext.createGain()
    this._destination = audioContext.destination
    this.wireOutputBus()

    // Route each layer through the shared bus instead of directly to destination
    this.layers.forEach(layer => layer.setDestination(this.outputBus))

    // Soft limit warning
    const warnThreshold = opts?.warnLayerCount ?? 8
    if (this.layers.length >= warnThreshold) {
      console.warn(
        `LayeredSound "${this.name}" has ${this.layers.length} layers. `
        + `High layer counts may impact performance on some devices.`,
      )
    }

    if (this.failedLayers.length > 0) {
      this.emit('warning', {
        message: `${this.failedLayers.length} layer(s) failed to load`,
        failedLayers: this.failedLayers,
        source: this,
      })
    }
  }

  /**
   * Whether this LayeredSound has been disposed.
   */
  get disposed(): boolean {
    return this._disposed
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
    if (this._disposed) {
      throw new Error('Cannot play a disposed LayeredSound. Create a new instance.')
    }

    // CRITICAL: Capture startTime FIRST, then pass same value to all layers
    // This is the exact sync pattern from RESEARCH.md Pattern 1
    const startTime = this.audioContext.currentTime

    // All layers start at EXACTLY same time (exact sync)
    // Use allSettled so one failing layer does not abort others (SAFE-06)
    const results = await Promise.allSettled(
      this.layers.map(layer => layer.playAt(startTime)),
    )

    // Track which layers failed during this play call
    const playFailures = results
      .map((result, index) => ({ result, index }))
      .filter((item): item is { result: PromiseRejectedResult, index: number } =>
        item.result.status === 'rejected',
      )
      .map(({ result, index }) => ({
        index,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      }))

    if (playFailures.length > 0) {
      this.emit('warning', {
        message: `${playFailures.length} layer(s) failed to play`,
        failedLayers: playFailures,
        source: this,
      })
    }

    this.emit('play', { time: startTime, source: this })

    // Track when each layer ends — only track successfully started layers
    const successfulLayers = new Set(
      results
        .map((result, index) => ({ result, index }))
        .filter(item => item.result.status === 'fulfilled')
        .map(item => this.layers[item.index]),
    )

    this.setupLayerEndTracking(successfulLayers)
  }

  /**
   * Play all layers simultaneously for a specified duration, then stop.
   *
   * @param duration - Duration in seconds before stopping all layers
   *
   * @example
   * ```typescript
   * const layered = await createLayeredSound([kick, snare])
   * layered.playFor(0.1) // Play for 100ms then auto-stop
   * ```
   */
  async playFor(duration: number): Promise<void> {
    if (this._disposed) {
      throw new Error('Cannot play a disposed LayeredSound. Create a new instance.')
    }
    await this.play()
    this.setTimeout(() => this.stop(), duration * 1000)
  }

  /**
   * Stop all layers.
   */
  async stop(): Promise<void> {
    if (this._disposed) {
      throw new Error('Cannot stop a disposed LayeredSound.')
    }
    await Promise.all(this.layers.map(layer => layer.stop()))
    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this,
    })
  }

  /**
   * Set the gain for all layers.
   *
   * @param value - The gain value (0-1 range typical)
   */
  setGain(value: number): void {
    if (this._disposed) {
      throw new Error('Cannot set gain on a disposed LayeredSound.')
    }
    this.outputBus.gain.setValueAtTime(value, this.audioContext.currentTime)
  }

  /**
   * Set the pan for all layers.
   *
   * @param value - The pan value (-1 to 1, where -1 is full left, 1 is full right)
   */
  setPan(value: number): void {
    if (this._disposed) {
      throw new Error('Cannot set pan on a disposed LayeredSound.')
    }
    this.layers.forEach(layer => layer.changePanTo(value))
  }

  /**
   * Add an effect to the shared output bus.
   * All layers route through this bus, so the effect applies to all layers.
   *
   * @param effect - The effect to add
   * @param position - Optional insert position (defaults to end)
   * @returns this for chaining
   */
  addEffect(effect: Effect, position?: number): this {
    if (this._disposed) throw new Error('Cannot add effect to a disposed LayeredSound.')
    if (position !== undefined) {
      this.effects.splice(position, 0, effect)
    }
    else {
      this.effects.push(effect)
    }
    this.wireOutputBus()
    return this
  }

  /**
   * Remove an effect from the shared output bus.
   *
   * @param effect - The effect to remove
   * @returns this for chaining
   */
  removeEffect(effect: Effect): this {
    if (this._disposed) throw new Error('Cannot remove effect from a disposed LayeredSound.')
    const index = this.effects.indexOf(effect)
    if (index !== -1) {
      this.effects.splice(index, 1)
      this.wireOutputBus()
    }
    return this
  }

  /**
   * Get a readonly copy of the effects array.
   *
   * @returns A copy of the effects array
   */
  getEffects(): readonly Effect[] {
    return [...this.effects]
  }

  /**
   * Stop all layers and dispose them. Releases resources and prevents further use.
   *
   * After disposal, calling play() will throw an error.
   * Dispose is idempotent — calling it multiple times is safe.
   *
   * @example
   * ```typescript
   * const layered = await createLayeredSound([bass, melody])
   * layered.play()
   * // When done:
   * layered.dispose()
   * ```
   */
  dispose(): void {
    if (this._disposed)
      return

    // Stop all layers
    this.layers.forEach((layer) => {
      try {
        layer.stop()
      }
      catch {
        // Already stopped
      }
    })

    // Dispose all layers
    this.layers.forEach((layer) => {
      if ('dispose' in layer && typeof layer.dispose === 'function') {
        layer.dispose()
      }
    })

    // Clean up layer end tracking
    this.layerEndHandlers.forEach((handler, layer) => {
      layer.off('end', handler)
    })
    this.layerEndHandlers.clear()

    // Disconnect shared bus and clear effects
    this.safeDisconnect(this.outputBus)
    for (const effect of this.effects) {
      this.safeDisconnect(effect.output)
    }
    this.effects = []

    // Clear layers array
    this.layers = []
    this.failedLayers = []

    // Emit dispose BEFORE silencing (matches BaseSound pattern)
    this.dispatchEvent(new CustomEvent('dispose', { detail: { source: this } }))

    // Silence future events
    this.dispatchEvent = () => false

    this._disposed = true
  }

  /**
   * Wire the shared output bus through the effects chain to the destination.
   * @internal
   */
  private wireOutputBus(): void {
    this.safeDisconnect(this.outputBus)
    for (const effect of this.effects) {
      this.safeDisconnect(effect.output)
    }

    let currentNode: AudioNode = this.outputBus
    for (const effect of this.effects) {
      if (!effect.bypass) {
        currentNode.connect(effect.input)
        currentNode = effect.output
      }
    }
    currentNode.connect(this._destination)
  }

  /**
   * Safely disconnect an AudioNode, ignoring errors if already disconnected.
   * @internal
   */
  private safeDisconnect(node: AudioNode): void {
    try { node.disconnect() } catch { /* already disconnected */ }
  }

  /**
   * Set up tracking for when each layer ends. Emits 'end' event when
   * the last layer finishes (layers end independently).
   *
   * Creates a fresh Set per play() call to support multiple playbacks.
   */
  private setupLayerEndTracking(activeLayers?: Set<Sound | Oscillator>): void {
    // Remove all previously registered 'end' handlers before adding new ones.
    // Without this, repeated play() calls accumulate listeners that fire spurious 'end' events.
    this.layerEndHandlers.forEach((handler, layer) => {
      layer.off('end', handler)
    })
    this.layerEndHandlers.clear()

    // Only track layers that successfully started (or all layers if not specified)
    const trackableLayers = activeLayers
      ? this.layers.filter(l => activeLayers.has(l))
      : this.layers

    // If no layers to track (all failed), emit end immediately
    if (trackableLayers.length === 0) {
      this.emit('end', {
        time: this.audioContext.currentTime,
        source: this,
        duration: 0,
      })
      return
    }

    const endedLayers = new Set<Sound | Oscillator>()

    const handleEnd = (layer: Sound | Oscillator): void => {
      endedLayers.add(layer)
      this.layerEndHandlers.delete(layer)

      // Emit when last trackable layer finishes
      if (endedLayers.size === trackableLayers.length) {
        // Calculate max duration from trackable layers
        const durations = trackableLayers.map(l => l.duration.raw)
        const maxDuration = Math.max(...durations)

        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: maxDuration,
        })
      }
    }

    trackableLayers.forEach((layer) => {
      const handler = (): void => handleEnd(layer)
      this.layerEndHandlers.set(layer, handler)
      layer.once('end', handler)
    })
  }
}
