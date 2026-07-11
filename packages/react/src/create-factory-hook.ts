import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal shape reset() probes for on the outgoing instance before discarding it. */
interface MaybeDisposable {
  stop?: () => void
  dispose?: () => void
}

export interface UseFactoryReturn<T, A extends unknown[]> {
  instance: T | null
  loading: boolean
  error: Error | null
  load: (...args: A) => Promise<T>
  reset: () => void
}

export function createFactoryHook<T, A extends unknown[]>(
  factory: (...args: A) => Promise<T>,
) {
  return function useFactory(): UseFactoryReturn<T, A> {
    const [instance, setInstance] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const pending = useRef<Promise<T> | null>(null)
    const created = useRef<T | null>(null)
    const mounted = useRef(true)
    useEffect(() => {
      mounted.current = true
      return () => {
        mounted.current = false
      }
    }, [])

    const load = useCallback((...args: A): Promise<T> => {
      if (created.current)
        return Promise.resolve(created.current)
      if (pending.current)
        return pending.current
      if (mounted.current) {
        setLoading(true)
        setError(null)
      }
      pending.current = factory(...args)
        .then((c) => {
          created.current = c
          if (mounted.current)
            setInstance(c)
          return c
        })
        .catch((e) => {
          const err = e instanceof Error ? e : new Error(String(e))
          if (mounted.current)
            setError(err)
          throw err
        })
        .finally(() => {
          if (mounted.current)
            setLoading(false)
          pending.current = null
        })
      return pending.current
    }, [])

    const reset = useCallback((): void => {
      // R17#1: reset() previously just nulled the ref, orphaning whatever
      // live Worker/timer/node graph the outgoing instance held (Transport,
      // GrainPlayer, LFO, PolySynth, Sequence, Sprite, ...). Mirrors
      // useCleanup()'s disposeAll() — stop() then dispose(), each wrapped so
      // a misbehaving instance can't stop reset() from completing.
      const outgoing = created.current as unknown as MaybeDisposable | null
      if (outgoing) {
        try {
          outgoing.stop?.()
        }
        catch (e) {
          console.warn('[ez-web-audio/react] stop() failed during reset():', e)
        }
        try {
          outgoing.dispose?.()
        }
        catch (e) {
          console.warn('[ez-web-audio/react] dispose() failed during reset():', e)
        }
      }

      created.current = null
      if (mounted.current) {
        setInstance(null)
        setError(null)
      }
      pending.current = null
    }, [])

    return { instance, loading, error, load, reset }
  }
}
