import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { describe, expect, it, vi } from 'vitest'
import { Sound } from '@/sound'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

function createSound(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  return new Sound(context, buffer)
}

describe('fire-and-forget play methods handle errors (SAFE-01)', () => {
  it('playIn() does not throw when playAt rejects', () => {
    const context = createMockContext()
    const sound = createSound(context)
    vi.spyOn(sound, 'playAt').mockRejectedValue(new Error('context closed'))

    // Should not throw
    expect(() => sound.playIn(1)).not.toThrow()
  })

  it('playFor() does not throw when playAt rejects', () => {
    const context = createMockContext()
    const sound = createSound(context)
    vi.spyOn(sound, 'playAt').mockRejectedValue(new Error('context closed'))

    // Should not throw
    expect(() => sound.playFor(1)).not.toThrow()
  })

  it('playInAndStopAfter() does not throw when playIn is called with rejected playAt', () => {
    const context = createMockContext()
    const sound = createSound(context)
    vi.spyOn(sound, 'playAt').mockRejectedValue(new Error('context closed'))

    // Should not throw — playInAndStopAfter calls playIn which now catches internally
    expect(() => sound.playInAndStopAfter(1, 2)).not.toThrow()
  })
})

describe('dispose() cleans up audioSourceNode (SAFE-02)', () => {
  it('disconnects audioSourceNode after dispose', () => {
    const context = createMockContext()
    const sound = createSound(context)
    const disconnectSpy = vi.spyOn(sound.audioSourceNode, 'disconnect')
    sound.dispose()
    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('nullifies audioSourceNode.onended after dispose', () => {
    const context = createMockContext()
    const sound = createSound(context)
    sound.audioSourceNode.onended = () => {}
    sound.dispose()
    expect(sound.audioSourceNode.onended).toBeNull()
  })

  it('handles already-disconnected audioSourceNode gracefully', () => {
    const context = createMockContext()
    const sound = createSound(context)
    vi.spyOn(sound.audioSourceNode, 'disconnect').mockImplementation(() => {
      throw new Error('already disconnected')
    })
    // Should not throw
    expect(() => sound.dispose()).not.toThrow()
  })
})
