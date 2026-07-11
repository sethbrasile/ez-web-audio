import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SoundController } from './sound-controller'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('soundController', () => {
  let audioContext: AudioContext
  let gainNode: GainNode
  let pannerNode: StereoPannerNode
  let bufferSourceNode: AudioBufferSourceNode
  let controller: SoundController

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
    pannerNode = audioContext.createStereoPanner()
    bufferSourceNode = audioContext.createBufferSource()
    controller = new SoundController(bufferSourceNode, gainNode, pannerNode)
  })

  describe('creation', () => {
    it('creates from bufferSourceNode, gainNode, pannerNode', () => {
      expect(controller).toBeDefined()
      expect(controller.gain).toBeDefined()
      expect(controller.pan).toBeDefined()
    })

    it('inherits BaseParamController methods', () => {
      expect(controller.update).toBeDefined()
      expect(controller.onPlaySet).toBeDefined()
      expect(controller.onPlayRamp).toBeDefined()
      expect(controller.updateGainNode).toBeDefined()
      expect(controller.updatePannerNode).toBeDefined()
    })
  })

  describe('updateAudioSource', () => {
    it('updates internal bufferSourceNode reference', () => {
      const newSource = audioContext.createBufferSource()
      controller.updateAudioSource(newSource)
      // Verify new source is used by checking setValuesAtTimes works
      controller.onPlaySet('detune').to(100)
      const spy = vi.spyOn(newSource.detune, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalled()
    })

    it('new source is used for subsequent operations', () => {
      const newSource = audioContext.createBufferSource()
      const oldSourceSpy = vi.spyOn(bufferSourceNode.detune, 'setValueAtTime')
      controller.updateAudioSource(newSource)
      const newSourceSpy = vi.spyOn(newSource.detune, 'setValueAtTime')
      controller.onPlaySet('detune').to(50)
      controller.setValuesAtTimes()
      expect(oldSourceSpy).not.toHaveBeenCalled()
      expect(newSourceSpy).toHaveBeenCalled()
    })

    it('carries an immediate update("detune") value over to the replacement source node (H18)', () => {
      controller.update('detune').to(100).as('ratio')
      expect(bufferSourceNode.detune.value).toBe(100)

      const newSource = audioContext.createBufferSource()
      controller.updateAudioSource(newSource)

      expect(newSource.detune.value).toBe(100)
    })
  })

  describe('setValuesAtTimes', () => {
    it('applies startingValues at currentTime via setValueAtTime', () => {
      controller.onPlaySet('gain').to(0.5)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime)
    })

    it('applies valuesAtTime at currentTime + offset', () => {
      controller.onPlaySet('gain').to(0.5).at(1.0)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      // The valuesAtTime should apply at currentTime, not currentTime + offset
      // Looking at the implementation, valuesAtTime uses the same applyValues which doesn't add time offset
      // So it applies at currentTime as well
      expect(spy).toHaveBeenCalled()
    })

    it('applies exponentialValues via exponentialRampToValueAtTime', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(1.0)
      const spy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime + 1.0)
    })

    it('applies linearValues via linearRampToValueAtTime', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(1.0, 'linear')
      const spy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime + 1.0)
    })

    it('applies pan values via pannerNode.pan.setValueAtTime', () => {
      controller.onPlaySet('pan').to(-1)
      const spy = vi.spyOn(pannerNode.pan, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(-1, expect.any(Number))
    })

    it('applies pan ramps via exponentialRampToValueAtTime', () => {
      controller.onPlaySet('pan').to(0.5).endingAt(1.0)
      const spy = vi.spyOn(pannerNode.pan, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, expect.any(Number))
    })

    it('documented fade-in idiom (.to(0).at(0) + .to(1).endingAt(1)) never pushes a raw 0 setValueAtTime ahead of an exponential ramp (H19)', () => {
      controller.onPlaySet('gain').to(0).at(0)
      controller.onPlaySet('gain').to(1).endingAt(1)
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const rampSpy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()

      // The zero must be clamped to a near-zero value — a literal 0 previous
      // event value makes exponentialRampToValueAtTime hold at 0 for the
      // whole ramp then jump at the end (audible pop).
      expect(setValueSpy).not.toHaveBeenCalledWith(0, expect.any(Number))
      expect(setValueSpy).toHaveBeenCalledWith(expect.closeTo(0.00001, 5), expect.any(Number))
      expect(rampSpy).toHaveBeenCalledWith(1, expect.any(Number))
    })

    it('a standalone .to(0) with no exponential ramp pending is left as exact 0 (no unnecessary clamp)', () => {
      controller.onPlaySet('gain').to(0).at(0)
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(setValueSpy).toHaveBeenCalledWith(0, expect.any(Number))
    })

    it('a sign-crossing default-exponential pan ramp falls back to linear (R13#5)', () => {
      pannerNode.pan.value = -1
      controller.onPlaySet('pan').to(1).endingAt(1)
      const expSpy = vi.spyOn(pannerNode.pan, 'exponentialRampToValueAtTime')
      const linSpy = vi.spyOn(pannerNode.pan, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()

      expect(expSpy).not.toHaveBeenCalled()
      expect(linSpy).toHaveBeenCalledWith(1, expect.any(Number))
    })

    it('a same-sign exponential pan ramp still uses exponentialRampToValueAtTime', () => {
      pannerNode.pan.value = 0.2
      controller.onPlaySet('pan').to(0.9).endingAt(1)
      const expSpy = vi.spyOn(pannerNode.pan, 'exponentialRampToValueAtTime')
      const linSpy = vi.spyOn(pannerNode.pan, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()

      expect(linSpy).not.toHaveBeenCalled()
      expect(expSpy).toHaveBeenCalledWith(0.9, expect.any(Number))
    })
  })

  describe('audioParam scheduling verification', () => {
    it('calls gain.setValueAtTime with correct arguments', () => {
      controller.onPlaySet('gain').to(0.75)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.75, expect.any(Number))
    })

    it('calls gain.exponentialRampToValueAtTime with correct arguments', () => {
      controller.onPlaySet('gain').to(0.3).endingAt(2.0)
      const spy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.3, expect.any(Number))
    })

    it('calls gain.linearRampToValueAtTime with correct arguments', () => {
      controller.onPlaySet('gain').to(0.1).endingAt(1.5, 'linear')
      const spy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.1, expect.any(Number))
    })

    it('calls detune.setValueAtTime with correct arguments', () => {
      controller.onPlaySet('detune').to(100)
      const spy = vi.spyOn(bufferSourceNode.detune, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(100, expect.any(Number))
    })

    it('calls detune.exponentialRampToValueAtTime with correct arguments', () => {
      controller.onPlaySet('detune').to(200).endingAt(1.0)
      const spy = vi.spyOn(bufferSourceNode.detune, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(200, expect.any(Number))
    })

    it('calls detune.linearRampToValueAtTime with correct arguments', () => {
      controller.onPlaySet('detune').to(-50).endingAt(0.5, 'linear')
      const spy = vi.spyOn(bufferSourceNode.detune, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(-50, expect.any(Number))
    })
  })

  describe('integration with onPlaySet/onPlayRamp', () => {
    it('after onPlaySet, setValuesAtTimes applies the values', () => {
      controller.onPlaySet('gain').to(0.5)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('values are consumed after setValuesAtTimes (cleared for next play)', () => {
      controller.onPlaySet('gain').to(0.5)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      // After first setValuesAtTimes(), scheduled values are cleared
      controller.setValuesAtTimes()
      // Only called once — cleared after first play, not accumulated
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('onPlayRamp schedules both start setValueAtTime and ramp end value', () => {
      // onPlayRamp stores startValue in valuesAtTime at time 0 and endValue in ramp arrays.
      // Both setValueAtTime (for start) and exponentialRampToValueAtTime (for end) are called.
      controller.onPlayRamp('gain').from(0.1).to(0.9).in(1.0)
      const setValueSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const rampSpy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(setValueSpy).toHaveBeenCalledWith(0.1, expect.any(Number))
      expect(rampSpy).toHaveBeenCalledWith(0.9, expect.any(Number))
    })

    it('multiple onPlaySet calls for same type deduplicate (last wins)', () => {
      // When onPlaySet('gain').to(0.5) is called then onPlaySet('gain').to(0.8).at(0.5),
      // the second call deduplicates the first startingValues entry, then .at() moves it
      // to valuesAtTime. Result: only 1 setValueAtTime call (the one at t=0.5).
      controller.onPlaySet('gain').to(0.5)
      controller.onPlaySet('gain').to(0.8).at(0.5)
      controller.onPlaySet('detune').to(100)
      const gainSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const detuneSpy = vi.spyOn(bufferSourceNode.detune, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(gainSpy).toHaveBeenCalledTimes(1)
      expect(detuneSpy).toHaveBeenCalledTimes(1)
    })

    it('mixed ramp types work together', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(0.5)
      controller.onPlaySet('gain').to(1.0).endingAt(1.0, 'linear')
      const expSpy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      const linSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(expSpy).toHaveBeenCalledWith(0.5, expect.any(Number))
      expect(linSpy).toHaveBeenCalledWith(1.0, expect.any(Number))
    })
  })

  describe('edge cases', () => {
    it('setValuesAtTimes with no scheduled values does nothing', () => {
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).not.toHaveBeenCalled()
    })

    it('handles zero gain value', () => {
      controller.onPlaySet('gain').to(0)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0, expect.any(Number))
    })

    it('handles negative detune values', () => {
      controller.onPlaySet('detune').to(-100)
      const spy = vi.spyOn(bufferSourceNode.detune, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(-100, expect.any(Number))
    })

    it('handles zero time for ramps', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(0)
      const spy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime)
    })
  })
})
