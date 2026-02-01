/**
 * Debug mode for ez-web-audio.
 *
 * Provides logging for play/stop/end events, connection changes, and warnings.
 * Zero runtime overhead when disabled (boolean short-circuit).
 *
 * @module debug
 *
 * @example
 * import { setDebugMode, setDebugHandler } from 'ez-web-audio'
 *
 * // Enable global debug mode
 * setDebugMode(true)
 *
 * // Use custom handler
 * setDebugHandler((msg) => {
 *   myLogger.log(msg.type, msg.source, msg.message)
 * })
 *
 * // Per-sound override
 * sound.debug = false // silences this sound even when global is on
 */

import { setGlobalDebug, setHandler, isGlobalDebugEnabled, log } from './logger'
import type { DebugMessage } from './messages'

export type { DebugMessage }
export { formatDebugMessage } from './messages'

/**
 * Enable or disable global debug mode.
 *
 * When enabled, all sounds will log lifecycle events (play, stop, end),
 * connection changes, and warnings (like suspended AudioContext).
 *
 * @param enabled - Whether to enable debug mode
 *
 * @example
 * setDebugMode(true)
 * await sound.play() // Logs: [ez-audio:event] [0.000] mySound: play
 */
export function setDebugMode(enabled: boolean): void {
  setGlobalDebug(enabled)
}

/**
 * Set a custom debug handler.
 *
 * Pass null to restore the default console.log handler.
 *
 * @param handler - Custom handler function, or null for default
 *
 * @example
 * const messages: DebugMessage[] = []
 * setDebugHandler((msg) => messages.push(msg))
 * // ... run code ...
 * console.log(messages) // All debug messages captured
 */
export function setDebugHandler(handler: ((msg: DebugMessage) => void) | null): void {
  setHandler(handler)
}

/**
 * Interface for objects that can be logged (Sound, Oscillator, etc.)
 */
export interface DebugSource {
  name?: string
  debug?: boolean
}

/**
 * Main logging function - short-circuits immediately when debug disabled.
 *
 * @param source - The sound or object emitting the message
 * @param message - The debug message (without source, which is derived)
 *
 * @example
 * debugLog(this, {
 *   type: 'event',
 *   message: 'play',
 *   timestamp: audioContext.currentTime
 * })
 */
export function debugLog(
  source: DebugSource,
  message: Omit<DebugMessage, 'source'> & { source?: string }
): void {
  // Fast path: if neither global nor per-sound debug, return immediately
  if (!isGlobalDebugEnabled() && !source.debug) return

  // Per-sound override: explicitly false disables even when global is on
  if (source.debug === false) return

  log({
    ...message,
    source: message.source ?? source.name ?? 'unknown'
  })
}

/**
 * Log a lifecycle event (play, stop, end).
 *
 * @param source - The sound emitting the event
 * @param event - Event name (play, stop, end)
 * @param timestamp - audioContext.currentTime
 * @param details - Optional additional details
 */
export function debugEvent(
  source: DebugSource,
  event: string,
  timestamp: number,
  details?: Record<string, unknown>
): void {
  debugLog(source, {
    type: 'event',
    message: event,
    timestamp,
    details
  })
}

/**
 * Log a connection chain change.
 *
 * @param source - The sound with changed connections
 * @param message - Description of the change
 * @param timestamp - audioContext.currentTime
 * @param details - Optional additional details
 */
export function debugConnection(
  source: DebugSource,
  message: string,
  timestamp: number,
  details?: Record<string, unknown>
): void {
  debugLog(source, {
    type: 'connection',
    message,
    timestamp,
    details
  })
}

/**
 * Log a warning (suspended AudioContext, etc.).
 *
 * @param source - The sound with the warning
 * @param message - Warning message
 * @param timestamp - audioContext.currentTime
 * @param details - Optional additional details
 */
export function debugWarning(
  source: DebugSource,
  message: string,
  timestamp: number,
  details?: Record<string, unknown>
): void {
  debugLog(source, {
    type: 'warning',
    message,
    timestamp,
    details
  })
}
