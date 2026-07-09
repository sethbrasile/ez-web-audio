import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseEffect } from './base-effect'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

/** Concrete test subclass to test BaseEffect abstract class */
class TestEffect extends BaseEffect {
  readonly testGain: GainNode

  constructor(audioContext: AudioContext) {
    super(audioContext)
    this.testGain = audioContext.createGain()

    // Wire effect chain: input -> testGain -> wetGain
    this.inputNode.connect(this.testGain)
    this.testGain.connect(this.wetGain)
  }

  protected getAudioParam(name: string): AudioParam | null {
    if (name === 'gain')
      return this.testGain.gain
    return null
  }
}

describe('baseEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created via concrete subclass', () => {
      const effect = new TestEffect(audioContext)
      expect(effect).toBeTruthy()
    })

    it('implements Effect interface', () => {
      const effect: Effect = new TestEffect(audioContext)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('input and output return valid AudioNodes', () => {
      const effect = new TestEffect(audioContext)
      expect(effect.input).toBeDefined()
      expect(effect.output).toBeDefined()
      // Verify they are GainNodes (AudioNodes)
      expect(effect.input).not.toBe(effect.output)
    })
  })

  describe('bypass', () => {
    it('defaults to false', () => {
      const effect = new TestEffect(audioContext)
      expect(effect.bypass).toBe(false)
    })

    it('can be set to true', () => {
      const effect = new TestEffect(audioContext)
      effect.bypass = true
      expect(effect.bypass).toBe(true)
    })

    it('can be toggled back to false', () => {
      const effect = new TestEffect(audioContext)
      effect.bypass = true
      effect.bypass = false
      expect(effect.bypass).toBe(false)
    })
  })

  describe('mix', () => {
    it('defaults to 1 (full wet)', () => {
      const effect = new TestEffect(audioContext)
      expect(effect.mix).toBe(1)
    })

    it('can be set to a value between 0 and 1', () => {
      const effect = new TestEffect(audioContext)
      effect.mix = 0.5
      expect(effect.mix).toBe(0.5)
    })

    it('clamps values above 1 to 1', () => {
      const effect = new TestEffect(audioContext)
      effect.mix = 1.5
      expect(effect.mix).toBe(1)
    })

    it('clamps values below 0 to 0', () => {
      const effect = new TestEffect(audioContext)
      effect.mix = -0.5
      expect(effect.mix).toBe(0)
    })

    it('can be set to 0 (full dry)', () => {
      const effect = new TestEffect(audioContext)
      effect.mix = 0
      expect(effect.mix).toBe(0)
    })
  })

  describe('rampTo', () => {
    it('ramps a known parameter without throwing', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.rampTo('gain', 0.5, 1)).not.toThrow()
    })

    it('is a no-op for unknown parameter names', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })

    it('ramps mix parameter', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.rampTo('mix', 0.5, 1)).not.toThrow()
      expect(effect.mix).toBe(0.5)
    })

    it('calls setTargetAtTime on the audio param', () => {
      const effect = new TestEffect(audioContext)
      const spy = vi.spyOn(effect.testGain.gain, 'setTargetAtTime')
      effect.rampTo('gain', 0.8, 3)
      expect(spy).toHaveBeenCalledWith(0.8, audioContext.currentTime, 1) // duration/3
    })

    // L3: rampTo with duration=0 should use setValueAtTime (no RangeError)
    it('l3: rampTo(param, value, 0) uses setValueAtTime — no RangeError', () => {
      const effect = new TestEffect(audioContext)
      const spy = vi.spyOn(effect.testGain.gain, 'setValueAtTime')
      expect(() => effect.rampTo('gain', 0.5, 0)).not.toThrow()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime)
    })

    it('l3: rampTo("mix", value, 0) uses instant mix setter', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.rampTo('mix', 0.3, 0)).not.toThrow()
      expect(effect.mix).toBe(0.3)
    })

    it('l3: rampTo(unknownParam, value, 0) is a no-op — no throw', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.rampTo('nonexistent', 0.5, 0)).not.toThrow()
    })
  })

  describe('getParam', () => {
    it('getParam() delegates to getAudioParam() and returns AudioParam for known name', () => {
      const effect = new TestEffect(audioContext)
      const param = effect.getParam('gain')
      expect(param).not.toBeNull()
      // The returned value should be an AudioParam-like object with a value property
      expect(typeof (param as AudioParam).value).toBe('number')
    })

    it('getParam() returns null for unknown parameter name', () => {
      const effect = new TestEffect(audioContext)
      const param = effect.getParam('nonexistent')
      expect(param).toBeNull()
    })

    it('getParam() returns same object as getAudioParam() would return', () => {
      const effect = new TestEffect(audioContext)
      // Both public getParam and the internal gain node should refer to same AudioParam
      const param = effect.getParam('gain')
      const directGainParam = effect.testGain.gain
      expect(param).toBe(directGainParam)
    })
  })

  describe('getAudioContext', () => {
    it('returns the same AudioContext passed to constructor', () => {
      const effect = new TestEffect(audioContext)
      expect(effect.getAudioContext()).toBe(audioContext)
    })

    it('returns a different context for a different instance', () => {
      const ctx1 = createMockContext()
      const ctx2 = createMockContext()
      const effect1 = new TestEffect(ctx1)
      const effect2 = new TestEffect(ctx2)
      expect(effect1.getAudioContext()).toBe(ctx1)
      expect(effect2.getAudioContext()).toBe(ctx2)
      expect(effect1.getAudioContext()).not.toBe(effect2.getAudioContext())
    })
  })

  describe('dispose', () => {
    it('disconnects all base nodes without throwing', () => {
      const effect = new TestEffect(audioContext)
      expect(() => effect.dispose()).not.toThrow()
    })

    it('is safe to call twice (no throw on double disconnect)', () => {
      const effect = new TestEffect(audioContext)
      effect.dispose()
      expect(() => effect.dispose()).not.toThrow()
    })

    it('emits a dispose CustomEvent with { source: effectInstance }', () => {
      const effect = new TestEffect(audioContext)
      const handler = vi.fn()
      effect.addEventListener('dispose', handler)
      effect.dispose()
      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as CustomEvent
      expect(event.detail.source).toBe(effect)
    })

    it('no events fire after dispose() (dispatchEvent is silenced)', () => {
      const effect = new TestEffect(audioContext)
      effect.dispose()
      const handler = vi.fn()
      effect.addEventListener('dispose', handler)
      const result = effect.dispatchEvent(new CustomEvent('dispose', { detail: { source: effect } }))
      expect(result).toBe(false)
      expect(handler).not.toHaveBeenCalled()
    })

    it('dispose() is idempotent (calling twice does not re-emit)', () => {
      const effect = new TestEffect(audioContext)
      const handler = vi.fn()
      effect.addEventListener('dispose', handler)
      effect.dispose()
      effect.dispose()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('addEventListener("dispose", handler) fires handler on dispose', () => {
      const effect = new TestEffect(audioContext)
      let fired = false
      effect.addEventListener('dispose', () => {
        fired = true
      })
      effect.dispose()
      expect(fired).toBe(true)
    })
  })
})
