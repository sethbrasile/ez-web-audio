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
