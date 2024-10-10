import exponentialRatio from '@utils/exponential-ratio'
import { assert, it } from 'vitest'

it('works', () => {
  const result = exponentialRatio(1)
  assert.ok(result)
})

it('works for 0', () => {
  const result = exponentialRatio(0)
  assert.strictEqual(result, 0)
})

it('works for 0.21', () => {
  const result = exponentialRatio(0.21)
  assert.strictEqual(result, 0.13599518780123843)
})

it('works for 0.5', () => {
  const result = exponentialRatio(0.5)
  assert.strictEqual(result, 0.3775406687981455)
})

it('works for 0.75', () => {
  const result = exponentialRatio(0.75)
  assert.strictEqual(result, 0.6500679912412274)
})

it('works for 0.95', () => {
  const result = exponentialRatio(0.95)
  // This will fail on chrome, pass on firefox.
  // The correct value for chrome is 0.9228460855795179
  assert.strictEqual(result, 0.9228460855795176)
})

it('works for 1', () => {
  const result = exponentialRatio(1)
  assert.strictEqual(result, 1)
})
