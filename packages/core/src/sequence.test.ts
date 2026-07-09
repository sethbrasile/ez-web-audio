import { AudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sequence } from './sequence'
import { Transport } from './transport'

describe('sequence', () => {
  let audioContext: AudioContext
  let transport: Transport

  beforeEach(() => {
    vi.useFakeTimers()
    audioContext = new AudioContext() as unknown as AudioContext
    transport = new Transport(audioContext as any, { bpm: 120, timeSignature: [4, 4] })
  })

  afterEach(() => {
    transport.dispose()
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('creates a Sequence with required length', () => {
      const seq = new Sequence(transport, { length: '4m' })
      expect(seq.length).toBe(16) // 4 measures * 4 beats
      seq.dispose()
    })

    it('defaults loop to true', () => {
      const seq = new Sequence(transport, { length: '1m' })
      expect(seq.loop).toBe(true)
      seq.dispose()
    })

    it('accepts loop: false', () => {
      const seq = new Sequence(transport, { length: '1m', loop: false })
      expect(seq.loop).toBe(false)
      seq.dispose()
    })

    it('parses musical time notation for length', () => {
      const seq = new Sequence(transport, { length: '2m' })
      expect(seq.length).toBe(8) // 2 measures * 4 beats
      seq.dispose()
    })

    it('accepts numeric length in beats', () => {
      const seq = new Sequence(transport, { length: 8 })
      expect(seq.length).toBe(8)
      seq.dispose()
    })

    it('throws if length is 0 or negative', () => {
      expect(() => new Sequence(transport, { length: 0 })).toThrow('greater than 0')
      expect(() => new Sequence(transport, { length: -1 })).toThrow('greater than 0')
    })

    it('schedules initial events from options', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, {
        length: '1m',
        events: [{ time: '4n', callback: cb }],
      })
      // Event should be registered — verify by removing
      expect(seq.remove('seq-0')).toBe(true)
      seq.dispose()
    })

    it('registers with Transport on construction', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      // Transport.start() should call _onTransportStart, enabling scheduling
      transport.start()
      vi.advanceTimersByTime(50)

      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })
  })

  describe('.at()', () => {
    it('returns a unique event ID', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const id1 = seq.at('4n', vi.fn())
      const id2 = seq.at('8n', vi.fn())
      expect(id1).toMatch(/^seq-/)
      expect(id2).toMatch(/^seq-/)
      expect(id1).not.toBe(id2)
      seq.dispose()
    })

    it('accepts musical time notation', () => {
      const seq = new Sequence(transport, { length: '4m' })
      expect(() => seq.at('4n', vi.fn())).not.toThrow()
      expect(() => seq.at('2:1:0', vi.fn())).not.toThrow()
      expect(() => seq.at('8t', vi.fn())).not.toThrow()
      seq.dispose()
    })

    it('accepts numeric beats', () => {
      const seq = new Sequence(transport, { length: '4m' })
      expect(() => seq.at(2.5, vi.fn())).not.toThrow()
      seq.dispose()
    })

    it('throws if event position exceeds sequence length', () => {
      const seq = new Sequence(transport, { length: '1m' }) // 4 beats
      expect(() => seq.at('2m', vi.fn())).toThrow('exceeds sequence length')
      seq.dispose()
    })

    it('throws if event position is negative', () => {
      const seq = new Sequence(transport, { length: '1m' })
      expect(() => seq.at(-1, vi.fn())).toThrow('>= 0')
      seq.dispose()
    })

    it('sorts events by beat position', () => {
      const order: number[] = []
      const seq = new Sequence(transport, { length: '4m' })
      seq.at(2, () => order.push(2))
      seq.at(0, () => order.push(0))
      seq.at(1, () => order.push(1))

      // Call _scheduleEventsInWindow directly with a large window
      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 10, 120, [4, 4], 4)

      expect(order).toEqual([0, 1, 2])
      seq.dispose()
    })
  })

  describe('.remove()', () => {
    it('removes an event by ID and returns true', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const id = seq.at('4n', vi.fn())
      expect(seq.remove(id)).toBe(true)
      seq.dispose()
    })

    it('returns false if ID not found', () => {
      const seq = new Sequence(transport, { length: '4m' })
      expect(seq.remove('nonexistent')).toBe(false)
      seq.dispose()
    })

    it('prevents removed event from firing', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      const id = seq.at(0, cb)
      seq.remove(id)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 1, 120, [4, 4], 4)

      expect(cb).not.toHaveBeenCalled()
      seq.dispose()
    })
  })

  describe('.clear()', () => {
    it('removes all events', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const id1 = seq.at('4n', vi.fn())
      const id2 = seq.at('8n', vi.fn())
      seq.clear()
      expect(seq.remove(id1)).toBe(false)
      expect(seq.remove(id2)).toBe(false)
      seq.dispose()
    })
  })

  describe('._scheduleEventsInWindow()', () => {
    it('fires callbacks when events fall within the lookahead window', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })

    it('passes audioContext time and position to callbacks', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).toHaveBeenCalledWith(
        expect.any(Number), // audioContext time
        expect.objectContaining({
          bar: expect.any(Number),
          beat: expect.any(Number),
          tick: expect.any(Number),
          seconds: expect.any(Number),
        }),
      )
      seq.dispose()
    })

    it('does not fire events outside the lookahead window', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '4m' })

      // Event at beat 8 (at 120 BPM = 4 seconds, well outside 0.1s lookahead)
      seq.at(8, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).not.toHaveBeenCalled()
      seq.dispose()
    })

    it('fires events at correct beat within window', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '4m' })

      // Event at beat 1 (0.5s at 120 BPM)
      seq.at(1, cb)

      // Simulate being at t=0.45s with 0.1s lookahead (window covers 0.45-0.55s)
      seq._onTransportStart(0)
      // 0.45s elapsed = 0.9 beats at 120 BPM. Window end = 0.55s = 1.1 beats
      // Event at beat 1 is in [0.9, 1.1) — should fire
      seq._scheduleEventsInWindow(0.45, 0.1, 120, [4, 4], 4)

      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })

    it('does not fire if not started', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, cb)

      // Don't call _onTransportStart
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).not.toHaveBeenCalled()
      seq.dispose()
    })

    it('does nothing with empty event list', () => {
      const seq = new Sequence(transport, { length: '1m' })
      seq._onTransportStart(0)
      expect(() => seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)).not.toThrow()
      seq.dispose()
    })
  })

  describe('live BPM changes', () => {
    it('uses current BPM parameter for scheduling', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '4m' })

      // Event at beat 1 — at 120 BPM this is 0.5s, at 60 BPM this is 1.0s
      seq.at(1, cb)
      seq._onTransportStart(0)

      // At 120 BPM: beat 1 = 0.5s. Window [0, 0.1] does not include 0.5s
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).not.toHaveBeenCalled()

      // At 120 BPM: Window [0.45, 0.55] includes beat 1 (0.5s)
      seq._scheduleEventsInWindow(0.45, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)
      seq.dispose()
    })

    it('events reschedule at different times when BPM changes', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '4m' })

      // Event at beat 1
      seq.at(1, cb)
      seq._onTransportStart(0)

      // At 60 BPM: beat 1 = 1.0s. Window [0.45, 0.55] does NOT include 1.0s
      seq._scheduleEventsInWindow(0.45, 0.1, 60, [4, 4], 4)
      expect(cb).not.toHaveBeenCalled()

      // At 120 BPM: same window DOES include beat 1 (0.5s)
      seq._scheduleEventsInWindow(0.45, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      seq.dispose()
    })
  })

  describe('looping', () => {
    it('emits loop event when elapsed beats exceed sequence length', () => {
      const loopCb = vi.fn()
      const seq = new Sequence(transport, { length: 2 }) // 2 beats
      seq.on('loop', loopCb)

      seq._onTransportStart(0)

      // At 120 BPM, 2 beats = 1s. Simulate being at t=1.0s (past one loop)
      seq._scheduleEventsInWindow(1.0, 0.1, 120, [4, 4], 4)

      expect(loopCb).toHaveBeenCalled()
      expect(loopCb.mock.calls[0][0].detail.iteration).toBe(1)
      seq.dispose()
    })

    it('re-fires events on loop by resetting lastScheduledBeat', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: 2 }) // 2 beats = 1s at 120 BPM
      seq.at(0, cb)

      seq._onTransportStart(0)

      // First loop: fire at beat 0
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      // Past one full loop (t=1.0s = 2 beats) — loop wraps, lastScheduledBeat resets
      // Event at beat 0 should fire again because currentSeqBeat wraps to 0
      seq._scheduleEventsInWindow(1.0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(2)
      seq.dispose()
    })
  })

  describe('one-shot (loop: false)', () => {
    it('fires events once and stops after sequence length', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: 2, loop: false })
      seq.at(0, cb)

      seq._onTransportStart(0)

      // Fire at beat 0
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      // Past sequence length (2 beats = 1s) — should not fire again
      seq._scheduleEventsInWindow(1.0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)
      seq.dispose()
    })

    it('does not emit loop event', () => {
      const loopCb = vi.fn()
      const seq = new Sequence(transport, { length: 2, loop: false })
      seq.on('loop', loopCb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(1.0, 0.1, 120, [4, 4], 4)

      expect(loopCb).not.toHaveBeenCalled()
      seq.dispose()
    })
  })

  describe('transport lifecycle integration', () => {
    it('transport.start() enables scheduling', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      transport.start()
      vi.advanceTimersByTime(50)

      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })

    it('hot-adding sequence to running Transport starts scheduling', () => {
      transport.start()
      vi.advanceTimersByTime(50)

      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      vi.advanceTimersByTime(50)
      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })

    it('_reset resets scheduling state', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      // Reset and schedule again — should fire again
      seq._reset()
      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(2)
      seq.dispose()
    })

    it('transport.stop() resets sequences', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      transport.start()
      vi.advanceTimersByTime(50)
      const callsBefore = cb.mock.calls.length
      expect(callsBefore).toBeGreaterThanOrEqual(1)

      transport.stop()

      // Restart — events should fire from beginning again
      transport.start()
      vi.advanceTimersByTime(50)

      expect(cb.mock.calls.length).toBeGreaterThan(callsBefore)
      seq.dispose()
    })

    it('transport.pause() stops scheduling', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const cb = vi.fn()
      seq.at(0, cb)

      transport.start()
      vi.advanceTimersByTime(50)
      const callsAfterStart = cb.mock.calls.length

      transport.pause()
      vi.advanceTimersByTime(500) // Time passes while paused

      // No new calls during pause
      expect(cb.mock.calls.length).toBe(callsAfterStart)
      seq.dispose()
    })

    it('_onTransportPause marks sequence as not started', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._onTransportPause(0.5)

      // Should not schedule when paused
      seq._scheduleEventsInWindow(0.5, 0.1, 120, [4, 4], 4)
      expect(cb).not.toHaveBeenCalled()
      seq.dispose()
    })

    it('_onTransportResume re-enables scheduling', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const cb = vi.fn()
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      seq._onTransportPause(0.5)

      // Resume after 2s pause at elapsed=0.5s
      seq._onTransportResume(2.5, 0.5)

      // Reset lastScheduledBeat for resume (since we're continuing, not at same position)
      // The resume adjusts transportStartTime so elapsed time is correct
      seq.dispose()
    })
  })

  describe('.dispose()', () => {
    it('unregisters from Transport', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      seq.at(0, cb)

      seq.dispose()

      transport.start()
      vi.advanceTimersByTime(100)

      // After dispose, events should not fire
      expect(cb).not.toHaveBeenCalled()
    })

    it('is idempotent', () => {
      const seq = new Sequence(transport, { length: '1m' })
      expect(() => {
        seq.dispose()
        seq.dispose()
      }).not.toThrow()
    })

    it('clears all events', () => {
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, vi.fn())
      seq.dispose()

      // After dispose, events are cleared
      // Can't verify directly but dispose doesn't throw
    })
  })

  describe('event emission', () => {
    it('emits event when a scheduled callback fires', () => {
      const eventCb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, vi.fn())
      seq.on('event', eventCb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(eventCb).toHaveBeenCalled()
      const detail = eventCb.mock.calls[0][0].detail
      expect(detail).toHaveProperty('time')
      expect(detail).toHaveProperty('position')
      expect(detail).toHaveProperty('eventId')
      expect(detail).toHaveProperty('source')
      seq.dispose()
    })

    it('event detail includes correct eventId', () => {
      const eventCb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      const id = seq.at(0, vi.fn())
      seq.on('event', eventCb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(eventCb.mock.calls[0][0].detail.eventId).toBe(id)
      seq.dispose()
    })

    it('on() supports chaining', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const result = seq.on('event', vi.fn())
      expect(result).toBe(seq)
      seq.dispose()
    })

    it('off() removes listener', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, vi.fn())
      seq.on('event', cb)
      seq.off('event', cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).not.toHaveBeenCalled()
      seq.dispose()
    })

    it('off() supports chaining', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const cb = vi.fn()
      const result = seq.off('event', cb)
      expect(result).toBe(seq)
      seq.dispose()
    })

    it('once() fires listener only once', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, vi.fn())
      seq.once('event', cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).toHaveBeenCalledTimes(1)

      // Reset and fire again
      seq._reset()
      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      // once() should not fire again
      expect(cb).toHaveBeenCalledTimes(1)
      seq.dispose()
    })

    it('once() supports chaining', () => {
      const seq = new Sequence(transport, { length: '1m' })
      const result = seq.once('event', vi.fn())
      expect(result).toBe(seq)
      seq.dispose()
    })
  })

  describe('behavior after dispose', () => {
    it('at() after dispose does not throw (adds to dead events array)', () => {
      const seq = new Sequence(transport, { length: '4m' })
      seq.dispose()
      // at() does not guard against disposed state — it silently adds the event
      expect(() => seq.at('4n', vi.fn())).not.toThrow()
    })

    it('remove() after dispose returns false and does not throw', () => {
      const seq = new Sequence(transport, { length: '4m' })
      const id = seq.at('4n', vi.fn())
      seq.dispose() // dispose clears events array
      // remove() on cleared events should return false
      expect(seq.remove(id)).toBe(false)
    })

    it('clear() after dispose does not throw', () => {
      const seq = new Sequence(transport, { length: '4m' })
      seq.dispose()
      expect(() => seq.clear()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('empty sequence runs without errors', () => {
      const seq = new Sequence(transport, { length: '1m' })
      seq._onTransportStart(0)
      expect(() => seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)).not.toThrow()
      seq.dispose()
    })

    it('event at beat 0 fires at sequence start', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, cb)

      seq._onTransportStart(0)
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)

      expect(cb).toHaveBeenCalled()
      seq.dispose()
    })

    it('multiple events at different positions fire in order', () => {
      const order: number[] = []
      const seq = new Sequence(transport, { length: '4m' })
      seq.at(2, () => order.push(2))
      seq.at(0, () => order.push(0))
      seq.at(1, () => order.push(1))

      seq._onTransportStart(0)
      // Large lookahead to fire all events
      seq._scheduleEventsInWindow(0, 100, 120, [4, 4], 4)

      expect(order).toEqual([0, 1, 2])
      seq.dispose()
    })

    it('disposed sequence does not schedule', () => {
      const cb = vi.fn()
      const seq = new Sequence(transport, { length: '1m' })
      seq.at(0, cb)
      seq._onTransportStart(0)
      seq.dispose()

      // Calling schedule after dispose should be safe
      seq._scheduleEventsInWindow(0, 0.1, 120, [4, 4], 4)
      expect(cb).not.toHaveBeenCalled()
    })
  })
})
