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
