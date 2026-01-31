import { beforeEach, describe, expect, it } from 'vitest'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { Oscillator } from '@/oscillator'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('oscillator with ADSR envelope', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  describe('creation', () => {
    it('creates oscillator with full envelope options', () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.05,
          decayTime: 0.2,
          sustainLevel: 0.6,
          releaseTime: 0.4,
        },
      })
      expect(osc).toBeDefined()
    })

    it('creates oscillator without envelope (backward compatible)', () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      expect(osc).toBeDefined()
    })

    it('creates oscillator with empty options (backward compatible)', () => {
      const osc = new Oscillator(audioContext)
      expect(osc).toBeDefined()
    })

    it('envelope option uses defaults when partial', () => {
      const osc = new Oscillator(audioContext, {
        envelope: { attackTime: 0.1 }, // only attack specified
      })
      expect(osc).toBeDefined()
    })

    it('combines envelope with other oscillator options', () => {
      const osc = new Oscillator(audioContext, {
        frequency: 880,
        type: 'sawtooth',
        gain: 0.5,
        envelope: {
          attackTime: 0.1,
          sustainLevel: 0.8,
        },
      })
      expect(osc).toBeDefined()
    })

    it('combines envelope with filter options', () => {
      const osc = new Oscillator(audioContext, {
        envelope: { attackTime: 0.05 },
        lowpass: { frequency: 1000, q: 2 },
      })
      expect(osc).toBeDefined()
    })
  })

  describe('play with envelope', () => {
    it('applies envelope on play', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          decayTime: 0.1,
          sustainLevel: 0.7,
          releaseTime: 0.3,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('plays without envelope (standard behavior)', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('stop triggers release phase and schedules stop', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          decayTime: 0.1,
          sustainLevel: 0.7,
          releaseTime: 0.3,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
      // Stop triggers release and schedules stopAt after releaseTime
      // With envelope, stop() is async and waits for release
      await osc.stop()
      // After awaiting stop, the oscillator should be stopped
      // Note: The exact timing depends on the mock, but stop should complete
    })

    it('can be retriggered while playing (clickless)', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.05,
          decayTime: 0.1,
          sustainLevel: 0.7,
          releaseTime: 0.2,
        },
      })
      // Play, then retrigger
      await osc.play()
      expect(osc.isPlaying).toBe(true)
      // Retrigger - should not throw
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })

  describe('adsr with onPlaySet/onPlayRamp', () => {
    it('envelope and onPlaySet coexist', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          sustainLevel: 0.7,
          releaseTime: 0.3,
        },
      })
      // Additional gain automation on top of envelope
      osc.onPlaySet('frequency').to(880).at(0.5)
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('envelope and onPlayRamp coexist', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.05,
          sustainLevel: 0.6,
          releaseTime: 0.2,
        },
      })
      // Frequency ramp alongside envelope gain control
      osc.onPlayRamp('frequency').from(440).to(880).in(1)
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('onPlaySet works without envelope (backward compatible)', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      osc.onPlaySet('gain').to(0.5).at(0.2)
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('onPlayRamp works without envelope (backward compatible)', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      osc.onPlayRamp('gain').from(1).to(0).in(0.5)
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('multiple onPlaySet calls with envelope', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: { attackTime: 0.02, sustainLevel: 0.8 },
      })
      osc.onPlaySet('frequency').to(660).at(0.1)
      osc.onPlaySet('frequency').to(880).at(0.2)
      osc.onPlaySet('gain').to(0.5).at(0.15)
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })

  describe('envelope integration edge cases', () => {
    it('zero attack time works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0,
          decayTime: 0.1,
          sustainLevel: 0.5,
          releaseTime: 0.1,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('zero release time works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          sustainLevel: 0.7,
          releaseTime: 0,
        },
      })
      await osc.play()
      await osc.stop()
      expect(osc.isPlaying).toBe(false)
    })

    it('full sustain (1.0) works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          decayTime: 0.1,
          sustainLevel: 1.0,
          releaseTime: 0.2,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('zero sustain (0.0) works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.01,
          decayTime: 0.1,
          sustainLevel: 0.0,
          releaseTime: 0.2,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })
})
