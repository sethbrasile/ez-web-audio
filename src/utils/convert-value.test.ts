import type { RatioType } from '@controllers/base-param-controller'
import { describe, expect, it } from 'vitest'
import { convertValue } from './convert-value'

describe('convertValue', () => {
  it('returns raw value for ratio method', () => {
    expect(convertValue(0.5, 'ratio')).toBe(0.5)
    expect(convertValue(1, 'ratio')).toBe(1)
    expect(convertValue(0, 'ratio')).toBe(0)
  })

  it('returns 1 - value for inverseRatio method', () => {
    expect(convertValue(0.3, 'inverseRatio')).toBeCloseTo(0.7)
    expect(convertValue(0, 'inverseRatio')).toBe(1)
    expect(convertValue(1, 'inverseRatio')).toBe(0)
  })

  it('returns value / 100 for percent method', () => {
    expect(convertValue(50, 'percent')).toBe(0.5)
    expect(convertValue(100, 'percent')).toBe(1)
    expect(convertValue(0, 'percent')).toBe(0)
    expect(convertValue(75, 'percent')).toBe(0.75)
  })

  it('throws for unsupported ratio type', () => {
    expect(() => convertValue(1, 'decibels' as RatioType)).toThrow(
      'Unsupported ratio type',
    )
  })
})
