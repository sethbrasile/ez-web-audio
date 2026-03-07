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
 * A Howler-style sprite tuple: `[offset_ms, duration_ms]` or `[offset_ms, duration_ms, loop]`.
 *
 * @example
 * ```typescript
 * const laser: HowlerSpriteTuple = [0, 300]           // 0-300ms, no loop
 * const bgm: HowlerSpriteTuple = [4000, 500, true]    // 4000-4500ms, loop
 * ```
 */
export type HowlerSpriteTuple = [number, number] | [number, number, boolean]

/**
 * Howler.js-compatible sprite manifest format.
 *
 * Uses `sprite` key with millisecond-based tuples.
 *
 * @example
 * ```typescript
 * const manifest: HowlerSpriteManifest = {
 *   sprite: {
 *     laser: [0, 300],
 *     explosion: [1000, 2500],
 *     bgm: [4000, 10000, true]
 *   }
 * }
 * ```
 */
export interface HowlerSpriteManifest {
  /** Optional: source audio files */
  src?: string[]
  /** Map of sprite names to `[offset_ms, duration_ms, loop?]` tuples */
  sprite: Record<string, HowlerSpriteTuple>
}

/**
 * Audiosprite-compatible manifest format.
 *
 * Uses `spritemap` key with second-based `{start, end, loop?}` objects.
 *
 * @example
 * ```typescript
 * const manifest: AudiospriteManifest = {
 *   spritemap: {
 *     laser: { start: 0, end: 0.3 },
 *     explosion: { start: 1.0, end: 2.5 }
 *   }
 * }
 * ```
 */
export interface AudiospriteManifest {
  /** Optional: alternative audio formats */
  resources?: string[]
  /** Map of sprite names to their definitions */
  spritemap: Record<string, SpriteDefinition>
}

/**
 * Union type accepting either Howler.js or audiosprite manifest formats.
 *
 * Format detection is automatic based on top-level key presence:
 * - `sprite` key → Howler format (ms-based tuples)
 * - `spritemap` key → audiosprite format (seconds-based objects)
 */
export type SpriteManifest = AudiospriteManifest | HowlerSpriteManifest

/**
 * Type guard that checks whether a manifest is in Howler.js format.
 *
 * @param manifest - The manifest to check
 * @returns `true` if the manifest has a `sprite` key (Howler format)
 */
export function isHowlerManifest(manifest: SpriteManifest): manifest is HowlerSpriteManifest {
  return 'sprite' in manifest && !('spritemap' in manifest)
}

/**
 * Normalize any supported manifest format to audiosprite format.
 *
 * If the manifest is already in audiosprite format, it is returned as-is (same reference).
 * Howler manifests are converted: ms tuples become seconds-based `{start, end, loop}` objects.
 *
 * @param manifest - A manifest in either Howler or audiosprite format
 * @returns An `AudiospriteManifest` with all values in seconds
 *
 * @example
 * ```typescript
 * // Howler format is normalized automatically
 * const normalized = normalizeManifest({
 *   sprite: { laser: [0, 300], bgm: [4000, 500, true] }
 * })
 * // Result: { spritemap: { laser: { start: 0, end: 0.3, loop: false }, bgm: { start: 4, end: 4.5, loop: true } } }
 * ```
 */
export function normalizeManifest(manifest: SpriteManifest): AudiospriteManifest {
  if (!isHowlerManifest(manifest)) {
    return manifest
  }
  const spritemap: Record<string, SpriteDefinition> = {}
  for (const [name, tuple] of Object.entries(manifest.sprite)) {
    spritemap[name] = {
      start: tuple[0] / 1000,
      end: (tuple[0] + tuple[1]) / 1000,
      loop: tuple[2] ?? false,
    }
  }
  return { spritemap }
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

  /** Whether this sprite has been disposed. */
  private _disposed = false

  private audioContext: AudioContext
  private audioBuffer: AudioBuffer | null
  private manifest: AudiospriteManifest

  constructor(
    audioContext: AudioContext,
    audioBuffer: AudioBuffer,
    manifest: AudiospriteManifest,
  ) {
    this.audioContext = audioContext
    this.audioBuffer = audioBuffer
    this.manifest = manifest
  }

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
    if (this._disposed || !this.audioBuffer) {
      throw new Error('AudioSprite has been disposed')
    }

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
    source.loop = false

    // Build the audio routing chain — skip nodes at default values
    let currentNode: AudioNode = source
    let gainNode: GainNode | null = null
    let pannerNode: StereoPannerNode | null = null

    if (gain !== 1) {
      gainNode = this.audioContext.createGain()
      gainNode.gain.value = gain
      currentNode.connect(gainNode)
      currentNode = gainNode
    }

    if (pan !== 0) {
      pannerNode = this.audioContext.createStereoPanner()
      pannerNode.pan.value = pan
      currentNode.connect(pannerNode)
      currentNode = pannerNode
    }

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
    if (sprite.loop) {
      // Do not pass duration when looping — duration arg stops the source after
      // that many seconds regardless of the loop property (Web Audio API spec)
      source.loop = true
      source.loopStart = offset
      source.loopEnd = sprite.end
      source.start(this.audioContext.currentTime, offset)
    }
    else {
      source.start(this.audioContext.currentTime, offset, duration)
    }

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
        if (gainNode)
          gainNode.disconnect()
        if (pannerNode)
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

  /**
   * Release the audio buffer and stop all active sources.
   *
   * After disposal, calling play() will throw an error.
   * Use this to free memory when the sprite is no longer needed.
   *
   * @example
   * ```typescript
   * const sprite = await createSprite('sounds.mp3', manifest)
   * sprite.play('laser')
   *
   * // When done with the sprite
   * sprite.dispose()
   * // sprite.play('laser') // throws: AudioSprite has been disposed
   * ```
   */
  dispose(): void {
    this.stopAll()
    this.activeSources.clear()
    this.audioBuffer = null
    this._disposed = true
  }
}
