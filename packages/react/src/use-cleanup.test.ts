import { act, renderHook } from '@testing-library/react'
import { createElement, StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useCleanup } from './use-cleanup'

describe('useCleanup', () => {
  it('disposes registered objects on unmount, stop() before dispose()', () => {
    const calls: string[] = []
    const disposable = {
      stop: vi.fn(() => calls.push('stop')),
      dispose: vi.fn(() => calls.push('dispose')),
    }

    const { result, unmount } = renderHook(() => useCleanup())
    act(() => {
      result.current.register(disposable)
    })

    expect(disposable.stop).not.toHaveBeenCalled()
    expect(disposable.dispose).not.toHaveBeenCalled()

    unmount()

    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['stop', 'dispose'])
  })

  it('survives objects that throw during cleanup and still cleans the rest', () => {
    const throwingStop = {
      stop: vi.fn(() => { throw new Error('stop boom') }),
      dispose: vi.fn(),
    }
    const throwingDispose = {
      stop: vi.fn(),
      dispose: vi.fn(() => { throw new Error('dispose boom') }),
    }
    const healthy = {
      stop: vi.fn(),
      dispose: vi.fn(),
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result, unmount } = renderHook(() => useCleanup())
    act(() => {
      result.current.register(throwingStop)
      result.current.register(throwingDispose)
      result.current.register(healthy)
    })

    expect(() => unmount()).not.toThrow()

    expect(throwingStop.stop).toHaveBeenCalledTimes(1)
    expect(throwingStop.dispose).toHaveBeenCalledTimes(1)
    expect(throwingDispose.stop).toHaveBeenCalledTimes(1)
    expect(throwingDispose.dispose).toHaveBeenCalledTimes(1)
    expect(healthy.stop).toHaveBeenCalledTimes(1)
    expect(healthy.dispose).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('register returns its argument (identity)', () => {
    const disposable = { stop: vi.fn(), dispose: vi.fn() }
    const { result, unmount } = renderHook(() => useCleanup())

    let returned: typeof disposable | undefined
    act(() => {
      returned = result.current.register(disposable)
    })

    expect(returned).toBe(disposable)
    unmount()
  })

  it('disposeAll clears the set — a second disposeAll/unmount is a no-op (call counts stay 1)', () => {
    const disposable = { stop: vi.fn(), dispose: vi.fn() }
    const { result, unmount } = renderHook(() => useCleanup())

    act(() => {
      result.current.register(disposable)
    })

    act(() => {
      result.current.disposeAll()
    })
    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.disposeAll()
    })
    unmount()

    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)
  })

  it('strict mode: instances registered after the dev double-mount are disposed exactly once on final unmount', () => {
    const disposable = { stop: vi.fn(), dispose: vi.fn() }

    const { result, unmount } = renderHook(() => useCleanup(), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    })

    act(() => {
      result.current.register(disposable)
    })

    expect(disposable.stop).not.toHaveBeenCalled()
    expect(disposable.dispose).not.toHaveBeenCalled()

    unmount()

    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)
  })
})
