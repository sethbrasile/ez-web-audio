import { describe, expect, it } from 'vitest'
import createTimeObject from './create-time-object'

describe('createTimeObject', () => {
  it('formats typical duration correctly', () => {
    const result = createTimeObject(360, 6, 0)
    expect(result).toEqual({
      raw: 360,
      string: '06:00',
      pojo: { minutes: 6, seconds: 0 },
    })
  })

  it('handles zero duration', () => {
    const result = createTimeObject(0, 0, 0)
    expect(result).toEqual({
      raw: 0,
      string: '00:00',
      pojo: { minutes: 0, seconds: 0 },
    })
  })

  it('formats seconds only duration', () => {
    const result = createTimeObject(45, 0, 45)
    expect(result).toEqual({
      raw: 45,
      string: '00:45',
      pojo: { minutes: 0, seconds: 45 },
    })
  })

  it('handles fractional seconds', () => {
    const result = createTimeObject(90.5, 1, 30.5)
    expect(result.raw).toBe(90.5)
    expect(result.string).toBe('01:30')
    expect(result.pojo).toEqual({ minutes: 1, seconds: 30.5 })
  })

  it('formats large values correctly', () => {
    const result = createTimeObject(3661, 61, 1)
    expect(result).toEqual({
      raw: 3661,
      string: '61:01',
      pojo: { minutes: 61, seconds: 1 },
    })
  })

  it('applies single-digit padding via zeroify', () => {
    const result = createTimeObject(303, 5, 3)
    expect(result.string).toBe('05:03')
  })

  it('does not pad double-digit values', () => {
    const result = createTimeObject(720, 12, 0)
    expect(result.string).toBe('12:00')
  })

  it('preserves minutes greater than 59', () => {
    const result = createTimeObject(4200, 70, 0)
    expect(result.string).toBe('70:00')
    expect(result.pojo.minutes).toBe(70)
  })
})
