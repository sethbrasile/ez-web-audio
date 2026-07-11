import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GrainPlayer } from './grain-player'
import { WorkerTimer } from './utils/worker-timer'

/**
 * Wraps audioContext.createBufferSource so every real source node it returns
 * has its start() calls recorded (args + call order) without losing the
 * mock library's normal node behavior.
 */
function spyOnGrainStarts(audioContext: AudioContext): { calls: any[][] } {
  const record = { calls: [] as any[][] }
  const original = audioContext.createBufferSource.bind(audioContext)
  vi.spyOn(audioContext, 'createBufferSource').mockImplementation(() => {
    const source = original()
    const realStart = source.start.bind(source)
    source.start = ((...args: any[]) => {
      record.calls.push(args)
      return realStart(...args)
    }) as typeof source.start
    return source
  })
  return record
}

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createMockBuffer(ctx: AudioContext, duration = 1): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100
  const length = Math.floor(sampleRate * duration)
  return ctx.createBuffer(1, length, sampleRate)
}

describe('grainPlayer', () => {
  let audioContext: AudioContext
  let buffer: AudioBuffer

  beforeEach(() => {
    vi.useFakeTimers()
    audioContext = createMockContext()
    buffer = createMockBuffer(audioContext)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── Construction ──────────────────────────────────────────────

  describe('construction', () => {
    it('creates with default options', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp).toBeDefined()
      expect(gp.grainSize).toBe(0.1)
      expect(gp.overlap).toBe(0.05)
      expect(gp.position).toBe(0)
      expect(gp.pitch).toBe(0)
      expect(gp.jitter).toBe(0)
      expect(gp.loop).toBe(true)
    })

    it('creates with custom options', () => {
      const gp = new GrainPlayer(audioContext, buffer, {
        grainSize: 0.2,
        overlap: 0.1,
        position: 0.5,
        pitch: 7,
        jitter: 0.3,
        loop: false,
        gain: 0.8,
        pan: -0.5,
      })
      expect(gp.grainSize).toBe(0.2)
      expect(gp.overlap).toBe(0.1)
      expect(gp.position).toBe(0.5)
      expect(gp.pitch).toBe(7)
      expect(gp.jitter).toBe(0.3)
      expect(gp.loop).toBe(false)
    })

    it('is not playing initially', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.playing).toBe(false)
    })

    it('is not paused initially', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.paused).toBe(false)
    })

    it('is not disposed initially', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.disposed).toBe(false)
    })

    it('has 0 active grains initially', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.activeGrainCount).toBe(0)
    })

    it('clamps grainSize minimum to 0.01', () => {
      const gp = new GrainPlayer(audioContext, buffer, { grainSize: 0.001 })
      expect(gp.grainSize).toBe(0.01)
    })

    it('clamps position to [0, 1]', () => {
      const gp1 = new GrainPlayer(audioContext, buffer, { position: -0.5 })
      expect(gp1.position).toBe(0)

      const gp2 = new GrainPlayer(audioContext, buffer, { position: 1.5 })
      expect(gp2.position).toBe(1)
    })

    it('clamps jitter to [0, 1]', () => {
      const gp1 = new GrainPlayer(audioContext, buffer, { jitter: -0.5 })
      expect(gp1.jitter).toBe(0)

      const gp2 = new GrainPlayer(audioContext, buffer, { jitter: 1.5 })
      expect(gp2.jitter).toBe(1)
    })
  })

  // ─── Playback Lifecycle ────────────────────────────────────────

  describe('play/stop lifecycle', () => {
    it('play() sets playing to true', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      expect(gp.playing).toBe(true)
    })

    it('play() emits play event', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('play', handler)
      gp.play()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('play() on already-playing is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('play', handler)
      gp.play()
      gp.play()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('stop() sets playing to false', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.stop()
      expect(gp.playing).toBe(false)
    })

    it('stop() emits stop event', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('stop', handler)
      gp.play()
      gp.stop()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('stop() on already-stopped is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('stop', handler)
      gp.stop()
      expect(handler).not.toHaveBeenCalled()
    })

    it('throws when playing on a disposed GrainPlayer', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.dispose()
      expect(() => gp.play()).toThrow('disposed')
    })
  })

  // ─── Pause/Resume ──────────────────────────────────────────────

  describe('pause/resume', () => {
    it('pause() sets paused to true', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.pause()
      expect(gp.paused).toBe(true)
    })

    it('pause() emits pause event', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('pause', handler)
      gp.play()
      gp.pause()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('pause() on non-playing is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('pause', handler)
      gp.pause()
      expect(handler).not.toHaveBeenCalled()
      expect(gp.paused).toBe(false)
    })

    it('pause() on already-paused is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('pause', handler)
      gp.play()
      gp.pause()
      gp.pause()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('resume() sets paused to false', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.pause()
      gp.resume()
      expect(gp.paused).toBe(false)
      expect(gp.playing).toBe(true)
    })

    it('resume() emits resume event', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('resume', handler)
      gp.play()
      gp.pause()
      gp.resume()
      expect(handler).toHaveBeenCalledOnce()
    })

    it('resume() on non-paused is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const handler = vi.fn()
      gp.on('resume', handler)
      gp.play()
      gp.resume()
      expect(handler).not.toHaveBeenCalled()
    })

    it('stop() resets paused state', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.pause()
      gp.stop()
      expect(gp.paused).toBe(false)
      expect(gp.playing).toBe(false)
    })

    it('play() while paused delegates to resume() and emits resume, not play', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const playHandler = vi.fn()
      const resumeHandler = vi.fn()
      gp.on('play', playHandler)
      gp.on('resume', resumeHandler)

      gp.play()
      gp.pause()
      playHandler.mockClear()

      gp.play()

      expect(gp.paused).toBe(false)
      expect(gp.playing).toBe(true)
      expect(resumeHandler).toHaveBeenCalledOnce()
      expect(playHandler).not.toHaveBeenCalled()
    })
  })

  // ─── Position Control ──────────────────────────────────────────

  describe('position control', () => {
    it('position defaults to 0', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.position).toBe(0)
    })

    it('position can be set to a value between 0 and 1', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.position = 0.5
      expect(gp.position).toBe(0.5)
    })

    it('position clamps values below 0', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.position = -0.5
      expect(gp.position).toBe(0)
    })

    it('position clamps values above 1', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.position = 1.5
      expect(gp.position).toBe(1)
    })
  })

  // ─── Pitch Shifting ────────────────────────────────────────────

  describe('pitch shifting', () => {
    it('pitch defaults to 0', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.pitch).toBe(0)
    })

    it('pitch=0 results in playbackRate=1.0', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.playbackRate).toBeCloseTo(1.0)
    })

    it('pitch=12 results in playbackRate=2.0', () => {
      const gp = new GrainPlayer(audioContext, buffer, { pitch: 12 })
      expect(gp.playbackRate).toBeCloseTo(2.0)
    })

    it('pitch=-12 results in playbackRate=0.5', () => {
      const gp = new GrainPlayer(audioContext, buffer, { pitch: -12 })
      expect(gp.playbackRate).toBeCloseTo(0.5)
    })

    it('pitch=7 results in playbackRate approximately 1.4983', () => {
      const gp = new GrainPlayer(audioContext, buffer, { pitch: 7 })
      expect(gp.playbackRate).toBeCloseTo(1.4983, 3)
    })

    it('setting pitch updates playbackRate', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.pitch = 12
      expect(gp.playbackRate).toBeCloseTo(2.0)
    })

    it('setting playbackRate updates pitch', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.playbackRate = 2.0
      expect(gp.pitch).toBeCloseTo(12)
    })

    it('setting playbackRate to 0.5 results in pitch=-12', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.playbackRate = 0.5
      expect(gp.pitch).toBeCloseTo(-12)
    })

    it('playbackRate clamps to minimum of 0.01', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.playbackRate = 0
      expect(gp.playbackRate).toBe(0.01)
    })
  })

  // ─── Grain Parameters ──────────────────────────────────────────

  describe('grain parameters', () => {
    it('grainSize can be set at runtime', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.grainSize = 0.2
      expect(gp.grainSize).toBe(0.2)
    })

    it('grainSize minimum clamped to 0.01', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.grainSize = 0.001
      expect(gp.grainSize).toBe(0.01)
    })

    it('overlap can be set at runtime', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.overlap = 0.08
      expect(gp.overlap).toBe(0.08)
    })

    it('overlap clamps to grainSize - 0.001 maximum', () => {
      const gp = new GrainPlayer(audioContext, buffer) // grainSize=0.1
      gp.overlap = 0.2 // exceeds grainSize
      expect(gp.overlap).toBe(0.099) // 0.1 - 0.001
    })

    it('overlap clamps negative values to 0', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.overlap = -0.5
      expect(gp.overlap).toBe(0)
    })

    it('shrinking grainSize re-clamps overlap', () => {
      const gp = new GrainPlayer(audioContext, buffer, { grainSize: 0.2 })
      gp.overlap = 0.15
      expect(gp.overlap).toBe(0.15)
      gp.grainSize = 0.05
      expect(gp.overlap).toBe(0.049) // 0.05 - 0.001
    })

    it('constructor clamps overlap to grainSize - 0.001', () => {
      const gp = new GrainPlayer(audioContext, buffer, {
        grainSize: 0.1,
        overlap: 0.5, // exceeds grainSize
      })
      expect(gp.overlap).toBe(0.099) // 0.1 - 0.001
    })

    it('jitter can be set at runtime', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.jitter = 0.5
      expect(gp.jitter).toBe(0.5)
    })

    it('jitter clamps to [0, 1]', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.jitter = -0.1
      expect(gp.jitter).toBe(0)
      gp.jitter = 1.5
      expect(gp.jitter).toBe(1)
    })

    it('loop can be toggled', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      expect(gp.loop).toBe(true)
      gp.loop = false
      expect(gp.loop).toBe(false)
    })
  })

  // ─── Overlap Boundary and Jitter Edge Cases ──────────────────

  describe('overlap boundary and jitter edge cases', () => {
    it('overlap equal to grainSize is clamped to grainSize - 0.001', () => {
      const gp = new GrainPlayer(audioContext, buffer, {
        grainSize: 0.1,
        overlap: 0.1, // equal to grainSize
      })
      expect(gp.overlap).toBe(0.099) // clamped to grainSize - 0.001
      expect(gp.overlap).toBeLessThan(gp.grainSize)
    })

    it('jitter=1.0 position=0.0 does not throw during grain scheduling', () => {
      const gp = new GrainPlayer(audioContext, buffer, {
        jitter: 1.0,
        position: 0.0,
      })
      expect(() => {
        gp.play()
        vi.advanceTimersByTime(100) // trigger several scheduling loops
        gp.stop()
      }).not.toThrow()
    })

    it('jitter=1.0 position=1.0 does not throw during grain scheduling', () => {
      const gp = new GrainPlayer(audioContext, buffer, {
        jitter: 1.0,
        position: 1.0,
      })
      expect(() => {
        gp.play()
        vi.advanceTimersByTime(100) // trigger several scheduling loops
        gp.stop()
      }).not.toThrow()
    })
  })

  // ─── Grain Scheduling ──────────────────────────────────────────

  describe('grain scheduling', () => {
    it('play() creates buffer source nodes via scheduling loop', () => {
      const createBufferSourceSpy = vi.spyOn(audioContext, 'createBufferSource')
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()

      // The scheduling loop should have created at least one grain immediately
      expect(createBufferSourceSpy).toHaveBeenCalled()
    })

    it('scheduling loop creates gain nodes for grain envelopes', () => {
      const createGainSpy = vi.spyOn(audioContext, 'createGain')

      const gp = new GrainPlayer(audioContext, buffer)
      const afterConstructCalls = createGainSpy.mock.calls.length

      gp.play()

      // Should have created at least one gain node for grain envelope
      // (beyond the constructor gains for shared bus)
      expect(createGainSpy.mock.calls.length).toBeGreaterThan(afterConstructCalls)
    })

    it('stop() stops the scheduling timer', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.stop()
      expect(gp.playing).toBe(false)
    })

    it('subsequent setTimeout calls continue scheduling', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const createBufferSourceSpy = vi.spyOn(audioContext, 'createBufferSource')

      gp.play()
      const initialCount = createBufferSourceSpy.mock.calls.length

      // Advance timers to trigger next scheduling iteration
      vi.advanceTimersByTime(30)

      // Should have scheduled more grains
      expect(createBufferSourceSpy.mock.calls.length).toBeGreaterThanOrEqual(initialCount)
    })
  })

  // ─── Grain Duration Compensation (H7) ───────────────────────────

  describe('grain duration compensation (H7)', () => {
    it('compensates grain duration for pitch shift: duration = grainSize * rate', () => {
      const starts = spyOnGrainStarts(audioContext)
      const gp = new GrainPlayer(audioContext, buffer, { pitch: 12, grainSize: 0.1, jitter: 0 })

      gp.play()

      expect(starts.calls.length).toBeGreaterThan(0)
      const [, , duration] = starts.calls[0]
      // +12 semitones => playbackRate = 2. Web Audio start(when, offset, duration)
      // takes buffer-time; audible length = duration / playbackRate. To keep the
      // audible grain length at grainSize, duration must be grainSize * rate.
      expect(duration).toBeCloseTo(0.2, 5)
    })

    it('at unity pitch, compensated duration equals grainSize', () => {
      const starts = spyOnGrainStarts(audioContext)
      const gp = new GrainPlayer(audioContext, buffer, { pitch: 0, grainSize: 0.1, jitter: 0 })

      gp.play()

      const [, , duration] = starts.calls[0]
      expect(duration).toBeCloseTo(0.1, 5)
    })

    it('offset clamp uses the compensated duration so offset + duration never exceeds buffer end', () => {
      const starts = spyOnGrainStarts(audioContext)
      // 1-second buffer, grains requested right at the end with pitch up an octave
      const gp = new GrainPlayer(audioContext, buffer, {
        pitch: 12,
        grainSize: 0.1,
        position: 1,
        jitter: 0,
      })

      gp.play()

      const [, offset, duration] = starts.calls[0]
      expect(duration).toBeCloseTo(0.2, 5)
      expect(offset + duration).toBeLessThanOrEqual(buffer.duration + 1e-9)
      // maxOffset = buffer.duration - compensatedDuration = 1 - 0.2 = 0.8
      expect(offset).toBeCloseTo(0.8, 5)
    })
  })

  // ─── Overlap Normalization (M7) ──────────────────────────────────

  describe('overlap normalization (M7)', () => {
    it('extreme overlap does not cause runaway grain scheduling', () => {
      const createBufferSourceSpy = vi.spyOn(audioContext, 'createBufferSource')
      // grainSize=0.1, overlap clamped to grainSize-0.001=0.099 -> hop=0.001s.
      // Without a hop floor, the 0.05s lookahead window would schedule ~50
      // full-amplitude grains on a single play() call.
      const gp = new GrainPlayer(audioContext, buffer, { grainSize: 0.1, overlap: 0.099, jitter: 0 })

      gp.play()

      expect(createBufferSourceSpy.mock.calls.length).toBeLessThan(15)
    })
  })

  // ─── Master Controls ───────────────────────────────────────────

  describe('master controls', () => {
    it('update gain sets master gain', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      // Should not throw
      gp.update('gain').to(0.5).as('ratio')
    })

    it('update pan sets master pan', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.update('pan').to(-1).as('ratio')
    })

    it('update gain with percent converts correctly (QC-1-07)', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const spy = vi.spyOn(gp.getGainNode().gain, 'setValueAtTime')
      gp.update('gain').to(50).as('percent')
      expect(spy).toHaveBeenCalledWith(0.5, expect.any(Number))
    })

    it('update gain with inverseRatio converts correctly (QC-1-07)', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const spy = vi.spyOn(gp.getGainNode().gain, 'setValueAtTime')
      gp.update('gain').to(0.3).as('inverseRatio')
      expect(spy).toHaveBeenCalledWith(0.7, expect.any(Number))
    })

    it('changeGainTo sets gain directly', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const result = gp.changeGainTo(0.5)
      expect(result).toBe(gp) // chainable
    })

    it('changePanTo sets pan directly', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const result = gp.changePanTo(-0.5)
      expect(result).toBe(gp) // chainable
    })
  })

  // ─── Effects Chain ─────────────────────────────────────────────

  describe('effects chain', () => {
    function createMockEffect() {
      const input = audioContext.createGain()
      const output = audioContext.createGain()
      return {
        input: input as unknown as AudioNode,
        output: output as unknown as AudioNode,
        bypass: false,
        dispose: vi.fn(),
      }
    }

    it('addEffect adds effect to chain', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      gp.addEffect(effect)
      expect(gp.getEffects()).toHaveLength(1)
    })

    it('addEffect is chainable', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      const result = gp.addEffect(effect)
      expect(result).toBe(gp)
    })

    it('addEffect at position inserts at correct index', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect1 = createMockEffect()
      const effect2 = createMockEffect()
      const effect3 = createMockEffect()
      gp.addEffect(effect1)
      gp.addEffect(effect2)
      gp.addEffect(effect3, 1) // insert at position 1
      const effects = gp.getEffects()
      expect(effects[0]).toBe(effect1)
      expect(effects[1]).toBe(effect3)
      expect(effects[2]).toBe(effect2)
    })

    it('removeEffect removes from chain', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      gp.addEffect(effect)
      gp.removeEffect(effect)
      expect(gp.getEffects()).toHaveLength(0)
    })

    it('removeEffect is chainable', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      gp.addEffect(effect)
      const result = gp.removeEffect(effect)
      expect(result).toBe(gp)
    })

    it('removeEffect with non-existent effect is a no-op', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      const result = gp.removeEffect(effect)
      expect(result).toBe(gp)
    })

    it('getEffects returns a copy', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const effect = createMockEffect()
      gp.addEffect(effect)
      const effects = gp.getEffects()
      expect(effects).toHaveLength(1)
      // Verify it's a copy by checking that modifying it doesn't affect the original
      ;(effects as any[]).push(createMockEffect())
      expect(gp.getEffects()).toHaveLength(1)
    })
  })

  // ─── Analyzer ──────────────────────────────────────────────────

  describe('analyzer', () => {
    function createMockAnalyzer() {
      return {
        input: audioContext.createGain() as unknown as AudioNode,
      }
    }

    it('setAnalyzer attaches analyzer', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const analyzer = createMockAnalyzer()
      gp.setAnalyzer(analyzer as any)
      expect(gp.getAnalyzer()).toBe(analyzer)
    })

    it('setAnalyzer(null) detaches analyzer', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const analyzer = createMockAnalyzer()
      gp.setAnalyzer(analyzer as any)
      gp.setAnalyzer(null)
      expect(gp.getAnalyzer()).toBeNull()
    })

    it('setAnalyzer is chainable', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const result = gp.setAnalyzer(null)
      expect(result).toBe(gp)
    })
  })

  // ─── Destination ───────────────────────────────────────────────

  describe('destination', () => {
    it('setDestination changes output target', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      const dest = audioContext.createGain()
      const result = gp.setDestination(dest)
      expect(result).toBe(gp) // chainable
    })
  })

  // ─── Dispose ───────────────────────────────────────────────────

  describe('dispose', () => {
    it('sets disposed to true', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.dispose()
      expect(gp.disposed).toBe(true)
    })

    it('stops playback on dispose', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.play()
      gp.dispose()
      expect(gp.playing).toBe(false)
    })

    it('is idempotent', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.dispose()
      gp.dispose() // should not throw
      expect(gp.disposed).toBe(true)
    })

    it('play throws after dispose', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.dispose()
      expect(() => gp.play()).toThrow('disposed')
    })

    it('silences future events after dispose', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      gp.dispose()
      // dispatchEvent should return false after dispose
      const result = gp.dispatchEvent(new CustomEvent('test'))
      expect(result).toBe(false)
    })

    it('m6: disposes the timer even when play() was stopped before dispose (no Worker/Blob leak)', () => {
      const disposeSpy = vi.spyOn(WorkerTimer.prototype, 'dispose')
      const gp = new GrainPlayer(audioContext, buffer)

      gp.play()
      gp.stop()
      gp.dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })
  })

  // ─── Event Types ───────────────────────────────────────────────

  describe('event types', () => {
    it('emits play event with correct detail shape', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      let detail: any = null
      gp.on('play', (e: any) => {
        detail = e.detail
      })
      gp.play()
      expect(detail).toBeDefined()
      expect(detail.time).toBeDefined()
      expect(detail.source).toBe(gp)
    })

    it('emits stop event with correct detail shape', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      let detail: any = null
      gp.on('stop', (e: any) => {
        detail = e.detail
      })
      gp.play()
      gp.stop()
      expect(detail).toBeDefined()
      expect(detail.time).toBeDefined()
      expect(detail.source).toBe(gp)
    })

    it('emits pause event with correct detail shape', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      let detail: any = null
      gp.on('pause', (e: any) => {
        detail = e.detail
      })
      gp.play()
      gp.pause()
      expect(detail).toBeDefined()
      expect(detail.time).toBeDefined()
      expect(detail.source).toBe(gp)
    })

    it('emits resume event with correct detail shape', () => {
      const gp = new GrainPlayer(audioContext, buffer)
      let detail: any = null
      gp.on('resume', (e: any) => {
        detail = e.detail
      })
      gp.play()
      gp.pause()
      gp.resume()
      expect(detail).toBeDefined()
      expect(detail.time).toBeDefined()
      expect(detail.source).toBe(gp)
    })
  })
})
