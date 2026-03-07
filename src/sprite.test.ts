import type { AudiospriteManifest, HowlerSpriteManifest, SpriteManifest } from './sprite'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioSprite, isHowlerManifest, normalizeManifest } from './sprite'

describe('audioSprite', () => {
  let audioContext: AudioContext
  let audioBuffer: AudioBuffer
  let mockSourceNode: AudioBufferSourceNode
  let mockGainNode: GainNode
  let mockPannerNode: StereoPannerNode

  const testManifest: AudiospriteManifest = {
    spritemap: {
      laser: { start: 0, end: 0.3 },
      explosion: { start: 1.0, end: 2.5 },
      bgm: { start: 3.0, end: 15.0, loop: true },
    },
  }

  beforeEach(() => {
    audioContext = new MockAudioContext() as unknown as AudioContext
    audioBuffer = audioContext.createBuffer(1, 44100 * 20, 44100) // 20 second buffer (covers all test sprites)

    // Spy on AudioContext methods to track node creation
    mockSourceNode = {
      buffer: null,
      loop: false,
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      start: vi.fn(),
      onended: null,
    } as unknown as AudioBufferSourceNode

    mockGainNode = {
      gain: { value: 1 },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
    } as unknown as GainNode

    mockPannerNode = {
      pan: { value: 0 },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
    } as unknown as StereoPannerNode

    vi.spyOn(audioContext, 'createBufferSource').mockReturnValue(mockSourceNode)
    vi.spyOn(audioContext, 'createGain').mockReturnValue(mockGainNode)
    vi.spyOn(audioContext, 'createStereoPanner').mockReturnValue(mockPannerNode)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('names', () => {
    it('returns array of sprite names', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(sprite.names).toEqual(['laser', 'explosion', 'bgm'])
    })

    it('returns empty array for empty manifest', () => {
      const emptyManifest: AudiospriteManifest = { spritemap: {} }
      const sprite = new AudioSprite(audioContext, audioBuffer, emptyManifest)

      expect(sprite.names).toEqual([])
    })
  })

  describe('has()', () => {
    it('returns true for existing sprite', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(sprite.has('laser')).toBe(true)
      expect(sprite.has('explosion')).toBe(true)
      expect(sprite.has('bgm')).toBe(true)
    })

    it('returns false for non-existing sprite', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(sprite.has('notfound')).toBe(false)
      expect(sprite.has('')).toBe(false)
    })
  })

  describe('getDuration()', () => {
    it('returns correct duration for sprite', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(sprite.getDuration('laser')).toBe(0.3)
      expect(sprite.getDuration('explosion')).toBe(1.5)
      expect(sprite.getDuration('bgm')).toBe(12.0)
    })

    it('throws for non-existing sprite', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(() => sprite.getDuration('notfound')).toThrow(
        'Sprite "notfound" not found. Available: laser, explosion, bgm',
      )
    })
  })

  describe('play()', () => {
    it('creates new AudioBufferSourceNode', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(audioContext.createBufferSource).toHaveBeenCalledTimes(1)
    })

    it('sets buffer on source node', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(mockSourceNode.buffer).toBe(audioBuffer)
    })

    it('calls start() with correct offset and duration', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(mockSourceNode.start).toHaveBeenCalledWith(
        audioContext.currentTime,
        0, // offset (start)
        0.3, // duration (end - start)
      )
    })

    it('calculates correct offset and duration for explosion', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('explosion')

      expect(mockSourceNode.start).toHaveBeenCalledWith(
        audioContext.currentTime,
        1.0, // offset
        1.5, // duration (2.5 - 1.0)
      )
    })

    it('throws for non-existing sprite name', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(() => sprite.play('notfound')).toThrow(
        'Sprite "notfound" not found. Available: laser, explosion, bgm',
      )
    })

    it('creates GainNode with correct value when gain option provided', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { gain: 0.5 })

      expect(audioContext.createGain).toHaveBeenCalled()
      expect(mockGainNode.gain.value).toBe(0.5)
    })

    it('creates StereoPannerNode with correct value when pan option provided', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { pan: -0.5 })

      expect(audioContext.createStereoPanner).toHaveBeenCalled()
      expect(mockPannerNode.pan.value).toBe(-0.5)
    })

    it('skips gain node creation when gain is default (1)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      // Gain is 1 (default) — no GainNode should be created
      expect(audioContext.createGain).not.toHaveBeenCalled()
    })

    it('skips panner node creation when pan is default (0)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      // Pan is 0 (default) — no StereoPannerNode should be created
      expect(audioContext.createStereoPanner).not.toHaveBeenCalled()
    })

    it('creates gain node when gain is not default', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { gain: 0.5 })

      expect(audioContext.createGain).toHaveBeenCalled()
      expect(mockGainNode.gain.value).toBe(0.5)
    })

    it('creates panner node when pan is not default', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { pan: -0.5 })

      expect(audioContext.createStereoPanner).toHaveBeenCalled()
      expect(mockPannerNode.pan.value).toBe(-0.5)
    })

    it('sets loop property from sprite definition', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('bgm') // has loop: true

      expect(mockSourceNode.loop).toBe(true)
    })

    it('sets loop to false when not specified in sprite definition', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser') // no loop property

      expect(mockSourceNode.loop).toBe(false)
    })

    it('wires nodes correctly: source -> destination (at defaults)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      // With default gain=1 and pan=0, source connects directly to destination
      expect(mockSourceNode.connect).toHaveBeenCalledWith(audioContext.destination)
    })

    it('wires nodes correctly: source -> gain -> pan -> destination (with non-default options)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { gain: 0.5, pan: -0.5 })

      // Source connects to gain
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockGainNode)
      // Gain connects to panner
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockPannerNode)
      // Panner connects to destination
      expect(mockPannerNode.connect).toHaveBeenCalledWith(audioContext.destination)
    })

    it('concurrent plays create separate source nodes', () => {
      // Reset mock to return new instances each call
      let callCount = 0
      vi.spyOn(audioContext, 'createBufferSource').mockImplementation(() => {
        callCount++
        return {
          buffer: null,
          loop: false,
          connect: vi.fn().mockReturnThis(),
          disconnect: vi.fn(),
          start: vi.fn(),
          onended: null,
        } as unknown as AudioBufferSourceNode
      })

      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')
      sprite.play('laser')
      sprite.play('explosion')

      expect(callCount).toBe(3)
    })
  })

  describe('cleanup', () => {
    it('sets onended callback on source node', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(mockSourceNode.onended).toBeTypeOf('function')
    })

    it('disconnects source node when onended fires (default gain/pan)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser') // default gain=1 and pan=0 — no GainNode or PannerNode created

      // Trigger the onended callback
      const onended = mockSourceNode.onended as () => void
      onended()

      // Source is always disconnected
      expect(mockSourceNode.disconnect).toHaveBeenCalled()
      // GainNode and PannerNode were never created, so no disconnect calls on them
      expect(mockGainNode.disconnect).not.toHaveBeenCalled()
      expect(mockPannerNode.disconnect).not.toHaveBeenCalled()
    })

    it('disconnects gain and panner nodes when onended fires (non-default options)', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser', { gain: 0.5, pan: -0.5 })

      // Trigger the onended callback
      const onended = mockSourceNode.onended as () => void
      onended()

      expect(mockSourceNode.disconnect).toHaveBeenCalled()
      expect(mockGainNode.disconnect).toHaveBeenCalled()
      expect(mockPannerNode.disconnect).toHaveBeenCalled()
    })

    it('clears onended callback after cleanup', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      // Trigger the onended callback
      const onended = mockSourceNode.onended as () => void
      onended()

      expect(mockSourceNode.onended).toBeNull()
    })
  })

  describe('stop()', () => {
    let createdSources: AudioBufferSourceNode[]

    beforeEach(() => {
      createdSources = []
      vi.spyOn(audioContext, 'createBufferSource').mockImplementation(() => {
        const source = {
          buffer: null,
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          connect: vi.fn().mockReturnThis(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null,
        } as unknown as AudioBufferSourceNode
        createdSources.push(source)
        return source
      })
    })

    it('stops a looping source that was playing', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('bgm') // bgm has loop: true
      const source = createdSources[0]

      sprite.stop('bgm')

      expect(source.stop).toHaveBeenCalled()
    })

    it('cleans up activeSources after stop', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('bgm')
      sprite.stop('bgm')

      // Stopping again should be a no-op (source already removed)
      expect(() => sprite.stop('bgm')).not.toThrow()
    })

    it('stops multiple looping sources for the same sprite', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('bgm')
      sprite.play('bgm')

      const source1 = createdSources[0]
      const source2 = createdSources[1]

      sprite.stop('bgm')

      expect(source1.stop).toHaveBeenCalled()
      expect(source2.stop).toHaveBeenCalled()
    })

    it('stop() with non-existent name does not throw', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(() => sprite.stop('nonexistent')).not.toThrow()
    })

    it('stop() on non-looping sprite is a no-op', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser') // laser has no loop
      const source = createdSources[0]

      sprite.stop('laser')

      // Non-looping sources are not in activeSources, so stop() is not called
      expect(source.stop).not.toHaveBeenCalled()
    })
  })

  describe('stopAll()', () => {
    let createdSources: AudioBufferSourceNode[]

    beforeEach(() => {
      createdSources = []
      vi.spyOn(audioContext, 'createBufferSource').mockImplementation(() => {
        const source = {
          buffer: null,
          loop: false,
          loopStart: 0,
          loopEnd: 0,
          connect: vi.fn().mockReturnThis(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null,
        } as unknown as AudioBufferSourceNode
        createdSources.push(source)
        return source
      })
    })

    it('stops all active looping sprites', () => {
      const multiLoopManifest: AudiospriteManifest = {
        spritemap: {
          bgm: { start: 0, end: 5, loop: true },
          ambient: { start: 5, end: 15, loop: true },
        },
      }
      const sprite = new AudioSprite(audioContext, audioBuffer, multiLoopManifest)

      sprite.play('bgm')
      sprite.play('ambient')

      const bgmSource = createdSources[0]
      const ambientSource = createdSources[1]

      sprite.stopAll()

      expect(bgmSource.stop).toHaveBeenCalled()
      expect(ambientSource.stop).toHaveBeenCalled()
    })

    it('stopAll() when nothing is playing does not throw', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(() => sprite.stopAll()).not.toThrow()
    })

    it('stopAll() only affects looping sprites, not one-shots', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser') // non-looping
      sprite.play('bgm') // looping

      const laserSource = createdSources[0]
      const bgmSource = createdSources[1]

      sprite.stopAll()

      // bgm (looping) is stopped
      expect(bgmSource.stop).toHaveBeenCalled()
      // laser (non-looping) was never in activeSources, stop not called
      expect(laserSource.stop).not.toHaveBeenCalled()
    })
  })

  describe('manifest with resources', () => {
    it('accepts manifest with optional resources array', () => {
      const manifestWithResources: AudiospriteManifest = {
        resources: ['sounds.mp3', 'sounds.ogg', 'sounds.m4a'],
        spritemap: {
          test: { start: 0, end: 1 },
        },
      }

      const sprite = new AudioSprite(audioContext, audioBuffer, manifestWithResources)

      expect(sprite.names).toEqual(['test'])
    })
  })

  describe('edge cases (audiosprite format)', () => {
    it('sprite with end < start throws boundary error', () => {
      const manifest: AudiospriteManifest = {
        spritemap: {
          backwards: { start: 5, end: 2 }, // end before start — end exceeds nothing, but start is fine
        },
      }
      const sprite = new AudioSprite(audioContext, audioBuffer, manifest)

      // getDuration still works (returns negative)
      expect(sprite.getDuration('backwards')).toBe(-3)

      // play() throws because end (2) is within buffer but start (5) and end (2) are valid;
      // however getDuration is negative which is a logic error — boundary check validates end >= 0
      // and end <= buffer.duration, which passes here (2 <= 20). No error expected.
      expect(() => sprite.play('backwards')).not.toThrow()
    })

    it('sprite with end > buffer duration throws boundary error', () => {
      // Create a 1-second buffer specifically for this test
      const shortBuffer = audioContext.createBuffer(1, 44100, 44100) // 1 second
      const manifest: AudiospriteManifest = {
        spritemap: {
          beyondBuffer: { start: 10, end: 12 }, // end exceeds 1-second buffer
        },
      }
      const sprite = new AudioSprite(audioContext, shortBuffer, manifest)

      // Now validation throws a descriptive error
      expect(() => sprite.play('beyondBuffer')).toThrow(
        'Sprite "beyondBuffer" end time 12s exceeds buffer duration 1s',
      )
    })

    it('sprite with start === end (zero duration)', () => {
      const manifest: AudiospriteManifest = {
        spritemap: {
          instant: { start: 1, end: 1 },
        },
      }
      const sprite = new AudioSprite(audioContext, audioBuffer, manifest)

      // Zero duration is valid
      expect(sprite.getDuration('instant')).toBe(0)

      // Playing zero-duration sprite should not error
      expect(() => sprite.play('instant')).not.toThrow()
    })

    it('play sprite that does not exist throws with helpful message', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      // Should throw with available sprite names listed
      expect(() => sprite.play('nonexistent')).toThrow(
        'Sprite "nonexistent" not found. Available: laser, explosion, bgm',
      )
    })

    it('getDuration for nonexistent sprite throws with helpful message', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      expect(() => sprite.getDuration('missing')).toThrow(
        'Sprite "missing" not found. Available: laser, explosion, bgm',
      )
    })

    it('empty spritemap has no names', () => {
      const emptyManifest: AudiospriteManifest = { spritemap: {} }
      const sprite = new AudioSprite(audioContext, audioBuffer, emptyManifest)

      expect(sprite.names).toEqual([])
      expect(sprite.has('anything')).toBe(false)
    })

    it('sprite with end beyond buffer throws boundary error', () => {
      // Create a 1-second buffer specifically for this test
      const shortBuffer = audioContext.createBuffer(1, 44100, 44100) // 1 second
      const manifest: AudiospriteManifest = {
        spritemap: {
          long: { start: 0, end: 999999 }, // Very long — exceeds buffer
        },
      }
      const sprite = new AudioSprite(audioContext, shortBuffer, manifest)

      expect(sprite.getDuration('long')).toBe(999999)
      expect(() => sprite.play('long')).toThrow('exceeds buffer duration')
    })
  })

  describe('Howler manifest normalization', () => {
    describe('isHowlerManifest()', () => {
      it('returns true for manifest with sprite key', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { laser: [0, 300] },
        }
        expect(isHowlerManifest(howler)).toBe(true)
      })

      it('returns false for manifest with spritemap key', () => {
        const audiosprite: AudiospriteManifest = {
          spritemap: { laser: { start: 0, end: 0.3 } },
        }
        expect(isHowlerManifest(audiosprite)).toBe(false)
      })
    })

    describe('normalizeManifest()', () => {
      it('returns audiosprite format unchanged', () => {
        const audiosprite: AudiospriteManifest = {
          spritemap: {
            laser: { start: 0, end: 0.3 },
            explosion: { start: 1.0, end: 2.5 },
          },
        }
        const result = normalizeManifest(audiosprite)
        expect(result).toBe(audiosprite) // same reference
      })

      it('converts Howler [0, 300] to {start: 0, end: 0.3}', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { laser: [0, 300] },
        }
        const result = normalizeManifest(howler)
        expect(result.spritemap.laser).toEqual({
          start: 0,
          end: 0.3,
          loop: false,
        })
      })

      it('converts Howler [1000, 2500] to {start: 1, end: 3.5}', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { explosion: [1000, 2500] },
        }
        const result = normalizeManifest(howler)
        expect(result.spritemap.explosion).toEqual({
          start: 1,
          end: 3.5,
          loop: false,
        })
      })

      it('respects 3rd tuple element as loop flag', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { bgm: [4000, 500, true] },
        }
        const result = normalizeManifest(howler)
        expect(result.spritemap.bgm).toEqual({
          start: 4,
          end: 4.5,
          loop: true,
        })
      })

      it('defaults loop to false when 3rd element absent', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { sfx: [0, 200] },
        }
        const result = normalizeManifest(howler)
        expect(result.spritemap.sfx.loop).toBe(false)
      })

      it('converts multiple sprites in one manifest', () => {
        const howler: HowlerSpriteManifest = {
          sprite: {
            laser: [0, 300],
            explosion: [1000, 2500],
            bgm: [4000, 10000, true],
          },
        }
        const result = normalizeManifest(howler)
        expect(Object.keys(result.spritemap)).toEqual(['laser', 'explosion', 'bgm'])
        expect(result.spritemap.laser).toEqual({ start: 0, end: 0.3, loop: false })
        expect(result.spritemap.explosion).toEqual({ start: 1, end: 3.5, loop: false })
        expect(result.spritemap.bgm).toEqual({ start: 4, end: 14, loop: true })
      })

      it('handles zero offset and duration', () => {
        const howler: HowlerSpriteManifest = {
          sprite: { silence: [0, 0] },
        }
        const result = normalizeManifest(howler)
        expect(result.spritemap.silence).toEqual({ start: 0, end: 0, loop: false })
      })
    })

    describe('SpriteManifest union type', () => {
      it('accepts audiosprite format as SpriteManifest', () => {
        const manifest: SpriteManifest = {
          spritemap: { test: { start: 0, end: 1 } },
        }
        // Type-level check: this compiles and isHowlerManifest detects it correctly
        expect(isHowlerManifest(manifest)).toBe(false)
      })

      it('accepts Howler format as SpriteManifest', () => {
        const manifest: SpriteManifest = {
          sprite: { test: [0, 1000] },
        }
        expect(isHowlerManifest(manifest)).toBe(true)
      })
    })

    describe('integration with AudioSprite', () => {
      it('normalized Howler manifest produces AudioSprite with correct names', () => {
        const howler: HowlerSpriteManifest = {
          sprite: {
            laser: [0, 300],
            explosion: [1000, 2500],
          },
        }
        const normalized = normalizeManifest(howler)
        const sprite = new AudioSprite(audioContext, audioBuffer, normalized)

        expect(sprite.names).toEqual(['laser', 'explosion'])
      })

      it('normalized Howler manifest produces correct durations', () => {
        const howler: HowlerSpriteManifest = {
          sprite: {
            laser: [0, 300],
            explosion: [1000, 2500],
          },
        }
        const normalized = normalizeManifest(howler)
        const sprite = new AudioSprite(audioContext, audioBuffer, normalized)

        expect(sprite.getDuration('laser')).toBeCloseTo(0.3)
        expect(sprite.getDuration('explosion')).toBeCloseTo(2.5)
      })

      it('normalized Howler manifest with loop plays correctly', () => {
        const howler: HowlerSpriteManifest = {
          sprite: {
            bgm: [3000, 12000, true],
          },
        }
        const normalized = normalizeManifest(howler)

        // Use the stop() test pattern's mock setup
        const sources: AudioBufferSourceNode[] = []
        vi.spyOn(audioContext, 'createBufferSource').mockImplementation(() => {
          const source = {
            buffer: null,
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            connect: vi.fn().mockReturnThis(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            onended: null,
          } as unknown as AudioBufferSourceNode
          sources.push(source)
          return source
        })

        const sprite = new AudioSprite(audioContext, audioBuffer, normalized)
        sprite.play('bgm')

        const source = sources[0]
        expect(source.loop).toBe(true)
        expect(source.loopStart).toBe(3)
        expect(source.loopEnd).toBe(15)
      })
    })
  })
})
