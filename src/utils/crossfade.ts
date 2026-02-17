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
 * Smoothly crossfades from one Track to another using equal-power curves.
 * This creates a DJ-style transition without volume dips at the midpoint.
 *
 * Behavior:
 * - Source track (fromTrack): fades out from current gain to 0
 * - Destination track (toTrack): fades in from current gain (or 0) to 1
 * - Source track automatically stops and resets gain to 1.0 after fade completes
 * - If destination is already playing, continues from current position
 * - If destination is not playing, starts it at gain 0 then fades in
 *
 * @param fromTrack - Track to fade out (will be stopped after fade)
 * @param toTrack - Track to fade in
 * @param duration - Crossfade duration in seconds
 * @returns Promise that resolves when crossfade completes
 *
 * @example
 * ```typescript
 * // Crossfade from track1 to track2 over 2 seconds
 * await crossfade(track1, track2, 2)
 * // track1 is now stopped, track2 is playing
 * ```
 */
export async function crossfade(
  fromTrack: Track,
  toTrack: Track,
  duration: number,
): Promise<void> {
  const isToTrackPlaying = toTrack.isPlaying
  const audioContext = fromTrack.audioContext
  const startTime = audioContext.currentTime

  const curveLength = 256
  const fadeOutCurve = generateEqualPowerCurve('out', curveLength)
  const fadeInCurve = generateEqualPowerCurve('in', curveLength)

  // Fade out source track from current gain value
  const fromGain = fromTrack.gainNode.gain
  fromGain.setValueAtTime(fromGain.value, startTime)
  fromGain.setValueCurveAtTime(fadeOutCurve, startTime, duration)

  // Fade in destination track
  const toGain = toTrack.gainNode.gain
  if (isToTrackPlaying) {
    // Already playing - fade from current gain value
    toGain.setValueAtTime(toGain.value, startTime)
    toGain.setValueCurveAtTime(fadeInCurve, startTime, duration)
  }
  else {
    // Not playing - start at 0 and play
    toGain.setValueAtTime(0, startTime)
    toGain.setValueCurveAtTime(fadeInCurve, startTime, duration)
    await toTrack.play()
  }

  // Return promise that resolves after fade completes
  return new Promise((resolve) => {
    // Use native setTimeout for testability with vi.useFakeTimers
    globalThis.setTimeout(async () => {
      await fromTrack.stop()
      fromGain.setValueAtTime(1.0, audioContext.currentTime)
      resolve()
    }, duration * 1000)
  })
}
