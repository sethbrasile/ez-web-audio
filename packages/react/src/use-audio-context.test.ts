import { act, renderHook } from '@testing-library/react'
import { getAudioContext, initAudio } from 'ez-web-audio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioContext } from './use-audio-context'

const fakeCtx = {} as AudioContext

vi.mock('ez-web-audio', () => ({
  initAudio: vi.fn(async () => {}),
  getAudioContext: vi.fn(async () => fakeCtx),
}))

describe('useAudioContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ready is false before init(), true after; init() calls initAudio via dynamic import', async () => {
    const { result } = renderHook(() => useAudioContext())

    expect(result.current.ready).toBe(false)
    expect(vi.mocked(initAudio)).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.init()
    })

    expect(vi.mocked(initAudio)).toHaveBeenCalledTimes(1)
    expect(result.current.ready).toBe(true)
  })

  it('getContext() resolves to the AudioContext via dynamic import', async () => {
    const { result } = renderHook(() => useAudioContext())

    let ctx: AudioContext | undefined
    await act(async () => {
      ctx = await result.current.getContext()
    })

    expect(vi.mocked(getAudioContext)).toHaveBeenCalledTimes(1)
    expect(ctx).toBe(fakeCtx)
  })

  it('init() is idempotent — a repeat call after ready is a no-op (initAudio not re-invoked)', async () => {
    const { result } = renderHook(() => useAudioContext())

    await act(async () => {
      await result.current.init()
    })
    expect(vi.mocked(initAudio)).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.init()
    })
    expect(vi.mocked(initAudio)).toHaveBeenCalledTimes(1)
    expect(result.current.ready).toBe(true)
  })

  it('concurrent init() calls in-flight share ONE initAudio invocation', async () => {
    const { result } = renderHook(() => useAudioContext())

    let p1!: Promise<void>
    let p2!: Promise<void>
    act(() => {
      p1 = result.current.init()
      p2 = result.current.init()
    })

    await act(async () => {
      await Promise.all([p1, p2])
    })

    expect(vi.mocked(initAudio)).toHaveBeenCalledTimes(1)
    expect(result.current.ready).toBe(true)
  })
})
