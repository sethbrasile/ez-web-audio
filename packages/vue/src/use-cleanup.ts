import { getCurrentInstance, onUnmounted } from 'vue'

export interface Disposable {
  dispose?: () => void
  stop?: () => void
}

export function useCleanup(): { register: <T extends Disposable>(d: T) => T, disposeAll: () => void } {
  const disposables = new Set<Disposable>()

  function register<T extends Disposable>(d: T): T {
    disposables.add(d)
    return d
  }

  function disposeAll(): void {
    for (const d of disposables) {
      try {
        d.stop?.()
      }
      catch (e) {
        console.warn('[ez-web-audio/vue] stop() failed during cleanup:', e)
      }
      try {
        d.dispose?.()
      }
      catch (e) {
        console.warn('[ez-web-audio/vue] dispose() failed during cleanup:', e)
      }
    }
    disposables.clear()
  }

  if (getCurrentInstance())
    onUnmounted(disposeAll)

  return { register, disposeAll }
}
