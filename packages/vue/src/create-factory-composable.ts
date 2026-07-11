import type { Ref, ShallowRef } from 'vue'
import { ref, shallowRef } from 'vue'

/** Minimal shape reset() probes for on the outgoing instance before discarding it. */
interface MaybeDisposable {
  stop?: () => void
  dispose?: () => void
}

export interface UseFactoryReturn<T, A extends unknown[]> {
  instance: ShallowRef<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  load: (...args: A) => Promise<T>
  reset: () => void
}

export function createFactoryComposable<T, A extends unknown[]>(
  factory: (...args: A) => Promise<T>,
): () => UseFactoryReturn<T, A> {
  return function useFactory(): UseFactoryReturn<T, A> {
    const instance = shallowRef<T | null>(null)
    const loading = ref(false)
    const error = ref<Error | null>(null)
    let pending: Promise<T> | null = null

    function load(...args: A): Promise<T> {
      if (instance.value)
        return Promise.resolve(instance.value)
      if (pending)
        return pending
      loading.value = true
      error.value = null
      pending = factory(...args)
        .then((created) => {
          instance.value = created
          return created
        })
        .catch((e) => {
          error.value = e instanceof Error ? e : new Error(String(e))
          throw e
        })
        .finally(() => {
          loading.value = false
          pending = null
        })
      return pending
    }

    function reset(): void {
      // R17#1: reset() previously just nulled the ref, orphaning whatever
      // live Worker/timer/node graph the outgoing instance held (Transport,
      // GrainPlayer, LFO, PolySynth, Sequence, Sprite, ...). Mirrors
      // useCleanup()'s disposeAll() — stop() then dispose(), each wrapped so
      // a misbehaving instance can't stop reset() from completing.
      const outgoing = instance.value as unknown as MaybeDisposable | null
      if (outgoing) {
        try {
          outgoing.stop?.()
        }
        catch (e) {
          console.warn('[ez-web-audio/vue] stop() failed during reset():', e)
        }
        try {
          outgoing.dispose?.()
        }
        catch (e) {
          console.warn('[ez-web-audio/vue] dispose() failed during reset():', e)
        }
      }

      instance.value = null
      error.value = null
      pending = null
    }

    return { instance, loading, error, load, reset }
  }
}
