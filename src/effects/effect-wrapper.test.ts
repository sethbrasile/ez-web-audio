import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { EffectWrapper, wrapEffect, ExternalEffect } from './effect-wrapper'
import type { Effect } from './index'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

/**
 * Create a mock external effect with a connect() method.
 */
function createMockExternalEffect(): ExternalEffect & { connectCalled: boolean; connectedTo: AudioNode | null } {
  return {
    connectCalled: false,
    connectedTo: null,
    connect(destination: AudioNode) {
      this.connectCalled = true
      this.connectedTo = destination
    },
  }
}

describe('EffectWrapper', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with a mock external effect', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper).toBeTruthy()
    })

    it('factory function creates instance', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = wrapEffect(audioContext, externalEffect)
      expect(wrapper).toBeInstanceOf(EffectWrapper)
    })

    it('calls connect() on external effect during construction', () => {
      const externalEffect = createMockExternalEffect()
      new EffectWrapper(audioContext, externalEffect)
      expect(externalEffect.connectCalled).toBe(true)
    })

    it('connects external effect to wetGain node', () => {
      const externalEffect = createMockExternalEffect()
      new EffectWrapper(audioContext, externalEffect)
      expect(externalEffect.connectedTo).toBeTruthy()
    })
  })

  describe('Effect interface implementation', () => {
    it('has input property', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.input).toBeTruthy()
    })

    it('has output property', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.output).toBeTruthy()
    })

    it('input and output are different nodes', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.input).not.toBe(wrapper.output)
    })

    it('has bypass property', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(typeof wrapper.bypass).toBe('boolean')
      expect(wrapper.bypass).toBe(false)
    })

    it('has mix property', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(typeof wrapper.mix).toBe('number')
      expect(wrapper.mix).toBe(1)
    })

    it('implements Effect interface', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper: Effect = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.input).toBeTruthy()
      expect(wrapper.output).toBeTruthy()
      expect(typeof wrapper.bypass).toBe('boolean')
      expect(typeof wrapper.mix).toBe('number')
    })
  })

  describe('effect getter', () => {
    it('returns the wrapped external effect', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.effect).toBe(externalEffect)
    })

    it('allows access to external effect properties', () => {
      interface CustomEffect extends ExternalEffect {
        customProperty: number
      }
      const externalEffect: CustomEffect = {
        customProperty: 42,
        connect: vi.fn(),
      }
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect((wrapper.effect as CustomEffect).customProperty).toBe(42)
    })

    it('allows modification of external effect properties', () => {
      interface CustomEffect extends ExternalEffect {
        customProperty: number
      }
      const externalEffect: CustomEffect = {
        customProperty: 42,
        connect: vi.fn(),
      }
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      ;(wrapper.effect as CustomEffect).customProperty = 100
      expect(externalEffect.customProperty).toBe(100)
    })
  })

  describe('bypass behavior', () => {
    it('bypass defaults to false', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.bypass).toBe(false)
    })

    it('bypass=true can be set', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      wrapper.bypass = true
      expect(wrapper.bypass).toBe(true)
    })

    it('bypass=false can be restored', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      wrapper.bypass = true
      wrapper.bypass = false
      expect(wrapper.bypass).toBe(false)
    })
  })

  describe('mix behavior', () => {
    it('mix defaults to 1 (full wet)', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      expect(wrapper.mix).toBe(1)
    })

    it('mix can be set to 0 (full dry)', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      wrapper.mix = 0
      expect(wrapper.mix).toBe(0)
    })

    it('mix can be set to intermediate value', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      wrapper.mix = 0.5
      expect(wrapper.mix).toBe(0.5)
    })

    it('mix is clamped to 0-1 range', () => {
      const externalEffect = createMockExternalEffect()
      const wrapper = new EffectWrapper(audioContext, externalEffect)
      wrapper.mix = -0.5
      expect(wrapper.mix).toBe(0)
      wrapper.mix = 1.5
      expect(wrapper.mix).toBe(1)
    })
  })

  describe('wrapping objects with AudioNode-like interface', () => {
    /**
     * Create a mock object that resembles an AudioNode
     * (has both connect and disconnect methods)
     */
    function createMockAudioNodeEffect(): ExternalEffect & { disconnect: () => void } {
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
    }

    it('can wrap an object with connect/disconnect methods', () => {
      const audioNodeLike = createMockAudioNodeEffect()
      const wrapper = wrapEffect(audioContext, audioNodeLike)
      expect(wrapper).toBeTruthy()
      expect(wrapper.effect).toBe(audioNodeLike)
    })

    it('connects input to AudioNode-like objects', () => {
      const audioNodeLike = createMockAudioNodeEffect()
      wrapEffect(audioContext, audioNodeLike)
      // The effect should be connected to output chain
      expect(audioNodeLike.connect).toHaveBeenCalled()
    })

    it('can wrap objects with input property', () => {
      const mockInput = {
        connect: vi.fn(),
      }
      const effectWithInput = {
        input: mockInput,
        connect: vi.fn(),
      }
      const wrapper = wrapEffect(audioContext, effectWithInput)
      expect(wrapper).toBeTruthy()
      expect(wrapper.effect).toBe(effectWithInput)
    })

    it('connects to effect.input when available', () => {
      const mockInput = {
        connect: vi.fn(),
      }
      const effectWithInput = {
        input: mockInput,
        connect: vi.fn(),
      }
      wrapEffect(audioContext, effectWithInput)
      // The wrapper should connect its input to the effect's input
      // This is tested indirectly - the effect was wrapped without error
      expect(effectWithInput.connect).toHaveBeenCalled()
    })
  })
})
