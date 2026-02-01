import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setDebugMode,
  setDebugHandler,
  debugLog,
  debugEvent,
  debugConnection,
  debugWarning,
  formatDebugMessage,
  type DebugMessage
} from './index'

describe('Debug Module', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset state before each test
    setDebugMode(false)
    setDebugHandler(null)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    setDebugMode(false)
    setDebugHandler(null)
  })

  describe('setDebugMode', () => {
    it('enables global debug when set to true', () => {
      setDebugMode(true)
      const source = { name: 'test' }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('disables global debug when set to false', () => {
      setDebugMode(false)
      const source = { name: 'test' }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('debugLog', () => {
    it('logs message when global debug is enabled', () => {
      setDebugMode(true)
      const source = { name: 'mySound' }

      debugLog(source, { type: 'event', message: 'play', timestamp: 1.234 })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [1.234] mySound: play',
        ''
      )
    })

    it('does not log when global debug is disabled and no per-sound override', () => {
      setDebugMode(false)
      const source = { name: 'test' }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('logs when per-sound debug=true even when global is off', () => {
      setDebugMode(false)
      const source = { name: 'test', debug: true }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('does not log when per-sound debug=false even when global is on', () => {
      setDebugMode(true)
      const source = { name: 'test', debug: false }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('uses "unknown" when source has no name', () => {
      setDebugMode(true)
      const source = {}

      debugLog(source, { type: 'event', message: 'test', timestamp: 0 })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [0.000] unknown: test',
        ''
      )
    })

    it('uses message.source when provided', () => {
      setDebugMode(true)
      const source = { name: 'ignored' }

      debugLog(source, {
        type: 'event',
        message: 'test',
        timestamp: 0,
        source: 'customSource'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [0.000] customSource: test',
        ''
      )
    })

    it('passes details to console', () => {
      setDebugMode(true)
      const source = { name: 'test' }
      const details = { foo: 'bar', count: 42 }

      debugLog(source, { type: 'event', message: 'test', timestamp: 0, details })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [0.000] test: test',
        details
      )
    })
  })

  describe('setDebugHandler', () => {
    it('routes messages to custom handler', () => {
      setDebugMode(true)
      const messages: DebugMessage[] = []
      setDebugHandler((msg) => messages.push(msg))

      const source = { name: 'test' }
      debugLog(source, { type: 'event', message: 'play', timestamp: 1.5 })

      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual({
        type: 'event',
        source: 'test',
        message: 'play',
        timestamp: 1.5
      })
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('restores default console handler when set to null', () => {
      setDebugMode(true)
      const messages: DebugMessage[] = []
      setDebugHandler((msg) => messages.push(msg))

      // First message goes to custom handler
      debugLog({ name: 'test' }, { type: 'event', message: 'first', timestamp: 0 })
      expect(messages).toHaveLength(1)
      expect(consoleSpy).not.toHaveBeenCalled()

      // Restore default handler
      setDebugHandler(null)

      // Second message goes to console
      debugLog({ name: 'test' }, { type: 'event', message: 'second', timestamp: 0 })
      expect(messages).toHaveLength(1) // Still 1, not added to custom
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('custom handler receives correct DebugMessage structure', () => {
      setDebugMode(true)
      let receivedMsg: DebugMessage | null = null
      setDebugHandler((msg) => { receivedMsg = msg })

      const details = { startOffset: 0.5 }
      debugLog({ name: 'mySound' }, {
        type: 'warning',
        message: 'AudioContext suspended',
        timestamp: 2.345,
        details
      })

      expect(receivedMsg).not.toBeNull()
      expect(receivedMsg!.type).toBe('warning')
      expect(receivedMsg!.source).toBe('mySound')
      expect(receivedMsg!.message).toBe('AudioContext suspended')
      expect(receivedMsg!.timestamp).toBe(2.345)
      expect(receivedMsg!.details).toEqual(details)
    })
  })

  describe('convenience helpers', () => {
    beforeEach(() => {
      setDebugMode(true)
    })

    it('debugEvent logs event type', () => {
      debugEvent({ name: 'sound1' }, 'play', 1.0, { startOffset: 0 })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [1.000] sound1: play',
        { startOffset: 0 }
      )
    })

    it('debugConnection logs connection type', () => {
      debugConnection({ name: 'sound2' }, 'Effect chain wired', 2.5, { count: 3 })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:connection] [2.500] sound2: Effect chain wired',
        { count: 3 }
      )
    })

    it('debugWarning logs warning type', () => {
      debugWarning({ name: 'sound3' }, 'AudioContext suspended', 0, { state: 'suspended' })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:warning] [0.000] sound3: AudioContext suspended',
        { state: 'suspended' }
      )
    })

    it('helpers work without details', () => {
      debugEvent({ name: 'test' }, 'stop', 5.0)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ez-audio:event] [5.000] test: stop',
        ''
      )
    })
  })

  describe('formatDebugMessage', () => {
    it('formats message correctly', () => {
      const msg: DebugMessage = {
        type: 'event',
        source: 'mySound',
        message: 'play',
        timestamp: 1.234
      }

      const formatted = formatDebugMessage(msg)

      expect(formatted).toBe('[ez-audio:event] [1.234] mySound: play')
    })

    it('formats different types', () => {
      expect(formatDebugMessage({
        type: 'warning',
        source: 'test',
        message: 'warn',
        timestamp: 0
      })).toBe('[ez-audio:warning] [0.000] test: warn')

      expect(formatDebugMessage({
        type: 'connection',
        source: 'test',
        message: 'connected',
        timestamp: 10.5
      })).toBe('[ez-audio:connection] [10.500] test: connected')
    })

    it('handles precise timestamps', () => {
      const msg: DebugMessage = {
        type: 'event',
        source: 'test',
        message: 'test',
        timestamp: 123.456789
      }

      const formatted = formatDebugMessage(msg)

      expect(formatted).toBe('[ez-audio:event] [123.457] test: test')
    })
  })
})
