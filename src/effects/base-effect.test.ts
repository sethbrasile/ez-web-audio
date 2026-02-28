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
  })
})
