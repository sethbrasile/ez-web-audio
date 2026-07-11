import type { BaseSound } from './base-sound'
import type { BaseEffect } from './effects/base-effect'
import type { Oscillator } from './oscillator'
import { smoothParamSet } from '@utils/param-smoothing'
import { GrainPlayer } from './grain-player'
import { PolySynth } from './poly-synth'

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
  /**
   * Sync LFO start/stop with sound play/stop events (default: false).
   *
   * **Requires** the target to actually emit 'play'/'stop' (BaseSound
   * subclasses, GrainPlayer). PolySynth does not — connecting with
   * `syncLifecycle: true` against a PolySynth logs a console.warn and the
   * option is a no-op; call `lfo.start()`/`lfo.stop()` manually instead.
   */
  syncLifecycle?: boolean
  /**
   * Reset LFO phase on sound play event (default: false).
   *
   * Same event-contract requirement as {@link syncLifecycle} — a target
   * that never emits 'play' (PolySynth) logs a console.warn instead of
   * silently doing nothing.
   */
  retrigger?: boolean
  /**
   * Depth unit: 'ratio' (most params), 'cents' (frequency), or 'absolute'.
   *
   * **Note:** When depthUnit is 'ratio' or 'cents', depth is calculated from the
   * parameter's current value at connection time. If the parameter value changes
   * later (e.g., gain is adjusted), the modulation depth will NOT automatically
   * update. Use 'absolute' for fixed depth, or call disconnect()/connect() to
   * recalculate.
   *
   * **Clamping:** for 'ratio', `depth` is clamped to [0, 1] (documented range).
   * For 'cents', negative depth is clamped to 0 (a negative value would only
   * flip the LFO's phase). In both cases, if the target parameter's current
   * value is at (or near) 0 — e.g. pan centered — depth is used directly as
   * an absolute swing instead of a ratio of zero. 'absolute' is NOT clamped —
   * it's the fixed-depth escape hatch and has no natural range to clamp
   * against; a too-large absolute depth can still push a non-negative param
   * (gain, frequency) below zero at the trough.
   */
  depthUnit?: 'ratio' | 'cents' | 'absolute'
  /**
   * Per-connection depth override (overrides LFO-level depth).
   *
   * **Note:** For 'ratio' and 'cents' depthUnit, this value is multiplied against
   * the target parameter's value at connection time. The resulting absolute depth
   * is fixed for the lifetime of the connection.
   */
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
type LFOTarget = BaseSound | BaseEffect | GrainPlayer | PolySynth

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
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`LFO frequency must be a positive finite number, got ${value}`)
    }
    this._frequency = value
    if (this._oscillatorNode) {
      if (this._isSampleAndHold()) {
        // S&H: need to regenerate buffer and restart
        if (this._isRunning) {
          this._restart()
        }
      }
      else {
        // Smoothed instead of a raw .value assignment (R8#5) — matches the
        // depth setter's pop-prevention (M3) with the same asymmetry vs.
        // rampFrequency()'s explicit setTargetAtTime.
        smoothParamSet((this._oscillatorNode as OscillatorNode).frequency, value, this._audioContext!.currentTime)
      }
    }
  }

  /** Current modulation depth */
  get depth(): number {
    return this._depth
  }

  set depth(value: number) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`LFO depth must be a finite number, got ${value}`)
    }
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

    if (!this._isRunning)
      return

    if (wasSH !== isSH) {
      // Switching between S&H and standard — must recreate node
      this._restart()
    }
    else if (!wasSH && !isSH && this._oscillatorNode) {
      // Standard to standard — cheap type update, no restart needed
      (this._oscillatorNode as OscillatorNode).type = value as OscillatorType
    }
    else {
      // S&H to S&H — must regenerate buffer
      this._restart()
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

    // H1: Mutual exclusion guard — syncLifecycle and retrigger are incompatible
    if (opts.syncLifecycle && opts.retrigger) {
      throw new Error('LFO connect(): "syncLifecycle" and "retrigger" are mutually exclusive — use one or the other.')
    }

    // M5: connecting the same target+param twice used to silently double the
    // modulation (two depthGains summing into the same AudioParam). Replace
    // rather than stack — disconnect the existing connection first so a
    // caller re-connecting with new options gets one active connection.
    const existing = this._connections.find(c => c.target === target && c.paramName === paramName)
    if (existing) {
      this.disconnect(target, paramName)
    }

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

    // Set up lifecycle sync (H6: gated on the target's REAL event contract —
    // PolySynth emits only 'voicestolen'/'dispose', GrainPlayer has
    // 'play'/'stop' but no 'end'. The old `_isBaseSound` duck-type check
    // matched all three via getGainNode/getPannerNode alone, so syncLifecycle
    // on a PolySynth silently registered listeners for events that never
    // fire — the LFO never auto-started/stopped, with no signal to the
    // caller that anything was wrong.)
    if (opts.syncLifecycle) {
      if (this._supportsPlayStopEvents(target)) {
        const playListener = (() => {
          if (!this._isRunning) {
            this.start()
          }
        }) as EventListener

        const stopListener = (() => {
          // Disconnect only this target — not the entire LFO (QC-1-04)
          this.disconnect(target)
          // If no connections remain, stop the oscillator
          if (this._connections.length === 0 && this._isRunning) {
            this.stop()
          }
        }) as EventListener

        record.playListener = playListener
        record.stopListener = stopListener
        target.addEventListener('play', playListener)
        target.addEventListener('stop', stopListener)

        if (this._supportsEndEvent(target)) {
          record.endListener = stopListener
          target.addEventListener('end', stopListener)
        }
      }
      else {
        console.warn(
          `[ez-web-audio] LFO connect(): "syncLifecycle" requires the target to emit `
          + `'play'/'stop' events — "${this._targetName(target)}" does not. The LFO will `
          + `NOT auto-start/stop with this target's playback; call lfo.start()/lfo.stop() `
          + `manually instead, or omit syncLifecycle.`,
        )
      }
    }

    // Set up retrigger
    if (opts.retrigger) {
      if (this._supportsPlayStopEvents(target)) {
        const retriggerListener = (() => {
          this._restart()
        }) as EventListener

        record.playListener = retriggerListener
        target.addEventListener('play', retriggerListener)
      }
      else {
        console.warn(
          `[ez-web-audio] LFO connect(): "retrigger" requires the target to emit a 'play' `
          + `event — "${this._targetName(target)}" does not. The LFO phase will NOT reset `
          + `on this target's playback.`,
        )
      }
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
    catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        // Already started — recreate and rewire
        this._initNodes()
        this._rewireConnections()
        this._oscillatorNode!.start()
      }
      else {
        throw e
      }
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
    catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        // Already stopped — ignore
      }
      else {
        throw e
      }
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

    // Remove all dispose event listeners (both BaseSound and BaseEffect targets)
    for (const [target, handler] of this._disposeListeners) {
      target.removeEventListener('dispose', handler)
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
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new Error(`syncToBPM: bpm must be a positive finite number, got ${bpm}`)
    }
    const parts = noteLength.split('/')
    if (parts.length !== 2) {
      throw new Error(`syncToBPM: noteLength must be "N/D" format (e.g., "1/4"), got "${noteLength}"`)
    }
    const numerator = Number.parseInt(parts[0], 10)
    const denominator = Number.parseInt(parts[1], 10)
    if (!Number.isFinite(numerator) || numerator <= 0 || !Number.isFinite(denominator) || denominator <= 0) {
      throw new Error(`syncToBPM: noteLength "${noteLength}" has invalid numerator or denominator`)
    }
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

  /**
   * Whether `target` actually emits 'play'/'stop' — the events syncLifecycle
   * and retrigger depend on (H6). `_isBaseSound` duck-types on
   * getGainNode/getPannerNode alone, which PolySynth and GrainPlayer both
   * satisfy despite having very different event contracts (see
   * PolySynthEventMap/GrainPlayerEventMap in events/event-types.ts):
   * PolySynth emits neither; GrainPlayer emits both but no 'end'.
   */
  private _supportsPlayStopEvents(target: LFOTarget): target is BaseSound | GrainPlayer {
    return this._isBaseSound(target) && !(target instanceof PolySynth)
  }

  /** Whether `target` additionally emits 'end' (real BaseSound instances only — not GrainPlayer). */
  private _supportsEndEvent(target: LFOTarget): target is BaseSound {
    return this._supportsPlayStopEvents(target) && !(target instanceof GrainPlayer)
  }

  /** Best-effort human-readable name for a target, for warning messages. */
  private _targetName(target: LFOTarget): string {
    return target.constructor?.name ?? 'target'
  }

  private _extractAudioContext(target: LFOTarget): AudioContext {
    if (this._isBaseSound(target)) {
      return target.audioContext
    }
    // BaseEffect — use public accessor (added in Plan 02)
    return (target as BaseEffect).getAudioContext()
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

  /**
   * Compute the absolute modulation swing (depthGain.gain value) for a
   * connection. `depth` documents as 0-1 for 'ratio' (LFOOptions.depth,
   * LFOConnectOptions.depth); this is now enforced (M4) rather than merely
   * documented — an un-clamped depth >1 (or negative) drove the modulated
   * param negative at the LFO's trough ("phase inversion"), audible as a
   * polarity flip on tremolo/vibrato.
   *
   * 'absolute' is deliberately left unclamped: it's the fixed-depth escape
   * hatch for callers who want a specific swing regardless of the target's
   * current value. A too-large absolute depth CAN still push a non-negative
   * param (gain, frequency) below zero at the trough — that's the caller's
   * responsibility, not validated here, since 'absolute' has no natural
   * upper bound to clamp against.
   */
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
        // Cents has no natural [0,1] range (vibrato commonly uses 50-1200+),
        // so only the sign is guarded here — a negative cents depth just
        // flips the LFO's phase, which M4 disallows for consistency with
        // 'ratio'. The magnitude is bounded below via the shared
        // non-negative-param clamp instead of an artificial cents ceiling.
        const clampedDepth = Math.max(0, depth)
        const absoluteDepth = paramValue * (2 ** (clampedDepth / 1200) - 1)
        return this._clampDepthForNonNegativeParam(absoluteDepth, paramValue)
      }
      case 'ratio': {
        const paramValue = audioParam.value
        const clampedDepth = Math.max(0, Math.min(1, depth))
        if (Math.abs(paramValue) < 0.001) {
          // Zero fallback: paramValue is (near) zero, so a ratio has nothing
          // to multiply against — fall back to using depth directly as an
          // absolute swing instead (R8#6, undocumented previously). Only
          // reachable for bipolar params whose "centered" value is 0 (e.g.
          // pan) — depth is still clamped to [0,1] for consistency with the
          // documented ratio contract.
          return clampedDepth
        }
        const absoluteDepth = paramValue * clampedDepth
        return this._clampDepthForNonNegativeParam(absoluteDepth, paramValue)
      }
    }
  }

  /**
   * Prevent a ratio/cents-derived modulation swing from driving a
   * non-negative param (gain, frequency — whose value can never legitimately
   * go below 0) negative at the LFO's trough (M4's "phase inversion" class).
   * Bipolar params (pan, detune) are left untouched: their current value can
   * legitimately be negative already, so a swing that goes negative there is
   * normal, not a defect.
   */
  private _clampDepthForNonNegativeParam(absoluteDepth: number, paramValue: number): number {
    if (paramValue >= 0 && absoluteDepth > paramValue) {
      return paramValue
    }
    return absoluteDepth
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
        // Already stopped — expected for disposed nodes
      }
    }
    this._oscillatorNode = null
    this._initNodes()
    this._rewireConnections()
    // No try/catch — let real errors (e.g. closed AudioContext) propagate
    this._oscillatorNode!.start()
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

    // Step directly by samplesPerStep (O(bufferLength) not O(bufferLength * samplesPerStep))
    for (let i = 0; i < bufferLength; i += samplesPerStep) {
      const value = Math.random() * 2 - 1 // -1 to 1
      const end = Math.min(i + samplesPerStep, bufferLength)
      for (let j = i; j < end; j++) {
        data[j] = value
      }
    }

    return buffer
  }

  private _listenForDispose(target: LFOTarget): void {
    // If already listening, skip (idempotent)
    if (this._disposeListeners.has(target)) {
      return
    }

    // Both BaseSound and BaseEffect now emit 'dispose' events
    const handler = (() => this._cleanupTarget(target)) as EventListener
    target.addEventListener('dispose', handler)
    this._disposeListeners.set(target, handler)
  }

  private _updateAllDepthGains(): void {
    const now = this._audioContext?.currentTime ?? 0
    for (const conn of this._connections) {
      const connectionDepth = conn.options.depth ?? this._depth
      const absoluteDepth = this._calculateDepth(conn.audioParam, conn.paramName, connectionDepth, conn.options.depthUnit)
      // Smoothed (M3) — matches rampDepth()'s setTargetAtTime instead of a
      // raw .value write, which pops when the LFO is mid-cycle.
      smoothParamSet(conn.depthGain.gain, absoluteDepth, now)
    }
  }
}
