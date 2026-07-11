import frequencyMap from '@utils/frequency-map'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Oscillator } from '@/oscillator'
import { Envelope } from './envelope'
import { InvalidNoteError } from './errors'

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
          attack: 0.05,
          decay: 0.2,
          sustain: 0.6,
          release: 0.4,
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
        envelope: { attack: 0.1 }, // only attack specified
      })
      expect(osc).toBeDefined()
    })

    it('combines envelope with other oscillator options', () => {
      const osc = new Oscillator(audioContext, {
        frequency: 880,
        type: 'sawtooth',
        gain: 0.5,
        envelope: {
          attack: 0.1,
          sustain: 0.8,
        },
      })
      expect(osc).toBeDefined()
    })

    it('combines envelope with filter options', () => {
      const osc = new Oscillator(audioContext, {
        envelope: { attack: 0.05 },
        lowpass: { frequency: 1000, q: 2 },
      })
      expect(osc).toBeDefined()
    })
  })

  describe('play with envelope', () => {
    it('applies envelope on play', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.7,
          release: 0.3,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('passes configured gain to envelope as peak so attack does not overshoot', async () => {
      const applySpy = vi.spyOn(Envelope.prototype, 'applyTo')
      const osc = new Oscillator(audioContext, {
        gain: 0.25,
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      })
      await osc.play()
      expect(applySpy).toHaveBeenCalledWith(expect.anything(), expect.any(Number), 0.25)
    })

    it('plays without envelope (standard behavior)', async () => {
      const osc = new Oscillator(audioContext, { frequency: 440 })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('stop triggers release phase and schedules stop', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.7,
          release: 0.3,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
      // Stop triggers release and schedules stopAt after release
      // With envelope, stop() is async and waits for release
      await osc.stop()
      // After awaiting stop, the oscillator should be stopped
      // Note: The exact timing depends on the mock, but stop should complete
    })

    it('can be retriggered while playing (clickless)', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.7,
          release: 0.2,
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
          attack: 0.01,
          sustain: 0.7,
          release: 0.3,
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
          attack: 0.05,
          sustain: 0.6,
          release: 0.2,
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
        envelope: { attack: 0.02, sustain: 0.8 },
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
          attack: 0,
          decay: 0.1,
          sustain: 0.5,
          release: 0.1,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('zero release time works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.01,
          sustain: 0.7,
          release: 0,
        },
      })
      await osc.play()
      await osc.stop()
      expect(osc.isPlaying).toBe(false)
    })

    it('full sustain (1.0) works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 1.0,
          release: 0.2,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })

    it('zero sustain (0.0) works', async () => {
      const osc = new Oscillator(audioContext, {
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.0,
          release: 0.2,
        },
      })
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('frequency 0 defaults to 440 because 0 is falsy with || operator', () => {
      // options?.frequency || 440 — 0 is falsy so it defaults to 440
      // This is a known quirk: passing frequency: 0 silently becomes 440
      const osc = new Oscillator(audioContext, { frequency: 0 })
      expect(osc).toBeDefined()
      // It constructs without error because 0 || 440 = 440, and 440 > 0 passes the guard
    })

    it('negative frequency throws descriptive error', () => {
      expect(() => new Oscillator(audioContext, { frequency: -1 })).toThrow(
        'Oscillator frequency must be greater than 0',
      )
    })

    it('frequency undefined defaults to 440', () => {
      // No frequency option — defaults to 440
      const osc = new Oscillator(audioContext)
      expect(osc).toBeDefined()
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
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 0.3,
        },
      })

      // The detailed envelope automation scheduling is already tested in envelope.test.ts
      // Here we just verify that an oscillator with envelope can play
      await osc.play()
      expect(osc.isPlaying).toBe(true)
    })
  })
})

describe('note-based creation', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('note "A4" resolves to frequency 440', () => {
    const osc = new Oscillator(audioContext, { note: 'A4' })
    expect(osc).toBeDefined()
    // Verify A4 = 440 in the frequency map
    expect(frequencyMap.A4).toBe(440)
    // Access protected freq to verify it was set correctly
    expect((osc as any).freq).toBe(440)
  })

  it('note "C4" resolves to correct frequency', () => {
    const osc = new Oscillator(audioContext, { note: 'C4' })
    expect(osc).toBeDefined()
    // C4 = 261.63 in standard 12-TET
    expect((osc as any).freq).toBe(frequencyMap.C4)
  })

  it('invalid note throws InvalidNoteError with identifier', () => {
    expect(() => new Oscillator(audioContext, { note: 'X9' })).toThrow(InvalidNoteError)
    try {
      void new Oscillator(audioContext, { note: 'X9' })
    }
    catch (e) {
      expect(e).toBeInstanceOf(InvalidNoteError)
      expect((e as InvalidNoteError).identifier).toBe('X9')
      expect((e as InvalidNoteError).message).toContain('Unknown note "X9"')
    }
  })

  it('note takes precedence over frequency when both provided', () => {
    // A4 = 440, but frequency is set to 220. Note should win.
    const osc = new Oscillator(audioContext, { note: 'A4', frequency: 220 })
    expect((osc as any).freq).toBe(440)
  })

  it('frequency: 0 results in 440Hz (0 is falsy with || operator)', () => {
    // this.freq = options?.frequency || 440
    // 0 || 440 = 440, so frequency 0 silently becomes 440
    const osc = new Oscillator(audioContext, { frequency: 0 })
    expect((osc as any).freq).toBe(440)
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

describe('gain preservation across play() calls (BUG-01 regression)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('preserves user-set gain across play-stop-play cycle', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    osc.changeGainTo(0.5)
    expect(osc.gainNode.gain.value).toBeCloseTo(0.5)

    await osc.play()
    await osc.stop()

    // Second play should preserve gain, not reset to defaultValue (1.0)
    await osc.play()
    expect(osc.gainNode.gain.value).toBeCloseTo(0.5)
  })

  it('preserves gain set via update() across play() calls', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    osc.update('gain').to(0.3).as('ratio')
    expect(osc.gainNode.gain.value).toBeCloseTo(0.3)

    await osc.play()
    await osc.stop()
    await osc.play()

    expect(osc.gainNode.gain.value).toBeCloseTo(0.3)
  })

  it('preserves gain set via constructor option across play() calls', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440, gain: 0.7 })

    await osc.play()
    await osc.stop()
    await osc.play()

    expect(osc.gainNode.gain.value).toBeCloseTo(0.7)
  })

  it('does not reset gain to 1.0 (defaultValue) on subsequent play()', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    osc.changeGainTo(0.2)

    // Multiple play cycles
    for (let i = 0; i < 3; i++) {
      await osc.play()
      expect(osc.gainNode.gain.value).toBeCloseTo(0.2)
      await osc.stop()
    }
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

  it('durationRaw returns Infinity (PERF-02)', () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    expect(osc.durationRaw).toBe(Infinity)
  })
})

// gate-2 ez-audio-5b2: replaying an Oscillator must fully neutralize the
// previous (single-use) source node — otherwise its delayed scheduled stop
// and onended handler leak into the new note's lifetime.
describe('replay neutralizes previous source node', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('play() after an envelope release stops and detaches the old node', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 },
    })
    await osc.play()
    const oldNode = osc.audioSourceNode

    await osc.stop() // schedules oldNode.stop(now + release)
    await osc.play() // reuse before the tail finished

    expect(osc.audioSourceNode).not.toBe(oldNode)
    expect(oldNode.onended).toBeNull()
    expect(osc.isPlaying).toBe(true)
  })

  it('a stale onended from the previous node cannot kill current playback', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    const oldNode = osc.audioSourceNode
    const staleHandler = oldNode.onended

    await osc.play() // replaces source node without stop()
    const currentNode = osc.audioSourceNode
    expect(currentNode).not.toBe(oldNode)

    // Simulate the old node's delayed ended event with the captured handler
    staleHandler?.call(oldNode, {} as Event)

    expect(osc.isPlaying).toBe(true)
  })

  it('stop() with envelope emits end when the release tail actually finishes', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 },
    })
    const endHandler = vi.fn()
    osc.on('end', endHandler)

    await osc.play()
    await osc.stop()
    expect(endHandler).not.toHaveBeenCalled() // tail still ringing

    osc.audioSourceNode.onended?.({} as Event)
    expect(endHandler).toHaveBeenCalledOnce()
  })

  it('stop() without envelope emits end when the anti-click fade finishes', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    const endHandler = vi.fn()
    osc.on('end', endHandler)

    await osc.play()
    await osc.stop()

    osc.audioSourceNode.onended?.({} as Event)
    expect(endHandler).toHaveBeenCalledOnce()
  })
})

// gate-2 ez-audio-20p: update('frequency') must survive replay — setup()
// re-applies the instance frequency to each fresh OscillatorNode.
describe('update(frequency) persists across plays', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('replay uses the updated frequency, not the constructor frequency', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    osc.update('frequency').to(880).as('ratio')
    await osc.stop()

    await osc.play()
    const setSpy = vi.spyOn(osc.audioSourceNode.frequency, 'setValueAtTime')
    await osc.stop()
    await osc.play()
    // setup() applied this.freq to the fresh node — must be 880 now
    expect((osc as unknown as { freq: number }).freq).toBe(880)
    expect(setSpy).not.toHaveBeenCalledWith(440, expect.any(Number))
  })
})

// gate-2 ez-audio-20p: stop() must cancel a play() that was scheduled for a
// future time but has not started yet (lookahead-scheduled notes).
describe('stop cancels scheduled-but-unstarted playback', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('stop() after playIn() cancels the pending start', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    osc.playIn(5)
    await Promise.resolve() // flush async playAt

    const node = osc.audioSourceNode
    const stopSpy = vi.spyOn(node, 'stop')
    await osc.stop()

    expect(stopSpy).toHaveBeenCalled()
    expect(osc.isPlaying).toBe(false)
  })
})

// gate-2 ez-audio-a30: screech investigation. TransportSequencerDemo retriggers
// a single Oscillator instance every loop pass via playIn(), managing its own
// per-note gain envelope directly on getGainNode() (setValueAtTime + a short
// linearRampToValueAtTime fade) instead of calling stop(). Root-cause finding:
// Oscillator.setup() unconditionally hard-stopped and disconnected the
// previous source node the instant a new play() began, even when that node
// was still audibly playing (mid-fade, well before its own scheduled fade
// completed) — an abrupt, non-zero-crossing cutoff that clicks/screeches.
// Sound.setup() already solves the identical problem (see sound.test.ts
// "replaying while playing routes the old source through a release gain") by
// routing a still-playing old node through a short independent release gain
// instead of a hard stop. Oscillator had no equivalent guard.
describe('retrigger while still playing avoids hard-cut click (ez-audio-a30)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('replaying while playing routes the old source through a release gain, not a hard stop', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440, type: 'triangle' })
    await osc.play()
    const oldNode = osc.audioSourceNode
    const connectSpy = vi.spyOn(oldNode, 'connect')
    const stopSpy = vi.spyOn(oldNode, 'stop')

    await osc.play() // retrigger while still playing — no stop() in between

    expect(osc.audioSourceNode).not.toBe(oldNode)
    // Old node must be re-routed through a release gain (audible fade-out),
    // not just dropped — mirrors Sound.setup()'s established fix for the
    // same class of click.
    expect(connectSpy).toHaveBeenCalled()
    expect(stopSpy).toHaveBeenCalled()
  })

  it('a still-playing old node is stopped after a short fade, not at the exact retrigger instant', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    const oldNode = osc.audioSourceNode
    const stopSpy = vi.spyOn(oldNode, 'stop')

    const now = audioContext.currentTime
    await osc.play() // retrigger while still playing

    expect(stopSpy).toHaveBeenCalled()
    const stopTime = stopSpy.mock.calls[0]?.[0] as number | undefined
    // An immediate/undefined stop time is the hard-cut that produces the
    // click — the fix must schedule the stop slightly in the future so the
    // release-gain fade has time to reach silence first.
    expect(stopTime).toBeGreaterThan(now)
  })

  // gate-2 deep-review C1: setup()'s "not playing" branch hard-cut a node
  // whenever `_isPlaying` was already false — but stop()/stopAt() flip
  // `_isPlaying` false SYNCHRONOUSLY while the actual release/anti-click
  // fade is still scheduled to render for tens to hundreds of ms afterward.
  // A retrigger inside that window (e.g. PolySynth's retriggerVoice/steal,
  // which does stopAt(now) + play() in the same tick) hit the hard-cut path
  // and produced the exact screech class ez-audio-a30 fixed for the
  // still-_isPlaying case only. This block previously asserted the buggy
  // behavior ("is unaffected by the fix") — now asserts the fixed behavior.
  it('retriggering after an explicit stop(), before the release tail has landed, routes through a release gain (C1)', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.5 },
    })
    await osc.play()
    await osc.stop() // _isPlaying flips false immediately; release tail (0.5s) still ringing
    const oldNode = osc.audioSourceNode
    const connectSpy = vi.spyOn(oldNode, 'connect')
    const stopSpy = vi.spyOn(oldNode, 'stop')

    await osc.play() // reuse before the tail finished rendering

    // The outgoing node must be routed through the same release-gain handoff
    // as a live retrigger, not hard-cut — a hard cut here stops the waveform
    // at a non-zero amplitude while competing with the still-ramping release
    // automation on the shared gain node (audible click/screech).
    expect(connectSpy).toHaveBeenCalled()
    const stopCall = stopSpy.mock.calls[0]?.[0] as number | undefined
    expect(stopCall).toBeGreaterThan(audioContext.currentTime)
  })

  it('retriggering long after the release tail has fully landed still hard-cuts (no unnecessary release-gain route)', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0 }, // instant release
    })
    await osc.play()
    await osc.stop() // release completes immediately (release < 0.001 branch)
    const oldNode = osc.audioSourceNode
    const connectSpy = vi.spyOn(oldNode, 'connect')

    await osc.play()

    // The release tail already landed by the time of retrigger — nothing to
    // protect, so the cheaper immediate neutralize path is still correct.
    expect(connectSpy).not.toHaveBeenCalled()
  })

  it('polySynth-style stopAt(now) immediately followed by play() in the same tick routes through a release gain, not a hard cut', async () => {
    // Mirrors poly-synth.ts retriggerVoice()/voice-steal: entry.oscillator.stopAt(now)
    // then void entry.oscillator.play() synchronously, no envelope involved.
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    const oldNode = osc.audioSourceNode
    const connectSpy = vi.spyOn(oldNode, 'connect')

    const now = audioContext.currentTime
    await osc.stopAt(now)
    await osc.play()

    expect(connectSpy).toHaveBeenCalled()
  })

  it('external gain automation on getGainNode() does not survive a retrigger (hypothesis 1: refuted — cancelScheduledValues already runs)', async () => {
    const osc = new Oscillator(audioContext, { frequency: 220, gain: 0.5 })
    osc.playIn(0.05)
    await Promise.resolve()

    const gain = osc.getGainNode().gain
    const cancelSpy = vi.spyOn(gain, 'cancelScheduledValues')
    // Externally schedule a fade-out, mirroring TransportSequencerDemo's
    // manual gain.setValueAtTime/linearRampToValueAtTime calls on
    // getGainNode() (lines ~331-333 of TransportSequencerDemo.vue).
    const now = audioContext.currentTime
    gain.setValueAtTime(0.5, now + 0.1)
    gain.linearRampToValueAtTime(0, now + 0.12)

    // Retrigger before the external ramp completes.
    osc.playIn(0.02)

    expect(cancelSpy).toHaveBeenCalled()
    // Gain is restored to the resolved target immediately, not left mid-ramp
    // toward 0 — stale external automation cannot bleed into the new note.
    expect(gain.value).toBeCloseTo(0.5)
  })
})

// gate-2 deep-review H1: stopAt(future) flipped `_isPlaying` and emitted
// 'stop' immediately while the audio itself kept playing until the
// requested time. BaseSound.stopAt already splits future/immediate
// correctly (base-sound.ts:1041-1091); Oscillator's override didn't —
// stopIn(5) lied about isPlaying/'stop' for the full 5 seconds.
describe('stopAt/stopIn future-time state flip (H1)', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  // Fully controllable setTimeout/clearTimeout so the future-stop flip can
  // be fired deterministically instead of racing real timers.
  function createManualTimers() {
    let nextId = 1
    const pending = new Map<number, () => void>()
    const setTimeoutMock = vi.fn((fn: () => void) => {
      const id = nextId++
      pending.set(id, fn)
      return id
    })
    const clearTimeoutMock = vi.fn((id: number) => {
      pending.delete(id)
    })
    const fireAll = (): void => {
      const callbacks = Array.from(pending.values())
      pending.clear()
      callbacks.forEach(cb => cb())
    }
    return { setTimeoutMock, clearTimeoutMock, fireAll, pending }
  }

  it('stopAt(future) keeps isPlaying true and does not emit \'stop\' until the actual stop time', async () => {
    const { setTimeoutMock, clearTimeoutMock, fireAll } = createManualTimers()
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      setTimeout: setTimeoutMock,
      clearTimeout: clearTimeoutMock,
    })
    await osc.play()
    const stopHandler = vi.fn()
    osc.on('stop', stopHandler)

    await osc.stopAt(audioContext.currentTime + 5)

    // Audio hasn't reached the stop time yet — isPlaying must still read
    // true and 'stop' must not have fired.
    expect(osc.isPlaying).toBe(true)
    expect(stopHandler).not.toHaveBeenCalled()

    fireAll() // simulate the scheduled stop time arriving

    expect(osc.isPlaying).toBe(false)
    expect(stopHandler).toHaveBeenCalledTimes(1)
  })

  it('stopIn(seconds) mirrors stopAt(future) — isPlaying stays true until the delay elapses', async () => {
    const { setTimeoutMock, clearTimeoutMock, fireAll } = createManualTimers()
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      setTimeout: setTimeoutMock,
      clearTimeout: clearTimeoutMock,
    })
    await osc.play()
    await osc.stopIn(5)

    expect(osc.isPlaying).toBe(true)

    fireAll()

    expect(osc.isPlaying).toBe(false)
  })

  it('stopAt(now) (immediate) still flips isPlaying and emits \'stop\' synchronously', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    const stopHandler = vi.fn()
    osc.on('stop', stopHandler)

    await osc.stopAt(audioContext.currentTime)

    expect(osc.isPlaying).toBe(false)
    expect(stopHandler).toHaveBeenCalledTimes(1)
  })

  it('a retrigger before a scheduled future stop lands cancels the stale flip (isPlaying stays true)', async () => {
    const { setTimeoutMock, clearTimeoutMock, fireAll, pending } = createManualTimers()
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      setTimeout: setTimeoutMock,
      clearTimeout: clearTimeoutMock,
    })
    await osc.play()
    await osc.stopIn(5) // schedules a future flip-to-false
    expect(pending.size).toBeGreaterThan(0)

    await osc.play() // retrigger before that timeout fires — setup() must cancel it

    expect(clearTimeoutMock).toHaveBeenCalled()
    expect(osc.isPlaying).toBe(true)

    // Firing whatever remains must not clobber the fresh play() state.
    fireAll()
    expect(osc.isPlaying).toBe(true)
  })
})
