/**
 * Definition of a single sprite within the audio file.
 */
export interface SpriteDefinition {
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Whether to loop (default: false) */
  loop?: boolean
}

/**
 * Manifest describing all sprites in an audio file.
 * Compatible with audiosprite JSON format.
 */
export interface SpriteManifest {
  /** Optional: alternative audio formats */
  resources?: string[]
  /** Map of sprite names to their definitions */
  spritemap: Record<string, SpriteDefinition>
}

/**
 * Options for playing a specific sprite.
 */
export interface SpritePlayOptions {
  /** Gain level 0-1 (default: 1) */
  gain?: number
  /** Pan position -1 to 1 (default: 0) */
  pan?: number
}

/**
 * AudioSprite enables playing segments of a single audio file by name.
 *
 * Use sprites to bundle multiple short sounds into one file, reducing HTTP requests.
 * Compatible with the audiosprite JSON format.
 *
 * @example
 * ```typescript
 * import { createSprite } from 'ez-web-audio'
 *
 * const sprite = await createSprite('sounds.mp3', {
 *   spritemap: {
 *     laser: { start: 0, end: 0.3 },
 *     explosion: { start: 1.0, end: 2.5 },
 *     powerup: { start: 3.0, end: 3.5 }
 *   }
 * })
 *
 * // Play specific sounds by name
 * sprite.play('laser')
 * sprite.play('explosion', { gain: 0.7 })
 *
 * // Check available sprites
 * console.log(sprite.names) // ['laser', 'explosion', 'powerup']
 * ```
 */
export class AudioSprite {
  /** Tracks active looping sources by sprite name so they can be stopped via stop(). */
  private activeSources = new Map<string, AudioBufferSourceNode[]>()

  constructor(
    private audioContext: AudioContext,
    private audioBuffer: AudioBuffer,
    private manifest: SpriteManifest,
  ) {}

  /**
   * List of available sprite names defined in the manifest.
   *
   * @example
   * ```typescript
   * sprite.names.forEach(name => console.log(name))
   * ```
   */
  get names(): string[] {
    return Object.keys(this.manifest.spritemap)
  }

  /**
   * Check if a sprite with the given name exists.
   *
   * @param name - The sprite name to check
   * @returns true if the sprite exists
   *
   * @example
   * ```typescript
   * if (sprite.has('laser')) {
   *   sprite.play('laser')
   * }
   * ```
   */
  has(name: string): boolean {
    return name in this.manifest.spritemap
  }

  /**
   * Get the duration of a sprite in seconds.
   *
   * @param name - The sprite name
   * @returns Duration in seconds
   * @throws Error if sprite name not found
   *
   * @example
   * ```typescript
   * const duration = sprite.getDuration('explosion')
   * console.log(`Explosion lasts ${duration} seconds`)
   * ```
   */
  getDuration(name: string): number {
    const sprite = this.manifest.spritemap[name]
    if (!sprite) {
      throw new Error(`Sprite "${name}" not found. Available: ${this.names.join(', ')}`)
    }
    return sprite.end - sprite.start
  }

  /**
   * Play a sprite by name.
   *
   * Each call creates a new AudioBufferSourceNode, allowing concurrent playback
   * of the same sprite. Use options to control gain and pan.
   *
   * @param name - The sprite name to play
   * @param options - Optional gain (0-1) and pan (-1 to 1) settings
   * @throws Error if sprite name not found
   *
   * @example
   * ```typescript
   * // Simple playback
   * sprite.play('laser')
   *
   * // With options
   * sprite.play('explosion', { gain: 0.5, pan: -0.5 })
   *
   * // Rapid fire (each creates new source)
   * sprite.play('laser')
   * sprite.play('laser')
   * sprite.play('laser')
   * ```
   */
  play(name: string, options: SpritePlayOptions = {}): void {
    const sprite = this.manifest.spritemap[name]
    if (!sprite) {
      throw new Error(`Sprite "${name}" not found. Available: ${this.names.join(', ')}`)
    }

    // Validate sprite boundaries against the audio buffer
    if (sprite.start < 0) {
      throw new Error(`Sprite "${name}" has invalid start time: ${sprite.start} (must be >= 0)`)
    }
    if (sprite.end > this.audioBuffer.duration) {
      throw new Error(
        `Sprite "${name}" end time ${sprite.end}s exceeds buffer duration ${this.audioBuffer.duration}s`,
      )
    }

    const { gain = 1, pan = 0 } = options

    // Create new source node for this playback
    const source = this.audioContext.createBufferSource()
    source.buffer = this.audioBuffer
    source.loop = sprite.loop ?? false

    // Build the audio routing chain
    let currentNode: AudioNode = source

    // Create GainNode if gain is not default
    const gainNode = this.audioContext.createGain()
    gainNode.gain.value = gain
    currentNode.connect(gainNode)
    currentNode = gainNode

    // Create StereoPannerNode if pan is not default
    const pannerNode = this.audioContext.createStereoPanner()
    pannerNode.pan.value = pan
    currentNode.connect(pannerNode)
    currentNode = pannerNode

    // Connect to destination
    currentNode.connect(this.audioContext.destination)

    // Calculate offset and duration
    const offset = sprite.start
    const duration = sprite.end - sprite.start

    // Track looping sources so they can be stopped via stop(name)
    if (sprite.loop) {
      if (!this.activeSources.has(name)) {
        this.activeSources.set(name, [])
      }
      this.activeSources.get(name)!.push(source)
    }

    // Start playback
    source.start(this.audioContext.currentTime, offset, duration)

    // Cleanup after playback ends
    source.onended = () => {
      // Remove from active sources tracking
      const sources = this.activeSources.get(name)
      if (sources) {
        const idx = sources.indexOf(source)
        if (idx !== -1) {
          sources.splice(idx, 1)
        }
        if (sources.length === 0) {
          this.activeSources.delete(name)
        }
      }

      try {
        source.disconnect()
        gainNode.disconnect()
        pannerNode.disconnect()
      }
      catch {
        // Already disconnected
      }
      source.onended = null
    }
  }

  /**
   * Stop all active playback of the named sprite.
   *
   * Only useful for sprites defined with `loop: true`, since non-looping sprites
   * stop automatically when their duration elapses.
   *
   * @param name - The sprite name to stop
   *
   * @example
   * ```typescript
   * sprite.play('bgmusic') // starts looping
   * // later...
   * sprite.stop('bgmusic') // stops the loop
   * ```
   */
  stop(name: string): void {
    const sources = this.activeSources.get(name) ?? []
    sources.forEach((source) => {
      try {
        source.stop()
      }
      catch {
        // Already stopped
      }
    })
    this.activeSources.delete(name)
  }

  /**
   * Stop all active looping sprites.
   *
   * @example
   * ```typescript
   * sprite.play('bgmusic')
   * sprite.play('ambient')
   * sprite.stopAll() // stops both
   * ```
   */
  stopAll(): void {
    this.activeSources.forEach((_, name) => {
      this.stop(name)
    })
  }
}
