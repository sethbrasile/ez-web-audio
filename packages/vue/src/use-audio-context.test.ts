import { getAudioContext, initAudio } from 'ez-web-audio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from './test-utils'
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
    const { result } = mount(() => useAudioContext())

    expect(result.ready.value).toBe(false)
    expect(vi.mocked(initAudio)).not.toHaveBeenCalled()

    await result.init()

    expect(vi.mocked(initAudio)).toHaveBeenCalledTimes(1)
    expect(result.ready.value).toBe(true)
  })

  it('getContext() resolves to the AudioContext via dynamic import', async () => {
    const { result } = mount(() => useAudioContext())

    const ctx = await result.getContext()

    expect(vi.mocked(getAudioContext)).toHaveBeenCalledTimes(1)
    expect(ctx).toBe(fakeCtx)
  })
})
