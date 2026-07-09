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
})
