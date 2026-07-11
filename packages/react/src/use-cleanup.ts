import { useCallback, useEffect, useRef } from 'react'

export interface Disposable {
  dispose?: () => void
  stop?: () => void
}

export function useCleanup(): { register: <T extends Disposable>(d: T) => T, disposeAll: () => void } {
  const disposables = useRef<Set<Disposable>>(new Set())

  const register = useCallback(<T extends Disposable>(d: T): T => {
    disposables.current.add(d)
    return d
  }, [])

  const disposeAll = useCallback((): void => {
    for (const d of disposables.current) {
      try {
        d.stop?.()
      }
      catch (e) {
        console.warn('[ez-web-audio/react] stop() failed during cleanup:', e)
      }
      try {
        d.dispose?.()
      }
      catch (e) {
        console.warn('[ez-web-audio/react] dispose() failed during cleanup:', e)
      }
    }
    disposables.current.clear()
  }, [])

  // Registrations live in a ref, not component state, so re-renders never
  // reset them. The teardown closure reads `disposables.current` at the
  // moment it runs, not at the moment it was created — so under React
  // StrictMode's dev-only mount/cleanup/mount double-invoke, whatever is
  // registered by the time the *final* unmount fires gets disposed exactly
  // once, regardless of which render produced this effect instance.
  useEffect(() => {
    return () => {
      disposeAll()
    }
  }, [])

  return { register, disposeAll }
}
