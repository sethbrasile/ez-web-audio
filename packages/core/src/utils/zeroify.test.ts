import zeroify from '@utils/zeroify'
import { assert, it } from 'vitest'

it('exists', () => {
  const result = zeroify(0)
  assert.ok(result)
})

it('works for 4', () => {
  const result = zeroify(4)
  assert.strictEqual(result, '04')
})

it('works for 4.77865', () => {
  const result = zeroify(4.77865)
  assert.strictEqual(result, '04')
})

it('works for 10', () => {
  const result = zeroify(10)
  assert.strictEqual(result, '10')
})

it('works for 17', () => {
  const result = zeroify(17)
  assert.strictEqual(result, '17')
})

it('works for 175', () => {
  const result = zeroify(175)
  assert.strictEqual(result, '175')
})

it('clamps negative input to 0', () => {
  const result = zeroify(-5)
  assert.strictEqual(result, '00')
})
