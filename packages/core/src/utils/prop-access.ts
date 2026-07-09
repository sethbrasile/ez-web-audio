export function get<T>(obj: Record<string, unknown>, path: string): T {
  // Mirrors `path.split('.').reduce((acc, key) => acc && acc[key], obj)` behavior:
  // - null/undefined short-circuit immediately (returning the falsy value)
  // - primitives like string/number short-circuit to undefined
  let result: unknown = obj
  for (const key of path.split('.')) {
    if (result == null)
      return result as T
    if (typeof result !== 'object')
      return undefined as T
    result = (result as Record<string, unknown>)[key]
  }
  return result as T
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function set<T>(
  obj: Record<string, unknown>,
  path: string,
  value: T,
): void {
  const keys = path.split('.')
  let acc: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (UNSAFE_KEYS.has(key))
      return
    if (!acc[key] || typeof acc[key] !== 'object') {
      acc[key] = {}
    }
    acc = acc[key] as Record<string, unknown>
  }
  const finalKey = keys[keys.length - 1]
  if (!UNSAFE_KEYS.has(finalKey)) {
    acc[finalKey] = value
  }
}
