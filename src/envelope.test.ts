import type { EnvelopeOptions } from './envelope'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Envelope } from './envelope'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('envelope', () => {
  let audioContext: AudioContext
  let gainNode: GainNode

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
  })

  describe('constructor defaults', () => {
    it('uses default attack of 0.01', () => {
      const envelope = new Envelope()
      expect(envelope.attack).toBe(0.01)
    })

    it('uses default decay of 0.1', () => {
      const envelope = new Envelope()
      expect(envelope.decay).toBe(0.1)
    })

    it('uses default sustain of 0.7', () => {
      const envelope = new Envelope()
      expect(envelope.sustain).toBe(0.7)
    })

    it('uses default release of 0.3', () => {
      const envelope = new Envelope()
      expect(envelope.release).toBe(0.3)
    })
  })

  describe('custom values', () => {
    it('respects custom attack', () => {
      const envelope = new Envelope({ attack: 0.5 })
      expect(envelope.attack).toBe(0.5)
    })

    it('respects custom decay', () => {
      const envelope = new Envelope({ decay: 0.2 })
      expect(envelope.decay).toBe(0.2)
    })

    it('respects custom sustain', () => {
      const envelope = new Envelope({ sustain: 0.5 })
      expect(envelope.sustain).toBe(0.5)
    })

    it('respects custom release', () => {
      const envelope = new Envelope({ release: 1.0 })
      expect(envelope.release).toBe(1.0)
    })

    it('accepts all options at once', () => {
      const options: EnvelopeOptions = {
        attack: 0.05,
        decay: 0.15,
        sustain: 0.6,
        release: 0.4,
      }
      const envelope = new Envelope(options)
      expect(envelope.attack).toBe(0.05)
      expect(envelope.decay).toBe(0.15)
      expect(envelope.sustain).toBe(0.6)
      expect(envelope.release).toBe(0.4)
    })
  })

  describe('sustain clamping', () => {
    it('clamps sustain below 0 to 0', () => {
      const envelope = new Envelope({ sustain: -0.5 })
      expect(envelope.sustain).toBe(0)
    })

    it('clamps sustain above 1 to 1', () => {
      const envelope = new Envelope({ sustain: 1.5 })
      expect(envelope.sustain).toBe(1)
    })

    it('accepts sustain at boundary 0', () => {
      const envelope = new Envelope({ sustain: 0 })
      expect(envelope.sustain).toBe(0)
    })

    it('accepts sustain at boundary 1', () => {
      const envelope = new Envelope({ sustain: 1 })
      expect(envelope.sustain).toBe(1)
    })
  })

  describe('applyTo', () => {
    it('schedules setValueAtTime(0) at startTime', () => {
      const envelope = new Envelope()
      const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, startTime)
    })

    it('schedules linearRampToValueAtTime(1) at startTime + attack', () => {
      const envelope = new Envelope({ attack: 0.05 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime + 0.05)
    })

    it('schedules linearRampToValueAtTime(sustain) at startTime + attack + decay', () => {
      const envelope = new Envelope({
        attack: 0.05,
        decay: 0.1,
        sustain: 0.6,
      })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(linearRampSpy).toHaveBeenCalledWith(0.6, startTime + 0.05 + 0.1)
    })

    it('schedules all three phases in correct order', () => {
      const envelope = new Envelope({
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
      })
      const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 0.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(setValueAtTimeSpy).toHaveBeenCalledTimes(1)
      expect(linearRampSpy).toHaveBeenCalledTimes(2)
      expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, 0)
      expect(linearRampSpy).toHaveBeenNthCalledWith(1, 1, 0.01)
      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 0.7, 0.11)
    })
  })

  describe('release', () => {
    it('schedules linear ramp to zero over release duration', () => {
      const envelope = new Envelope({ release: 0.3 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const release = 2.0
      envelope.triggerRelease(gainNode.gain, release)

      expect(linearRampSpy).toHaveBeenCalledWith(0, release + 0.3)
    })

    it('uses cancelAndHoldAtTime to preserve current value when available', () => {
      const envelope = new Envelope({ release: 1.0 })
      const cancelAndHoldSpy = vi.spyOn(gainNode.gain as any, 'cancelAndHoldAtTime')

      envelope.triggerRelease(gainNode.gain, 0)

      expect(cancelAndHoldSpy).toHaveBeenCalledWith(0)
    })

    it('handles very short release times with instant zero', () => {
      const envelope = new Envelope({ release: 0.0005 })
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

      envelope.triggerRelease(gainNode.gain, 0)

      // Release < 0.001 snaps to zero instantly
      expect(setValueSpy).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('edge cases', () => {
    it('handles zero attack (immediate peak)', () => {
      const envelope = new Envelope({ attack: 0 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime)
    })

    it('handles zero decay (immediate sustain)', () => {
      const envelope = new Envelope({
        attack: 0.05,
        decay: 0,
        sustain: 0.7,
      })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(linearRampSpy).toHaveBeenCalledWith(0.7, startTime + 0.05)
    })

    it('handles zero attack and zero decay', () => {
      const envelope = new Envelope({
        attack: 0,
        decay: 0,
        sustain: 0.5,
      })
      const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, startTime)
      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime)
      expect(linearRampSpy).toHaveBeenCalledWith(0.5, startTime)
    })

    it('handles sustain of 1 (no decay)', () => {
      const envelope = new Envelope({ sustain: 1 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      envelope.applyTo(gainNode.gain, 0)

      expect(linearRampSpy).toHaveBeenNthCalledWith(1, 1, expect.any(Number))
      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 1, expect.any(Number))
    })

    it('handles sustain of 0 (full decay)', () => {
      const envelope = new Envelope({ sustain: 0 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      envelope.applyTo(gainNode.gain, 0)

      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 0, expect.any(Number))
    })
  })

  describe('readonly properties (compile-time only)', () => {
    it('attack shows TypeScript readonly protection', () => {
      const envelope = new Envelope({ attack: 0.05 })
      // @ts-expect-error - readonly property at compile time
      envelope.attack = 0.5
      expect(envelope.attack).toBe(0.5)
    })

    it('decay shows TypeScript readonly protection', () => {
      const envelope = new Envelope({ decay: 0.15 })
      // @ts-expect-error - readonly property at compile time
      envelope.decay = 0.5
      expect(envelope.decay).toBe(0.5)
    })

    it('sustain shows TypeScript readonly protection', () => {
      const envelope = new Envelope({ sustain: 0.6 })
      // @ts-expect-error - readonly property at compile time
      envelope.sustain = 0.5
      expect(envelope.sustain).toBe(0.5)
    })

    it('release shows TypeScript readonly protection', () => {
      const envelope = new Envelope({ release: 0.4 })
      // @ts-expect-error - readonly property at compile time
      envelope.release = 0.5
      expect(envelope.release).toBe(0.5)
    })
  })

  describe('retriggering', () => {
    describe('isActive state management', () => {
      it('isActive is false before first applyTo', () => {
        const envelope = new Envelope()
        expect(envelope.isActive).toBe(false)
      })

      it('isActive becomes true after applyTo', () => {
        const envelope = new Envelope()
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.isActive).toBe(true)
      })

      it('isActive becomes false after release', () => {
        const envelope = new Envelope()
        envelope.applyTo(gainNode.gain, 0)
        envelope.triggerRelease(gainNode.gain, 1)
        expect(envelope.isActive).toBe(false)
      })

      it('isActive remains true on retrigger', () => {
        const envelope = new Envelope()
        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.5)
        expect(envelope.isActive).toBe(true)
      })
    })

    describe('first trigger behavior', () => {
      it('first trigger starts attack from zero', () => {
        const envelope = new Envelope({ attack: 0.1 })
        const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
        envelope.applyTo(gainNode.gain, 0)
        expect(spy).toHaveBeenCalledWith(0, 0)
      })
    })

    describe('retrigger during attack phase', () => {
      it('retrigger cancels existing automation', () => {
        const envelope = new Envelope({ attack: 0.1, decay: 0.1 })
        const spy = vi.spyOn(
          gainNode.gain as Parameters<typeof vi.spyOn>[0],
          'cancelAndHoldAtTime' as never,
        )
        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.05)
        expect(spy).toHaveBeenCalled()
      })

      it('retrigger starts from estimated current value', () => {
        const envelope = new Envelope({ attack: 0.1, decay: 0.1 })
        const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()
        envelope.applyTo(gainNode.gain, 0.05)
        const calls = spy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        expect(calls[0][0]).toBeGreaterThan(0)
        expect(calls[0][0]).toBeLessThan(1)
      })
    })

    describe('retrigger during decay phase', () => {
      it('retrigger picks up current value', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0.2,
          sustain: 0.5,
        })
        const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()
        envelope.applyTo(gainNode.gain, 0.2)
        const calls = spy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        expect(calls[0][0]).toBeGreaterThan(0.5)
        expect(calls[0][0]).toBeLessThanOrEqual(1)
      })
    })

    describe('retrigger during sustain phase', () => {
      it('retrigger picks up sustain level', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0.1,
          sustain: 0.7,
        })
        const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()
        envelope.applyTo(gainNode.gain, 0.5)
        const calls = spy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        expect(calls[0][0]).toBeCloseTo(0.7, 5)
      })
    })

    describe('estimateCurrentValue', () => {
      it('returns 0 before attack start', () => {
        const envelope = new Envelope({ attack: 0.1 })
        envelope.applyTo(gainNode.gain, 1.0)
        expect(envelope.estimateCurrentValue(0.5)).toBe(0)
      })

      it('returns correct value during attack', () => {
        const envelope = new Envelope({ attack: 0.1 })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.05)).toBeCloseTo(0.5, 5)
      })

      it('returns correct value at attack peak', () => {
        const envelope = new Envelope({ attack: 0.1 })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.1)).toBeCloseTo(1, 5)
      })

      it('returns correct value during decay', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0.2,
          sustain: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.2)).toBeCloseTo(0.75, 5)
      })

      it('returns sustain during sustain', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0.1,
          sustain: 0.6,
        })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.5)).toBe(0.6)
      })

      it('handles zero attack time', () => {
        const envelope = new Envelope({
          attack: 0,
          decay: 0.2,
          sustain: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.1)).toBeCloseTo(0.75, 5)
      })

      it('handles zero decay time', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0,
          sustain: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)
        expect(envelope.estimateCurrentValue(0.1)).toBeCloseTo(0.5, 5)
      })

      it('returns 0 when not active', () => {
        const envelope = new Envelope()
        expect(envelope.estimateCurrentValue(0.5)).toBe(0)
      })
    })

    describe('cancelAndHoldAtTime feature detection', () => {
      it('uses cancelAndHoldAtTime when available', () => {
        const envelope = new Envelope()
        const spy = vi.spyOn(
          gainNode.gain as Parameters<typeof vi.spyOn>[0],
          'cancelAndHoldAtTime' as never,
        )
        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.05)
        expect(spy).toHaveBeenCalled()
      })

      it('falls back to cancelScheduledValues', () => {
        const envelope = new Envelope()
        const testGainNode = audioContext.createGain()
        const rec = testGainNode.gain as unknown as Record<string, unknown>
        rec.cancelAndHoldAtTime = undefined
        const spy = vi.spyOn(testGainNode.gain, 'cancelScheduledValues')
        envelope.applyTo(testGainNode.gain, 0)
        envelope.applyTo(testGainNode.gain, 0.05)
        expect(spy).toHaveBeenCalled()
      })
    })

    describe('attack from current value', () => {
      it('attack ramps to peak on retrigger', () => {
        const envelope = new Envelope({
          attack: 0.1,
          decay: 0.1,
          sustain: 0.5,
        })
        const spy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()
        envelope.applyTo(gainNode.gain, 0.3)
        expect(spy).toHaveBeenCalledWith(1, 0.3 + 0.1)
      })
    })
  })

  describe('edge cases - negative and extreme values', () => {
    it('negative attack is accepted as-is (not clamped)', () => {
      // Document current behavior: negative values are allowed
      const envelope = new Envelope({ attack: -0.1 })
      expect(envelope.attack).toBe(-0.1)
      // Note: Web Audio API will handle negative times in its own way
    })

    it('negative decay is accepted as-is (not clamped)', () => {
      const envelope = new Envelope({ decay: -0.1 })
      expect(envelope.decay).toBe(-0.1)
      // Note: Current implementation does not validate/clamp time values
    })

    it('negative release is accepted as-is (not clamped)', () => {
      const envelope = new Envelope({ release: -0.3 })
      expect(envelope.release).toBe(-0.3)
      // Note: Negative release times are not prevented at construction
    })

    it('negative attack/decay/release values are not validated — consumer responsibility', () => {
      // TCOV-12: Documents that negative time values are accepted as-is.
      // The library does not clamp or validate attack/decay/release — only sustain is clamped to [0,1].
      // Consumers are responsible for providing sensible positive values.
      const envelope = new Envelope({ attack: -0.5, decay: -0.2, release: -0.1 })
      expect(envelope.attack).toBe(-0.5)
      expect(envelope.decay).toBe(-0.2)
      expect(envelope.release).toBe(-0.1)
    })

    it('all zero times (attack, decay, release) does not error', () => {
      const envelope = new Envelope({
        attack: 0,
        decay: 0,
        release: 0,
        sustain: 0.5,
      })
      const gainNode = audioContext.createGain()

      // Should schedule automation without division-by-zero or other errors
      expect(() => envelope.applyTo(gainNode.gain, 0)).not.toThrow()
      expect(() => envelope.triggerRelease(gainNode.gain, 0)).not.toThrow()
    })

    it('very large attack (9999 seconds) is accepted', () => {
      const envelope = new Envelope({ attack: 9999 })
      expect(envelope.attack).toBe(9999)
      const gainNode = audioContext.createGain()
      // Should not cause scheduling errors
      expect(() => envelope.applyTo(gainNode.gain, 0)).not.toThrow()
    })

    it('very large decay (9999 seconds) is accepted', () => {
      const envelope = new Envelope({ decay: 9999 })
      expect(envelope.decay).toBe(9999)
      const gainNode = audioContext.createGain()
      expect(() => envelope.applyTo(gainNode.gain, 0)).not.toThrow()
    })

    it('very large release (9999 seconds) is accepted', () => {
      const envelope = new Envelope({ release: 9999 })
      expect(envelope.release).toBe(9999)
      const gainNode = audioContext.createGain()
      expect(() => envelope.triggerRelease(gainNode.gain, 0)).not.toThrow()
    })

    it('all zero times produces instant envelope', () => {
      const envelope = new Envelope({
        attack: 0,
        decay: 0,
        release: 0,
        sustain: 0.5,
      })
      const gainNode = audioContext.createGain()
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      envelope.applyTo(gainNode.gain, 1.0)

      // All ramps happen at the same time (startTime + 0)
      expect(setValueSpy).toHaveBeenCalledWith(0, 1.0)
      expect(linearRampSpy).toHaveBeenCalledWith(1, 1.0) // Attack
      expect(linearRampSpy).toHaveBeenCalledWith(0.5, 1.0) // Decay to sustain
    })
  })
})
