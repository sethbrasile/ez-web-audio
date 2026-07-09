import { describe, expect, it, vi } from 'vitest'
import { mount } from './test-utils'
import { useCleanup } from './use-cleanup'

describe('useCleanup', () => {
  it('disposes registered objects on unmount, stop() before dispose()', () => {
    const calls: string[] = []
    const disposable = {
      stop: vi.fn(() => calls.push('stop')),
      dispose: vi.fn(() => calls.push('dispose')),
    }

    const { result, unmount } = mount(() => {
      const { register } = useCleanup()
      register(disposable)
      return {}
    })
    void result

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

    const { unmount } = mount(() => {
      const { register } = useCleanup()
      register(throwingStop)
      register(throwingDispose)
      register(healthy)
      return {}
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
    let returned: typeof disposable | undefined

    const { unmount } = mount(() => {
      const { register } = useCleanup()
      returned = register(disposable)
      return {}
    })

    expect(returned).toBe(disposable)
    unmount()
  })

  it('disposeAll clears the set — a second disposeAll/unmount is a no-op (call counts stay 1)', () => {
    const disposable = { stop: vi.fn(), dispose: vi.fn() }
    let disposeAllRef!: () => void

    const { unmount } = mount(() => {
      const { register, disposeAll } = useCleanup()
      register(disposable)
      disposeAllRef = disposeAll
      return {}
    })

    disposeAllRef()
    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)

    disposeAllRef()
    unmount()

    expect(disposable.stop).toHaveBeenCalledTimes(1)
    expect(disposable.dispose).toHaveBeenCalledTimes(1)
  })
})
