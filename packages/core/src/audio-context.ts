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
import { validateGain } from '@utils/validate-param'

let _audioContext: AudioContext | null = null

/**
 * Optional global master destination. When set, every newly-created audio
 * instance routes its final output here instead of `audioContext.destination`,
 * enabling a shared master bus (limiter, metering, sub-mixing, offline render).
 * `null` means "use the real hardware destination". @internal
 */
let _masterDestination: AudioNode | null = null

/**
 * Get the current global master destination, or `null` if none is set.
 *
 * Instance constructors call this to decide their default output node. It is
 * exported publicly via the package index as {@link getMasterDestination}.
 * @internal
 */
export function getMasterDestination(): AudioNode | null {
  return _masterDestination
}

/**
 * Set (or clear) the global master destination that new instances route through.
 *
 * The node MUST belong to the shared library AudioContext (the one returned by
 * `getAudioContext()`), since Web Audio nodes cannot connect across contexts.
 * Pass `null` to restore routing to the hardware destination. Only instances
 * created AFTER this call pick up the new destination; existing instances keep
 * their current routing (use `instance.setDestination(node)` to move those).
 * @internal
 */
export function setMasterDestination(node: AudioNode | null): void {
  _masterDestination = node
}

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
  if (!_audioContext || _audioContext.state === 'closed') {
    if (_audioContext?.state === 'closed') {
      console.warn(
        'ez-web-audio: Previous AudioContext was closed. Creating a new one. '
        + 'Any sounds created with the old context are now orphaned and should be disposed.',
      )
    }
    _audioContext = new AudioContext()
  }
  return _audioContext
}

// ─── Global Volume / Mute (R2#7) ──────────────────────────────────────────

/** The managed GainNode created lazily by setGlobalVolume()/muteAll(). @internal */
let _globalGainNode: GainNode | null = null
/** Last value passed to setGlobalVolume(), restored when muteAll(false) runs. @internal */
let _globalVolume = 1
/** Current mute state, applied on top of _globalVolume. @internal */
let _globalMuted = false

/**
 * Lazily create (or return the existing) managed master GainNode and route it
 * through {@link setMasterDestination} so every instance created after the
 * first `setGlobalVolume()`/`muteAll()` call passes through it automatically.
 *
 * Same caveat as `setMasterDestination()` itself: only instances created
 * AFTER this runs pick up the managed gain — existing instances keep their
 * current routing. If you already called `setMasterDestination()` yourself
 * (e.g. to install a limiter), call `setGlobalVolume()`/`muteAll()` BEFORE
 * that so your own bus takes over the master routing last, or route your bus
 * through `getGlobalVolumeNode()` explicitly instead of the hardware destination.
 * @internal
 */
function getOrCreateManagedMasterGain(): GainNode {
  if (_globalGainNode)
    return _globalGainNode

  const audioContext = getOrCreateAudioContext()
  const gain = audioContext.createGain()
  gain.gain.value = _globalMuted ? 0 : _globalVolume
  gain.connect(audioContext.destination)
  setMasterDestination(gain)
  _globalGainNode = gain
  return gain
}

/**
 * Set the global volume applied to every sound routed through the shared
 * master bus (lazily created on first call via {@link setMasterDestination}).
 *
 * Only instances created AFTER the first `setGlobalVolume()`/`muteAll()` call
 * pick up the managed bus — call this early (e.g. at app startup) if you want
 * it to affect everything. Existing instances keep their prior routing; move
 * them with `instance.setDestination(getGlobalVolumeNode())` if needed.
 *
 * @param value - Volume from 0 (silent) to 1 (full). Throws for negative values,
 *   warns on the console for values above 1 — same rule as `BaseSound.changeGainTo()`.
 *
 * @example
 * ```typescript
 * import { setGlobalVolume } from 'ez-web-audio'
 *
 * setGlobalVolume(0.5) // halve the volume of everything created from here on
 * ```
 */
export function setGlobalVolume(value: number): void {
  validateGain(value)
  _globalVolume = value
  const gain = getOrCreateManagedMasterGain()
  if (!_globalMuted) {
    gain.gain.setValueAtTime(value, getOrCreateAudioContext().currentTime)
  }
}

/**
 * Mute or unmute every sound routed through the shared master bus (lazily
 * created on first call via {@link setMasterDestination}).
 *
 * Unmuting restores the volume last set via {@link setGlobalVolume} (default 1).
 * Same "only instances created after the first call" caveat as {@link setGlobalVolume}.
 *
 * @param muted - `true` to silence everything, `false` to restore the last volume
 *
 * @example
 * ```typescript
 * import { muteAll } from 'ez-web-audio'
 *
 * muteAll(true)  // silence everything
 * muteAll(false) // restore previous volume
 * ```
 */
export function muteAll(muted: boolean): void {
  _globalMuted = muted
  const gain = getOrCreateManagedMasterGain()
  gain.gain.setValueAtTime(muted ? 0 : _globalVolume, getOrCreateAudioContext().currentTime)
}

/**
 * In-flight unlock state, keyed by AudioContext instance. Shared across
 * calls so that multiple pre-gesture factory calls (e.g. several
 * `createSound()`s fired before the user has interacted yet) register the
 * gesture listeners exactly once and await the same promise, instead of each
 * call independently registering + orphaning its own set of 4 body
 * listeners. @internal
 */
const _pendingUnlocks = new WeakMap<AudioContext, Promise<void>>()

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
 * Concurrent calls for the same AudioContext share one listener registration
 * and one promise — calling this from several pre-gesture factory functions
 * in a row does not multiply the number of body listeners registered.
 *
 * @param audioContext - The AudioContext to unlock
 * @internal
 */
export async function unlockAudioContext(audioContext: AudioContext): Promise<void> {
  if (audioContext.state !== 'suspended')
    return

  const existing = _pendingUnlocks.get(audioContext)
  if (existing)
    return existing

  const b = document.body
  const events = ['touchstart', 'touchend', 'mousedown', 'keydown']

  function clean(): void {
    events.forEach(e => b.removeEventListener(e, unlock))
    _pendingUnlocks.delete(audioContext)
  }

  async function unlock(): Promise<void> {
    await audioContext.resume().then(clean)
  }

  events.forEach(e => b.addEventListener(e, unlock, false))

  const unlockPromise = audioContext.resume()
  _pendingUnlocks.set(audioContext, unlockPromise)
  return unlockPromise
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
  _masterDestination = null
  iosWorkaround.performed = false
  _globalGainNode = null
  _globalVolume = 1
  _globalMuted = false
}
