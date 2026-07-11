import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseParamController } from './base-param-controller'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

// Create a concrete implementation for testing the abstract-like base class
class TestableParamController extends BaseParamController {
  // Expose protected properties for testing
  getStartingValues() {
    return this.startingValues
  }

  getValuesAtTime() {
    return this.valuesAtTime
  }

  getExponentialValues() {
    return this.exponentialValues
  }

  getLinearValues() {
    return this.linearValues
  }

  // Expose protected audioSource for testing
  getAudioSource() {
    return this.audioSource
  }
}

describe('baseParamController', () => {
  let audioContext: AudioContext
  let gainNode: GainNode
  let pannerNode: StereoPannerNode
  let audioSource: { detune: { value: number }, frequency?: { value: number } }
  let controller: TestableParamController

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
    pannerNode = audioContext.createStereoPanner()
    audioSource = {
      detune: { value: 0 },
    }
    controller = new TestableParamController(audioSource, gainNode, pannerNode)
  })

  describe('gain/pan getters and setters', () => {
    it('gain getter returns gainNode.gain.value', () => {
      gainNode.gain.value = 0.75
      expect(controller.gain).toBe(0.75)
    })

    it('pan getter returns pannerNode.pan.value', () => {
      pannerNode.pan.value = -0.5
      expect(controller.pan).toBe(-0.5)
    })

    it('setting gain via update updates gainNode', () => {
      controller.update('gain').to(0.5).as('ratio')
      expect(gainNode.gain.value).toBe(0.5)
    })

    it('setting pan via update updates pannerNode', () => {
      controller.update('pan').to(-1).as('ratio')
      expect(pannerNode.pan.value).toBe(-1)
    })
  })

  describe('update() fluent API', () => {
    it('update("gain").to(0.5).as("ratio") sets gain to 0.5', () => {
      controller.update('gain').to(0.5).as('ratio')
      expect(controller.gain).toBe(0.5)
    })

    it('update("gain").to(50).as("percent") sets gain to 0.5', () => {
      controller.update('gain').to(50).as('percent')
      expect(controller.gain).toBe(0.5)
    })

    it('update("gain").to(0.3).as("inverseRatio") sets gain to 0.7', () => {
      controller.update('gain').to(0.3).as('inverseRatio')
      expect(controller.gain).toBe(0.7)
    })

    it('update("pan").to(-1).as("ratio") sets pan to -1', () => {
      controller.update('pan').to(-1).as('ratio')
      expect(controller.pan).toBe(-1)
    })

    it('update("pan").to(1).as("ratio") sets pan to 1', () => {
      controller.update('pan').to(1).as('ratio')
      expect(controller.pan).toBe(1)
    })

    it('update("detune").to(100).as("ratio") sets audioSource.detune.value', () => {
      controller.update('detune').to(100).as('ratio')
      expect(audioSource.detune.value).toBe(100)
    })

    it('update("detune").to(50).as("percent") sets audioSource.detune to 0.5', () => {
      controller.update('detune').to(50).as('percent')
      expect(audioSource.detune.value).toBe(0.5)
    })

    it('throws for unsupported control type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid type
        controller.update('invalid').to(1).as('ratio')
      }).toThrow('Unsupported control type: \'invalid\'. Supported types: \'gain\', \'pan\', \'detune\', \'frequency\' (Oscillator only).')
    })

    it('throws for unsupported method type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid method
        controller.update('gain').to(0.5).as('invalid')
      }).toThrow('Unsupported ratio type: \'invalid\'. Supported types: \'ratio\', \'inverseRatio\', \'percent\'.')
    })

    it('supports method chaining for multiple updates', () => {
      controller.update('gain').to(0.8).as('ratio')
      controller.update('pan').to(0.5).as('ratio')
      expect(controller.gain).toBe(0.8)
      expect(controller.pan).toBe(0.5)
    })
  })

  describe('gain/pan validation parity with BaseSound.changeGainTo/changePanTo (R1#1)', () => {
    it('update("gain").to(-1).as("ratio") throws the same ValidationError changeGainTo(-1) would', () => {
      expect(() => controller.update('gain').to(-1).as('ratio')).toThrow('Gain must be >= 0. Received: -1')
    })

    it('update("gain") negative throw leaves gainNode.gain untouched', () => {
      const before = controller.gain
      expect(() => controller.update('gain').to(-1).as('ratio')).toThrow()
      expect(controller.gain).toBe(before)
    })

    it('update("gain").to(1.5).as("ratio") warns instead of throwing (values > 1 are allowed)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      controller.update('gain').to(1.5).as('ratio')
      expect(controller.gain).toBe(1.5)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds 1.0'))
      warnSpy.mockRestore()
    })

    it('update("pan").to(1.5).as("ratio") warns but does not throw (Web Audio clamps pan)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => controller.update('pan').to(1.5).as('ratio')).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('outside the [-1, 1] range'))
      warnSpy.mockRestore()
    })

    it('update("pan").to(50).as("percent") throws — percent is not supported for pan (R1#2)', () => {
      expect(() => controller.update('pan').to(50).as('percent')).toThrow(/percent.*not supported for.*pan/i)
    })
  })

  describe('onPlaySet() scheduling', () => {
    it('onPlaySet("gain").to(0.5) adds to startingValues', () => {
      controller.onPlaySet('gain').to(0.5)
      const startingValues = controller.getStartingValues()
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'gain', value: 0.5 })
    })

    it('onPlaySet("gain").to(0.5).at(1.0) moves to valuesAtTime', () => {
      controller.onPlaySet('gain').to(0.5).at(1.0)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toHaveLength(1)
      expect(valuesAtTime[0]).toEqual({ type: 'gain', value: 0.5, time: 1.0 })
    })

    it('onPlaySet("gain").to(0.5).endingAt(1.0) adds to exponentialValues', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(1.0)
      const startingValues = controller.getStartingValues()
      const exponentialValues = controller.getExponentialValues()
      expect(startingValues).toHaveLength(0)
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'gain', value: 0.5, time: 1.0 })
    })

    it('onPlaySet("gain").to(0.5).endingAt(1.0, "linear") adds to linearValues', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(1.0, 'linear')
      const startingValues = controller.getStartingValues()
      const linearValues = controller.getLinearValues()
      expect(startingValues).toHaveLength(0)
      expect(linearValues).toHaveLength(1)
      expect(linearValues[0]).toEqual({ type: 'gain', value: 0.5, time: 1.0 })
    })

    it('onPlaySet("gain").to(0.5).endingAt(1.0, "exponential") adds to exponentialValues', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(1.0, 'exponential')
      const exponentialValues = controller.getExponentialValues()
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'gain', value: 0.5, time: 1.0 })
    })

    it('onPlaySet for detune works', () => {
      controller.onPlaySet('detune').to(100)
      const startingValues = controller.getStartingValues()
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'detune', value: 100 })
    })

    it('multiple onPlaySet calls accumulate values', () => {
      controller.onPlaySet('gain').to(0.5)
      controller.onPlaySet('pan').to(-1)
      controller.onPlaySet('detune').to(50)
      const startingValues = controller.getStartingValues()
      expect(startingValues).toHaveLength(3)
    })

    it('combining .to() and .at() for multiple types', () => {
      controller.onPlaySet('gain').to(0.5).at(0.5)
      controller.onPlaySet('detune').to(100).at(1.0)
      const valuesAtTime = controller.getValuesAtTime()
      expect(valuesAtTime).toHaveLength(2)
      expect(valuesAtTime[0]).toEqual({ type: 'gain', value: 0.5, time: 0.5 })
      expect(valuesAtTime[1]).toEqual({ type: 'detune', value: 100, time: 1.0 })
    })
  })

  describe('onPlayRamp() scheduling', () => {
    it('onPlayRamp("gain").from(0.5).to(1).in(2) stores from value in valuesAtTime at time 0', () => {
      controller.onPlayRamp('gain').from(0.5).to(1).in(2)
      const valuesAtTime = controller.getValuesAtTime()
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 0.5, time: 0 })
    })

    it('onPlayRamp stores from value in valuesAtTime and end value in ramp arrays', () => {
      controller.onPlayRamp('gain', 'linear').from(0.5).to(1).in(2)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      const linearValues = controller.getLinearValues()
      // startValue goes directly to valuesAtTime (not startingValues)
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 0.5, time: 0 })
      expect(linearValues).toContainEqual({ type: 'gain', value: 1, time: 2 })
    })

    it('onPlayRamp("gain").from(0).to(1).in(0.5) stores start value in valuesAtTime', () => {
      controller.onPlayRamp('gain').from(0).to(1).in(0.5)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      const exponentialValues = controller.getExponentialValues()
      // startValue is in valuesAtTime at time 0, not startingValues.
      // A 0 start is clamped to near-zero: an exponential ramp from exactly 0
      // holds at 0 then jumps to the target at ramp end (audible pop).
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 0.00001, time: 0 })
      // End value is in exponentialValues (default ramp type)
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'gain', value: 1, time: 0.5 })
    })

    it('onPlayRamp exponential from(0) clamps start to near-zero so the ramp is smooth (no silence-then-jump)', () => {
      controller.onPlayRamp('gain', 'exponential').from(0).to(0.5).in(1)
      const valuesAtTime = controller.getValuesAtTime()
      // Exactly 0 must never be scheduled as the previous event of an
      // exponential ramp — the spec makes the param hold at 0 for the whole
      // interval and step to the target at the end.
      expect(valuesAtTime).not.toContainEqual({ type: 'gain', value: 0, time: 0 })
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 0.00001, time: 0 })
    })

    it('onPlayRamp linear from(0) keeps the exact 0 start (linear ramps handle 0 fine)', () => {
      controller.onPlayRamp('gain', 'linear').from(0).to(0.5).in(1)
      const valuesAtTime = controller.getValuesAtTime()
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 0, time: 0 })
    })

    it('onPlayRamp with linear ramp type stores start in valuesAtTime', () => {
      controller.onPlayRamp('gain', 'linear').from(1).to(0).in(1.0)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      const linearValues = controller.getLinearValues()
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toContainEqual({ type: 'gain', value: 1, time: 0 })
      expect(linearValues).toHaveLength(1)
      expect(linearValues[0]).toEqual({ type: 'gain', value: 0, time: 1.0 })
    })

    it('onPlayRamp for detune', () => {
      controller.onPlayRamp('detune').from(-100).to(100).in(2.0)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      const exponentialValues = controller.getExponentialValues()
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toContainEqual({ type: 'detune', value: -100, time: 0 })
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'detune', value: 100, time: 2.0 })
    })

    it('onPlayRamp for pan', () => {
      controller.onPlayRamp('pan').from(-1).to(1).in(0.5)
      const startingValues = controller.getStartingValues()
      const valuesAtTime = controller.getValuesAtTime()
      const exponentialValues = controller.getExponentialValues()
      expect(startingValues).toHaveLength(0)
      expect(valuesAtTime).toContainEqual({ type: 'pan', value: -1, time: 0 })
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'pan', value: 1, time: 0.5 })
    })

    it('setValueAtTime(startValue) is called before ramp when setValuesAtTimes-like logic runs', () => {
      // Integration-style: verify the param receives setValueAtTime(startValue) before the ramp.
      // We spy on the gainNode's AudioParam methods to verify call order.
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')

      controller.onPlayRamp('gain', 'linear').from(0.5).to(1).in(2)

      // Simulate what setValuesAtTimes does: apply valuesAtTime entries then ramp entries
      const startTime = 0
      const valuesAtTime = controller.getValuesAtTime()
      const linearValues = controller.getLinearValues()

      for (const v of valuesAtTime) {
        if (v.type === 'gain')
          gainNode.gain.setValueAtTime(v.value, startTime + v.time)
      }
      for (const v of linearValues) {
        if (v.type === 'gain')
          gainNode.gain.linearRampToValueAtTime(v.value, startTime + v.time)
      }

      expect(setValueSpy).toHaveBeenCalledWith(0.5, startTime)
      expect(linearRampSpy).toHaveBeenCalledWith(1, startTime + 2)

      // Verify setValueAtTime was called before linearRampToValueAtTime
      const setValueOrder = setValueSpy.mock.invocationCallOrder[0]
      const linearRampOrder = linearRampSpy.mock.invocationCallOrder[0]
      expect(setValueOrder).toBeLessThan(linearRampOrder)
    })
  })

  describe('updateGainNode/updatePannerNode', () => {
    it('updateGainNode transfers value and updates reference', () => {
      gainNode.gain.value = 0.75
      const newGainNode = audioContext.createGain()
      controller.updateGainNode(newGainNode)
      expect(newGainNode.gain.value).toBe(0.75)
      // Verify the controller now uses the new node
      controller.update('gain').to(0.5).as('ratio')
      expect(newGainNode.gain.value).toBe(0.5)
    })

    it('updatePannerNode transfers value and updates reference', () => {
      pannerNode.pan.value = -0.5
      const newPannerNode = audioContext.createStereoPanner()
      controller.updatePannerNode(newPannerNode)
      expect(newPannerNode.pan.value).toBe(-0.5)
      // Verify the controller now uses the new node
      controller.update('pan').to(0.8).as('ratio')
      expect(newPannerNode.pan.value).toBe(0.8)
    })

    it('updateGainNode preserves zero gain', () => {
      gainNode.gain.value = 0
      const newGainNode = audioContext.createGain()
      newGainNode.gain.value = 1 // Start with different value
      controller.updateGainNode(newGainNode)
      expect(newGainNode.gain.value).toBe(0)
    })

    it('updatePannerNode preserves center pan', () => {
      pannerNode.pan.value = 0
      const newPannerNode = audioContext.createStereoPanner()
      newPannerNode.pan.value = 1 // Start with different value
      controller.updatePannerNode(newPannerNode)
      expect(newPannerNode.pan.value).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles extreme gain values', () => {
      controller.update('gain').to(0).as('ratio')
      expect(controller.gain).toBe(0)
      controller.update('gain').to(2).as('ratio')
      expect(controller.gain).toBe(2)
    })

    it('handles extreme pan values', () => {
      controller.update('pan').to(-1).as('ratio')
      expect(controller.pan).toBe(-1)
      controller.update('pan').to(1).as('ratio')
      expect(controller.pan).toBe(1)
    })

    it('handles zero percent', () => {
      controller.update('gain').to(0).as('percent')
      expect(controller.gain).toBe(0)
    })

    it('handles 100 percent', () => {
      controller.update('gain').to(100).as('percent')
      expect(controller.gain).toBe(1)
    })

    it('handles inverseRatio at boundaries', () => {
      controller.update('gain').to(0).as('inverseRatio')
      expect(controller.gain).toBe(1)
      controller.update('gain').to(1).as('inverseRatio')
      expect(controller.gain).toBe(0)
    })

    it('audio source without detune throws on detune update', () => {
      const sourceWithoutDetune = {} as { detune: { value: number } }
      const controllerNoDetune = new TestableParamController(
        sourceWithoutDetune,
        gainNode,
        pannerNode,
      )
      expect(() => {
        controllerNoDetune.update('detune').to(100).as('ratio')
      }).toThrow('Audio source does not support detune')
    })
  })
})
