import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Track } from '../track'
import { crossfade, generateEqualPowerCurve } from './crossfade'

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

    const fadePromise = crossfade(fromTrack, toTrack, 0.01)

    // Should set initial value to 0 and apply fade curve
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

    await fadePromise
  })

  it('stops source track after fade completes', async () => {
    await fromTrack.play()

    const stopSpy = vi.spyOn(fromTrack, 'stop')

    await crossfade(fromTrack, toTrack, 0.01)

    // Source should be stopped after fade completes
    expect(stopSpy).toHaveBeenCalled()
  })

  it('resets source gain to 1.0 after stop', async () => {
    await fromTrack.play()

    const fromGain = fromTrack.gainNode.gain
    const setValueAtTimeSpy = vi.spyOn(fromGain, 'setValueAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    // Gain should be reset to 1.0 for future playback
    // Check that setValueAtTime was called with 1.0 after the fade
    const setValueAtTimeCalls = setValueAtTimeSpy.mock.calls
    const lastCall = setValueAtTimeCalls[setValueAtTimeCalls.length - 1]
    expect(lastCall[0]).toBe(1.0)
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
    fromTrack.gainNode.gain.value = 0.3

    const fromGain = fromTrack.gainNode.gain
    const setValueAtTimeSpy = vi.spyOn(fromGain, 'setValueAtTime')

    await crossfade(fromTrack, toTrack, 0.01)

    // Should use current gain value (0.3), not hardcoded 1.0
    expect(setValueAtTimeSpy).toHaveBeenCalledWith(0.3, expect.any(Number))
  })

  it('uses current gain value from destination if already playing', async () => {
    await fromTrack.play()
    await toTrack.play()
    toTrack.gainNode.gain.value = 0.5

    const toGain = toTrack.gainNode.gain
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
})
