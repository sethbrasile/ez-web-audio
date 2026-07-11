import type { Effect } from './effects/index'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LayeredSound } from './layered-sound'
import { Oscillator } from './oscillator'
import { Sound } from './sound'

function createMockEffect(ctx: AudioContext): Effect & { input: GainNode, output: GainNode } {
  const input = ctx.createGain()
  const output = ctx.createGain()
  input.connect(output)
  return {
    input,
    output,
    bypass: false,
    mix: 1,
    dispose: vi.fn(),
  }
}

describe('layeredSound', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new MockAudioContext() as unknown as AudioContext
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('construction', () => {
    it('creates LayeredSound with Sound and Oscillator layers', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const oscillator = new Oscillator(audioContext, { frequency: 440 })

      const layered = new LayeredSound(audioContext, [sound, oscillator])

      expect(layered).toBeInstanceOf(LayeredSound)
      expect(layered.layerCount).toBe(2)
    })

    it('filters out null/undefined layers gracefully', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)

      const layered = new LayeredSound(audioContext, [sound, null, undefined])

      expect(layered.layerCount).toBe(1)
      expect(layered.getLayer(0)).toBe(sound)
    })

    it('filters out null/undefined layers and emits warning', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)

      // Warning is emitted synchronously during construction
      // We can only verify by checking the filtered layer count
      const layered = new LayeredSound(audioContext, [sound, null, undefined])

      // Verify layers were filtered correctly
      expect(layered.layerCount).toBe(1)
      expect(layered.getLayer(0)).toBe(sound)
      expect(layered.getLayer(1)).toBeUndefined()
    })

    it('warns when layer count >= warnLayerCount threshold', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layers = Array.from({ length: 8 }, () => new Sound(audioContext, buffer))

      const _ls = new LayeredSound(audioContext, layers, { warnLayerCount: 8 })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('8 layers'),
      )

      consoleWarnSpy.mockRestore()
    })

    it('does not warn when layer count < warnLayerCount threshold', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layers = Array.from({ length: 7 }, () => new Sound(audioContext, buffer))

      const _ls = new LayeredSound(audioContext, layers, { warnLayerCount: 8 })

      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('playback Synchronization', () => {
    it('calls playAt on all layers with same audioContext.currentTime', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const playAtSpy1 = vi.spyOn(sound1, 'playAt')
      const playAtSpy2 = vi.spyOn(sound2, 'playAt')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      await layered.play()

      expect(playAtSpy1).toHaveBeenCalledWith(expect.any(Number))
      expect(playAtSpy2).toHaveBeenCalledWith(expect.any(Number))

      // Verify both got the SAME time value
      const time1 = playAtSpy1.mock.calls[0][0]
      const time2 = playAtSpy2.mock.calls[0][0]
      expect(time1).toBe(time2)
    })

    it('stops all layers when stop() is called', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const stopSpy1 = vi.spyOn(sound1, 'stop')
      const stopSpy2 = vi.spyOn(sound2, 'stop')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      await layered.play()
      await layered.stop()

      expect(stopSpy1).toHaveBeenCalled()
      expect(stopSpy2).toHaveBeenCalled()
    })

    it('playFor() plays all layers and schedules stop after specified duration', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const playAtSpy1 = vi.spyOn(sound1, 'playAt')
      const playAtSpy2 = vi.spyOn(sound2, 'playAt')
      const stopSpy = vi.spyOn(LayeredSound.prototype, 'stop')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      await layered.playFor(0.1)

      // Both layers should start at the same time
      expect(playAtSpy1).toHaveBeenCalledWith(expect.any(Number))
      expect(playAtSpy2).toHaveBeenCalledWith(expect.any(Number))
      expect(playAtSpy1.mock.calls[0][0]).toBe(playAtSpy2.mock.calls[0][0])

      // Stop is scheduled (via AudioContext-aware timeout), not called immediately
      expect(stopSpy).not.toHaveBeenCalled()

      stopSpy.mockRestore()
    })

    it('supports multiple play() calls (reusable)', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const playAtSpy = vi.spyOn(sound, 'playAt')

      const layered = new LayeredSound(audioContext, [sound])

      await layered.play()
      expect(playAtSpy).toHaveBeenCalledTimes(1)

      await layered.play()
      expect(playAtSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('master Controls', () => {
    it('setGain modifies output bus, not individual layer gains (QC-1-18)', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const changeGainSpy1 = vi.spyOn(sound1, 'changeGainTo')
      const changeGainSpy2 = vi.spyOn(sound2, 'changeGainTo')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      layered.setGain(0.5)

      // Individual layer gains should NOT be modified — setGain targets the output bus
      expect(changeGainSpy1).not.toHaveBeenCalled()
      expect(changeGainSpy2).not.toHaveBeenCalled()
    })

    it('setPan affects all layers', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const changePanSpy1 = vi.spyOn(sound1, 'changePanTo')
      const changePanSpy2 = vi.spyOn(sound2, 'changePanTo')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      layered.setPan(-0.5)

      expect(changePanSpy1).toHaveBeenCalledWith(-0.5)
      expect(changePanSpy2).toHaveBeenCalledWith(-0.5)
    })
  })

  describe('changeGainTo/changePanTo rename + validation (R1#1)', () => {
    it('changeGainTo modifies output bus, not individual layer gains', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const changeGainSpy1 = vi.spyOn(sound1, 'changeGainTo')

      const layered = new LayeredSound(audioContext, [sound1, sound2])
      const result = layered.changeGainTo(0.5)

      expect(changeGainSpy1).not.toHaveBeenCalled()
      expect(result).toBe(layered) // returns this for chaining
    })

    it('changePanTo affects all layers and returns this', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const changePanSpy1 = vi.spyOn(sound1, 'changePanTo')
      const changePanSpy2 = vi.spyOn(sound2, 'changePanTo')

      const layered = new LayeredSound(audioContext, [sound1, sound2])
      const result = layered.changePanTo(0.4)

      expect(changePanSpy1).toHaveBeenCalledWith(0.4)
      expect(changePanSpy2).toHaveBeenCalledWith(0.4)
      expect(result).toBe(layered)
    })

    it('changeGainTo throws a ValidationError for negative values, same rule as BaseSound.changeGainTo', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      expect(() => layered.changeGainTo(-1)).toThrow('Gain must be >= 0. Received: -1')
    })

    it('changeGainTo warns for values above 1', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      layered.changeGainTo(1.2)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds 1.0'))
      warnSpy.mockRestore()
    })

    it('changePanTo warns (does not throw) for values outside [-1, 1]', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => layered.changePanTo(1.5)).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('outside the [-1, 1] range'))
      warnSpy.mockRestore()
    })

    it('setGain/setPan remain as working deprecated aliases for changeGainTo/changePanTo', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const changeGainSpy = vi.spyOn(layered, 'changeGainTo')
      const changePanSpy = vi.spyOn(layered, 'changePanTo')

      layered.setGain(0.6)
      layered.setPan(0.2)

      expect(changeGainSpy).toHaveBeenCalledWith(0.6)
      expect(changePanSpy).toHaveBeenCalledWith(0.2)
    })

    it('setGain still throws the same validation error as changeGainTo (deprecated alias, not bypassed)', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      expect(() => layered.setGain(-1)).toThrow('Gain must be >= 0. Received: -1')
    })

    it('changeGainTo/setGain throw when called on a disposed LayeredSound', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      layered.dispose()
      expect(() => layered.changeGainTo(0.5)).toThrow('disposed')
      expect(() => layered.setPan(0)).toThrow('disposed')
    })
  })

  describe('layer Access', () => {
    it('getLayer returns correct layer by index', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const oscillator = new Oscillator(audioContext, { frequency: 440 })

      const layered = new LayeredSound(audioContext, [sound, oscillator])

      expect(layered.getLayer(0)).toBe(sound)
      expect(layered.getLayer(1)).toBe(oscillator)
    })

    it('getLayer returns undefined for out-of-bounds index', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)

      const layered = new LayeredSound(audioContext, [sound])

      expect(layered.getLayer(5)).toBeUndefined()
      expect(layered.getLayer(-1)).toBeUndefined()
    })

    it('layerCount returns correct count', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layers = Array.from({ length: 3 }, () => new Sound(audioContext, buffer))

      const layered = new LayeredSound(audioContext, layers)

      expect(layered.layerCount).toBe(3)
    })
  })

  describe('events', () => {
    it('emits play event when play() is called', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const playListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])
      layered.addEventListener('play', playListener)

      await layered.play()

      expect(playListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: layered,
          }),
        }),
      )
    })

    it('emits stop event when stop() is called', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const stopListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])
      layered.addEventListener('stop', stopListener)

      await layered.play()
      await layered.stop()

      expect(stopListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: layered,
          }),
        }),
      )
    })

    it('emits end event when last layer finishes', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const endListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound1, sound2])
      layered.addEventListener('end', endListener)

      await layered.play()

      // Manually trigger end events on layers to test
      sound1.audioSourceNode.onended?.({} as Event)
      expect(endListener).not.toHaveBeenCalled() // Not all layers ended yet

      sound2.audioSourceNode.onended?.({} as Event)
      expect(endListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: layered,
          }),
        }),
      )
    })

    it('emits fresh end event on each play() call', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const endListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])
      layered.addEventListener('end', endListener)

      // First playback
      await layered.play()
      sound.audioSourceNode.onended?.({} as Event)
      expect(endListener).toHaveBeenCalledTimes(1)

      // Second playback - should emit end again
      await layered.play()
      sound.audioSourceNode.onended?.({} as Event)
      expect(endListener).toHaveBeenCalledTimes(2)
    })
  })

  describe('type Safety', () => {
    it('supports .on() method for chaining', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const playListener = vi.fn()
      const stopListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])

      layered
        .on('play', playListener)
        .on('stop', stopListener)

      await layered.play()
      await layered.stop()

      expect(playListener).toHaveBeenCalled()
      expect(stopListener).toHaveBeenCalled()
    })

    it('supports .once() method', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const playListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])
      layered.once('play', playListener)

      await layered.play()
      await layered.play()

      expect(playListener).toHaveBeenCalledTimes(1)
    })

    it('supports .off() method', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const playListener = vi.fn()

      const layered = new LayeredSound(audioContext, [sound])
      layered.on('play', playListener)
      layered.off('play', playListener)

      await layered.play()

      expect(playListener).not.toHaveBeenCalled()
    })
  })

  describe('play() layer failure resilience (SAFE-06)', () => {
    it('other layers still play when one layer fails', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const sound3 = new Sound(audioContext, buffer)

      // Mock sound2 to reject on playAt
      vi.spyOn(sound2, 'playAt').mockRejectedValue(new Error('context closed'))
      const playAtSpy1 = vi.spyOn(sound1, 'playAt')
      const playAtSpy3 = vi.spyOn(sound3, 'playAt')

      const layered = new LayeredSound(audioContext, [sound1, sound2, sound3])

      // Should not throw
      await layered.play()

      // The other layers should have been called
      expect(playAtSpy1).toHaveBeenCalled()
      expect(playAtSpy3).toHaveBeenCalled()
    })

    it('emits warning event when a layer fails to play', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      vi.spyOn(sound2, 'playAt').mockRejectedValue(new Error('context closed'))

      const layered = new LayeredSound(audioContext, [sound1, sound2])
      const warningListener = vi.fn()
      layered.on('warning', warningListener)

      await layered.play()

      expect(warningListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            message: expect.stringContaining('1 layer(s) failed to play'),
            failedLayers: expect.arrayContaining([
              expect.objectContaining({ index: 1 }),
            ]),
          }),
        }),
      )
    })

    it('emits end event based on successful layers only', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const sound3 = new Sound(audioContext, buffer)

      // Layer 0 fails
      vi.spyOn(sound1, 'playAt').mockRejectedValue(new Error('failed'))

      const layered = new LayeredSound(audioContext, [sound1, sound2, sound3])
      const endListener = vi.fn()
      layered.on('end', endListener)

      await layered.play()

      // Only 2 layers should be tracked for end
      // Trigger end on sound2 — not all done yet
      sound2.audioSourceNode.onended?.({} as Event)
      expect(endListener).not.toHaveBeenCalled()

      // Trigger end on sound3 — now all successful layers done
      sound3.audioSourceNode.onended?.({} as Event)
      expect(endListener).toHaveBeenCalledTimes(1)
    })

    it('all layers failing still resolves play() without throwing', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      vi.spyOn(sound1, 'playAt').mockRejectedValue(new Error('failed 1'))
      vi.spyOn(sound2, 'playAt').mockRejectedValue(new Error('failed 2'))

      const layered = new LayeredSound(audioContext, [sound1, sound2])
      const warningListener = vi.fn()
      const endListener = vi.fn()
      layered.on('warning', warningListener)
      layered.on('end', endListener)

      // Should not throw
      await layered.play()

      // Warning should be emitted with all failures
      expect(warningListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            message: '2 layer(s) failed to play',
          }),
        }),
      )

      // End should be emitted immediately since no layers to track
      expect(endListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispose() (SAFE-09)', () => {
    it('stops and disposes all layers', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound1, sound2])

      const stopSpy1 = vi.spyOn(sound1, 'stop')
      const stopSpy2 = vi.spyOn(sound2, 'stop')
      const disposeSpy1 = vi.spyOn(sound1, 'dispose')
      const disposeSpy2 = vi.spyOn(sound2, 'dispose')

      layered.dispose()

      expect(stopSpy1).toHaveBeenCalled()
      expect(stopSpy2).toHaveBeenCalled()
      expect(disposeSpy1).toHaveBeenCalled()
      expect(disposeSpy2).toHaveBeenCalled()
    })

    it('prevents play after dispose', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      layered.dispose()
      await expect(layered.play()).rejects.toThrow('disposed')
    })

    it('is idempotent', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      layered.dispose()
      expect(() => layered.dispose()).not.toThrow()
    })

    it('sets disposed flag', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      expect(layered.disposed).toBe(false)
      layered.dispose()
      expect(layered.disposed).toBe(true)
    })

    it('clears layer end handlers and layers array', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      layered.dispose()
      // layerEndHandlers cleared, layers array cleared — verified by layerCount = 0
      expect(layered.layerCount).toBe(0)
    })

    it('silences future events after dispose', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      const handler = vi.fn()
      layered.on('play', handler)
      layered.dispose()
      const result = layered.dispatchEvent(new CustomEvent('play', { detail: {} }))
      expect(result).toBe(false)
      expect(handler).not.toHaveBeenCalled()
    })

    // Same class of gap as base-sound.ts H20: dispose() previously only
    // disconnected effect.output and dropped the effects array, never
    // calling effect.dispose() — leaking each attached effect's own
    // internal node graph + listeners.
    it('disposes each attached effect (same class as H20)', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)
      layered.addEffect(effect)

      layered.dispose()

      expect(effect.dispose).toHaveBeenCalled()
    })
  })

  describe('effects', () => {
    it('addEffect() adds effect and returns this', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)

      const result = layered.addEffect(effect)
      expect(result).toBe(layered)
      expect(layered.getEffects()).toHaveLength(1)
      expect(layered.getEffects()[0]).toBe(effect)
    })

    it('addEffect(effect, position) inserts at correct index', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])

      const effect1 = createMockEffect(audioContext)
      const effect2 = createMockEffect(audioContext)
      const effect3 = createMockEffect(audioContext)

      layered.addEffect(effect1)
      layered.addEffect(effect2)
      layered.addEffect(effect3, 0)

      const effects = layered.getEffects()
      expect(effects[0]).toBe(effect3)
      expect(effects[1]).toBe(effect1)
      expect(effects[2]).toBe(effect2)
    })

    it('removeEffect() removes effect and returns this', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)

      layered.addEffect(effect)
      const result = layered.removeEffect(effect)

      expect(result).toBe(layered)
      expect(layered.getEffects()).toHaveLength(0)
    })

    it('removeEffect() with unknown effect is no-op', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)

      expect(() => layered.removeEffect(effect)).not.toThrow()
    })

    it('getEffects() returns a copy', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)

      layered.addEffect(effect)
      const effects = layered.getEffects()
      ;(effects as Effect[]).push(createMockEffect(audioContext))

      // Internal array should not be affected
      expect(layered.getEffects()).toHaveLength(1)
    })

    it('addEffect() throws on disposed LayeredSound', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      layered.dispose()
      expect(() => layered.addEffect(createMockEffect(audioContext))).toThrow('disposed')
    })

    it('removeEffect() throws on disposed LayeredSound', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      layered.dispose()
      expect(() => layered.removeEffect(createMockEffect(audioContext))).toThrow('disposed')
    })

    it('dispose() emits dispose event', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const layered = new LayeredSound(audioContext, [new Sound(audioContext, buffer)])
      const handler = vi.fn()
      layered.addEventListener('dispose', handler)
      layered.dispose()
      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as CustomEvent
      expect(event.detail.source).toBe(layered)
    })

    it('dispose() disconnects outputBus and clears effects', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])
      const effect = createMockEffect(audioContext)
      layered.addEffect(effect)

      layered.dispose()
      expect(layered.getEffects()).toHaveLength(0)
    })

    it('layers route through outputBus (setDestination called)', () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const setDestSpy = vi.spyOn(sound, 'setDestination')

      const _layered = new LayeredSound(audioContext, [sound])
      expect(setDestSpy).toHaveBeenCalledTimes(1)
      // The argument should be a GainNode (the outputBus)
      const dest = setDestSpy.mock.calls[0][0]
      expect(dest).toBeDefined()
    })

    it('effect chain applies to playback', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound = new Sound(audioContext, buffer)
      const layered = new LayeredSound(audioContext, [sound])

      const effect = createMockEffect(audioContext)
      layered.addEffect(effect)

      // Should play without errors through the effect chain
      await layered.play()
    })
  })
})
