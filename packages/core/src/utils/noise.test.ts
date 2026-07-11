import { createBrownNoiseBuffer, createPinkNoiseBuffer } from '@utils/noise'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { describe, expect, it } from 'vitest'

function createMockContext() {
  return new Mock() as unknown as AudioContext
}

describe('createPinkNoiseBuffer', () => {
  it('returns a mono buffer of length sampleRate * 1 second', () => {
    const audioContext = createMockContext()
    const buffer = createPinkNoiseBuffer(audioContext)

    expect(buffer.numberOfChannels).toBe(1)
    expect(buffer.length).toBe(audioContext.sampleRate)
    expect(buffer.sampleRate).toBe(audioContext.sampleRate)
  })

  it('keeps every sample within [-1, 1]', () => {
    const audioContext = createMockContext()
    const buffer = createPinkNoiseBuffer(audioContext)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(-1)
      expect(data[i]).toBeLessThanOrEqual(1)
    }
  })
})

describe('createBrownNoiseBuffer', () => {
  it('returns a mono buffer of length sampleRate * 1 second', () => {
    const audioContext = createMockContext()
    const buffer = createBrownNoiseBuffer(audioContext)

    expect(buffer.numberOfChannels).toBe(1)
    expect(buffer.length).toBe(audioContext.sampleRate)
    expect(buffer.sampleRate).toBe(audioContext.sampleRate)
  })

  it('keeps every sample within [-1, 1] (random-walk clamp)', () => {
    const audioContext = createMockContext()
    const buffer = createBrownNoiseBuffer(audioContext)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(-1)
      expect(data[i]).toBeLessThanOrEqual(1)
    }
  })
})
