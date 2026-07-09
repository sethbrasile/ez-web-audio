import type { DebugMessage } from './debug'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
})
