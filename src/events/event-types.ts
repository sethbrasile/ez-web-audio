/**
 * Event type definitions for audio lifecycle events.
 *
 * These types enable type-safe event handling throughout the library.
 * The source property uses `unknown` to avoid circular imports - consumers
 * should type-narrow using instanceof checks when needed.
 */

/**
 * Detail for 'play' events, fired when audio playback starts.
 */
export interface PlayEventDetail {
  /** The audioContext.currentTime when playback started */
  time: number
  /** The sound instance that emitted this event */
  source: unknown
}

/**
 * Detail for 'stop' events, fired when audio playback is stopped.
 */
export interface StopEventDetail {
  /** The audioContext.currentTime when playback stopped */
  time: number
  /** The sound instance that emitted this event */
  source: unknown
}

/**
 * Detail for 'end' events, fired when audio playback completes naturally.
 */
export interface EndEventDetail {
  /** The audioContext.currentTime when playback ended */
  time: number
  /** The sound instance that emitted this event */
  source: unknown
  /** The duration of the audio that played (in seconds) */
  duration: number
}

/**
 * Detail for 'pause' events, fired when a Track is paused.
 */
export interface PauseEventDetail {
  /** The audioContext.currentTime when pause occurred */
  time: number
  /** The Track instance that emitted this event */
  source: unknown
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
  source: unknown
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
  source: unknown
  /** The new playback position (in seconds) */
  position: number
  /** The previous playback position (in seconds) before the seek */
  previousPosition: number
}

/**
 * Maps event names to their corresponding CustomEvent types.
 * Use this for type-safe event listeners:
 *
 * @example
 * ```typescript
 * sound.addEventListener('play', (e: SoundEventMap['play']) => {
 *   console.log(e.detail.time);
 * });
 * ```
 */
export interface SoundEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  end: CustomEvent<EndEventDetail>
  pause: CustomEvent<PauseEventDetail>
  resume: CustomEvent<ResumeEventDetail>
  seek: CustomEvent<SeekEventDetail>
}

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
  source: unknown
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
  source: unknown
}

/**
 * Maps LayeredSound event names to their corresponding CustomEvent types.
 */
export interface LayeredSoundEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  end: CustomEvent<EndEventDetail>
  warning: CustomEvent<WarningEventDetail>
}
