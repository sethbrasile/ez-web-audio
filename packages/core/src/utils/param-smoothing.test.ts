import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PARAM_SMOOTHING_TIME_CONSTANT, smoothParamSet } from './param-smoothing'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('smoothParamSet', () => {
  let audioContext: AudioContext
  let gainNode: GainNode

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
  })

  it('calls setTargetAtTime with the shared time constant', () => {
    const spy = vi.spyOn(gainNode.gain, 'setTargetAtTime')
    smoothParamSet(gainNode.gain, 0.5, audioContext.currentTime)
    expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime, PARAM_SMOOTHING_TIME_CONSTANT)
  })

  // R11#9: NaN written to an AudioParam (esp. BiquadFilter/DynamicsCompressor)
  // permanently poisons the node's internal DSP state — no recovery even
  // once a valid value is set later. This is defense-in-depth on top of
  // per-effect setter clamps, so a bug in one effect's clamp logic can't
  // reach the AudioParam layer.
  describe('non-finite guard (R11#9)', () => {
    it('ignores NaN and does not call setTargetAtTime', () => {
      const spy = vi.spyOn(gainNode.gain, 'setTargetAtTime')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      smoothParamSet(gainNode.gain, Number.NaN, audioContext.currentTime)
      expect(spy).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('ignores Infinity and does not call setTargetAtTime', () => {
      const spy = vi.spyOn(gainNode.gain, 'setTargetAtTime')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      smoothParamSet(gainNode.gain, Number.POSITIVE_INFINITY, audioContext.currentTime)
      expect(spy).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('ignores -Infinity and does not call setTargetAtTime', () => {
      const spy = vi.spyOn(gainNode.gain, 'setTargetAtTime')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      smoothParamSet(gainNode.gain, Number.NEGATIVE_INFINITY, audioContext.currentTime)
      expect(spy).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('still applies a valid finite value normally', () => {
      const spy = vi.spyOn(gainNode.gain, 'setTargetAtTime')
      smoothParamSet(gainNode.gain, 0.75, audioContext.currentTime)
      expect(spy).toHaveBeenCalledWith(0.75, audioContext.currentTime, PARAM_SMOOTHING_TIME_CONSTANT)
    })
  })
})
