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
import { reactive } from 'vue'
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
} from './composables'
import { mount } from './test-utils'

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

describe('composables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useSound forwards args verbatim and exposes uniform shape', async () => {
    const { result } = mount(() => useSound())

    expect(result).toHaveProperty('instance')
    expect(result).toHaveProperty('loading')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('load')

    const created = await result.load('foo.mp3')

    expect(vi.mocked(createSound)).toHaveBeenCalledWith('foo.mp3')
    expect(created).toEqual({ id: 'sound' })
    expect(result.instance.value).toEqual({ id: 'sound' })
  })

  it('useTrack forwards args verbatim', async () => {
    const { result } = mount(() => useTrack())

    await result.load('song.mp3')

    expect(vi.mocked(createTrack)).toHaveBeenCalledWith('song.mp3')
  })

  it('useOscillator forwards args verbatim', async () => {
    const { result } = mount(() => useOscillator())

    await result.load({ frequency: 440, type: 'sine' })

    expect(vi.mocked(createOscillator)).toHaveBeenCalledWith({ frequency: 440, type: 'sine' })
  })

  it('useSampler forwards args verbatim', async () => {
    const { result } = mount(() => useSampler())
    const inputs = ['a.mp3', 'b.mp3']

    await result.load(inputs, { numVoices: 3 })

    expect(vi.mocked(createSampler)).toHaveBeenCalledWith(inputs, { numVoices: 3 })
  })

  it('usePolySynth forwards args verbatim', async () => {
    const { result } = mount(() => usePolySynth())

    await result.load({ maxVoices: 8 })

    expect(vi.mocked(createPolySynth)).toHaveBeenCalledWith({ maxVoices: 8 })
  })

  it('useGrainPlayer forwards args verbatim', async () => {
    const { result } = mount(() => useGrainPlayer())
    const buffer = {} as AudioBuffer

    await result.load(buffer, { grainSize: 0.1 })

    expect(vi.mocked(createGrainPlayer)).toHaveBeenCalledWith(buffer, { grainSize: 0.1 })
  })

  it('useTransport forwards args verbatim', async () => {
    const { result } = mount(() => useTransport())

    await result.load({ bpm: 120, timeSignature: [4, 4] })

    expect(vi.mocked(createTransport)).toHaveBeenCalledWith({ bpm: 120, timeSignature: [4, 4] })
  })

  it('useLFO wraps the synchronous core factory and still resolves via load()', async () => {
    const { result } = mount(() => useLFO())

    const created = await result.load({ frequency: 5, depth: 0.3 })

    expect(vi.mocked(createLFO)).toHaveBeenCalledWith({ frequency: 5, depth: 0.3 })
    expect(created).toEqual({ id: 'lfo' })
  })

  it('useBeatTrack injects a default wrapWith=reactive when the caller omits one', async () => {
    const { result } = mount(() => useBeatTrack())
    const inputs = ['kick.mp3']

    await result.load(inputs, { numBeats: 8 })

    expect(vi.mocked(createBeatTrack)).toHaveBeenCalledWith(inputs, { wrapWith: reactive, numBeats: 8 })
  })

  it('useBeatTrack lets an explicit caller wrapWith win over the default', async () => {
    const { result } = mount(() => useBeatTrack())
    const inputs = ['kick.mp3']
    const customWrap = vi.fn(beat => beat)

    await result.load(inputs, { wrapWith: customWrap, numBeats: 4 })

    expect(vi.mocked(createBeatTrack)).toHaveBeenCalledWith(inputs, { wrapWith: customWrap, numBeats: 4 })
  })

  it('useBeatTrack works with no opts at all, still defaulting wrapWith', async () => {
    const { result } = mount(() => useBeatTrack())
    const inputs = ['kick.mp3']

    await result.load(inputs)

    expect(vi.mocked(createBeatTrack)).toHaveBeenCalledWith(inputs, { wrapWith: reactive })
  })

  it('useWhiteNoise calls createWhiteNoise with no args', async () => {
    const { result } = mount(() => useWhiteNoise())

    const created = await result.load()

    expect(vi.mocked(createWhiteNoise)).toHaveBeenCalledWith()
    expect(created).toEqual({ id: 'whiteNoise' })
    expect(result.instance.value).toEqual({ id: 'whiteNoise' })
  })

  it('useLayeredSound forwards layers and opts verbatim', async () => {
    const { result } = mount(() => useLayeredSound())
    const layers = [{ id: 'layer1' }, { id: 'layer2' }] as any

    await result.load(layers, { name: 'stack' } as any)

    expect(vi.mocked(createLayeredSound)).toHaveBeenCalledWith(layers, { name: 'stack' })
  })

  it('useSprite forwards audioUrl and manifest verbatim', async () => {
    const { result } = mount(() => useSprite())
    const manifest = { spritemap: { laser: { start: 0, end: 0.3 } } } as any

    await result.load('sounds.mp3', manifest)

    expect(vi.mocked(createSprite)).toHaveBeenCalledWith('sounds.mp3', manifest)
  })

  it('useFont forwards url verbatim', async () => {
    const { result } = mount(() => useFont())

    await result.load('piano.js')

    expect(vi.mocked(createFont)).toHaveBeenCalledWith('piano.js')
  })

  it('useAnalyzer forwards options verbatim', async () => {
    const { result } = mount(() => useAnalyzer())

    await result.load({ fftSize: 1024 })

    expect(vi.mocked(createAnalyzer)).toHaveBeenCalledWith({ fftSize: 1024 })
  })

  it('useSequence wraps the synchronous core factory and still resolves via load()', async () => {
    const { result } = mount(() => useSequence())
    const transport = { id: 'transport' } as any

    const created = await result.load(transport, { length: '1m' } as any)

    expect(vi.mocked(createSequence)).toHaveBeenCalledWith(transport, { length: '1m' })
    expect(created).toEqual({ id: 'sequence' })
  })
})
