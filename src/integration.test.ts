import type { SampledNote } from './sampled-note'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Analyzer } from './analyzer'
import { BeatTrack } from './beat-track'
import { EffectWrapper } from './effects/effect-wrapper'
import { Font } from './font'
import { Oscillator } from './oscillator'
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
