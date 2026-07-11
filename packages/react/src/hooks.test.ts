import { act, renderHook } from '@testing-library/react'
import {
  createAnalyzer,
  createBeatTrack,
  createFont,
  createGrainPlayer,
  createLayeredSound,
  createLFO,
  createOscillator,
  createPolySynth,
  createSampler,
  createSequence,
  createSound,
  createSprite,
  createTrack,
  createTransport,
  createWhiteNoise,
} from 'ez-web-audio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as hooks from './hooks'
import {
  useAnalyzer,
  useBeatTrack,
  useFont,
  useGrainPlayer,
  useLayeredSound,
  useLFO,
  useOscillator,
  usePolySynth,
  useSampler,
  useSequence,
  useSound,
  useSprite,
  useTrack,
  useTransport,
  useWhiteNoise,
} from './hooks'

vi.mock('ez-web-audio', () => ({
  createSound: vi.fn(async () => ({ id: 'sound' })),
  createTrack: vi.fn(async () => ({ id: 'track' })),
  createOscillator: vi.fn(async () => ({ id: 'oscillator' })),
  createSampler: vi.fn(async () => ({ id: 'sampler' })),
  createPolySynth: vi.fn(async () => ({ id: 'polySynth' })),
  createGrainPlayer: vi.fn(async () => ({ id: 'grainPlayer' })),
  createLFO: vi.fn(() => ({ id: 'lfo' })),
  createTransport: vi.fn(async () => ({ id: 'transport' })),
  createBeatTrack: vi.fn(async () => ({ id: 'beatTrack' })),
  createWhiteNoise: vi.fn(async () => ({ id: 'whiteNoise' })),
  createLayeredSound: vi.fn(async () => ({ id: 'layeredSound' })),
  createSprite: vi.fn(async () => ({ id: 'sprite' })),
  createFont: vi.fn(async () => ({ id: 'font' })),
  createAnalyzer: vi.fn(async () => ({ id: 'analyzer' })),
  createSequence: vi.fn(() => ({ id: 'sequence' })),
  initAudio: vi.fn(async () => {}),
}))

describe('hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports one hook per core factory, every export is a function', () => {
    const exported = Object.entries(hooks)
    expect(exported.length).toBeGreaterThan(0)
    for (const [name, hook] of exported) {
      expect(typeof hook, `${name} should be a function`).toBe('function')
    }
  })

  it('useSound forwards args verbatim and exposes uniform shape', async () => {
    const { result } = renderHook(() => useSound())

    expect(result.current).toHaveProperty('instance')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('load')

    let created: unknown
    await act(async () => {
      created = await result.current.load('foo.mp3')
    })

    expect(vi.mocked(createSound)).toHaveBeenCalledWith('foo.mp3')
    expect(created).toEqual({ id: 'sound' })
    expect(result.current.instance).toEqual({ id: 'sound' })
  })

  it('useTrack forwards args verbatim', async () => {
    const { result } = renderHook(() => useTrack())

    await act(async () => {
      await result.current.load('song.mp3')
    })

    expect(vi.mocked(createTrack)).toHaveBeenCalledWith('song.mp3')
  })

  it('useOscillator forwards args verbatim', async () => {
    const { result } = renderHook(() => useOscillator())

    await act(async () => {
      await result.current.load({ frequency: 440, type: 'sine' })
    })

    expect(vi.mocked(createOscillator)).toHaveBeenCalledWith({ frequency: 440, type: 'sine' })
  })

  it('useSampler forwards args verbatim', async () => {
    const { result } = renderHook(() => useSampler())
    const inputs = ['a.mp3', 'b.mp3']

    await act(async () => {
      await result.current.load(inputs, { numVoices: 3 })
    })

    expect(vi.mocked(createSampler)).toHaveBeenCalledWith(inputs, { numVoices: 3 })
  })

  it('usePolySynth forwards args verbatim', async () => {
    const { result } = renderHook(() => usePolySynth())

    await act(async () => {
      await result.current.load({ maxVoices: 8 })
    })

    expect(vi.mocked(createPolySynth)).toHaveBeenCalledWith({ maxVoices: 8 })
  })

  it('useGrainPlayer forwards args verbatim', async () => {
    const { result } = renderHook(() => useGrainPlayer())
    const buffer = {} as AudioBuffer

    await act(async () => {
      await result.current.load(buffer, { grainSize: 0.1 })
    })

    expect(vi.mocked(createGrainPlayer)).toHaveBeenCalledWith(buffer, { grainSize: 0.1 })
  })

  it('useTransport forwards args verbatim', async () => {
    const { result } = renderHook(() => useTransport())

    await act(async () => {
      await result.current.load({ bpm: 120, timeSignature: [4, 4] })
    })

    expect(vi.mocked(createTransport)).toHaveBeenCalledWith({ bpm: 120, timeSignature: [4, 4] })
  })

  it('useLFO wraps the synchronous core factory and still resolves via load()', async () => {
    const { result } = renderHook(() => useLFO())

    let created: unknown
    await act(async () => {
      created = await result.current.load({ frequency: 5, depth: 0.3 })
    })

    expect(vi.mocked(createLFO)).toHaveBeenCalledWith({ frequency: 5, depth: 0.3 })
    expect(created).toEqual({ id: 'lfo' })
  })

  it('useBeatTrack does NOT inject a wrapWith option — React has no reactive() equivalent', async () => {
    const { result } = renderHook(() => useBeatTrack())
    const inputs = ['kick.mp3']

    await act(async () => {
      await result.current.load(inputs, { numBeats: 8 })
    })

    expect(vi.mocked(createBeatTrack)).toHaveBeenCalledWith(inputs, { numBeats: 8 })
  })

  it('useBeatTrack works with no opts at all, passing opts through unmodified (undefined)', async () => {
    const { result } = renderHook(() => useBeatTrack())
    const inputs = ['kick.mp3']

    await act(async () => {
      await result.current.load(inputs)
    })

    expect(vi.mocked(createBeatTrack)).toHaveBeenCalledWith(inputs, undefined)
  })

  it('useWhiteNoise calls createWhiteNoise with no args', async () => {
    const { result } = renderHook(() => useWhiteNoise())

    let created: unknown
    await act(async () => {
      created = await result.current.load()
    })

    expect(vi.mocked(createWhiteNoise)).toHaveBeenCalledWith()
    expect(created).toEqual({ id: 'whiteNoise' })
    expect(result.current.instance).toEqual({ id: 'whiteNoise' })
  })

  it('useLayeredSound forwards layers and opts verbatim', async () => {
    const { result } = renderHook(() => useLayeredSound())
    const layers = [{ id: 'layer1' }, { id: 'layer2' }] as any

    await act(async () => {
      await result.current.load(layers, { name: 'stack' } as any)
    })

    expect(vi.mocked(createLayeredSound)).toHaveBeenCalledWith(layers, { name: 'stack' })
  })

  it('useSprite forwards audioUrl and manifest verbatim', async () => {
    const { result } = renderHook(() => useSprite())
    const manifest = { spritemap: { laser: { start: 0, end: 0.3 } } } as any

    await act(async () => {
      await result.current.load('sounds.mp3', manifest)
    })

    expect(vi.mocked(createSprite)).toHaveBeenCalledWith('sounds.mp3', manifest)
  })

  it('useFont forwards url verbatim', async () => {
    const { result } = renderHook(() => useFont())

    await act(async () => {
      await result.current.load('piano.js')
    })

    expect(vi.mocked(createFont)).toHaveBeenCalledWith('piano.js')
  })

  it('useAnalyzer forwards options verbatim', async () => {
    const { result } = renderHook(() => useAnalyzer())

    await act(async () => {
      await result.current.load({ fftSize: 1024 })
    })

    expect(vi.mocked(createAnalyzer)).toHaveBeenCalledWith({ fftSize: 1024 })
  })

  it('useSequence wraps the synchronous core factory and still resolves via load()', async () => {
    const { result } = renderHook(() => useSequence())
    const transport = { id: 'transport' } as any

    let created: unknown
    await act(async () => {
      created = await result.current.load(transport, { length: '1m' } as any)
    })

    expect(vi.mocked(createSequence)).toHaveBeenCalledWith(transport, { length: '1m' })
    expect(created).toEqual({ id: 'sequence' })
  })
})
