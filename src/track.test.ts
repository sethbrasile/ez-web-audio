import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Track } from '@/track'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createTrack(context: AudioContext, durationSeconds: number = 10) {
  // Create buffer with specific duration
  // Buffer params: channels, length, sampleRate
  const sampleRate = 44100
  const length = Math.floor(durationSeconds * sampleRate)
  const audioBuffer = context.createBuffer(1, length, sampleRate)
  return new Track(context, audioBuffer)
}

describe('track', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('exists', () => {
      expect(Track).toBeTruthy()
    })

    it('can be created from AudioBuffer', () => {
      const track = createTrack(audioContext)
      expect(track).toBeTruthy()
      expect(track).toBeInstanceOf(Track)
    })

    it('inherits from Sound', () => {
      const track = createTrack(audioContext)
      // Track extends Sound, so it should have Sound properties
      expect(track.audioSourceNode).toBeDefined()
      expect(track.gainNode).toBeDefined()
    })

    it('has play and stop methods', () => {
      const track = createTrack(audioContext)
      expect(typeof track.play).toBe('function')
      expect(typeof track.stop).toBe('function')
    })

    it('has pause and resume methods', () => {
      const track = createTrack(audioContext)
      expect(typeof track.pause).toBe('function')
      expect(typeof track.resume).toBe('function')
    })

    it('has seek method', () => {
      const track = createTrack(audioContext)
      expect(typeof track.seek).toBe('function')
    })
  })

  describe('position tracking', () => {
    it('position returns TimeObject', () => {
      const track = createTrack(audioContext, 60)
      const position = track.position
      expect(position).toHaveProperty('raw')
      expect(position).toHaveProperty('string')
      expect(position).toHaveProperty('pojo')
    })

    it('position.raw is in seconds', () => {
      const track = createTrack(audioContext, 60)
      const position = track.position
      expect(typeof position.raw).toBe('number')
    })

    it('position.pojo has minutes and seconds', () => {
      const track = createTrack(audioContext, 60)
      const position = track.position
      expect(position.pojo).toHaveProperty('minutes')
      expect(position.pojo).toHaveProperty('seconds')
    })

    it('position.string is formatted time', () => {
      const track = createTrack(audioContext, 60)
      const position = track.position
      expect(typeof position.string).toBe('string')
    })

    it('position starts at 0', () => {
      const track = createTrack(audioContext, 60)
      expect(track.position.raw).toBe(0)
    })

    it('percentPlayed returns number', () => {
      const track = createTrack(audioContext, 60)
      const percent = track.percentPlayed
      expect(typeof percent).toBe('number')
    })

    it('percentPlayed starts at 0', () => {
      const track = createTrack(audioContext, 60)
      expect(track.percentPlayed).toBe(0)
    })

    it('percentPlayed reflects startOffset', () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 5 // 50% of 10 seconds
      expect(track.percentPlayed).toBeCloseTo(50, 0)
    })
  })

  describe('pause', () => {
    it('pause() stops playback', async () => {
      const track = createTrack(audioContext)
      await track.play()
      expect(track.isPlaying).toBe(true)
      track.pause()
      expect(track.isPlaying).toBe(false)
    })

    it('pause() preserves position (startOffset > 0)', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 2
      await track.play()
      track.pause()
      // After pause, startOffset should be preserved/updated (not reset to 0)
      expect(track.startOffset).toBeGreaterThan(0)
    })

    it('pause() emits pause event', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('pause', handler)
      await track.play()
      track.pause()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('pause event includes position', async () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('pause', handler)
      track.startOffset = 3
      await track.play()
      track.pause()
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            position: expect.any(Number),
          }),
        }),
      )
    })

    it('pause event includes time and source', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('pause', handler)
      await track.play()
      track.pause()
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: track,
          }),
        }),
      )
    })

    it('pause() does nothing when not playing', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('pause', handler)
      track.pause()
      // Should not emit event
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('resume', () => {
    it('resume() continues from paused position', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 3
      await track.play()
      track.pause()
      expect(track.isPlaying).toBe(false)
      track.resume()
      await settle(() => track.isPlaying)
      expect(track.isPlaying).toBe(true)
    })

    it('resume() emits resume event', async () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('resume', handler)
      track.startOffset = 2
      await track.play()
      track.pause()
      track.resume()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('resume event includes position', async () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('resume', handler)
      track.startOffset = 5
      await track.play()
      track.pause()
      track.resume()
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            position: expect.any(Number),
          }),
        }),
      )
    })

    it('resume event includes time and source', async () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('resume', handler)
      track.startOffset = 2
      await track.play()
      track.pause()
      track.resume()
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: track,
          }),
        }),
      )
    })

    it('resume() does nothing if startOffset is 0', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('resume', handler)
      // Not paused, just stopped
      track.resume()
      // Should not emit event or start playing
      expect(handler).not.toHaveBeenCalled()
    })

    it('resume() does nothing if already playing', async () => {
      const track = createTrack(audioContext, 10)
      await track.play()
      const handler = vi.fn()
      track.on('resume', handler)
      track.startOffset = 2 // Set offset but already playing
      // Trying to resume while playing - _isPlaying is true so condition fails
      track.resume()
      // Should not emit
      expect(handler).not.toHaveBeenCalled()
    })

    it('multiple pause/resume cycles work', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 1

      // First cycle
      await track.play()
      expect(track.isPlaying).toBe(true)
      track.pause()
      expect(track.isPlaying).toBe(false)
      track.resume()
      await settle(() => track.isPlaying)
      expect(track.isPlaying).toBe(true)

      // Second cycle
      track.pause()
      expect(track.isPlaying).toBe(false)
      track.resume()
      await settle(() => track.isPlaying)
      expect(track.isPlaying).toBe(true)
    })
  })

  describe('stop', () => {
    it('stop() resets startOffset to 0', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 5
      await track.play()
      await track.stop()
      expect(track.startOffset).toBe(0)
    })

    it('stop() sets isPlaying to false', async () => {
      const track = createTrack(audioContext)
      await track.play()
      expect(track.isPlaying).toBe(true)
      await track.stop()
      expect(track.isPlaying).toBe(false)
    })

    it('stop after pause resets position', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 3
      await track.play()
      track.pause()
      expect(track.startOffset).toBeGreaterThan(0)
      await track.stop()
      expect(track.startOffset).toBe(0)
    })

    it('stop returns a Promise', async () => {
      const track = createTrack(audioContext)
      await track.play()
      const result = track.stop()
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('seek with ratio', () => {
    it('seek(0.5).as("ratio") moves to 50% of duration', () => {
      const track = createTrack(audioContext, 10) // 10 seconds
      track.seek(0.5).as('ratio')
      expect(track.startOffset).toBeCloseTo(5, 0)
    })

    it('seek(0).as("ratio") moves to beginning', () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 5
      track.seek(0).as('ratio')
      expect(track.startOffset).toBe(0)
    })

    it('seek(1).as("ratio") moves to end', () => {
      const track = createTrack(audioContext, 10)
      track.seek(1).as('ratio')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })
  })

  describe('seek with percent', () => {
    it('seek(50).as("percent") moves to 50% of duration', () => {
      const track = createTrack(audioContext, 10)
      track.seek(50).as('percent')
      expect(track.startOffset).toBeCloseTo(5, 0)
    })

    it('seek(0).as("percent") moves to beginning', () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 5
      track.seek(0).as('percent')
      expect(track.startOffset).toBe(0)
    })

    it('seek(100).as("percent") moves to end', () => {
      const track = createTrack(audioContext, 10)
      track.seek(100).as('percent')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })
  })

  describe('seek with seconds', () => {
    it('seek(5).as("seconds") moves to 5 seconds', () => {
      const track = createTrack(audioContext, 10)
      track.seek(5).as('seconds')
      expect(track.startOffset).toBe(5)
    })

    it('seek(0).as("seconds") moves to beginning', () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 3
      track.seek(0).as('seconds')
      expect(track.startOffset).toBe(0)
    })

    it('seek to duration moves to end', () => {
      const track = createTrack(audioContext, 10)
      track.seek(10).as('seconds')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })
  })

  describe('seek with inverseRatio', () => {
    it('seek(0.25).as("inverseRatio") moves to 75% of duration', () => {
      const track = createTrack(audioContext, 10)
      track.seek(0.25).as('inverseRatio')
      // inverseRatio: duration - (amount * duration) = 10 - (0.25 * 10) = 7.5
      expect(track.startOffset).toBeCloseTo(7.5, 0)
    })

    it('seek(0).as("inverseRatio") moves to end', () => {
      const track = createTrack(audioContext, 10)
      track.seek(0).as('inverseRatio')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })

    it('seek(1).as("inverseRatio") moves to beginning', () => {
      const track = createTrack(audioContext, 10)
      track.seek(1).as('inverseRatio')
      expect(track.startOffset).toBe(0)
    })
  })

  describe('seek events', () => {
    it('seek emits seek event', () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('seek', handler)
      track.seek(5).as('seconds')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('seek event includes position', () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('seek', handler)
      track.seek(5).as('seconds')
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            position: 5,
          }),
        }),
      )
    })

    it('seek event includes previousPosition', () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 2
      const handler = vi.fn()
      track.on('seek', handler)
      track.seek(5).as('seconds')
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            previousPosition: 2,
          }),
        }),
      )
    })

    it('seek event includes time and source', () => {
      const track = createTrack(audioContext, 10)
      const handler = vi.fn()
      track.on('seek', handler)
      track.seek(5).as('seconds')
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            time: expect.any(Number),
            source: track,
          }),
        }),
      )
    })
  })

  describe('seek while playing', () => {
    it('seek while playing triggers stop and reschedules play', async () => {
      const track = createTrack(audioContext, 10)
      await track.play()
      expect(track.isPlaying).toBe(true)
      const stopSpy = vi.spyOn(track, 'stop')
      await track.seek(5).as('seconds')
      // Seek while playing calls stop then schedules play via later()
      expect(stopSpy).toHaveBeenCalled()
      expect(track.startOffset).toBe(5)
    })

    it('seek updates position even when playing', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 2
      await track.play()
      await track.seek(7).as('seconds')
      // Position should be updated to new value
      expect(track.startOffset).toBe(7)
    })
  })

  describe('seek while paused', () => {
    it('seek while paused updates position without playing', async () => {
      const track = createTrack(audioContext, 10)
      track.startOffset = 2
      await track.play()
      track.pause()
      expect(track.isPlaying).toBe(false)
      track.seek(5).as('seconds')
      // Should update position but not play
      expect(track.startOffset).toBe(5)
      expect(track.isPlaying).toBe(false)
    })
  })

  describe('seek clamping', () => {
    it('seek clamps to 0 (minimum)', () => {
      const track = createTrack(audioContext, 10)
      track.seek(-5).as('seconds')
      expect(track.startOffset).toBe(0)
    })

    it('seek clamps to duration (maximum)', () => {
      const track = createTrack(audioContext, 10)
      track.seek(20).as('seconds')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })

    it('seek with negative ratio clamps to 0', () => {
      const track = createTrack(audioContext, 10)
      track.seek(-0.5).as('ratio')
      expect(track.startOffset).toBe(0)
    })

    it('seek with ratio > 1 clamps to duration', () => {
      const track = createTrack(audioContext, 10)
      track.seek(1.5).as('ratio')
      expect(track.startOffset).toBeCloseTo(10, 0)
    })
  })

  describe('event payloads', () => {
    it('pause event payload structure', async () => {
      const track = createTrack(audioContext, 10)
      let eventPayload: any = null
      track.on('pause', (e) => {
        eventPayload = e.detail
      })
      track.startOffset = 3
      await track.play()
      track.pause()
      expect(eventPayload).toHaveProperty('time')
      expect(eventPayload).toHaveProperty('source')
      expect(eventPayload).toHaveProperty('position')
      expect(eventPayload.source).toBe(track)
    })

    it('resume event payload structure', async () => {
      const track = createTrack(audioContext, 10)
      let eventPayload: any = null
      track.on('resume', (e) => {
        eventPayload = e.detail
      })
      track.startOffset = 3
      await track.play()
      track.pause()
      track.resume()
      expect(eventPayload).toHaveProperty('time')
      expect(eventPayload).toHaveProperty('source')
      expect(eventPayload).toHaveProperty('position')
      expect(eventPayload.source).toBe(track)
    })

    it('seek event payload structure', () => {
      const track = createTrack(audioContext, 10)
      let eventPayload: any = null
      track.on('seek', (e) => {
        eventPayload = e.detail
      })
      track.startOffset = 2
      track.seek(5).as('seconds')
      expect(eventPayload).toHaveProperty('time')
      expect(eventPayload).toHaveProperty('source')
      expect(eventPayload).toHaveProperty('position')
      expect(eventPayload).toHaveProperty('previousPosition')
      expect(eventPayload.source).toBe(track)
      expect(eventPayload.position).toBe(5)
      expect(eventPayload.previousPosition).toBe(2)
    })
  })

  describe('inheritance from Sound', () => {
    it('inherits play/stop behavior', async () => {
      const track = createTrack(audioContext)
      await track.play()
      expect(track.isPlaying).toBe(true)
      await track.stop()
      expect(track.isPlaying).toBe(false)
    })

    it('inherits duration property', () => {
      const track = createTrack(audioContext, 5)
      const duration = track.duration
      expect(duration.raw).toBeCloseTo(5, 0)
    })

    it('inherits gainNode', () => {
      const track = createTrack(audioContext)
      expect(track.gainNode).toBeDefined()
    })

    it('inherits changeGainTo', () => {
      const track = createTrack(audioContext)
      const result = track.changeGainTo(0.5)
      expect(result).toBe(track)
    })

    it('inherits event system', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('play', handler)
      await track.play()
      expect(handler).toHaveBeenCalled()
    })
  })

  describe('seek fluent API', () => {
    it('seek() returns object with as method', () => {
      const track = createTrack(audioContext, 10)
      const result = track.seek(5)
      expect(result).toHaveProperty('as')
      expect(typeof result.as).toBe('function')
    })

    it('from() accepts SeekType', () => {
      const track = createTrack(audioContext, 10)
      // These should all work without throwing
      expect(() => track.seek(0.5).as('ratio')).not.toThrow()
      expect(() => track.seek(50).as('percent')).not.toThrow()
      expect(() => track.seek(5).as('seconds')).not.toThrow()
      expect(() => track.seek(0.25).as('inverseRatio')).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('pause when not playing does nothing and emits no event', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('pause', handler)

      // Not playing
      expect(track.isPlaying).toBe(false)

      // Pause when not playing
      track.pause()

      // No pause event should be emitted
      expect(handler).not.toHaveBeenCalled()
      expect(track.isPlaying).toBe(false)
    })

    it('resume when not paused does nothing (startOffset is 0)', async () => {
      const track = createTrack(audioContext)
      const handler = vi.fn()
      track.on('resume', handler)

      // Not paused (startOffset is 0)
      expect(track.startOffset).toBe(0)

      // Resume when not paused
      track.resume()

      // No resume event should be emitted
      expect(handler).not.toHaveBeenCalled()
      expect(track.isPlaying).toBe(false)
    })

    it('concurrent seek calls - final position reflects last seek', () => {
      const track = createTrack(audioContext, 10)

      // First seek
      track.seek(0.5).as('ratio') // 5 seconds
      expect(track.startOffset).toBeCloseTo(5, 0)

      // Immediate second seek (no async gap)
      track.seek(0.8).as('ratio') // 8 seconds
      expect(track.startOffset).toBeCloseTo(8, 0)
    })

    it('seek to exactly duration sets position to end', () => {
      const track = createTrack(audioContext, 10)
      const duration = track.duration.raw

      track.seek(duration).as('seconds')

      // Should be at or very close to duration
      expect(track.startOffset).toBeCloseTo(duration, 0)
    })

    it('seek to exactly duration via ratio (1.0)', () => {
      const track = createTrack(audioContext, 10)
      const duration = track.duration.raw

      track.seek(1.0).as('ratio')

      expect(track.startOffset).toBeCloseTo(duration, 0)
    })

    it('seek emits event with correct position on multiple seeks', () => {
      const track = createTrack(audioContext, 10)
      const positions: number[] = []

      track.on('seek', (e) => {
        positions.push(e.detail.position)
      })

      track.seek(3).as('seconds')
      track.seek(7).as('seconds')
      track.seek(2).as('seconds')

      expect(positions).toEqual([3, 7, 2])
    })
  })
})
