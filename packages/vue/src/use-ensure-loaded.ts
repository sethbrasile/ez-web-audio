import type { Ref } from 'vue'
import { ref } from 'vue'

export interface UseEnsureLoadedReturn {
  /** Whether `load` has completed successfully at least once. */
  loaded: Ref<boolean>
  /** Whether a load is currently in flight. */
  loading: Ref<boolean>
  /** Message from the most recent failed load, or `''`. Cleared on retry. */
  error: Ref<string>
  /**
   * Runs `load()` once, memoizing success. Safe to call from every
   * interaction handler that needs the resource — subsequent calls resolve
   * immediately without re-running `load`.
   *
   * @returns `true` if the resource is loaded (already, or just now);
   *   `false` if a load is already in flight, or this attempt failed
   *   (check `error` for the message).
   */
  ensureLoaded: () => Promise<boolean>
}

/**
 * Shared lazy-init guard for demo components that load one or more audio
 * resources on first user interaction rather than behind a loading button
 * (the docs demos' no-load-button / no-layout-shift convention — audio
 * initializes on the user's first real interaction, e.g. clicking Play).
 *
 * Every demo used to hand-roll the same `loaded`/`loading`/`error` refs plus
 * an `ensureLoaded()` that returns `true`/`false` — this factors that out.
 *
 * @param load - Performs the actual resource loading (e.g. `loadSound(url)`
 *   calls from the single-instance factory composables, wrapped in
 *   `cleanup.register()`). Throwing marks the attempt as failed; the error
 *   is captured into `error` and NOT rethrown — callers check the resolved
 *   boolean instead.
 * @param errorMessage - Fallback message when the thrown value isn't an
 *   `Error` instance.
 *
 * @example
 * ```typescript
 * const cleanup = useCleanup()
 * const { instance: sound, load: loadSound } = useSound()
 * const { loading, error, ensureLoaded } = useEnsureLoaded(async () => {
 *   cleanup.register(await loadSound('click.mp3'))
 * }, 'Failed to load sound')
 *
 * async function play() {
 *   if (!(await ensureLoaded()))
 *     return
 *   sound.value?.play()
 * }
 * ```
 */
export function useEnsureLoaded(load: () => Promise<void>, errorMessage = 'Failed to load audio'): UseEnsureLoadedReturn {
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function ensureLoaded(): Promise<boolean> {
    if (loaded.value)
      return true
    if (loading.value)
      return false

    try {
      loading.value = true
      error.value = ''
      await load()
      loaded.value = true
      return true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : errorMessage
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { loaded, loading, error, ensureLoaded }
}
