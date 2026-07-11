import type { FilterType } from './filter-effect'
import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFilterEffect, FilterEffect } from './filter-effect'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('filterEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('can be created with lowpass filter type', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect).toBeTruthy()
    })

    it('can be created with all 8 filter types', () => {
      const filterTypes: FilterType[] = [
        'lowpass',
        'highpass',
        'bandpass',
        'lowshelf',
        'highshelf',
        'peaking',
        'notch',
        'allpass',
      ]

      filterTypes.forEach((type) => {
        const effect = new FilterEffect(audioContext, type)
        expect(effect).toBeTruthy()
        expect(effect.type).toBe(type)
      })
    })

    it('uses default values when no options provided', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.frequency).toBe(350)
      expect(effect.q).toBe(1)
      expect(effect.gain).toBe(0)
      expect(effect.detune).toBe(0)
    })

    it('respects custom options', () => {
      const effect = new FilterEffect(audioContext, 'lowpass', {
        frequency: 800,
        q: 2,
        gain: 6,
        detune: 100,
      })
      expect(effect.frequency).toBe(800)
      expect(effect.q).toBe(2)
      expect(effect.gain).toBe(6)
      expect(effect.detune).toBe(100)
    })

    it('factory function creates instance', () => {
      const effect = createFilterEffect(audioContext, 'highpass')
      expect(effect).toBeInstanceOf(FilterEffect)
    })

    it('factory function accepts options', () => {
      const effect = createFilterEffect(audioContext, 'bandpass', {
        frequency: 1000,
        q: 5,
      })
      expect(effect.frequency).toBe(1000)
      expect(effect.q).toBe(5)
    })
  })

  describe('effect interface implementation', () => {
    it('has input property', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.input).toBeTruthy()
    })

    it('has output property', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.output).toBeTruthy()
    })

    it('input and output are different nodes (for wet/dry mixing)', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.input).not.toBe(effect.output)
    })

    it('has bypass property', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(typeof effect.bypass).toBe('boolean')
      expect(effect.bypass).toBe(false)
    })

    it('has mix property', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(typeof effect.mix).toBe('number')
      expect(effect.mix).toBe(1)
    })

    it('implements Effect interface', () => {
      const effect: Effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })
  })

  describe('parameter getters/setters', () => {
    it('frequency getter returns current value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass', { frequency: 500 })
      expect(effect.frequency).toBe(500)
    })

    it('frequency setter updates value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.frequency = 1000
      expect(effect.frequency).toBe(1000)
    })

    it('q getter returns current value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass', { q: 3 })
      expect(effect.q).toBe(3)
    })

    it('q setter updates value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.q = 5
      expect(effect.q).toBe(5)
    })

    it('gain getter returns current value', () => {
      const effect = new FilterEffect(audioContext, 'peaking', { gain: 12 })
      expect(effect.gain).toBe(12)
    })

    it('gain setter updates value', () => {
      const effect = new FilterEffect(audioContext, 'peaking')
      effect.gain = -6
      expect(effect.gain).toBe(-6)
    })

    it('detune getter returns current value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass', { detune: 50 })
      expect(effect.detune).toBe(50)
    })

    it('detune setter updates value', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.detune = -100
      expect(effect.detune).toBe(-100)
    })

    it('type getter returns filter type', () => {
      const effect = new FilterEffect(audioContext, 'highpass')
      expect(effect.type).toBe('highpass')
    })

    it('type setter changes filter type', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.type = 'highpass'
      expect(effect.type).toBe('highpass')
    })
  })

  describe('bypass behavior', () => {
    it('bypass defaults to false', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.bypass).toBe(false)
    })

    it('bypass=true sets wet gain to 0 and dry gain to 1', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.bypass = true
      // When bypassed, signal goes through dry path only
      expect(effect.bypass).toBe(true)
    })

    it('bypass=false restores mix-based gains', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.bypass = true
      effect.bypass = false
      expect(effect.bypass).toBe(false)
    })
  })

  describe('mix behavior', () => {
    it('mix defaults to 1 (full wet)', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(effect.mix).toBe(1)
    })

    it('mix=0 results in full dry (no filter)', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.mix = 0
      expect(effect.mix).toBe(0)
    })

    it('mix=1 results in full wet (all through filter)', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.mix = 1
      expect(effect.mix).toBe(1)
    })

    it('mix=0.5 blends wet and dry equally', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.mix = 0.5
      expect(effect.mix).toBe(0.5)
    })

    it('mix is clamped to 0-1 range', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.mix = -0.5
      expect(effect.mix).toBe(0)
      effect.mix = 1.5
      expect(effect.mix).toBe(1)
    })
  })

  describe('filter types', () => {
    it('lowpass filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'lowpass')
      expect(effect.type).toBe('lowpass')
    })

    it('highpass filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'highpass')
      expect(effect.type).toBe('highpass')
    })

    it('bandpass filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'bandpass')
      expect(effect.type).toBe('bandpass')
    })

    it('lowshelf filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'lowshelf')
      expect(effect.type).toBe('lowshelf')
    })

    it('highshelf filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'highshelf')
      expect(effect.type).toBe('highshelf')
    })

    it('peaking filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'peaking')
      expect(effect.type).toBe('peaking')
    })

    it('notch filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'notch')
      expect(effect.type).toBe('notch')
    })

    it('allpass filter can be created', () => {
      const effect = createFilterEffect(audioContext, 'allpass')
      expect(effect.type).toBe('allpass')
    })
  })

  describe('validation (R11#5 — previously ZERO validation anywhere)', () => {
    it('clamps frequency to [0, sampleRate/2] (Nyquist)', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      const nyquist = audioContext.sampleRate / 2
      effect.frequency = nyquist * 10
      expect(effect.frequency).toBeLessThanOrEqual(nyquist)
      effect.frequency = -100
      expect(effect.frequency).toBeGreaterThanOrEqual(0)
    })

    it('floors Q above 0 (0 or negative Q is unstable for resonant types)', () => {
      const effect = new FilterEffect(audioContext, 'bandpass')
      effect.q = -5
      expect(effect.q).toBeGreaterThan(0)
      effect.q = 0
      expect(effect.q).toBeGreaterThan(0)
    })

    it('ctor gets the same frequency/Q clamps as the setters (ctor-setter-parity)', () => {
      const nyquist = audioContext.sampleRate / 2
      const effect = new FilterEffect(audioContext, 'lowpass', { frequency: nyquist * 10, q: -5 })
      expect(effect.frequency).toBeLessThanOrEqual(nyquist)
      expect(effect.q).toBeGreaterThan(0)
    })

    it('warns when a non-zero gain is set on a type that ignores it', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      effect.gain = 6
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('does NOT warn when gain is set on a gain-aware type', () => {
      const effect = new FilterEffect(audioContext, 'peaking')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      effect.gain = 6
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('rampTo — ramp-setter-desync', () => {
    it('getter reflects the ramp target immediately for frequency/q/gain/detune', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      effect.rampTo('frequency', 1200, 1)
      effect.rampTo('q', 4, 1)
      effect.rampTo('gain', -3, 1)
      effect.rampTo('detune', 50, 1)
      expect(effect.frequency).toBe(1200)
      expect(effect.q).toBe(4)
      expect(effect.gain).toBe(-3)
      expect(effect.detune).toBe(50)
    })

    it('rampTo("frequency", ...) clamps to Nyquist same as the setter', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      const nyquist = audioContext.sampleRate / 2
      effect.rampTo('frequency', nyquist * 10, 1)
      expect(effect.frequency).toBeLessThanOrEqual(nyquist)
    })

    it('rampTo("q", ...) floors above 0 same as the setter', () => {
      const effect = new FilterEffect(audioContext, 'bandpass')
      effect.rampTo('q', -5, 1)
      expect(effect.q).toBeGreaterThan(0)
    })

    it('is no-op for unknown parameters', () => {
      const effect = new FilterEffect(audioContext, 'lowpass')
      expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
    })
  })
})
