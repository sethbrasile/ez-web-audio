import type { Ref, ShallowRef } from 'vue'
import { ref, shallowRef } from 'vue'

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
      instance.value = null
      error.value = null
      pending = null
    }

    return { instance, loading, error, load, reset }
  }
}
