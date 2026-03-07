import { playTogether } from '@utils/play-together'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateAudioContext } from '@/audio-context'

// Mock the audio-context module before importing play-together
vi.mock('@/audio-context', () => ({
  getOrCreateAudioContext: vi.fn(),
}))

// Stub AudioContext globally so hasAudioContext's instanceof check works
// play-together.ts uses `instanceof AudioContext` to detect audio-context-bearing playables
function setupAudioContextGlobal() {
  const MockCtx = MockAudioContext as unknown as typeof AudioContext
  vi.stubGlobal('AudioContext', MockCtx)
}

function createMockAudioContext(): AudioContext {
  return new MockAudioContext() as unknown as AudioContext
}

function createMockPlayable(audioContext?: AudioContext) {
  const playable: {
    playAt: ReturnType<typeof vi.fn>
    audioContext?: AudioContext
  } = {
    playAt: vi.fn().mockResolvedValue(undefined),
  }
  if (audioContext !== undefined) {
    playable.audioContext = audioContext
  }
  return playable as unknown as import('@interfaces/playable').Playable
}

describe('playTogether', () => {
  beforeEach(() => {
    setupAudioContextGlobal()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns immediately without calling playAt when given an empty array', async () => {
    await expect(playTogether([])).resolves.toBeUndefined()
  })

  it('calls playAt on all playables with the same timestamp', async () => {
    const ctx = createMockAudioContext()
    const p1 = createMockPlayable(ctx)
    const p2 = createMockPlayable(ctx)
    const p3 = createMockPlayable(ctx)

    await playTogether([p1, p2, p3])

    const time1 = (p1 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    const time2 = (p2 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    const time3 = (p3 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]

    expect(time1).toBe(time2)
    expect(time2).toBe(time3)
  })

  it('schedules start time slightly in the future (> audioContext.currentTime)', async () => {
    const ctx = createMockAudioContext()
    const p = createMockPlayable(ctx)

    await playTogether([p])

    const playAtArg = (p as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    expect(playAtArg).toBeGreaterThan(ctx.currentTime)
  })

  it('start time is audioContext.currentTime + 0.01', async () => {
    const ctx = createMockAudioContext()
    const currentTime = ctx.currentTime
    const p = createMockPlayable(ctx)

    await playTogether([p])

    const playAtArg = (p as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    expect(playAtArg).toBeCloseTo(currentTime + 0.01, 10)
  })

  it('uses audioContext from first playable that has one', async () => {
    const ctx1 = createMockAudioContext()
    const ctx2 = createMockAudioContext()
    const currentTime1 = ctx1.currentTime

    const p1 = createMockPlayable(ctx1)
    const p2 = createMockPlayable(ctx2)

    await playTogether([p1, p2])

    const playAtArg = (p1 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    // Should use ctx1.currentTime + 0.01
    expect(playAtArg).toBeCloseTo(currentTime1 + 0.01, 10)
  })

  it('falls back to getOrCreateAudioContext when playables lack audioContext property', async () => {
    const sharedCtx = createMockAudioContext()
    vi.mocked(getOrCreateAudioContext).mockReturnValue(sharedCtx)
    const currentTime = sharedCtx.currentTime

    // Playables with no audioContext property
    const p1 = createMockPlayable()
    const p2 = createMockPlayable()

    await playTogether([p1, p2])

    expect(getOrCreateAudioContext).toHaveBeenCalledOnce()

    const time1 = (p1 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    const time2 = (p2 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    expect(time1).toBeCloseTo(currentTime + 0.01, 10)
    expect(time2).toBeCloseTo(currentTime + 0.01, 10)
  })

  it('rejects when one playable playAt rejects (Promise.all behavior)', async () => {
    const ctx = createMockAudioContext()
    const p1 = createMockPlayable(ctx)
    const p2 = {
      playAt: vi.fn().mockRejectedValue(new Error('playAt failed')),
      audioContext: ctx,
    } as unknown as import('@interfaces/playable').Playable

    await expect(playTogether([p1, p2])).rejects.toThrow('playAt failed')
  })

  it('handles a single playable correctly', async () => {
    const ctx = createMockAudioContext()
    const currentTime = ctx.currentTime
    const p = createMockPlayable(ctx)

    await playTogether([p])

    expect((p as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt).toHaveBeenCalledOnce()
    const playAtArg = (p as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
    expect(playAtArg).toBeCloseTo(currentTime + 0.01, 10)
  })

  describe('explicit AudioContext overload', () => {
    it('playTogether(ctx, playables) uses the provided context currentTime', async () => {
      const ctx = createMockAudioContext()
      const currentTime = ctx.currentTime
      const p1 = createMockPlayable()
      const p2 = createMockPlayable()

      await playTogether(ctx, [p1, p2])

      const time1 = (p1 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
      const time2 = (p2 as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt.mock.calls[0][0]
      expect(time1).toBeCloseTo(currentTime + 0.01, 10)
      expect(time2).toBeCloseTo(currentTime + 0.01, 10)
    })

    it('playTogether(ctx, playables) does not call getOrCreateAudioContext', async () => {
      const ctx = createMockAudioContext()
      const p = createMockPlayable()

      await playTogether(ctx, [p])

      expect(getOrCreateAudioContext).not.toHaveBeenCalled()
    })

    it('playTogether(playables) still works (default path, no regression)', async () => {
      const ctx = createMockAudioContext()
      const p = createMockPlayable(ctx)

      await playTogether([p])

      expect((p as unknown as { playAt: ReturnType<typeof vi.fn> }).playAt).toHaveBeenCalledOnce()
    })
  })
})
