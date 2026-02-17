import type { Playable } from '@interfaces/playable'
import { getOrCreateAudioContext } from '@/audio-context'

/**
 * Play multiple sounds synchronized to the exact same AudioContext timestamp.
 *
 * Uses `playAt()` with a shared start time slightly in the future to ensure
 * all sources begin at precisely the same moment. This is more accurate than
 * calling `play()` on each sound sequentially, which would introduce tiny
 * timing differences.
 *
 * @param playables - Array of Playable instances (Sound, Track, Oscillator, etc.)
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
 * ```
 */
export async function playTogether(playables: Playable[]): Promise<void> {
  if (playables.length === 0) return

  // Get audioContext from first playable that has it, or use shared context
  const firstWithCtx = playables.find(p => 'audioContext' in p && (p as any).audioContext)
  const ctx = firstWithCtx
    ? (firstWithCtx as any).audioContext as AudioContext
    : getOrCreateAudioContext()

  // Schedule slightly in the future to ensure all sources start simultaneously
  const startTime = ctx.currentTime + 0.01
  await Promise.all(playables.map(p => p.playAt(startTime)))
}
