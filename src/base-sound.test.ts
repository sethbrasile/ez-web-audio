import type { DebugMessage } from './debug'
import type { Effect } from './effects'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Oscillator } from '@/oscillator'
import { Sound } from '@/sound'
import { setDebugHandler, setDebugMode } from './debug'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext) {
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

describe('event System', () => {
  let audioContext: AudioContext
  let sound: Sound

  beforeEach(() => {
    audioContext = createMockContext()
    sound = createSound(audioContext)
  })

  describe('.on()', () => {
    it('subscribes to single event', async () => {
      const handler = vi.fn()
      sound.on('play', handler)
      sound.play()
      await settle(() => sound.isPlaying)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('subscribes to multiple events with array', async () => {
      const handler = vi.fn()
      sound.on(['play', 'stop'], handler)
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)
      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('returns this for chaining', () => {
      const result = sound.on('play', () => {})
      expect(result).toBe(sound)
    })

    it('supports chaining multiple .on() calls', async () => {
      const playHandler = vi.fn()
      const stopHandler = vi.fn()
      sound.on('play', playHandler).on('stop', stopHandler)
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)
      expect(playHandler).toHaveBeenCalledTimes(1)
      expect(stopHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('.once()', () => {
    it('fires handler only once', async () => {
      const handler = vi.fn()
      sound.once('play', handler)
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)
      // Create new source for second play
      const sound2 = createSound(audioContext)
      sound2.once('play', handler)
      sound2.play()
      await settle(() => sound2.isPlaying)
      // Handler should have been called once per sound
      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('returns this for chaining', () => {
      const result = sound.once('play', () => {})
      expect(result).toBe(sound)
    })
  })

  describe('.off()', () => {
    it('removes specific handler', async () => {
      const handler = vi.fn()
      sound.on('play', handler)
      sound.off('play', handler)
      sound.play()
      await settle(() => sound.isPlaying)
      expect(handler).not.toHaveBeenCalled()
    })

    it('returns this for chaining', () => {
      const handler = vi.fn()
      const result = sound.off('play', handler)
      expect(result).toBe(sound)
    })
  })

  describe('event payloads', () => {
    it('play event includes time and source', async () => {
      const handler = vi.fn()
      sound.on('play', handler)
      sound.play()
      await settle(() => sound.isPlaying)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: sound,
          }),
        }),
      )
    })

    it('stop event includes time and source', async () => {
      const handler = vi.fn()
      sound.on('stop', handler)
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: sound,
          }),
        }),
      )
    })
  })
})

describe('debug Mode Integration', () => {
  let audioContext: AudioContext
  let sound: Sound
  let messages: DebugMessage[]

  beforeEach(() => {
    audioContext = createMockContext()
    sound = createSound(audioContext)
    sound.name = 'testSound'
    messages = []
    setDebugMode(false)
    setDebugHandler(null)
  })

  afterEach(() => {
    setDebugMode(false)
    setDebugHandler(null)
  })

  describe('global debug mode', () => {
    it('setDebugMode(true) causes play() to log', async () => {
      setDebugMode(true)
      setDebugHandler(msg => messages.push(msg))

      sound.play()
      await settle(() => sound.isPlaying)

      const playMsg = messages.find(m => m.message === 'play')
      expect(playMsg).toBeDefined()
      expect(playMsg!.type).toBe('event')
      expect(playMsg!.source).toBe('testSound')
    })

    it('setDebugMode(false) stops logging', async () => {
      setDebugMode(false)
      setDebugHandler(msg => messages.push(msg))

      sound.play()
      await settle(() => sound.isPlaying)

      expect(messages).toHaveLength(0)
    })
  })

  describe('per-sound override', () => {
    it('sound.debug = true enables logging for that sound only', async () => {
      setDebugMode(false) // Global off
      setDebugHandler(msg => messages.push(msg))

      sound.debug = true
      sound.play()
      await settle(() => sound.isPlaying)

      const playMsg = messages.find(m => m.message === 'play')
      expect(playMsg).toBeDefined()
    })

    it('sound.debug = false disables logging even when global is on', async () => {
      setDebugMode(true) // Global on
      setDebugHandler(msg => messages.push(msg))

      sound.debug = false
      sound.play()
      await settle(() => sound.isPlaying)

      expect(messages).toHaveLength(0)
    })
  })

  describe('custom handler', () => {
    it('setDebugHandler(fn) routes messages to custom function', async () => {
      setDebugMode(true)
      const customMessages: DebugMessage[] = []
      setDebugHandler(msg => customMessages.push(msg))

      sound.play()
      await settle(() => sound.isPlaying)

      expect(customMessages.length).toBeGreaterThan(0)
      expect(customMessages[0].source).toBe('testSound')
    })

    it('custom handler receives DebugMessage with correct structure', async () => {
      setDebugMode(true)
      setDebugHandler(msg => messages.push(msg))

      sound.play()
      await settle(() => sound.isPlaying)

      const playMsg = messages.find(m => m.message === 'play')
      expect(playMsg).toBeDefined()
      expect(playMsg).toHaveProperty('type', 'event')
      expect(playMsg).toHaveProperty('source', 'testSound')
      expect(playMsg).toHaveProperty('message', 'play')
      expect(playMsg).toHaveProperty('timestamp')
      expect(typeof playMsg!.timestamp).toBe('number')
      expect(playMsg).toHaveProperty('details')
      expect(playMsg!.details).toHaveProperty('startOffset')
    })
  })

  describe('event logging', () => {
    it('play event logged with timestamp and details', async () => {
      setDebugMode(true)
      setDebugHandler(msg => messages.push(msg))

      sound.startOffset = 0.5
      sound.play()
      await settle(() => sound.isPlaying)

      const playMsg = messages.find(m => m.message === 'play')
      expect(playMsg).toBeDefined()
      expect(playMsg!.details).toEqual({ startOffset: 0.5 })
    })

    it('stop event logged', async () => {
      setDebugMode(true)
      setDebugHandler(msg => messages.push(msg))

      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)

      const stopMsg = messages.find(m => m.message === 'stop')
      expect(stopMsg).toBeDefined()
      expect(stopMsg!.type).toBe('event')
    })
  })

  describe('connection logging', () => {
    it('addConnection logs debug message', () => {
      setDebugMode(true)
      setDebugHandler(msg => messages.push(msg))

      const gainNode = audioContext.createGain()
      sound.addConnection({ name: 'testGain', audioNode: gainNode })

      const connMsg = messages.find(m => m.type === 'connection')
      expect(connMsg).toBeDefined()
      expect(connMsg!.message).toContain('Connection added: testGain')
      expect(connMsg!.details).toHaveProperty('connectionCount', 1)
    })

    it('removeConnection logs debug message', () => {
      setDebugMode(true)

      // Add without debug first
      const gainNode = audioContext.createGain()
      sound.addConnection({ name: 'testGain', audioNode: gainNode })

      // Clear and start capturing
      setDebugHandler(msg => messages.push(msg))

      sound.removeConnection('testGain')

      const connMsg = messages.find(m => m.message.includes('Connection removed'))
      expect(connMsg).toBeDefined()
      expect(connMsg!.details).toHaveProperty('connectionCount', 0)
    })
  })
})

// Helper to create a mock Effect
function createMockEffect(audioContext: AudioContext): Effect {
  const gainNode = audioContext.createGain()
  return {
    input: gainNode,
    output: gainNode,
    bypass: false,
    mix: 1,
  }
}

describe('effect System Integration', () => {
  let audioContext: AudioContext
  let sound: Sound

  beforeEach(() => {
    audioContext = createMockContext()
    sound = createSound(audioContext)
  })

  describe('addEffect()', () => {
    it('can add effect to sound', () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)

      expect(sound.getEffects()).toHaveLength(1)
      expect(sound.getEffects()[0]).toBe(effect)
    })

    it('effect appears in getEffects()', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)

      sound.addEffect(effect1)
      sound.addEffect(effect2)

      const effects = sound.getEffects()
      expect(effects).toContain(effect1)
      expect(effects).toContain(effect2)
    })

    it('multiple effects maintain order', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)
      const effect3 = createMockEffect(audioContext)

      sound.addEffect(effect1)
      sound.addEffect(effect2)
      sound.addEffect(effect3)

      const effects = sound.getEffects()
      expect(effects[0]).toBe(effect1)
      expect(effects[1]).toBe(effect2)
      expect(effects[2]).toBe(effect3)
    })

    it('addEffect with position inserts at correct index', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)
      const effect3 = createMockEffect(audioContext)

      sound.addEffect(effect1)
      sound.addEffect(effect3)
      sound.addEffect(effect2, 1) // Insert at position 1

      const effects = sound.getEffects()
      expect(effects[0]).toBe(effect1)
      expect(effects[1]).toBe(effect2)
      expect(effects[2]).toBe(effect3)
    })

    it('returns this for chaining', () => {
      const effect = createMockEffect(audioContext)
      const result = sound.addEffect(effect)
      expect(result).toBe(sound)
    })

    it('supports chaining multiple addEffect calls', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)

      sound.addEffect(effect1).addEffect(effect2)

      expect(sound.getEffects()).toHaveLength(2)
    })
  })

  describe('removeEffect()', () => {
    it('can remove effect from sound', () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)
      sound.removeEffect(effect)

      expect(sound.getEffects()).toHaveLength(0)
    })

    it('effect no longer in getEffects() after removal', () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)

      sound.addEffect(effect1)
      sound.addEffect(effect2)
      sound.removeEffect(effect1)

      const effects = sound.getEffects()
      expect(effects).not.toContain(effect1)
      expect(effects).toContain(effect2)
    })

    it('removing non-existent effect does not throw', () => {
      const effect = createMockEffect(audioContext)
      expect(() => sound.removeEffect(effect)).not.toThrow()
    })

    it('returns this for chaining', () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)
      const result = sound.removeEffect(effect)
      expect(result).toBe(sound)
    })
  })

  describe('setDestination()', () => {
    it('can set custom destination', () => {
      const analyser = audioContext.createAnalyser()
      const result = sound.setDestination(analyser)

      // Verify return for chaining
      expect(result).toBe(sound)
    })

    it('returns this for chaining', () => {
      const customDest = audioContext.createGain()
      const result = sound.setDestination(customDest)
      expect(result).toBe(sound)
    })

    it('sound routes to custom destination after play', async () => {
      // Create a custom destination (e.g., an analyser)
      const analyser = audioContext.createAnalyser()
      sound.setDestination(analyser)

      // Play should still work without errors
      sound.play()
      await settle(() => sound.isPlaying)
      expect(sound.isPlaying).toBe(true)
    })
  })

  describe('getEffects()', () => {
    it('returns empty array when no effects', () => {
      const effects = sound.getEffects()
      expect(effects).toEqual([])
    })

    it('returns shallow copy of effects array', () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)

      const effects1 = sound.getEffects()
      const effects2 = sound.getEffects()

      // Different array instances
      expect(effects1).not.toBe(effects2)
      // Same content
      expect(effects1).toEqual(effects2)
    })
  })

  describe('effect persistence', () => {
    it('effects persist across multiple play() calls', async () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)

      // First play
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)

      // Effects should still be there
      expect(sound.getEffects()).toHaveLength(1)
      expect(sound.getEffects()[0]).toBe(effect)

      // Second play - should work without issues
      sound.play()
      await settle(() => sound.isPlaying)
      expect(sound.isPlaying).toBe(true)
    })

    it('stopping and replaying maintains effect chain', async () => {
      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)

      sound.addEffect(effect1)
      sound.addEffect(effect2)

      // Play-stop-play cycle
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)
      sound.play()
      await settle(() => sound.isPlaying)

      // Effects should maintain their order
      const effects = sound.getEffects()
      expect(effects).toHaveLength(2)
      expect(effects[0]).toBe(effect1)
      expect(effects[1]).toBe(effect2)
    })
  })

  describe('effect bypass', () => {
    it('bypassed effects are skipped in chain', async () => {
      const effect = createMockEffect(audioContext)
      effect.bypass = true

      sound.addEffect(effect)

      // Should still play without errors even with bypassed effect
      sound.play()
      await settle(() => sound.isPlaying)
      expect(sound.isPlaying).toBe(true)
    })

    it('toggling bypass and rewiring updates chain', async () => {
      const effect = createMockEffect(audioContext)
      sound.addEffect(effect)

      // Start with effect active
      sound.play()
      await settle(() => sound.isPlaying)
      sound.stop()
      await settle(() => !sound.isPlaying)

      // Bypass the effect
      effect.bypass = true
      sound.rewireEffects()

      // Play again should work
      sound.play()
      await settle(() => sound.isPlaying)
      expect(sound.isPlaying).toBe(true)
    })
  })

  describe('effects on Oscillator', () => {
    it('can add effect to Oscillator', () => {
      const oscillator = new Oscillator(audioContext, { frequency: 440 })
      const effect = createMockEffect(audioContext)

      oscillator.addEffect(effect)

      expect(oscillator.getEffects()).toHaveLength(1)
      expect(oscillator.getEffects()[0]).toBe(effect)
    })

    it('oscillator effects persist across play cycles', async () => {
      const oscillator = new Oscillator(audioContext, { frequency: 440 })
      const effect = createMockEffect(audioContext)

      oscillator.addEffect(effect)

      oscillator.play()
      await settle(() => oscillator.isPlaying)
      oscillator.stop()
      await settle(() => !oscillator.isPlaying)

      // Effects still present
      expect(oscillator.getEffects()).toHaveLength(1)

      // Can play again
      oscillator.play()
      await settle(() => oscillator.isPlaying)
      expect(oscillator.isPlaying).toBe(true)
    })
  })
})

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
