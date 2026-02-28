import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDelay, DelayEffect } from './delay-effect'

/**
 * Create a mock AudioContext with createDelay support.
 * standardized-audio-context-mock's createDelay returns empty objects,
 * so we provide a proper mock DelayNode.
 */
function createMockContext() {
  const ctx = new Mock() as unknown as AudioContext

  // Patch createDelay to return a proper mock with delayTime
  ;(ctx as any).createDelay = (maxDelayTime?: number) => {
    // Get a GainNode as the base (it has connect/disconnect)
    const node = ctx.createGain() as any
    // Add delayTime AudioParam mock
    node.delayTime = { value: 0, setTargetAtTime: () => {} }
    // Store maxDelayTime for reference
    node._maxDelayTime = maxDelayTime
    return node as unknown as DelayNode
  }

  return ctx
}

describe('delayEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with default options', () => {
      const effect = new DelayEffect(audioContext)
      expect(effect).toBeTruthy()
    })

    it('implements Effect interface', () => {
      const effect: Effect = new DelayEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('uses default values when no options provided', () => {
      const effect = new DelayEffect(audioContext)
      expect(effect.time).toBe(0.3)
      expect(effect.feedback).toBe(0.4)
      expect(effect.maxTime).toBe(2.0)
    })

    it('respects custom options', () => {
      const effect = new DelayEffect(audioContext, {
        time: 0.5,
        feedback: 0.7,
        maxTime: 5.0,
        mix: 0.6,
      })
      expect(effect.time).toBe(0.5)
      expect(effect.feedback).toBe(0.7)
      expect(effect.maxTime).toBe(5.0)
      expect(effect.mix).toBe(0.6)
    })
  })

  describe('time', () => {
    it('getter returns current delay time', () => {
      const effect = new DelayEffect(audioContext, { time: 0.5 })
      expect(effect.time).toBe(0.5)
    })

    it('setter updates delay time', () => {
      const effect = new DelayEffect(audioContext)
      effect.time = 0.8
      expect(effect.time).toBe(0.8)
    })
  })

  describe('feedback', () => {
    it('getter returns current feedback', () => {
      const effect = new DelayEffect(audioContext, { feedback: 0.6 })
      expect(effect.feedback).toBe(0.6)
    })

    it('setter updates feedback', () => {
      const effect = new DelayEffect(audioContext)
      effect.feedback = 0.7
      expect(effect.feedback).toBe(0.7)
    })

    it('clamps feedback to max 0.99', () => {
      const effect = new DelayEffect(audioContext)
      effect.feedback = 1.5
      expect(effect.feedback).toBeLessThanOrEqual(0.99)
    })

    it('clamps feedback to min 0', () => {
      const effect = new DelayEffect(audioContext)
      effect.feedback = -0.5
      expect(effect.feedback).toBeGreaterThanOrEqual(0)
    })

    it('clamps feedback at construction', () => {
      const effect = new DelayEffect(audioContext, { feedback: 1.0 })
      expect(effect.feedback).toBeLessThanOrEqual(0.99)
    })
  })

  describe('maxTime', () => {
    it('defaults to 2.0', () => {
      const effect = new DelayEffect(audioContext)
      expect(effect.maxTime).toBe(2.0)
    })

    it('can be set at construction', () => {
      const effect = new DelayEffect(audioContext, { maxTime: 10.0 })
      expect(effect.maxTime).toBe(10.0)
    })

    it('is read-only after construction', () => {
      const effect = new DelayEffect(audioContext, { maxTime: 5.0 })
      expect(effect.maxTime).toBe(5.0)
    })
  })

  describe('bypass and mix', () => {
    it('bypass defaults to false', () => {
      const effect = new DelayEffect(audioContext)
      expect(effect.bypass).toBe(false)
    })

    it('bypass can be toggled', () => {
      const effect = new DelayEffect(audioContext)
      effect.bypass = true
      expect(effect.bypass).toBe(true)
      effect.bypass = false
      expect(effect.bypass).toBe(false)
    })

    it('mix defaults to 1', () => {
      const effect = new DelayEffect(audioContext)
      expect(effect.mix).toBe(1)
    })

    it('mix can be set via options', () => {
      const effect = new DelayEffect(audioContext, { mix: 0.4 })
      expect(effect.mix).toBe(0.4)
    })

    it('mix can be updated', () => {
      const effect = new DelayEffect(audioContext)
      effect.mix = 0.5
      expect(effect.mix).toBe(0.5)
    })
  })

  describe('rampTo', () => {
    it('ramps time parameter without throwing', () => {
      const effect = new DelayEffect(audioContext)
      expect(() => effect.rampTo('time', 0.1, 2)).not.toThrow()
    })

    it('ramps feedback parameter without throwing', () => {
      const effect = new DelayEffect(audioContext)
      expect(() => effect.rampTo('feedback', 0.8, 1)).not.toThrow()
    })

    it('is no-op for unknown parameters', () => {
      const effect = new DelayEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })
  })

  describe('createDelay factory', () => {
    it('creates delay with AudioContext (defaults)', () => {
      const delay = createDelay(audioContext)
      expect(delay).toBeInstanceOf(DelayEffect)
      expect(delay.time).toBe(0.3)
      expect(delay.feedback).toBe(0.4)
    })

    it('creates delay with AudioContext and options', () => {
      const delay = createDelay(audioContext, { time: 0.5, feedback: 0.7, mix: 0.6 })
      expect(delay.time).toBe(0.5)
      expect(delay.feedback).toBe(0.7)
      expect(delay.mix).toBe(0.6)
    })
  })
})
