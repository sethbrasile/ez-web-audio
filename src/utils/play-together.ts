import type { Playable } from '@interfaces/playable'
import { getOrCreateAudioContext } from '@/audio-context'

/** Minimal interface for objects that expose an AudioContext instance */
interface WithAudioContext {
  audioContext: BaseAudioContext
}

function hasAudioContext(p: unknown): p is WithAudioContext {
  return typeof p === 'object' && p !== null && 'audioContext' in p && (p as WithAudioContext).audioContext instanceof BaseAudioContext
}

/**
 * Play multiple sounds synchronized to the exact same AudioContext timestamp.
 *
 * Uses `playAt()` with a shared start time slightly in the future to ensure
 * all sources begin at precisely the same moment. This is more accurate than
 * calling `play()` on each sound sequentially, which would introduce tiny
 * timing differences.
 *
 * @param playables - Array of Playable instances (Sound, Track, Oscillator, etc.)
 * @param audioContext - Optional BaseAudioContext to use for timing
 * @returns Promise that resolves when all sounds have started
 *
 * @example
 * ```typescript
 * import { createSound, playTogether } from 'ez-web-audio'
 *
 * const kick = await createSound('kick.mp3')
 * const snare = await createSound('snare.mp3')
 * const hihat = await createSound('hihat.mp3')
 *
 * await playTogether([kick, snare, hihat])
 * // All three start at the exact same AudioContext time
 *
 * // With explicit AudioContext
 * await playTogether(myAudioContext, [kick, snare, hihat])
 * ```
 */
export async function playTogether(playables: Playable[]): Promise<void>
export async function playTogether(audioContext: BaseAudioContext, playables: Playable[]): Promise<void>
export async function playTogether(
  audioContextOrPlayables: BaseAudioContext | Playable[],
  maybePlayables?: Playable[],
): Promise<void> {
  const isExplicitCtx = audioContextOrPlayables instanceof BaseAudioContext
  const playables = isExplicitCtx ? maybePlayables! : audioContextOrPlayables as Playable[]

  if (playables.length === 0) return

  const ctx = isExplicitCtx
    ? audioContextOrPlayables as AudioContext
    : (playables.find(p => hasAudioContext(p)) as WithAudioContext | undefined)?.audioContext as AudioContext | undefined
      ?? getOrCreateAudioContext()

  // Schedule slightly in the future to ensure all sources start simultaneously
  const startTime = ctx.currentTime + 0.01
  await Promise.all(playables.map(p => p.playAt(startTime)))
}
