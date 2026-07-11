import { useCallback, useEffect, useRef, useState } from 'react'

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
