import type { SequenceEventMap } from './events/event-types'
import type { Transport, TransportPosition } from './transport'
import type { MusicalTimeNotation } from './utils/musical-time'
import { ValidationError } from './errors'
import { TypedEventEmitter } from './events/typed-event-emitter'
import { musicalTimeToBeats } from './utils/musical-time'

/**
 * Callback function invoked when a scheduled event fires.
 *
 * @param time - Precise AudioContext time for scheduling audio operations
 * @param position - Transport position at the moment the event fires
 */
export type SequenceCallback = (time: number, position: TransportPosition) => void

/**
 * Configuration options for creating a Sequence.
 */
export interface SequenceOptions {
  /** Length of the sequence in musical time notation or beats. Required. */
  length: MusicalTimeNotation
  /** Whether the sequence loops. Default: true */
  loop?: boolean
  /** Initial events to schedule */
  events?: Array<{
    time: MusicalTimeNotation
    callback: SequenceCallback
  }>
}

/**
 * Internal representation of a scheduled event.
 * @internal
 */
interface ScheduledEvent {
  id: string
  beats: number
  callback: SequenceCallback
}

/**
 * Sequence schedules arbitrary callbacks at musical time positions tied to a Transport.
 *
 * Events are stored as beat positions (not seconds) so that live BPM changes
 * automatically affect subsequent event scheduling without re-scheduling.
 * Sequences follow the Transport lifecycle: they play when the Transport plays,
 * pause when it pauses, and reset when it stops.
 *
 * @example
 * ```typescript
 * import { createTransport, createSequence, createSound } from 'ez-web-audio'
 *
 * const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })
 * const kick = await createSound('kick.mp3')
 *
 * const seq = createSequence(transport, { length: '4m' })
 *
 * // Schedule kick on beat 1 of each bar
 * seq.at('1:1:0', (time) => kick.playIn(time - ctx.currentTime))
 * seq.at('2:1:0', (time) => kick.playIn(time - ctx.currentTime))
 * seq.at('3:1:0', (time) => kick.playIn(time - ctx.currentTime))
 * seq.at('4:1:0', (time) => kick.playIn(time - ctx.currentTime))
 *
 * transport.start() // Events fire at correct musical positions
 *
 * // Change BPM — events automatically adjust timing
 * transport.bpm = 140
 * ```
 */
export class Sequence extends TypedEventEmitter<SequenceEventMap> {
  private transport: Transport
  private lengthInBeats: number
  private _loop: boolean
  private events: ScheduledEvent[] = []
  private nextEventId = 0

  // Scheduling state
  private transportStartTime = 0
  private lastScheduledBeat = -1
  /**
   * Highest event beat pre-scheduled into the *next* loop iteration while
   * the lookahead window straddles the loop boundary (see
   * `_scheduleEventsInWindow`'s wrap branch). Folded into `lastScheduledBeat`
   * when the real iteration boundary is crossed so those events don't refire.
   */
  private nextIterationScheduledBeat = -1
  private loopIteration = 0
  private _disposed = false
  private _started = false
  /**
   * Whether this sequence has ever received `_onTransportStart`. Distinct
   * from `_started` (which also goes false across every pause) — used to
   * detect a sequence constructed while the Transport was already paused,
   * so its first resume is treated as a fresh start rather than applying a
   * `pausedElapsed` that predates the sequence's own existence.
   */
  private _hasStartedOnce = false

  constructor(transport: Transport, options: SequenceOptions) {
    super()
    if (!options.length && options.length !== 0) {
      throw new ValidationError('Sequence requires a length option')
    }

    this.transport = transport
    this.lengthInBeats = musicalTimeToBeats(
      options.length,
      transport.timeSignature[0],
      transport.ticksPerBeat,
    )

    if (this.lengthInBeats <= 0) {
      throw new ValidationError(`Sequence length must be greater than 0. Received: ${this.lengthInBeats} beats`)
    }

    this._loop = options.loop ?? true

    // Schedule initial events
    if (options.events) {
      for (const event of options.events) {
        this.at(event.time, event.callback)
      }
    }

    // Register with Transport
    transport._addSequence(this)
  }

  /** Whether this sequence loops. */
  get loop(): boolean {
    return this._loop
  }

  /** Length of the sequence in beats. */
  get length(): number {
    return this.lengthInBeats
  }

  /**
   * Schedule a callback at a musical time position.
   *
   * @param time - Musical time notation (e.g., '4n', '2:1:0') or beats
   * @param callback - Function to call when the event fires
   * @returns Event ID for later removal via .remove()
   *
   * @example
   * ```typescript
   * const id = seq.at('4n', (time, pos) => {
   *   console.log(`Event at bar ${pos.bar}, beat ${pos.beat}`)
   * })
   * ```
   */
  at(time: MusicalTimeNotation, callback: SequenceCallback): string {
    const beats = musicalTimeToBeats(
      time,
      this.transport.timeSignature[0],
      this.transport.ticksPerBeat,
    )

    if (beats >= this.lengthInBeats) {
      throw new ValidationError(
        `Event at ${beats} beats exceeds sequence length of ${this.lengthInBeats} beats`,
      )
    }

    if (beats < 0) {
      throw new ValidationError(`Event position must be >= 0. Received: ${beats}`)
    }

    const id = `seq-${this.nextEventId++}`
    this.events.push({ id, beats, callback })

    // Keep events sorted by beat position for efficient scheduling
    this.events.sort((a, b) => a.beats - b.beats)

    return id
  }

  /**
   * Remove a previously scheduled event by its ID.
   *
   * @param id - Event ID returned by .at()
   * @returns true if the event was found and removed
   */
  remove(id: string): boolean {
    const index = this.events.findIndex(e => e.id === id)
    if (index === -1)
      return false
    this.events.splice(index, 1)
    return true
  }

  /**
   * Remove all scheduled events.
   */
  clear(): void {
    this.events = []
  }

  // ─── Transport Integration (package-internal) ──────────────────────

  /**
   * Schedule events that fall within the Transport's lookahead window.
   *
   * Called by Transport.schedulerTick() on each timer tick. Converts event
   * beat positions to absolute AudioContext times using the current BPM,
   * enabling live BPM changes without re-scheduling. Applies the Transport's
   * swing offset (see {@link Transport.swing}) to events landing exactly on
   * an odd swing subdivision; off-grid events are unaffected.
   *
   * @param currentTime - Current AudioContext time
   * @param lookahead - Lookahead window in seconds
   * @param bpm - Current BPM from Transport
   * @param timeSignature - Current time signature from Transport
   * @param ticksPerBeat - Ticks per beat from Transport
   * @internal
   */
  _scheduleEventsInWindow(
    currentTime: number,
    lookahead: number,
    bpm: number,
    timeSignature: [number, number],
    ticksPerBeat: number,
  ): void {
    if (this._disposed || !this._started)
      return

    const beatsPerSecond = bpm / 60
    const beatsPerBar = timeSignature[0]

    // Calculate how many beats have elapsed since transport started
    const elapsedSeconds = currentTime - this.transportStartTime
    const elapsedBeats = elapsedSeconds * beatsPerSecond

    // Calculate the lookahead window in beats
    const lookaheadBeats = lookahead * beatsPerSecond

    // Current position within the sequence (with looping)
    let currentSeqBeat: number
    if (this._loop) {
      currentSeqBeat = elapsedBeats % this.lengthInBeats
    }
    else {
      currentSeqBeat = elapsedBeats
      // One-shot: if we've passed the entire sequence, stop
      if (currentSeqBeat >= this.lengthInBeats)
        return
    }

    const windowEndBeat = currentSeqBeat + lookaheadBeats

    // Check for loop wrap — detect when we've entered a new loop iteration
    if (this._loop) {
      const currentIteration = Math.floor(elapsedBeats / this.lengthInBeats)
      if (currentIteration > this.loopIteration) {
        this.loopIteration = currentIteration
        this.emit('loop', { iteration: this.loopIteration, source: this })
        // Reset lastScheduledBeat so events fire again in new loop — but
        // carry forward anything the wrap branch below already
        // pre-scheduled into this iteration (while the window straddled
        // the boundary on an earlier tick), so those events don't refire.
        this.lastScheduledBeat = this.nextIterationScheduledBeat
        this.nextIterationScheduledBeat = -1
      }
    }

    // No events to schedule
    if (this.events.length === 0)
      return

    // Schedule events in window — track highest beat to update lastScheduledBeat
    // once after the loop (QC-1-08: fixes same-beat events being dropped)
    let highestScheduledBeat = this.lastScheduledBeat

    for (const event of this.events) {
      const eventBeat = event.beats

      // Handle events in the current window
      if (eventBeat > this.lastScheduledBeat && eventBeat < windowEndBeat) {
        // Calculate the exact AudioContext time for this event
        const beatOffset = eventBeat - currentSeqBeat
        const timeOffset = beatOffset / beatsPerSecond
        const eventTime = currentTime + timeOffset + this.transport._swingDelayFor(eventBeat)

        // Build position (QC-1-10 fix: use loopIteration directly, not loopIteration - 1)
        const totalBeats = this.loopIteration * this.lengthInBeats + eventBeat
        const bar = Math.floor(totalBeats / beatsPerBar) + 1
        const beatInBar = Math.floor(totalBeats % beatsPerBar) + 1
        // % ticksPerBeat guards against Math.round pushing totalBeats % 1
        // (e.g. 0.9999...) up to exactly ticksPerBeat, which would put
        // `tick` one past its documented 0..ticksPerBeat-1 range (R5 #7).
        const tickInBeat = Math.round((totalBeats % 1) * ticksPerBeat) % ticksPerBeat

        const position: TransportPosition = {
          bar,
          beat: beatInBar,
          tick: tickInBeat,
          seconds: eventTime - this.transportStartTime,
        }

        event.callback(eventTime, position)

        this.emit('event', {
          time: eventTime,
          position,
          eventId: event.id,
          source: this,
        })

        if (eventBeat > highestScheduledBeat) {
          highestScheduledBeat = eventBeat
        }
      }

      // Handle events near the start of the sequence whose full lookahead
      // margin falls within THIS tick's window even though the real loop
      // boundary hasn't been crossed yet (H2). Without this, such events
      // are only picked up on the tick after the actual wrap, by which
      // point little to no lookahead remains (near-immediate/late
      // scheduling under jank). Time is computed relative to the wrap
      // point (currentSeqBeat -> lengthInBeats -> eventBeat) rather than
      // the current-iteration offset used by the main branch above.
      // `else if`: mutually exclusive with the main branch above so a wide
      // lookahead (window spanning more than one loop length) can't fire
      // the same event twice in a single tick.
      else if (this._loop && windowEndBeat >= this.lengthInBeats) {
        const wrappedWindowEnd = windowEndBeat - this.lengthInBeats
        if (eventBeat < wrappedWindowEnd && eventBeat > this.nextIterationScheduledBeat) {
          const beatOffset = eventBeat + this.lengthInBeats - currentSeqBeat
          const timeOffset = beatOffset / beatsPerSecond
          const eventTime = currentTime + timeOffset + this.transport._swingDelayFor(eventBeat)

          const nextIterationTotalBeats = (this.loopIteration + 1) * this.lengthInBeats + eventBeat
          const bar = Math.floor(nextIterationTotalBeats / beatsPerBar) + 1
          const beatInBar = Math.floor(nextIterationTotalBeats % beatsPerBar) + 1
          const tickInBeat = Math.round((nextIterationTotalBeats % 1) * ticksPerBeat) % ticksPerBeat

          const position: TransportPosition = {
            bar,
            beat: beatInBar,
            tick: tickInBeat,
            seconds: eventTime - this.transportStartTime,
          }

          event.callback(eventTime, position)

          this.emit('event', {
            time: eventTime,
            position,
            eventId: event.id,
            source: this,
          })

          if (eventBeat > this.nextIterationScheduledBeat) {
            this.nextIterationScheduledBeat = eventBeat
          }
        }
      }
    }

    this.lastScheduledBeat = highestScheduledBeat
  }

  /**
   * Called by Transport when it starts playing.
   * Records the start time for position calculations.
   * @internal
   */
  _onTransportStart(startTime: number): void {
    this.transportStartTime = startTime
    this.lastScheduledBeat = -1
    this.nextIterationScheduledBeat = -1
    this.loopIteration = 0
    this._started = true
    this._hasStartedOnce = true
  }

  /**
   * Called by Transport when it resumes from pause.
   * Adjusts start time to account for paused duration.
   *
   * If this Sequence was constructed while the Transport was already
   * paused, it never received `_onTransportStart` — `pausedElapsed` in
   * that case describes time the *Transport* was playing before a pause
   * that predates this Sequence's own existence. Applying it here would
   * push `transportStartTime` into the past and make the Sequence appear
   * mid-loop the instant it starts (R5 #8). Treat that case as a fresh
   * start anchored to the actual resume time instead.
   * @internal
   */
  _onTransportResume(resumeTime: number, pausedElapsed: number): void {
    if (!this._hasStartedOnce) {
      this._onTransportStart(resumeTime)
      return
    }
    // Recalculate startTime so elapsed time picks up where it left off
    this.transportStartTime = resumeTime - pausedElapsed
    this._started = true
  }

  /**
   * Called by Transport.stop() to reset sequence to the beginning.
   * @internal
   */
  _reset(): void {
    this.lastScheduledBeat = -1
    this.nextIterationScheduledBeat = -1
    this.loopIteration = 0
    this._started = false
    this._hasStartedOnce = false
  }

  /**
   * Called by Transport.pause() to preserve sequence position.
   * @internal
   */
  _onTransportPause(_currentTime: number): void {
    this._started = false
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  /**
   * Dispose the Sequence, unregistering from Transport and releasing resources.
   * After disposal, the Sequence should not be used.
   */
  dispose(): void {
    if (this._disposed)
      return
    this._disposed = true
    this._started = false

    this.transport._removeSequence(this)
    this.events = []

    // Release every registered listener now that the Sequence is unusable
    this._clearListeners()
  }
}
