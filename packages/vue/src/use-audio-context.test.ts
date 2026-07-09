import { initAudio } from 'ez-web-audio'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from './test-utils'
import { useAudioContext } from './use-audio-context'

vi.mock('ez-web-audio', () => ({
  initAudio: vi.fn(async () => {}),
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
})
