import type { Track } from '../track'

/**
 * Generates an equal-power crossfade curve using cosine/sine functions.
 * Equal-power curves maintain constant power during crossfading: cos²(x) + sin²(x) = 1
 *
 * @param direction - 'in' for fade-in (0→1 sin curve), 'out' for fade-out (1→0 cos curve)
 * @param length - Number of samples in the curve (typically 256)
 * @returns Float32Array containing the curve values
 *
 * @example
 * ```typescript
 * const fadeIn = generateEqualPowerCurve('in', 256)   // 0→1
 * const fadeOut = generateEqualPowerCurve('out', 256) // 1→0
 * ```
 */
export function generateEqualPowerCurve(
  direction: 'in' | 'out',
  length: number,
): Float32Array {
  const curve = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    const percent = i / (length - 1)
    const angle = percent * 0.5 * Math.PI // 0 to PI/2

    curve[i] = direction === 'in'
      ? Math.sin(angle) // 0 → 1
      : Math.cos(angle) // 1 → 0
  }

  return curve
}

/**
 * Options for crossfade behavior.
 */
export interface CrossfadeOptions {
  /**
   * What to do with the outgoing track after the fade completes.
   *
   * - `'continue'` — track keeps playing at gain 0 (DJ-style, seamless crossfade back)
   * - `'pause'` — track is paused (preserves position, frees resources)
   * - `'stop'` — track is stopped and position resets to 0
   *
   * @default 'pause'
   */
  afterFade?: 'continue' | 'pause' | 'stop'
}

/**
 * Smoothly crossfades from one Track to another using equal-power curves.
 * This creates a DJ-style transition without volume dips at the midpoint.
 *
 * Behavior:
 * - Source track (fromTrack): fades out from current gain to 0
 * - Destination track (toTrack): fades in from current gain (or 0) to 1
 * - After fade, the source track behavior depends on `afterFade` option
 * - If destination is already playing, continues from current position
 * - If destination is not playing, resumes from paused position or starts fresh
 *
 * @param fromTrack - Track to fade out
 * @param toTrack - Track to fade in
 * @param duration - Crossfade duration in seconds
 * @param options - Crossfade behavior options
 * @returns Promise that resolves when crossfade completes
 *
 * @example
 * ```typescript
 * // Crossfade with default behavior (pause outgoing track)
 * await crossfade(track1, track2, 2)
 *
 * // DJ-style: outgoing track keeps playing silently
 * await crossfade(track1, track2, 2, { afterFade: 'continue' })
 * ```
 */
/** Module-level cached crossfade curves (256 samples, mathematically constant). */
const CURVE_LENGTH = 256
const _cachedFadeOutCurve = generateEqualPowerCurve('out', CURVE_LENGTH)
const _cachedFadeInCurve = generateEqualPowerCurve('in', CURVE_LENGTH)

export async function crossfade(
  fromTrack: Track,
  toTrack: Track,
  duration: number,
  options?: CrossfadeOptions,
): Promise<void> {
  const afterFade = options?.afterFade ?? 'pause'
  const isToTrackPlaying = toTrack.isPlaying
  const audioContext = fromTrack.audioContext
  const startTime = audioContext.currentTime

  const fadeOutCurve = _cachedFadeOutCurve
  const fadeInCurve = _cachedFadeInCurve

  // Fade out source track from current gain value
  const fromGain = fromTrack.getGainNode().gain
  fromGain.cancelScheduledValues(startTime)
  fromGain.setValueAtTime(fromGain.value, startTime)
  fromGain.setValueCurveAtTime(fadeOutCurve, startTime, duration)

  // Fade in destination track
  const toGain = toTrack.getGainNode().gain
  toGain.cancelScheduledValues(startTime)
  if (!isToTrackPlaying) {
    // Not playing — set gain to 0 slightly before the curve starts, then resume or play
    toGain.setValueAtTime(0, Math.max(0, startTime - 0.001))
    toGain.setValueCurveAtTime(fadeInCurve, startTime, duration)
    // If track was previously paused (e.g., from a prior crossfade), resume from position
    if (toTrack.position.raw > 0) {
      toTrack.resume()
    }
    else {
      await toTrack.play()
    }
  }
  else {
    toGain.setValueAtTime(toGain.value, startTime)
    toGain.setValueCurveAtTime(fadeInCurve, startTime, duration)
  }

  // Return promise that resolves after fade completes
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      fromGain.cancelScheduledValues(0)

      if (afterFade === 'continue') {
        // Keep playing silently — just reset gain to 0
        fromGain.setValueAtTime(0, audioContext.currentTime)
      }
      else if (afterFade === 'stop') {
        // Use .catch() to prevent unhandled rejections if stop() rejects
        // (e.g., track already stopped or disposed) (QC-1-19)
        fromTrack.stop().catch(() => {})
        // Use changeGainTo() to sync _targetGain for future playback (QC-1-20)
        fromTrack.changeGainTo(1.0)
      }
      else {
        // 'pause' (default)
        fromTrack.pause()
        // Use changeGainTo() to sync _targetGain for future playback (QC-1-20)
        fromTrack.changeGainTo(1.0)
      }

      resolve()
    }, duration * 1000)
  })
}
