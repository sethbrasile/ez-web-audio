import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import audioContextAwareTimeout from '@utils/timeout'

// Create a minimal AudioContext-like object with mutable currentTime
function createMockAudioContext(initialTime = 0): AudioContext {
  const ctx = {
    currentTime: initialTime,
  }
  return ctx as unknown as AudioContext
}

describe('audioContextAwareTimeout — fallback when no audioContext', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls console.warn when audioContext is null', () => {
    audioContextAwareTimeout(null as unknown as AudioContext)
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('ez-web-audio')
  })

  it('returns setTimeout that delegates to window.setTimeout', () => {
    const windowSetTimeoutSpy = vi.spyOn(window, 'setTimeout')
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(null as unknown as AudioContext)
    customSetTimeout(() => {}, 100)
    expect(windowSetTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)
  })

  it('returns clearTimeout that delegates to window.clearTimeout', () => {
    const windowClearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    const { clearTimeout: customClearTimeout } = audioContextAwareTimeout(null as unknown as AudioContext)
    customClearTimeout(42)
    expect(windowClearTimeoutSpy).toHaveBeenCalledWith(42)
  })
})

describe('audioContextAwareTimeout — with valid audioContext', () => {
  let rafCallback: FrameRequestCallback | null = null
  let audioContext: AudioContext

  beforeEach(() => {
    rafCallback = null
    audioContext = createMockAudioContext(0)
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts requestAnimationFrame scheduler when setTimeout is called', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    customSetTimeout(() => {}, 500)
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce()
  })

  it('does not invoke callback immediately after scheduling', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const fn = vi.fn()
    customSetTimeout(fn, 500)
    expect(fn).not.toHaveBeenCalled()
  })

  it('returns unique IDs for each setTimeout call', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const id1 = customSetTimeout(() => {}, 100)
    const id2 = customSetTimeout(() => {}, 200)
    expect(id1).not.toBe(id2)
    expect(typeof id1).toBe('number')
    expect(typeof id2).toBe('number')
  })

  it('does not start a second RAF loop when multiple tasks are added', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    customSetTimeout(() => {}, 100)
    customSetTimeout(() => {}, 200)
    // RAF should only be called once on the first setTimeout (subsequent adds don't start new loops)
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce()
  })

  it('fires callback when audioContext.currentTime advances past due time', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const fn = vi.fn()

    // Schedule 500ms from now (currentTime=0, due = 0.5s in audio time)
    customSetTimeout(fn, 500)
    expect(fn).not.toHaveBeenCalled()

    // Advance audioContext time to 0.6s (600ms) — past the 0.5s due time
    ;(audioContext as unknown as { currentTime: number }).currentTime = 0.6

    // Trigger RAF callback — this runs the scheduler
    rafCallback!(performance.now())

    expect(fn).toHaveBeenCalledOnce()
  })

  it('clearTimeout cancels a pending task so callback is never invoked', () => {
    const { setTimeout: customSetTimeout, clearTimeout: customClearTimeout } = audioContextAwareTimeout(audioContext)
    const fn = vi.fn()

    const id = customSetTimeout(fn, 500)
    customClearTimeout(id)

    // Advance time past due
    ;(audioContext as unknown as { currentTime: number }).currentTime = 1.0
    rafCallback!(performance.now())

    expect(fn).not.toHaveBeenCalled()
  })

  it('fires multiple callbacks in order when currentTime advances past both', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const order: number[] = []

    customSetTimeout(() => order.push(1), 200)
    customSetTimeout(() => order.push(2), 400)

    // Advance past both due times
    ;(audioContext as unknown as { currentTime: number }).currentTime = 0.5 // 500ms

    rafCallback!(performance.now())

    expect(order).toEqual([1, 2])
  })

  it('stops scheduling RAF when all tasks have fired', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const fn = vi.fn()

    customSetTimeout(fn, 100)

    // First RAF call: fire the task, tasks becomes empty
    ;(audioContext as unknown as { currentTime: number }).currentTime = 0.2
    rafCallback!(performance.now())

    expect(fn).toHaveBeenCalledOnce()

    // RAF was started once by setTimeout; after tasks are gone, no new RAF call should occur
    // The RAF was called once at schedule time; after the scheduler runs with empty tasks, no new call
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce()
  })

  it('continues scheduling RAF while tasks still remain', () => {
    const { setTimeout: customSetTimeout } = audioContextAwareTimeout(audioContext)
    const fn1 = vi.fn()
    const fn2 = vi.fn()

    customSetTimeout(fn1, 200)
    customSetTimeout(fn2, 400)

    // RAF called once on first setTimeout (second add doesn't trigger another)
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    // Advance past first task only
    ;(audioContext as unknown as { currentTime: number }).currentTime = 0.3

    rafCallback!(performance.now())

    expect(fn1).toHaveBeenCalledOnce()
    expect(fn2).not.toHaveBeenCalled()

    // Scheduler should have re-queued RAF because fn2 is still pending
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2)
  })
})
