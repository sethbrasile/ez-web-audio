import { describe, expect, it } from 'vitest'
import { isMusicalTimeNotation, musicalTimeToBeats, parseMusicalTime } from './musical-time'

describe('musicalTimeToBeats', () => {
  describe('note values', () => {
    it('parses whole note (1n) as 4 beats', () => {
      expect(musicalTimeToBeats('1n')).toBe(4)
    })

    it('parses half note (2n) as 2 beats', () => {
      expect(musicalTimeToBeats('2n')).toBe(2)
    })

    it('parses quarter note (4n) as 1 beat', () => {
      expect(musicalTimeToBeats('4n')).toBe(1)
    })

    it('parses eighth note (8n) as 0.5 beats', () => {
      expect(musicalTimeToBeats('8n')).toBe(0.5)
    })

    it('parses sixteenth note (16n) as 0.25 beats', () => {
      expect(musicalTimeToBeats('16n')).toBe(0.25)
    })

    it('parses thirty-second note (32n) as 0.125 beats', () => {
      expect(musicalTimeToBeats('32n')).toBe(0.125)
    })
  })

  describe('triplets', () => {
    it('parses quarter triplet (4t) as 2/3 beats', () => {
      expect(musicalTimeToBeats('4t')).toBeCloseTo(2 / 3)
    })

    it('parses eighth triplet (8t) as 1/3 beats', () => {
      expect(musicalTimeToBeats('8t')).toBeCloseTo(1 / 3)
    })

    it('parses sixteenth triplet (16t) as 1/6 beats', () => {
      expect(musicalTimeToBeats('16t')).toBeCloseTo(1 / 6)
    })
  })

  describe('dotted notes', () => {
    it('parses dotted quarter (4n.) as 1.5 beats', () => {
      expect(musicalTimeToBeats('4n.')).toBe(1.5)
    })

    it('parses dotted eighth (8n.) as 0.75 beats', () => {
      expect(musicalTimeToBeats('8n.')).toBe(0.75)
    })

    it('parses dotted half (2n.) as 3 beats', () => {
      expect(musicalTimeToBeats('2n.')).toBe(3)
    })
  })

  describe('measures', () => {
    it('parses 1m as beatsPerBar (4 in 4/4)', () => {
      expect(musicalTimeToBeats('1m')).toBe(4)
    })

    it('parses 2m as 2 * beatsPerBar', () => {
      expect(musicalTimeToBeats('2m')).toBe(8)
    })

    it('parses 4m as 4 * beatsPerBar', () => {
      expect(musicalTimeToBeats('4m')).toBe(16)
    })

    it('parses 1m in 3/4 time as 3 beats', () => {
      expect(musicalTimeToBeats('1m', 3)).toBe(3)
    })

    it('parses 2m in 3/4 time as 6 beats', () => {
      expect(musicalTimeToBeats('2m', 3)).toBe(6)
    })
  })

  describe('bar:beat:tick positioning', () => {
    it('parses 1:1:0 as 0 beats (start)', () => {
      expect(musicalTimeToBeats('1:1:0')).toBe(0)
    })

    it('parses 1:2:0 as 1 beat', () => {
      expect(musicalTimeToBeats('1:2:0')).toBe(1)
    })

    it('parses 2:1:0 as 4 beats (second bar in 4/4)', () => {
      expect(musicalTimeToBeats('2:1:0')).toBe(4)
    })

    it('parses 2:1:0 in 3/4 as 3 beats', () => {
      expect(musicalTimeToBeats('2:1:0', 3)).toBe(3)
    })

    it('parses 1:1:2 with default ticksPerBeat=4 as 0.5 beats', () => {
      expect(musicalTimeToBeats('1:1:2')).toBe(0.5)
    })

    it('parses 1:1:2 with ticksPerBeat=8 as 0.25 beats', () => {
      expect(musicalTimeToBeats('1:1:2', 4, 8)).toBe(0.25)
    })

    it('parses 3:3:1 correctly', () => {
      // (3-1)*4 + (3-1) + 1/4 = 8 + 2 + 0.25 = 10.25
      expect(musicalTimeToBeats('3:3:1')).toBe(10.25)
    })
  })

  describe('numeric passthrough', () => {
    it('passes through numeric values as beats', () => {
      expect(musicalTimeToBeats(2.5)).toBe(2.5)
    })

    it('passes through 0', () => {
      expect(musicalTimeToBeats(0)).toBe(0)
    })

    it('passes through integer', () => {
      expect(musicalTimeToBeats(4)).toBe(4)
    })
  })

  describe('invalid input', () => {
    it('throws on invalid notation string', () => {
      expect(() => musicalTimeToBeats('xyz')).toThrow()
    })

    it('throws on 0n (zero note value)', () => {
      expect(() => musicalTimeToBeats('0n')).toThrow()
    })

    it('throws on empty string', () => {
      expect(() => musicalTimeToBeats('')).toThrow()
    })

    it('throws descriptive error message', () => {
      expect(() => musicalTimeToBeats('abc')).toThrow(/invalid musical time/i)
    })
  })
})

describe('parseMusicalTime', () => {
  it('converts quarter note at 120 BPM to 0.5 seconds', () => {
    expect(parseMusicalTime('4n', 120)).toBe(0.5)
  })

  it('converts eighth note at 120 BPM to 0.25 seconds', () => {
    expect(parseMusicalTime('8n', 120)).toBe(0.25)
  })

  it('converts 1 measure at 120 BPM to 2 seconds', () => {
    expect(parseMusicalTime('1m', 120)).toBe(2)
  })

  it('converts quarter note at 60 BPM to 1 second', () => {
    expect(parseMusicalTime('4n', 60)).toBe(1)
  })

  it('converts eighth triplet at 120 BPM', () => {
    // 1/3 beat * (60/120) = 1/6 second
    expect(parseMusicalTime('8t', 120)).toBeCloseTo(1 / 6)
  })

  it('converts dotted quarter at 120 BPM to 0.75 seconds', () => {
    expect(parseMusicalTime('4n.', 120)).toBe(0.75)
  })

  it('converts bar:beat:tick position', () => {
    // 2:1:0 = 4 beats in 4/4 → 4 * (60/120) = 2.0s
    expect(parseMusicalTime('2:1:0', 120, [4, 4])).toBe(2)
  })

  it('converts numeric beats to seconds', () => {
    // 2 beats at 120 BPM = 1.0s
    expect(parseMusicalTime(2, 120)).toBe(1)
  })

  it('throws when BPM is 0', () => {
    expect(() => parseMusicalTime('4n', 0)).toThrow()
  })

  it('throws when BPM is negative', () => {
    expect(() => parseMusicalTime('4n', -60)).toThrow()
  })

  it('respects time signature for measures', () => {
    // 1m in 3/4 at 120 BPM = 3 beats * (60/120) = 1.5s
    expect(parseMusicalTime('1m', 120, [3, 4])).toBe(1.5)
  })

  it('respects ticksPerBeat for bar:beat:tick', () => {
    // 1:1:2 with ticksPerBeat=8 = 0.25 beats * (60/120) = 0.125s
    expect(parseMusicalTime('1:1:2', 120, [4, 4], 8)).toBe(0.125)
  })
})

describe('isMusicalTimeNotation', () => {
  it('returns true for note values', () => {
    expect(isMusicalTimeNotation('4n')).toBe(true)
    expect(isMusicalTimeNotation('8n')).toBe(true)
    expect(isMusicalTimeNotation('16n')).toBe(true)
  })

  it('returns true for triplets', () => {
    expect(isMusicalTimeNotation('8t')).toBe(true)
    expect(isMusicalTimeNotation('4t')).toBe(true)
  })

  it('returns true for dotted notes', () => {
    expect(isMusicalTimeNotation('4n.')).toBe(true)
  })

  it('returns true for measures', () => {
    expect(isMusicalTimeNotation('1m')).toBe(true)
    expect(isMusicalTimeNotation('4m')).toBe(true)
  })

  it('returns true for bar:beat:tick', () => {
    expect(isMusicalTimeNotation('2:1:0')).toBe(true)
    expect(isMusicalTimeNotation('1:1:0')).toBe(true)
  })

  it('returns false for invalid strings', () => {
    expect(isMusicalTimeNotation('xyz')).toBe(false)
    expect(isMusicalTimeNotation('')).toBe(false)
    expect(isMusicalTimeNotation('0n')).toBe(false)
  })

  it('returns false for non-strings', () => {
    expect(isMusicalTimeNotation(42)).toBe(false)
    expect(isMusicalTimeNotation(null)).toBe(false)
    expect(isMusicalTimeNotation(undefined)).toBe(false)
  })
})
