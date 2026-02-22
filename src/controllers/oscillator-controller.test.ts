import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Envelope } from '../envelope'
import { OscillatorController } from './oscillator-controller'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('oscillatorController', () => {
  let audioContext: AudioContext
  let gainNode: GainNode
  let pannerNode: StereoPannerNode
  let oscillatorNode: OscillatorNode
  let controller: OscillatorController

  beforeEach(() => {
    audioContext = createMockContext()
    gainNode = audioContext.createGain()
    pannerNode = audioContext.createStereoPanner()
    oscillatorNode = audioContext.createOscillator()
    controller = new OscillatorController(oscillatorNode, gainNode, pannerNode)
  })

  describe('creation', () => {
    it('creates from oscillatorNode, gainNode, pannerNode', () => {
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

    it('has setEnvelope method', () => {
      expect(controller.setEnvelope).toBeDefined()
    })

    it('has triggerRelease method', () => {
      expect(controller.triggerRelease).toBeDefined()
    })
  })

  describe('frequency control (override of _update)', () => {
    it('update("frequency").to(880).as("ratio") sets oscillator.frequency.value', () => {
      controller.update('frequency').to(880).as('ratio')
      expect(oscillatorNode.frequency.value).toBe(880)
    })

    it('update("frequency").to(50).as("percent") sets frequency to 0.5', () => {
      controller.update('frequency').to(50).as('percent')
      expect(oscillatorNode.frequency.value).toBe(0.5)
    })

    it('other control types delegate to base class - gain', () => {
      controller.update('gain').to(0.5).as('ratio')
      expect(controller.gain).toBe(0.5)
    })

    it('other control types delegate to base class - pan', () => {
      controller.update('pan').to(-1).as('ratio')
      expect(controller.pan).toBe(-1)
    })

    it('other control types delegate to base class - detune', () => {
      controller.update('detune').to(100).as('ratio')
      expect(oscillatorNode.detune.value).toBe(100)
    })
  })

  describe('envelope integration', () => {
    it('setEnvelope stores envelope reference', () => {
      const envelope = new Envelope({ attackTime: 0.1, sustainLevel: 0.7 })
      controller.setEnvelope(envelope)
      // Envelope is stored internally - verify by calling setValuesAtTimes
      const spy = vi.spyOn(envelope, 'applyTo')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalled()
    })

    it('setValuesAtTimes applies envelope first via envelope.applyTo', () => {
      const envelope = new Envelope({ attackTime: 0.1, sustainLevel: 0.7 })
      const applyToSpy = vi.spyOn(envelope, 'applyTo')
      controller.setEnvelope(envelope)
      controller.setValuesAtTimes()
      expect(applyToSpy).toHaveBeenCalledWith(gainNode.gain, audioContext.currentTime)
    })

    it('triggerRelease calls envelope.release', () => {
      const envelope = new Envelope({ releaseTime: 0.3 })
      const releaseSpy = vi.spyOn(envelope, 'release')
      controller.setEnvelope(envelope)
      const releaseTime = 1.5
      controller.triggerRelease(releaseTime)
      expect(releaseSpy).toHaveBeenCalledWith(gainNode.gain, releaseTime)
    })

    it('no envelope - setValuesAtTimes still works without error', () => {
      controller.onPlaySet('frequency').to(880)
      expect(() => controller.setValuesAtTimes()).not.toThrow()
    })

    it('no envelope - triggerRelease does nothing without error', () => {
      expect(() => controller.triggerRelease(1.0)).not.toThrow()
    })
  })

  describe('setValuesAtTimes', () => {
    it('applies frequency values via frequency.setValueAtTime', () => {
      controller.onPlaySet('frequency').to(880)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(880, audioContext.currentTime)
    })

    it('applies gain values via gain.setValueAtTime', () => {
      controller.onPlaySet('gain').to(0.5)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime)
    })

    it('applies exponential ramps to frequency', () => {
      controller.onPlaySet('frequency').to(880).endingAt(1.0)
      const spy = vi.spyOn(oscillatorNode.frequency, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(880, audioContext.currentTime + 1.0)
    })

    it('applies linear ramps to frequency', () => {
      controller.onPlaySet('frequency').to(880).endingAt(1.0, 'linear')
      const spy = vi.spyOn(oscillatorNode.frequency, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(880, audioContext.currentTime + 1.0)
    })

    it('applies exponential ramps to gain', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(0.5)
      const spy = vi.spyOn(gainNode.gain, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime + 0.5)
    })

    it('applies linear ramps to gain', () => {
      controller.onPlaySet('gain').to(0.5).endingAt(0.5, 'linear')
      const spy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0.5, audioContext.currentTime + 0.5)
    })

    it('applies detune values via detune.setValueAtTime', () => {
      controller.onPlaySet('detune').to(100)
      const spy = vi.spyOn(oscillatorNode.detune, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(100, expect.any(Number))
    })

    it('applies pan values via pannerNode.pan.setValueAtTime', () => {
      controller.onPlaySet('pan').to(-0.5)
      const spy = vi.spyOn(pannerNode.pan, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(-0.5, expect.any(Number))
    })

    it('applies detune ramps via applyRampToParam', () => {
      controller.onPlaySet('detune').to(200).endingAt(1.0)
      const spy = vi.spyOn(oscillatorNode.detune, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(200, expect.any(Number))
    })

    it('applies pan ramps via applyRampToParam', () => {
      controller.onPlaySet('pan').to(1).endingAt(0.5, 'linear')
      const spy = vi.spyOn(pannerNode.pan, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(1, expect.any(Number))
    })
  })

  describe('updateAudioSource', () => {
    it('updates internal oscillator reference', () => {
      const newOscillator = audioContext.createOscillator()
      controller.updateAudioSource(newOscillator)
      // Verify new oscillator is used
      controller.onPlaySet('frequency').to(440)
      const spy = vi.spyOn(newOscillator.frequency, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalled()
    })

    it('new oscillator is used for subsequent operations', () => {
      const newOscillator = audioContext.createOscillator()
      const oldOscSpy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.updateAudioSource(newOscillator)
      const newOscSpy = vi.spyOn(newOscillator.frequency, 'setValueAtTime')
      controller.onPlaySet('frequency').to(660)
      controller.setValuesAtTimes()
      expect(oldOscSpy).not.toHaveBeenCalled()
      expect(newOscSpy).toHaveBeenCalled()
    })

    it('update("frequency") uses new oscillator after updateAudioSource', () => {
      const newOscillator = audioContext.createOscillator()
      controller.updateAudioSource(newOscillator)
      controller.update('frequency').to(880).as('ratio')
      expect(newOscillator.frequency.value).toBe(880)
    })
  })

  describe('envelope + other scheduling coexistence', () => {
    it('envelope applied first', () => {
      const envelope = new Envelope({ attackTime: 0.1, sustainLevel: 0.7 })
      const applyToSpy = vi.spyOn(envelope, 'applyTo')
      const freqSpy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setEnvelope(envelope)
      controller.onPlaySet('frequency').to(880)
      controller.setValuesAtTimes()
      // Check that applyTo was called before frequency.setValueAtTime
      const applyToCallOrder = applyToSpy.mock.invocationCallOrder[0]
      const freqCallOrder = freqSpy.mock.invocationCallOrder[0]
      expect(applyToCallOrder).toBeLessThan(freqCallOrder)
    })

    it('then startingValues, valuesAtTime, ramps applied', () => {
      const envelope = new Envelope({ attackTime: 0.05 })
      controller.setEnvelope(envelope)
      // Each onPlaySet for the same type deduplicates the previous startingValues entry.
      // to(440) → startingValues: [{freq,440}]
      // to(880).at(0.5) → dedup removes {freq,440}, pushes {freq,880}, .at() moves to valuesAtTime
      // to(1760).endingAt(1.0) → startingValues empty, pushes {freq,1760}, .endingAt() moves to exponentialValues
      controller.onPlaySet('frequency').to(440)
      controller.onPlaySet('frequency').to(880).at(0.5)
      controller.onPlaySet('frequency').to(1760).endingAt(1.0)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      const rampSpy = vi.spyOn(oscillatorNode.frequency, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      // Only the valuesAtTime entry (880 at 0.5s) calls setValueAtTime; initial to(440) was deduped
      expect(spy).toHaveBeenCalledTimes(1)
      expect(rampSpy).toHaveBeenCalledTimes(1)
    })

    it('envelope controls gain while frequency controlled separately', () => {
      const envelope = new Envelope({ attackTime: 0.1, sustainLevel: 0.8 })
      const envelopeApplySpy = vi.spyOn(envelope, 'applyTo')
      const freqSpy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setEnvelope(envelope)
      controller.onPlaySet('frequency').to(880)
      controller.setValuesAtTimes()
      // Envelope applies to gain
      expect(envelopeApplySpy).toHaveBeenCalledWith(gainNode.gain, expect.any(Number))
      // Frequency value also applied
      expect(freqSpy).toHaveBeenCalledWith(880, expect.any(Number))
    })

    it('multiple setValuesAtTimes calls re-apply envelope', () => {
      const envelope = new Envelope({ attackTime: 0.1 })
      const spy = vi.spyOn(envelope, 'applyTo')
      controller.setEnvelope(envelope)
      controller.setValuesAtTimes()
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledTimes(2)
    })
  })

  describe('onPlayRamp integration', () => {
    it('onPlayRamp for frequency schedules ramp end value', () => {
      // onPlayRamp calls onPlaySet twice: startValue is deduped by endValue's push.
      // Only the end value (880) ends up in exponentialValues; no setValueAtTime for 440.
      controller.onPlayRamp('frequency').from(440).to(880).in(0.5)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      const rampSpy = vi.spyOn(oscillatorNode.frequency, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).not.toHaveBeenCalled()
      expect(rampSpy).toHaveBeenCalledWith(880, expect.any(Number))
    })

    it('onPlayRamp for gain with linear type', () => {
      // Same: startValue deduped, only end value in linearValues
      controller.onPlayRamp('gain', 'linear').from(1).to(0).in(1.0)
      const spy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      const rampSpy = vi.spyOn(gainNode.gain, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).not.toHaveBeenCalled()
      expect(rampSpy).toHaveBeenCalledWith(0, expect.any(Number))
    })
  })

  describe('frequency ramp scheduling', () => {
    it('onPlayRamp("frequency", "linear") schedules linear ramp from start to end value', () => {
      controller.onPlayRamp('frequency', 'linear').from(220).to(440).in(0.5)
      const setValueSpy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      const linearRampSpy = vi.spyOn(oscillatorNode.frequency, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      // onPlayRamp deduplicates: start value (220) is removed; only end value (440) remains in linearValues
      expect(setValueSpy).not.toHaveBeenCalled()
      expect(linearRampSpy).toHaveBeenCalledWith(440, expect.any(Number))
    })

    it('onPlayRamp("frequency", "exponential") schedules exponential ramp to end value', () => {
      controller.onPlayRamp('frequency').from(440).to(880).in(1.0)
      const exponentialRampSpy = vi.spyOn(oscillatorNode.frequency, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(exponentialRampSpy).toHaveBeenCalledWith(880, expect.any(Number))
    })

    it('onPlaySet("frequency") schedules setValueAtTime call', () => {
      controller.onPlaySet('frequency').to(880)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(880, expect.any(Number))
    })

    it('onPlayRamp("detune") schedules detune ramp', () => {
      controller.onPlayRamp('detune').from(0).to(100).in(0.5)
      const rampSpy = vi.spyOn(oscillatorNode.detune, 'exponentialRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(rampSpy).toHaveBeenCalledWith(100, expect.any(Number))
    })

    it('onPlayRamp("pan") schedules pan ramp on pannerNode', () => {
      controller.onPlayRamp('pan', 'linear').from(-1).to(1).in(2.0)
      const rampSpy = vi.spyOn(pannerNode.pan, 'linearRampToValueAtTime')
      controller.setValuesAtTimes()
      expect(rampSpy).toHaveBeenCalledWith(1, expect.any(Number))
    })

    it('scheduled values are cleared after setValuesAtTimes — second call is a no-op for that ramp', () => {
      controller.onPlayRamp('frequency').from(220).to(880).in(0.5)
      const rampSpy = vi.spyOn(oscillatorNode.frequency, 'exponentialRampToValueAtTime')
      // First call: applies the ramp
      controller.setValuesAtTimes()
      expect(rampSpy).toHaveBeenCalledTimes(1)
      // Second call: ramp was cleared, nothing to apply
      controller.setValuesAtTimes()
      expect(rampSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('handles zero frequency', () => {
      controller.onPlaySet('frequency').to(0)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(0, expect.any(Number))
    })

    it('handles very high frequency', () => {
      controller.onPlaySet('frequency').to(20000)
      const spy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(spy).toHaveBeenCalledWith(20000, expect.any(Number))
    })

    it('handles negative detune', () => {
      controller.update('detune').to(-100).as('ratio')
      expect(oscillatorNode.detune.value).toBe(-100)
    })

    it('setValuesAtTimes with no scheduled values and no envelope does nothing', () => {
      const freqSpy = vi.spyOn(oscillatorNode.frequency, 'setValueAtTime')
      const gainSpy = vi.spyOn(gainNode.gain, 'setValueAtTime')
      controller.setValuesAtTimes()
      expect(freqSpy).not.toHaveBeenCalled()
      expect(gainSpy).not.toHaveBeenCalled()
    })

    it('envelope with zero attack time', () => {
      const envelope = new Envelope({ attackTime: 0, sustainLevel: 1 })
      controller.setEnvelope(envelope)
      expect(() => controller.setValuesAtTimes()).not.toThrow()
    })

    it('envelope with zero release time', () => {
      const envelope = new Envelope({ releaseTime: 0 })
      controller.setEnvelope(envelope)
      expect(() => controller.triggerRelease(1.0)).not.toThrow()
    })
  })
})
