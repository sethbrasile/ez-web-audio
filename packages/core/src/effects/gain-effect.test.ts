import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGainEffect, GainEffect } from './gain-effect'

function createMockContext() {
  const ctx = new Mock() as unknown as AudioContext

  // GainEffect setters smooth via setTargetAtTime; make the mock converge
  // .value to the target immediately so assertions read the settled value
  const originalCreateGain = ctx.createGain.bind(ctx)
  ;(ctx as any).createGain = () => {
    const node = originalCreateGain()
    node.gain.setTargetAtTime = (value: number) => {
      ;(node.gain as any).value = value
      return node.gain
    }
    return node
  }

  return ctx
}

describe('gainEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with default value', () => {
      const effect = new GainEffect(audioContext)
      expect(effect).toBeTruthy()
      expect(effect.value).toBe(1.0)
    })

    it('can be created with custom initial value', () => {
      const effect = new GainEffect(audioContext, 0.5)
      expect(effect.value).toBe(0.5)
    })

    it('factory function creates instance with default value', () => {
      const effect = createGainEffect(audioContext)
      expect(effect).toBeInstanceOf(GainEffect)
      expect(effect.value).toBe(1.0)
    })

    it('factory function creates instance with custom value', () => {
      const effect = createGainEffect(audioContext, 0.75)
      expect(effect).toBeInstanceOf(GainEffect)
      expect(effect.value).toBe(0.75)
    })
  })

  describe('effect interface implementation', () => {
    it('has input property that is a GainNode', () => {
      const effect = new GainEffect(audioContext)
      expect(effect.input).toBeTruthy()
      // Verify it's a GainNode by checking for gain property
      expect((effect.input as GainNode).gain).toBeTruthy()
    })

    it('has output property that is a GainNode', () => {
      const effect = new GainEffect(audioContext)
      expect(effect.output).toBeTruthy()
      // Verify it's a GainNode by checking for gain property
      expect((effect.output as GainNode).gain).toBeTruthy()
    })

    it('input and output are the same node (single-node effect)', () => {
      const effect = new GainEffect(audioContext)
      expect(effect.input).toBe(effect.output)
    })

    it('has bypass property', () => {
      const effect = new GainEffect(audioContext)
      expect(typeof effect.bypass).toBe('boolean')
      expect(effect.bypass).toBe(false)
    })

    it('has mix property', () => {
      const effect = new GainEffect(audioContext)
      expect(typeof effect.mix).toBe('number')
      expect(effect.mix).toBe(1)
    })

    it('implements Effect interface', () => {
      const effect: Effect = new GainEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })
  })

  describe('value getter/setter', () => {
    it('value getter returns current value', () => {
      const effect = new GainEffect(audioContext, 0.8)
      expect(effect.value).toBe(0.8)
    })

    it('value setter updates value', () => {
      const effect = new GainEffect(audioContext)
      effect.value = 0.3
      expect(effect.value).toBe(0.3)
    })

    it('value setter updates the underlying GainNode', () => {
      const effect = new GainEffect(audioContext)
      effect.value = 0.6
      expect((effect.input as GainNode).gain.value).toBeCloseTo(0.6, 5)
    })
  })

  describe('bypass behavior', () => {
    it('bypass defaults to false', () => {
      const effect = new GainEffect(audioContext, 0.5)
      expect(effect.bypass).toBe(false)
    })

    it('bypass=true sets gain to 1.0 (passthrough)', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.bypass = true
      expect((effect.input as GainNode).gain.value).toBe(1.0)
    })

    it('bypass=false restores original value', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.bypass = true
      effect.bypass = false
      expect((effect.input as GainNode).gain.value).toBeCloseTo(0.5, 5)
    })

    it('bypass preserves value property while bypassed', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.bypass = true
      expect(effect.value).toBe(0.5) // value property unchanged
      expect((effect.input as GainNode).gain.value).toBe(1.0) // but actual gain is 1.0
    })

    it('changing value while bypassed updates stored value', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.bypass = true
      effect.value = 0.3
      expect(effect.value).toBe(0.3)
      expect((effect.input as GainNode).gain.value).toBe(1.0) // still bypassed
      effect.bypass = false
      expect((effect.input as GainNode).gain.value).toBeCloseTo(0.3, 5) // restored to new value
    })
  })

  describe('mix behavior', () => {
    it('mix defaults to 1', () => {
      const effect = new GainEffect(audioContext)
      expect(effect.mix).toBe(1)
    })

    it('mix=0 results in passthrough (gain of 1.0)', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.mix = 0
      // effectiveGain = 1 + (0.5 - 1) * 0 = 1
      expect((effect.input as GainNode).gain.value).toBe(1.0)
    })

    it('mix=1 applies full effect', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.mix = 1
      // Equal-power: cos(π/2) * 1 + sin(π/2) * 0.5 ≈ 0 + 1 * 0.5 = 0.5
      expect((effect.input as GainNode).gain.value).toBeCloseTo(0.5, 5)
    })

    it('mix=0.5 applies half effect (equal-power crossfade)', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.mix = 0.5
      // Equal-power crossfade: cos(π/4) * 1 + sin(π/4) * 0.5 ≈ 0.7071 + 0.3536 ≈ 1.0607
      expect((effect.input as GainNode).gain.value).toBeCloseTo(1.0607, 3)
    })

    it('mix is clamped to 0-1 range', () => {
      const effect = new GainEffect(audioContext)
      effect.mix = -0.5
      expect(effect.mix).toBe(0)
      effect.mix = 1.5
      expect(effect.mix).toBe(1)
    })

    it('mix does not affect gain when bypassed', () => {
      const effect = new GainEffect(audioContext, 0.5)
      effect.bypass = true
      effect.mix = 0.5
      expect((effect.input as GainNode).gain.value).toBe(1.0) // still bypassed
    })
  })

  describe('dispose() (G9 — disposal cascade)', () => {
    it('disconnects the internal GainNode', () => {
      const effect = new GainEffect(audioContext, 0.5)
      const spy = vi.spyOn(effect.input as GainNode, 'disconnect')

      effect.dispose()

      expect(spy).toHaveBeenCalled()
    })

    it('does not throw', () => {
      const effect = new GainEffect(audioContext)
      expect(() => effect.dispose()).not.toThrow()
    })

    it('is idempotent — calling dispose() twice does not throw', () => {
      const effect = new GainEffect(audioContext)
      effect.dispose()
      expect(() => effect.dispose()).not.toThrow()
    })
  })
})
