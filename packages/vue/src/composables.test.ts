import {
  createBeatTrack,
  createGrainPlayer,
  createLFO,
  createOscillator,
  createPolySynth,
  createSampler,
  createSound,
  createTrack,
  createTransport,
} from 'ez-web-audio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import {
  useBeatTrack,
  useGrainPlayer,
  useLFO,
  useOscillator,
  usePolySynth,
  useSampler,
  useSound,
  useTrack,
  useTransport,
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
})
