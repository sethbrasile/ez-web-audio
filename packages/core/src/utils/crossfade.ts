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

/**
 * Rescale a normalized equal-power curve so its first sample equals `from`
 * and its last sample equals `to`, preserving the curve's equal-power shape.
 *
 * This is how H14 and M11 are fixed together: instead of scheduling
 * `setValueAtTime(current)` immediately before `setValueCurveAtTime(fixedCurve)`
 * at the identical AudioContext time (where the curve's fixed 1.0/0.0 endpoint
 * wins per spec, snapping gain), the curve itself is built to start exactly at
 * the live value and end exactly at the real target volume — no conflicting
 * schedule entry, no snap, no hardcoded 1.0.
 *
 * Works regardless of the source curve's direction (fade-in 0→1 or fade-out
 * 1→0) by normalizing progress against the curve's own endpoints.
 *
 * @internal
 */
function scaleCurve(curve: Float32Array, from: number, to: number): Float32Array {
  const start = curve[0]
  const end = curve[curve.length - 1]
  const span = end - start
  const scaled = new Float32Array(curve.length)
  for (let i = 0; i < curve.length; i++) {
    const progress = span === 0 ? 0 : (curve[i] - start) / span
    scaled[i] = from + (to - from) * progress
  }
  return scaled
}

/**
 * H15: per-Track fade-generation token. Every crossfade() call stamps both
 * participating tracks with a fresh token. The completion callback (a bare
 * setTimeout) only performs its afterFade cleanup on fromTrack if it still
 * holds the token it was issued — otherwise a NEWER crossfade has since
 * claimed that track (as either side), and the stale timeout no-ops instead
 * of hard-cutting (pause/stop + position reset) a track the newer crossfade
 * is actively driving.
 */
const fadeGenerations = new WeakMap<Track, symbol>()

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

  // M11: capture each track's user-intended volume up front so the fade-in
  // target and the afterFade restore use the ACTUAL volume rather than a
  // hardcoded 1.0 (which silently normalized custom-volume tracks and
  // corrupted _targetGain for the next play()).
  const fromTargetGain = fromTrack.volume
  const toTargetGain = toTrack.volume

  const fadeOutCurve = _cachedFadeOutCurve
  const fadeInCurve = _cachedFadeInCurve

  // H15: stamp both tracks with this call's generation token.
  const myToken = Symbol('crossfade')
  fadeGenerations.set(fromTrack, myToken)
  fadeGenerations.set(toTrack, myToken)

  // Fade out source track from its actual current gain value to 0.
  const fromGain = fromTrack.getGainNode().gain
  fromGain.cancelScheduledValues(startTime)
  fromGain.setValueAtTime(fromGain.value, startTime)
  fromGain.setValueCurveAtTime(scaleCurve(fadeOutCurve, fromGain.value, 0), startTime, duration)

  // Fade in destination track toward ITS OWN captured target volume (M11).
  const toGain = toTrack.getGainNode().gain
  if (!isToTrackPlaying) {
    // Start playback first — play()/resume() calls setup() which schedules
    // setValueAtTime on gain. We must let that happen, then override with our curve.
    if (toTrack.position.raw > 0) {
      toTrack.resume()
    }
    else {
      await toTrack.play()
    }
    // Now cancel whatever setup() scheduled and apply our fade-in curve
    const curTime = audioContext.currentTime
    toGain.cancelScheduledValues(curTime)
    toGain.setValueAtTime(0, curTime)
    toGain.setValueCurveAtTime(scaleCurve(fadeInCurve, 0, toTargetGain), curTime, duration)
  }
  else {
    toGain.cancelScheduledValues(startTime)
    toGain.setValueAtTime(toGain.value, startTime)
    toGain.setValueCurveAtTime(scaleCurve(fadeInCurve, toGain.value, toTargetGain), startTime, duration)
  }

  // Return promise that resolves after fade completes
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      // H15: a newer crossfade has since claimed one of these tracks —
      // skip the cleanup entirely rather than acting on stale state.
      if (fadeGenerations.get(fromTrack) !== myToken) {
        resolve()
        return
      }

      // R12#8: scope cancellation to now, not 0 — cancelScheduledValues(0)
      // wipes the ENTIRE automation history, including unrelated onPlaySet
      // schedules queued after this crossfade started.
      fromGain.cancelScheduledValues(audioContext.currentTime)

      if (afterFade === 'continue') {
        // Keep playing silently — just reset gain to 0
        fromGain.setValueAtTime(0, audioContext.currentTime)
      }
      else if (afterFade === 'stop') {
        // Use .catch() to prevent unhandled rejections if stop() rejects
        // (e.g., track already stopped or disposed) (QC-1-19)
        fromTrack.stop().catch(() => {})
        // Restore the captured target gain (M11) rather than hardcoding 1.0.
        // Use changeGainTo() to sync _targetGain for future playback (QC-1-20)
        fromTrack.changeGainTo(fromTargetGain)
      }
      else {
        // 'pause' (default)
        fromTrack.pause()
        // Restore the captured target gain (M11) rather than hardcoding 1.0.
        // Use changeGainTo() to sync _targetGain for future playback (QC-1-20)
        fromTrack.changeGainTo(fromTargetGain)
      }

      resolve()
    }, duration * 1000)
  })
}
