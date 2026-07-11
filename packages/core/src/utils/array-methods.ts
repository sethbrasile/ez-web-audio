/**
 * @public
 * @class utils
 */

/**
 * Given an array and an index, splits the array at index and pushes the first
 * chunk to the end of the second chunk.
 *
 * @private
 * @method arraySwap
 * @param {Array} arr An array to split, shift and rejoin.
 * @param {number} index The index where the split should occur.
 * @return {Array} The swapped/shifted array.
 */
export function arraySwap<T>(arr: T[], index: number): T[] {
  const beginOfArr = arr.slice(0, index)
  const endOfArr = arr.slice(index, arr.length)
  endOfArr.push(...beginOfArr)
  return endOfArr
}

// replaces array so don't use on observable array
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}
