import { assert, it } from 'vitest'
import withinRange from '@utils/within-range'

it('exists', () => {
  const result = withinRange(1, 0, 1)
  assert.ok(result)
})

it('returns value if falls within range', () => {
  const result = withinRange(1.5, 1, 2)
  assert.strictEqual(result, 1.5)
})

it('returns min if value is less than min', () => {
  const result = withinRange(0.5, 1, 2)
  assert.strictEqual(result, 1)
})

it('returns max if value is greater than max', () => {
  const result = withinRange(3, 1, 2)
  assert.strictEqual(result, 2)
})

it('handles NaN by returning NaN', () => {
  const result = withinRange(NaN, 0, 1)
  assert.ok(Number.isNaN(result))
})

it('handles Infinity by returning max', () => {
  const result = withinRange(Infinity, 0, 1)
  assert.strictEqual(result, 1)
})

it('handles negative Infinity by returning min', () => {
  const result = withinRange(-Infinity, -1, 1)
  assert.strictEqual(result, -1)
})

it('handles equal min and max by returning that value', () => {
  const result = withinRange(0.5, 0.5, 0.5)
  assert.strictEqual(result, 0.5)
})

it('handles value equal to min', () => {
  const result = withinRange(1, 1, 2)
  assert.strictEqual(result, 1)
})

it('handles value equal to max', () => {
  const result = withinRange(2, 1, 2)
  assert.strictEqual(result, 2)
})
