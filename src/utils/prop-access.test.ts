import { describe, expect, it } from 'vitest'
import { get, set } from './prop-access'

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

  describe('set', () => {
    it('sets single-level property', () => {
      const obj = { name: 'old' }
      set(obj, 'name', 'new')
      expect(obj.name).toBe('new')
    })

    it('sets nested property', () => {
      const obj = { a: { b: { c: 'old' } } }
      set(obj, 'a.b.c', 'new')
      expect(obj.a.b.c).toBe('new')
    })

    it('creates intermediate objects if missing', () => {
      const obj: any = {}
      set(obj, 'a.b.c', 'created')
      expect(obj.a.b.c).toBe('created')
      expect(obj.a).toBeDefined()
      expect(obj.a.b).toBeDefined()
    })

    it('overwrites existing value', () => {
      const obj = { a: { b: 'original' } }
      set(obj, 'a.b', 'overwritten')
      expect(obj.a.b).toBe('overwritten')
    })

    it('creates deeply nested structure', () => {
      const obj: any = {}
      set(obj, 'level1.level2.level3.level4', 'deep')
      expect(obj.level1.level2.level3.level4).toBe('deep')
    })

    it('preserves existing sibling properties', () => {
      const obj = { a: { b: 'keep', c: 'me' } }
      set(obj, 'a.d', 'new')
      expect(obj.a.b).toBe('keep')
      expect(obj.a.c).toBe('me')
      expect(obj.a.d).toBe('new')
    })

    it('handles setting to various types', () => {
      const obj: any = {}
      set(obj, 'string', 'text')
      set(obj, 'number', 42)
      set(obj, 'boolean', true)
      set(obj, 'array', [1, 2, 3])
      set(obj, 'object', { nested: 'value' })

      expect(obj.string).toBe('text')
      expect(obj.number).toBe(42)
      expect(obj.boolean).toBe(true)
      expect(obj.array).toEqual([1, 2, 3])
      expect(obj.object).toEqual({ nested: 'value' })
    })

    it('creates intermediate objects without overwriting existing ones', () => {
      const obj: any = { a: { existing: 'keep' } }
      set(obj, 'a.b.c', 'new')
      expect(obj.a.existing).toBe('keep')
      expect(obj.a.b.c).toBe('new')
    })
  })
})
