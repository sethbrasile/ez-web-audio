import type { SampledNote } from './sampled-note'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Analyzer } from './analyzer'
import { Sound } from './sound'
import { Font } from './font'
import { EffectWrapper } from './effects/effect-wrapper'
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

describe('Sound -> Effect -> Analyzer chain', () => {
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

describe('Soundfont workflow', () => {
  it('Font.getNote() returns the correct SampledNote', () => {
    const noteC4 = createMockNote('C4')
    const noteA4 = createMockNote('A4')
    const noteE3 = createMockNote('E3')
    const font = new Font([noteC4, noteA4, noteE3])

    expect(font.getNote('C4')).toBe(noteC4)
    expect(font.getNote('A4')).toBe(noteA4)
    expect(font.getNote('E3')).toBe(noteE3)
  })

  it('Font.play() calls play() on the correct SampledNote', () => {
    const noteC4 = createMockNote('C4')
    const noteA4 = createMockNote('A4')
    const font = new Font([noteC4, noteA4])

    font.play('C4')

    expect(noteC4.play).toHaveBeenCalledTimes(1)
    expect(noteA4.play).not.toHaveBeenCalled()
  })

  it('Font.play() dispatches to the correct note among many', () => {
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

  it('Font.play() can play same note multiple times', () => {
    const noteC4 = createMockNote('C4')
    const font = new Font([noteC4])

    font.play('C4')
    font.play('C4')
    font.play('C4')

    expect(noteC4.play).toHaveBeenCalledTimes(3)
  })

  it('Font.play() throws for missing note', () => {
    const noteC4 = createMockNote('C4')
    const font = new Font([noteC4])

    expect(() => font.play('Z9')).toThrow('EZ Web Audio')
  })

  it('Font.notes holds the full array passed to constructor', () => {
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
