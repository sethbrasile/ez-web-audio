interface Task {
  id: number
  due: number
  fn: () => void
}

interface SharedScheduler {
  tasks: Task[]
  nextTaskId: number
  rafId: number | null
  now: () => number
  tick: () => void
}

type ContextLike = AudioContext | BaseAudioContext

// One shared scheduler per AudioContext — prevents N independent RAF loops
const schedulers = new WeakMap<object, SharedScheduler>()

function getOrCreateScheduler(audioContext: ContextLike): SharedScheduler {
  let scheduler = schedulers.get(audioContext)
  if (scheduler)
    return scheduler

  scheduler = {
    tasks: [],
    nextTaskId: 1,
    rafId: null,
    now() {
      return audioContext.currentTime * 1000
    },
    tick() {
      const currentTime = scheduler!.now()

      // Call due tasks
      scheduler!.tasks.forEach((task) => {
        if (task.due <= currentTime)
          task.fn()
      })

      // Remove completed tasks
      scheduler!.tasks = scheduler!.tasks.filter(task => task.due > currentTime)

      // Keep running only if tasks remain
      if (scheduler!.tasks.length > 0) {
        scheduler!.rafId = window.requestAnimationFrame(scheduler!.tick)
      }
      else {
        scheduler!.rafId = null
      }
    },
  }

  schedulers.set(audioContext, scheduler)
  return scheduler
}

/**
 * Create AudioContext-aware `setTimeout` and `clearTimeout` functions that use
 * `audioContext.currentTime` and `requestAnimationFrame` instead of native timers.
 *
 * Uses a shared singleton scheduler per AudioContext so that multiple sounds/beats
 * share one RAF loop instead of each creating their own.
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
export default function audioContextAwareTimeout(audioContext: ContextLike): {
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

  const scheduler = getOrCreateScheduler(audioContext)

  return {
    setTimeout(fn: () => void, delayMillis: number) {
      const id = scheduler.nextTaskId
      scheduler.nextTaskId += 1
      scheduler.tasks.push({
        id,
        due: scheduler.now() + delayMillis,
        fn,
      })
      // Start the RAF loop if not already running
      if (scheduler.rafId === null) {
        scheduler.rafId = window.requestAnimationFrame(scheduler.tick)
      }
      return id
    },
    clearTimeout(id: number) {
      scheduler.tasks = scheduler.tasks.filter(t => t.id !== id)
    },
  }
}
