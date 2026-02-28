import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { CompressorEffect, createCompressor } from './compressor-effect'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('compressorEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with default options', () => {
      const effect = new CompressorEffect(audioContext)
      expect(effect).toBeTruthy()
    })

    it('implements Effect interface', () => {
      const effect: Effect = new CompressorEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('uses default values when no options provided', () => {
      const effect = new CompressorEffect(audioContext)
      expect(effect.threshold).toBe(-24)
      expect(effect.ratio).toBe(4)
      expect(effect.knee).toBe(30)
      expect(effect.attack).toBe(0.003)
      expect(effect.release).toBe(0.25)
    })

    it('respects custom options', () => {
      const effect = new CompressorEffect(audioContext, {
        threshold: -30,
        ratio: 8,
        knee: 10,
        attack: 0.001,
        release: 0.5,
        mix: 0.6,
      })
      expect(effect.threshold).toBe(-30)
      expect(effect.ratio).toBe(8)
      expect(effect.knee).toBe(10)
      expect(effect.attack).toBe(0.001)
      expect(effect.release).toBe(0.5)
      expect(effect.mix).toBe(0.6)
    })
  })

  describe('parameter getters/setters', () => {
    it('threshold can be updated', () => {
      const effect = new CompressorEffect(audioContext)
      effect.threshold = -30
      expect(effect.threshold).toBe(-30)
    })

    it('ratio can be updated', () => {
      const effect = new CompressorEffect(audioContext)
      effect.ratio = 8
      expect(effect.ratio).toBe(8)
    })

    it('knee can be updated', () => {
      const effect = new CompressorEffect(audioContext)
      effect.knee = 10
      expect(effect.knee).toBe(10)
    })

    it('attack can be updated', () => {
      const effect = new CompressorEffect(audioContext)
      effect.attack = 0.001
      expect(effect.attack).toBe(0.001)
    })

    it('release can be updated', () => {
      const effect = new CompressorEffect(audioContext)
      effect.release = 0.5
      expect(effect.release).toBe(0.5)
    })

    // M8: Parameter range clamping
    it('M8: ratio=0.5 is clamped to 1', () => {
      const effect = new CompressorEffect(audioContext)
      effect.ratio = 0.5
      expect(effect.ratio).toBeGreaterThanOrEqual(1)
    })

    it('M8: ratio=25 is clamped to 20', () => {
      const effect = new CompressorEffect(audioContext)
      effect.ratio = 25
      expect(effect.ratio).toBeLessThanOrEqual(20)
    })

    it('M8: attack=2 is clamped to 1', () => {
      const effect = new CompressorEffect(audioContext)
      effect.attack = 2
      expect(effect.attack).toBeLessThanOrEqual(1)
    })

    it('M8: attack=-1 is clamped to 0', () => {
      const effect = new CompressorEffect(audioContext)
      effect.attack = -1
      expect(effect.attack).toBeGreaterThanOrEqual(0)
    })

    it('M8: release=2 is clamped to 1', () => {
      const effect = new CompressorEffect(audioContext)
      effect.release = 2
      expect(effect.release).toBeLessThanOrEqual(1)
    })

    it('M8: release=-1 is clamped to 0', () => {
      const effect = new CompressorEffect(audioContext)
      effect.release = -1
      expect(effect.release).toBeGreaterThanOrEqual(0)
    })

    it('M8: threshold clamped to [-100, 0] range', () => {
      const effect = new CompressorEffect(audioContext)
      effect.threshold = 10
      expect(effect.threshold).toBeLessThanOrEqual(0)
      effect.threshold = -200
      expect(effect.threshold).toBeGreaterThanOrEqual(-100)
    })

    it('M8: knee clamped to [0, 40] range', () => {
      const effect = new CompressorEffect(audioContext)
      effect.knee = -5
      expect(effect.knee).toBeGreaterThanOrEqual(0)
      effect.knee = 50
      expect(effect.knee).toBeLessThanOrEqual(40)
    })
  })

  describe('reduction', () => {
    it('returns a number', () => {
      const effect = new CompressorEffect(audioContext)
      expect(typeof effect.reduction).toBe('number')
    })
  })

  describe('rampTo', () => {
    it('ramps threshold', () => {
      const effect = new CompressorEffect(audioContext)
      expect(() => effect.rampTo('threshold', -30, 1)).not.toThrow()
    })

    it('ramps ratio', () => {
      const effect = new CompressorEffect(audioContext)
      expect(() => effect.rampTo('ratio', 8, 0.5)).not.toThrow()
    })

    it('is no-op for unknown parameters', () => {
      const effect = new CompressorEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })
  })

  describe('createCompressor factory', () => {
    it('creates compressor with AudioContext', () => {
      const comp = createCompressor(audioContext)
      expect(comp).toBeInstanceOf(CompressorEffect)
      expect(comp.threshold).toBe(-24)
    })

    it('creates compressor with AudioContext and options', () => {
      const comp = createCompressor(audioContext, { threshold: -30, ratio: 8 })
      expect(comp.threshold).toBe(-30)
      expect(comp.ratio).toBe(8)
    })
  })
})
