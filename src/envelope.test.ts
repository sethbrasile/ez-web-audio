import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { Envelope, EnvelopeOptions } from './envelope'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('Envelope', () => {
  let audioContext: AudioContext
  let gainNode: GainNode

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
  })

  describe('constructor defaults', () => {
    it('uses default attackTime of 0.01', () => {
      const envelope = new Envelope()
      expect(envelope.attackTime).toBe(0.01)
    })

    it('uses default decayTime of 0.1', () => {
      const envelope = new Envelope()
      expect(envelope.decayTime).toBe(0.1)
    })

    it('uses default sustainLevel of 0.7', () => {
      const envelope = new Envelope()
      expect(envelope.sustainLevel).toBe(0.7)
    })

    it('uses default releaseTime of 0.3', () => {
      const envelope = new Envelope()
      expect(envelope.releaseTime).toBe(0.3)
    })
  })

  describe('custom values', () => {
    it('respects custom attackTime', () => {
      const envelope = new Envelope({ attackTime: 0.5 })
      expect(envelope.attackTime).toBe(0.5)
    })

    it('respects custom decayTime', () => {
      const envelope = new Envelope({ decayTime: 0.2 })
      expect(envelope.decayTime).toBe(0.2)
    })

    it('respects custom sustainLevel', () => {
      const envelope = new Envelope({ sustainLevel: 0.5 })
      expect(envelope.sustainLevel).toBe(0.5)
    })

    it('respects custom releaseTime', () => {
      const envelope = new Envelope({ releaseTime: 1.0 })
      expect(envelope.releaseTime).toBe(1.0)
    })

    it('accepts all options at once', () => {
      const options: EnvelopeOptions = {
        attackTime: 0.05,
        decayTime: 0.15,
        sustainLevel: 0.6,
        releaseTime: 0.4,
      }
      const envelope = new Envelope(options)
      expect(envelope.attackTime).toBe(0.05)
      expect(envelope.decayTime).toBe(0.15)
      expect(envelope.sustainLevel).toBe(0.6)
      expect(envelope.releaseTime).toBe(0.4)
    })
  })

  describe('sustainLevel clamping', () => {
    it('clamps sustainLevel below 0 to 0', () => {
      const envelope = new Envelope({ sustainLevel: -0.5 })
      expect(envelope.sustainLevel).toBe(0)
    })

    it('clamps sustainLevel above 1 to 1', () => {
      const envelope = new Envelope({ sustainLevel: 1.5 })
      expect(envelope.sustainLevel).toBe(1)
    })

    it('accepts sustainLevel at boundary 0', () => {
      const envelope = new Envelope({ sustainLevel: 0 })
      expect(envelope.sustainLevel).toBe(0)
    })

    it('accepts sustainLevel at boundary 1', () => {
      const envelope = new Envelope({ sustainLevel: 1 })
      expect(envelope.sustainLevel).toBe(1)
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

    it('schedules linearRampToValueAtTime(1) at startTime + attackTime', () => {
      const envelope = new Envelope({ attackTime: 0.05 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime + 0.05)
    })

    it('schedules linearRampToValueAtTime(sustainLevel) at startTime + attackTime + decayTime', () => {
      const envelope = new Envelope({
        attackTime: 0.05,
        decayTime: 0.1,
        sustainLevel: 0.6,
      })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      // Should be called twice: once for attack (1, 1.05) and once for decay (0.6, 1.15)
      expect(linearRampSpy).toHaveBeenCalledWith(0.6, startTime + 0.05 + 0.1)
    })

    it('schedules all three phases in correct order', () => {
      const envelope = new Envelope({
        attackTime: 0.01,
        decayTime: 0.1,
        sustainLevel: 0.7,
      })
      const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 0.0
      envelope.applyTo(gainNode.gain, startTime)

      // Verify call order
      expect(setValueAtTimeSpy).toHaveBeenCalledTimes(1)
      expect(linearRampSpy).toHaveBeenCalledTimes(2)

      // Verify correct values
      expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, 0)
      expect(linearRampSpy).toHaveBeenNthCalledWith(1, 1, 0.01)
      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 0.7, 0.11)
    })
  })

  describe('release', () => {
    it('schedules setTargetAtTime with correct time constant', () => {
      const envelope = new Envelope({ releaseTime: 0.3 })
      const setTargetAtTimeSpy = vi.spyOn(gainNode.gain, 'setTargetAtTime')

      const releaseTime = 2.0
      envelope.release(gainNode.gain, releaseTime)

      // Time constant should be releaseTime/5 for 99% completion
      expect(setTargetAtTimeSpy).toHaveBeenCalledWith(0, releaseTime, 0.3 / 5)
    })

    it('uses releaseTime / 5 as time constant for 99% completion', () => {
      const envelope = new Envelope({ releaseTime: 1.0 })
      const setTargetAtTimeSpy = vi.spyOn(gainNode.gain, 'setTargetAtTime')

      envelope.release(gainNode.gain, 0)

      expect(setTargetAtTimeSpy).toHaveBeenCalledWith(0, 0, 0.2)
    })

    it('handles very short release times', () => {
      const envelope = new Envelope({ releaseTime: 0.01 })
      const setTargetAtTimeSpy = vi.spyOn(gainNode.gain, 'setTargetAtTime')

      envelope.release(gainNode.gain, 0)

      expect(setTargetAtTimeSpy).toHaveBeenCalledWith(0, 0, 0.01 / 5)
    })
  })

  describe('edge cases', () => {
    it('handles zero attackTime (immediate peak)', () => {
      const envelope = new Envelope({ attackTime: 0 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      // Should ramp to 1 at exactly startTime
      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime)
    })

    it('handles zero decayTime (immediate sustain)', () => {
      const envelope = new Envelope({ attackTime: 0.05, decayTime: 0, sustainLevel: 0.7 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      // Decay should complete immediately after attack
      expect(linearRampSpy).toHaveBeenCalledWith(0.7, startTime + 0.05)
    })

    it('handles zero attackTime and zero decayTime', () => {
      const envelope = new Envelope({ attackTime: 0, decayTime: 0, sustainLevel: 0.5 })
      const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      const startTime = 1.0
      envelope.applyTo(gainNode.gain, startTime)

      expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, startTime)
      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime)
      expect(linearRampSpy).toHaveBeenCalledWith(0.5, startTime)
    })

    it('handles sustainLevel of 1 (no decay)', () => {
      const envelope = new Envelope({ sustainLevel: 1 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      envelope.applyTo(gainNode.gain, 0)

      // Both attack and decay ramp to 1
      expect(linearRampSpy).toHaveBeenNthCalledWith(1, 1, expect.any(Number))
      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 1, expect.any(Number))
    })

    it('handles sustainLevel of 0 (full decay)', () => {
      const envelope = new Envelope({ sustainLevel: 0 })
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      envelope.applyTo(gainNode.gain, 0)

      // Attack to 1, decay to 0
      expect(linearRampSpy).toHaveBeenNthCalledWith(2, 0, expect.any(Number))
    })
  })

  describe('readonly properties', () => {
    it('attackTime is readonly', () => {
      const envelope = new Envelope()
      // TypeScript should prevent this, but verify runtime behavior
      expect(() => {
        // @ts-expect-error - testing readonly enforcement
        envelope.attackTime = 0.5
      }).toThrow()
    })

    it('decayTime is readonly', () => {
      const envelope = new Envelope()
      expect(() => {
        // @ts-expect-error - testing readonly enforcement
        envelope.decayTime = 0.5
      }).toThrow()
    })

    it('sustainLevel is readonly', () => {
      const envelope = new Envelope()
      expect(() => {
        // @ts-expect-error - testing readonly enforcement
        envelope.sustainLevel = 0.5
      }).toThrow()
    })

    it('releaseTime is readonly', () => {
      const envelope = new Envelope()
      expect(() => {
        // @ts-expect-error - testing readonly enforcement
        envelope.releaseTime = 0.5
      }).toThrow()
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
        envelope.release(gainNode.gain, 1)
        expect(envelope.isActive).toBe(false)
      })

      it('isActive remains true on retrigger (no release between)', () => {
        const envelope = new Envelope()
        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.5)
        expect(envelope.isActive).toBe(true)
      })
    })

    describe('first trigger behavior', () => {
      it('first trigger starts attack from zero', () => {
        const envelope = new Envelope({ attackTime: 0.1 })
        const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

        envelope.applyTo(gainNode.gain, 0)

        // First applyTo should start from 0
        expect(setValueAtTimeSpy).toHaveBeenCalledWith(0, 0)
      })
    })

    describe('retrigger during attack phase', () => {
      it('retrigger during attack cancels scheduled values', () => {
        const envelope = new Envelope({ attackTime: 0.1, decayTime: 0.1 })
        const cancelScheduledValuesSpy = vi.spyOn(
          gainNode.gain,
          'cancelScheduledValues'
        )

        // First trigger at t=0
        envelope.applyTo(gainNode.gain, 0)
        // Retrigger at t=0.05 (during attack phase)
        envelope.applyTo(gainNode.gain, 0.05)

        expect(cancelScheduledValuesSpy).toHaveBeenCalled()
      })

      it('retrigger during attack starts from estimated current value (not zero)', () => {
        const envelope = new Envelope({ attackTime: 0.1, decayTime: 0.1 })
        const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

        // First trigger at t=0
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()

        // Retrigger at t=0.05 (halfway through attack)
        envelope.applyTo(gainNode.gain, 0.05)

        // Should NOT start from 0 on retrigger
        // Instead should start from estimated value (~0.5)
        const calls = setValueAtTimeSpy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const startValue = calls[0][0]
        expect(startValue).toBeGreaterThan(0)
        expect(startValue).toBeLessThan(1)
      })
    })

    describe('retrigger during decay phase', () => {
      it('retrigger during decay picks up current value', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0.2,
          sustainLevel: 0.5,
        })
        const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

        // First trigger at t=0
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()

        // Retrigger at t=0.2 (during decay: attack ended at 0.1, decay ends at 0.3)
        envelope.applyTo(gainNode.gain, 0.2)

        // Should start from estimated value between 1 and sustainLevel
        const calls = setValueAtTimeSpy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const startValue = calls[0][0]
        expect(startValue).toBeGreaterThan(0.5) // > sustainLevel
        expect(startValue).toBeLessThanOrEqual(1) // <= peak
      })
    })

    describe('retrigger during sustain phase', () => {
      it('retrigger during sustain picks up sustain level', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0.1,
          sustainLevel: 0.7,
        })
        const setValueAtTimeSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')

        // First trigger at t=0
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()

        // Retrigger at t=0.5 (well into sustain phase: attack+decay ends at 0.2)
        envelope.applyTo(gainNode.gain, 0.5)

        // Should start from sustain level
        const calls = setValueAtTimeSpy.mock.calls
        expect(calls.length).toBeGreaterThan(0)
        const startValue = calls[0][0]
        expect(startValue).toBeCloseTo(0.7, 5)
      })
    })

    describe('estimateCurrentValue', () => {
      it('returns 0 before attack start', () => {
        const envelope = new Envelope({ attackTime: 0.1 })
        envelope.applyTo(gainNode.gain, 1.0)

        // Query at t=0.5, before attack started at t=1.0
        const value = envelope.estimateCurrentValue(0.5)
        expect(value).toBe(0)
      })

      it('returns correct value during attack phase (linear interpolation)', () => {
        const envelope = new Envelope({ attackTime: 0.1 })
        envelope.applyTo(gainNode.gain, 0)

        // At t=0.05, halfway through 0.1s attack: should be ~0.5
        const value = envelope.estimateCurrentValue(0.05)
        expect(value).toBeCloseTo(0.5, 5)
      })

      it('returns correct value at attack peak', () => {
        const envelope = new Envelope({ attackTime: 0.1 })
        envelope.applyTo(gainNode.gain, 0)

        // At t=0.1, exactly at attack end: should be 1
        const value = envelope.estimateCurrentValue(0.1)
        expect(value).toBeCloseTo(1, 5)
      })

      it('returns correct value during decay phase (linear interpolation)', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0.2,
          sustainLevel: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)

        // At t=0.2, halfway through decay (0.1 to 0.3): should be ~0.75
        // Linear interp from 1 to 0.5 over 0.2s, at 0.1s into decay
        const value = envelope.estimateCurrentValue(0.2)
        expect(value).toBeCloseTo(0.75, 5)
      })

      it('returns sustainLevel during sustain phase', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0.1,
          sustainLevel: 0.6,
        })
        envelope.applyTo(gainNode.gain, 0)

        // At t=0.5, well into sustain phase (attack+decay ends at 0.2)
        const value = envelope.estimateCurrentValue(0.5)
        expect(value).toBe(0.6)
      })

      it('handles zero attack time', () => {
        const envelope = new Envelope({
          attackTime: 0,
          decayTime: 0.2,
          sustainLevel: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)

        // Immediately in decay phase
        const value = envelope.estimateCurrentValue(0.1)
        // 0.1s into 0.2s decay from 1 to 0.5 = 0.75
        expect(value).toBeCloseTo(0.75, 5)
      })

      it('handles zero decay time', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0,
          sustainLevel: 0.5,
        })
        envelope.applyTo(gainNode.gain, 0)

        // At t=0.1 (end of attack, decay is instant), should be at sustain
        const value = envelope.estimateCurrentValue(0.1)
        expect(value).toBeCloseTo(0.5, 5)
      })

      it('returns 0 when envelope not active', () => {
        const envelope = new Envelope()
        // Don't call applyTo
        const value = envelope.estimateCurrentValue(0.5)
        expect(value).toBe(0)
      })
    })

    describe('cancelAndHoldAtTime feature detection', () => {
      it('uses cancelAndHoldAtTime when available', () => {
        const envelope = new Envelope()
        // Add cancelAndHoldAtTime to the mock
        const cancelAndHoldSpy = vi.fn()
        ;(
          gainNode.gain as unknown as Record<string, unknown>
        ).cancelAndHoldAtTime = cancelAndHoldSpy

        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.05)

        expect(cancelAndHoldSpy).toHaveBeenCalled()
      })

      it('falls back to cancelScheduledValues when cancelAndHoldAtTime unavailable', () => {
        const envelope = new Envelope()
        const cancelScheduledValuesSpy = vi.spyOn(
          gainNode.gain,
          'cancelScheduledValues'
        )
        // Ensure cancelAndHoldAtTime is not available (default mock behavior)
        expect(
          (gainNode.gain as unknown as Record<string, unknown>).cancelAndHoldAtTime
        ).toBeUndefined()

        envelope.applyTo(gainNode.gain, 0)
        envelope.applyTo(gainNode.gain, 0.05)

        expect(cancelScheduledValuesSpy).toHaveBeenCalled()
      })
    })

    describe('attack from current value', () => {
      it('attack ramps from current value to peak on retrigger', () => {
        const envelope = new Envelope({
          attackTime: 0.1,
          decayTime: 0.1,
          sustainLevel: 0.5,
        })
        const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

        // First trigger at t=0
        envelope.applyTo(gainNode.gain, 0)
        vi.clearAllMocks()

        // Retrigger at t=0.3 (during sustain, value is 0.5)
        envelope.applyTo(gainNode.gain, 0.3)

        // Attack should still ramp to peak (1.0)
        expect(linearRampSpy).toHaveBeenCalledWith(1, 0.3 + 0.1)
      })
    })
  })
})
