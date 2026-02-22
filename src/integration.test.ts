import type { SampledNote } from './sampled-note'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Analyzer } from './analyzer'
import { BeatTrack } from './beat-track'
import { EffectWrapper } from './effects/effect-wrapper'
import { Font } from './font'
import { LayeredSound } from './layered-sound'
import { Oscillator } from './oscillator'
import { Sampler } from './sampler'
import { Sound } from './sound'
import { Track } from './track'
import { settle } from './test/helpers'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext, durationSeconds: number = 1) {
  const sampleRate = 44100
  const length = Math.floor(durationSeconds * sampleRate)
  const audioBuffer = context.createBuffer(1, length, sampleRate)
  return new Sound(context, audioBuffer)
}

// Create a mock external effect that implements ExternalEffect interface
function createMockExternalEffect() {
  return {
    connect: vi.fn(),
  }
}

// Create a mock SampledNote for Font testing
function createMockNote(identifier: string): SampledNote {
  return {
    identifier,
    play: vi.fn(),
  } as unknown as SampledNote
}

describe('sound -> Effect -> Analyzer chain', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = createMockContext()
  })

  it('can add an effect and verify it is in the effects chain', () => {
    const sound = createSound(audioContext)
    const externalEffect = createMockExternalEffect()
    const effect = new EffectWrapper(audioContext, externalEffect)

    sound.addEffect(effect)

    const effects = sound.getEffects()
    expect(effects).toHaveLength(1)
    expect(effects[0]).toBe(effect)
  })

  it('can attach an analyzer and retrieve it', () => {
    const sound = createSound(audioContext)
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })

    sound.setAnalyzer(analyzer)

    expect(sound.getAnalyzer()).toBe(analyzer)
  })

  it('can set up Sound -> Effect -> Analyzer chain before playing', () => {
    const sound = createSound(audioContext)
    const externalEffect = createMockExternalEffect()
    const effect = new EffectWrapper(audioContext, externalEffect)
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })

    sound.addEffect(effect)
    sound.setAnalyzer(analyzer)

    expect(sound.getEffects()).toHaveLength(1)
    expect(sound.getEffects()[0]).toBe(effect)
    expect(sound.getAnalyzer()).toBe(analyzer)
  })

  it('effect and analyzer persist through play', async () => {
    const sound = createSound(audioContext)
    const externalEffect = createMockExternalEffect()
    const effect = new EffectWrapper(audioContext, externalEffect)
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })

    sound.addEffect(effect)
    sound.setAnalyzer(analyzer)
    sound.play()

    await settle(() => sound.isPlaying)

    // Effect chain and analyzer persist during playback
    expect(sound.getEffects()).toHaveLength(1)
    expect(sound.getEffects()[0]).toBe(effect)
    expect(sound.getAnalyzer()).toBe(analyzer)
    expect(sound.isPlaying).toBe(true)
  })

  it('effect and analyzer persist after stop', async () => {
    const sound = createSound(audioContext)
    const externalEffect = createMockExternalEffect()
    const effect = new EffectWrapper(audioContext, externalEffect)
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })

    sound.addEffect(effect)
    sound.setAnalyzer(analyzer)

    await sound.play()
    await settle(() => sound.isPlaying)

    await sound.stop()

    // Effect chain and analyzer persist after stop
    expect(sound.isPlaying).toBe(false)
    expect(sound.getEffects()).toHaveLength(1)
    expect(sound.getEffects()[0]).toBe(effect)
    expect(sound.getAnalyzer()).toBe(analyzer)
  })

  it('can add multiple effects in chain order', () => {
    const sound = createSound(audioContext)
    const effect1 = new EffectWrapper(audioContext, createMockExternalEffect())
    const effect2 = new EffectWrapper(audioContext, createMockExternalEffect())
    const effect3 = new EffectWrapper(audioContext, createMockExternalEffect())

    sound.addEffect(effect1)
    sound.addEffect(effect2)
    sound.addEffect(effect3)

    const effects = sound.getEffects()
    expect(effects).toHaveLength(3)
    expect(effects[0]).toBe(effect1)
    expect(effects[1]).toBe(effect2)
    expect(effects[2]).toBe(effect3)
  })

  it('can remove an effect from the chain', () => {
    const sound = createSound(audioContext)
    const effect1 = new EffectWrapper(audioContext, createMockExternalEffect())
    const effect2 = new EffectWrapper(audioContext, createMockExternalEffect())

    sound.addEffect(effect1)
    sound.addEffect(effect2)
    expect(sound.getEffects()).toHaveLength(2)

    sound.removeEffect(effect1)
    expect(sound.getEffects()).toHaveLength(1)
    expect(sound.getEffects()[0]).toBe(effect2)
  })

  it('can detach analyzer by setting null', () => {
    const sound = createSound(audioContext)
    const analyzer = new Analyzer(audioContext)

    sound.setAnalyzer(analyzer)
    expect(sound.getAnalyzer()).toBe(analyzer)

    sound.setAnalyzer(null)
    expect(sound.getAnalyzer()).toBeNull()
  })

  it('full chain: play emits play event with effect and analyzer attached', async () => {
    const sound = createSound(audioContext)
    const effect = new EffectWrapper(audioContext, createMockExternalEffect())
    const analyzer = new Analyzer(audioContext, { fftSize: 1024 })
    const playHandler = vi.fn()

    sound.addEffect(effect)
    sound.setAnalyzer(analyzer)
    sound.on('play', playHandler)

    await sound.play()

    expect(playHandler).toHaveBeenCalledTimes(1)
    expect(playHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          time: expect.any(Number),
          source: sound,
        }),
      }),
    )
  })
})

describe('soundfont workflow', () => {
  it('font.getNote() returns the correct SampledNote', () => {
    const noteC4 = createMockNote('C4')
    const noteA4 = createMockNote('A4')
    const noteE3 = createMockNote('E3')
    const font = new Font([noteC4, noteA4, noteE3])

    expect(font.getNote('C4')).toBe(noteC4)
    expect(font.getNote('A4')).toBe(noteA4)
    expect(font.getNote('E3')).toBe(noteE3)
  })

  it('font.play() calls play() on the correct SampledNote', () => {
    const noteC4 = createMockNote('C4')
    const noteA4 = createMockNote('A4')
    const font = new Font([noteC4, noteA4])

    font.play('C4')

    expect(noteC4.play).toHaveBeenCalledTimes(1)
    expect(noteA4.play).not.toHaveBeenCalled()
  })

  it('font.play() dispatches to the correct note among many', () => {
    const notes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'].map(createMockNote)
    const font = new Font(notes)

    font.play('E3')

    const e3Note = notes.find(n => n.identifier === 'E3')!
    const otherNotes = notes.filter(n => n.identifier !== 'E3')

    expect(e3Note.play).toHaveBeenCalledTimes(1)
    for (const note of otherNotes) {
      expect(note.play).not.toHaveBeenCalled()
    }
  })

  it('font.play() can play same note multiple times', () => {
    const noteC4 = createMockNote('C4')
    const font = new Font([noteC4])

    font.play('C4')
    font.play('C4')
    font.play('C4')

    expect(noteC4.play).toHaveBeenCalledTimes(3)
  })

  it('font.play() throws for missing note', () => {
    const noteC4 = createMockNote('C4')
    const font = new Font([noteC4])

    expect(() => font.play('Z9')).toThrow('EZ Web Audio')
  })

  it('font.notes holds the full array passed to constructor', () => {
    const notes = ['C4', 'D4', 'E4'].map(createMockNote)
    const font = new Font(notes)

    expect(font.notes).toBe(notes)
    expect(font.notes).toHaveLength(3)
  })

  it('end-to-end: create Font from mock notes -> play note -> verify play called', () => {
    // Simulate the workflow: create font with mock notes, play a note
    const noteC4 = createMockNote('C4')
    const noteG4 = createMockNote('G4')
    const noteE4 = createMockNote('E4')

    const font = new Font([noteC4, noteG4, noteE4])

    // Verify initial state
    expect(font.notes).toHaveLength(3)
    expect(font.getNote('C4')).toBe(noteC4)

    // Play a chord (C4, E4, G4)
    font.play('C4')
    font.play('E4')
    font.play('G4')

    // Verify each note was played exactly once
    expect(noteC4.play).toHaveBeenCalledTimes(1)
    expect(noteE4.play).toHaveBeenCalledTimes(1)
    expect(noteG4.play).toHaveBeenCalledTimes(1)
  })
})

describe('Track + effects integration', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  function createTrack(durationSeconds: number = 2): Track {
    const sampleRate = 44100
    const length = Math.floor(durationSeconds * sampleRate)
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate)
    return new Track(audioContext, audioBuffer)
  }

  it('Track can add effect and play — effect persists, isPlaying becomes true', async () => {
    const track = createTrack()
    const externalEffect = { connect: vi.fn() }
    const effect = new EffectWrapper(audioContext, externalEffect)

    track.addEffect(effect)
    await track.play()

    expect(track.getEffects()).toHaveLength(1)
    expect(track.getEffects()[0]).toBe(effect)
    expect(track.isPlaying).toBe(true)
  })

  it('Track with effect can stop and resume — effect still attached after stop', async () => {
    const track = createTrack()
    const effect = new EffectWrapper(audioContext, { connect: vi.fn() })

    track.addEffect(effect)
    await track.play()
    expect(track.isPlaying).toBe(true)

    await track.stop()
    expect(track.isPlaying).toBe(false)

    // Effect chain is preserved after stop
    expect(track.getEffects()).toHaveLength(1)
    expect(track.getEffects()[0]).toBe(effect)
  })

  it('Track with multiple effects maintains chain order', () => {
    const track = createTrack()
    const effect1 = new EffectWrapper(audioContext, { connect: vi.fn() })
    const effect2 = new EffectWrapper(audioContext, { connect: vi.fn() })
    const effect3 = new EffectWrapper(audioContext, { connect: vi.fn() })

    track.addEffect(effect1)
    track.addEffect(effect2)
    track.addEffect(effect3)

    const effects = track.getEffects()
    expect(effects).toHaveLength(3)
    expect(effects[0]).toBe(effect1)
    expect(effects[1]).toBe(effect2)
    expect(effects[2]).toBe(effect3)
  })

  it('Track with analyzer can play and analyzer persists', async () => {
    const track = createTrack()
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })
    const effect = new EffectWrapper(audioContext, { connect: vi.fn() })

    track.addEffect(effect)
    track.setAnalyzer(analyzer)
    await track.play()

    expect(track.getAnalyzer()).toBe(analyzer)
    expect(track.getEffects()).toHaveLength(1)
    expect(track.isPlaying).toBe(true)
  })
})

describe('BeatTrack + effects integration', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  function createSoundInstance(durationSeconds: number = 1): Sound {
    const sampleRate = 44100
    const length = Math.floor(durationSeconds * sampleRate)
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate)
    return new Sound(audioContext, audioBuffer)
  }

  it('Sound instances inside BeatTrack can have effects added to them', () => {
    const sound1 = createSoundInstance()
    const sound2 = createSoundInstance()
    const effect1 = new EffectWrapper(audioContext, { connect: vi.fn() })
    const effect2 = new EffectWrapper(audioContext, { connect: vi.fn() })

    // Effects are added to individual Sound instances, not BeatTrack itself
    sound1.addEffect(effect1)
    sound2.addEffect(effect2)

    const beatTrack = new BeatTrack(audioContext, [sound1, sound2], { numBeats: 4, duration: 100 })

    // Verify sounds in BeatTrack carry their effects
    const sounds = beatTrack.getSounds() as Sound[]
    expect(sounds[0].getEffects()).toHaveLength(1)
    expect(sounds[0].getEffects()[0]).toBe(effect1)
    expect(sounds[1].getEffects()).toHaveLength(1)
    expect(sounds[1].getEffects()[0]).toBe(effect2)
  })

  it('BeatTrack effects on sounds persist through stop()', () => {
    const sound = createSoundInstance()
    const effect = new EffectWrapper(audioContext, { connect: vi.fn() })
    sound.addEffect(effect)

    const beatTrack = new BeatTrack(audioContext, [sound], { numBeats: 4, duration: 100 })

    // Effects persist on sounds even after BeatTrack.stop()
    beatTrack.stop()

    const sounds = beatTrack.getSounds() as Sound[]
    expect(sounds[0].getEffects()).toHaveLength(1)
    expect(sounds[0].getEffects()[0]).toBe(effect)
  })

  it('BeatTrack with empty sounds array throws on play()', () => {
    // BeatTrack delegates play() to Sampler which requires at least one sound
    const beatTrack = new BeatTrack(audioContext, [], { numBeats: 4, duration: 100 })
    expect(() => beatTrack.play()).toThrow()
  })

  it('BeatTrack creates correct number of beats', () => {
    const sound = createSoundInstance()
    const beatTrack = new BeatTrack(audioContext, [sound], { numBeats: 8, duration: 100 })
    expect(beatTrack.beats).toHaveLength(8)
  })
})

describe('factory function error propagation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createSound with network error rejects with AudioLoadError', async () => {
    // Mock both fetch and AudioContext (factory uses getOrCreateAudioContext internally)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    vi.stubGlobal('AudioContext', Mock)

    const { createSound } = await import('./index')

    await expect(createSound('http://invalid.example.com/test.mp3')).rejects.toThrow()
  })

  it('createTrack with network error rejects with AudioLoadError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    vi.stubGlobal('AudioContext', Mock)

    const { createTrack } = await import('./index')

    await expect(createTrack('http://invalid.example.com/track.mp3')).rejects.toThrow()
  })

  it('createOscillator with negative frequency rejects with validation error', async () => {
    vi.stubGlobal('AudioContext', Mock)

    const { createOscillator } = await import('./index')

    // Oscillator constructor throws for negative frequency
    await expect(createOscillator({ frequency: -1 })).rejects.toThrow(
      /frequency must be greater than 0/i,
    )
  })

  it('createBeatTrack with network error rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    vi.stubGlobal('AudioContext', Mock)

    const { createBeatTrack } = await import('./index')

    await expect(createBeatTrack(['http://invalid.example.com/beat.mp3'])).rejects.toThrow()
  })

  it('createSampler with network error rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    vi.stubGlobal('AudioContext', Mock)

    const { createSampler } = await import('./index')

    await expect(createSampler(['http://invalid.example.com/sound.mp3'])).rejects.toThrow()
  })

  it('createSampler with empty URL array resolves with empty Sampler', async () => {
    vi.stubGlobal('AudioContext', Mock)

    const { createSampler } = await import('./index')

    // createSampler([]) — no URLs to fetch, resolves with empty Sampler
    const sampler = await createSampler([])
    expect(sampler).toBeDefined()
    expect(sampler.getSounds()).toHaveLength(0)
  })

  it('createBeatTrack with empty URL array resolves with BeatTrack with 0 sounds', async () => {
    vi.stubGlobal('AudioContext', Mock)

    const { createBeatTrack } = await import('./index')

    const beatTrack = await createBeatTrack([])
    expect(beatTrack).toBeDefined()
    expect(beatTrack.getSounds()).toHaveLength(0)
  })
})

describe('cleanup/dispose pattern', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  function createSoundBuffer(durationSeconds: number = 1): Sound {
    const sampleRate = 44100
    const length = Math.floor(durationSeconds * sampleRate)
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate)
    return new Sound(audioContext, audioBuffer)
  }

  it('Sound cleanup after stop — isPlaying is false', async () => {
    const sound = createSoundBuffer()
    const effect = new EffectWrapper(audioContext, { connect: vi.fn() })
    sound.addEffect(effect)

    await sound.play()
    await settle(() => sound.isPlaying)
    await sound.stop()

    expect(sound.isPlaying).toBe(false)
  })

  it('Effect removal cleans up chain — getEffects() is empty after removing all effects', () => {
    const sound = createSoundBuffer()
    const effect1 = new EffectWrapper(audioContext, { connect: vi.fn() })
    const effect2 = new EffectWrapper(audioContext, { connect: vi.fn() })

    sound.addEffect(effect1)
    sound.addEffect(effect2)
    expect(sound.getEffects()).toHaveLength(2)

    sound.removeEffect(effect1)
    sound.removeEffect(effect2)
    expect(sound.getEffects()).toHaveLength(0)
  })

  it('Effect removal — sound still plays after all effects removed', async () => {
    const sound = createSoundBuffer()
    const effect1 = new EffectWrapper(audioContext, { connect: vi.fn() })
    const effect2 = new EffectWrapper(audioContext, { connect: vi.fn() })

    sound.addEffect(effect1)
    sound.addEffect(effect2)

    sound.removeEffect(effect1)
    sound.removeEffect(effect2)

    // Sound should still play after effect removal
    await expect(sound.play()).resolves.not.toThrow()
    expect(sound.isPlaying).toBe(true)
  })

  it('Oscillator cleanup after stop — isPlaying is false and can play again', async () => {
    const osc = new Oscillator(audioContext, { frequency: 440 })
    await osc.play()
    expect(osc.isPlaying).toBe(true)

    await osc.stop()
    expect(osc.isPlaying).toBe(false)

    // Can be played again after stop (fresh setup)
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(true)
  })

  it('Repeated play/stop cycles do not cause errors — 5 cycles', async () => {
    const sound = createSoundBuffer()

    for (let i = 0; i < 5; i++) {
      await expect(sound.play()).resolves.not.toThrow()
      await settle(() => sound.isPlaying)
      await expect(sound.stop()).resolves.not.toThrow()
    }

    expect(sound.isPlaying).toBe(false)
  })

  it('Analyzer detached via setAnalyzer(null) — getAnalyzer() returns null', async () => {
    const sound = createSoundBuffer()
    const analyzer = new Analyzer(audioContext, { fftSize: 512 })

    sound.setAnalyzer(analyzer)
    expect(sound.getAnalyzer()).toBe(analyzer)

    await sound.play()
    sound.setAnalyzer(null)
    expect(sound.getAnalyzer()).toBeNull()

    // Sound continues playing after analyzer detach
    expect(sound.isPlaying).toBe(true)
    await sound.stop()
  })

  it('Track stop resets position to zero', async () => {
    const sampleRate = 44100
    const audioBuffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate)
    const track = new Track(audioContext, audioBuffer)

    await track.play()
    await track.stop()

    expect(track.isPlaying).toBe(false)
    expect(track.position.raw).toBe(0)
  })
})

describe('Oscillator + filters integration', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  it('Oscillator with lowpass filter — getFilters() returns filter after construction', () => {
    // OscillatorOptions uses named filter properties: lowpass, highpass, bandpass, etc.
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 800, q: 1 },
    })

    const filters = osc.getFilters()
    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('lowpass')
  })

  it('Oscillator with multiple filters — all filters present and in order', () => {
    // OscillatorOptions uses named filter properties; FILTERS array order is:
    // ['highpass', 'bandpass', 'lowpass', ...] — highpass comes before lowpass
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      highpass: { frequency: 200, q: 1 },
      lowpass: { frequency: 4000, q: 1 },
    })

    const filters = osc.getFilters()
    expect(filters).toHaveLength(2)
    expect(filters[0].type).toBe('highpass')
    expect(filters[1].type).toBe('lowpass')
  })

  it('Oscillator with filter can play and stop without error', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      lowpass: { frequency: 2000, q: 1 },
    })

    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(true)

    await expect(osc.stop()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(false)
  })

  it('Oscillator with filters can stop and restart — filters preserved', async () => {
    const osc = new Oscillator(audioContext, {
      frequency: 440,
      bandpass: { frequency: 1000, q: 2 },
    })

    await osc.play()
    expect(osc.getFilters()).toHaveLength(1)

    await osc.stop()
    expect(osc.getFilters()).toHaveLength(1)

    // Can play again after stop
    await expect(osc.play()).resolves.not.toThrow()
    expect(osc.isPlaying).toBe(true)
    expect(osc.getFilters()).toHaveLength(1)
  })
})

describe('Sampler integration', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  function createSoundBuffer(durationSeconds: number = 1): Sound {
    const sampleRate = 44100
    const length = Math.floor(durationSeconds * sampleRate)
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate)
    return new Sound(audioContext, audioBuffer)
  }

  it('Sampler round-robin plays each sound in sequence', () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    const sound3 = createSoundBuffer()
    // Sampler constructor: (sounds[], opts?) — no audioContext
    const sampler = new Sampler([sound1, sound2, sound3])

    const playSpy1 = vi.spyOn(sound1, 'play')
    const playSpy2 = vi.spyOn(sound2, 'play')
    const playSpy3 = vi.spyOn(sound3, 'play')

    sampler.play()
    sampler.play()
    sampler.play()
    sampler.play() // wraps back to sound1

    expect(playSpy1).toHaveBeenCalledTimes(2) // first and fourth call
    expect(playSpy2).toHaveBeenCalledTimes(1)
    expect(playSpy3).toHaveBeenCalledTimes(1)
  })

  it('Sampler getSounds() returns all sounds — integration check', () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    // Sampler constructor: (sounds[], opts?) — no audioContext
    const sampler = new Sampler([sound1, sound2])

    const sounds = sampler.getSounds()
    expect(sounds).toHaveLength(2)
    expect(sounds[0]).toBe(sound1)
    expect(sounds[1]).toBe(sound2)
  })

  it('Sampler with effects on individual sounds — effects persist through sampler play', () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    const externalEffect = { connect: vi.fn() }
    const effect = new EffectWrapper(audioContext, externalEffect)

    // Effects live on individual Sound instances, not Sampler
    sound1.addEffect(effect)

    // Sampler constructor: (sounds[], opts?) — no audioContext
    const sampler = new Sampler([sound1, sound2])

    // Effect on sound1 persists through sampler operations
    expect((sampler.getSounds()[0] as Sound).getEffects()).toHaveLength(1)
    expect((sampler.getSounds()[0] as Sound).getEffects()[0]).toBe(effect)
  })

  it('Sampler play() with empty sounds throws clear error', () => {
    // Sampler constructor: (sounds[], opts?) — no audioContext
    const sampler = new Sampler([])
    expect(() => sampler.play()).toThrow()
  })
})

describe('LayeredSound integration', () => {
  let audioContext: AudioContext

  beforeEach(() => {
    audioContext = new Mock() as unknown as AudioContext
  })

  function createSoundBuffer(durationSeconds: number = 1): Sound {
    const sampleRate = 44100
    const length = Math.floor(durationSeconds * sampleRate)
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate)
    return new Sound(audioContext, audioBuffer)
  }

  it('LayeredSound with two Sound layers — layerCount is 2', () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    // LayeredSound constructor: (audioContext, layers[], opts?)
    const layered = new LayeredSound(audioContext, [sound1, sound2])

    expect(layered.layerCount).toBe(2)
  })

  it('LayeredSound play() calls playAt on all layers', async () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    // LayeredSound.play() calls layer.playAt(startTime) for exact sync — spy on playAt
    const playAtSpy1 = vi.spyOn(sound1, 'playAt')
    const playAtSpy2 = vi.spyOn(sound2, 'playAt')

    // LayeredSound constructor: (audioContext, layers[], opts?)
    const layered = new LayeredSound(audioContext, [sound1, sound2])
    await layered.play()

    expect(playAtSpy1).toHaveBeenCalledTimes(1)
    expect(playAtSpy2).toHaveBeenCalledTimes(1)
  })

  it('LayeredSound stop() stops all layers', async () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    const stopSpy1 = vi.spyOn(sound1, 'stop')
    const stopSpy2 = vi.spyOn(sound2, 'stop')

    // LayeredSound constructor: (audioContext, layers[], opts?)
    const layered = new LayeredSound(audioContext, [sound1, sound2])
    await layered.play()
    await layered.stop()

    expect(stopSpy1).toHaveBeenCalledTimes(1)
    expect(stopSpy2).toHaveBeenCalledTimes(1)
  })

  it('LayeredSound getLayer() returns correct layer by index', () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    // LayeredSound constructor: (audioContext, layers[], opts?)
    const layered = new LayeredSound(audioContext, [sound1, sound2])

    expect(layered.getLayer(0)).toBe(sound1)
    expect(layered.getLayer(1)).toBe(sound2)
    expect(layered.getLayer(2)).toBeUndefined()
  })

  it('LayeredSound with Sound layer that has effect — effect preserved through layered play', async () => {
    const sound1 = createSoundBuffer()
    const sound2 = createSoundBuffer()
    const externalEffect = { connect: vi.fn() }
    const effect = new EffectWrapper(audioContext, externalEffect)

    sound1.addEffect(effect)
    // LayeredSound constructor: (audioContext, layers[], opts?)
    const layered = new LayeredSound(audioContext, [sound1, sound2])

    await layered.play()

    // Effect on individual layer persists through LayeredSound operation
    expect((layered.getLayer(0) as Sound).getEffects()).toHaveLength(1)
    expect((layered.getLayer(0) as Sound).getEffects()[0]).toBe(effect)
  })
})
