export function get<T>(obj: any, path: string): T {
  return path.split('.').reduce((acc: any, key: string) => acc && acc[key], obj) as T
}

export function set<T>(
  obj: any,
  path: string,
  value: T,
): void {
  const keys = path.split('.')
  let acc: any = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!acc[key]) {
      acc[key] = {}
    }
    acc = acc[key]
  }
  acc[keys[keys.length - 1]] = value
}
