import { describe, expect, it, vi } from 'vitest'
import { mount } from './test-utils'
import { useEnsureLoaded } from './use-ensure-loaded'

describe('useEnsureLoaded', () => {
  it('starts with loaded/loading false and error empty', () => {
    const load = vi.fn(async () => {})
    const { result } = mount(() => useEnsureLoaded(load))

    expect(result.loaded.value).toBe(false)
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBe('')
    expect(load).not.toHaveBeenCalled()
  })

  it('ensureLoaded() runs load() once, resolves true, sets loaded', async () => {
    const load = vi.fn(async () => {})
    const { result } = mount(() => useEnsureLoaded(load))

    const ok = await result.ensureLoaded()

    expect(ok).toBe(true)
    expect(result.loaded.value).toBe(true)
    expect(result.loading.value).toBe(false)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('a later call resolves true immediately without re-invoking load()', async () => {
    const load = vi.fn(async () => {})
    const { result } = mount(() => useEnsureLoaded(load))

    await result.ensureLoaded()
    const second = await result.ensureLoaded()

    expect(second).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loading is true during flight and false after settle', async () => {
    let resolveLoad!: () => void
    const load = vi.fn(() => new Promise<void>((resolve) => {
      resolveLoad = resolve
    }))
    const { result } = mount(() => useEnsureLoaded(load))

    const pending = result.ensureLoaded()
    expect(result.loading.value).toBe(true)

    resolveLoad()
    await pending

    expect(result.loading.value).toBe(false)
  })

  it('a concurrent call while loading resolves false without re-invoking load()', async () => {
    let resolveLoad!: () => void
    const load = vi.fn(() => new Promise<void>((resolve) => {
      resolveLoad = resolve
    }))
    const { result } = mount(() => useEnsureLoaded(load))

    const first = result.ensureLoaded()
    const second = await result.ensureLoaded()

    expect(second).toBe(false)
    expect(load).toHaveBeenCalledTimes(1)

    resolveLoad()
    expect(await first).toBe(true)
  })

  it('rejection with an Error sets error.value to its message, resolves false, does not throw', async () => {
    const load = vi.fn(async () => {
      throw new Error('boom')
    })
    const { result } = mount(() => useEnsureLoaded(load))

    const ok = await result.ensureLoaded()

    expect(ok).toBe(false)
    expect(result.loaded.value).toBe(false)
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBe('boom')
  })

  it('rejection with a non-Error value falls back to errorMessage', async () => {
    const load = vi.fn(async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'not an error object'
    })
    const { result } = mount(() => useEnsureLoaded(load, 'custom fallback'))

    const ok = await result.ensureLoaded()

    expect(ok).toBe(false)
    expect(result.error.value).toBe('custom fallback')
  })

  it('uses the default fallback message when none is provided', async () => {
    const load = vi.fn(async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'nope'
    })
    const { result } = mount(() => useEnsureLoaded(load))

    await result.ensureLoaded()

    expect(result.error.value).toBe('Failed to load audio')
  })

  it('a failed attempt can be retried and succeed, clearing error', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce(undefined)
    const { result } = mount(() => useEnsureLoaded(load))

    const first = await result.ensureLoaded()
    expect(first).toBe(false)
    expect(result.error.value).toBe('first failure')

    const second = await result.ensureLoaded()

    expect(second).toBe(true)
    expect(result.loaded.value).toBe(true)
    expect(result.error.value).toBe('')
    expect(load).toHaveBeenCalledTimes(2)
  })
})
