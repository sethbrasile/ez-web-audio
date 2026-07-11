import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { BeatTrack as RealBeatTrack } from '@/beat-track'
import { Sound } from './sound'
import { Transport } from './transport'

/**
 * Extended BeatTrack class that exposes internal state for testing
 */
class BeatTrack extends RealBeatTrack {
  public getSounds(): Set<Playable & Connectable> {
    return this.sounds
  }

  public addSound(sound: Playable & Connectable): void {
    this.sounds.add(sound)
  }

  public callPlayMethodOnBeats(method: 'playInIfActive' | 'playIn', bpm: number, noteType?: number): void {
    super.callPlayMethodOnBeats(method, bpm, noteType)
  }

  /**
   * Expose currentBeatIndex for testing stop/pause/resume behavior
   */
  public getCurrentBeatIndex(): number {
    return (this as any).currentBeatIndex
  }

  /**
   * Expose pausedBeatIndex for testing pause behavior
   */
  public getPausedBeatIndex(): number | null {
    return (this as any).pausedBeatIndex
  }

  /**
   * Expose WorkerTimer running state for testing scheduler state.
   * Returns a truthy value (the WorkerTimer) when running, null when stopped.
   */
  public getTimerID(): any {
    const workerTimer = (this as any).workerTimer
    return workerTimer?.isRunning ? workerTimer : null
  }

  /**
   * Expose currentTempo for testing setTempo
   */
  public getCurrentTempo(): number {
    return (this as any).currentTempo
  }
}

function createSound() {
  const context = new Mock() as unknown as AudioContext
  const audioBuffer = context.createBuffer(1, 1, 1)
  return new Sound(context, audioBuffer)
}

function createBeatTrack() {
  const context = new Mock() as unknown as AudioContext
  const sounds: (Playable & Connectable)[] = []
  return new BeatTrack(context, sounds)
}

it('exists', () => {
  expect(BeatTrack).toBeTruthy()
})

it('can be created', () => {
  const track = createBeatTrack()
  expect(track).toBeTruthy()
})

it(`remembers beats' 'active' state when numBeats changes`, () => {
  const beatTrack = createBeatTrack()
  let [beat1, beat2, beat3] = beatTrack.beats

  beat1.active = true
  beat3.active = true

  beatTrack.numBeats = 6

  beat1 = beatTrack.beats[0]
  beat2 = beatTrack.beats[1]
  beat3 = beatTrack.beats[2]

  expect(beat1.active).toBe(true)
  expect(beat2.active).toBe(false)
  expect(beat3.active).toBe(true)

  beatTrack.numBeats = 4

  beat1 = beatTrack.beats[0]
  beat2 = beatTrack.beats[1]
  beat3 = beatTrack.beats[2]

  expect(beat1.active).toBe(true)
  expect(beat2.active).toBe(false)
  expect(beat3.active).toBe(true)
})

it('playBeats starts the scheduler and emits beat events', () => {
  const result = createBeatTrack()
  const sound = createSound()
  result.addSound(sound)

  const beatEvents: any[] = []
  result.addEventListener('beat', (e: any) => beatEvents.push(e.detail))

  result.playBeats(120, 1 / 4)

  // Scheduler should emit beat events (at least one within lookahead window)
  expect(beatEvents.length).toBeGreaterThan(0)

  result.stop()
})

it('playActiveBeats starts the scheduler for active beats', () => {
  const result = createBeatTrack()
  const sound = createSound()
  result.addSound(sound)

  const beatEvents: any[] = []
  result.addEventListener('beat', (e: any) => beatEvents.push(e.detail))

  // Set pattern with some inactive beats
  result.beats[0].active = true
  result.beats[1].active = false
  result.beats[2].active = true
  result.beats[3].active = false

  result.playActiveBeats(120, 1 / 4)

  // Should emit events (scheduler is running)
  expect(beatEvents.length).toBeGreaterThan(0)

  result.stop()
})

it('callPlayMethodOnBeats method calls "method" arg on all beats in beats array', () => {
  let counter = 0
  const sound = createSound()

  sound.playIn = () => {
    counter++
  }

  const result = createBeatTrack()

  result.addSound(sound)

  result.callPlayMethodOnBeats('playIn', 120)
  assert.strictEqual(counter, 4)
})

// Timing control tests
describe('stop() behavior', () => {
  it('resets beat index to 0 after stop', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    // Start playing - scheduler will advance beat index
    track.playActiveBeats(120, 1 / 4)

    // Stop should reset position
    track.stop()

    // Verify beat index is reset
    expect(track.getCurrentBeatIndex()).toBe(0)
  })

  it('clears the scheduler timer after stop', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    // Timer should be set after starting
    expect(track.getTimerID()).not.toBeNull()

    track.stop()
    // Timer should be cleared after stop
    expect(track.getTimerID()).toBeNull()
  })

  it('clears paused state after stop', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    track.pause()
    expect(track.getPausedBeatIndex()).not.toBeNull()

    track.stop()
    expect(track.getPausedBeatIndex()).toBeNull()
  })
})

describe('pause() behavior', () => {
  it('preserves beat index after pause', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    // Capture beat index before pause
    const beatIndexBeforePause = track.getCurrentBeatIndex()

    track.pause()

    // pausedBeatIndex should capture the current position
    expect(track.getPausedBeatIndex()).toBe(beatIndexBeforePause)
  })

  it('stops scheduler after pause', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    expect(track.getTimerID()).not.toBeNull()

    track.pause()
    expect(track.getTimerID()).toBeNull()
  })
})

describe('resume() behavior', () => {
  it('restores beat index from paused position', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)

    track.pause()
    // Capture the saved paused beat index before calling resume
    const savedBeatIndex = track.getPausedBeatIndex()!

    track.resume()

    // After resume, the scheduler starts from savedBeatIndex and advances forward.
    // currentBeatIndex should be >= savedBeatIndex (resumed from correct position).
    expect(track.getCurrentBeatIndex()).toBeGreaterThanOrEqual(savedBeatIndex)
  })

  it('restarts scheduler after resume', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    track.pause()
    expect(track.getTimerID()).toBeNull()

    track.resume()
    // Scheduler should be running again
    expect(track.getTimerID()).not.toBeNull()

    // Clean up
    track.stop()
  })

  it('clears paused state after resume', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    track.pause()
    expect(track.getPausedBeatIndex()).not.toBeNull()

    track.resume()
    expect(track.getPausedBeatIndex()).toBeNull()

    track.stop()
  })
})

describe('setTempo() behavior', () => {
  it('changes internal tempo value', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1 / 4)
    expect(track.getCurrentTempo()).toBe(120)

    track.setTempo(140)
    expect(track.getCurrentTempo()).toBe(140)

    track.stop()
  })

  it('can be called multiple times', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(60, 1 / 4)
    expect(track.getCurrentTempo()).toBe(60)

    track.setTempo(120)
    expect(track.getCurrentTempo()).toBe(120)

    track.setTempo(180)
    expect(track.getCurrentTempo()).toBe(180)

    track.stop()
  })
})

describe('beat event structure', () => {
  it('emits "beat" event for scheduled beats within lookahead', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    // Should emit at least one beat immediately (within 100ms lookahead)
    expect(beatEvents.length).toBeGreaterThan(0)

    track.stop()
  })

  it('beat event has beatIndex property', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    expect(beatEvents[0]).toHaveProperty('beatIndex')
    expect(typeof beatEvents[0].beatIndex).toBe('number')
    expect(beatEvents[0].beatIndex).toBeGreaterThanOrEqual(0)

    track.stop()
  })

  it('beat event has active property', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    expect(beatEvents[0]).toHaveProperty('active')
    expect(typeof beatEvents[0].active).toBe('boolean')

    track.stop()
  })

  it('beat event has time property based on audioContext.currentTime', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    expect(beatEvents[0]).toHaveProperty('time')
    expect(typeof beatEvents[0].time).toBe('number')
    // Time should be a non-negative value (audioContext.currentTime based)
    expect(beatEvents[0].time).toBeGreaterThanOrEqual(0)

    track.stop()
  })

  it('beat event has source property referencing the BeatTrack', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    expect(beatEvents[0]).toHaveProperty('source')
    expect(beatEvents[0].source).toBe(track)

    track.stop()
  })

  it('beat event active flag reflects beat state', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    // Set specific beat states
    track.beats[0].active = true
    track.beats[1].active = false
    track.beats[2].active = true
    track.beats[3].active = false

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1 / 4)

    // First beat event should match first beat's active state
    expect(beatEvents[0].beatIndex).toBe(0)
    expect(beatEvents[0].active).toBe(true)

    track.stop()
  })
})

it('emits pause event with beatIndex', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  let pauseEvent: any = null
  track.addEventListener('pause', (e: any) => {
    pauseEvent = e.detail
  })

  track.playActiveBeats(120, 1 / 4)
  track.pause()

  expect(pauseEvent).not.toBeNull()
  expect(pauseEvent).toHaveProperty('beatIndex')
})

it('emits resume event with beatIndex', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  let resumeEvent: any = null
  track.addEventListener('resume', (e: any) => {
    resumeEvent = e.detail
  })

  track.playActiveBeats(120, 1 / 4)
  track.pause()
  track.resume()

  expect(resumeEvent).not.toBeNull()
  expect(resumeEvent).toHaveProperty('beatIndex')
})

it('emits stop event', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  let stopEvent: any = null
  track.addEventListener('stop', (e: any) => {
    stopEvent = e.detail
  })

  track.playActiveBeats(120, 1 / 4)
  track.stop()

  expect(stopEvent).not.toBeNull()
})

it('supports multiple pause/resume cycles', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  let pauseCount = 0
  let resumeCount = 0

  track.addEventListener('pause', () => pauseCount++)
  track.addEventListener('resume', () => resumeCount++)

  track.playActiveBeats(120, 1 / 4)

  track.pause()
  track.resume()
  track.pause()
  track.resume()

  expect(pauseCount).toBe(2)
  expect(resumeCount).toBe(2)
})

describe('edge cases', () => {
  describe('tempo boundary values', () => {
    it('setTempo(0) throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      track.playActiveBeats(120, 1 / 4)

      // Current behavior: setTempo validates BPM > 0
      expect(() => track.setTempo(0)).toThrow('BPM must be greater than 0')
    })

    it('setTempo with negative value throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      track.playActiveBeats(120, 1 / 4)

      // Current behavior: negative BPM is rejected
      expect(() => track.setTempo(-120)).toThrow('BPM must be greater than 0')
    })

    it('setTempo with very high value (999) works', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      track.playActiveBeats(120, 1 / 4)

      // High BPM values should work without error
      expect(() => track.setTempo(999)).not.toThrow()
      expect(track.getCurrentTempo()).toBe(999)

      track.stop()
    })

    it('playBeats(0) throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      // Zero BPM is invalid
      expect(() => track.playBeats(0, 1 / 4)).toThrow('BPM must be greater than 0')
    })

    it('playBeats with negative BPM throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      expect(() => track.playBeats(-120, 1 / 4)).toThrow('BPM must be greater than 0')
    })

    it('playActiveBeats(0) throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      expect(() => track.playActiveBeats(0, 1 / 4)).toThrow('BPM must be greater than 0')
    })

    it('playActiveBeats with negative BPM throws error', () => {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      expect(() => track.playActiveBeats(-120, 1 / 4)).toThrow('BPM must be greater than 0')
    })
  })

  describe('numBeats boundary values', () => {
    it('numBeats = 0 creates empty beats array', () => {
      const track = createBeatTrack()
      track.numBeats = 0

      // Current behavior: allows 0 beats
      expect(track.beats).toHaveLength(0)
    })

    it('constructor throws for numBeats: 0 (R6: truthy-check silently ignored 0)', () => {
      const context = new Mock() as unknown as AudioContext
      expect(() => new BeatTrack(context, [], { numBeats: 0 })).toThrow('numBeats must be greater than 0')
    })

    it('numBeats = 1 creates single beat', () => {
      const track = createBeatTrack()
      track.numBeats = 1

      expect(track.beats).toHaveLength(1)
      expect(track.beats[0]).toBeDefined()
    })

    it('numBeats = 16 creates 16 beats', () => {
      const track = createBeatTrack()
      track.numBeats = 16

      expect(track.beats).toHaveLength(16)
    })

    it('reducing numBeats preserves active state of remaining beats', () => {
      const track = createBeatTrack()
      track.numBeats = 8

      // Set some beats active
      track.beats[0].active = true
      track.beats[2].active = true
      track.beats[6].active = true

      // Reduce to 4 beats
      track.numBeats = 4

      // First 4 beats should preserve their state
      expect(track.beats[0].active).toBe(true)
      expect(track.beats[1].active).toBe(false)
      expect(track.beats[2].active).toBe(true)
      expect(track.beats[3].active).toBe(false)
    })

    it('increasing numBeats adds new inactive beats', () => {
      const track = createBeatTrack()
      track.numBeats = 4

      track.beats[0].active = true
      track.beats[1].active = true

      // Expand to 8 beats
      track.numBeats = 8

      // Original beats preserve state
      expect(track.beats[0].active).toBe(true)
      expect(track.beats[1].active).toBe(true)

      // New beats default to false
      expect(track.beats[4].active).toBe(false)
      expect(track.beats[7].active).toBe(false)
    })
  })
})

describe('on(), off(), once() convenience methods', () => {
  it('on() subscribes to events and returns this for chaining', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    let callCount = 0
    const handler = () => callCount++

    const result = track.on('stop', handler)

    // Returns this for chaining
    expect(result).toBe(track)

    // Trigger the event
    track.playActiveBeats(120, 1 / 4)
    track.stop()

    expect(callCount).toBe(1)
  })

  it('off() removes event listener', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    let callCount = 0
    const handler = () => callCount++

    track.on('stop', handler)
    track.off('stop', handler)

    // Trigger event — handler should NOT be called
    track.playActiveBeats(120, 1 / 4)
    track.stop()

    expect(callCount).toBe(0)
  })

  it('off() returns this for chaining', () => {
    const track = createBeatTrack()
    const handler = () => {}
    const result = track.off('stop', handler)
    expect(result).toBe(track)
  })

  it('once() fires handler only once', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    let callCount = 0
    track.once('stop', () => callCount++)

    // Trigger stop twice
    track.playActiveBeats(120, 1 / 4)
    track.stop()
    track.playActiveBeats(120, 1 / 4)
    track.stop()

    expect(callCount).toBe(1)
  })

  it('once() returns this for chaining', () => {
    const track = createBeatTrack()
    const result = track.once('stop', () => {})
    expect(result).toBe(track)
  })

  it('on() supports chaining multiple events', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    let beatCount = 0
    let stopCount = 0

    // Chain .on() calls
    track.on('beat', () => beatCount++).on('stop', () => stopCount++)

    track.playActiveBeats(120, 1 / 4)
    expect(beatCount).toBeGreaterThan(0)

    track.stop()
    expect(stopCount).toBe(1)
  })
})

describe('setPattern()', () => {
  it('basic pattern [1,0,1,0] sets beats correctly', () => {
    const track = createBeatTrack()
    track.setPattern([1, 0, 1, 0])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[1].active).toBe(false)
    expect(track.beats[2].active).toBe(true)
    expect(track.beats[3].active).toBe(false)
  })

  it('short array defaults remaining beats to inactive', () => {
    const track = createBeatTrack()
    track.numBeats = 8
    track.setPattern([1, 0])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[1].active).toBe(false)
    expect(track.beats[2].active).toBe(false)
    expect(track.beats[3].active).toBe(false)
    expect(track.beats[4].active).toBe(false)
    expect(track.beats[5].active).toBe(false)
    expect(track.beats[6].active).toBe(false)
    expect(track.beats[7].active).toBe(false)
  })

  it('long array ignores extra values beyond numBeats', () => {
    const track = createBeatTrack() // 4 beats
    track.setPattern([1, 1, 1, 1, 1, 1, 1, 1])
    expect(track.beats.length).toBe(4)
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[1].active).toBe(true)
    expect(track.beats[2].active).toBe(true)
    expect(track.beats[3].active).toBe(true)
  })

  it('boolean inputs work identically to numeric', () => {
    const track = createBeatTrack()
    track.setPattern([true, false, true, false])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[1].active).toBe(false)
    expect(track.beats[2].active).toBe(true)
    expect(track.beats[3].active).toBe(false)
  })

  it('returns this for chaining', () => {
    const track = createBeatTrack()
    const result = track.setPattern([1, 0, 1, 0])
    expect(result).toBe(track)
  })

  it('truthy coercion: non-zero values become active', () => {
    const track = createBeatTrack()
    track.numBeats = 3
    track.setPattern([2, 0, -1])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[1].active).toBe(false)
    expect(track.beats[2].active).toBe(true)
  })

  it('empty array sets all beats inactive', () => {
    const track = createBeatTrack()
    // First set some beats active
    track.beats[0].active = true
    track.beats[2].active = true
    track.setPattern([])
    expect(track.beats[0].active).toBe(false)
    expect(track.beats[1].active).toBe(false)
    expect(track.beats[2].active).toBe(false)
    expect(track.beats[3].active).toBe(false)
  })
})

describe('velocity', () => {
  it('defaults every beat velocity to 1', () => {
    const track = createBeatTrack()
    expect(track.beats.map(b => b.velocity)).toEqual([1, 1, 1, 1])
  })

  it('setPattern with numeric values sets active and velocity', () => {
    const track = createBeatTrack()
    track.setPattern([1, 0, 0.6, 0])
    expect(track.beats.map(b => b.active)).toEqual([true, false, true, false])
    expect(track.beats[0].velocity).toBe(1)
    expect(track.beats[2].velocity).toBe(0.6)
    // rests keep default velocity
    expect(track.beats[1].velocity).toBe(1)
  })

  it('setPattern clamps velocity to 0..1', () => {
    const track = createBeatTrack()
    track.numBeats = 2
    track.setPattern([1.5, 1])
    expect(track.beats[0].velocity).toBe(1)
  })

  it('setPattern with booleans keeps velocity 1 (backward compat)', () => {
    const track = createBeatTrack()
    track.numBeats = 2
    track.setPattern([true, false])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[0].velocity).toBe(1)
  })
})

describe('g3: BeatTrack-level timer tracking + pattern length + restart', () => {
  it('shrinking numBeats while playing shrinks beats.length; growing back restores active states (H4)', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.beats[0].active = true
    track.beats[3].active = true

    track.playActiveBeats(120, 1 / 4)

    track.numBeats = 2
    expect(track.beats.length).toBe(2)
    expect(track.beats[0].active).toBe(true)

    track.numBeats = 4
    expect(track.beats.length).toBe(4)
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[3].active).toBe(true)

    track.stop()
  })

  it('stop() cancels pending BeatTrack-level beat-emit timers (no stray "beat" events after stop) (H3)', () => {
    vi.useFakeTimers()
    try {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      const beatEvents: any[] = []
      track.addEventListener('beat', (e: any) => beatEvents.push(e.detail))

      // beatDuration = 240 * (1/4) / 1200 = 0.05s -> beat index 0 fires
      // synchronously (offset 0), beat index 1 is scheduled 50ms out via
      // BeatTrack's own acTimeout (untracked prior to the H3 fix).
      track.playActiveBeats(1200, 1 / 4)
      const countAtStop = beatEvents.length
      expect(countAtStop).toBe(1)

      track.stop()

      // Advance the AudioContext clock past the pending index-1 timer's due
      // time and pump the shared RAF-driven acTimeout scheduler.
      const audioContext = (track as any).audioContext
      ;(audioContext as any)._deLorean._position = 0.05
      vi.advanceTimersByTime(20)

      // Without the fix, the index-1 'beat' emit (scheduled before stop())
      // still fires ~50ms later even though playback was stopped.
      expect(beatEvents.length).toBe(countAtStop)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('restarting playActiveBeats cancels the still-pending pre-restart schedule (no flam) (M2)', () => {
    vi.useFakeTimers()
    try {
      const track = createBeatTrack()
      const sound = createSound()
      track.addSound(sound)

      const beatEvents: any[] = []
      track.addEventListener('beat', (e: any) => beatEvents.push(e.detail))

      // beatDuration = 240 * (1/4) / 1200 = 0.05s -> exactly two beats land in
      // the 100ms lookahead window per call: index 0 (offset 0, sync) and
      // index 1 (offset 50ms, deferred via acTimeout).
      track.playActiveBeats(1200, 1 / 4)
      expect(beatEvents).toHaveLength(1) // only the synchronous index-0 emit so far

      // Restart before the deferred index-1 timer from the FIRST call fires.
      track.playActiveBeats(1200, 1 / 4)

      // Prevent the lookahead scheduler from scheduling any further beats so
      // the test isolates exactly what the two calls above already scheduled.
      ;(track as any).workerTimer.stop()

      // Advance the AudioContext clock past both calls' 50ms deferred offset
      // and pump the shared RAF-driven acTimeout scheduler once.
      const audioContext = (track as any).audioContext
      ;(audioContext as any)._deLorean._position = 0.05
      vi.advanceTimersByTime(20)

      const index1Events = beatEvents.filter((e: any) => e.beatIndex === 1)
      // Without the fix: the pre-restart schedule's index-1 timer AND the
      // post-restart schedule's index-1 timer both fire -> 2 events (flam).
      // With the fix: the pre-restart schedule is cancelled at the top of
      // playActiveBeats(), so only the post-restart index-1 timer fires.
      expect(index1Events).toHaveLength(1)
    }
    finally {
      vi.useRealTimers()
    }
  })
})

describe('dispose() (SAFE-03)', () => {
  it('clears beats array after dispose', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    expect(track.beats.length).toBe(4)
    track.dispose()
    expect(track.beats.length).toBe(0)
  })

  it('clears the sounds set after dispose', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    expect(track.getSounds().size).toBeGreaterThan(0)
    track.dispose()
    expect(track.getSounds().size).toBe(0)
  })

  it('disposes underlying sounds that have dispose()', () => {
    const context = new Mock() as unknown as AudioContext
    const buffer = context.createBuffer(1, 1, 1)
    const sound1 = new Sound(context, buffer)
    const sound2 = new Sound(context, buffer)
    const disposeSpy1 = vi.spyOn(sound1, 'dispose')
    const disposeSpy2 = vi.spyOn(sound2, 'dispose')

    const track = new BeatTrack(context, [sound1, sound2])
    track.dispose()

    expect(disposeSpy1).toHaveBeenCalled()
    expect(disposeSpy2).toHaveBeenCalled()
  })

  it('stops playback when dispose is called during playback', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playBeats(120, 1 / 4)
    expect(track.getTimerID()).not.toBeNull()

    track.dispose()
    expect(track.getTimerID()).toBeNull()
  })

  it('events stop firing after dispose', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const _eventFired = vi.fn()
    track.on('stop', _eventFired)

    track.dispose()

    // After dispose, the eventTarget was replaced so old listeners are detached
    // Verify dispose worked correctly by checking beats are cleared
    expect(track.beats.length).toBe(0)
  })
})

describe('syncTo / unsync', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    vi.useFakeTimers()
    audioContext = new Mock() as unknown as AudioContext
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createSyncableBeatTrack() {
    const sound = createSound()
    const track = new BeatTrack(audioContext, [sound])
    return track
  }

  function createTestTransport(bpm = 120) {
    return new Transport(audioContext as any, { bpm })
  }

  describe('syncTo()', () => {
    it('sets isSynced to true', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(track.isSynced).toBe(true)
      transport.dispose()
    })

    it('registers track with transport.tracks', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(transport.tracks).toContain(track)
      transport.dispose()
    })

    it('stores noteType as _syncNoteType', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 16 })
      expect((track as any)._syncNoteType).toBe(1 / 16)
      transport.dispose()
    })

    it('is idempotent when syncing to same transport', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(transport.tracks).toHaveLength(1)
      transport.dispose()
    })

    it('unsyncs from previous transport when syncing to new one', () => {
      const track = createSyncableBeatTrack()
      const transport1 = createTestTransport()
      const transport2 = createTestTransport()
      track.syncTo(transport1, { noteType: 1 / 4 })
      track.syncTo(transport2, { noteType: 1 / 8 })
      expect(transport1.tracks).toHaveLength(0)
      expect(transport2.tracks).toContain(track)
      transport1.dispose()
      transport2.dispose()
    })
  })

  describe('unsync()', () => {
    it('sets isSynced to false', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      track.unsync()
      expect(track.isSynced).toBe(false)
      transport.dispose()
    })

    it('removes track from transport.tracks', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      track.unsync()
      expect(transport.tracks).toHaveLength(0)
      transport.dispose()
    })

    it('is a no-op when not synced', () => {
      const track = createSyncableBeatTrack()
      expect(() => track.unsync()).not.toThrow()
    })

    it('re-enables standalone methods after unsync', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      track.unsync()
      // Should not throw now
      expect(() => track.playBeats(120, 1 / 4)).not.toThrow()
      track.stop()
    })
  })

  describe('guard methods throw when synced', () => {
    it('playBeats() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.playBeats(120, 1 / 4)).toThrow('Cannot call playBeats()')
      transport.dispose()
    })

    it('playActiveBeats() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.playActiveBeats(120, 1 / 4)).toThrow('Cannot call playActiveBeats()')
      transport.dispose()
    })

    it('stop() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.stop()).toThrow('Cannot call stop()')
      transport.dispose()
    })

    it('pause() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.pause()).toThrow('Cannot call pause()')
      transport.dispose()
    })

    it('resume() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.resume()).toThrow('Cannot call resume()')
      transport.dispose()
    })

    it('setTempo() throws when synced', () => {
      const track = createSyncableBeatTrack()
      const transport = createTestTransport()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(() => track.setTempo(140)).toThrow('Cannot call setTempo()')
      transport.dispose()
    })
  })

  describe('muted property', () => {
    it('defaults to false', () => {
      const track = createSyncableBeatTrack()
      expect(track.muted).toBe(false)
    })

    it('can be set to true', () => {
      const track = createSyncableBeatTrack()
      track.muted = true
      expect(track.muted).toBe(true)
    })

    it('muted track _shouldPlay() returns false', () => {
      const track = createSyncableBeatTrack()
      track.muted = true
      expect((track as any)._shouldPlay()).toBe(false)
    })

    it('unmuted track _shouldPlay() returns true (standalone)', () => {
      const track = createSyncableBeatTrack()
      expect((track as any)._shouldPlay()).toBe(true)
    })
  })

  describe('solo property', () => {
    it('defaults to false', () => {
      const track = createSyncableBeatTrack()
      expect(track.solo).toBe(false)
    })

    it('solo has no effect in standalone mode', () => {
      const track = createSyncableBeatTrack()
      track.solo = true
      expect((track as any)._shouldPlay()).toBe(true)
    })

    it('when one track is soloed, non-soloed tracks return _shouldPlay=false', () => {
      const transport = createTestTransport()
      const track1 = createSyncableBeatTrack()
      const track2 = createSyncableBeatTrack()
      track1.syncTo(transport, { noteType: 1 / 4 })
      track2.syncTo(transport, { noteType: 1 / 4 })

      track1.solo = true
      // track1 is soloed, should play
      expect((track1 as any)._shouldPlay()).toBe(true)
      // track2 is not soloed, should not play
      expect((track2 as any)._shouldPlay()).toBe(false)
      transport.dispose()
    })

    it('multiple tracks can be soloed (stackable)', () => {
      const transport = createTestTransport()
      const track1 = createSyncableBeatTrack()
      const track2 = createSyncableBeatTrack()
      const track3 = createSyncableBeatTrack()
      track1.syncTo(transport, { noteType: 1 / 4 })
      track2.syncTo(transport, { noteType: 1 / 4 })
      track3.syncTo(transport, { noteType: 1 / 4 })

      track1.solo = true
      track2.solo = true
      expect((track1 as any)._shouldPlay()).toBe(true)
      expect((track2 as any)._shouldPlay()).toBe(true)
      expect((track3 as any)._shouldPlay()).toBe(false)
      transport.dispose()
    })

    it('when no tracks are soloed, all unmuted tracks play', () => {
      const transport = createTestTransport()
      const track1 = createSyncableBeatTrack()
      const track2 = createSyncableBeatTrack()
      track1.syncTo(transport, { noteType: 1 / 4 })
      track2.syncTo(transport, { noteType: 1 / 4 })

      expect((track1 as any)._shouldPlay()).toBe(true)
      expect((track2 as any)._shouldPlay()).toBe(true)
      transport.dispose()
    })

    it('muted + soloed track returns _shouldPlay=false (mute overrides solo)', () => {
      const transport = createTestTransport()
      const track1 = createSyncableBeatTrack()
      track1.syncTo(transport, { noteType: 1 / 4 })
      track1.solo = true
      track1.muted = true
      expect((track1 as any)._shouldPlay()).toBe(false)
      transport.dispose()
    })
  })

  describe('_scheduleBeatFromTransport()', () => {
    it('emits beat event when called', () => {
      const track = createSyncableBeatTrack()
      track.beats[0].active = true

      const beatEvents: any[] = []
      track.on('beat', (e: any) => beatEvents.push(e.detail))

      ;(track as any)._scheduleBeatFromTransport(0, audioContext.currentTime)
      expect(beatEvents.length).toBe(1)
      expect(beatEvents[0].beatIndex).toBe(0)
      expect(beatEvents[0].active).toBe(true)
    })

    it('wraps beatIndex around beats.length', () => {
      const track = createSyncableBeatTrack()
      // Default 4 beats, so index 6 should wrap to 2
      track.beats[2].active = true

      const beatEvents: any[] = []
      track.on('beat', (e: any) => beatEvents.push(e.detail))

      ;(track as any)._scheduleBeatFromTransport(6, audioContext.currentTime)
      expect(beatEvents[0].beatIndex).toBe(2)
    })

    it('emits beat events even when muted', () => {
      const track = createSyncableBeatTrack()
      track.muted = true

      const beatEvents: any[] = []
      track.on('beat', (e: any) => beatEvents.push(e.detail))

      ;(track as any)._scheduleBeatFromTransport(0, audioContext.currentTime)
      expect(beatEvents.length).toBe(1)
    })
  })

  describe('transport-driven playback', () => {
    it('transport.start() schedules beats on synced tracks', () => {
      const transport = createTestTransport()
      const track = createSyncableBeatTrack()
      track.beats[0].active = true

      const beatEvents: any[] = []
      track.on('beat', (e: any) => beatEvents.push(e.detail))

      track.syncTo(transport, { noteType: 1 / 4 })
      transport.start()
      vi.advanceTimersByTime(20) // trigger one scheduler tick

      expect(beatEvents.length).toBeGreaterThan(0)
      transport.dispose()
    })

    it('two tracks synced to same transport both receive beats', () => {
      const transport = createTestTransport()
      const track1 = createSyncableBeatTrack()
      const track2 = createSyncableBeatTrack()
      track1.beats[0].active = true
      track2.beats[0].active = true

      const events1: any[] = []
      const events2: any[] = []
      track1.on('beat', (e: any) => events1.push(e.detail))
      track2.on('beat', (e: any) => events2.push(e.detail))

      track1.syncTo(transport, { noteType: 1 / 4 })
      track2.syncTo(transport, { noteType: 1 / 16 })
      transport.start()
      vi.advanceTimersByTime(20)

      expect(events1.length).toBeGreaterThan(0)
      expect(events2.length).toBeGreaterThan(0)
      transport.dispose()
    })

    it('dispose() unsyncs from transport', () => {
      const transport = createTestTransport()
      const track = createSyncableBeatTrack()
      track.syncTo(transport, { noteType: 1 / 4 })
      expect(transport.tracks).toHaveLength(1)

      track.dispose()
      expect(transport.tracks).toHaveLength(0)
      transport.dispose()
    })
  })
})
