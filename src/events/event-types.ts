/**
 * Event type definitions for audio lifecycle events.
 *
 * These types enable type-safe event handling throughout the library.
 * The source property is typed as {@link AudioEventSource} — a union of all
 * classes that emit events. Use instanceof checks to narrow to a specific class.
 */
import type { BaseSound } from '../base-sound'
import type { BeatTrack } from '../beat-track'
import type { GrainPlayer } from '../grain-player'
import type { LayeredSound } from '../layered-sound'
import type { PolySynth } from '../poly-synth'
import type { Sequence } from '../sequence'
import type { Transport, TransportPosition } from '../transport'

/**
 * Union of all classes that emit events in ez-web-audio.
 *
 * Event detail `source` fields are typed as `AudioEventSource` instead of `unknown`.
 * Use instanceof checks to narrow to a specific class:
 *
 * @example
 * ```typescript
 * sound.on('play', (e) => {
 *   if (e.detail.source instanceof Sound) {
 *     console.log('played by a Sound')
 *   }
 * })
 * ```
 */
export type AudioEventSource = BaseSound | BeatTrack | GrainPlayer | LayeredSound | PolySynth | Sequence | Transport

/**
 * Detail for 'play' events, fired when audio playback starts.
 */
export interface PlayEventDetail {
  /** The audioContext.currentTime when playback started */
  time: number
  /** The sound instance that emitted this event */
  source: AudioEventSource
}

/**
 * Detail for 'stop' events, fired when audio playback is stopped.
 */
export interface StopEventDetail {
  /** The audioContext.currentTime when playback stopped */
  time: number
  /** The sound instance that emitted this event */
  source: AudioEventSource
}

/**
 * Detail for 'end' events, fired when audio playback completes naturally.
 */
export interface EndEventDetail {
  /** The audioContext.currentTime when playback ended */
  time: number
  /** The sound instance that emitted this event */
  source: AudioEventSource
  /** The duration of the audio that played (in seconds) */
  duration: number
}

/**
 * Detail for 'dispose' events, fired when a BaseSound is disposed.
 * Emitted BEFORE dispatchEvent is silenced, so listeners can react.
 */
export interface DisposeEventDetail {
  /** The sound instance that is being disposed */
  source: AudioEventSource
}

/**
 * Detail for 'pause' events, fired when a Track is paused.
 */
export interface PauseEventDetail {
  /** The audioContext.currentTime when pause occurred */
  time: number
  /** The Track instance that emitted this event */
  source: AudioEventSource
  /** The playback position (in seconds) where the track was paused */
  position?: number
  /** For BeatTrack: the beat index where paused */
  beatIndex?: number
}

/**
 * Detail for 'resume' events, fired when a Track resumes from pause.
 */
export interface ResumeEventDetail {
  /** The audioContext.currentTime when resume occurred */
  time: number
  /** The Track instance that emitted this event */
  source: AudioEventSource
  /** The playback position (in seconds) where the track resumed */
  position?: number
  /** For BeatTrack: the beat index where resumed */
  beatIndex?: number
}

/**
 * Detail for 'seek' events, fired when a Track's playback position changes.
 */
export interface SeekEventDetail {
  /** The audioContext.currentTime when seek occurred */
  time: number
  /** The Track instance that emitted this event */
  source: AudioEventSource
  /** The new playback position (in seconds) */
  position: number
  /** The previous playback position (in seconds) before the seek */
  previousPosition: number
}

/**
 * Event map for BaseSound and Sound instances.
 * These are the only events emitted by Sound — pause/resume/seek are Track-only.
 *
 * @example
 * ```typescript
 * sound.on('play', (e: BaseSoundEventMap['play']) => {
 *   console.log(e.detail.time);
 * });
 * ```
 */
export interface BaseSoundEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  end: CustomEvent<EndEventDetail>
  dispose: CustomEvent<DisposeEventDetail>
}

/**
 * Event map for Track instances (extends BaseSoundEventMap with pause/resume/seek).
 * Only Track emits pause, resume, and seek events.
 */
export interface TrackEventMap extends BaseSoundEventMap {
  pause: CustomEvent<PauseEventDetail>
  resume: CustomEvent<ResumeEventDetail>
  seek: CustomEvent<SeekEventDetail>
}

/**
 * Full event map including Track-specific events.
 *
 * @deprecated Use {@link BaseSoundEventMap} for Sound instances or {@link TrackEventMap} for Track instances.
 * This type includes pause/resume/seek events that only Track emits — using it on Sound
 * allows registering listeners for events that will never fire.
 *
 * Retained for backward compatibility.
 */
export type SoundEventMap = TrackEventMap

/**
 * Union of all valid event names for sound instances.
 * Use this for type-safe event name parameters:
 *
 * @example
 * ```typescript
 * function on(event: SoundEventType, handler: Function) { ... }
 * ```
 */
export type SoundEventType = keyof SoundEventMap

/**
 * Helper type to extract the detail type from an event name.
 *
 * @example
 * ```typescript
 * type PlayDetail = EventDetailFor<'play'> // PlayEventDetail
 * ```
 */
export type EventDetailFor<T extends SoundEventType> = SoundEventMap[T] extends CustomEvent<infer D> ? D : never

/**
 * Detail for 'beat' events, fired when a beat is scheduled in BeatTrack.
 * Emitted at SCHEDULE time (during lookahead), not at play time.
 * This gives UI components ~100ms advance notice for smooth animations.
 */
export interface BeatEventDetail {
  /** The audioContext.currentTime when this beat is scheduled to play */
  time: number
  /** The index of this beat in the beats array */
  beatIndex: number
  /** Whether this beat is active (plays sound) or a rest */
  active: boolean
  /** The BeatTrack instance that emitted this event */
  source: AudioEventSource
}

/**
 * Maps BeatTrack event names to their corresponding CustomEvent types.
 */
export interface BeatTrackEventMap {
  beat: CustomEvent<BeatEventDetail>
  pause: CustomEvent<PauseEventDetail>
  resume: CustomEvent<ResumeEventDetail>
  stop: CustomEvent<StopEventDetail>
}

/**
 * Detail for 'warning' events, fired when LayeredSound encounters issues.
 */
export interface WarningEventDetail {
  /** Human-readable warning message */
  message: string
  /** Array of layers that failed to load */
  failedLayers: { index: number, error: Error }[]
  /** The LayeredSound instance that emitted this event */
  source: AudioEventSource
}

/**
 * Maps LayeredSound event names to their corresponding CustomEvent types.
 */
export interface LayeredSoundEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  end: CustomEvent<EndEventDetail>
  warning: CustomEvent<WarningEventDetail>
  dispose: CustomEvent<DisposeEventDetail>
}

// ─── Transport Events ────────────────────────────────────────────────

/**
 * Detail for Transport 'tick' events, fired on every beat subdivision.
 * Contains the current position in musical time.
 */
export interface TransportTickDetail {
  /** Current bar number (1-indexed) */
  bar: number
  /** Current beat within bar (1-indexed) */
  beat: number
  /** Current tick within beat (0-indexed) */
  tick: number
  /** Elapsed time in seconds since transport started */
  seconds: number
  /** The Transport instance that emitted this event */
  source: AudioEventSource
}

/**
 * Detail for Transport lifecycle events (start, stop, pause, resume).
 */
export interface TransportLifecycleDetail {
  /** The audioContext.currentTime when the event occurred */
  time: number
  /** The Transport instance that emitted this event */
  source: AudioEventSource
}

/**
 * Maps Transport event names to their corresponding CustomEvent types.
 */
export interface TransportEventMap {
  start: CustomEvent<TransportLifecycleDetail>
  stop: CustomEvent<TransportLifecycleDetail>
  pause: CustomEvent<TransportLifecycleDetail>
  resume: CustomEvent<TransportLifecycleDetail>
  tick: CustomEvent<TransportTickDetail>
}

// ─── Sequence Events ──────────────────────────────────────────────────

/**
 * Detail for Sequence 'event' events, fired when a scheduled callback fires.
 */
export interface SequenceEventDetail {
  /** AudioContext time when the event fires */
  time: number
  /** Musical time position of the event */
  position: TransportPosition
  /** The event ID returned by sequence.at() */
  eventId: string
  /** The Sequence instance that emitted this event */
  source: AudioEventSource
}

/**
 * Detail for Sequence 'loop' events, fired when the sequence wraps around.
 */
export interface SequenceLoopDetail {
  /** Loop iteration count (1-indexed) */
  iteration: number
  /** The Sequence instance that emitted this event */
  source: AudioEventSource
}

/**
 * Maps Sequence event names to their corresponding CustomEvent types.
 */
export interface SequenceEventMap {
  event: CustomEvent<SequenceEventDetail>
  loop: CustomEvent<SequenceLoopDetail>
}

// ─── PolySynth Events ────────────────────────────────────────────────

/**
 * Detail for 'voicestolen' events, fired when a PolySynth voice is stolen
 * to accommodate a new note request when the voice pool is full.
 */
export interface VoiceStolenEventDetail {
  /** Frequency of the voice that was stolen */
  stolenFrequency: number
  /** Frequency of the new note that replaced it */
  newFrequency: number
  /** The audioContext.currentTime when the steal occurred */
  time: number
  /** The PolySynth instance that emitted this event */
  source: AudioEventSource
}

/**
 * Maps PolySynth event names to their corresponding CustomEvent types.
 */
export interface PolySynthEventMap {
  voicestolen: CustomEvent<VoiceStolenEventDetail>
}

// ─── GrainPlayer Events ──────────────────────────────────────────────

/**
 * Maps GrainPlayer event names to their corresponding CustomEvent types.
 * GrainPlayer emits standard lifecycle events for play/stop/pause/resume.
 */
export interface GrainPlayerEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  pause: CustomEvent<PauseEventDetail>
  resume: CustomEvent<ResumeEventDetail>
}
