import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEQ, EQEffect } from './eq-effect'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('eqEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with default options', () => {
      const effect = new EQEffect(audioContext)
      expect(effect).toBeTruthy()
    })

    it('implements Effect interface', () => {
      const effect: Effect = new EQEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('defaults to flat EQ (all gains at 0)', () => {
      const effect = new EQEffect(audioContext)
      expect(effect.low).toBe(0)
      expect(effect.mid).toBe(0)
      expect(effect.high).toBe(0)
    })

    it('respects custom gain options', () => {
      const effect = new EQEffect(audioContext, {
        low: 6,
        mid: -3,
        high: 2,
        mix: 0.8,
      })
      expect(effect.low).toBe(6)
      expect(effect.mid).toBe(-3)
      expect(effect.high).toBe(2)
      expect(effect.mix).toBe(0.8)
    })

    it('respects custom frequency options', () => {
      const effect = new EQEffect(audioContext, {
        lowFrequency: 150,
        midFrequency: 800,
        highFrequency: 4000,
        midQ: 1.0,
      })
      expect(effect.lowFrequency).toBe(150)
      expect(effect.midFrequency).toBe(800)
      expect(effect.highFrequency).toBe(4000)
      expect(effect.midQ).toBe(1.0)
    })
  })

  describe('gain controls', () => {
    it('low getter/setter works', () => {
      const effect = new EQEffect(audioContext)
      effect.low = 6
      expect(effect.low).toBe(6)
    })

    it('mid getter/setter works', () => {
      const effect = new EQEffect(audioContext)
      effect.mid = -3
      expect(effect.mid).toBe(-3)
    })

    it('high getter/setter works', () => {
      const effect = new EQEffect(audioContext)
      effect.high = 4
      expect(effect.high).toBe(4)
    })
  })

  describe('frequency controls', () => {
    it('lowFrequency defaults to 200', () => {
      const effect = new EQEffect(audioContext)
      expect(effect.lowFrequency).toBe(200)
    })

    it('midFrequency defaults to 1000', () => {
      const effect = new EQEffect(audioContext)
      expect(effect.midFrequency).toBe(1000)
    })

    it('highFrequency defaults to 3000', () => {
      const effect = new EQEffect(audioContext)
      expect(effect.highFrequency).toBe(3000)
    })

    it('lowFrequency can be updated', () => {
      const effect = new EQEffect(audioContext)
      effect.lowFrequency = 150
      expect(effect.lowFrequency).toBe(150)
    })

    it('midFrequency can be updated', () => {
      const effect = new EQEffect(audioContext)
      effect.midFrequency = 800
      expect(effect.midFrequency).toBe(800)
    })

    it('highFrequency can be updated', () => {
      const effect = new EQEffect(audioContext)
      effect.highFrequency = 4000
      expect(effect.highFrequency).toBe(4000)
    })

    it('midQ defaults to 0.7', () => {
      const effect = new EQEffect(audioContext)
      expect(effect.midQ).toBeCloseTo(0.7)
    })

    it('midQ can be updated', () => {
      const effect = new EQEffect(audioContext)
      effect.midQ = 1.5
      expect(effect.midQ).toBe(1.5)
    })
  })

  describe('rampTo', () => {
    it('ramps low gain', () => {
      const effect = new EQEffect(audioContext)
      expect(() => effect.rampTo('low', 6, 1)).not.toThrow()
    })

    it('ramps mid gain', () => {
      const effect = new EQEffect(audioContext)
      expect(() => effect.rampTo('mid', 0, 0.5)).not.toThrow()
    })

    it('ramps high gain', () => {
      const effect = new EQEffect(audioContext)
      expect(() => effect.rampTo('high', -3, 2)).not.toThrow()
    })

    it('is no-op for unknown parameters', () => {
      const effect = new EQEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })
  })

  describe('createEQ factory', () => {
    it('creates EQ with AudioContext', () => {
      const eq = createEQ(audioContext)
      expect(eq).toBeInstanceOf(EQEffect)
      expect(eq.low).toBe(0)
    })

    it('creates EQ with AudioContext and options', () => {
      const eq = createEQ(audioContext, { low: 3, mid: -2, high: 4 })
      expect(eq.low).toBe(3)
      expect(eq.mid).toBe(-2)
      expect(eq.high).toBe(4)
    })
  })
})
