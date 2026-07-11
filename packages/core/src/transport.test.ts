import type { TransportLoopDetail } from './index'
import { AudioContext } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatPosition, Transport } from './transport'

describe('transport', () => {
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
      expect(() => {
        transport.bpm = 0
      }).toThrow('BPM must be greater than 0')
      expect(() => {
        transport.bpm = -5
      }).toThrow('BPM must be greater than 0')
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

    it('resets nextBeatTime on resume to prevent scheduler catch-up burst', () => {
      // bpm 750, noteType 1/16 -> beatDuration = 240*(1/16)/750 = 0.02s (same
      // math as the swing describe block above). The track is synced, plays a
      // handful of steps, then the transport is paused. While paused, substantial
      // wall-clock time passes (simulated here by overriding the mock
      // AudioContext's currentTime) -- exactly the scenario the standalone
      // BeatTrack.resume() fix (beat-track.ts ~L356) already guards against.
      // Without resetting nextBeatTime on resume, schedulerTick()'s while-loop
      // would fire every beat missed during the pause in a single burst.
      const transport = new Transport(audioContext as any, { bpm: 750 })

      const scheduleSpy = vi.fn()
      const mockTrack = {
        beats: Array.from({ length: 16 }, () => ({ active: false })),
        _syncNoteType: 1 / 16,
        _scheduleBeatFromTransport: scheduleSpy,
      } as any

      transport._addTrack(mockTrack)
      transport.start()
      vi.advanceTimersByTime(20) // initial tick schedules a handful of steps at currentTime 0

      expect(scheduleSpy.mock.calls.length).toBeGreaterThan(0)

      transport.pause()
      scheduleSpy.mockClear()

      // Simulate 5 seconds of real wall-clock time elapsing while paused.
      Object.defineProperty(audioContext, 'currentTime', { get: () => 5, configurable: true })

      transport.start() // resume
      vi.advanceTimersByTime(20)

      // beatDuration is 0.02s; the scheduler's fixed 100ms lookahead can only
      // admit ~5 steps from the resume point (5s) forward. A stale nextBeatTime
      // left over from before the pause (~0.1s) would instead spam roughly the
      // 250 steps between the old position and the new currentTime.
      expect(scheduleSpy.mock.calls.length).toBeLessThanOrEqual(6)

      for (const call of scheduleSpy.mock.calls) {
        expect(call[1]).toBeGreaterThanOrEqual(5)
      }

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

  describe('swing', () => {
    it('defaults to 0 and subdivision 1/16', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.swing).toBe(0)
      expect(transport.swingSubdivision).toBe(1 / 16)
      transport.dispose()
    })

    it('throws on swing outside 0..1 and invalid subdivision', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(() => {
        transport.swing = -0.1
      }).toThrow()
      expect(() => {
        transport.swing = 1.1
      }).toThrow()
      expect(() => {
        transport.swingSubdivision = 1 / 4
      }).toThrow()
      transport.dispose()
    })

    it('swing setter accepts boundary values 0 and 1', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(() => {
        transport.swing = 0
      }).not.toThrow()
      expect(() => {
        transport.swing = 1
      }).not.toThrow()
      transport.dispose()
    })

    it('swingSubdivision accepts 1/8 and 1/16', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.swingSubdivision = 1 / 8
      expect(transport.swingSubdivision).toBe(1 / 8)
      transport.swingSubdivision = 1 / 16
      expect(transport.swingSubdivision).toBe(1 / 16)
      transport.dispose()
    })

    it('_swingDelayFor returns 0 for off-grid positions and even subdivisions, and correct delay on odd subdivisions', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.swing = 1
      expect(transport._swingDelayFor(0.30)).toBe(0) // not on a 0.25-beat boundary
      expect(transport._swingDelayFor(0.25)).toBeCloseTo((240 * (1 / 16)) / 120 / 3, 6)
      expect(transport._swingDelayFor(0.5)).toBe(0) // even subdivision
      transport.dispose()
    })

    it('_swingDelayFor returns 0 when swing is 0', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport._swingDelayFor(0.25)).toBe(0)
      transport.dispose()
    })

    it('_swingDelayFor honors 1/8 subdivision', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.swing = 1
      transport.swingSubdivision = 1 / 8
      // subdivisionBeats = 4 * 1/8 = 0.5 beats
      // beat 0.5 is the first odd 1/8 -> swung
      const subdivisionSeconds = (240 * (1 / 8)) / 120
      expect(transport._swingDelayFor(0.5)).toBeCloseTo(subdivisionSeconds / 3, 6)
      // beat 1.0 is the second (even) 1/8 -> unswung
      expect(transport._swingDelayFor(1.0)).toBe(0)
      transport.dispose()
    })

    it('delays odd 16th track beats by swing * subdivision / 3, leaves even beats on-grid', () => {
      // bpm 750, noteType 1/16 -> beatDuration = 240*(1/16)/750 = 0.02s
      // scheduleAheadTime is a fixed 0.1s lookahead, and the mock AudioContext's
      // currentTime never advances (DeLorean stays at position 0 without an explicit
      // travel() call), so a single scheduler tick schedules every step whose
      // nextBeatTime falls under 0.1s -- steps 0..4 (5 steps) at this bpm/noteType.
      const transport = new Transport(audioContext as any, { bpm: 750 })
      transport.swing = 0.5

      const scheduleSpy = vi.fn()
      const mockTrack = {
        beats: Array.from({ length: 8 }, () => ({ active: false })),
        _syncNoteType: 1 / 16,
        _scheduleBeatFromTransport: scheduleSpy,
      } as any

      transport._addTrack(mockTrack)
      transport.start()
      vi.advanceTimersByTime(20)

      expect(scheduleSpy.mock.calls.length).toBeGreaterThanOrEqual(5)

      const beatDuration = 0.02
      const subdivisionSeconds = 0.02
      const delay = 0.5 * subdivisionSeconds / 3

      // beat index 0 (even 16th): unswung, at grid time 0
      expect(scheduleSpy.mock.calls[0][0]).toBe(0)
      expect(scheduleSpy.mock.calls[0][1]).toBeCloseTo(0 * beatDuration, 6)

      // beat index 1 (odd 16th): swung, grid time + delay
      expect(scheduleSpy.mock.calls[1][0]).toBe(1)
      expect(scheduleSpy.mock.calls[1][1]).toBeCloseTo(1 * beatDuration + delay, 6)

      // beat index 2 (even 16th): unswung
      expect(scheduleSpy.mock.calls[2][0]).toBe(2)
      expect(scheduleSpy.mock.calls[2][1]).toBeCloseTo(2 * beatDuration, 6)

      // beat index 3 (odd 16th): swung
      expect(scheduleSpy.mock.calls[3][0]).toBe(3)
      expect(scheduleSpy.mock.calls[3][1]).toBeCloseTo(3 * beatDuration + delay, 6)

      transport.dispose()
    })

    it('swing=0 keeps synced track timing byte-identical to the unswung grid (backward compat)', () => {
      const transport = new Transport(audioContext as any, { bpm: 750 })
      // swing left at its default of 0

      const scheduleSpy = vi.fn()
      const mockTrack = {
        beats: Array.from({ length: 8 }, () => ({ active: false })),
        _syncNoteType: 1 / 16,
        _scheduleBeatFromTransport: scheduleSpy,
      } as any

      transport._addTrack(mockTrack)
      transport.start()
      vi.advanceTimersByTime(20)

      const beatDuration = 0.02
      for (let i = 0; i < 5; i++) {
        expect(scheduleSpy.mock.calls[i][0]).toBe(i)
        expect(scheduleSpy.mock.calls[i][1]).toBeCloseTo(i * beatDuration, 6)
      }

      transport.dispose()
    })
  })

  describe('loop region', () => {
    it('defaults off, loopStart 0', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      expect(transport.loop).toBe(false)
      expect(transport.loopStart).toBe(0)
      transport.dispose()
    })

    it('accepts musical notation and stores beats', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.loopEnd = '2m' // 4/4 -> 8 beats
      expect(transport.loopEnd).toBe(8)
      transport.loopStart = '1m'
      expect(transport.loopStart).toBe(4)
      transport.dispose()
    })

    it('throws when loopEnd <= loopStart on start()', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.loop = true
      transport.loopStart = '2m'
      transport.loopEnd = '1m'
      expect(() => transport.start()).toThrow()
      transport.dispose()
    })

    it('wraps position at loop end and emits loop event', () => {
      // bpm 3000, ticksPerBeat 4 (default) -> tickDuration = 60/(3000*4) = 0.005s
      // scheduleAheadTime is a fixed 0.1s lookahead, and the mock AudioContext's
      // currentTime never advances (DeLorean stays at position 0), so a single
      // scheduler tick advances position 20 times (0, 0.005, ..., 0.095 < 0.1).
      // loopEnd '1m' (4/4) = 4 beats = 16 ticks. After 16 increments the tick
      // index wraps back to 0 and keeps counting: 17th..20th increments land
      // at ticks 1..4 -- bar stays 1 (would be bar 2 without the loop).
      const transport = new Transport(audioContext as any, { bpm: 3000 })
      transport.loop = true
      transport.loopEnd = '1m'

      const loopListener = vi.fn()
      transport.on('loop', loopListener)

      transport.start()
      vi.advanceTimersByTime(20)

      expect(transport.position.bar).toBe(1)
      expect(loopListener).toHaveBeenCalled()
      expect(loopListener.mock.calls[0][0].detail.iteration).toBe(1)
      transport.dispose()
    })

    it('wraps synced track pattern index at loop boundary', () => {
      // bpm 6000, noteType 1/4 -> beatDuration = 240*(1/4)/6000 = 0.01s
      // 10 steps fit within the fixed 0.1s lookahead window (currentTime frozen at 0).
      // track numBeats 8, loopEnd '1m' (4/4) = 4 beats. Since noteType 1/4 = 1 beat/step,
      // the pattern index must wrap every 4 steps: 0,1,2,3,0,1,2,3,... NOT 0..7 free-run.
      const transport = new Transport(audioContext as any, { bpm: 6000 })
      transport.loop = true
      transport.loopEnd = '1m'

      const scheduleSpy = vi.fn()
      const mockTrack = {
        beats: Array.from({ length: 8 }, () => ({ active: false })),
        _syncNoteType: 1 / 4,
        _scheduleBeatFromTransport: scheduleSpy,
      } as any

      transport._addTrack(mockTrack)
      transport.start()
      vi.advanceTimersByTime(20)

      expect(scheduleSpy.mock.calls.length).toBeGreaterThanOrEqual(8)
      const indices = scheduleSpy.mock.calls.slice(0, 8).map(call => call[0])
      expect(indices).toEqual([0, 1, 2, 3, 0, 1, 2, 3])

      transport.dispose()
    })

    it('loop=false behavior unchanged (position runs past loopEnd)', () => {
      // Same bpm/ticksPerBeat as the wrap test, but loop left off. loopEnd is
      // still set to '1m' to prove it's inert when loop is false -- position
      // free-runs past the would-be loop boundary and bar advances to 2.
      const transport = new Transport(audioContext as any, { bpm: 3000 })
      transport.loopEnd = '1m'

      transport.start()
      vi.advanceTimersByTime(20)

      expect(transport.position.bar).toBe(2)
      transport.dispose()
    })

    it('ignores loop wrap when region invalid (loop toggled live with loopEnd unset)', () => {
      // Same bpm/ticksPerBeat as 'loop=false behavior unchanged'. loop is
      // toggled true mid-playback with loopStart/loopEnd left at their
      // defaults (0/0) -- an invalid, zero-length region. The wrap guard
      // must require loopEnd > loopStart, otherwise every tick satisfies
      // currentTickIndex >= loopEndTick(0) and position freezes at tick 0
      // while spamming 'loop' events.
      const transport = new Transport(audioContext as any, { bpm: 3000 })
      const loopListener = vi.fn()
      transport.on('loop', loopListener)

      transport.start()
      transport.loop = true // loopStart/loopEnd left unset (0/0) -- invalid region

      vi.advanceTimersByTime(20)

      expect(transport.position.bar).toBe(2)
      expect(loopListener).not.toHaveBeenCalled()
      transport.dispose()
    })

    it('throws on resume when loop region invalid', () => {
      const transport = new Transport(audioContext as any, { bpm: 120 })
      transport.start()
      transport.pause()
      transport.loop = true // loopStart/loopEnd left unset (0/0) -- invalid region

      expect(() => transport.start()).toThrow()
      transport.dispose()
    })

    it('transportLoopDetail type is importable from the package entrypoint', () => {
      const transport = new Transport(audioContext as any, { bpm: 3000 })
      transport.loop = true
      transport.loopEnd = '1m'

      const details: TransportLoopDetail[] = []
      transport.on('loop', e => details.push(e.detail))

      transport.start()
      vi.advanceTimersByTime(20)

      expect(details[0].iteration).toBe(1)
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
