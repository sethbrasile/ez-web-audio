import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createFactoryHook } from './create-factory-hook'

describe('createFactoryHook', () => {
  it('load() resolves and sets instance (re-render observable)', async () => {
    const factory = vi.fn(async (name: string) => ({ id: name }))
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    let created: { id: string } | undefined
    await act(async () => {
      created = await result.current.load('a')
    })

    expect(created).toEqual({ id: 'a' })
    expect(result.current.instance).toEqual({ id: 'a' })
  })

  it('concurrent load() calls during flight share ONE factory invocation', async () => {
    let resolveFactory!: (value: { id: string }) => void
    const factory = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveFactory = resolve
    }))
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    let p1!: Promise<{ id: string }>
    let p2!: Promise<{ id: string }>
    act(() => {
      p1 = result.current.load()
      p2 = result.current.load()
    })

    expect(factory).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFactory({ id: 'shared' })
      await Promise.all([p1, p2])
    })

    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1).toBe(r2)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('repeat load() after resolution still invokes factory once, resolves cached instance (StrictMode idempotence)', async () => {
    const factory = vi.fn(async () => ({ id: 'once' }))
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    let first: { id: string } | undefined
    await act(async () => {
      first = await result.current.load()
    })

    let second: { id: string } | undefined
    await act(async () => {
      second = await result.current.load()
    })

    expect(first).toBe(second)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('factory rejection sets error to an Error instance, promise rethrows, loading false after; later load() retries', async () => {
    const failure = new Error('boom')
    const factory = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ id: 'recovered' })
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    await act(async () => {
      await expect(result.current.load()).rejects.toThrow('boom')
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('boom')
    expect(result.current.loading).toBe(false)
    expect(result.current.instance).toBeNull()

    let retried: { id: string } | undefined
    await act(async () => {
      retried = await result.current.load()
    })

    expect(retried).toEqual({ id: 'recovered' })
    expect(result.current.error).toBeNull()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('loading transitions false -> true -> false around a deferred factory', async () => {
    let resolveFactory!: () => void
    const factory = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveFactory = () => resolve({ id: 'x' })
    }))
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    expect(result.current.loading).toBe(false)

    let pending!: Promise<{ id: string }>
    act(() => {
      pending = result.current.load()
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveFactory()
      await pending
    })

    expect(result.current.loading).toBe(false)
  })

  it('reset() nulls instance so a subsequent load() re-invokes the factory', async () => {
    const factory = vi.fn(async (name: string) => ({ id: name }))
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    let first: { id: string } | undefined
    await act(async () => {
      first = await result.current.load('a')
    })
    expect(result.current.instance).toEqual({ id: 'a' })

    act(() => {
      result.current.reset()
    })

    expect(result.current.instance).toBeNull()

    let second: { id: string } | undefined
    await act(async () => {
      second = await result.current.load('b')
    })

    expect(factory).toHaveBeenCalledTimes(2)
    expect(second).toEqual({ id: 'b' })
    expect(second).not.toBe(first)
    expect(result.current.instance).toEqual({ id: 'b' })
  })

  it('reset() during an in-flight load abandons it; a later load() re-invokes the factory', async () => {
    const factory = vi.fn()
      .mockImplementationOnce(() => new Promise<{ id: string }>(() => {
        // never resolves — simulates an abandoned in-flight load
      }))
      .mockResolvedValueOnce({ id: 'second' })
    const useFactory = createFactoryHook(factory)
    const { result } = renderHook(() => useFactory())

    act(() => {
      void result.current.load()
    })

    expect(factory).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.reset()
    })

    let second: { id: string } | undefined
    await act(async () => {
      second = await result.current.load()
    })

    expect(factory).toHaveBeenCalledTimes(2)
    expect(second).toEqual({ id: 'second' })
  })

  it('unmount mid-load causes no React setState-on-unmounted warnings and the promise still resolves', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    let resolveFactory!: (value: { id: string }) => void
    const factory = vi.fn(() => new Promise<{ id: string }>((resolve) => {
      resolveFactory = resolve
    }))
    const useFactory = createFactoryHook(factory)
    const { result, unmount } = renderHook(() => useFactory())

    let pending!: Promise<{ id: string }>
    act(() => {
      pending = result.current.load()
    })

    unmount()

    let resolved: { id: string } | undefined
    await act(async () => {
      resolveFactory({ id: 'after-unmount' })
      resolved = await pending
    })

    expect(resolved).toEqual({ id: 'after-unmount' })

    const setStateWarnings = consoleError.mock.calls.filter(([msg]) =>
      typeof msg === 'string' && msg.includes('a test was not wrapped in act'))
    expect(setStateWarnings).toHaveLength(0)

    consoleError.mockRestore()
  })
})
