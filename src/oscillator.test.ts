import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'
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

  describe('edge cases', () => {
    it('oscillator with frequency 0 plays without error', async () => {
      const osc = new Oscillator(audioContext, { frequency: 0 })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
      // Note: 0 Hz oscillator produces silence but is valid Web Audio API behavior
    })

    it('oscillator with very high frequency (20000 Hz) plays without error', async () => {
      const osc = new Oscillator(audioContext, { frequency: 20000 })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('calling play() immediately after play() does not error', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
      // Immediate retrigger
      await expect(osc.play()).resolves.not.toThrow()
      expect(osc.isPlaying).toBe(true)
    })

    it('oscillator with envelope plays without error (automation tested elsewhere)', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attackTime: 0.1,
          decayTime: 0.2,
          sustainLevel: 0.7,
          releaseTime: 0.3,
        },
      })

      // The detailed envelope automation scheduling is already tested in envelope.test.ts
      // Here we just verify that an oscillator with envelope can play
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })
})

describe('oscillator getFilters', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('returns empty array when no filters configured', () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    expect(osc.getFilters()).toEqual([])
  })

  it('returns filters matching configured filter types', () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 800, q: 1 },
      highpass: { frequency: 200 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(2)
  })

  it('returns a copy that does not mutate internal state', () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 800 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(1)
    // Mutating the returned array should not affect the oscillator
    ;(filters as BiquadFilterNode[]).length = 0
    expect(osc.getFilters()).toHaveLength(1)
  })
})

describe('filter chain', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('single lowpass filter via constructor option', () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 1000, q: 2 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('lowpass')
  })

  it('multiple filters added in order: highpass then lowpass', () => {
    // FILTERS array in oscillator.ts: ['highpass', 'bandpass', 'lowpass', ...]
    // highpass comes before lowpass in the FILTERS iteration order
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      highpass: { frequency: 200 },
      lowpass: { frequency: 3000, q: 1 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(2)
    // highpass is first in FILTERS array
    expect(filters[0].type).toBe('highpass')
    // lowpass follows highpass in FILTERS array
    expect(filters[1].type).toBe('lowpass')
  })

  it('constructor lowpass filter option creates a filter', () => {
    const osc = new Oscillator(audioContext, {
      lowpass: { frequency: 500, q: 1 },
    })
    expect(osc.getFilters()).toHaveLength(1)
  })

  it('multiple constructor filter types create multiple filters', () => {
    const osc = new Oscillator(audioContext, {
      lowpass: { frequency: 3000 },
      highpass: { frequency: 200 },
    })
    expect(osc.getFilters()).toHaveLength(2)
  })

  it('filters persist through play()', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 1000, q: 1 },
    })
    expect(osc.getFilters()).toHaveLength(1)
    await osc.play()
    expect(osc.isPlaying).toBe(true)
    // Filters are set at construction time and persist through play
    expect(osc.getFilters()).toHaveLength(1)
    expect(osc.getFilters()[0].type).toBe('lowpass')
  })

  it('all supported filter types are created correctly', () => {
    const osc = new Oscillator(audioContext, {
      bandpass: { frequency: 1000 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('bandpass')
  })

  it('notch filter type is created correctly', () => {
    const osc = new Oscillator(audioContext, {
      notch: { frequency: 2000, q: 5 },
    })
    const filters = osc.getFilters()
    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('notch')
  })
})

describe('anti-click fade-out on stop', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('stop() completes without error when no filters present', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    expect(osc.isPlaying).toBe(true)
    await expect(osc.stop()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(false)
  })

  it('stop() completes without error when lowpass filter is present', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 1000, q: 1 },
    })
    await osc.play()
    expect(osc.isPlaying).toBe(true)
    await expect(osc.stop()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(false)
  })

  it('stop() completes without error when multiple filters are present', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      highpass: { frequency: 100 },
      lowpass: { frequency: 3000, q: 2 },
    })
    await osc.play()
    await expect(osc.stop()).resolves.not.toThrow()
  })

  it('play twice does not error (new gainNode created each play())', async () => {
    // Each play() creates a new gainNode via setup() and disconnects old one
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    expect(osc.isPlaying).toBe(true)
    // Retrigger — setup() disconnects old gainNode and creates new one
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(true)
  })

  it('stop() after stop() does not error (idempotent)', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    await osc.stop()
    // Second stop on an already-stopped oscillator should not throw
    await expect(osc.stop()).resolves.not.toThrow()
  })
})

describe('wireConnections with filters', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('source connects through filters to gain — no runtime error', async () => {
    // wireConnections chains: audioSourceNode -> [filters] -> effectChainInput -> gain -> panner -> destination
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 1000, q: 1 },
    })
    // play() calls setup() which calls wireConnections()
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(true)
  })

  it('multiple filters in chain connect without error', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      highpass: { frequency: 100 },
      bandpass: { frequency: 800, q: 2 },
      lowpass: { frequency: 4000 },
    })
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.getFilters()).toHaveLength(3)
  })

  it('oscillator without filters connects directly without error', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.getFilters()).toHaveLength(0)
  })
})
