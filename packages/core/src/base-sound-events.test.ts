import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sound } from '@/sound'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext, bufferDuration?: number) {
  const sampleRate = 44100
  const length = bufferDuration ? Math.floor(bufferDuration * sampleRate) : sampleRate
  const audioBuffer = context.createBuffer(1, length, sampleRate)
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

  describe('dispose() event cleanup (TEST-03)', () => {
    it('event listeners do not fire after dispose()', async () => {
      const sound = createSound(audioContext)
      const playHandler = vi.fn()
      sound.on('play', playHandler)

      // First play — listener fires
      await sound.play()
      expect(playHandler).toHaveBeenCalledTimes(1)

      await sound.stop()

      // Dispose
      sound.dispose()

      // Attempting to play after dispose throws, so the listener can't fire via play()
      await expect(sound.play()).rejects.toThrow('Cannot play a disposed sound')

      // Verify handler was NOT called again
      expect(playHandler).toHaveBeenCalledTimes(1)
    })

    it('onended does not emit end event after dispose()', async () => {
      const sound = createSound(audioContext)
      const endHandler = vi.fn()
      sound.on('end', endHandler)

      await sound.play()

      // Get reference to audioSourceNode before dispose nullifies onended
      const sourceNode = sound.audioSourceNode

      sound.dispose()

      // onended was set to null by dispose(), so triggering it is a no-op
      expect(sourceNode.onended).toBeNull()
      expect(endHandler).not.toHaveBeenCalled()
    })

    it('stop event does not fire on dispose if not playing', () => {
      const sound = createSound(audioContext)
      const stopHandler = vi.fn()
      sound.on('stop', stopHandler)

      // Dispose without playing — should not emit stop
      sound.dispose()
      expect(stopHandler).not.toHaveBeenCalled()
    })
  })
})
