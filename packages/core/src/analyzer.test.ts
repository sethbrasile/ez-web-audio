import type { AnalyzerOptions } from './analyzer'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Analyzer, createAnalyzer } from './analyzer'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

/**
 * The standardized-audio-context-mock doesn't fully implement AnalyserNode.
 * We test structure where possible and mock methods where needed.
 */
describe('analyzer', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('construction', () => {
    it('creates analyzer with default options', () => {
      const analyzer = new Analyzer(audioContext)

      expect(analyzer).toBeInstanceOf(Analyzer)
      expect(analyzer.fftSize).toBe(2048) // Default FFT size
      // frequencyBinCount may be undefined in mock, but the array should be correct size
      expect(analyzer._frequencyData.length).toBe(1024)
    })

    it('creates analyzer with custom fftSize', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 512 })

      expect(analyzer.fftSize).toBe(512)
      expect(analyzer._frequencyData.length).toBe(256)
    })

    it('creates analyzer with all custom options', () => {
      const options: AnalyzerOptions = {
        fftSize: 1024,
        minDecibels: -90,
        maxDecibels: -20,
        smoothingTimeConstant: 0.5,
      }
      const analyzer = new Analyzer(audioContext, options)

      expect(analyzer.fftSize).toBe(1024)
      expect(analyzer.minDecibels).toBe(-90)
      expect(analyzer.maxDecibels).toBe(-20)
      expect(analyzer.smoothingTimeConstant).toBe(0.5)
    })

    it('throws error for invalid fftSize (not power of 2)', () => {
      expect(() => new Analyzer(audioContext, { fftSize: 1000 }))
        .toThrow('fftSize must be a power of 2 between 32 and 32768')
    })

    it('throws error for fftSize too small', () => {
      expect(() => new Analyzer(audioContext, { fftSize: 16 }))
        .toThrow('fftSize must be a power of 2 between 32 and 32768')
    })

    it('throws error for fftSize too large', () => {
      expect(() => new Analyzer(audioContext, { fftSize: 65536 }))
        .toThrow('fftSize must be a power of 2 between 32 and 32768')
    })

    it('accepts minimum valid fftSize (32)', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 32 })
      expect(analyzer.fftSize).toBe(32)
      expect(analyzer._frequencyData.length).toBe(16)
    })

    it('accepts maximum valid fftSize (32768)', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 32768 })
      expect(analyzer.fftSize).toBe(32768)
      expect(analyzer._frequencyData.length).toBe(16384)
    })
  })

  describe('input property', () => {
    it('input is an AudioNode with connect/disconnect', () => {
      const analyzer = new Analyzer(audioContext)

      // Check it has the essential AudioNode methods
      expect(analyzer.input).toBeDefined()
      expect(typeof analyzer.input.connect).toBe('function')
      expect(typeof analyzer.input.disconnect).toBe('function')
    })

    it('input is readonly (same reference)', () => {
      const analyzer = new Analyzer(audioContext)
      const originalInput = analyzer.input

      // TypeScript prevents reassignment, but verify at runtime
      expect(analyzer.input).toBe(originalInput)
    })
  })

  describe('frequencyBinCount', () => {
    it('internal arrays are fftSize / 2', () => {
      const analyzer1 = new Analyzer(audioContext, { fftSize: 256 })
      expect(analyzer1._frequencyData.length).toBe(128)

      const analyzer2 = new Analyzer(audioContext, { fftSize: 4096 })
      expect(analyzer2._frequencyData.length).toBe(2048)
    })
  })

  describe('fftSize getter/setter', () => {
    it('can get fftSize', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 512 })
      expect(analyzer.fftSize).toBe(512)
    })

    it('can set fftSize', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.fftSize = 512
      expect(analyzer.fftSize).toBe(512)
      // Arrays should be reallocated
      expect(analyzer._frequencyData.length).toBe(256)
    })

    it('throws when setting invalid fftSize', () => {
      const analyzer = new Analyzer(audioContext)
      expect(() => {
        analyzer.fftSize = 999
      })
        .toThrow('fftSize must be a power of 2 between 32 and 32768')
    })

    it('reallocates arrays when fftSize changes', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 256 })
      expect(analyzer._frequencyData.length).toBe(128)

      analyzer.fftSize = 1024
      expect(analyzer._frequencyData.length).toBe(512)
      expect(analyzer._timeDomainData.length).toBe(512)
      expect(analyzer._floatFrequencyData.length).toBe(512)
    })
  })

  describe('minDecibels getter/setter', () => {
    it('can get minDecibels', () => {
      const analyzer = new Analyzer(audioContext, { minDecibels: -90 })
      expect(analyzer.minDecibels).toBe(-90)
    })

    it('can set minDecibels', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.minDecibels = -80
      expect(analyzer.minDecibels).toBe(-80)
    })
  })

  describe('maxDecibels getter/setter', () => {
    it('can get maxDecibels', () => {
      const analyzer = new Analyzer(audioContext, { maxDecibels: -25 })
      expect(analyzer.maxDecibels).toBe(-25)
    })

    it('can set maxDecibels', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.maxDecibels = -10
      expect(analyzer.maxDecibels).toBe(-10)
    })
  })

  describe('smoothingTimeConstant getter/setter', () => {
    it('can get smoothingTimeConstant', () => {
      const analyzer = new Analyzer(audioContext, { smoothingTimeConstant: 0.6 })
      expect(analyzer.smoothingTimeConstant).toBe(0.6)
    })

    it('can set smoothingTimeConstant', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.smoothingTimeConstant = 0.9
      expect(analyzer.smoothingTimeConstant).toBe(0.9)
    })
  })

  describe('getFrequencyData()', () => {
    it('returns Uint8Array', () => {
      const analyzer = new Analyzer(audioContext)
      // Mock the method since standardized-audio-context-mock doesn't implement it
      analyzer.input.getByteFrequencyData = vi.fn()

      const data = analyzer.getFrequencyData()
      expect(data).toBeInstanceOf(Uint8Array)
    })

    it('returns array of correct size', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 512 })
      analyzer.input.getByteFrequencyData = vi.fn()

      const data = analyzer.getFrequencyData()
      expect(data.length).toBe(256)
    })

    it('returns same array reference (pre-allocated)', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.input.getByteFrequencyData = vi.fn()

      const data1 = analyzer.getFrequencyData()
      const data2 = analyzer.getFrequencyData()
      expect(data1).toBe(data2)
    })

    it('calls underlying AnalyserNode method', () => {
      const analyzer = new Analyzer(audioContext)
      const mockFn = vi.fn()
      analyzer.input.getByteFrequencyData = mockFn

      analyzer.getFrequencyData()
      expect(mockFn).toHaveBeenCalledWith(analyzer._frequencyData)
    })
  })

  describe('getTimeDomainData()', () => {
    it('returns Uint8Array', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.input.getByteTimeDomainData = vi.fn()

      const data = analyzer.getTimeDomainData()
      expect(data).toBeInstanceOf(Uint8Array)
    })

    it('returns array of correct size', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 256 })
      analyzer.input.getByteTimeDomainData = vi.fn()

      const data = analyzer.getTimeDomainData()
      expect(data.length).toBe(128)
    })

    it('returns same array reference (pre-allocated)', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.input.getByteTimeDomainData = vi.fn()

      const data1 = analyzer.getTimeDomainData()
      const data2 = analyzer.getTimeDomainData()
      expect(data1).toBe(data2)
    })

    it('calls underlying AnalyserNode method', () => {
      const analyzer = new Analyzer(audioContext)
      const mockFn = vi.fn()
      analyzer.input.getByteTimeDomainData = mockFn

      analyzer.getTimeDomainData()
      expect(mockFn).toHaveBeenCalledWith(analyzer._timeDomainData)
    })
  })

  describe('getFloatFrequencyData()', () => {
    it('returns Float32Array', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.input.getFloatFrequencyData = vi.fn()

      const data = analyzer.getFloatFrequencyData()
      expect(data).toBeInstanceOf(Float32Array)
    })

    it('returns array of correct size', () => {
      const analyzer = new Analyzer(audioContext, { fftSize: 1024 })
      analyzer.input.getFloatFrequencyData = vi.fn()

      const data = analyzer.getFloatFrequencyData()
      expect(data.length).toBe(512)
    })

    it('returns same array reference (pre-allocated)', () => {
      const analyzer = new Analyzer(audioContext)
      analyzer.input.getFloatFrequencyData = vi.fn()

      const data1 = analyzer.getFloatFrequencyData()
      const data2 = analyzer.getFloatFrequencyData()
      expect(data1).toBe(data2)
    })

    it('calls underlying AnalyserNode method', () => {
      const analyzer = new Analyzer(audioContext)
      const mockFn = vi.fn()
      analyzer.input.getFloatFrequencyData = mockFn

      analyzer.getFloatFrequencyData()
      expect(mockFn).toHaveBeenCalledWith(analyzer._floatFrequencyData)
    })
  })
})

describe('createAnalyzer factory', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('creates Analyzer instance', () => {
    const analyzer = createAnalyzer(audioContext)
    expect(analyzer).toBeInstanceOf(Analyzer)
  })

  it('passes options to Analyzer', () => {
    const analyzer = createAnalyzer(audioContext, { fftSize: 512, minDecibels: -80 })

    expect(analyzer.fftSize).toBe(512)
    expect(analyzer.minDecibels).toBe(-80)
  })

  it('works without options', () => {
    const analyzer = createAnalyzer(audioContext)

    expect(analyzer.fftSize).toBe(2048)
    expect(analyzer._frequencyData.length).toBe(1024)
  })
})
