/**
 * Generates pink noise using the Voss-McCartney algorithm.
 *
 * Pink noise has equal energy per octave, giving it a "1/f" spectral density
 * that sounds more natural than white noise. Commonly used for:
 * - Masking background sounds
 * - Sleep/focus sounds
 * - Audio testing and measurement
 *
 * @param audioContext - The AudioContext whose sample rate to use
 * @returns A mono AudioBuffer containing 1 second of pink noise
 *
 * @example
 * ```typescript
 * import { createPinkNoiseBuffer } from './utils/noise'
 * const audioContext = new AudioContext()
 * const buffer = createPinkNoiseBuffer(audioContext)
 * const source = audioContext.createBufferSource()
 * source.buffer = buffer
 * source.connect(audioContext.destination)
 * source.start()
 * ```
 */
export function createPinkNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const bufferSize = sampleRate // 1 second of audio
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate)
  const output = buffer.getChannelData(0)

  // Voss-McCartney pink noise: sum of multiple octave-band white noise generators
  // Each generator runs at half the rate of the previous (1/f spectrum approximation)
  const numOctaves = 16
  const generators = new Float32Array(numOctaves)
  let running = 0

  for (let i = 0; i < bufferSize; i++) {
    // Update one or more generators based on trailing zeros of i (Voss algorithm)
    let bit = i
    for (let k = 0; k < numOctaves; k++) {
      if ((bit & 1) === 0) {
        // Update generator k with a new random value, adjust running sum
        running -= generators[k]
        generators[k] = Math.random() * 2 - 1
        running += generators[k]
        break
      }
      bit >>= 1
    }
    // Average over generators for pink spectrum, scale to stay in [-1, 1]
    output[i] = running / numOctaves
  }

  return buffer
}

/**
 * Generates brown noise using a cumulative random walk algorithm.
 *
 * Brown noise (also called red noise or Brownian noise) has more energy at lower
 * frequencies than pink noise, producing a deeper, richer sound. Commonly used for:
 * - Deep sleep sounds
 * - Low-frequency masking
 * - Gentle rumbling ambience
 *
 * @param audioContext - The AudioContext whose sample rate to use
 * @returns A mono AudioBuffer containing 1 second of brown noise
 *
 * @example
 * ```typescript
 * import { createBrownNoiseBuffer } from './utils/noise'
 * const audioContext = new AudioContext()
 * const buffer = createBrownNoiseBuffer(audioContext)
 * const source = audioContext.createBufferSource()
 * source.buffer = buffer
 * source.connect(audioContext.destination)
 * source.start()
 * ```
 */
export function createBrownNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const bufferSize = sampleRate // 1 second of audio
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate)
  const output = buffer.getChannelData(0)

  // Cumulative random walk: each sample = previous + small random step
  let lastValue = 0

  for (let i = 0; i < bufferSize; i++) {
    // Add a small random step to the running value
    const step = Math.random() * 0.04 - 0.02 // random in [-0.02, 0.02]
    lastValue = Math.max(-1, Math.min(1, lastValue + step))
    output[i] = lastValue
  }

  return buffer
}
