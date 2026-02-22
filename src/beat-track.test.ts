import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { assert, describe, expect, it } from 'vitest'
import { BeatTrack as RealBeatTrack } from '@/beat-track'
import { Sound } from './sound'

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
   * Expose timerID for testing scheduler state
   */
  public getTimerID(): number | null {
    return (this as any).timerID
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
