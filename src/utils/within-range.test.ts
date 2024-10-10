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
