/**
 * Shared AudioContext management module.
 *
 * Provides a singleton AudioContext instance used by all library functions.
 * Factory functions and effect factories import from here to avoid requiring
 * callers to pass AudioContext explicitly.
 *
 * @module audio-context
 * @internal
 */

let _audioContext: AudioContext | null = null

/**
 * Get the shared AudioContext instance, creating it lazily if needed.
 *
 * The library uses a single AudioContext for all audio operations. This function
 * creates the context automatically on first call. Calling code should not cache
 * the result — always call this function to get the current context.
 *
 * @returns The shared AudioContext instance
 * @internal
 */
export function getOrCreateAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

/**
 * Unlock an AudioContext that is in the 'suspended' state.
 *
 * Safari and iOS start the AudioContext in 'suspended' state as a security
 * measure to prevent unwanted audio playback. The Web Audio spec requires a
 * user gesture (click, tap, keypress) to transition the context to 'running'.
 *
 * Without this function, the first audio operation (e.g., playing a synth note)
 * may hang silently because `audioContext.resume()` alone is not sufficient on
 * all browsers — some require the resume to happen inside an event handler
 * triggered by a user gesture.
 *
 * This function registers listeners for common user gesture events (touch, mouse,
 * keyboard) that call `audioContext.resume()`. Once the context resumes, the
 * listeners are cleaned up automatically. If the context is already running,
 * the function returns immediately.
 *
 * @param audioContext - The AudioContext to unlock
 * @internal
 */
export async function unlockAudioContext(audioContext: AudioContext): Promise<void> {
  if (audioContext.state !== 'suspended')
    return

  const b = document.body
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown']

  async function unlock(): Promise<void> {
    await audioContext.resume().then(clean)
  }

  function clean(): void {
    events.forEach(e => b.removeEventListener(e, unlock))
  }

  events.forEach(e => b.addEventListener(e, unlock, false))

  await audioContext.resume()
}

export const iosWorkaround = { performed: false }

/**
 * Mark the iOS workaround as having been performed.
 * @internal
 */
export function markIosWorkaroundPerformed(): void {
  iosWorkaround.performed = true
}

/**
 * Reset the shared AudioContext (for testing only).
 * @internal
 */
export function _resetAudioContext(): void {
  _audioContext = null
  iosWorkaround.performed = false
}
