import type { RatioType } from '@controllers/base-param-controller'

/**
 * Convert a value using the specified ratio method.
 *
 * Shared utility used by BaseParamController, GrainPlayer, and PolySynth
 * to ensure consistent value conversion across all fluent API implementations.
 *
 * @param value - The raw value to convert
 * @param method - The conversion method ('ratio', 'inverseRatio', or 'percent')
 * @returns The converted value
 *
 * @example
 * ```typescript
 * convertValue(0.5, 'ratio')        // 0.5
 * convertValue(0.3, 'inverseRatio') // 0.7
 * convertValue(50, 'percent')       // 0.5
 * ```
 */
export function convertValue(value: number, method: RatioType): number {
  switch (method) {
    case 'ratio':
      return value
    case 'inverseRatio':
      return 1 - value
    case 'percent':
      return value / 100
    default:
      throw new Error(`Unsupported ratio type: '${method}'. Supported types: 'ratio', 'inverseRatio', 'percent'.`)
  }
}
