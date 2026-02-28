import type { BaseSound } from './base-sound'
import type { BaseEffect } from './effects/base-effect'
import type { Oscillator } from './oscillator'

/**
 * Waveform types supported by the LFO.
 *
 * Standard oscillator types plus 'sample-and-hold' for stepped random modulation.
 */
export type LFOWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'sample-and-hold'

/**
 * Configuration options for creating an LFO.
 */
export interface LFOOptions {
  /** Oscillation frequency in Hz (default: 1) */
  frequency?: number
  /** Modulation depth as ratio 0-1 (default: 0.3) */
  depth?: number
  /** Waveform type or PeriodicWave (default: 'sine') */
  type?: LFOWaveform | PeriodicWave
}

/**
 * Options for connecting an LFO to a target parameter.
 */
export interface LFOConnectOptions {
  /** Sync LFO start/stop with sound play/stop events (default: false) */
  syncLifecycle?: boolean
  /** Reset LFO phase on sound play event (default: false) */
  retrigger?: boolean
  /** Depth unit: 'ratio' (most params), 'cents' (frequency), or 'absolute' */
  depthUnit?: 'ratio' | 'cents' | 'absolute'
  /** Per-connection depth override (overrides LFO-level depth) */
  depth?: number
}

/** @internal */
interface ConnectionRecord {
  audioParam: AudioParam
  depthGain: GainNode
  target: LFOTarget
  paramName: string
  options: LFOConnectOptions
  playListener?: EventListener
  stopListener?: EventListener
  endListener?: EventListener
}

/** Union type for valid LFO connection targets */
type LFOTarget = BaseSound | BaseEffect

/**
 * Low Frequency Oscillator (LFO) for modulating audio parameters.
 *
 * An LFO produces a slow oscillation that can be connected to any audio parameter
 * (gain, pan, frequency, filter cutoff, etc.) to create effects like tremolo,
 * vibrato, auto-pan, and auto-filter.
 *
 * @example
 * ```typescript
 * import { createLFO, createOscillator } from 'ez-web-audio'
 *
 * // Tremolo
 * const synth = await createOscillator({ frequency: 440 })
 * const tremolo = createLFO({ frequency: 5, depth: 0.3, type: 'sine' })
 * tremolo.connect(synth, 'gain').start()
 * synth.play()
 *
 * // Vibrato
 * const vibrato = createLFO({ frequency: 6, depth: 50 })
 * vibrato.connect(synth, 'frequency').start()
 * ```
 */
export class LFO {
  private _frequency: number
  private _depth: number
  private _type: LFOWaveform | PeriodicWave
  private _oscillatorNode: OscillatorNode | AudioBufferSourceNode | null = null
  private _audioContext: AudioContext | null = null
  private _isRunning = false
  private _connections: ConnectionRecord[] = []
  private _disposeListeners = new Map<LFOTarget, EventListener>()
  private _disposed = false

  constructor(options?: LFOOptions) {
    this._frequency = options?.frequency ?? 1
    this._depth = options?.depth ?? 0.3
    this._type = options?.type ?? 'sine'
  }

  // ===== Getters/Setters =====

  /** Current oscillation frequency in Hz */
  get frequency(): number {
    return this._frequency
  }

  set frequency(value: number) {
    this._frequency = value
    if (this._oscillatorNode) {
      if (this._isSampleAndHold()) {
        // S&H: need to regenerate buffer and restart
        if (this._isRunning) {
          this._restart()
        }
      }
      else {
        (this._oscillatorNode as OscillatorNode).frequency.value = value
      }
    }
  }

  /** Current modulation depth */
  get depth(): number {
    return this._depth
  }

  set depth(value: number) {
    this._depth = value
    this._updateAllDepthGains()
  }

  /** Current waveform type */
  get type(): LFOWaveform | PeriodicWave {
    return this._type
  }

  set type(value: LFOWaveform | PeriodicWave) {
    const wasSH = this._isSampleAndHold()
    this._type = value
    const isSH = this._isSampleAndHold()

    if (this._isRunning && (wasSH !== isSH || (!wasSH && !isSH))) {
      // Type changed while running — must recreate source node
      this._restart()
    }
    else if (this._isRunning && !wasSH && !isSH && this._oscillatorNode) {
      // Standard to standard — just change the type on the existing oscillator
      (this._oscillatorNode as OscillatorNode).type = value as OscillatorType
    }
  }

  /** Whether the LFO oscillator is currently running */
  get isRunning(): boolean {
    return this._isRunning
  }

  // ===== Public Methods =====

  /**
   * Connect the LFO to a target's audio parameter.
   *
   * @param target - BaseSound or BaseEffect instance to modulate
   * @param paramName - Parameter name: 'gain', 'pan', 'frequency', 'detune', or effect-specific
   * @param options - Connection options (syncLifecycle, retrigger, depthUnit, depth)
   * @returns this for chaining
   */
  connect(target: LFOTarget, paramName: string, options?: LFOConnectOptions): this {
    if (this._disposed) {
      throw new Error('Cannot connect a disposed LFO. Create a new instance.')
    }

    const opts: LFOConnectOptions = options ?? {}

    // Extract AudioContext from target
    if (!this._audioContext) {
      this._audioContext = this._extractAudioContext(target)
    }

    // Initialize nodes if not yet created
    if (!this._oscillatorNode) {
      this._initNodes()
    }

    // Resolve the AudioParam from target + paramName
    const audioParam = this._resolveAudioParam(target, paramName)

    // Calculate absolute depth
    const connectionDepth = opts.depth ?? this._depth
    const absoluteDepth = this._calculateDepth(audioParam, paramName, connectionDepth, opts.depthUnit)

    // Create per-connection depth GainNode
    const depthGain = this._audioContext!.createGain()
    depthGain.gain.value = absoluteDepth

    // Wire: oscillator -> depthGain -> audioParam
    this._oscillatorNode!.connect(depthGain)
    depthGain.connect(audioParam)

    // Create connection record
    const record: ConnectionRecord = {
      audioParam,
      depthGain,
      target,
      paramName,
      options: opts,
    }

    // Set up lifecycle sync
    if (opts.syncLifecycle) {
      record.playListener = (() => {
        if (!this._isRunning) {
          this.start()
        }
      }) as EventListener

      record.stopListener = (() => {
        if (this._isRunning) {
          this.stop()
        }
      }) as EventListener

      record.endListener = record.stopListener

      if (this._isBaseSound(target)) {
        target.addEventListener('play', record.playListener)
        target.addEventListener('stop', record.stopListener)
        target.addEventListener('end', record.endListener)
      }
    }

    // Set up retrigger
    if (opts.retrigger && this._isBaseSound(target)) {
      const retriggerListener = (() => {
        this._restart()
      }) as EventListener

      record.playListener = retriggerListener
      target.addEventListener('play', retriggerListener)
    }

    // Register dispose event listener for cleanup
    this._listenForDispose(target)

    this._connections.push(record)
    return this
  }

  /**
   * Disconnect from target(s).
   *
   * @param target - If provided, disconnect all connections to this target
   * @param paramName - If provided with target, disconnect only the specific param
   */
  disconnect(target?: LFOTarget, paramName?: string): void {
    if (!target) {
      // Disconnect all
      for (const conn of [...this._connections]) {
        this._removeConnection(conn)
      }
      this._connections = []
      return
    }

    const toRemove = this._connections.filter((c) => {
      if (paramName) {
        return c.target === target && c.paramName === paramName
      }
      return c.target === target
    })

    for (const conn of toRemove) {
      this._removeConnection(conn)
    }

    this._connections = this._connections.filter(c => !toRemove.includes(c))
  }

  /**
   * Start the LFO oscillator.
   *
   * @returns this for chaining
   * @throws If no AudioContext available (call connect() first)
   */
  start(): this {
    if (this._disposed) {
      throw new Error('Cannot start a disposed LFO. Create a new instance.')
    }

    if (!this._audioContext) {
      throw new Error('LFO has no AudioContext — call connect() first or pass audioContext to createLFO()')
    }

    if (this._isRunning) {
      return this
    }

    // If oscillator was stopped (nulled), recreate and rewire
    if (!this._oscillatorNode) {
      this._initNodes()
      this._rewireConnections()
    }

    try {
      this._oscillatorNode!.start()
    }
    catch {
      // Already started — recreate
      this._initNodes()
      this._rewireConnections()
      this._oscillatorNode!.start()
    }

    this._isRunning = true
    return this
  }

  /**
   * Stop the LFO oscillator. Can be restarted with start().
   *
   * @returns this for chaining
   */
  stop(): this {
    if (!this._isRunning) {
      return this
    }

    try {
      this._oscillatorNode?.stop()
    }
    catch {
      // Already stopped
    }

    this._oscillatorNode = null
    this._isRunning = false
    return this
  }

  /**
   * Dispose the LFO, releasing all resources.
   *
   * Stops the oscillator, disconnects all connections, and restores patched dispose methods.
   * Idempotent — safe to call multiple times.
   */
  dispose(): void {
    if (this._disposed) {
      return
    }

    if (this._isRunning) {
      this.stop()
    }

    this.disconnect()

    // Remove all dispose event listeners
    for (const [target, handler] of this._disposeListeners) {
      if (this._isBaseSound(target)) {
        target.removeEventListener('dispose', handler)
      }
    }
    this._disposeListeners.clear()

    this._disposed = true
  }

  /**
   * Set LFO frequency to match a musical note length at a given BPM.
   *
   * @param bpm - Beats per minute
   * @param noteLength - Note length string (e.g., '1/4', '1/8', '1/16')
   * @returns this for chaining
   */
  syncToBPM(bpm: number, noteLength: string): this {
    const parts = noteLength.split('/')
    const numerator = Number.parseInt(parts[0], 10)
    const denominator = Number.parseInt(parts[1], 10)
    // Quarter note at given BPM: bpm/60 Hz
    // Eighth note: (bpm/60) * 2 Hz, etc.
    // General: (bpm/60) * (denominator / 4) * numerator
    const hz = (bpm / 60) * (denominator / 4) * numerator
    this.frequency = hz
    return this
  }

  /**
   * Smoothly ramp the oscillation frequency.
   *
   * @param value - Target frequency in Hz
   * @param duration - Ramp duration in seconds
   */
  rampFrequency(value: number, duration: number): void {
    this._frequency = value
    if (this._oscillatorNode && !this._isSampleAndHold()) {
      const osc = this._oscillatorNode as OscillatorNode
      osc.frequency.setTargetAtTime(value, this._audioContext!.currentTime, duration / 3)
    }
    else if (this._isSampleAndHold() && this._isRunning) {
      // S&H: just update frequency, would need buffer regeneration for true rate change
      this._restart()
    }
  }

  /**
   * Smoothly ramp the modulation depth.
   *
   * @param value - Target depth
   * @param duration - Ramp duration in seconds
   */
  rampDepth(value: number, duration: number): void {
    this._depth = value
    const now = this._audioContext?.currentTime ?? 0
    for (const conn of this._connections) {
      const connectionDepth = conn.options.depth ?? value
      const absoluteDepth = this._calculateDepth(conn.audioParam, conn.paramName, connectionDepth, conn.options.depthUnit)
      conn.depthGain.gain.setTargetAtTime(absoluteDepth, now, duration / 3)
    }
  }

  // ===== Private Helpers =====

  private _isSampleAndHold(): boolean {
    return this._type === 'sample-and-hold'
  }

  private _isBaseSound(target: LFOTarget): target is BaseSound {
    return 'getGainNode' in target && 'getPannerNode' in target
  }

  private _isOscillator(target: LFOTarget): target is Oscillator {
    return this._isBaseSound(target) && 'audioSourceNode' in target && 'freq' in target
  }

  private _extractAudioContext(target: LFOTarget): AudioContext {
    if (this._isBaseSound(target)) {
      return target.audioContext
    }
    // BaseEffect — audioContext is protected, access via cast
    return (target as unknown as { audioContext: AudioContext }).audioContext
  }

  private _resolveAudioParam(target: LFOTarget, paramName: string): AudioParam {
    if (this._isBaseSound(target)) {
      switch (paramName) {
        case 'gain':
          return target.getGainNode().gain
        case 'pan':
          return target.getPannerNode().pan
        case 'frequency': {
          if (!this._isOscillator(target)) {
            throw new Error('Cannot connect to "frequency" — target is not an Oscillator')
          }
          return target.audioSourceNode.frequency
        }
        case 'detune': {
          if (!this._isOscillator(target)) {
            throw new Error('Cannot connect to "detune" — target is not an Oscillator')
          }
          return target.audioSourceNode.detune
        }
        default:
          throw new Error(`Unknown parameter "${paramName}" for BaseSound target. Valid: gain, pan, frequency, detune`)
      }
    }

    // BaseEffect target — use getParam()
    const effect = target as BaseEffect & { getParam: (name: string) => AudioParam | null }
    const param = effect.getParam(paramName)
    if (!param) {
      throw new Error(`Effect parameter "${paramName}" not found. Check the effect's getAudioParam() implementation.`)
    }
    return param
  }

  private _calculateDepth(
    audioParam: AudioParam,
    paramName: string,
    depth: number,
    depthUnit?: 'ratio' | 'cents' | 'absolute',
  ): number {
    const unit = depthUnit ?? (paramName === 'frequency' ? 'cents' : 'ratio')

    switch (unit) {
      case 'absolute':
        return depth
      case 'cents': {
        const paramValue = audioParam.value
        return paramValue * (2 ** (depth / 1200) - 1)
      }
      case 'ratio': {
        const paramValue = audioParam.value
        if (Math.abs(paramValue) < 0.001) {
          return depth // Zero fallback — use depth as absolute
        }
        return paramValue * depth
      }
    }
  }

  private _initNodes(): void {
    const ctx = this._audioContext!

    if (this._isSampleAndHold()) {
      const buffer = this._createSampleAndHoldBuffer(this._frequency)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      this._oscillatorNode = source
    }
    else if (typeof PeriodicWave !== 'undefined' && this._type instanceof PeriodicWave) {
      const osc = ctx.createOscillator()
      osc.setPeriodicWave(this._type)
      osc.frequency.value = this._frequency
      this._oscillatorNode = osc
    }
    else {
      const osc = ctx.createOscillator()
      osc.type = this._type as OscillatorType
      osc.frequency.value = this._frequency
      this._oscillatorNode = osc
    }
  }

  private _rewireConnections(): void {
    for (const conn of this._connections) {
      this._oscillatorNode!.connect(conn.depthGain)
    }
  }

  private _restart(): void {
    if (this._isRunning) {
      try {
        this._oscillatorNode?.stop()
      }
      catch {
        // Already stopped
      }
    }
    this._oscillatorNode = null
    this._initNodes()
    this._rewireConnections()
    try {
      this._oscillatorNode!.start()
    }
    catch {
      // Handle edge cases
    }
    this._isRunning = true
  }

  private _removeConnection(conn: ConnectionRecord): void {
    try {
      conn.depthGain.disconnect(conn.audioParam)
    }
    catch {
      // Already disconnected
    }

    try {
      if (this._oscillatorNode) {
        this._oscillatorNode.disconnect(conn.depthGain)
      }
    }
    catch {
      // Already disconnected
    }

    // Remove event listeners
    if (this._isBaseSound(conn.target)) {
      if (conn.playListener) {
        conn.target.removeEventListener('play', conn.playListener)
      }
      if (conn.stopListener) {
        conn.target.removeEventListener('stop', conn.stopListener)
      }
      if (conn.endListener) {
        conn.target.removeEventListener('end', conn.endListener)
      }
    }
  }

  private _cleanupTarget(target: LFOTarget): void {
    const toRemove = this._connections.filter(c => c.target === target)
    for (const conn of toRemove) {
      this._removeConnection(conn)
    }
    this._connections = this._connections.filter(c => c.target !== target)
    // Remove the dispose listener so it doesn't linger after cleanup
    this._disposeListeners.delete(target)
  }

  private _createSampleAndHoldBuffer(frequency: number): AudioBuffer {
    const ctx = this._audioContext!
    const sampleRate = ctx.sampleRate
    const bufferLength = sampleRate // 1 second buffer
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate)
    const data = buffer.getChannelData(0)

    // Number of steps per second = frequency
    const samplesPerStep = Math.max(1, Math.floor(sampleRate / frequency))

    for (let i = 0; i < bufferLength; i++) {
      if (i % samplesPerStep === 0) {
        // New random value at each step
        const value = Math.random() * 2 - 1 // -1 to 1
        // Fill this step
        for (let j = i; j < Math.min(i + samplesPerStep, bufferLength); j++) {
          data[j] = value
        }
      }
    }

    return buffer
  }

  private _listenForDispose(target: LFOTarget): void {
    // If already listening, skip (idempotent)
    if (this._disposeListeners.has(target)) {
      return
    }

    // Only BaseSound emits 'dispose' events; BaseEffect targets skip until they add dispose()
    if (!this._isBaseSound(target)) {
      return
    }

    const handler = (() => this._cleanupTarget(target)) as EventListener
    target.addEventListener('dispose', handler)
    this._disposeListeners.set(target, handler)
  }

  private _updateAllDepthGains(): void {
    for (const conn of this._connections) {
      const connectionDepth = conn.options.depth ?? this._depth
      const absoluteDepth = this._calculateDepth(conn.audioParam, conn.paramName, connectionDepth, conn.options.depthUnit)
      conn.depthGain.gain.value = absoluteDepth
    }
  }
}
