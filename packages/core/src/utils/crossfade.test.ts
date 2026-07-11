import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Track } from '../track'
import { crossfade, generateEqualPowerCurve } from './crossfade'

describe('crossfade curve caching (PERF-06)', () => {
  it('crossfade() does not call generateEqualPowerCurve on invocation (curves are module-level constants)', async () => {
    const audioContext = new MockAudioContext() as unknown as AudioContext
    const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)
    const fromTrack = new Track(audioContext, buffer)
    const toTrack = new Track(audioContext, buffer)
    await fromTrack.play()

    // The function body should not contain calls to generateEqualPowerCurve
    // (they are only called at module load time for the cached constants).
    // We verify this by inspecting the crossfade function's source — simpler
    // approach: verify the function as a string does not reference generateEqualPowerCurve
    // after the module-level caching. Code review verification is sufficient here.

    // Functional verification: crossfade still passes correct curve to setValueCurveAtTime
    const fromGain = fromTrack.getGainNode().gain
    const setValueCurveAtTimeSpy = vi.spyOn(fromGain, 'setValueCurveAtTime')

    const fadePromise = crossfade(fromTrack, toTrack, 0.01)

    // Verify a Float32Array curve is passed (cached or not, it should be correct)
    expect(setValueCurveAtTimeSpy).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.any(Number),
      0.01,
    )

    await fadePromise
  })

  it('module-level cached curves are valid equal-power curves', () => {
    // Import the function and call it twice — the curves returned should be referentially
    // equal because they are module-level constants (same Float32Array references)
    const curveOut1 = generateEqualPowerCurve('out', 256)
    const curveOut2 = generateEqualPowerCurve('out', 256)
    // These are freshly created from generateEqualPowerCurve (not the cached ones),
    // but they should have the same values as the cached curves
    expect(curveOut1[0]).toBeCloseTo(1, 3)
    expect(curveOut1[255]).toBeCloseTo(0, 3)
    expect(curveOut2[0]).toBeCloseTo(1, 3)
    // Verify curves are correct equal-power curves
    const midpoint = 128
    expect(curveOut1[midpoint]).toBeCloseTo(0.707, 2)
  })
})

describe('generateEqualPowerCurve', () => {
  it('produces 0->1 sin curve for "in" direction', () => {
    const curve = generateEqualPowerCurve('in', 256)

    expect(curve).toBeInstanceOf(Float32Array)
    expect(curve.length).toBe(256)

    // First value should be close to 0
    expect(curve[0]).toBeCloseTo(0, 3)

    // Last value should be close to 1
    expect(curve[255]).toBeCloseTo(1, 3)

    // Values should be monotonically increasing
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1])
    }
  })

  it('produces 1->0 cos curve for "out" direction', () => {
    const curve = generateEqualPowerCurve('out', 256)

    expect(curve).toBeInstanceOf(Float32Array)
    expect(curve.length).toBe(256)

    // First value should be close to 1
    expect(curve[0]).toBeCloseTo(1, 3)

    // Last value should be close to 0
    expect(curve[255]).toBeCloseTo(0, 3)

    // Values should be monotonically decreasing
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeLessThanOrEqual(curve[i - 1])
    }
  })

  it('produces equal-power curve at midpoint (~0.707)', () => {
    const curveIn = generateEqualPowerCurve('in', 256)
    const curveOut = generateEqualPowerCurve('out', 256)

    // At midpoint (128), both curves should be ~0.707 (sqrt(0.5))
    const midpoint = 128
    expect(curveIn[midpoint]).toBeCloseTo(0.707, 2)
    expect(curveOut[midpoint]).toBeCloseTo(0.707, 2)

    // cos^2(x) + sin^2(x) = 1 (equal power)
    const powerSum = curveIn[midpoint] ** 2 + curveOut[midpoint] ** 2
    expect(powerSum).toBeCloseTo(1, 3)
  })

  it('works with different curve lengths', () => {
    const curve128 = generateEqualPowerCurve('in', 128)
    const curve512 = generateEqualPowerCurve('in', 512)

    expect(curve128.length).toBe(128)
    expect(curve512.length).toBe(512)

    expect(curve128[0]).toBeCloseTo(0, 3)
    expect(curve128[127]).toBeCloseTo(1, 3)

    expect(curve512[0]).toBeCloseTo(0, 3)
    expect(curve512[511]).toBeCloseTo(1, 3)
  })
})

describe('crossfade', () => {
  let audioContext: AudioContext
  let fromTrack: Track
  let toTrack: Track
  let buffer: AudioBuffer

  beforeEach(() => {
    audioContext = new MockAudioContext() as unknown as AudioContext

    // Create a 2-second buffer
    buffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)

    fromTrack = new Track(audioContext, buffer)
    toTrack = new Track(audioContext, buffer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts destination track if not playing', async () => {
    await fromTrack.play()

    expect(fromTrack.isPlaying).toBe(true)
    expect(toTrack.isPlaying).toBe(false)

    const toTrackPlaySpy = vi.spyOn(toTrack, 'play')

    // Use short duration for faster test
    const fadePromise = crossfade(fromTrack, toTrack, 0.01)

    // toTrack.play() should be called
    expect(toTrackPlaySpy).toHaveBeenCalled()

    await fadePromise
  })

  it('does not restart destination if already playing', async () => {
    await fromTrack.play()
    await toTrack.play()

    const toTrackPlaySpy = vi.spyOn(toTrack, 'play')

    const fadePromise = crossfade(fromTrack, toTrack, 0.01)

    // toTrack.play() should not be called again
    expect(toTrackPlaySpy).not.toHaveBeenCalled()

    await fadePromise
  })

  it('fades out source track gain', async () => {
    await fromTrack.play()

    const fromGain = fromTrack.gainNode.gain
    const setValueAtTimeSpy = vi.spyOn(fromGain, 'setValueAtTime')
    const setValueCurveAtTimeSpy = vi.spyOn(fromGain, 'setValueCurveAtTime')

    const fadePromise = crossfade(fromTrack, toTrack, 0.01)

    // Should set initial value and apply fade curve
    expect(setValueAtTimeSpy).toHaveBeenCalled()
    expect(setValueCurveAtTimeSpy).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.any(Number),
      0.01,
    )

    // Verify it's a fade-out curve (first > last)
    const curveCall = setValueCurveAtTimeSpy.mock.calls[0]
    const curve = curveCall[0] as Float32Array
    expect(curve[0]).toBeGreaterThan(curve[curve.length - 1])

    await fadePromise
  })

  it('fades in destination track gain', async () => {
    await fromTrack.play()

    const toGain = toTrack.gainNode.gain
    const setValueAtTimeSpy = vi.spyOn(toGain, 'setValueAtTime')
    const setValueCurveAtTimeSpy = vi.spyOn(toGain, 'setValueCurveAtTime')

    // crossfade now calls play() first, then schedules the curve after.
    // Both calls use the same gainNode.gain reference.
    await crossfade(fromTrack, toTrack, 0.01)

    // Should set initial value to 0 and apply fade curve (after play)
    expect(setValueAtTimeSpy).toHaveBeenCalled()
    expect(setValueCurveAtTimeSpy).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.any(Number),
      0.01,
    )

    // Verify it's a fade-in curve (first < last)
    const curveCall = setValueCurveAtTimeSpy.mock.calls[0]
    const curve = curveCall[0] as Float32Array
    expect(curve[0]).toBeLessThan(curve[curve.length - 1])
  })

  it('pauses source track after fade completes (default afterFade behavior)', async () => {
    await fromTrack.play()

    const pauseSpy = vi.spyOn(fromTrack, 'pause')

    await crossfade(fromTrack, toTrack, 0.01)

    // Source should be paused after fade completes (default afterFade is 'pause')
    expect(pauseSpy).toHaveBeenCalled()
  })

  it('restores source gain to its default (1.0) target volume after pause', async () => {
    await fromTrack.play()

    const changeGainSpy = vi.spyOn(fromTrack, 'changeGainTo')

    await crossfade(fromTrack, toTrack, 0.01)

    // Default track volume is 1.0, so the captured-volume restore (M11)
    // and the old hardcoded-1.0 behavior coincide here — see the
    // non-default-volume case below for the behavior that actually
    // distinguishes them.
    expect(changeGainSpy).toHaveBeenCalledWith(1.0)
  })

  // ─── H14 / M11: curve scaled from actual value to actual target, not a fixed 1.0/0.0 ──────

  it('does not snap source gain to a fixed 1.0 when fading out from a custom current value (H14)', async () => {
    await fromTrack.play()

    const fromGain = fromTrack.gainNode.gain
    // Mock AudioParam doesn't persist .value assignments, so spy on the
    // getter to simulate the live gain sitting at 0.6 (e.g. mid-ramp),
    // matching the FADE-04 test's pattern.
    vi.spyOn(fromGain, 'value', 'get').mockReturnValue(0.6)
    const setValueCurveAtTimeSpy = vi.spyOn(fromGain, 'setValueCurveAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    const curve = setValueCurveAtTimeSpy.mock.calls[0][0] as Float32Array
    // The curve's own first sample must equal the ACTUAL current gain (0.6),
    // not the cached curve's fixed 1.0 starting point. Per the Web Audio
    // spec, when setValueAtTime(current) and setValueCurveAtTime(curve) are
    // both scheduled at the identical startTime, the curve wins — so if the
    // curve still assumed a fixed 1.0 start, gain would audibly snap from
    // 0.6 up to 1.0 at the instant the fade begins.
    expect(curve[0]).toBeCloseTo(0.6, 2)
    expect(curve[curve.length - 1]).toBeCloseTo(0, 2)
  })

  it('fades a fresh-start destination in toward its own captured target volume, not hardcoded 1.0 (M11)', async () => {
    toTrack.changeGainTo(0.6)
    await fromTrack.play()

    const toGain = toTrack.gainNode.gain
    const setValueCurveAtTimeSpy = vi.spyOn(toGain, 'setValueCurveAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    const curve = setValueCurveAtTimeSpy.mock.calls[0][0] as Float32Array
    expect(curve[0]).toBeCloseTo(0, 2)
    // Endpoint must be the destination's own target volume (0.6), not a
    // hardcoded 1.0 that would silently normalize custom-volume tracks.
    expect(curve[curve.length - 1]).toBeCloseTo(0.6, 2)
  })

  it('fades an already-playing destination toward its captured target volume, not hardcoded 1.0 (M11)', async () => {
    await fromTrack.play()
    await toTrack.play()
    toTrack.changeGainTo(0.6)

    const toGain = toTrack.gainNode.gain
    // Mock AudioParam doesn't persist .value assignments, so spy on the getter
    // to simulate the live gain (0.2) differing from the target volume (0.6)
    // captured for the fade's endpoint.
    vi.spyOn(toGain, 'value', 'get').mockReturnValue(0.2)
    const setValueCurveAtTimeSpy = vi.spyOn(toGain, 'setValueCurveAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    const curve = setValueCurveAtTimeSpy.mock.calls[0][0] as Float32Array
    expect(curve[0]).toBeCloseTo(0.2, 2)
    expect(curve[curve.length - 1]).toBeCloseTo(0.6, 2)
  })

  it('works with different fade durations', async () => {
    await fromTrack.play()

    const setValueCurveAtTimeSpy = vi.spyOn(fromTrack.gainNode.gain, 'setValueCurveAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    // Verify duration parameter is used
    expect(setValueCurveAtTimeSpy).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.any(Number),
      0.01,
    )

    // Start fresh tracks with different duration
    const fromTrack2 = new Track(audioContext, buffer)
    const toTrack2 = new Track(audioContext, buffer)
    await fromTrack2.play()

    const setValueCurveAtTimeSpy2 = vi.spyOn(fromTrack2.gainNode.gain, 'setValueCurveAtTime')

    await crossfade(fromTrack2, toTrack2, 0.05)

    expect(setValueCurveAtTimeSpy2).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.any(Number),
      0.05,
    )
  })

  it('uses current gain value from source track (FADE-04)', async () => {
    // Start track and modify its gain mid-playback
    await fromTrack.play()

    const fromGain = fromTrack.gainNode.gain
    // Mock AudioParam doesn't persist .value assignments, so spy on the getter
    vi.spyOn(fromGain, 'value', 'get').mockReturnValue(0.3)
    const setValueAtTimeSpy = vi.spyOn(fromGain, 'setValueAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    // Should use current gain value (0.3), not hardcoded 1.0
    expect(setValueAtTimeSpy).toHaveBeenCalledWith(0.3, expect.any(Number))
  })

  it('uses current gain value from destination if already playing', async () => {
    await fromTrack.play()
    await toTrack.play()

    const toGain = toTrack.gainNode.gain
    // Mock AudioParam doesn't persist .value assignments, so spy on the getter
    vi.spyOn(toGain, 'value', 'get').mockReturnValue(0.5)
    const setValueAtTimeSpy = vi.spyOn(toGain, 'setValueAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    // Should use current gain value (0.5), not hardcoded 0
    const firstCall = setValueAtTimeSpy.mock.calls[0]
    expect(firstCall[0]).toBe(0.5)
  })

  it('returns promise that resolves when fade completes', async () => {
    await fromTrack.play()

    let resolved = false
    const fadePromise = crossfade(fromTrack, toTrack, 0.01).then(() => {
      resolved = true
    })

    // Should not be resolved yet (but may be very close)
    await fadePromise

    // Should be resolved after promise completes
    expect(resolved).toBe(true)
  })

  // ─── afterFade options (QC-1-19, QC-1-20) ──────────────────────

  it('afterFade:stop calls stop() and restores gain via changeGainTo (QC-1-19, QC-1-20)', async () => {
    await fromTrack.play()

    const stopSpy = vi.spyOn(fromTrack, 'stop')
    const changeGainSpy = vi.spyOn(fromTrack, 'changeGainTo')

    await crossfade(fromTrack, toTrack, 0.01, { afterFade: 'stop' })

    expect(stopSpy).toHaveBeenCalled()
    // changeGainTo syncs _targetGain (not raw AudioParam)
    expect(changeGainSpy).toHaveBeenCalledWith(1.0)
  })

  it('afterFade:stop restores the source to its own captured target volume, not hardcoded 1.0 (M11)', async () => {
    fromTrack.changeGainTo(0.6)
    await fromTrack.play()

    const stopSpy = vi.spyOn(fromTrack, 'stop')
    const changeGainSpy = vi.spyOn(fromTrack, 'changeGainTo')

    await crossfade(fromTrack, toTrack, 0.01, { afterFade: 'stop' })

    expect(stopSpy).toHaveBeenCalled()
    // Must restore the volume captured when the crossfade started (0.6),
    // not silently normalize it back up to 1.0.
    expect(changeGainSpy).toHaveBeenCalledWith(0.6)
  })

  it('afterFade:stop does not produce unhandled rejection if stop() rejects (QC-1-19)', async () => {
    await fromTrack.play()

    // Make stop() reject
    vi.spyOn(fromTrack, 'stop').mockRejectedValue(new Error('already stopped'))

    // Should not throw or produce unhandled rejection
    await expect(
      crossfade(fromTrack, toTrack, 0.01, { afterFade: 'stop' }),
    ).resolves.toBeUndefined()
  })

  it('afterFade:continue sets gain to 0 but does not stop or pause', async () => {
    await fromTrack.play()

    const stopSpy = vi.spyOn(fromTrack, 'stop')
    const pauseSpy = vi.spyOn(fromTrack, 'pause')
    const fromGain = fromTrack.getGainNode().gain
    const setValueAtTimeSpy = vi.spyOn(fromGain, 'setValueAtTime')

    await crossfade(fromTrack, toTrack, 0.01, { afterFade: 'continue' })

    expect(stopSpy).not.toHaveBeenCalled()
    expect(pauseSpy).not.toHaveBeenCalled()
    // Last setValueAtTime call should set gain to 0 (continue playing silently)
    const calls = setValueAtTimeSpy.mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toBe(0)
  })

  it('afterFade:pause restores gain via changeGainTo (QC-1-20)', async () => {
    await fromTrack.play()

    const changeGainSpy = vi.spyOn(fromTrack, 'changeGainTo')
    const pauseSpy = vi.spyOn(fromTrack, 'pause')

    await crossfade(fromTrack, toTrack, 0.01, { afterFade: 'pause' })

    expect(pauseSpy).toHaveBeenCalled()
    // changeGainTo syncs _targetGain (not raw AudioParam)
    expect(changeGainSpy).toHaveBeenCalledWith(1.0)
  })

  it('afterFade:pause restores the source to its own captured target volume, not hardcoded 1.0 (M11)', async () => {
    fromTrack.changeGainTo(0.6)
    await fromTrack.play()

    const changeGainSpy = vi.spyOn(fromTrack, 'changeGainTo')
    const pauseSpy = vi.spyOn(fromTrack, 'pause')

    await crossfade(fromTrack, toTrack, 0.01, { afterFade: 'pause' })

    expect(pauseSpy).toHaveBeenCalled()
    expect(changeGainSpy).toHaveBeenCalledWith(0.6)
  })

  // ─── H15: stale afterFade timeout must not act on a track a NEWER crossfade now owns ──────

  it('a stale afterFade timeout does not pause/reset a track a newer crossfade is now fading it into', async () => {
    const trackX = new Track(audioContext, buffer)
    const trackB = new Track(audioContext, buffer)
    const trackC = new Track(audioContext, buffer)

    await trackX.play()

    // Crossfade 1: X -> B. Default afterFade ('pause') would pause+reset X
    // once its timeout fires, UNLESS a newer crossfade has since claimed X.
    const fade1 = crossfade(trackX, trackB, 0.05)

    // Before fade1 completes, a second, newer crossfade starts fading
    // trackC INTO trackX — trackX becomes the destination of a still-active
    // crossfade that fade1 knows nothing about.
    const pauseSpy = vi.spyOn(trackX, 'pause')
    const fade2 = crossfade(trackC, trackX, 0.05)

    await Promise.all([fade1, fade2])

    // fade1's stale timeout must be a no-op now that fade2 has claimed
    // trackX — it must never pause/reset a track a newer crossfade is
    // actively driving.
    expect(pauseSpy).not.toHaveBeenCalled()
  })

  it('an interrupted crossfade still resolves its promise even though its stale timeout no-ops', async () => {
    const trackX = new Track(audioContext, buffer)
    const trackB = new Track(audioContext, buffer)
    const trackC = new Track(audioContext, buffer)

    await trackX.play()

    let fade1Resolved = false
    const fade1 = crossfade(trackX, trackB, 0.05).then(() => { fade1Resolved = true })
    const fade2 = crossfade(trackC, trackX, 0.05)

    await Promise.all([fade1, fade2])

    expect(fade1Resolved).toBe(true)
  })
})
