import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDistortion, DistortionEffect } from './distortion-effect'

function createMockContext() {
  const ctx = new Mock() as unknown as AudioContext

  // Always override createWaveShaper - the mock's version returns incomplete nodes
  ;(ctx as any).createWaveShaper = () => {
    const node = ctx.createGain() as any
    node.curve = null
    node.oversample = 'none'
    return node as unknown as WaveShaperNode
  }

  return ctx
}

describe('distortionEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with default options', () => {
      const effect = new DistortionEffect(audioContext)
      expect(effect).toBeTruthy()
    })

    it('implements Effect interface', () => {
      const effect: Effect = new DistortionEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('uses default values when no options provided', () => {
      const effect = new DistortionEffect(audioContext)
      expect(effect.type).toBe('soft')
      expect(effect.amount).toBe(50)
      expect(effect.tone).toBe(0.5)
      expect(effect.oversample).toBe('4x')
    })

    it('respects custom options', () => {
      const effect = new DistortionEffect(audioContext, {
        type: 'hard',
        amount: 80,
        tone: 0.7,
        oversample: '2x',
        mix: 0.6,
      })
      expect(effect.type).toBe('hard')
      expect(effect.amount).toBe(80)
      expect(effect.tone).toBe(0.7)
      expect(effect.oversample).toBe('2x')
      expect(effect.mix).toBe(0.6)
    })
  })

  describe('amount', () => {
    it('getter returns current amount', () => {
      const effect = new DistortionEffect(audioContext, { amount: 75 })
      expect(effect.amount).toBe(75)
    })

    it('setter updates amount and regenerates curve', () => {
      const effect = new DistortionEffect(audioContext)
      effect.amount = 80
      expect(effect.amount).toBe(80)
    })

    it('clamps to 0-100', () => {
      const effect = new DistortionEffect(audioContext)
      effect.amount = 150
      expect(effect.amount).toBe(100)
      effect.amount = -10
      expect(effect.amount).toBe(0)
    })
  })

  describe('type', () => {
    it('supports all 4 built-in types', () => {
      const types = ['soft', 'hard', 'fuzz', 'overdrive'] as const
      for (const type of types) {
        const effect = new DistortionEffect(audioContext, { type })
        expect(effect.type).toBe(type)
      }
    })

    it('setter switches curve type', () => {
      const effect = new DistortionEffect(audioContext, { type: 'soft' })
      effect.type = 'fuzz'
      expect(effect.type).toBe('fuzz')
    })

    it('supports custom curve', () => {
      const curve = new Float32Array(44100)
      const effect = new DistortionEffect(audioContext, { type: 'custom', curve })
      expect(effect.type).toBe('custom')
    })
  })

  describe('tone', () => {
    it('getter returns current tone', () => {
      const effect = new DistortionEffect(audioContext, { tone: 0.8 })
      expect(effect.tone).toBe(0.8)
    })

    it('setter updates tone', () => {
      const effect = new DistortionEffect(audioContext)
      effect.tone = 0.3
      expect(effect.tone).toBe(0.3)
    })

    it('clamps to 0-1', () => {
      const effect = new DistortionEffect(audioContext)
      effect.tone = 1.5
      expect(effect.tone).toBe(1)
      effect.tone = -0.5
      expect(effect.tone).toBe(0)
    })
  })

  describe('oversample', () => {
    it('defaults to 4x', () => {
      const effect = new DistortionEffect(audioContext)
      expect(effect.oversample).toBe('4x')
    })

    it('can be set to different values', () => {
      const effect = new DistortionEffect(audioContext)
      effect.oversample = '2x'
      expect(effect.oversample).toBe('2x')
      effect.oversample = 'none'
      expect(effect.oversample).toBe('none')
    })
  })

  describe('rampTo', () => {
    it('ramps tone parameter', () => {
      const effect = new DistortionEffect(audioContext)
      expect(() => effect.rampTo('tone', 0.8, 1)).not.toThrow()
    })

    it('is no-op for unknown parameters', () => {
      const effect = new DistortionEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })
  })

  describe('createDistortion factory', () => {
    it('creates distortion with AudioContext', () => {
      const dist = createDistortion(audioContext)
      expect(dist).toBeInstanceOf(DistortionEffect)
      expect(dist.type).toBe('soft')
      expect(dist.amount).toBe(50)
    })

    it('creates distortion with AudioContext and options', () => {
      const dist = createDistortion(audioContext, { type: 'overdrive', amount: 60 })
      expect(dist.type).toBe('overdrive')
      expect(dist.amount).toBe(60)
    })
  })
})
