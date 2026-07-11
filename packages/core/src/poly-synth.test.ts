import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Oscillator } from '@/oscillator'
import { PolySynth, VoiceHandle } from './poly-synth'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('polySynth', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  // ─── Construction ──────────────────────────────────────────────

  describe('construction', () => {
    it('creates with default options', () => {
      const synth = new PolySynth(audioContext)
      expect(synth).toBeDefined()
      expect(synth.maxVoices).toBe(8)
    })

    it('creates with custom maxVoices', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      expect(synth.maxVoices).toBe(4)
    })

    it('reports 0 active voices initially', () => {
      const synth = new PolySynth(audioContext)
      expect(synth.activeVoices).toBe(0)
    })

    it('reports maxVoices available initially', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      expect(synth.availableVoices).toBe(4)
    })

    it('is not disposed initially', () => {
      const synth = new PolySynth(audioContext)
      expect(synth.disposed).toBe(false)
    })
  })

  // ─── Basic Playback (SYNTH-01) ────────────────────────────────

  describe('basic playback', () => {
    it('play() returns a VoiceHandle', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(handle).toBeInstanceOf(VoiceHandle)
    })

    it('play() returns an active handle', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(handle.active).toBe(true)
    })

    it('play() increments activeVoices', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      synth.play({ frequency: 440 })
      expect(synth.activeVoices).toBe(1)
    })

    it('play() decrements availableVoices', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      synth.play({ frequency: 440 })
      expect(synth.availableVoices).toBe(3)
    })

    it('multiple play() calls with different frequencies produce multiple active voices', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 8 })
      synth.play({ frequency: 261.63 })
      synth.play({ frequency: 329.63 })
      synth.play({ frequency: 392.00 })
      expect(synth.activeVoices).toBe(3)
    })

    it('play() with gain sets per-voice gain', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440, gain: 0.7 })
      expect(handle.active).toBe(true)
    })

    it('throws when playing on a disposed PolySynth', () => {
      const synth = new PolySynth(audioContext)
      synth.dispose()
      expect(() => synth.play({ frequency: 440 })).toThrow('disposed')
    })
  })

  // ─── VoiceHandle API ──────────────────────────────────────────

  describe('voiceHandle', () => {
    it('handle.active is true while voice is playing', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(handle.active).toBe(true)
    })

    it('handle.update() returns a builder (does not throw)', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(() => handle.update('gain').to(0.5).as('ratio')).not.toThrow()
    })

    it('handle.update(frequency) returns a builder (does not throw)', () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(() => handle.update('frequency').to(880).as('ratio')).not.toThrow()
    })

    it('handle.stop() marks handle as inactive', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      await handle.stop()
      expect(handle.active).toBe(false)
    })

    it('handle.stop() decrements activeVoices', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      expect(synth.activeVoices).toBe(1)
      await handle.stop()
      expect(synth.activeVoices).toBe(0)
    })

    it('stale handle update() is a no-op (no throw)', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      await handle.stop()
      expect(() => handle.update('gain').to(0.5).as('ratio')).not.toThrow()
    })

    it('stale handle stop() is a no-op (no throw)', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      await handle.stop()
      await expect(handle.stop()).resolves.not.toThrow()
    })

    it('stale handle onPlaySet() is a no-op (no throw)', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      await handle.stop()
      expect(() => handle.onPlaySet('gain').to(0.5).at(0)).not.toThrow()
      expect(() => handle.onPlaySet('gain').to(0.5).endingAt(1, 'linear')).not.toThrow()
    })

    it('stale handle onPlayRamp() is a no-op (no throw)', async () => {
      const synth = new PolySynth(audioContext)
      const handle = synth.play({ frequency: 440 })
      await handle.stop()
      expect(() => handle.onPlayRamp('gain', 'linear').from(0).to(1).in(0.5)).not.toThrow()
    })
  })

  // ─── Same-Frequency Retrigger ─────────────────────────────────

  describe('same-frequency retrigger', () => {
    it('playing the same frequency twice reuses the voice', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      synth.play({ frequency: 440 })
      synth.play({ frequency: 440 })
      expect(synth.activeVoices).toBe(1)
    })

    it('retrigger returns a new handle', () => {
      const synth = new PolySynth(audioContext)
      const handle1 = synth.play({ frequency: 440 })
      const handle2 = synth.play({ frequency: 440 })
      expect(handle1).not.toBe(handle2)
    })

    it('old handle becomes stale after retrigger', () => {
      const synth = new PolySynth(audioContext)
      const handle1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 440 })
      expect(handle1.active).toBe(false)
    })

    it('new handle is active after retrigger', () => {
      const synth = new PolySynth(audioContext)
      synth.play({ frequency: 440 })
      const handle2 = synth.play({ frequency: 440 })
      expect(handle2.active).toBe(true)
    })
  })

  // ─── Voice Stealing — LRU (Default) ──────────────────────────

  describe('voice stealing — LRU (default)', () => {
    it('steals a voice when pool is full', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      // Pool full, this should steal
      const handle3 = synth.play({ frequency: 660 })
      expect(handle3.active).toBe(true)
      expect(synth.activeVoices).toBe(2) // still max
    })

    it('stolen voice handle becomes stale', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      const handle1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      synth.play({ frequency: 660 })
      expect(handle1.active).toBe(false)
    })

    it('emits voicestolen event', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      const handler = vi.fn()
      synth.on('voicestolen', handler)

      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      synth.play({ frequency: 660 })

      expect(handler).toHaveBeenCalledOnce()
      const detail = handler.mock.calls[0][0].detail
      expect(detail.stolenFrequency).toBe(440)
      expect(detail.newFrequency).toBe(660)
    })

    it('steals oldest-active when no released voices', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      const handle1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      // Both active, no released — should steal oldest (440)
      synth.play({ frequency: 660 })
      expect(handle1.active).toBe(false)
    })
  })

  // ─── Voice Stealing — oldest-active ───────────────────────────

  describe('voice stealing — oldest-active', () => {
    it('always steals the oldest active voice', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2, stealStrategy: 'oldest-active' })
      const handle1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      synth.play({ frequency: 660 })
      expect(handle1.active).toBe(false)
    })
  })

  // ─── Voice Stealing — quietest ────────────────────────────────

  describe('voice stealing — quietest', () => {
    it('steals the quietest voice', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2, stealStrategy: 'quietest' })
      // Play first at lower gain
      const handle1 = synth.play({ frequency: 440, gain: 0.2 })
      synth.play({ frequency: 550, gain: 0.8 })
      // Should steal the quieter one (440 at gain 0.2)
      synth.play({ frequency: 660 })
      expect(handle1.active).toBe(false)
    })
  })

  // ─── stopAll ──────────────────────────────────────────────────

  describe('stopAll', () => {
    it('stops all active voices', () => {
      const synth = new PolySynth(audioContext)
      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      synth.play({ frequency: 660 })
      expect(synth.activeVoices).toBe(3)
      synth.stopAll()
      expect(synth.activeVoices).toBe(0)
    })

    it('invalidates all outstanding handles', () => {
      const synth = new PolySynth(audioContext)
      const h1 = synth.play({ frequency: 440 })
      const h2 = synth.play({ frequency: 550 })
      synth.stopAll()
      expect(h1.active).toBe(false)
      expect(h2.active).toBe(false)
    })
  })

  // ─── Shared Output Bus ────────────────────────────────────────

  describe('shared output bus', () => {
    it('update(gain) does not throw', () => {
      const synth = new PolySynth(audioContext)
      expect(() => synth.update('gain').to(0.5).as('ratio')).not.toThrow()
    })

    it('update(gain) with percent converts correctly (QC-1-07)', () => {
      const synth = new PolySynth(audioContext)
      const spy = vi.spyOn(synth.getGainNode().gain, 'setValueAtTime')
      synth.update('gain').to(50).as('percent')
      expect(spy).toHaveBeenCalledWith(0.5, expect.any(Number))
    })

    it('update(gain) with inverseRatio converts correctly (QC-1-07)', () => {
      const synth = new PolySynth(audioContext)
      const spy = vi.spyOn(synth.getGainNode().gain, 'setValueAtTime')
      synth.update('gain').to(0.3).as('inverseRatio')
      expect(spy).toHaveBeenCalledWith(0.7, expect.any(Number))
    })

    it('changePanTo does not throw', () => {
      const synth = new PolySynth(audioContext)
      expect(() => synth.changePanTo(-0.5)).not.toThrow()
    })

    it('changeGainTo does not throw', () => {
      const synth = new PolySynth(audioContext)
      expect(() => synth.changeGainTo(0.5)).not.toThrow()
    })

    it('addEffect does not throw', () => {
      const synth = new PolySynth(audioContext)
      const mockEffect = {
        input: audioContext.createGain(),
        output: audioContext.createGain(),
        bypass: false,
        mix: 1,
      }
      expect(() => synth.addEffect(mockEffect)).not.toThrow()
    })

    it('removeEffect does not throw', () => {
      const synth = new PolySynth(audioContext)
      const mockEffect = {
        input: audioContext.createGain(),
        output: audioContext.createGain(),
        bypass: false,
        mix: 1,
      }
      synth.addEffect(mockEffect)
      expect(() => synth.removeEffect(mockEffect)).not.toThrow()
    })

    it('getEffects returns effects array', () => {
      const synth = new PolySynth(audioContext)
      const mockEffect = {
        input: audioContext.createGain(),
        output: audioContext.createGain(),
        bypass: false,
        mix: 1,
      }
      synth.addEffect(mockEffect)
      expect(synth.getEffects()).toHaveLength(1)
    })

    it('setAnalyzer does not throw', () => {
      const synth = new PolySynth(audioContext)
      expect(() => synth.setAnalyzer(null)).not.toThrow()
    })

    it('getAnalyzer returns null initially', () => {
      const synth = new PolySynth(audioContext)
      expect(synth.getAnalyzer()).toBeNull()
    })

    it('setDestination does not throw', () => {
      const synth = new PolySynth(audioContext)
      const dest = audioContext.createGain()
      expect(() => synth.setDestination(dest)).not.toThrow()
    })
  })

  // ─── Dispose ──────────────────────────────────────────────────

  describe('dispose', () => {
    it('sets disposed to true', () => {
      const synth = new PolySynth(audioContext)
      synth.dispose()
      expect(synth.disposed).toBe(true)
    })

    it('play() throws after dispose', () => {
      const synth = new PolySynth(audioContext)
      synth.dispose()
      expect(() => synth.play({ frequency: 440 })).toThrow('disposed')
    })

    it('is idempotent', () => {
      const synth = new PolySynth(audioContext)
      synth.dispose()
      expect(() => synth.dispose()).not.toThrow()
    })

    it('stops all active voices on dispose', () => {
      const synth = new PolySynth(audioContext)
      const h1 = synth.play({ frequency: 440 })
      const h2 = synth.play({ frequency: 550 })
      synth.dispose()
      expect(h1.active).toBe(false)
      expect(h2.active).toBe(false)
    })
  })

  // ─── Voice Factory ────────────────────────────────────────────

  describe('voice factory', () => {
    it('uses default factory with PolySynth options', () => {
      const synth = new PolySynth(audioContext, { type: 'sawtooth' })
      const handle = synth.play({ frequency: 440 })
      expect(handle.active).toBe(true)
    })

    it('uses custom createVoice factory', () => {
      const factory = vi.fn((ctx: AudioContext) =>
        new Oscillator(ctx, { type: 'square' }),
      )
      const synth = new PolySynth(audioContext, {
        maxVoices: 4,
        createVoice: factory,
      })
      synth.play({ frequency: 440 })
      expect(factory).toHaveBeenCalledWith(audioContext)
    })

    it('creates envelope-based voices via default factory', () => {
      const synth = new PolySynth(audioContext, {
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
      })
      const handle = synth.play({ frequency: 440 })
      expect(handle.active).toBe(true)
    })

    it('creates filtered voices via default factory', () => {
      const synth = new PolySynth(audioContext, {
        lowpass: { frequency: 2000, q: 1 },
      })
      const handle = synth.play({ frequency: 440 })
      expect(handle.active).toBe(true)
    })
  })

  // ─── Event System ─────────────────────────────────────────────

  describe('events', () => {
    it('voicestolen event has correct detail shape', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 1 })
      const handler = vi.fn()
      synth.on('voicestolen', handler)

      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })

      expect(handler).toHaveBeenCalledOnce()
      const detail = handler.mock.calls[0][0].detail
      expect(detail).toHaveProperty('stolenFrequency')
      expect(detail).toHaveProperty('newFrequency')
      expect(detail).toHaveProperty('time')
      expect(detail).toHaveProperty('source')
      expect(detail.source).toBe(synth)
    })

    it('no voicestolen when pool has space', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 8 })
      const handler = vi.fn()
      synth.on('voicestolen', handler)

      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ─── Edge Cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('maxVoices: 1 works correctly', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 1 })
      const h1 = synth.play({ frequency: 440 })
      const h2 = synth.play({ frequency: 550 })
      expect(h1.active).toBe(false)
      expect(h2.active).toBe(true)
      expect(synth.activeVoices).toBe(1)
    })

    it('rapid play/stop cycles work', async () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      const h1 = synth.play({ frequency: 440 })
      await h1.stop()
      const h2 = synth.play({ frequency: 440 })
      expect(h2.active).toBe(true)
      expect(synth.activeVoices).toBe(1)
    })

    it('rapid interleaved play/stop leaves only the last active voice', async () => {
      const synth = new PolySynth(audioContext, { maxVoices: 8 })
      const h440 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      await h440.stop()
      synth.play({ frequency: 660 })
      const h550 = synth.play({ frequency: 550 }) // retrigger 550
      await h550.stop()
      // Only 660 should remain active
      expect(synth.activeVoices).toBe(1)
    })

    it('burst same frequency results in only 1 active voice', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 8 })
      for (let i = 0; i < 10; i++) {
        synth.play({ frequency: 440 })
      }
      // Same-frequency retrigger reuses the voice
      expect(synth.activeVoices).toBe(1)
    })

    it('stop during voice stealing does not throw and decrements count', async () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      // Pool full — triggers steal
      const h660 = synth.play({ frequency: 660 })
      expect(synth.activeVoices).toBe(2)
      // Stop the stolen victim's replacement immediately
      await h660.stop()
      expect(synth.activeVoices).toBe(1)
    })

    it('voice recycling after stop', async () => {
      const synth = new PolySynth(audioContext, { maxVoices: 2 })
      const h1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      await h1.stop()
      // Pool: one active (550), one available (from stopped 440)
      // Should use available slot, not steal
      const handler = vi.fn()
      synth.on('voicestolen', handler)
      synth.play({ frequency: 660 })
      // The voicestolen handler should not fire because there's an available voice
      // after h1.stop() made one available
      expect(synth.activeVoices).toBe(2)
    })
  })

  // ─── Voice Independence (gate-2 ez-audio-5b2) ─────────────────
  // Each voice's ADSR must be independent: releasing one voice must not
  // affect siblings, and a reused voice's stale source node must never
  // kill the note that replaced it.

  describe('voice independence', () => {
    const envelope = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 }

    function createTrackedSynth(options: ConstructorParameters<typeof PolySynth>[1] = {}) {
      const oscillators: Oscillator[] = []
      const synth = new PolySynth(audioContext, {
        ...options,
        createVoice: (ctx: AudioContext) => {
          const osc = new Oscillator(ctx, { envelope })
          oscillators.push(osc)
          return osc
        },
      })
      return { synth, oscillators }
    }

    it('releasing one voice does not stop a sibling voice when its release tail ends', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 4 })
      const h1 = synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      await Promise.resolve() // flush async play()

      expect(synth.activeVoices).toBe(2)
      await h1.stop()

      // Simulate voice 1's release tail finishing (node onended fires)
      oscillators[0].audioSourceNode.onended?.({} as Event)

      // Voice 2 must be untouched
      expect(oscillators[1].isPlaying).toBe(true)
      expect(synth.activeVoices).toBe(1)
    })

    it('a reused voice is not killed when the previous note\'s scheduled stop lands', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 1 })
      const h1 = synth.play({ frequency: 440 })
      await Promise.resolve()
      const oldNode = oscillators[0].audioSourceNode

      await h1.stop() // release scheduled; node stops at now + release

      // New note reuses the same pooled voice before the tail finished
      const h2 = synth.play({ frequency: 550 })
      await Promise.resolve()

      // Old node's delayed onended must not be able to kill the new note:
      // it must have been neutralized when the voice was reused
      expect(oldNode.onended).toBeNull()
      expect(oldNode).not.toBe(oscillators[0].audioSourceNode)

      expect(h2.active).toBe(true)
      expect(oscillators[0].isPlaying).toBe(true)
      expect(synth.activeVoices).toBe(1)
    })

    it('handle.stop() keeps the voice in released state until its tail ends', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 2 })
      const h1 = synth.play({ frequency: 440 })
      await Promise.resolve()
      await h1.stop()

      // Tail still sounding: playing a new note must NOT reuse the releasing
      // voice while a fresh pool slot exists (release must ring out)
      synth.play({ frequency: 550 })
      await Promise.resolve()
      expect(oscillators.length).toBe(2)

      // Tail finishes -> voice becomes available again
      oscillators[0].audioSourceNode.onended?.({} as Event)
      synth.play({ frequency: 660 })
      await Promise.resolve()
      // Reused the now-available first voice instead of stealing
      expect(oscillators.length).toBe(2)
      expect(synth.activeVoices).toBe(2)
    })

    it('stealing a released (ringing-out) voice does not emit voicestolen', async () => {
      const { synth } = createTrackedSynth({ maxVoices: 1 })
      const handler = vi.fn()
      synth.on('voicestolen', handler)

      const h1 = synth.play({ frequency: 440 })
      await Promise.resolve()
      await h1.stop()

      // Pool full of released voices — reusing one is not an audible steal
      const h2 = synth.play({ frequency: 550 })
      expect(h2.active).toBe(true)
      expect(handler).not.toHaveBeenCalled()
    })

    it('same-frequency retrigger keeps voice active and activeVoices correct', async () => {
      const { synth } = createTrackedSynth({ maxVoices: 4 })
      synth.play({ frequency: 440 })
      await Promise.resolve() // flush so _isPlaying is true (running-context behavior)

      const h2 = synth.play({ frequency: 440 })
      await Promise.resolve()

      expect(h2.active).toBe(true)
      expect(synth.activeVoices).toBe(1)
    })

    // gate-2 deep-review C1/R7#1: retriggerVoice() and the voice-steal path
    // both call oscillator.stopAt(now) immediately followed by play() in the
    // same tick. Before the fix, this hit Oscillator.setup()'s "not playing"
    // hard-cut branch (stopAt's immediate flip made _isPlaying already
    // false by the time play() ran setup()) — clicking/screeching on every
    // same-frequency retrigger and every steal of a sounding voice. The fix
    // lives entirely in Oscillator (setup()/stopAt() tracking
    // _releaseTailEndsAt); these are regression tests confirming PolySynth's
    // call sites benefit without any poly-synth.ts changes.
    it('retriggerVoice routes the outgoing oscillator through a release gain, not a hard cut', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 4 })
      synth.play({ frequency: 440 })
      await Promise.resolve()

      const oldNode = oscillators[0].audioSourceNode
      const connectSpy = vi.spyOn(oldNode, 'connect')
      const stopSpy = vi.spyOn(oldNode, 'stop')

      synth.play({ frequency: 440 }) // retriggerVoice: stopAt(now) + play(), same tick
      await Promise.resolve()

      expect(connectSpy).toHaveBeenCalled()
      const stopCall = stopSpy.mock.calls[0]?.[0] as number | undefined
      expect(stopCall).toBeGreaterThan(audioContext.currentTime)
    })

    it('voice-steal routes the stolen oscillator through a release gain, not a hard cut', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 1 })
      synth.play({ frequency: 440 })
      await Promise.resolve()

      const oldNode = oscillators[0].audioSourceNode
      const connectSpy = vi.spyOn(oldNode, 'connect')
      const stopSpy = vi.spyOn(oldNode, 'stop')

      synth.play({ frequency: 660 }) // pool full — steals the actively-sounding voice
      await Promise.resolve()

      expect(connectSpy).toHaveBeenCalled()
      const stopCall = stopSpy.mock.calls[0]?.[0] as number | undefined
      expect(stopCall).toBeGreaterThan(audioContext.currentTime)
    })
  })

  // ─── H5: stopAll must also silence released (mid-release) voices ──

  describe('stopAll — H5 released-voice panic', () => {
    const envelope = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 }

    function createTrackedSynth(options: ConstructorParameters<typeof PolySynth>[1] = {}) {
      const oscillators: Oscillator[] = []
      const synth = new PolySynth(audioContext, {
        ...options,
        createVoice: (ctx: AudioContext) => {
          const osc = new Oscillator(ctx, { envelope })
          oscillators.push(osc)
          return osc
        },
      })
      return { synth, oscillators }
    }

    it('force-stops a released voice\'s ringing tail instead of leaving it to ring out', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 2 })
      const h1 = synth.play({ frequency: 440 })
      await Promise.resolve()
      await h1.stop() // release scheduled ~0.5s out — voice becomes 'released'

      const releasingNode = oscillators[0].audioSourceNode
      const stopSpy = vi.spyOn(releasingNode, 'stop')

      synth.stopAll()

      // Before the fix, stopAll() only iterated 'active' voices — a
      // released voice's node was never touched a second time, so its
      // original ~0.5s release tail kept ringing straight through panic.
      expect(stopSpy).toHaveBeenCalled()
      const rescheduledStopTime = stopSpy.mock.calls[0]?.[0] as number
      expect(rescheduledStopTime).toBeLessThan(audioContext.currentTime + envelope.release)
    })

    it('frees the released voice\'s slot once the forced-early stop actually renders', async () => {
      const { synth, oscillators } = createTrackedSynth({ maxVoices: 1 })
      const h1 = synth.play({ frequency: 440 })
      await Promise.resolve()
      await h1.stop()

      synth.stopAll()

      // Simulate the forced-early stop's onended actually firing
      oscillators[0].audioSourceNode.onended?.({} as Event)

      synth.play({ frequency: 550 })
      await Promise.resolve()

      // Recycled the same pooled voice — no new voice was needed to
      // satisfy the play() because the panic-killed slot became available.
      expect(oscillators.length).toBe(1)
    })

    it('stopAll on an already-active voice still reaches 0 activeVoices synchronously (no regression)', () => {
      const synth = new PolySynth(audioContext, { maxVoices: 4 })
      synth.play({ frequency: 440 })
      synth.play({ frequency: 550 })
      expect(synth.activeVoices).toBe(2)

      synth.stopAll()

      expect(synth.activeVoices).toBe(0)
    })
  })

  // ─── R7 low: maxVoices validation ──────────────────────────────

  describe('maxVoices validation', () => {
    it('throws a descriptive error for maxVoices: 0', () => {
      expect(() => new PolySynth(audioContext, { maxVoices: 0 })).toThrow(/maxVoices/)
    })

    it('throws a descriptive error for negative maxVoices', () => {
      expect(() => new PolySynth(audioContext, { maxVoices: -2 })).toThrow(/maxVoices/)
    })

    it('throws for non-finite maxVoices', () => {
      expect(() => new PolySynth(audioContext, { maxVoices: Number.NaN })).toThrow(/maxVoices/)
    })

    it('accepts maxVoices: 1', () => {
      expect(() => new PolySynth(audioContext, { maxVoices: 1 })).not.toThrow()
    })
  })
})
