import { applyEqualPowerCrossfade } from '@utils/equal-power-crossfade'
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'
import { beforeEach, describe, expect, it } from 'vitest'

describe('applyEqualPowerCrossfade', () => {
  let audioContext: AudioContext
  let dryGain: GainNode
  let wetGain: GainNode

  beforeEach(() => {
    audioContext = new MockAudioContext() as unknown as AudioContext
    dryGain = audioContext.createGain()
    wetGain = audioContext.createGain()
  })

  it('mix=0 (fully dry): dry gain = 1, wet gain = 0', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0, false)
    expect(dryGain.gain.value).toBeCloseTo(1, 5)
    expect(wetGain.gain.value).toBeCloseTo(0, 5)
  })

  it('mix=1 (fully wet): dry gain ~= 0, wet gain = 1', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 1, false)
    expect(dryGain.gain.value).toBeCloseTo(0, 5)
    expect(wetGain.gain.value).toBeCloseTo(1, 5)
  })

  it('mix=0.5 (equal power): both gains are ~0.707', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0.5, false)
    expect(dryGain.gain.value).toBeCloseTo(0.707, 2)
    expect(wetGain.gain.value).toBeCloseTo(0.707, 2)
  })

  it('mix=0.5 maintains equal power (cos^2 + sin^2 = 1)', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0.5, false)
    const powerSum = dryGain.gain.value ** 2 + wetGain.gain.value ** 2
    expect(powerSum).toBeCloseTo(1, 5)
  })

  it('mix=0.25: dry > wet (intermediate value)', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0.25, false)
    const angle = 0.25 * 0.5 * Math.PI
    expect(dryGain.gain.value).toBeCloseTo(Math.cos(angle), 5)
    expect(wetGain.gain.value).toBeCloseTo(Math.sin(angle), 5)
    expect(dryGain.gain.value).toBeGreaterThan(wetGain.gain.value)
  })

  it('bypass=true sets dry=1, wet=0 regardless of mix', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0.5, true)
    expect(dryGain.gain.value).toBe(1)
    expect(wetGain.gain.value).toBe(0)
  })

  it('bypass=true overrides any mix value including fully wet mix=0.8', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 0.8, true)
    expect(dryGain.gain.value).toBe(1)
    expect(wetGain.gain.value).toBe(0)
  })

  it('bypass=true overrides mix=1 (would normally be fully wet)', () => {
    applyEqualPowerCrossfade(dryGain, wetGain, 1, true)
    expect(dryGain.gain.value).toBe(1)
    expect(wetGain.gain.value).toBe(0)
  })

  it('dry and wet gains maintain equal power at all mix values', () => {
    const mixValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
    for (const mix of mixValues) {
      applyEqualPowerCrossfade(dryGain, wetGain, mix, false)
      const powerSum = dryGain.gain.value ** 2 + wetGain.gain.value ** 2
      expect(powerSum).toBeCloseTo(1, 5)
    }
  })
})
