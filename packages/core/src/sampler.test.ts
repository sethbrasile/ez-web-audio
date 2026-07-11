import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sampler } from '@/sampler'

/**
 * Create a mock sound that satisfies Playable & Connectable interfaces
 */
function createMockSound(): Playable & Connectable {
  const mockAudioContext = new Mock() as unknown as AudioContext
  return {
    play: vi.fn(),
    playIn: vi.fn(),
    playAt: vi.fn(),
    stop: vi.fn(),
    changeGainTo: vi.fn(),
    changePanTo: vi.fn(),
    get isPlaying() { return false },
    get audioContext() { return mockAudioContext },
  }
}

describe('sampler', () => {
  describe('creation', () => {
    it('creates Sampler from array of sounds', () => {
      const sounds = [createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      expect(sampler).toBeDefined()
    })

    it('accepts optional name in options', () => {
      const sounds = [createMockSound()]
      const sampler = new Sampler(sounds, { name: 'kick' })
      expect(sampler.name).toBe('kick')
    })

    it('has empty string name when no name provided', () => {
      const sounds = [createMockSound()]
      const sampler = new Sampler(sounds)
      expect(sampler.name).toBe('')
    })

    it('default gain is 1', () => {
      const sounds = [createMockSound()]
      const sampler = new Sampler(sounds)
      expect(sampler.gain).toBe(1)
    })

    it('default pan is 0', () => {
      const sounds = [createMockSound()]
      const sampler = new Sampler(sounds)
      expect(sampler.pan).toBe(0)
    })
  })

  describe('gain/pan validation (R1#1 — validated accessors, not raw mutable fields)', () => {
    it('gain setter throws a ValidationError for negative values, same rule as BaseSound.changeGainTo', () => {
      const sampler = new Sampler([createMockSound()])
      expect(() => (sampler.gain = -1)).toThrow('Gain must be >= 0. Received: -1')
    })

    it('gain setter warns (does not throw) for values above 1', () => {
      const sampler = new Sampler([createMockSound()])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      sampler.gain = 1.5
      expect(sampler.gain).toBe(1.5)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('exceeds 1.0'))
      warnSpy.mockRestore()
    })

    it('a rejected gain assignment leaves the previous value in place', () => {
      const sampler = new Sampler([createMockSound()])
      sampler.gain = 0.5
      expect(() => (sampler.gain = -1)).toThrow()
      expect(sampler.gain).toBe(0.5)
    })

    it('pan setter warns (does not throw) for values outside [-1, 1]', () => {
      const sampler = new Sampler([createMockSound()])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => (sampler.pan = 2)).not.toThrow()
      expect(sampler.pan).toBe(2)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('outside the [-1, 1] range'))
      warnSpy.mockRestore()
    })

    it('changeGainTo/changePanTo are equivalent to the property setters and return this for chaining', () => {
      const sampler = new Sampler([createMockSound()])
      const result = sampler.changeGainTo(0.4).changePanTo(-0.3)
      expect(sampler.gain).toBe(0.4)
      expect(sampler.pan).toBe(-0.3)
      expect(result).toBe(sampler)
    })

    it('changeGainTo validates identically to assigning .gain directly', () => {
      const sampler = new Sampler([createMockSound()])
      expect(() => sampler.changeGainTo(-1)).toThrow('Gain must be >= 0. Received: -1')
    })
  })

  describe('round-robin behavior', () => {
    let sounds: (Playable & Connectable)[]
    let sampler: Sampler

    beforeEach(() => {
      sounds = [createMockSound(), createMockSound(), createMockSound()]
      sampler = new Sampler(sounds)
    })

    it('play() calls play on first sound initially', () => {
      sampler.play()
      expect(sounds[0].play).toHaveBeenCalledTimes(1)
      expect(sounds[1].play).not.toHaveBeenCalled()
      expect(sounds[2].play).not.toHaveBeenCalled()
    })

    it('second play() calls play on second sound', () => {
      sampler.play()
      sampler.play()
      expect(sounds[0].play).toHaveBeenCalledTimes(1)
      expect(sounds[1].play).toHaveBeenCalledTimes(1)
      expect(sounds[2].play).not.toHaveBeenCalled()
    })

    it('third play() calls play on third sound', () => {
      sampler.play()
      sampler.play()
      sampler.play()
      expect(sounds[0].play).toHaveBeenCalledTimes(1)
      expect(sounds[1].play).toHaveBeenCalledTimes(1)
      expect(sounds[2].play).toHaveBeenCalledTimes(1)
    })

    it('loops back to first sound after exhausting all sounds', () => {
      sampler.play() // sound 0
      sampler.play() // sound 1
      sampler.play() // sound 2
      sampler.play() // sound 0 again
      expect(sounds[0].play).toHaveBeenCalledTimes(2)
      expect(sounds[1].play).toHaveBeenCalledTimes(1)
      expect(sounds[2].play).toHaveBeenCalledTimes(1)
    })

    it('continues round-robin through multiple cycles', () => {
      // 6 plays = 2 full cycles
      for (let i = 0; i < 6; i++) {
        sampler.play()
      }
      expect(sounds[0].play).toHaveBeenCalledTimes(2)
      expect(sounds[1].play).toHaveBeenCalledTimes(2)
      expect(sounds[2].play).toHaveBeenCalledTimes(2)
    })

    it('works with single sound (always plays same sound)', () => {
      const singleSound = createMockSound()
      const singleSampler = new Sampler([singleSound])

      singleSampler.play()
      singleSampler.play()
      singleSampler.play()

      expect(singleSound.play).toHaveBeenCalledTimes(3)
    })

    it('works with two sounds', () => {
      const twoSounds = [createMockSound(), createMockSound()]
      const twoSampler = new Sampler(twoSounds)

      twoSampler.play() // sound 0
      twoSampler.play() // sound 1
      twoSampler.play() // sound 0
      twoSampler.play() // sound 1

      expect(twoSounds[0].play).toHaveBeenCalledTimes(2)
      expect(twoSounds[1].play).toHaveBeenCalledTimes(2)
    })
  })

  describe('play methods', () => {
    let sounds: (Playable & Connectable)[]
    let sampler: Sampler

    beforeEach(() => {
      sounds = [createMockSound(), createMockSound()]
      sampler = new Sampler(sounds)
    })

    it('play() immediately plays next sound', () => {
      sampler.play()
      expect(sounds[0].play).toHaveBeenCalled()
    })

    it('playIn(seconds) schedules next sound', () => {
      sampler.playIn(2.5)
      expect(sounds[0].playIn).toHaveBeenCalledWith(2.5)
    })

    it('playAt(time) schedules at specific time', () => {
      sampler.playAt(10.0)
      expect(sounds[0].playAt).toHaveBeenCalledWith(10.0)
    })

    it('playIn advances the iterator', () => {
      sampler.playIn(1.0)
      sampler.playIn(2.0)
      expect(sounds[0].playIn).toHaveBeenCalledTimes(1)
      expect(sounds[1].playIn).toHaveBeenCalledTimes(1)
    })

    it('playAt advances the iterator', () => {
      sampler.playAt(5.0)
      sampler.playAt(6.0)
      expect(sounds[0].playAt).toHaveBeenCalledTimes(1)
      expect(sounds[1].playAt).toHaveBeenCalledTimes(1)
    })

    it('mixed play methods all advance iterator correctly', () => {
      sampler.play() // sound 0
      sampler.playIn(1) // sound 1
      sampler.playAt(2) // sound 0 again
      sampler.play() // sound 1 again

      expect(sounds[0].play).toHaveBeenCalledTimes(1)
      expect(sounds[0].playAt).toHaveBeenCalledTimes(1)
      expect(sounds[1].playIn).toHaveBeenCalledTimes(1)
      expect(sounds[1].play).toHaveBeenCalledTimes(1)
    })
  })

  describe('gain and pan control', () => {
    let sounds: (Playable & Connectable)[]
    let sampler: Sampler

    beforeEach(() => {
      sounds = [createMockSound(), createMockSound()]
      sampler = new Sampler(sounds)
    })

    it('setting gain applies to next played sound', () => {
      sampler.gain = 0.5
      sampler.play()
      expect(sounds[0].changeGainTo).toHaveBeenCalledWith(0.5)
    })

    it('setting pan applies to next played sound', () => {
      sampler.pan = -1
      sampler.play()
      expect(sounds[0].changePanTo).toHaveBeenCalledWith(-1)
    })

    it('gain is applied via changeGainTo before play', () => {
      const sound = createMockSound()
      const callOrder: string[] = []

      sound.changeGainTo = vi.fn(() => {
        callOrder.push('gain')
      })
      sound.play = vi.fn(() => {
        callOrder.push('play')
      })

      const s = new Sampler([sound])
      s.gain = 0.7
      s.play()

      expect(callOrder).toEqual(['gain', 'play'])
    })

    it('pan is applied via changePanTo before play', () => {
      const sound = createMockSound()
      const callOrder: string[] = []

      sound.changePanTo = vi.fn(() => {
        callOrder.push('pan')
      })
      sound.play = vi.fn(() => {
        callOrder.push('play')
      })

      const s = new Sampler([sound])
      s.pan = 0.5
      s.play()

      expect(callOrder).toEqual(['pan', 'play'])
    })

    it('both gain and pan applied to each sound in round-robin', () => {
      sampler.gain = 0.3
      sampler.pan = 0.8

      sampler.play() // sound 0
      sampler.play() // sound 1

      expect(sounds[0].changeGainTo).toHaveBeenCalledWith(0.3)
      expect(sounds[0].changePanTo).toHaveBeenCalledWith(0.8)
      expect(sounds[1].changeGainTo).toHaveBeenCalledWith(0.3)
      expect(sounds[1].changePanTo).toHaveBeenCalledWith(0.8)
    })

    it('changing gain mid-playback affects subsequent sounds', () => {
      sampler.gain = 1.0
      sampler.play() // sound 0 at gain 1.0

      sampler.gain = 0.2
      sampler.play() // sound 1 at gain 0.2

      expect(sounds[0].changeGainTo).toHaveBeenCalledWith(1.0)
      expect(sounds[1].changeGainTo).toHaveBeenCalledWith(0.2)
    })

    it('changing pan mid-playback affects subsequent sounds', () => {
      sampler.pan = -0.5
      sampler.play() // sound 0 at pan -0.5

      sampler.pan = 0.5
      sampler.play() // sound 1 at pan 0.5

      expect(sounds[0].changePanTo).toHaveBeenCalledWith(-0.5)
      expect(sounds[1].changePanTo).toHaveBeenCalledWith(0.5)
    })

    it('gain and pan applied for playIn method', () => {
      sampler.gain = 0.6
      sampler.pan = -0.3
      sampler.playIn(1.0)

      expect(sounds[0].changeGainTo).toHaveBeenCalledWith(0.6)
      expect(sounds[0].changePanTo).toHaveBeenCalledWith(-0.3)
    })

    it('gain and pan applied for playAt method', () => {
      sampler.gain = 0.4
      sampler.pan = 0.9
      sampler.playAt(5.0)

      expect(sounds[0].changeGainTo).toHaveBeenCalledWith(0.4)
      expect(sounds[0].changePanTo).toHaveBeenCalledWith(0.9)
    })
  })

  describe('velocity control', () => {
    it('play() scales sound gain by velocity', () => {
      const sound = createMockSound()
      const sampler = new Sampler([sound])
      sampler.gain = 0.8
      sampler.play(0.5)
      expect(sound.changeGainTo).toHaveBeenCalledWith(0.4)
    })

    it('playIn() scales sound gain by velocity', () => {
      const sound = createMockSound()
      const sampler = new Sampler([sound])
      sampler.gain = 0.8
      sampler.playIn(0.5, 0.5)
      expect(sound.changeGainTo).toHaveBeenCalledWith(0.4)
    })

    it('playAt() scales sound gain by velocity', () => {
      const sound = createMockSound()
      const sampler = new Sampler([sound])
      sampler.gain = 0.8
      sampler.playAt(1.0, 0.5)
      expect(sound.changeGainTo).toHaveBeenCalledWith(0.4)
    })

    it('velocity defaults to 1 when omitted (backward compat)', () => {
      const sound = createMockSound()
      const sampler = new Sampler([sound])
      sampler.gain = 0.7
      sampler.play()
      expect(sound.changeGainTo).toHaveBeenCalledWith(0.7)
    })
  })

  describe('edge cases', () => {
    it('throws descriptive error when play() called with empty sounds', () => {
      const sampler = new Sampler([])
      expect(() => sampler.play()).toThrow('Sampler has no sounds. Add sounds before calling play().')
    })

    it('throws descriptive error when playIn() called with empty sounds', () => {
      const sampler = new Sampler([])
      expect(() => sampler.playIn(1.0)).toThrow('Sampler has no sounds. Add sounds before calling play().')
    })

    it('throws descriptive error when playAt() called with empty sounds', () => {
      const sampler = new Sampler([])
      expect(() => sampler.playAt(5.0)).toThrow('Sampler has no sounds. Add sounds before calling play().')
    })

    it('single sound cycles correctly over many iterations', () => {
      const sound = createMockSound()
      const sampler = new Sampler([sound])

      for (let i = 0; i < 100; i++) {
        sampler.play()
      }

      expect(sound.play).toHaveBeenCalledTimes(100)
    })

    it('sounds array preserves insertion order for round-robin', () => {
      const sounds = [createMockSound(), createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      const playOrder: number[] = []

      sounds.forEach((sound, index) => {
        sound.play = vi.fn(() => {
          playOrder.push(index)
        })
      })

      sampler.play()
      sampler.play()
      sampler.play()

      expect(playOrder).toEqual([0, 1, 2])
    })

    it('can create sampler with any Playable & Connectable', () => {
      // Verify the interface contract - custom implementation works
      const customPlayable: Playable & Connectable = {
        play: vi.fn(),
        playIn: vi.fn(),
        playAt: vi.fn(),
        stop: vi.fn(),
        changeGainTo: vi.fn(),
        changePanTo: vi.fn(),
        isPlaying: false,
        audioContext: new Mock() as unknown as AudioContext,
      }

      const sampler = new Sampler([customPlayable])
      sampler.play()

      expect(customPlayable.play).toHaveBeenCalled()
    })
  })

  describe('stop behavior', () => {
    it('has no stop() method (one-shot sounds complete naturally)', () => {
      const sounds = [createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      // Sampler intentionally has no stop() because it delegates to one-shot
      // Sound.play() calls that complete naturally
      expect((sampler as any).stop).toBeUndefined()
    })

    it('individual sounds can be stopped via getSounds()', () => {
      const sounds = [createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      const retrieved = sampler.getSounds()
      // Each sound in the sampler has its own stop method
      retrieved.forEach((sound) => {
        expect(typeof sound.stop).toBe('function')
      })
    })
  })

  describe('getSounds', () => {
    it('returns all sounds in the sampler', () => {
      const sounds = [createMockSound(), createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      expect(sampler.getSounds()).toHaveLength(3)
    })

    it('returns an array, not a Set', () => {
      const sounds = [createMockSound()]
      const sampler = new Sampler(sounds)
      expect(Array.isArray(sampler.getSounds())).toBe(true)
    })

    it('returns a copy that does not mutate internal state', () => {
      const sounds = [createMockSound(), createMockSound()]
      const sampler = new Sampler(sounds)
      const result = sampler.getSounds()
      expect(result).toHaveLength(2)
      ;(result as any[]).length = 0
      expect(sampler.getSounds()).toHaveLength(2)
    })
  })

  describe('error handling (SAFE-01)', () => {
    it('play() does not throw when underlying sound.play() rejects', () => {
      const sound = createMockSound()
      sound.play = vi.fn().mockRejectedValue(new Error('context closed'))
      const sampler = new Sampler([sound])

      // Should not throw
      expect(() => sampler.play()).not.toThrow()
    })

    it('playAt() does not throw when underlying sound.playAt() rejects', () => {
      const sound = createMockSound()
      sound.playAt = vi.fn().mockRejectedValue(new Error('context closed'))
      const sampler = new Sampler([sound])

      // Should not throw
      expect(() => sampler.playAt(1.0)).not.toThrow()
    })
  })
})
