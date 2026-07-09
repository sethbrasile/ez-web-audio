/**
 * Debug message types and formatting utilities.
 *
 * @module debug/messages
 */

/**
 * A debug message representing an event, connection change, or warning.
 */
export interface DebugMessage {
  /** The type of debug message */
  type: 'event' | 'connection' | 'warning'
  /** Sound name or identifier */
  source: string
  /** Human-readable message */
  message: string
  /** Timestamp (audioContext.currentTime or Date.now()) */
  timestamp: number
  /** Optional additional details */
  details?: Record<string, unknown>
}

/**
 * Format a debug message for console output.
 *
 * @param msg - The debug message to format
 * @returns Formatted string for logging
 *
 * @example
 * formatDebugMessage({
 *   type: 'event',
 *   source: 'mySound',
 *   message: 'play',
 *   timestamp: 1.234
 * })
 * // Returns: "[ez-audio:event] [1.234] mySound: play"
 */
export function formatDebugMessage(msg: DebugMessage): string {
  const prefix = `[ez-audio:${msg.type}]`
  const time = msg.timestamp.toFixed(3)
  return `${prefix} [${time}] ${msg.source}: ${msg.message}`
}
