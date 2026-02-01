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
 * Uses audiosprite-compatible JSON format for defining sprite timing.
 *
 * @example
 * ```typescript
 * const sprite = await createSprite('sounds.mp3', {
 *   spritemap: {
 *     laser: { start: 0, end: 0.3 },
 *     explosion: { start: 1.0, end: 2.5 }
 *   }
 * })
 * sprite.play('laser', { gain: 0.5 })
 * ```
 */
export class AudioSprite {
  constructor(
    private audioContext: AudioContext,
    private audioBuffer: AudioBuffer,
    private manifest: SpriteManifest,
  ) {}

  /**
   * Get list of available sprite names.
   */
  get names(): string[] {
    return Object.keys(this.manifest.spritemap)
  }

  /**
   * Check if a sprite exists.
   */
  has(name: string): boolean {
    return name in this.manifest.spritemap
  }

  /**
   * Get duration of a sprite in seconds.
   * @throws Error if sprite name not found
   */
  getDuration(name: string): number {
    const sprite = this.manifest.spritemap[name]
    if (!sprite) {
      throw new Error(`Sprite "${name}" not found. Available: ${this.names.join(', ')}`)
    }
    return sprite.end - sprite.start
  }

  /**
   * Play a sprite by name with optional gain/pan.
   * Creates new AudioBufferSourceNode per play (allows concurrent playback).
   * @throws Error if sprite name not found
   */
  play(name: string, options: SpritePlayOptions = {}): void {
    const sprite = this.manifest.spritemap[name]
    if (!sprite) {
      throw new Error(`Sprite "${name}" not found. Available: ${this.names.join(', ')}`)
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

    // Start playback
    source.start(this.audioContext.currentTime, offset, duration)

    // Cleanup after playback ends
    source.onended = () => {
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
}
