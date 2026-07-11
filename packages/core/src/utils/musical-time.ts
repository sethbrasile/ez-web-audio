import { ValidationError } from '../errors'

/**
 * Musical time notation type — accepts string notation or numeric beat values.
 *
 * String notation supports:
 * - Note values: `'1n'` (whole), `'2n'` (half), `'4n'` (quarter), `'8n'`, `'16n'`, `'32n'`
 * - Triplets: `'4t'`, `'8t'`, `'16t'` (2/3 of the base note value)
 * - Dotted notes: `'4n.'`, `'8n.'` (1.5x the base note value)
 * - Measures: `'1m'`, `'2m'`, `'4m'` (beatsPerBar * count)
 * - Bar:beat:tick: `'2:1:0'` (positional, 1-indexed bar/beat, 0-indexed tick)
 *
 * Numeric values are treated as beat counts and passed through unchanged.
 */
export type MusicalTimeNotation = string | number

// Regex patterns for musical time notation
const NOTE_PATTERN = /^(\d+)n(\.)?$/
const TRIPLET_PATTERN = /^(\d+)t$/
const MEASURE_PATTERN = /^(\d+)m$/
const POSITION_PATTERN = /^(\d+):(\d+):(\d+)$/

/**
 * Convert musical time notation to beats (BPM-independent).
 *
 * Supports:
 * - Note values: '1n' (whole=4), '2n' (half=2), '4n' (quarter=1), '8n', '16n', '32n'
 * - Triplets: '4t', '8t', '16t' (2/3 of the base note value)
 * - Dotted notes: '4n.', '8n.' (1.5x the base note value)
 * - Measures: '1m', '2m', '4m' (beatsPerBar * count)
 * - Bar:beat:tick: '2:1:0' (positional, 1-indexed bar/beat, 0-indexed tick)
 * - Numeric passthrough: number values returned as-is
 *
 * @param notation - Musical time notation string or numeric beat value
 * @param beatsPerBar - Beats per bar for measure/position calculations (default: 4)
 * @param ticksPerBeat - Ticks per beat for position calculations (default: 4)
 * @returns Number of beats
 * @throws {ValidationError} if notation is invalid
 *
 * @example
 * ```typescript
 * musicalTimeToBeats('4n')        // 1.0 (quarter note = 1 beat)
 * musicalTimeToBeats('8t')        // 0.333... (eighth triplet)
 * musicalTimeToBeats('4n.')       // 1.5 (dotted quarter)
 * musicalTimeToBeats('2m')        // 8 (two bars in 4/4)
 * musicalTimeToBeats('2:1:0')     // 4 (bar 2, beat 1 in 4/4)
 * musicalTimeToBeats('1m', 3)     // 3 (one bar in 3/4)
 * ```
 */
export function musicalTimeToBeats(
  notation: MusicalTimeNotation,
  beatsPerBar: number = 4,
  ticksPerBeat: number = 4,
): number {
  // Numeric passthrough
  if (typeof notation === 'number') {
    return notation
  }

  if (typeof notation !== 'string' || notation === '') {
    throw new ValidationError(`Invalid musical time notation: "${notation}"`)
  }

  // Note values: 1n, 2n, 4n, 8n, 16n, 32n (with optional dot)
  let match = notation.match(NOTE_PATTERN)
  if (match) {
    const noteValue = Number.parseInt(match[1], 10)
    if (noteValue === 0) {
      throw new ValidationError(`Invalid musical time notation: "${notation}" — note value cannot be 0`)
    }
    const isDotted = !!match[2]
    const beats = 4 / noteValue
    return isDotted ? beats * 1.5 : beats
  }

  // Triplets: 4t, 8t, 16t
  match = notation.match(TRIPLET_PATTERN)
  if (match) {
    const noteValue = Number.parseInt(match[1], 10)
    if (noteValue === 0) {
      throw new ValidationError(`Invalid musical time notation: "${notation}" — note value cannot be 0`)
    }
    return (4 / noteValue) * (2 / 3)
  }

  // Measures: 1m, 2m, 4m
  match = notation.match(MEASURE_PATTERN)
  if (match) {
    const measureCount = Number.parseInt(match[1], 10)
    return measureCount * beatsPerBar
  }

  // Bar:beat:tick position: "2:1:0"
  match = notation.match(POSITION_PATTERN)
  if (match) {
    const bar = Number.parseInt(match[1], 10)
    const beat = Number.parseInt(match[2], 10)
    const tick = Number.parseInt(match[3], 10)
    return (bar - 1) * beatsPerBar + (beat - 1) + tick / ticksPerBeat
  }

  throw new ValidationError(`Invalid musical time notation: "${notation}"`)
}

/**
 * Convert musical time notation to seconds given BPM and time signature.
 *
 * This is the primary user-facing function. It converts any musical time notation
 * to an absolute duration in seconds, accounting for BPM and time signature.
 *
 * @param notation - Musical time notation string or numeric beat value
 * @param bpm - Tempo in beats per minute (must be > 0)
 * @param timeSignature - Time signature as [beatsPerBar, beatUnit] (default: [4, 4])
 * @param ticksPerBeat - Ticks per beat for position calculations (default: 4)
 * @returns Duration in seconds
 * @throws {ValidationError} if BPM <= 0 or notation is invalid
 *
 * @example
 * ```typescript
 * parseMusicalTime('4n', 120)           // 0.5 seconds
 * parseMusicalTime('1m', 120)           // 2.0 seconds (one bar of 4/4 at 120 BPM)
 * parseMusicalTime('4n', 60)            // 1.0 second
 * parseMusicalTime('1m', 120, [3, 4])   // 1.5 seconds (one bar of 3/4 at 120 BPM)
 * ```
 */
export function parseMusicalTime(
  notation: MusicalTimeNotation,
  bpm: number,
  timeSignature: [number, number] = [4, 4],
  ticksPerBeat: number = 4,
): number {
  if (bpm <= 0) {
    throw new ValidationError(`BPM must be greater than 0. Received: ${bpm}`)
  }

  const beats = musicalTimeToBeats(notation, timeSignature[0], ticksPerBeat)
  // Scale by beatUnit: in 4/4, quarter=1 beat (scale=1.0).
  // In 6/8, eighth=1 beat (scale=0.5). In 2/2, half=1 beat (scale=2.0).
  const beatUnitScale = 4 / timeSignature[1]
  return beats * (60 / bpm) * beatUnitScale
}

/**
 * Type guard for valid musical time notation strings.
 *
 * Returns true if the value is a string that can be parsed as musical time notation.
 * Does not accept numeric values (use `typeof value === 'number'` separately).
 *
 * @param value - Value to check
 * @returns true if value is a valid musical time notation string
 *
 * @example
 * ```typescript
 * isMusicalTimeNotation('4n')     // true
 * isMusicalTimeNotation('8t')     // true
 * isMusicalTimeNotation('1m')     // true
 * isMusicalTimeNotation('2:1:0')  // true
 * isMusicalTimeNotation('xyz')    // false
 * isMusicalTimeNotation(42)       // false
 * ```
 */
export function isMusicalTimeNotation(value: unknown): value is string {
  if (typeof value !== 'string' || value === '') {
    return false
  }

  // Try each pattern
  if (NOTE_PATTERN.test(value)) {
    // Reject 0n
    const noteValue = Number.parseInt(value, 10)
    return noteValue > 0
  }

  if (TRIPLET_PATTERN.test(value)) {
    const noteValue = Number.parseInt(value, 10)
    return noteValue > 0
  }

  if (MEASURE_PATTERN.test(value)) {
    return true
  }

  if (POSITION_PATTERN.test(value)) {
    return true
  }

  return false
}
