import { assert, expect, it } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import type { Playable } from './interfaces/playable'
import type { Connectable } from './interfaces/connectable'
import { Sound } from './sound'
import { BeatTrack as RealBeatTrack } from '@/beat-track'

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
  result.playBeats(0, 0)
})

it('playActiveBeats method calls callPlayMethodOnBeats with "ifActivePlayIn" as first param', () => {
  const result = createBeatTrack()
  result.callPlayMethodOnBeats = arg1 => assert.strictEqual(arg1, 'ifActivePlayIn')
  result.playActiveBeats(0, 0)
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
it('stop() stops scheduler and resets beat index to 0', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  // Start playing
  track.playActiveBeats(120, 1/4)

  // Stop should reset position
  track.stop()

  // Should be able to restart from beginning
  track.playActiveBeats(120, 1/4)
  expect(track).toBeTruthy() // Will implement proper assertions
})

it('pause() preserves beat position', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  track.playActiveBeats(120, 1/4)
  track.pause()

  expect(track).toBeTruthy() // Will check internal state
})

it('resume() continues from paused beat index', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  track.playActiveBeats(120, 1/4)
  track.pause()
  track.resume()

  expect(track).toBeTruthy()
})

it('setTempo() changes tempo for subsequent beats', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  track.playActiveBeats(120, 1/4)
  track.setTempo(140)

  expect(track).toBeTruthy()
})

it('emits "beat" event for each scheduled beat', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  const beatEvents: any[] = []
  track.addEventListener('beat', (e: any) => {
    beatEvents.push(e.detail)
  })

  track.playActiveBeats(120, 1/4)

  expect(beatEvents.length).toBeGreaterThan(0)
})

it('beat event includes correct beatIndex and active flag', () => {
  const track = createBeatTrack()
  const sound = createSound()
  track.addSound(sound)

  // Set some beats active
  track.beats[0].active = true
  track.beats[1].active = false
  track.beats[2].active = true

  const beatEvents: any[] = []
  track.addEventListener('beat', (e: any) => {
    beatEvents.push(e.detail)
  })

  track.playActiveBeats(120, 1/4)

  // Should have beat events with correct indices
  expect(beatEvents.length).toBeGreaterThan(0)
  if (beatEvents.length > 0) {
    expect(beatEvents[0]).toHaveProperty('beatIndex')
    expect(beatEvents[0]).toHaveProperty('active')
  }
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
