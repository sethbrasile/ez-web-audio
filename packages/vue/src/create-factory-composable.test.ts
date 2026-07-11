import { describe, expect, it, vi } from 'vitest'
import { createFactoryComposable } from './create-factory-composable'
import { mount } from './test-utils'

describe('createFactoryComposable', () => {
  it('load() resolves and sets instance.value', async () => {
    const factory = vi.fn(async (name: string) => ({ id: name }))
    const useFactory = createFactoryComposable(factory)

    const { result, unmount } = mount(() => useFactory())

    const created = await result.load('a')

    expect(created).toEqual({ id: 'a' })
    expect(result.instance.value).toEqual({ id: 'a' })

    unmount()
  })

  it('concurrent load() calls during flight share ONE factory invocation', async () => {
    let resolveFactory!: (value: { id: string }) => void
    const factory = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveFactory = resolve
    }))
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    const p1 = result.load()
    const p2 = result.load()

    expect(factory).toHaveBeenCalledTimes(1)

    resolveFactory({ id: 'shared' })

    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1).toBe(r2)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('load() after success returns existing instance without re-invoking factory', async () => {
    const factory = vi.fn(async () => ({ id: 'once' }))
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    const first = await result.load()
    const second = await result.load()

    expect(first).toBe(second)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('rejection sets error.value, loading false, rethrows; later load() retries', async () => {
    const failure = new Error('boom')
    const factory = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ id: 'recovered' })
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    await expect(result.load()).rejects.toThrow('boom')

    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value?.message).toBe('boom')
    expect(result.loading.value).toBe(false)
    expect(result.instance.value).toBeNull()

    const retried = await result.load()

    expect(retried).toEqual({ id: 'recovered' })
    expect(result.error.value).toBeNull()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('loading is true during flight and false after settle', async () => {
    let resolveFactory!: () => void
    const factory = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveFactory = () => resolve({ id: 'x' })
    }))
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    expect(result.loading.value).toBe(false)

    const pending = result.load()

    expect(result.loading.value).toBe(true)

    resolveFactory()
    await pending

    expect(result.loading.value).toBe(false)
  })

  it('factory is NOT invoked before load() is called (SSR safety)', () => {
    const factory = vi.fn(async () => ({ id: 'x' }))
    const useFactory = createFactoryComposable(factory)

    mount(() => useFactory())

    expect(factory).not.toHaveBeenCalled()
  })

  it('reset() nulls instance.value so a subsequent load() re-invokes the factory', async () => {
    const factory = vi.fn(async (name: string) => ({ id: name }))
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    const first = await result.load('a')
    expect(result.instance.value).toEqual({ id: 'a' })

    result.reset()

    expect(result.instance.value).toBeNull()

    const second = await result.load('b')

    expect(factory).toHaveBeenCalledTimes(2)
    expect(second).toEqual({ id: 'b' })
    expect(second).not.toBe(first)
    expect(result.instance.value).toEqual({ id: 'b' })
  })

  it('reset() during an in-flight load abandons it; a later load() re-invokes the factory', async () => {
    const factory = vi.fn()
      .mockImplementationOnce(() => new Promise<{ id: string }>(() => {
        // never resolves — simulates an abandoned in-flight load
      }))
      .mockResolvedValueOnce({ id: 'second' })
    const useFactory = createFactoryComposable(factory)
    const { result } = mount(() => useFactory())

    void result.load()

    expect(factory).toHaveBeenCalledTimes(1)

    result.reset()

    const second = await result.load()

    expect(factory).toHaveBeenCalledTimes(2)
    expect(second).toEqual({ id: 'second' })
  })

  describe('reset() disposes the outgoing instance (R17#1)', () => {
    it('calls stop() then dispose() on the outgoing instance', async () => {
      const stop = vi.fn()
      const dispose = vi.fn()
      const factory = vi.fn(async () => ({ stop, dispose }))
      const useFactory = createFactoryComposable(factory)
      const { result } = mount(() => useFactory())

      await result.load()
      result.reset()

      expect(stop).toHaveBeenCalledTimes(1)
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('does not throw when the outgoing instance has no stop()/dispose()', async () => {
      const factory = vi.fn(async () => ({ id: 'plain' }))
      const useFactory = createFactoryComposable(factory)
      const { result } = mount(() => useFactory())

      await result.load()

      expect(() => result.reset()).not.toThrow()
    })

    it('does not throw when reset() runs before any load() (nothing to dispose)', () => {
      const factory = vi.fn(async () => ({ id: 'x' }))
      const useFactory = createFactoryComposable(factory)
      const { result } = mount(() => useFactory())

      expect(() => result.reset()).not.toThrow()
    })

    it('warns but does not throw when stop() or dispose() itself throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const stop = vi.fn(() => {
        throw new Error('stop failed')
      })
      const dispose = vi.fn(() => {
        throw new Error('dispose failed')
      })
      const factory = vi.fn(async () => ({ stop, dispose }))
      const useFactory = createFactoryComposable(factory)
      const { result } = mount(() => useFactory())

      await result.load()

      expect(() => result.reset()).not.toThrow()
      expect(stop).toHaveBeenCalledTimes(1)
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledTimes(2)

      warnSpy.mockRestore()
    })
  })
})
