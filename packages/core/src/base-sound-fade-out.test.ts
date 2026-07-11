import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sound } from '@/sound'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext) {
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

describe('baseSound.fadeOut()', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('is a no-op when the sound is not playing', async () => {
    const sound = createSound(audioContext)
    const rampSpy = vi.spyOn(sound.getGainNode().gain, 'linearRampToValueAtTime')

    expect(sound.isPlaying).toBe(false)
    await sound.fadeOut(1)

    expect(rampSpy).not.toHaveBeenCalled()
    expect(sound.isPlaying).toBe(false)
  })

  it('schedules a linear ramp to 0 over the given duration while playing', async () => {
    const sound = createSound(audioContext)
    await sound.play()

    const cancelSpy = vi.spyOn(sound.getGainNode().gain, 'cancelScheduledValues')
    const setSpy = vi.spyOn(sound.getGainNode().gain, 'setValueAtTime')
    const rampSpy = vi.spyOn(sound.getGainNode().gain, 'linearRampToValueAtTime')

    // Don't await — fadeOut's returned promise only resolves once the
    // trailing stop() timeout fires (exercised in the next test).
    void sound.fadeOut(2)

    expect(cancelSpy).toHaveBeenCalledWith(audioContext.currentTime)
    expect(setSpy).toHaveBeenCalledWith(sound.getGainNode().gain.value, audioContext.currentTime)
    expect(rampSpy).toHaveBeenCalledWith(0, audioContext.currentTime + 2)
  })

  it('calls stop() after the fade duration elapses', async () => {
    vi.useFakeTimers()
    try {
      const sound = createSound(audioContext)
      await sound.play()

      const stopSpy = vi.spyOn(sound, 'stop')
      const fadeOutPromise = sound.fadeOut(1)

      expect(stopSpy).not.toHaveBeenCalled()
      expect(sound.isPlaying).toBe(true)

      // Advance the AudioContext clock past the fade duration and pump the
      // shared RAF-driven acTimeout scheduler (same pattern as beat-track's
      // H3 stop-cancels-timers test).
      ;(audioContext as any)._deLorean._position = 1
      vi.advanceTimersByTime(20)
      await fadeOutPromise

      expect(stopSpy).toHaveBeenCalledOnce()
      expect(sound.isPlaying).toBe(false)
    }
    finally {
      vi.useRealTimers()
    }
  })
})
