import { PARAM_SMOOTHING_TIME_CONSTANT } from '@utils/param-smoothing'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompressorEffect } from './compressor-effect'
import { DelayEffect } from './delay-effect'
import { EQEffect } from './eq-effect'
import { FilterEffect } from './filter-effect'
import { ReverbEffect } from './reverb-effect'

function createMockContext() {
  const ctx = new Mock() as unknown as AudioContext

  // Mocks for nodes standardized-audio-context-mock doesn't fully implement
  ;(ctx as any).createDelay = (_maxDelayTime?: number) => {
    const node = ctx.createGain() as any
    node.delayTime = { value: 0, setValueAtTime: () => {}, setTargetAtTime: () => {} }
    return node as unknown as DelayNode
  }

  return ctx
}

/**
 * Regression tests for ez-audio-xn3: un-ramped AudioParam jumps in effect
 * setters cause audible pops (especially with reverb downstream). All
 * continuous-param setters must use setTargetAtTime smoothing, and getters
 * must return the target value immediately (shadow state).
 */
describe('smooth effect parameter setters', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  function expectSmoothedSet(param: AudioParam, setValue: () => void, expected: number): void {
    const spy = vi.spyOn(param, 'setTargetAtTime')
    setValue()
    expect(spy).toHaveBeenCalledWith(expected, expect.any(Number), PARAM_SMOOTHING_TIME_CONSTANT)
  }

  describe('eqEffect', () => {
    it('smooths band gain changes and getter returns target', () => {
      const eq = new EQEffect(audioContext)
      expectSmoothedSet(eq.getParam('low')!, () => void (eq.low = 6), 6)
      expectSmoothedSet(eq.getParam('mid')!, () => void (eq.mid = -3), -3)
      expectSmoothedSet(eq.getParam('high')!, () => void (eq.high = 4), 4)
      expect(eq.low).toBe(6)
      expect(eq.mid).toBe(-3)
      expect(eq.high).toBe(4)
    })

    it('smooths frequency and Q changes', () => {
      const eq = new EQEffect(audioContext)
      expectSmoothedSet(eq.getParam('lowFrequency')!, () => void (eq.lowFrequency = 150), 150)
      expectSmoothedSet(eq.getParam('midFrequency')!, () => void (eq.midFrequency = 900), 900)
      expectSmoothedSet(eq.getParam('highFrequency')!, () => void (eq.highFrequency = 4000), 4000)
      expectSmoothedSet(eq.getParam('midQ')!, () => void (eq.midQ = 1.2), 1.2)
      expect(eq.lowFrequency).toBe(150)
      expect(eq.midQ).toBe(1.2)
    })
  })

  describe('compressorEffect', () => {
    it('smooths threshold/ratio/knee changes and getters return targets', () => {
      const comp = new CompressorEffect(audioContext)
      expectSmoothedSet(comp.getParam('threshold')!, () => void (comp.threshold = -30), -30)
      expectSmoothedSet(comp.getParam('ratio')!, () => void (comp.ratio = 8), 8)
      expectSmoothedSet(comp.getParam('knee')!, () => void (comp.knee = 20), 20)
      expect(comp.threshold).toBe(-30)
      expect(comp.ratio).toBe(8)
      expect(comp.knee).toBe(20)
    })

    it('smooths attack/release changes with clamping intact', () => {
      const comp = new CompressorEffect(audioContext)
      expectSmoothedSet(comp.getParam('attack')!, () => void (comp.attack = 0.05), 0.05)
      expectSmoothedSet(comp.getParam('release')!, () => void (comp.release = 2), 1)
      expect(comp.attack).toBe(0.05)
      expect(comp.release).toBe(1)
    })

    it('clamps threshold to valid range through smoothing', () => {
      const comp = new CompressorEffect(audioContext)
      expectSmoothedSet(comp.getParam('threshold')!, () => void (comp.threshold = -200), -100)
      expect(comp.threshold).toBe(-100)
    })
  })

  describe('delayEffect', () => {
    it('smooths time and feedback changes', () => {
      const delay = new DelayEffect(audioContext)
      expectSmoothedSet(delay.getParam('time')!, () => void (delay.time = 0.4), 0.4)
      expectSmoothedSet(delay.getParam('feedback')!, () => void (delay.feedback = 0.5), 0.5)
      expect(delay.time).toBe(0.4)
      expect(delay.feedback).toBe(0.5)
    })
  })

  describe('filterEffect', () => {
    it('smooths frequency/q/gain/detune changes', () => {
      const filter = new FilterEffect(audioContext)
      expectSmoothedSet(filter.getParam('frequency')!, () => void (filter.frequency = 800), 800)
      expectSmoothedSet(filter.getParam('q')!, () => void (filter.q = 5), 5)
      expectSmoothedSet(filter.getParam('gain')!, () => void (filter.gain = -6), -6)
      expectSmoothedSet(filter.getParam('detune')!, () => void (filter.detune = 100), 100)
      expect(filter.frequency).toBe(800)
      expect(filter.q).toBe(5)
      expect(filter.gain).toBe(-6)
      expect(filter.detune).toBe(100)
    })
  })

  describe('reverbEffect', () => {
    it('smooths preDelay changes', () => {
      const reverb = new ReverbEffect(audioContext)
      expectSmoothedSet(reverb.getParam('preDelay')!, () => void (reverb.preDelay = 0.05), 0.05)
      expect(reverb.preDelay).toBe(0.05)
    })
  })

  describe('wet/dry mix (BaseEffect)', () => {
    it('smooths dry/wet gains when mix changes after construction', () => {
      const eq = new EQEffect(audioContext)
      const dryParam = (eq as any).dryGain.gain as AudioParam
      const wetParam = (eq as any).wetGain.gain as AudioParam
      const drySpy = vi.spyOn(dryParam, 'setTargetAtTime')
      const wetSpy = vi.spyOn(wetParam, 'setTargetAtTime')

      eq.mix = 0.43

      const angle = 0.43 * 0.5 * Math.PI
      expect(drySpy).toHaveBeenCalledWith(Math.cos(angle), expect.any(Number), PARAM_SMOOTHING_TIME_CONSTANT)
      expect(wetSpy).toHaveBeenCalledWith(Math.sin(angle), expect.any(Number), PARAM_SMOOTHING_TIME_CONSTANT)
      expect(eq.mix).toBe(0.43)
    })

    it('smooths bypass toggling', () => {
      const eq = new EQEffect(audioContext)
      const drySpy = vi.spyOn((eq as any).dryGain.gain as AudioParam, 'setTargetAtTime')
      const wetSpy = vi.spyOn((eq as any).wetGain.gain as AudioParam, 'setTargetAtTime')

      eq.bypass = true

      expect(drySpy).toHaveBeenCalledWith(1, expect.any(Number), PARAM_SMOOTHING_TIME_CONSTANT)
      expect(wetSpy).toHaveBeenCalledWith(0, expect.any(Number), PARAM_SMOOTHING_TIME_CONSTANT)
    })
  })
})
