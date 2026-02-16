import { assert, describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import type { Playable } from './interfaces/playable'
import type { Connectable } from './interfaces/connectable'
import { Sound } from './sound'
import { BeatTrack as RealBeatTrack } from '@/beat-track'

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

  public callPlayMethodOnBeats(method: 'ifActivePlayIn' | 'playIn', bpm: number, noteType?: number): void {
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

it('playActiveBeats method calls callPlayMethodOnBeats with "playIn" as first param', () => {
  const result = createBeatTrack()
  result.callPlayMethodOnBeats = arg1 => assert.strictEqual(arg1, 'playIn')
  result.playBeats(120, 1/4)
})

it('playActiveBeats method calls callPlayMethodOnBeats with "ifActivePlayIn" as first param', () => {
  const result = createBeatTrack()
  result.callPlayMethodOnBeats = arg1 => assert.strictEqual(arg1, 'ifActivePlayIn')
  result.playActiveBeats(120, 1/4)
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
    track.playActiveBeats(120, 1/4)

    // Stop should reset position
    track.stop()

    // Verify beat index is reset
    expect(track.getCurrentBeatIndex()).toBe(0)
  })

  it('clears the scheduler timer after stop', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
    const beatIndexBeforePause = track.getCurrentBeatIndex()

    track.pause()
    track.resume()

    // After resume, current beat index should match what was captured during pause
    expect(track.getCurrentBeatIndex()).toBe(beatIndexBeforePause)
  })

  it('restarts scheduler after resume', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
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

    track.playActiveBeats(120, 1/4)
    expect(track.getCurrentTempo()).toBe(120)

    track.setTempo(140)
    expect(track.getCurrentTempo()).toBe(140)

    track.stop()
  })

  it('can be called multiple times', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    track.playActiveBeats(60, 1/4)
    expect(track.getCurrentTempo()).toBe(60)

    track.setTempo(120)
    expect(track.getCurrentTempo()).toBe(120)

    track.setTempo(180)
    expect(track.getCurrentTempo()).toBe(180)

    track.stop()
  })
})

describe('Beat event structure', () => {
  it('emits "beat" event for scheduled beats within lookahead', () => {
    const track = createBeatTrack()
    const sound = createSound()
    track.addSound(sound)

    const beatEvents: any[] = []
    track.addEventListener('beat', (e: any) => {
      beatEvents.push(e.detail)
    })

    track.playActiveBeats(120, 1/4)

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

    track.playActiveBeats(120, 1/4)

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

    track.playActiveBeats(120, 1/4)

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

    track.playActiveBeats(120, 1/4)

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

    track.playActiveBeats(120, 1/4)

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

    track.playActiveBeats(120, 1/4)

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

  track.playActiveBeats(120, 1/4)
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

  track.playActiveBeats(120, 1/4)
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

  track.playActiveBeats(120, 1/4)
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

  track.playActiveBeats(120, 1/4)

  track.pause()
  track.resume()
  track.pause()
  track.resume()

  expect(pauseCount).toBe(2)
  expect(resumeCount).toBe(2)
})
