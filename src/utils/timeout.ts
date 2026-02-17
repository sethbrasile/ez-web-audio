import type { AudioContext as AudioContextMock } from 'standardized-audio-context-mock'

interface Task {
  id: number
  due: number
  fn: () => void
}

/**
 * Create AudioContext-aware `setTimeout` and `clearTimeout` functions that use
 * `audioContext.currentTime` and `requestAnimationFrame` instead of native timers.
 *
 * Browser tabs that are backgrounded or hidden can have native `setTimeout` throttled
 * to fire as infrequently as once per second, causing visual beat indicators and other
 * UI timing to drift out of sync with audio playback. This utility avoids that drift
 * by driving all timer checks through `requestAnimationFrame` and measuring elapsed time
 * using `audioContext.currentTime`, which always advances at audio-clock speed regardless
 * of tab visibility.
 *
 * **When to use:** Any UI timing that needs to stay in sync with audio playback —
 * visual beat indicators, countdowns, progress bars, or any scheduled UI update
 * tied to musical timing.
 *
 * **Graceful fallback:** If no `audioContext` is provided the function falls back to
 * native `window.setTimeout`/`window.clearTimeout` and logs a warning. This keeps
 * code working even if audio has not been initialized yet.
 *
 * @param audioContext - The AudioContext (or BaseAudioContext) driving playback
 * @returns An object with `setTimeout` and `clearTimeout` that mirror the native API
 *
 * @example
 * ```typescript
 * import { getAudioContext, audioContextAwareTimeout } from 'ez-web-audio'
 *
 * // Get the shared AudioContext
 * const ctx = await getAudioContext()
 *
 * // Create audio-aware timer functions
 * const { setTimeout, clearTimeout } = audioContextAwareTimeout(ctx)
 *
 * // Use just like native timers — they stay in sync with audio even in background tabs
 * const id = setTimeout(() => {
 *   flashBeatIndicator()
 * }, 500)
 *
 * // Cancel if needed
 * clearTimeout(id)
 * ```
 */
export default function audioContextAwareTimeout(audioContext: AudioContext | BaseAudioContext | AudioContextMock): {
  setTimeout: (fn: () => void, delayMillis: number) => number
  clearTimeout: (id: number) => void
} {
  if (!audioContext) {
    console.warn(`ez-web-audio: AudioContext was not available when an entity was created and timing tasks will therefore use javascript native \
setTimeout instead of AudioContext-aware versions. Please ensure to await initAudio before instantiating any timing-sensitive entities. If your application \
is behaving as you'd hope, you can safely ignore this message.`)
    return {
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    }
  }

  let tasks: Task[] = []
  let nextTaskId = 1

  function now(): number {
    return audioContext.currentTime * 1000
  }

  function scheduler(): void {
    const currentTime = now()

    // Call due tasks
    tasks.forEach((task) => {
      if (task.due <= currentTime)
        task.fn()
    })

    // Then remove them from the list.
    tasks = tasks.filter(task => task.due > currentTime)

    // More tasks pending, keep calling the scheduler.
    if (tasks.length > 0) {
      window.requestAnimationFrame(scheduler)
    }
  }

  return {
    setTimeout(fn: () => void, delayMillis: number) {
      const id = nextTaskId
      nextTaskId += 1
      tasks.push({
        id,
        due: now() + delayMillis,
        fn,
      })
      if (tasks.length === 1) {
        window.requestAnimationFrame(scheduler)
      }
      return id
    },
    clearTimeout(id: number) {
      tasks = tasks.filter(t => t.id !== id)
    },
  }
}
