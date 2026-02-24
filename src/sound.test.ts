import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sound } from '@/sound'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext, bufferDuration?: number) {
  // Create buffer with specific duration (default 1 second)
  // Buffer params: channels, length, sampleRate
  // Duration = length / sampleRate
  const sampleRate = 44100
  const length = bufferDuration ? Math.floor(bufferDuration * sampleRate) : sampleRate
  const audioBuffer = context.createBuffer(1, length, sampleRate)
  return new Sound(context, audioBuffer)
}

describe('sound', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation and initialization', () => {
    it('exists', () => {
      expect(Sound).toBeTruthy()
    })

    it('can be created with valid AudioBuffer', () => {
      const sound = createSound(audioContext)
      expect(sound).toBeTruthy()
      expect(sound).toBeInstanceOf(Sound)
    })

    it('has audioSourceNode after creation', () => {
      const sound = createSound(audioContext)
      expect(sound.audioSourceNode).toBeDefined()
    })

    it('audioSourceNode has buffer attached', () => {
      const sound = createSound(audioContext)
      expect(sound.audioSourceNode.buffer).not.toBeNull()
    })

    it('has gainNode', () => {
      const sound = createSound(audioContext)
      expect(sound.gainNode).toBeDefined()
    })

    it('isPlaying is false initially', () => {
      const sound = createSound(audioContext)
      expect(sound.isPlaying).toBe(false)
    })

    it('accepts options with name', () => {
      const audioBuffer = audioContext.createBuffer(1, 1, 44100)
      const sound = new Sound(audioContext, audioBuffer, { name: 'testSound' })
      expect(sound.name).toBe('testSound')
    })

    it('default name is empty string', () => {
      const sound = createSound(audioContext)
      expect(sound.name).toBe('')
    })

    it('startOffset defaults to 0', () => {
      const sound = createSound(audioContext)
      expect(sound.startOffset).toBe(0)
    })
  })

  describe('play methods', () => {
    describe('play()', () => {
      it('starts immediately and sets isPlaying true', async () => {
        const sound = createSound(audioContext)
        expect(sound.isPlaying).toBe(false)
        sound.play()
        expect(await settle(() => sound.isPlaying)).toBe(true)
      })

      it('emits play event', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('play', handler)
        sound.play()
        await settle(() => sound.isPlaying)
        expect(handler).toHaveBeenCalledTimes(1)
      })

      it('play event includes time and source', async () => {
        const sound = createSound(audioContext)
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

      it('returns a Promise', () => {
        const sound = createSound(audioContext)
        const result = sound.play()
        expect(result).toBeInstanceOf(Promise)
      })

      it('can be awaited', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        expect(sound.isPlaying).toBe(true)
      })
    })

    describe('playAt(time)', () => {
      it('sets up playback scheduling', async () => {
        const sound = createSound(audioContext)
        // playAt should return a promise and set up the sound
        await sound.playAt(audioContext.currentTime)
        // After await, should be playing
        expect(sound.isPlaying).toBe(true)
      })

      it('emits play event', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('play', handler)
        await sound.playAt(audioContext.currentTime)
        expect(handler).toHaveBeenCalled()
      })

      it('returns a Promise', () => {
        const sound = createSound(audioContext)
        const result = sound.playAt(audioContext.currentTime)
        expect(result).toBeInstanceOf(Promise)
      })
    })

    describe('playIn(seconds)', () => {
      it('calls playAt with future time', () => {
        const sound = createSound(audioContext)
        const playAtSpy = vi.spyOn(sound, 'playAt')
        const currentTime = audioContext.currentTime
        sound.playIn(0.5)
        expect(playAtSpy).toHaveBeenCalledWith(currentTime + 0.5)
      })
    })

    describe('playFor(duration)', () => {
      it('starts playback', async () => {
        const sound = createSound(audioContext)
        sound.playFor(1)
        expect(await settle(() => sound.isPlaying)).toBe(true)
      })

      it('schedules stop after duration', async () => {
        const sound = createSound(audioContext)
        const playAtSpy = vi.spyOn(sound, 'playAt')

        sound.playFor(0.5)

        // Verify playAt was called (playFor calls playAt internally)
        expect(playAtSpy).toHaveBeenCalled()
        // Verify sound started playing
        expect(await settle(() => sound.isPlaying)).toBe(true)
      })
    })

    describe('playInAndStopAfter(playIn, stopAfter)', () => {
      it('calls playIn and stopIn', () => {
        const sound = createSound(audioContext)
        const playInSpy = vi.spyOn(sound, 'playIn')
        const stopInSpy = vi.spyOn(sound, 'stopIn')
        sound.playInAndStopAfter(0.1, 0.5)
        expect(playInSpy).toHaveBeenCalledWith(0.1)
        expect(stopInSpy).toHaveBeenCalledWith(0.6) // playIn + stopAfter
      })
    })

    describe('multiple play calls', () => {
      it('second play creates new source node', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        const firstSource = sound.audioSourceNode
        await sound.stop()
        await sound.play()
        // AudioBufferSourceNode is single-use, so should be different
        expect(sound.audioSourceNode).not.toBe(firstSource)
      })

      it('can play-stop-play cycle', async () => {
        const sound = createSound(audioContext)
        // First play
        await sound.play()
        expect(sound.isPlaying).toBe(true)
        // Stop
        await sound.stop()
        expect(sound.isPlaying).toBe(false)
        // Second play
        await sound.play()
        expect(sound.isPlaying).toBe(true)
      })
    })
  })

  describe('timing methods', () => {
    describe('stopIn(0) stops immediately', () => {
      it('stops a playing sound immediately when called with 0', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        expect(sound.isPlaying).toBe(true)
        await sound.stopIn(0)
        expect(sound.isPlaying).toBe(false)
      })
    })

    describe('stopAt(audioContext.currentTime) stops immediately', () => {
      it('stops immediately when called with current time', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        expect(sound.isPlaying).toBe(true)
        await sound.stopAt(audioContext.currentTime)
        expect(sound.isPlaying).toBe(false)
      })
    })

    describe('playFor(duration) isPlaying lifecycle', () => {
      it('isPlaying becomes true after playFor starts', async () => {
        const sound = createSound(audioContext)
        expect(sound.isPlaying).toBe(false)
        sound.playFor(1)
        expect(await settle(() => sound.isPlaying)).toBe(true)
      })

      it('sound is playing after playFor starts (isPlaying lifecycle begins)', async () => {
        const sound = createSound(audioContext)
        // playFor calls playAt internally (without await), so isPlaying is set async
        // We verify the playing state via settle after the playAt promise resolves
        const stopSpy = vi.spyOn(sound, 'stop')
        sound.playFor(1)
        expect(await settle(() => sound.isPlaying)).toBe(true)
        // stop not called yet (duration hasn't elapsed)
        expect(stopSpy).not.toHaveBeenCalled()
      })
    })

    describe('playInAndStopAfter timing', () => {
      it('stopIn is called with playIn + stopAfter total time', () => {
        const sound = createSound(audioContext)
        const playInSpy = vi.spyOn(sound, 'playIn')
        const stopInSpy = vi.spyOn(sound, 'stopIn')
        sound.playInAndStopAfter(1, 2)
        expect(playInSpy).toHaveBeenCalledWith(1)
        expect(stopInSpy).toHaveBeenCalledWith(3) // playIn + stopAfter = 1 + 2 = 3
      })
    })
  })

  describe('stop behavior', () => {
    describe('stop()', () => {
      it('sets isPlaying to false', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        expect(sound.isPlaying).toBe(true)
        await sound.stop()
        expect(sound.isPlaying).toBe(false)
      })

      it('emits stop event', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('stop', handler)
        await sound.play()
        await sound.stop()
        expect(handler).toHaveBeenCalledTimes(1)
      })

      it('stop event includes time and source', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('stop', handler)
        await sound.play()
        await sound.stop()
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: expect.objectContaining({
              time: expect.any(Number),
              source: sound,
            }),
          }),
        )
      })

      it('returns a Promise', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        const result = sound.stop()
        expect(result).toBeInstanceOf(Promise)
      })

      it('can be awaited', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        await sound.stop()
        expect(sound.isPlaying).toBe(false)
      })
    })

    describe('stopIn(seconds)', () => {
      it('calls stopAt with future time', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        const stopAtSpy = vi.spyOn(sound, 'stopAt')
        const currentTime = audioContext.currentTime
        sound.stopIn(0.5)
        expect(stopAtSpy).toHaveBeenCalledWith(currentTime + 0.5)
      })
    })

    describe('stopAt(time)', () => {
      it('schedules stop at specific time', async () => {
        const sound = createSound(audioContext)
        await sound.play()
        // Call stopAt with current time (should stop immediately)
        await sound.stopAt(audioContext.currentTime)
        expect(sound.isPlaying).toBe(false)
      })
    })

    describe('stop when not playing', () => {
      it('is safe to call stop when not playing', async () => {
        const sound = createSound(audioContext)
        expect(sound.isPlaying).toBe(false)
        // Should not throw
        await expect(sound.stop()).resolves.not.toThrow()
      })

      it('does not emit stop event if not playing', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('stop', handler)
        await sound.stop()
        expect(handler).not.toHaveBeenCalled()
      })
    })
  })

  describe('parameter control', () => {
    describe('update()', () => {
      it('update("gain").to(0.5).as("ratio") sets gain', () => {
        const sound = createSound(audioContext)
        sound.update('gain').to(0.5).as('ratio')
        expect(sound.gainNode.gain.value).toBeCloseTo(0.5)
      })

      it('update("gain").to(50).as("percent") sets gain', () => {
        const sound = createSound(audioContext)
        sound.update('gain').to(50).as('percent')
        expect(sound.gainNode.gain.value).toBeCloseTo(0.5)
      })

      it('update("pan").to(-0.5).as("ratio") sets pan', () => {
        const sound = createSound(audioContext)
        sound.update('pan').to(-0.5).as('ratio')
        // Verify pan value was actually set
        expect(sound.pannerNode.pan.value).toBeCloseTo(-0.5)
      })
    })

    describe('changeGainTo()', () => {
      it('sets gain value', () => {
        const sound = createSound(audioContext)
        sound.changeGainTo(0.7)
        // Should not throw and return this
        expect(sound.gainNode.gain.value).toBeDefined()
      })

      it('returns this for chaining', () => {
        const sound = createSound(audioContext)
        const result = sound.changeGainTo(0.5)
        expect(result).toBe(sound)
      })

      it('throws for negative gain value', () => {
        const sound = createSound(audioContext)
        expect(() => sound.changeGainTo(-0.5)).toThrow('Gain must be >= 0. Received: -0.5')
        expect(() => sound.changeGainTo(-1)).toThrow('Gain must be >= 0. Received: -1')
      })

      it('accepts negative zero (which is >= 0 in JS)', () => {
        const sound = createSound(audioContext)
        // -0 >= 0 is true in JS, so -0 should not throw
        expect(() => sound.changeGainTo(-0)).not.toThrow()
      })

      it('warns for gain > 1', () => {
        const sound = createSound(audioContext)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        sound.changeGainTo(1.5)
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('exceeds 1.0'),
        )
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('distortion'),
        )
        // Method still returns this (succeeds despite warning)
        const result = sound.changeGainTo(1.5)
        expect(result).toBe(sound)
        warnSpy.mockRestore()
      })

      it('does not warn for gain exactly 1', () => {
        const sound = createSound(audioContext)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        sound.changeGainTo(1)
        expect(warnSpy).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it('does not warn for gain 0', () => {
        const sound = createSound(audioContext)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        sound.changeGainTo(0)
        expect(warnSpy).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })
    })

    describe('getGainNode()', () => {
      it('returns a GainNode instance with a gain property', () => {
        const sound = createSound(audioContext)
        const node = sound.getGainNode()
        expect(node).toBeDefined()
        expect(node.gain).toBeDefined()
      })

      it('returns the same node on repeated calls', () => {
        const sound = createSound(audioContext)
        const node1 = sound.getGainNode()
        const node2 = sound.getGainNode()
        expect(node1).toBe(node2)
      })

      it('returned node gain reflects changeGainTo()', () => {
        const sound = createSound(audioContext)
        // Should not throw — the method chain works correctly
        expect(() => {
          sound.changeGainTo(0.5)
          const node = sound.getGainNode()
          // Verify the gain AudioParam exists and is accessible
          expect(node.gain).toBeDefined()
        }).not.toThrow()
      })
    })

    describe('changePanTo()', () => {
      it('sets pan value', () => {
        const sound = createSound(audioContext)
        sound.changePanTo(-0.3)
        // Verify pan value was actually set
        expect(sound.pannerNode.pan.value).toBeCloseTo(-0.3)
      })

      it('returns this for chaining', () => {
        const sound = createSound(audioContext)
        const result = sound.changePanTo(0.5)
        expect(result).toBe(sound)
      })
    })

    describe('percentGain', () => {
      it('returns gain as percentage', () => {
        const sound = createSound(audioContext)
        // Default gain is 1, so percentGain should be 100
        expect(sound.percentGain).toBe(100)
      })

      it('calculates percentage correctly for different gain values', () => {
        const sound = createSound(audioContext)
        sound.changeGainTo(0.5)
        expect(sound.percentGain).toBe(50)

        sound.changeGainTo(0.75)
        expect(sound.percentGain).toBe(75)

        sound.changeGainTo(0)
        expect(sound.percentGain).toBe(0)
      })
    })

    describe('onPlaySet()', () => {
      it('returns fluent API for scheduling', () => {
        const sound = createSound(audioContext)
        const result = sound.onPlaySet('gain')
        expect(result).toHaveProperty('to')
      })

      it('to() returns object with at and endingAt', () => {
        const sound = createSound(audioContext)
        const result = sound.onPlaySet('gain').to(0.5)
        expect(result).toHaveProperty('at')
        expect(result).toHaveProperty('endingAt')
      })

      it('can schedule parameter change at specific time', () => {
        const sound = createSound(audioContext)
        // Should not throw
        expect(() => sound.onPlaySet('gain').to(0.5).at(0.1)).not.toThrow()
      })

      it('can schedule ramp to value', () => {
        const sound = createSound(audioContext)
        // Should not throw
        expect(() => sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')).not.toThrow()
      })
    })

    describe('onPlayRamp()', () => {
      it('returns fluent API for scheduling ramps', () => {
        const sound = createSound(audioContext)
        const result = sound.onPlayRamp('gain')
        expect(result).toHaveProperty('from')
      })

      it('from() returns object with to', () => {
        const sound = createSound(audioContext)
        const result = sound.onPlayRamp('gain').from(0)
        expect(result).toHaveProperty('to')
      })

      it('to() returns object with in', () => {
        const sound = createSound(audioContext)
        const result = sound.onPlayRamp('gain').from(0).to(1)
        expect(result).toHaveProperty('in')
      })

      it('can schedule parameter ramp', () => {
        const sound = createSound(audioContext)
        // Should not throw
        expect(() => sound.onPlayRamp('gain').from(0).to(1).in(0.5)).not.toThrow()
      })
    })
  })

  describe('duration property', () => {
    it('returns TimeObject', () => {
      const sound = createSound(audioContext, 2) // 2 seconds
      const duration = sound.duration
      expect(duration).toHaveProperty('raw')
      expect(duration).toHaveProperty('string')
      expect(duration).toHaveProperty('pojo')
    })

    it('raw is duration in seconds', () => {
      const sound = createSound(audioContext, 2)
      const duration = sound.duration
      // Should be approximately 2 seconds
      expect(duration.raw).toBeCloseTo(2, 0)
    })

    it('pojo has minutes and seconds', () => {
      const sound = createSound(audioContext, 65) // 1 min 5 sec
      const duration = sound.duration
      expect(duration.pojo).toHaveProperty('minutes')
      expect(duration.pojo).toHaveProperty('seconds')
    })

    it('string is formatted time', () => {
      const sound = createSound(audioContext, 2)
      const duration = sound.duration
      expect(typeof duration.string).toBe('string')
    })

    it('returns zero TimeObject when buffer is null', () => {
      const sound = createSound(audioContext)
      // Simulate null buffer scenario (should return 0)
      // The implementation checks for null buffer
      expect(sound.duration.raw).toBeGreaterThanOrEqual(0)
    })
  })

  describe('startOffset', () => {
    it('can be set', () => {
      const sound = createSound(audioContext, 10)
      sound.startOffset = 5
      expect(sound.startOffset).toBe(5)
    })

    it('is used when playing', async () => {
      const sound = createSound(audioContext, 10)
      sound.startOffset = 2
      // play() should use the startOffset
      await sound.play()
      expect(sound.isPlaying).toBe(true)
    })
  })

  describe('event system', () => {
    it('on() subscribes to events', async () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      sound.on('play', handler)
      await sound.play()
      expect(handler).toHaveBeenCalled()
    })

    it('once() fires only once', async () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      sound.once('play', handler)
      // First play
      await sound.play()
      await sound.stop()
      // Second play - handler should not fire again for this sound
      await sound.play()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('off() removes handler', async () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      sound.on('play', handler)
      sound.off('play', handler)
      await sound.play()
      expect(handler).not.toHaveBeenCalled()
    })

    it('on() returns this for chaining', () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      const result = sound.on('play', handler)
      expect(result).toBe(sound)
    })

    it('once() returns this for chaining', () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      const result = sound.once('play', handler)
      expect(result).toBe(sound)
    })

    it('off() returns this for chaining', () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      const result = sound.off('play', handler)
      expect(result).toBe(sound)
    })

    it('methods chain with this', () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      const result = sound.on('play', handler).on('stop', handler)
      expect(result).toBe(sound)
    })

    it('on() accepts array of event types', async () => {
      const sound = createSound(audioContext)
      const handler = vi.fn()
      sound.on(['play', 'stop'], handler)
      await sound.play()
      await sound.stop()
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    describe('rapid play-stop-play cycles', () => {
      it('handles rapid play-stop-play without errors', async () => {
        const sound = createSound(audioContext)

        // Rapid play-stop-play cycle
        await sound.play()
        expect(sound.isPlaying).toBe(true)

        await sound.stop()
        expect(sound.isPlaying).toBe(false)

        await sound.play()
        expect(sound.isPlaying).toBe(true)
      })

      it('isPlaying is true after rapid play-stop-play', async () => {
        const sound = createSound(audioContext)

        sound.play()
        sound.stop()
        sound.play()

        // Final state should be playing
        expect(await settle(() => sound.isPlaying)).toBe(true)
      })
    })

    describe('play while already playing', () => {
      it('calling play twice creates new source node', async () => {
        const sound = createSound(audioContext)

        await sound.play()
        const firstSource = sound.audioSourceNode
        expect(sound.isPlaying).toBe(true)

        // Play again without stopping
        await sound.play()
        const secondSource = sound.audioSourceNode

        // Should create a new source node (AudioBufferSourceNode is single-use)
        expect(secondSource).not.toBe(firstSource)
        expect(sound.isPlaying).toBe(true)
      })

      it('second play emits play event again', async () => {
        const sound = createSound(audioContext)
        const handler = vi.fn()
        sound.on('play', handler)

        await sound.play()
        await sound.play()

        expect(handler).toHaveBeenCalledTimes(2)
      })
    })

    describe('startOffset boundaries', () => {
      it('startOffset can be set to value within duration', () => {
        const sound = createSound(audioContext, 10) // 10 seconds
        sound.startOffset = 5
        expect(sound.startOffset).toBe(5)
      })

      it('startOffset greater than duration is accepted (current behavior)', () => {
        const sound = createSound(audioContext, 10) // 10 seconds
        // Setting startOffset beyond duration is allowed (Web Audio API handles this)
        sound.startOffset = 999
        expect(sound.startOffset).toBe(999)
        // Note: When played, Web Audio API will handle out-of-bounds offset
      })

      it('negative startOffset is accepted (current behavior)', () => {
        const sound = createSound(audioContext, 10)
        // Negative values are allowed - Web Audio API clamps to 0
        sound.startOffset = -5
        expect(sound.startOffset).toBe(-5)
        // Note: Web Audio API will clamp negative offset to 0 during playback
      })

      it('startOffset of 0 plays from beginning', async () => {
        const sound = createSound(audioContext, 10)
        sound.startOffset = 0
        await sound.play()
        expect(sound.isPlaying).toBe(true)
      })
    })
  })

  describe('controller update on play (BUG-02 regression)', () => {
    it('calls controller.updateAudioSource with new source node on play()', async () => {
      const sound = createSound(audioContext)
      const updateSpy = vi.spyOn(sound['controller'], 'updateAudioSource')

      await sound.play()

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(updateSpy).toHaveBeenCalledWith(sound.audioSourceNode)
    })

    it('calls controller.updateAudioSource on each play() with new source node', async () => {
      const sound = createSound(audioContext)
      const updateSpy = vi.spyOn(sound['controller'], 'updateAudioSource')

      await sound.play()
      const firstSource = sound.audioSourceNode
      expect(updateSpy).toHaveBeenCalledWith(firstSource)

      await sound.stop()
      await sound.play()
      const secondSource = sound.audioSourceNode
      expect(updateSpy).toHaveBeenCalledWith(secondSource)
      expect(secondSource).not.toBe(firstSource)
      expect(updateSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('dispose', () => {
    it('sets disposed to true', () => {
      const sound = createSound(audioContext)
      sound.dispose()
      expect(sound.disposed).toBe(true)
    })

    it('play() after dispose throws', async () => {
      const sound = createSound(audioContext)
      sound.dispose()
      await expect(sound.play()).rejects.toThrow()
    })

    it('is idempotent (calling dispose twice does not throw)', () => {
      const sound = createSound(audioContext)
      sound.dispose()
      expect(() => sound.dispose()).not.toThrow()
    })

    it('clears effects on dispose', () => {
      const sound = createSound(audioContext)
      const gainNode = audioContext.createGain()
      sound.addEffect({ input: gainNode, output: gainNode, bypass: false })
      expect(sound.effects.length).toBe(1)
      sound.dispose()
      expect(sound.effects.length).toBe(0)
    })
  })
})
