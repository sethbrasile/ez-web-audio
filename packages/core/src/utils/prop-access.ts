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
