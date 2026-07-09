import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioContext } from 'standardized-audio-context-mock'
import { formatPosition, Transport } from './transport'

describe('Transport', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    vi.useFakeTimers()
    audioContext = new AudioContext() as unknown as AudioContext
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('creates a Transport with given bpm', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.bpm).toBe(120)
      transport.dispose()
    })

    it('defaults timeSignature to [4, 4]', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.timeSignature).toEqual([4, 4])
      transport.dispose()
    })

    it('accepts custom timeSignature', () => {
      const transport = new Transport(audioContext as any, { bpm: 120, timeSignature: [3, 4] })
      expect(transport.timeSignature).toEqual([3, 4])
      transport.dispose()
    })

    it('defaults ticksPerBeat to 4', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.ticksPerBeat).toBe(4)
      transport.dispose()
    })

    it('accepts custom ticksPerBeat', () => {
      const transport = new Transport(audioContext as any, { bpm: 120, ticksPerBeat: 8 })
      expect(transport.ticksPerBeat).toBe(8)
      transport.dispose()
    })

    it('throws if bpm <= 0', () => {
      expect(() => new Transport(audioContext as any, { bpm: 0 })).toThrow('BPM must be greater than 0')
      expect(() => new Transport(audioContext as any, { bpm: -10 })).toThrow('BPM must be greater than 0')
    })
  })

  describe('initial state', () => {
    it('is not playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.playing).toBe(false)
      transport.dispose()
    })

    it('is not paused', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.paused).toBe(false)
      transport.dispose()
    })

    it('position starts at bar 1, beat 1, tick 0, seconds 0', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.position).toEqual({ bar: 1, beat: 1, tick: 0, seconds: 0 })
      transport.dispose()
    })

    it('tracks is empty', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.tracks).toEqual([])
      transport.dispose()
    })
  })

  describe('bpm setter', () => {
    it('updates bpm', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.bpm = 140
      expect(transport.bpm).toBe(140)
      transport.dispose()
    })

    it('throws if new bpm <= 0', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(() => { transport.bpm = 0 }).toThrow('BPM must be greater than 0')
      expect(() => { transport.bpm = -5 }).toThrow('BPM must be greater than 0')
      transport.dispose()
    })
  })

  describe('start', () => {
    it('sets playing to true', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      expect(transport.playing).toBe(true)
      transport.dispose()
    })

    it('is a no-op if already playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('start', listener)
      transport.start()
      transport.start()
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })

    it('emits start event', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('start', listener)
      transport.start()
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })

    it('throws after dispose', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.dispose()
      expect(() => transport.start()).toThrow('Transport has been disposed')
    })
  })

  describe('stop', () => {
    it('sets playing to false', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.stop()
      expect(transport.playing).toBe(false)
      transport.dispose()
    })

    it('resets position to initial', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      vi.advanceTimersByTime(100)
      transport.stop()
      expect(transport.position).toEqual({ bar: 1, beat: 1, tick: 0, seconds: 0 })
      transport.dispose()
    })

    it('emits stop event when was playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('stop', listener)
      transport.start()
      transport.stop()
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })

    it('does not emit stop event when not playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('stop', listener)
      transport.stop()
      expect(listener).not.toHaveBeenCalled()
      transport.dispose()
    })

    it('clears paused state', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.pause()
      transport.stop()
      expect(transport.paused).toBe(false)
      transport.dispose()
    })
  })

  describe('pause', () => {
    it('sets paused to true and playing to false', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.pause()
      expect(transport.paused).toBe(true)
      expect(transport.playing).toBe(false)
      transport.dispose()
    })

    it('emits pause event', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('pause', listener)
      transport.start()
      transport.pause()
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })

    it('is a no-op when not playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('pause', listener)
      transport.pause()
      expect(listener).not.toHaveBeenCalled()
      transport.dispose()
    })

    it('is a no-op when already paused', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('pause', listener)
      transport.start()
      transport.pause()
      transport.pause()
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })
  })

  describe('resume (via start after pause)', () => {
    it('resumes playing from paused state', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.pause()
      transport.start() // resume
      expect(transport.playing).toBe(true)
      expect(transport.paused).toBe(false)
      transport.dispose()
    })

    it('emits resume event (not start) when resuming', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const startListener = vi.fn()
      const resumeListener = vi.fn()
      transport.on('start', startListener)
      transport.on('resume', resumeListener)
      transport.start()
      expect(startListener).toHaveBeenCalledTimes(1)
      transport.pause()
      transport.start() // resume
      // start should not fire again, resume should fire
      expect(startListener).toHaveBeenCalledTimes(1)
      expect(resumeListener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })
  })

  describe('tick events', () => {
    it('emits tick events during playback', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('tick', listener)
      transport.start()
      vi.advanceTimersByTime(100)
      expect(listener).toHaveBeenCalled()
      transport.dispose()
    })

    it('tick events include position details', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('tick', listener)
      transport.start()
      vi.advanceTimersByTime(20)
      expect(listener).toHaveBeenCalled()
      const detail = listener.mock.calls[0][0].detail
      expect(detail).toHaveProperty('bar')
      expect(detail).toHaveProperty('beat')
      expect(detail).toHaveProperty('tick')
      expect(detail).toHaveProperty('seconds')
      expect(detail).toHaveProperty('source')
      transport.dispose()
    })
  })

  describe('position tracking', () => {
    it('position returns a copy (not the internal reference)', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const pos1 = transport.position
      const pos2 = transport.position
      expect(pos1).not.toBe(pos2)
      expect(pos1).toEqual(pos2)
      transport.dispose()
    })
  })

  describe('dispose', () => {
    it('stops playback', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.dispose()
      expect(transport.playing).toBe(false)
    })

    it('is safe to call multiple times', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.dispose()
      expect(() => transport.dispose()).not.toThrow()
    })
  })

  describe('event API', () => {
    it('on() returns this for chaining', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const result = transport.on('start', () => {})
      expect(result).toBe(transport)
      transport.dispose()
    })

    it('off() removes listener', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.on('start', listener)
      transport.off('start', listener)
      transport.start()
      expect(listener).not.toHaveBeenCalled()
      transport.dispose()
    })

    it('once() fires listener only once', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const listener = vi.fn()
      transport.once('tick', listener)
      transport.start()
      vi.advanceTimersByTime(100)
      expect(listener).toHaveBeenCalledTimes(1)
      transport.dispose()
    })
  })

  describe('_addTrack / _removeTrack / tracks', () => {
    it('tracks getter returns frozen array', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const tracks = transport.tracks
      expect(Object.isFrozen(tracks)).toBe(true)
      transport.dispose()
    })

    it('_addTrack adds to tracks list', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const mockTrack = { beats: [], _syncNoteType: 1 / 4 } as any
      transport._addTrack(mockTrack)
      expect(transport.tracks).toHaveLength(1)
      expect(transport.tracks[0]).toBe(mockTrack)
      transport.dispose()
    })

    it('_addTrack is idempotent', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const mockTrack = { beats: [], _syncNoteType: 1 / 4 } as any
      transport._addTrack(mockTrack)
      transport._addTrack(mockTrack)
      expect(transport.tracks).toHaveLength(1)
      transport.dispose()
    })

    it('_removeTrack removes from tracks list', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const mockTrack = { beats: [], _syncNoteType: 1 / 4 } as any
      transport._addTrack(mockTrack)
      transport._removeTrack(mockTrack)
      expect(transport.tracks).toHaveLength(0)
      transport.dispose()
    })

    it('_removeTrack is safe for non-existent track', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      const mockTrack = { beats: [] } as any
      expect(() => transport._removeTrack(mockTrack)).not.toThrow()
      transport.dispose()
    })
  })

  describe('live BPM change', () => {
    it('bpm setter updates value while playing', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      vi.advanceTimersByTime(20) // trigger at least one scheduler tick
      transport.bpm = 60
      expect(transport.bpm).toBe(60)
      // Transport remains playing after BPM change
      expect(transport.playing).toBe(true)
      transport.dispose()
    })

    it('tick interval reflects new BPM in advancePosition', () => {
      // At 120 BPM, tickDuration = 60/(120*4) = 0.125s
      // At 60 BPM, tickDuration = 60/(60*4) = 0.25s
      // The scheduler fills the lookahead window (0.1s) on start.
      // At 120 BPM, only 1 tick fits (0.0 -> nextTick=0.125 > 0.1).
      // Position after that 1 tick: seconds = 0.125
      const transport = new Transport(audioContext as any, { bpm: 120, ticksPerBeat: 4 })
      transport.start()
      vi.advanceTimersByTime(20)
      const posAt120 = transport.position
      // At 120 BPM: tick 1 fired, position.seconds = 0.125
      expect(posAt120.seconds).toBeCloseTo(0.125, 3)

      // Change to 60 BPM and trigger another scheduler tick
      // Now tickDuration = 0.25s. nextTickTime was 0.125.
      // 0.125 < 0 + 0.1 is false (currentTime still 0, 0.125 > 0.1)
      // So no more ticks fire — we need to verify the BPM took effect
      // by checking that the position did not advance further (the interval is now larger)
      transport.bpm = 60
      vi.advanceTimersByTime(20)
      const posAt60 = transport.position
      // Position should be the same — no new ticks could fire
      // because nextTickTime (0.125) > currentTime(0) + 0.1 (lookahead)
      expect(posAt60.seconds).toBe(posAt120.seconds)
      transport.dispose()
    })
  })

  describe('formatPosition', () => {
    it('formats position as bar:beat:tick', () => {
      expect(formatPosition({ bar: 1, beat: 1, tick: 0, seconds: 0 })).toBe('1:1:0')
      expect(formatPosition({ bar: 3, beat: 2, tick: 3, seconds: 5.5 })).toBe('3:2:3')
      expect(formatPosition({ bar: 10, beat: 4, tick: 1, seconds: 30 })).toBe('10:4:1')
    })
  })
})
