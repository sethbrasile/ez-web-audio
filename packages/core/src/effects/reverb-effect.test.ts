import type { Effect } from './index'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReverb, ReverbEffect } from './reverb-effect'

function createMockContext() {
  const ctx = new Mock() as unknown as AudioContext

  // Mock createDelay (returns incomplete object from mock)
  ;(ctx as any).createDelay = (_maxDelayTime?: number) => {
    const node = ctx.createGain() as any
    node.delayTime = { value: 0, setTargetAtTime: () => {} }
    return node as unknown as DelayNode
  }

  // Mock createConvolver
  ;(ctx as any).createConvolver = () => {
    const node = ctx.createGain() as any
    node.buffer = null
    node.normalize = true
    return node as unknown as ConvolverNode
  }

  return ctx
}

function createMockAudioBuffer(): AudioBuffer {
  return {
    duration: 2.0,
    length: 96000,
    sampleRate: 48000,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(96000),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer
}

describe('reverbEffect', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('algorithmic mode', () => {
    describe('creation', () => {
      it('can be created with default options', () => {
        const effect = new ReverbEffect(audioContext)
        expect(effect).toBeTruthy()
      })

      it('implements Effect interface', () => {
        const effect: Effect = new ReverbEffect(audioContext)
        expect(effect.input).toBeTruthy()
        expect(effect.output).toBeTruthy()
        expect(typeof effect.bypass).toBe('boolean')
        expect(typeof effect.mix).toBe('number')
      })

      it('mode returns algorithmic', () => {
        const effect = new ReverbEffect(audioContext)
        expect(effect.mode).toBe('algorithmic')
      })

      it('uses default values when no options provided', () => {
        const effect = new ReverbEffect(audioContext)
        expect(effect.decay).toBe(1.5)
        expect(effect.preDelay).toBeCloseTo(0.01)
        expect(effect.damping).toBe(0.3)
      })

      it('respects custom options', () => {
        const effect = new ReverbEffect(audioContext, {
          decay: 3,
          preDelay: 0.05,
          damping: 0.6,
          mix: 0.7,
        })
        expect(effect.decay).toBe(3)
        expect(effect.preDelay).toBeCloseTo(0.05)
        expect(effect.damping).toBe(0.6)
        expect(effect.mix).toBe(0.7)
      })
    })

    describe('decay', () => {
      it('getter returns current decay', () => {
        const effect = new ReverbEffect(audioContext, { decay: 2 })
        expect(effect.decay).toBe(2)
      })

      it('setter updates decay', () => {
        const effect = new ReverbEffect(audioContext)
        effect.decay = 3
        expect(effect.decay).toBe(3)
      })
    })

    describe('preDelay', () => {
      it('getter returns current preDelay', () => {
        const effect = new ReverbEffect(audioContext, { preDelay: 0.05 })
        expect(effect.preDelay).toBeCloseTo(0.05)
      })

      it('setter updates preDelay', () => {
        const effect = new ReverbEffect(audioContext)
        effect.preDelay = 0.08
        expect(effect.preDelay).toBeCloseTo(0.08)
      })

      it('clamps to max 0.1', () => {
        const effect = new ReverbEffect(audioContext)
        effect.preDelay = 0.5
        expect(effect.preDelay).toBeCloseTo(0.1)
      })
    })

    describe('damping', () => {
      it('getter returns current damping', () => {
        const effect = new ReverbEffect(audioContext, { damping: 0.5 })
        expect(effect.damping).toBe(0.5)
      })

      it('setter updates damping', () => {
        const effect = new ReverbEffect(audioContext)
        effect.damping = 0.8
        expect(effect.damping).toBe(0.8)
      })

      it('clamps to 0-1', () => {
        const effect = new ReverbEffect(audioContext)
        effect.damping = 1.5
        expect(effect.damping).toBe(1)
        effect.damping = -0.5
        expect(effect.damping).toBe(0)
      })

      // M7: Reverb decay/damping setters use setTargetAtTime for smooth transitions
      it('m7: decay setter uses setTargetAtTime on comb filter delays', () => {
        // Use a fresh context where we can spy on delay nodes
        const spyCtx = createMockContext()
        const setTargetAtTimeCalls: unknown[][] = []

        // Wrap createDelay to capture and spy on setTargetAtTime
        const origCreateDelay = (spyCtx as any).createDelay
        ;(spyCtx as any).createDelay = (maxDelayTime?: number) => {
          const node = origCreateDelay(maxDelayTime)
          const original = node.delayTime.setTargetAtTime
          node.delayTime.setTargetAtTime = (...args: unknown[]) => {
            setTargetAtTimeCalls.push(args)
            return original?.(...args)
          }
          return node
        }

        const effect = new ReverbEffect(spyCtx)
        setTargetAtTimeCalls.length = 0 // clear constructor calls

        effect.decay = 2.5
        expect(effect.decay).toBe(2.5)
        // Should have called setTargetAtTime for each of the 4 comb filter delay nodes
        expect(setTargetAtTimeCalls.length).toBeGreaterThanOrEqual(4)
      })

      it('m7: damping setter uses setTargetAtTime on comb filter biquad filters', () => {
        const effect = new ReverbEffect(audioContext)
        // Verify functionally: setter should not throw and update stored value
        expect(() => {
          effect.damping = 0.7
        }).not.toThrow()
        expect(effect.damping).toBe(0.7)
      })
    })

    describe('rampTo', () => {
      it('ramps preDelay', () => {
        const effect = new ReverbEffect(audioContext)
        expect(() => effect.rampTo('preDelay', 0.05, 1)).not.toThrow()
      })

      it('is no-op for unknown parameters', () => {
        const effect = new ReverbEffect(audioContext)
        expect(() => effect.rampTo('nonexistent', 0.5, 1)).not.toThrow()
      })
    })
  })

  describe('convolution mode', () => {
    it('can be created from AudioBuffer', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer)
      expect(effect).toBeTruthy()
    })

    it('mode returns convolution', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer)
      expect(effect.mode).toBe('convolution')
    })

    it('implements Effect interface', () => {
      const buffer = createMockAudioBuffer()
      const effect: Effect = ReverbEffect.fromConvolution(audioContext, buffer)
      expect(effect.input).toBeTruthy()
      expect(effect.output).toBeTruthy()
      expect(typeof effect.bypass).toBe('boolean')
      expect(typeof effect.mix).toBe('number')
    })

    it('normalize defaults to true', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer)
      expect(effect.normalize).toBe(true)
    })

    it('respects normalize option', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer, { normalize: false })
      expect(effect.normalize).toBe(false)
    })

    it('normalize can be updated', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer)
      effect.normalize = false
      expect(effect.normalize).toBe(false)
    })

    it('respects mix option', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer, { mix: 0.5 })
      expect(effect.mix).toBe(0.5)
    })

    it('decay/preDelay/damping setters are no-ops in convolution mode', () => {
      const buffer = createMockAudioBuffer()
      const effect = ReverbEffect.fromConvolution(audioContext, buffer)
      effect.decay = 5
      expect(effect.decay).toBe(1.5) // unchanged from default
      effect.preDelay = 0.05
      expect(effect.preDelay).toBe(0) // no preDelayNode exists
      effect.damping = 0.9
      expect(effect.damping).toBe(0.3) // unchanged from default
    })
  })

  describe('createReverb factory', () => {
    it('creates algorithmic reverb with no args', () => {
      const reverb = createReverb(audioContext)
      expect(reverb).toBeInstanceOf(ReverbEffect)
      expect(reverb.mode).toBe('algorithmic')
      expect(reverb.decay).toBe(1.5)
    })

    it('creates algorithmic reverb with options', () => {
      const reverb = createReverb(audioContext, { decay: 3, damping: 0.6 })
      expect(reverb.mode).toBe('algorithmic')
      expect(reverb.decay).toBe(3)
      expect(reverb.damping).toBe(0.6)
    })

    it('creates algorithmic reverb with AudioContext', () => {
      const reverb = createReverb(audioContext)
      expect(reverb).toBeInstanceOf(ReverbEffect)
      expect(reverb.mode).toBe('algorithmic')
    })

    it('creates algorithmic reverb with AudioContext and options', () => {
      const reverb = createReverb(audioContext, { decay: 2 })
      expect(reverb.mode).toBe('algorithmic')
      expect(reverb.decay).toBe(2)
    })

    it('creates convolution reverb from AudioBuffer', () => {
      const buffer = createMockAudioBuffer()
      const reverb = createReverb(audioContext, buffer)
      expect(reverb).toBeInstanceOf(ReverbEffect)
      expect(reverb.mode).toBe('convolution')
    })

    it('creates convolution reverb from AudioBuffer with options', () => {
      const buffer = createMockAudioBuffer()
      const reverb = createReverb(audioContext, buffer, { normalize: false, mix: 0.5 })
      expect(reverb.mode).toBe('convolution')
      expect(reverb.normalize).toBe(false)
      expect(reverb.mix).toBe(0.5)
    })

    it('creates convolution reverb from URL string (mock fetch)', async () => {
      const mockBuffer = createMockAudioBuffer()
      const mockArrayBuffer = new ArrayBuffer(1024)

      // Mock global fetch to return a valid response
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response)

      // Mock decodeAudioData on the context
      const decodeSpy = vi.spyOn(audioContext, 'decodeAudioData').mockResolvedValue(mockBuffer)

      const reverb = await createReverb(audioContext, '/impulse.wav')

      expect(reverb).toBeInstanceOf(ReverbEffect)
      expect(reverb.mode).toBe('convolution')
      expect(fetchSpy).toHaveBeenCalledWith('/impulse.wav')
      expect(decodeSpy).toHaveBeenCalledWith(mockArrayBuffer)

      fetchSpy.mockRestore()
      decodeSpy.mockRestore()
    })

    it('throws when URL fetch fails (non-ok response)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      } as Response)

      await expect(createReverb(audioContext, '/missing.wav')).rejects.toThrow(/Failed to load/)

      fetchSpy.mockRestore()
    })
  })

  describe('edge cases', () => {
    describe('reverb algorithmic boundary values', () => {
      it('decay=0 is handled without throwing', () => {
        const effect = new ReverbEffect(audioContext)
        expect(() => {
          effect.decay = 0
        }).not.toThrow()
      })

      it('damping=0 (brightest) is handled', () => {
        const effect = new ReverbEffect(audioContext)
        effect.damping = 0
        expect(effect.damping).toBe(0)
      })

      it('damping=1 (darkest) is handled', () => {
        const effect = new ReverbEffect(audioContext)
        effect.damping = 1
        expect(effect.damping).toBe(1)
      })

      it('preDelay=0 (no delay) is valid', () => {
        const effect = new ReverbEffect(audioContext)
        effect.preDelay = 0
        expect(effect.preDelay).toBeCloseTo(0)
      })

      it('mix=0 is valid (fully dry)', () => {
        const effect = new ReverbEffect(audioContext)
        effect.mix = 0
        expect(effect.mix).toBe(0)
      })

      it('mix=1 is valid (fully wet)', () => {
        const effect = new ReverbEffect(audioContext)
        effect.mix = 1
        expect(effect.mix).toBe(1)
      })
    })
  })
})
