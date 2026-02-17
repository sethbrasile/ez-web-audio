import type { Playable } from '@interfaces/playable'
import type { Track } from '@/track'
import { describe, expect, it, vi } from 'vitest'
import { pauseAll, playAll, stopAll } from './collections'

/**
 * Creates a mock Playable object with vi.fn() for play/stop methods.
 */
function createMockPlayable(overrides?: Partial<Playable>): Playable {
  return {
    play: vi.fn(),
    playAt: vi.fn(),
    playIn: vi.fn(),
    playFor: vi.fn(),
    playInAndStopAfter: vi.fn(),
    stop: vi.fn(),
    stopIn: vi.fn(),
    stopAt: vi.fn(),
    isPlaying: false,
    duration: { raw: 0, string: '00:00', pojo: { minutes: 0, seconds: 0 } },
    onPlaySet: vi.fn() as Playable['onPlaySet'],
    onPlayRamp: vi.fn() as Playable['onPlayRamp'],
    ...overrides,
  }
}

/**
 * Creates a mock Track object with additional pause method.
 */
function createMockTrack(overrides?: Partial<Track>): Track {
  return {
    ...createMockPlayable(),
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn() as Track['seek'],
    position: { raw: 0, string: '00:00', pojo: { minutes: 0, seconds: 0 } },
    percentPlayed: 0,
    ...overrides,
  } as unknown as Track
}

describe('stopAll', () => {
  it('stops all sounds in flat array', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()
    const sound3 = createMockPlayable()

    await stopAll([sound1, sound2, sound3])

    expect(sound1.stop).toHaveBeenCalledTimes(1)
    expect(sound2.stop).toHaveBeenCalledTimes(1)
    expect(sound3.stop).toHaveBeenCalledTimes(1)
  })

  it('stops all sounds in nested arrays (2+ levels deep)', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()
    const sound3 = createMockPlayable()
    const sound4 = createMockPlayable()

    // Nested structure: [sound1, [sound2, [sound3, sound4]]]
    await stopAll([sound1, [sound2, [sound3, sound4] as unknown as Playable[]] as unknown as Playable[]])

    expect(sound1.stop).toHaveBeenCalledTimes(1)
    expect(sound2.stop).toHaveBeenCalledTimes(1)
    expect(sound3.stop).toHaveBeenCalledTimes(1)
    expect(sound4.stop).toHaveBeenCalledTimes(1)
  })

  it('returns resolved Promise when all succeed', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()

    await expect(stopAll([sound1, sound2])).resolves.toBeUndefined()
  })

  it('rejects with aggregate error when some fail', async () => {
    const error = new Error('Stop failed')
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable({ stop: vi.fn().mockRejectedValue(error) })
    const sound3 = createMockPlayable()

    await expect(stopAll([sound1, sound2, sound3])).rejects.toThrow('Failed to stop 1 of 3 sounds')

    // All sounds should still be attempted
    expect(sound1.stop).toHaveBeenCalledTimes(1)
    expect(sound2.stop).toHaveBeenCalledTimes(1)
    expect(sound3.stop).toHaveBeenCalledTimes(1)
  })

  it('works with empty array', async () => {
    await expect(stopAll([])).resolves.toBeUndefined()
  })

  it('includes all errors in CollectionError', async () => {
    const error1 = new Error('Error 1')
    const error2 = new Error('Error 2')
    const sound1 = createMockPlayable({ stop: vi.fn().mockRejectedValue(error1) })
    const sound2 = createMockPlayable({ stop: vi.fn().mockRejectedValue(error2) })

    try {
      await stopAll([sound1, sound2])
      expect.fail('Should have thrown')
    }
    catch (e: unknown) {
      expect(e).toHaveProperty('errors')
      expect((e as { errors: Error[] }).errors).toHaveLength(2)
      expect((e as { total: number }).total).toBe(2)
    }
  })
})

describe('pauseAll', () => {
  it('pauses all tracks in flat array', async () => {
    const track1 = createMockTrack()
    const track2 = createMockTrack()
    const track3 = createMockTrack()

    await pauseAll([track1, track2, track3])

    expect(track1.pause).toHaveBeenCalledTimes(1)
    expect(track2.pause).toHaveBeenCalledTimes(1)
    expect(track3.pause).toHaveBeenCalledTimes(1)
  })

  it('pauses all tracks in nested arrays', async () => {
    const track1 = createMockTrack()
    const track2 = createMockTrack()
    const track3 = createMockTrack()

    await pauseAll([track1, [track2, track3]])

    expect(track1.pause).toHaveBeenCalledTimes(1)
    expect(track2.pause).toHaveBeenCalledTimes(1)
    expect(track3.pause).toHaveBeenCalledTimes(1)
  })

  it('skips items without pause method (Playables that are not Tracks)', async () => {
    const track = createMockTrack()
    // Create a "Playable" that doesn't have pause - simulate mixed array
    const playable = createMockPlayable()

    // Cast to bypass type checking - simulates runtime scenario
    await pauseAll([track, playable as unknown as Track])

    expect(track.pause).toHaveBeenCalledTimes(1)
    // Playable without pause should be skipped (no error thrown)
  })

  it('returns resolved Promise when all succeed', async () => {
    const track1 = createMockTrack()
    const track2 = createMockTrack()

    await expect(pauseAll([track1, track2])).resolves.toBeUndefined()
  })

  it('rejects with aggregate error when some fail', async () => {
    const error = new Error('Pause failed')
    const track1 = createMockTrack()
    const track2 = createMockTrack({ pause: vi.fn().mockRejectedValue(error) } as Partial<Track>)
    const track3 = createMockTrack()

    await expect(pauseAll([track1, track2, track3])).rejects.toThrow('Failed to pause 1 of 3 tracks')

    // All tracks should still be attempted
    expect(track1.pause).toHaveBeenCalledTimes(1)
    expect(track2.pause).toHaveBeenCalledTimes(1)
    expect(track3.pause).toHaveBeenCalledTimes(1)
  })

  it('works with empty array', async () => {
    await expect(pauseAll([])).resolves.toBeUndefined()
  })
})

describe('playAll', () => {
  it('plays all sounds in flat array', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()
    const sound3 = createMockPlayable()

    await playAll([sound1, sound2, sound3])

    expect(sound1.play).toHaveBeenCalledTimes(1)
    expect(sound2.play).toHaveBeenCalledTimes(1)
    expect(sound3.play).toHaveBeenCalledTimes(1)
  })

  it('plays all sounds in nested arrays', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()
    const sound3 = createMockPlayable()
    const sound4 = createMockPlayable()

    await playAll([sound1, [sound2, sound3], sound4])

    expect(sound1.play).toHaveBeenCalledTimes(1)
    expect(sound2.play).toHaveBeenCalledTimes(1)
    expect(sound3.play).toHaveBeenCalledTimes(1)
    expect(sound4.play).toHaveBeenCalledTimes(1)
  })

  it('returns resolved Promise when all succeed', async () => {
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable()

    await expect(playAll([sound1, sound2])).resolves.toBeUndefined()
  })

  it('rejects with aggregate error when some fail', async () => {
    const error = new Error('Play failed')
    const sound1 = createMockPlayable()
    const sound2 = createMockPlayable({ play: vi.fn().mockRejectedValue(error) })
    const sound3 = createMockPlayable()

    await expect(playAll([sound1, sound2, sound3])).rejects.toThrow('Failed to play 1 of 3 sounds')

    // All sounds should still be attempted
    expect(sound1.play).toHaveBeenCalledTimes(1)
    expect(sound2.play).toHaveBeenCalledTimes(1)
    expect(sound3.play).toHaveBeenCalledTimes(1)
  })

  it('works with empty array', async () => {
    await expect(playAll([])).resolves.toBeUndefined()
  })

  it('includes all errors in CollectionError', async () => {
    const error1 = new Error('Error 1')
    const error2 = new Error('Error 2')
    const sound1 = createMockPlayable({ play: vi.fn().mockRejectedValue(error1) })
    const sound2 = createMockPlayable({ play: vi.fn().mockRejectedValue(error2) })

    try {
      await playAll([sound1, sound2])
      expect.fail('Should have thrown')
    }
    catch (e: unknown) {
      expect(e).toHaveProperty('errors')
      expect((e as { errors: Error[] }).errors).toHaveLength(2)
      expect((e as { total: number }).total).toBe(2)
    }
  })
})
