import { MusicallyAware } from './musical-identity'
import { Sound } from './sound'

/**
 * A Sound with musical identity.
 *
 * SampledNote extends Sound with musical properties (letter, accidental, octave,
 * frequency) via the MusicallyAware mixin. Used in Font collections where each
 * sound represents a specific musical note.
 *
 * @example
 * ```typescript
 * import { createFont } from 'ez-web-audio'
 *
 * // SampledNote is typically created via createFont(), not directly
 * const piano = await createFont('piano.js')
 * const noteA4 = piano.getNote('A4')
 *
 * // Access musical properties
 * console.log(noteA4?.frequency)   // 440
 * console.log(noteA4?.identifier)  // "A4"
 * console.log(noteA4?.letter)      // "A"
 * console.log(noteA4?.octave)      // "4"
 *
 * // Use Sound methods
 * noteA4?.changeGainTo(0.5)
 * noteA4?.play()
 * ```
 */
export class SampledNote extends MusicallyAware(Sound) {
  /**
   * Fade duration (seconds) applied just before the sample's natural end.
   * @internal
   */
  private static readonly END_FADE_SEC = 0.15

  /**
   * Schedule a short gain fade that lands just before the buffer runs out.
   *
   * Soundfont samples are often trimmed hard at the end; without this, a
   * note that plays to its natural end truncates audibly. Skipped for very
   * short buffers (percussive one-shots) where a 150ms fade would eat the
   * sound.
   * @protected
   */
  protected override _onPlaybackStarted(): void {
    super._onPlaybackStarted()

    const duration = this.durationRaw
    if (!Number.isFinite(duration) || duration <= SampledNote.END_FADE_SEC * 2 || this._isLooping)
      return

    const gain = this.getGainNode().gain
    const end = this.startedPlayingAt + duration - this.startOffset
    gain.setValueAtTime(this._targetGain, end - SampledNote.END_FADE_SEC)
    gain.linearRampToValueAtTime(0, end - 0.005)
  }
}
