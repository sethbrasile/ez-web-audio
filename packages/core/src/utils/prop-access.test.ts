import { describe, expect, it } from 'vitest'
import { get } from './prop-access'

describe('prop-access', () => {
  describe('get', () => {
    it('retrieves single-level property', () => {
      const obj = { name: 'test', value: 42 }
      expect(get(obj, 'name')).toBe('test')
      expect(get(obj, 'value')).toBe(42)
    })

    it('retrieves nested property', () => {
      const obj = { a: { b: { c: 'deep' } } }
      expect(get(obj, 'a.b.c')).toBe('deep')
    })

    it('retrieves deeply nested property', () => {
      const obj = { level1: { level2: { level3: { level4: 'found' } } } }
      expect(get(obj, 'level1.level2.level3.level4')).toBe('found')
    })

    it('returns undefined for non-existent path', () => {
      const obj = { a: { b: 'value' } }
      expect(get(obj, 'a.b.c')).toBeUndefined()
      expect(get(obj, 'x.y.z')).toBeUndefined()
    })

    it('handles null intermediate objects (returns null)', () => {
      const obj = { a: null }
      // The implementation uses acc && acc[key], which returns null when acc is null
      expect(get(obj, 'a.b.c')).toBeNull()
    })

    it('handles undefined intermediate objects gracefully', () => {
      const obj = { a: { b: undefined } }
      expect(get(obj, 'a.b.c')).toBeUndefined()
    })

    it('retrieves arrays as values', () => {
      const obj = { items: [1, 2, 3] }
      expect(get(obj, 'items')).toEqual([1, 2, 3])
    })

    it('retrieves nested values within arrays', () => {
      const obj = { data: { items: [{ id: 1 }, { id: 2 }] } }
      const items = get(obj, 'data.items')
      expect(items).toEqual([{ id: 1 }, { id: 2 }])
    })
  })
})
