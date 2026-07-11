import { ValidationError } from './errors'

/**
 * Configuration options for creating an Analyzer.
 */
export interface AnalyzerOptions {
  /**
   * FFT size for frequency analysis. Must be a power of 2 between 32 and 32768.
   * Larger values provide more frequency detail but less time precision.
   * @default 2048
   */
  fftSize?: number
  /**
   * Minimum decibel value for frequency data scaling.
   * @default -100
   */
  minDecibels?: number
  /**
   * Maximum decibel value for frequency data scaling.
   * @default -30
   */
  maxDecibels?: number
  /**
   * Smoothing time constant (0-1). Higher values smooth data over time.
   * @default 0.8
   */
  smoothingTimeConstant?: number
}

/**
 * Validates that a number is a power of 2 and within the valid FFT size range.
 */
function isValidFftSize(value: number): boolean {
  // Must be power of 2 between 32 and 32768
  return value >= 32 && value <= 32768 && (value & (value - 1)) === 0
}

/**
 * Analyzer class for audio visualization.
 *
 * Wraps the Web Audio AnalyserNode with a convenient API for getting frequency
 * and waveform data. Uses pre-allocated typed arrays for zero-allocation polling.
 *
 * @example
 * ```typescript
 * const analyzer = createAnalyzer(audioContext, { fftSize: 2048 })
 * sound.setAnalyzer(analyzer)
 *
 * function draw() {
 *   const freqData = analyzer.getFrequencyData()
 *   // Draw frequency bars using freqData values (0-255)
 *
 *   const waveData = analyzer.getTimeDomainData()
 *   // Draw oscilloscope waveform using waveData (128 = zero crossing)
 *
 *   requestAnimationFrame(draw)
 * }
 * draw()
 * ```
 */
export class Analyzer {
  /**
   * The underlying AnalyserNode. Connect audio to this node for analysis.
   * Use this as the input when integrating with effect chains.
   */
  public readonly input: AnalyserNode

  // Pre-allocated typed arrays for zero-allocation polling
  private _frequencyData: Uint8Array<ArrayBuffer>
  private _timeDomainData: Uint8Array<ArrayBuffer>
  private _floatFrequencyData: Float32Array<ArrayBuffer>

  constructor(audioContext: AudioContext, options?: AnalyzerOptions) {
    this.input = audioContext.createAnalyser()

    // Apply options with validation
    const fftSize = options?.fftSize ?? 2048
    if (!isValidFftSize(fftSize)) {
      throw new ValidationError(`fftSize must be a power of 2 between 32 and 32768. Got: ${fftSize}`)
    }
    this.input.fftSize = fftSize

    if (options?.minDecibels !== undefined) {
      this.input.minDecibels = options.minDecibels
    }
    if (options?.maxDecibels !== undefined) {
      this.input.maxDecibels = options.maxDecibels
    }
    if (options?.smoothingTimeConstant !== undefined) {
      this.input.smoothingTimeConstant = options.smoothingTimeConstant
    }

    // Pre-allocate typed arrays based on frequencyBinCount (fftSize / 2)
    // Note: we compute this ourselves because some mocks don't implement frequencyBinCount
    const binCount = fftSize / 2
    this._frequencyData = new Uint8Array(binCount)
    this._timeDomainData = new Uint8Array(binCount)
    this._floatFrequencyData = new Float32Array(binCount)
  }

  /**
   * The number of data points available for visualization.
   * Equal to fftSize / 2.
   */
  get frequencyBinCount(): number {
    return this.input.frequencyBinCount
  }

  /**
   * The FFT size used for frequency analysis.
   * Must be a power of 2 between 32 and 32768.
   */
  get fftSize(): number {
    return this.input.fftSize
  }

  set fftSize(value: number) {
    if (!isValidFftSize(value)) {
      throw new ValidationError(`fftSize must be a power of 2 between 32 and 32768. Got: ${value}`)
    }
    this.input.fftSize = value
    // Re-allocate arrays for new size (fftSize / 2)
    const binCount = value / 2
    this._frequencyData = new Uint8Array(binCount)
    this._timeDomainData = new Uint8Array(binCount)
    this._floatFrequencyData = new Float32Array(binCount)
  }

  /**
   * Minimum decibel value for frequency data scaling.
   */
  get minDecibels(): number {
    return this.input.minDecibels
  }

  set minDecibels(value: number) {
    this.input.minDecibels = value
  }

  /**
   * Maximum decibel value for frequency data scaling.
   */
  get maxDecibels(): number {
    return this.input.maxDecibels
  }

  set maxDecibels(value: number) {
    this.input.maxDecibels = value
  }

  /**
   * Smoothing time constant (0-1). Higher values smooth data over time.
   */
  get smoothingTimeConstant(): number {
    return this.input.smoothingTimeConstant
  }

  set smoothingTimeConstant(value: number) {
    this.input.smoothingTimeConstant = value
  }

  /**
   * Get frequency data as unsigned byte array (0-255).
   * Call this in requestAnimationFrame for smooth animations.
   *
   * Each value represents the amplitude at that frequency bin.
   * Lower indices = lower frequencies, higher indices = higher frequencies.
   *
   * @returns Uint8Array of frequency amplitudes (same reference, use immediately or copy)
   *
   * @example
   * ```typescript
   * function draw() {
   *   const data = analyzer.getFrequencyData()
   *   for (let i = 0; i < data.length; i++) {
   *     const barHeight = data[i] / 255 * canvas.height
   *     // Draw bar at position i with height barHeight
   *   }
   *   requestAnimationFrame(draw)
   * }
   * ```
   */
  getFrequencyData(): Uint8Array {
    this.input.getByteFrequencyData(this._frequencyData)
    return this._frequencyData
  }

  /**
   * Get waveform (time domain) data as unsigned byte array.
   * Call this in requestAnimationFrame for oscilloscope visualization.
   *
   * Value of 128 represents zero crossing (silence).
   * Values above 128 = positive amplitude, below 128 = negative amplitude.
   *
   * @returns Uint8Array of waveform samples (same reference, use immediately or copy)
   *
   * @example
   * ```typescript
   * function draw() {
   *   const data = analyzer.getTimeDomainData()
   *   for (let i = 0; i < data.length; i++) {
   *     const y = data[i] / 255 * canvas.height
   *     // Draw point at (i, y) for oscilloscope line
   *   }
   *   requestAnimationFrame(draw)
   * }
   * ```
   */
  getTimeDomainData(): Uint8Array {
    this.input.getByteTimeDomainData(this._timeDomainData)
    return this._timeDomainData
  }

  /**
   * Get precise frequency data as Float32Array with dB values.
   * Use when you need accurate dB readings rather than normalized 0-255 values.
   *
   * Values are in decibels, typically ranging from minDecibels to maxDecibels.
   *
   * @returns Float32Array of dB values (same reference, use immediately or copy)
   *
   * @example
   * ```typescript
   * const data = analyzer.getFloatFrequencyData()
   * const peakDb = Math.max(...data)
   * console.log(`Peak frequency at ${peakDb} dB`)
   * ```
   */
  getFloatFrequencyData(): Float32Array {
    this.input.getFloatFrequencyData(this._floatFrequencyData)
    return this._floatFrequencyData
  }
}

/**
 * Factory function to create an Analyzer.
 *
 * @param audioContext - The AudioContext to use
 * @param options - Optional analyzer configuration
 * @returns Analyzer instance
 *
 * @example
 * ```typescript
 * const analyzer = createAnalyzer(audioContext, { fftSize: 1024 })
 * sound.setAnalyzer(analyzer)
 *
 * function visualize() {
 *   const freqData = analyzer.getFrequencyData()
 *   // Use freqData for visualization
 *   requestAnimationFrame(visualize)
 * }
 * visualize()
 * ```
 */
export function createAnalyzer(audioContext: AudioContext, options?: AnalyzerOptions): Analyzer {
  return new Analyzer(audioContext, options)
}
