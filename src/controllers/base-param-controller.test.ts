import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
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

describe('BaseParamController', () => {
  let audioContext: AudioContext
  let gainNode: GainNode
  let pannerNode: StereoPannerNode
  let audioSource: { detune: { value: number }; frequency?: { value: number } }
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
      controller.update('gain').to(0.5).from('ratio')
      expect(gainNode.gain.value).toBe(0.5)
    })

    it('setting pan via update updates pannerNode', () => {
      controller.update('pan').to(-1).from('ratio')
      expect(pannerNode.pan.value).toBe(-1)
    })
  })

  describe('update() fluent API', () => {
    it('update("gain").to(0.5).from("ratio") sets gain to 0.5', () => {
      controller.update('gain').to(0.5).from('ratio')
      expect(controller.gain).toBe(0.5)
    })

    it('update("gain").to(50).from("percent") sets gain to 0.5', () => {
      controller.update('gain').to(50).from('percent')
      expect(controller.gain).toBe(0.5)
    })

    it('update("gain").to(0.3).from("inverseRatio") sets gain to 0.7', () => {
      controller.update('gain').to(0.3).from('inverseRatio')
      expect(controller.gain).toBe(0.7)
    })

    it('update("pan").to(-1).from("ratio") sets pan to -1', () => {
      controller.update('pan').to(-1).from('ratio')
      expect(controller.pan).toBe(-1)
    })

    it('update("pan").to(1).from("ratio") sets pan to 1', () => {
      controller.update('pan').to(1).from('ratio')
      expect(controller.pan).toBe(1)
    })

    it('update("detune").to(100).from("ratio") sets audioSource.detune.value', () => {
      controller.update('detune').to(100).from('ratio')
      expect(audioSource.detune.value).toBe(100)
    })

    it('update("detune").to(50).from("percent") sets audioSource.detune to 0.5', () => {
      controller.update('detune').to(50).from('percent')
      expect(audioSource.detune.value).toBe(0.5)
    })

    it('throws for unsupported control type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid type
        controller.update('invalid').to(1).from('ratio')
      }).toThrow("Control type 'invalid' not supported")
    })

    it('throws for unsupported method type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid method
        controller.update('gain').to(0.5).from('invalid')
      }).toThrow("Control method 'invalid' not supported")
    })

    it('supports method chaining for multiple updates', () => {
      controller.update('gain').to(0.8).from('ratio')
      controller.update('pan').to(0.5).from('ratio')
      expect(controller.gain).toBe(0.8)
      expect(controller.pan).toBe(0.5)
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
    it('onPlayRamp("gain").from(0).to(1).in(0.5) schedules start value and ramp', () => {
      controller.onPlayRamp('gain').from(0).to(1).in(0.5)
      const startingValues = controller.getStartingValues()
      const exponentialValues = controller.getExponentialValues()
      // Start value should be added to startingValues
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'gain', value: 0 })
      // End value should be added to exponentialValues (default ramp type)
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'gain', value: 1, time: 0.5 })
    })

    it('onPlayRamp with linear ramp type', () => {
      controller.onPlayRamp('gain', 'linear').from(1).to(0).in(1.0)
      const startingValues = controller.getStartingValues()
      const linearValues = controller.getLinearValues()
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'gain', value: 1 })
      expect(linearValues).toHaveLength(1)
      expect(linearValues[0]).toEqual({ type: 'gain', value: 0, time: 1.0 })
    })

    it('onPlayRamp for detune', () => {
      controller.onPlayRamp('detune').from(-100).to(100).in(2.0)
      const startingValues = controller.getStartingValues()
      const exponentialValues = controller.getExponentialValues()
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'detune', value: -100 })
      expect(exponentialValues).toHaveLength(1)
      expect(exponentialValues[0]).toEqual({ type: 'detune', value: 100, time: 2.0 })
    })

    it('onPlayRamp for pan', () => {
      controller.onPlayRamp('pan').from(-1).to(1).in(0.5)
      const startingValues = controller.getStartingValues()
      expect(startingValues).toHaveLength(1)
      expect(startingValues[0]).toEqual({ type: 'pan', value: -1 })
    })
  })

  describe('updateGainNode/updatePannerNode', () => {
    it('updateGainNode transfers value and updates reference', () => {
      gainNode.gain.value = 0.75
      const newGainNode = audioContext.createGain()
      controller.updateGainNode(newGainNode)
      expect(newGainNode.gain.value).toBe(0.75)
      // Verify the controller now uses the new node
      controller.update('gain').to(0.5).from('ratio')
      expect(newGainNode.gain.value).toBe(0.5)
    })

    it('updatePannerNode transfers value and updates reference', () => {
      pannerNode.pan.value = -0.5
      const newPannerNode = audioContext.createStereoPanner()
      controller.updatePannerNode(newPannerNode)
      expect(newPannerNode.pan.value).toBe(-0.5)
      // Verify the controller now uses the new node
      controller.update('pan').to(0.8).from('ratio')
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
      controller.update('gain').to(0).from('ratio')
      expect(controller.gain).toBe(0)
      controller.update('gain').to(2).from('ratio')
      expect(controller.gain).toBe(2)
    })

    it('handles extreme pan values', () => {
      controller.update('pan').to(-1).from('ratio')
      expect(controller.pan).toBe(-1)
      controller.update('pan').to(1).from('ratio')
      expect(controller.pan).toBe(1)
    })

    it('handles zero percent', () => {
      controller.update('gain').to(0).from('percent')
      expect(controller.gain).toBe(0)
    })

    it('handles 100 percent', () => {
      controller.update('gain').to(100).from('percent')
      expect(controller.gain).toBe(1)
    })

    it('handles inverseRatio at boundaries', () => {
      controller.update('gain').to(0).from('inverseRatio')
      expect(controller.gain).toBe(1)
      controller.update('gain').to(1).from('inverseRatio')
      expect(controller.gain).toBe(0)
    })

    it('audio source without detune throws on detune update', () => {
      const sourceWithoutDetune = {} as { detune: { value: number } }
      const controllerNoDetune = new TestableParamController(
        sourceWithoutDetune,
        gainNode,
        pannerNode
      )
      expect(() => {
        controllerNoDetune.update('detune').to(100).from('ratio')
      }).toThrow('Audio source does not support detune')
    })
  })
})
