/**
 * Internal debug logger state and handler management.
 *
 * @module debug/logger
 * @internal
 */

import type { DebugMessage } from './messages'
import { formatDebugMessage } from './messages'

let globalDebugEnabled = false
let debugHandler: ((msg: DebugMessage) => void) | null = null

/**
 * Set the global debug enabled state.
 * @internal
 */
export function setGlobalDebug(enabled: boolean): void {
  globalDebugEnabled = enabled
}

/**
 * Check if global debug is enabled.
 * @internal
 */
export function isGlobalDebugEnabled(): boolean {
  return globalDebugEnabled
}

/**
 * Set a custom debug handler.
 * @internal
 */
export function setHandler(handler: ((msg: DebugMessage) => void) | null): void {
  debugHandler = handler
}

/**
 * Get the current debug handler.
 * @internal
 */
export function getHandler(): ((msg: DebugMessage) => void) | null {
  return debugHandler
}

/**
 * Default handler that logs to console.
 */
function defaultHandler(msg: DebugMessage): void {
  console.log(formatDebugMessage(msg), msg.details ?? '')
}

/**
 * Log a debug message using the current handler.
 * @internal
 */
export function log(msg: DebugMessage): void {
  const handler = debugHandler ?? defaultHandler
  handler(msg)
}
