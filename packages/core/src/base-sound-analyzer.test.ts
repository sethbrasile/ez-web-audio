import type { Effect } from './effects'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { Oscillator } from '@/oscillator'
import { Sound } from '@/sound'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext) {
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

// Helper to create a mock Effect (needed by error paths section)
function createMockEffect(audioContext: AudioContext): Effect {
  const gainNode = audioContext.createGain()
  return {
    input: gainNode,
    output: gainNode,
    bypass: false,
    mix: 1,
  }
}

describe('analyzer Integration', () => {
  let audioContext: AudioContext
  let sound: Sound

  beforeEach(() => {
    audioContext = createMockContext()
    sound = createSound(audioContext)
  })

  // Helper to create a mock Analyzer-like object
  function createMockAnalyzer(context: AudioContext) {
    const analyserNode = context.createGain() // Use gain as mock since mock doesn't have createAnalyser
    return {
      input: analyserNode,
      fftSize: 2048,
      frequencyBinCount: 1024,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getFrequencyData: () => new Uint8Array(1024),
      getTimeDomainData: () => new Uint8Array(1024),
      getFloatFrequencyData: () => new Float32Array(1024),
    }
  }

  describe('setAnalyzer()', () => {
    it('attaches analyzer to sound', () => {
      const analyzer = createMockAnalyzer(audioContext)
      sound.setAnalyzer(analyzer as any)

      expect(sound.getAnalyzer()).toBe(analyzer)
    })

    it('returns this for chaining', () => {
      const analyzer = createMockAnalyzer(audioContext)
      const result = sound.setAnalyzer(analyzer as any)

      expect(result).toBe(sound)
    })

    it('detaches analyzer when set to null', () => {
      const analyzer = createMockAnalyzer(audioContext)
      sound.setAnalyzer(analyzer as any)
      sound.setAnalyzer(null)

      expect(sound.getAnalyzer()).toBeNull()
    })
  })

  describe('getAnalyzer()', () => {
    it('returns null when no analyzer attached', () => {
      expect(sound.getAnalyzer()).toBeNull()
    })

    it('returns the attached analyzer', () => {
      const analyzer = createMockAnalyzer(audioContext)
      sound.setAnalyzer(analyzer as any)

      expect(sound.getAnalyzer()).toBe(analyzer)
    })
  })

  describe('analyzer with playback', () => {
    it('sound plays with analyzer attached', async () => {
      const analyzer = createMockAnalyzer(audioContext)
      sound.setAnalyzer(analyzer as any)

      sound.play()
      await settle(() => sound.isPlaying)

      expect(sound.isPlaying).toBe(true)
    })

    it('analyzer persists across play/stop cycles', async () => {
      const analyzer = createMockAnalyzer(audioContext)
      sound.setAnalyzer(analyzer as any)

      // First play
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)

      // Analyzer should still be attached
      expect(sound.getAnalyzer()).toBe(analyzer)

      // Second play should still work
      sound.play()
      await settle(() => sound.isPlaying)
      expect(sound.isPlaying).toBe(true)
    })
  })

  describe('analyzer on Oscillator', () => {
    it('can attach analyzer to Oscillator', () => {
      const oscillator = new Oscillator(audioContext, { frequency: 440 })
      const analyzer = createMockAnalyzer(audioContext)

      oscillator.setAnalyzer(analyzer as any)

      expect(oscillator.getAnalyzer()).toBe(analyzer)
    })

    it('oscillator plays with analyzer attached', async () => {
      const oscillator = new Oscillator(audioContext, { frequency: 440 })
      const analyzer = createMockAnalyzer(audioContext)

      oscillator.setAnalyzer(analyzer as any)
      oscillator.play()
      await settle(() => oscillator.isPlaying)

      expect(oscillator.isPlaying).toBe(true)
    })
  })

  describe('error paths', () => {
    it('addEffect works even without explicit rewire call', () => {
      // Sound should handle effect addition gracefully
      const effect = createMockEffect(audioContext)
      const result = sound.addEffect(effect)

      expect(result).toBe(sound) // Chaining works
      expect(sound.getEffects()).toContain(effect)
    })

    it('removeEffect that was never added does not error', () => {
      const effect = createMockEffect(audioContext)

      // Should not throw when removing non-existent effect
      expect(() => sound.removeEffect(effect)).not.toThrow()

      // getEffects should still return empty array
      expect(sound.getEffects()).toEqual([])
    })

    it('calling play() on stopped sound works (restart)', async () => {
      // Play first time
      await sound.play()
      expect(sound.isPlaying).toBe(true)

      // Stop
      await sound.stop()
      expect(sound.isPlaying).toBe(false)

      // Play again (restart)
      await sound.play()
      expect(sound.isPlaying).toBe(true)
    })

    it('stop event includes currentTime as time property', async () => {
      let stopEventTime: number | undefined

      sound.on('stop', (e) => {
        stopEventTime = e.detail.time
      })

      await sound.play()
      await sound.stop()

      // Should have received a stop event with a time property
      expect(stopEventTime).toBeDefined()
      expect(typeof stopEventTime).toBe('number')
      expect(stopEventTime).toBeGreaterThanOrEqual(0)
    })

    it('multiple rapid addEffect calls maintain order', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)
      const effect3 = createMockEffect(audioContext)

      sound.addEffect(effect1).addEffect(effect2).addEffect(effect3)

      const effects = sound.getEffects()
      expect(effects).toHaveLength(3)
      expect(effects[0]).toBe(effect1)
      expect(effects[1]).toBe(effect2)
      expect(effects[2]).toBe(effect3)
    })

    it('rewireEffects with no effects does not error', () => {
      expect(sound.getEffects()).toHaveLength(0)
      expect(() => sound.rewireEffects()).not.toThrow()
    })

    it('setDestination to null uses default destination', () => {
      // Set custom destination first
      const customDest = audioContext.createGain()
      sound.setDestination(customDest)

      // Set back to null (should use audioContext.destination)
      const result = sound.setDestination(null as any)

      expect(result).toBe(sound) // Chaining works
      // Sound should still play without errors
      expect(() => sound.play()).not.toThrow()
    })
  })
})
