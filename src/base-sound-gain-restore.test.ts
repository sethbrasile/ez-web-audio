import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { Oscillator } from '@/oscillator'
import { Sound } from '@/sound'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext) {
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

describe('gain restoration after fadeOut/stop', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('Sound gain restoration', () => {
    it('play after fadeOut restores gain to default (1.0)', async () => {
      const sound = createSound(audioContext)
      await sound.play()
      // Simulate fadeOut by ramping gainNode.gain to 0
      sound.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // Play again — setup() should restore _targetGain (1.0)
      await sound.play()
      expect(sound.getGainNode().gain.value).toBe(1)
    })

    it('play after fadeOut restores user-set gain', async () => {
      const sound = createSound(audioContext)
      sound.changeGainTo(0.5)
      await sound.play()
      // Simulate fadeOut leaving gainNode.gain at 0
      sound.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // Play again — setup() should restore _targetGain (0.5)
      await sound.play()
      expect(sound.getGainNode().gain.value).toBe(0.5)
    })

    it('volume getter returns _targetGain not transient node value', () => {
      const sound = createSound(audioContext)
      sound.changeGainTo(0.5)
      expect(sound.volume).toBe(0.5)
      // Simulate fadeOut leaving node at 0
      sound.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // volume getter should still return the intended gain, not the transient 0
      expect(sound.volume).toBe(0.5)
    })

    it('volume getter returns 1 by default', () => {
      const sound = createSound(audioContext)
      expect(sound.volume).toBe(1)
    })

    it('changeGainTo updates _targetGain', () => {
      const sound = createSound(audioContext)
      sound.changeGainTo(0.8)
      expect(sound.volume).toBe(0.8)
      sound.changeGainTo(0.3)
      expect(sound.volume).toBe(0.3)
    })

    it('fadeIn ramps to _targetGain not transient gainNode value', async () => {
      const sound = createSound(audioContext)
      sound.changeGainTo(0.8)
      // Simulate a stale gainNode value different from _targetGain
      sound.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // fadeIn should use _targetGain (0.8) as the target, not gainNode.gain.value (0)
      await sound.fadeIn(1)
      // After fadeIn, the intended gain is still 0.8
      expect(sound.volume).toBe(0.8)
    })
  })

  describe('Oscillator gain restoration', () => {
    it('play after stop restores gain to default (1.0)', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      await osc.play()
      // Simulate anti-click fade leaving gainNode.gain at 0
      osc.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // Play again — setup() should restore _targetGain (1.0)
      await osc.play()
      expect(osc.getGainNode().gain.value).toBe(1)
    })

    it('play after stop restores user-set gain', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      osc.changeGainTo(0.7)
      await osc.play()
      // Simulate anti-click fade leaving gainNode.gain at 0
      osc.getGainNode().gain.setValueAtTime(0, audioContext.currentTime)
      // Play again — setup() should restore _targetGain (0.7)
      await osc.play()
      expect(osc.getGainNode().gain.value).toBe(0.7)
    })
  })
})
