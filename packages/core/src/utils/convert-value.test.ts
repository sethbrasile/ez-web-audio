import type { RatioType } from '@controllers/base-param-controller'
import { describe, expect, it } from 'vitest'
import { ValidationError } from '../errors'
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

  it('percent still works when type is explicitly "gain"', () => {
    expect(convertValue(50, 'percent', 'gain')).toBe(0.5)
  })

  it('throws ValidationError for unsupported ratio type', () => {
    expect(() => convertValue(1, 'decibels' as RatioType)).toThrow(
      'Unsupported ratio type',
    )
    expect(() => convertValue(1, 'decibels' as RatioType)).toThrow(ValidationError)
  })

  describe('percent scoped away from pan (R1#2)', () => {
    it('throws ValidationError for percent + pan — percent cannot express pan\'s negative range', () => {
      expect(() => convertValue(50, 'percent', 'pan')).toThrow(ValidationError)
      expect(() => convertValue(50, 'percent', 'pan')).toThrow(/percent.*not supported for.*pan/i)
    })

    it('percent + pan error message points callers at ratio instead', () => {
      expect(() => convertValue(0, 'percent', 'pan')).toThrow(/ratio/i)
    })

    it('ratio and inverseRatio still work for pan', () => {
      expect(convertValue(-1, 'ratio', 'pan')).toBe(-1)
      expect(convertValue(0.25, 'inverseRatio', 'pan')).toBeCloseTo(0.75)
    })
  })
})
