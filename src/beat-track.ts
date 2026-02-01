import { Beat } from './beat'
import type { Connectable } from './interfaces/connectable'
import type { Playable } from './interfaces/playable'
import type { SamplerOptions } from './sampler'
import { Sampler } from './sampler'
import type { BeatTrackEventMap } from './events/event-types'

const beatBank = new WeakMap()

export interface BeatTrackOptions extends SamplerOptions {
  numBeats?: number
  duration?: number
  /**
   * @method wrapWith
   * wrapWith allows you to run a function on each beat as it is created
   * This function must accept a beat and return a beat. An example use-case
   * appears in the docs site in the "Multisampled Drum Machine" example where
   * this method is used to wrap each beat in an nx-js observable proxy.
   *
   * @param beat
   * @returns
   */
  wrapWith?: (beat: Beat) => Beat
}

/**
 * An instance of this class has an array of "sounds" (comprised of one or multiple
 * audio sources, if multiple are provided, they are played in a round-robin fashion)
 * and provides methods to play that sound repeatedly, mixed with "rests," in a
 * rhythmic way. An instance of this class behaves very similarly to a "lane" on a drum machine.
 *
 * @class BeatTrack
 * @extends Sampler
 */
export class BeatTrack extends Sampler {
  // EventTarget for event emission
  private eventTarget: EventTarget = new EventTarget()

  // Lookahead scheduler state
  private scheduleAheadTime = 0.1  // 100ms lookahead
  private schedulerInterval = 25   // 25ms check interval
  private nextBeatTime = 0
  private currentBeatIndex = 0
  private timerID: number | null = null
  private currentTempo: number = 120
  private noteType: number = 1/4

  // Pause state
  private pausedBeatIndex: number | null = null
  private pausedBeatTime: number | null = null

  constructor(private audioContext: AudioContext, sounds: (Playable & Connectable)[], opts?: BeatTrackOptions) {
    super(sounds, opts)
    if (opts?.numBeats) {
      this.numBeats = opts.numBeats
    }
    if (opts?.duration) {
      this.duration = opts.duration
    }
    if (opts?.wrapWith) {
      this.wrapWith = opts.wrapWith
    }
  }

  /**
   * @property wrapWith
   * see BeatTrackOptions wrapWith for more info
   */
  private wrapWith?: (beat: Beat) => Beat

  /**
   * @property numBeats
   *
   * Determines the number of beats in a BeatTrack instance.
   */
  public numBeats = 4

  /**
   * @property duration
   *
   * If specified, Determines length of time, in milliseconds, before isPlaying
   * and currentTimeIsPlaying are automatically switched back to false after
   * having been switched to true for each beat. 100ms is used by default.
   *
   * @default 100
   */
  public duration = 100

  /**
   * @property beats
   *
   * Computed property. An array of Beat instances. The number of Beat instances
   * in the array is always the same as the `numBeats` property. If 'numBeats'
   * or duration changes. This property will be recomputed, but any beats that
   * previously existed are reused so that they will maintain their `active`
   * state.
   */
  public get beats(): Beat[] {
    let beats = []
    let numBeats = this.numBeats
    let existingBeats

    if (beatBank.has(this)) {
      existingBeats = beatBank.get(this)
      numBeats = numBeats - existingBeats.length
    }

    for (let i = 0; i < numBeats; i++) {
      const beat = new Beat(this.audioContext, {
        duration: this.duration,
        playIn: this.playIn.bind(this),
        play: this.play.bind(this),
      })

      if (this.wrapWith) {
        beats.push(this.wrapWith(beat))
      }
      else {
        beats.push(beat)
      }
    }

    if (existingBeats) {
      beats = existingBeats.concat(beats)
    }

    beatBank.set(this, beats)

    return beats
  }

  /**
   * @method playBeats
   *
   * Calls play on all Beat instances in the beats array.
   *
   * @param {number} bpm The tempo at which the beats should be played.
   * @param noteType {number} The (rhythmic) length of each beat. Fractions
   * are suggested here so that it's easy to reason about. For example, for
   * eighth notes, pass in `1/8`.
   */
  public playBeats(bpm: number, noteType: number): void {
    this.currentTempo = bpm
    this.noteType = noteType
    this.nextBeatTime = this.audioContext.currentTime
    this.currentBeatIndex = 0
    this.scheduler()
  }

  /**
   * @method playActiveBeats
   *
   * Calls play on `active` Beat instances in the beats array. Any beat that
   * is not marked active is effectively a "rest".
   *
   * @param {number} bpm The tempo at which the beats and rests should be played.
   * @param noteType {number} The (rhythmic) length of each beat/rest. Fractions
   * are suggested here so that it's easy to reason about. For example, for
   * eighth notes, pass in `1/8`.
   */
  public playActiveBeats(bpm: number, noteType: number): void {
    this.currentTempo = bpm
    this.noteType = noteType
    this.nextBeatTime = this.audioContext.currentTime
    this.currentBeatIndex = 0
    this.scheduler()
  }

  /**
   * @method stop
   * Stops the beat scheduler immediately and resets position to beginning.
   * Emits 'stop' event.
   */
  public stop(): void {
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.currentBeatIndex = 0
    this.nextBeatTime = 0
    this.pausedBeatIndex = null
    this.pausedBeatTime = null

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this
    })
  }

  /**
   * @method pause
   * Pauses beat playback and preserves current position.
   * Emits 'pause' event with current beat index.
   */
  public pause(): void {
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.pausedBeatIndex = this.currentBeatIndex
    this.pausedBeatTime = this.nextBeatTime

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
      beatIndex: this.currentBeatIndex
    })
  }

  /**
   * @method resume
   * Resumes beat playback from paused position.
   * Emits 'resume' event with beat index.
   */
  public resume(): void {
    if (this.pausedBeatIndex !== null) {
      this.currentBeatIndex = this.pausedBeatIndex
      this.nextBeatTime = this.pausedBeatTime ?? this.audioContext.currentTime

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        beatIndex: this.currentBeatIndex
      })

      this.scheduler()

      this.pausedBeatIndex = null
      this.pausedBeatTime = null
    }
  }

  /**
   * @method setTempo
   * Changes the tempo. Takes effect on next scheduled beat.
   *
   * @param {number} bpm New tempo in beats per minute
   */
  public setTempo(bpm: number): void {
    this.currentTempo = bpm
  }

  /**
   * @method scheduler
   * Lookahead scheduler that schedules beats 100ms ahead.
   * @private
   */
  private scheduler(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule all beats within lookahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeatIndex, this.nextBeatTime)
      this.advanceToNextBeat()
    }

    this.timerID = window.setTimeout(
      () => this.scheduler(),
      this.schedulerInterval
    )
  }

  /**
   * @method scheduleBeat
   * Schedules a single beat and emits beat event.
   * @private
   */
  private scheduleBeat(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex]

    if (beat.active) {
      // Schedule sound playback at exact time
      beat.playIn(time - this.audioContext.currentTime)
    }

    // Emit beat event at SCHEDULE time (lookahead), not play time
    // This gives UI ~100ms advance notice for smooth animations
    this.emit('beat', {
      time,
      beatIndex,
      active: beat.active,
      source: this
    })
  }

  /**
   * @method advanceToNextBeat
   * Advances to next beat using current tempo.
   * @private
   */
  private advanceToNextBeat(): void {
    // Calculate beat duration from CURRENT tempo
    // http://bradthemad.org/guitar/tempo_explanation.php
    const beatDuration = (240 * this.noteType) / this.currentTempo
    this.nextBeatTime += beatDuration
    this.currentBeatIndex = (this.currentBeatIndex + 1) % this.beats.length
  }

  /**
   * @method callPlayMethodOnBeats
   *
   * The underlying method behind playBeats and playActiveBeats.
   *
   * @param {string} method The method that should be called on each beat.
   * @param {number} bpm The tempo that should be used to calculate the length
   * of a beat/rest.
   * @param noteType {number} The (rhythmic) length of each beat/rest that should
   * be used to calculate the length of a beat/rest in seconds.
   */
  protected callPlayMethodOnBeats(method: 'ifActivePlayIn' | 'playIn', bpm: number, noteType: number = 1 / 4): void {
    // http://bradthemad.org/guitar/tempo_explanation.php
    const duration = (240 * noteType) / bpm
    this.beats.forEach((beat, idx) => beat[method](idx * duration))
  }

  /**
   * Type-safe event emission for BeatTrack events.
   * @protected
   */
  protected emit<K extends keyof BeatTrackEventMap>(
    type: K,
    detail: BeatTrackEventMap[K]['detail']
  ): void {
    const event = new CustomEvent(type, { detail })
    this.eventTarget.dispatchEvent(event)
  }

  /**
   * Type-safe addEventListener for BeatTrack events.
   */
  addEventListener<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options)
  }

  /**
   * Type-safe removeEventListener for BeatTrack events.
   */
  removeEventListener<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.eventTarget.removeEventListener(type, listener as EventListener, options)
  }

  /**
   * Convenience method for adding event listeners.
   */
  on<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener)
    return this
  }

  /**
   * Convenience method for removing event listeners.
   */
  off<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void
  ): this {
    this.removeEventListener(type, listener)
    return this
  }

  /**
   * Convenience method for adding one-time event listeners.
   */
  once<K extends keyof BeatTrackEventMap>(
    type: K,
    listener: (event: BeatTrackEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }
}
