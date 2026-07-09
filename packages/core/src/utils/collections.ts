import type { Playable } from '@interfaces/playable'
import type { Track } from '@/track'

/**
 * A type representing either a single item or a nested array of items.
 * Used for flexible input to collection utilities.
 */
type NestedArray<T> = (T | T[])[]

/**
 * Error thrown when one or more operations fail in a collection utility.
 */
class CollectionError extends Error {
  constructor(
    message: string,
    public readonly errors: Error[],
    public readonly total: number,
  ) {
    super(message)
    this.name = 'CollectionError'
  }
}

/**
 * Check if an item has a pause method (is a Track).
 */
function hasPauseMethod(item: unknown): item is Track {
  return typeof item === 'object' && item !== null && 'pause' in item && typeof (item as Track).pause === 'function'
}

/**
 * Stops all playable sounds in the provided array.
 * Supports nested arrays which are recursively flattened.
 * Uses best-effort error handling - attempts to stop all sounds even if some fail.
 *
 * @param sounds - Array of Playable instances or nested arrays of Playables
 * @throws CollectionError if any sounds fail to stop
 *
 * @example
 * ```typescript
 * const sounds = [sound1, sound2, [sound3, sound4]]
 * await stopAll(sounds)
 * ```
 */
export async function stopAll(sounds: NestedArray<Playable>): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  const total = flattened.length

  if (total === 0) {
    return
  }

  const results = await Promise.allSettled(
    flattened.map(sound => Promise.resolve(sound.stop())),
  )

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason instanceof Error ? result.reason : new Error(String(result.reason)))

  if (errors.length > 0) {
    throw new CollectionError(
      `Failed to stop ${errors.length} of ${total} sounds`,
      errors,
      total,
    )
  }
}

/**
 * Pauses all tracks in the provided array.
 * Supports nested arrays which are recursively flattened.
 * Skips items that don't have a pause method (only Track has pause).
 * Uses best-effort error handling - attempts to pause all tracks even if some fail.
 *
 * @param tracks - Array of Track instances or nested arrays of Tracks
 * @throws CollectionError if any tracks fail to pause
 *
 * @example
 * ```typescript
 * const tracks = [track1, track2, [track3, track4]]
 * await pauseAll(tracks)
 * ```
 */
export async function pauseAll(tracks: NestedArray<Track>): Promise<void> {
  const flattened = tracks.flat(Infinity) as Track[]
  const pausables = flattened.filter(hasPauseMethod)
  const total = pausables.length

  if (total === 0) {
    return
  }

  const results = await Promise.allSettled(
    pausables.map(track => Promise.resolve(track.pause())),
  )

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason instanceof Error ? result.reason : new Error(String(result.reason)))

  if (errors.length > 0) {
    throw new CollectionError(
      `Failed to pause ${errors.length} of ${total} tracks`,
      errors,
      total,
    )
  }
}

/**
 * Plays all playable sounds in the provided array.
 * Supports nested arrays which are recursively flattened.
 * Uses best-effort error handling - attempts to play all sounds even if some fail.
 *
 * @param sounds - Array of Playable instances or nested arrays of Playables
 * @throws CollectionError if any sounds fail to play
 *
 * @example
 * ```typescript
 * const sounds = [sound1, sound2, [sound3, sound4]]
 * await playAll(sounds)
 * ```
 */
export async function playAll(sounds: NestedArray<Playable>): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  const total = flattened.length

  if (total === 0) {
    return
  }

  const results = await Promise.allSettled(
    flattened.map(sound => Promise.resolve(sound.play())),
  )

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason instanceof Error ? result.reason : new Error(String(result.reason)))

  if (errors.length > 0) {
    throw new CollectionError(
      `Failed to play ${errors.length} of ${total} sounds`,
      errors,
      total,
    )
  }
}
