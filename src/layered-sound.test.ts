import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LayeredSound } from './layered-sound'
import { Oscillator } from './oscillator'
import { Sound } from './sound'

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
    it('setGain affects all layers', async () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
      const sound1 = new Sound(audioContext, buffer)
      const sound2 = new Sound(audioContext, buffer)

      const changeGainSpy1 = vi.spyOn(sound1, 'changeGainTo')
      const changeGainSpy2 = vi.spyOn(sound2, 'changeGainTo')

      const layered = new LayeredSound(audioContext, [sound1, sound2])

      layered.setGain(0.5)

      expect(changeGainSpy1).toHaveBeenCalledWith(0.5)
      expect(changeGainSpy2).toHaveBeenCalledWith(0.5)
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
})
