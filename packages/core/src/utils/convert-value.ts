import type { ControlType, RatioType } from '@controllers/base-param-controller'
import { ValidationError } from '../errors'

/**
 * Convert a value using the specified ratio method.
 *
 * Shared utility used by BaseParamController, GrainPlayer, and PolySynth
 * to ensure consistent value conversion across all fluent API implementations.
 *
 * @param value - The raw value to convert
 * @param method - The conversion method ('ratio', 'inverseRatio', or 'percent')
 * @param type - Optional control type the value is being converted for. Only
 *   used to reject `'percent'` for `'pan'` (see remarks) — other control
 *   types convert identically whether or not this is provided.
 * @returns The converted value
 *
 * @remarks
 * `'percent'` is scoped to gain-like parameters (0–100 maps to 0–1). Pan's
 * range is -1–1, which `'percent'` cannot express (no way to reach negative/left
 * values), so passing `'percent'` with `type: 'pan'` throws a {@link ValidationError}
 * instead of silently producing a pan value that can never go left. Use
 * `'ratio'` for pan: `sound.update('pan').to(-1).as('ratio')`.
 *
 * @example
 * ```typescript
 * convertValue(0.5, 'ratio')        // 0.5
 * convertValue(0.3, 'inverseRatio') // 0.7
 * convertValue(50, 'percent')       // 0.5
 * convertValue(50, 'percent', 'pan') // throws ValidationError
 * ```
 */
export function convertValue(value: number, method: RatioType, type?: ControlType): number {
  switch (method) {
    case 'ratio':
      return value
    case 'inverseRatio':
      return 1 - value
    case 'percent':
      if (type === 'pan') {
        throw new ValidationError(
          `'percent' is not supported for 'pan' — percent (0-100) cannot express pan's left/negative range. `
          + `Use 'ratio' instead: update('pan').to(value).as('ratio') with value from -1 (left) to 1 (right).`,
        )
      }
      return value / 100
    default:
      throw new ValidationError(`Unsupported ratio type: '${method}'. Supported types: 'ratio', 'inverseRatio', 'percent'.`)
  }
}
