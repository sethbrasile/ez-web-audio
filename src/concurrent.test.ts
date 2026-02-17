import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sound } from './sound'
import { Track } from './track'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext, durationSeconds: number = 10) {
  const sampleRate = 44100
  const length = Math.floor(durationSeconds * sampleRate)
  const audioBuffer = context.createBuffer(1, length, sampleRate)
  return new Sound(context, audioBuffer)
}

function createTrack(context: AudioContext, durationSeconds: number = 10) {
  const sampleRate = 44100
  const length = Math.floor(durationSeconds * sampleRate)
  const audioBuffer = context.createBuffer(1, length, sampleRate)
  return new Track(context, audioBuffer)
}

describe('play while playing (layering)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('second play while playing creates a new source node', async () => {
    const sound = createSound(audioContext)

    await sound.play()
    const firstSource = sound.audioSourceNode
    expect(sound.isPlaying).toBe(true)

    // Play again without stopping — should create a new AudioBufferSourceNode
    await sound.play()
    const secondSource = sound.audioSourceNode

    // AudioBufferSourceNode is single-use; a new one must be created each play()
    expect(secondSource).not.toBe(firstSource)
    expect(sound.isPlaying).toBe(true)
  })

  it('both play events fire when playing twice without stopping', async () => {
    const sound = createSound(audioContext)
    const handler = vi.fn()
    sound.on('play', handler)

    await sound.play()
    await sound.play()

    // Both play events should fire (layering, not replacing)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('no errors thrown during overlapping plays', async () => {
    const sound = createSound(audioContext)

    await expect(async () => {
      await sound.play()
      await sound.play()
    }).not.toThrow()
  })

  it('rapid triple-play: all three play events fire', async () => {
    const sound = createSound(audioContext)
    const handler = vi.fn()
    sound.on('play', handler)

    await sound.play()
    await sound.play()
    await sound.play()

    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('isPlaying remains true after second play', async () => {
    const sound = createSound(audioContext)

    await sound.play()
    expect(sound.isPlaying).toBe(true)

    await sound.play()
    expect(sound.isPlaying).toBe(true)
  })

  it('sound is still playing after layered play-stop cycle', async () => {
    // First play, second play (layered), then stop should reflect stopped state
    const sound = createSound(audioContext)

    sound.play()
    sound.play()

    expect(await settle(() => sound.isPlaying)).toBe(true)

    await sound.stop()
    expect(sound.isPlaying).toBe(false)
  })
})

describe('rapid seek (coalesces to last value)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('multiple seeks in sequence: startOffset reflects the last seek value', () => {
    const track = createTrack(audioContext, 60) // 60 seconds

    track.seek(10).as('seconds')
    track.seek(20).as('seconds')
    track.seek(30).as('seconds')

    // The last seek wins
    expect(track.startOffset).toBe(30)
  })

  it('rapid ratio seeks: startOffset reflects the last seek', () => {
    const track = createTrack(audioContext, 10) // 10 seconds

    track.seek(0.1).as('ratio') // 1 second
    track.seek(0.5).as('ratio') // 5 seconds
    track.seek(0.9).as('ratio') // 9 seconds

    // Last seek: 0.9 ratio of 10 seconds = 9 seconds
    expect(track.startOffset).toBeCloseTo(9, 0)
  })

  it('three seeks: intermediate values are superseded by the last', () => {
    const track = createTrack(audioContext, 100) // 100 seconds

    track.seek(25).as('seconds')
    expect(track.startOffset).toBe(25)

    track.seek(50).as('seconds')
    expect(track.startOffset).toBe(50)

    track.seek(75).as('seconds')
    expect(track.startOffset).toBe(75)
  })

  it('seek events are emitted for each call', () => {
    const track = createTrack(audioContext, 30)
    const handler = vi.fn()
    track.on('seek', handler)

    track.seek(5).as('seconds')
    track.seek(10).as('seconds')
    track.seek(15).as('seconds')

    // Each seek call emits a seek event
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('seek events carry correct position values', () => {
    const track = createTrack(audioContext, 30)
    const positions: number[] = []
    track.on('seek', e => positions.push(e.detail.position))

    track.seek(5).as('seconds')
    track.seek(10).as('seconds')
    track.seek(20).as('seconds')

    expect(positions).toEqual([5, 10, 20])
    // Final position is 20 (last seek wins)
    expect(track.startOffset).toBe(20)
  })

  it('mixed seek types: last seek determines final position', () => {
    const track = createTrack(audioContext, 10)

    track.seek(0.2).as('ratio')    // 2 seconds
    track.seek(50).as('percent')   // 5 seconds
    track.seek(8).as('seconds')    // 8 seconds

    // Last seek (8 seconds) wins
    expect(track.startOffset).toBe(8)
  })

  it('repeated seeks to same position are idempotent', () => {
    const track = createTrack(audioContext, 10)

    track.seek(5).as('seconds')
    track.seek(5).as('seconds')
    track.seek(5).as('seconds')

    expect(track.startOffset).toBe(5)
  })
})

describe('double stop (no-op)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('second stop() is a silent no-op (no error)', async () => {
    const sound = createSound(audioContext)
    await sound.play()
    expect(sound.isPlaying).toBe(true)

    await sound.stop()
    expect(sound.isPlaying).toBe(false)

    // Second stop should not throw
    await expect(sound.stop()).resolves.not.toThrow()
    expect(sound.isPlaying).toBe(false)
  })

  it('stop event is called exactly once even with two stop() calls', async () => {
    const sound = createSound(audioContext)
    const handler = vi.fn()
    sound.on('stop', handler)

    await sound.play()
    await sound.stop()
    await sound.stop()

    // Second stop is a no-op because _isPlaying is already false
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('triple stop() is safe — no errors, stop event fires once', async () => {
    const sound = createSound(audioContext)
    const handler = vi.fn()
    sound.on('stop', handler)

    await sound.play()
    await sound.stop()
    await sound.stop()
    await sound.stop()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(sound.isPlaying).toBe(false)
  })

  it('stop() on a sound that was never played is a no-op', async () => {
    const sound = createSound(audioContext)
    const handler = vi.fn()
    sound.on('stop', handler)

    // Stop before ever playing
    await expect(sound.stop()).resolves.not.toThrow()
    expect(sound.isPlaying).toBe(false)
    expect(handler).not.toHaveBeenCalled()
  })

  it('Track: pause() then stop() then stop() — no error on second stop', async () => {
    const track = createTrack(audioContext)

    await track.play()
    track.pause()
    await track.stop()

    // Second stop — should be no-op
    await expect(track.stop()).resolves.not.toThrow()
    expect(track.isPlaying).toBe(false)
  })

  it('Track: double stop while playing resets state cleanly', async () => {
    const track = createTrack(audioContext)
    const handler = vi.fn()
    track.on('stop', handler)

    await track.play()
    await track.stop()
    await track.stop()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(track.isPlaying).toBe(false)
    // Track.stop() also resets startOffset to 0
    expect(track.startOffset).toBe(0)
  })

  it('sound can be played again after double stop', async () => {
    const sound = createSound(audioContext)

    await sound.play()
    await sound.stop()
    await sound.stop() // No-op second stop

    // Should be able to play again
    await sound.play()
    expect(await settle(() => sound.isPlaying)).toBe(true)
  })
})
