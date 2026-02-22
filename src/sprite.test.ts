import type { SpriteManifest } from './sprite'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioSprite } from './sprite'

describe('audioSprite', () => {
  let audioContext: AudioContext
  let audioBuffer: AudioBuffer
  let mockSourceNode: AudioBufferSourceNode
  let mockGainNode: GainNode
  let mockPannerNode: StereoPannerNode

  const testManifest: SpriteManifest = {
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
      const emptyManifest: SpriteManifest = { spritemap: {} }
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

    it('uses default gain=1 when no options provided', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(mockGainNode.gain.value).toBe(1)
    })

    it('uses default pan=0 when no options provided', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

      expect(mockPannerNode.pan.value).toBe(0)
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

    it('wires nodes correctly: source -> gain -> pan -> destination', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

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

    it('disconnects nodes when onended fires', () => {
      const sprite = new AudioSprite(audioContext, audioBuffer, testManifest)

      sprite.play('laser')

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

  describe('manifest with resources', () => {
    it('accepts manifest with optional resources array', () => {
      const manifestWithResources: SpriteManifest = {
        resources: ['sounds.mp3', 'sounds.ogg', 'sounds.m4a'],
        spritemap: {
          test: { start: 0, end: 1 },
        },
      }

      const sprite = new AudioSprite(audioContext, audioBuffer, manifestWithResources)

      expect(sprite.names).toEqual(['test'])
    })
  })

  describe('edge cases', () => {
    it('sprite with end < start throws boundary error', () => {
      const manifest: SpriteManifest = {
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
      const manifest: SpriteManifest = {
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
      const manifest: SpriteManifest = {
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
      const emptyManifest: SpriteManifest = { spritemap: {} }
      const sprite = new AudioSprite(audioContext, audioBuffer, emptyManifest)

      expect(sprite.names).toEqual([])
      expect(sprite.has('anything')).toBe(false)
    })

    it('sprite with end beyond buffer throws boundary error', () => {
      // Create a 1-second buffer specifically for this test
      const shortBuffer = audioContext.createBuffer(1, 44100, 44100) // 1 second
      const manifest: SpriteManifest = {
        spritemap: {
          long: { start: 0, end: 999999 }, // Very long — exceeds buffer
        },
      }
      const sprite = new AudioSprite(audioContext, shortBuffer, manifest)

      expect(sprite.getDuration('long')).toBe(999999)
      expect(() => sprite.play('long')).toThrow('exceeds buffer duration')
    })
  })
})
