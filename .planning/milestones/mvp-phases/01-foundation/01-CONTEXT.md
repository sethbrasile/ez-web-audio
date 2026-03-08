# Phase 1: Foundation - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Stable event system for audio lifecycle tracking (play/stop/end/pause/resume/seek), critical bug fixes for inheritance and memory leaks, and actionable error messages. This phase establishes the foundation that all advanced features (ADSR, LayeredSound, effects) will build upon.

</domain>

<decisions>
## Implementation Decisions

### Event Payload Design
- Claude's discretion on timing info (audioContext.currentTime) inclusion
- Claude's discretion on source reference approach (native event.target vs custom)
- Claude's discretion on position data format for Track events
- Claude's discretion on TypeScript type strategy (per-event interfaces vs discriminated union)

### Error Message Style
- Minimal and technical tone: "AudioLoadError: INVALID_URL"
- Include fix suggestions for common gotchas: "AudioContext suspended. Call initAudio() after user interaction."
- No documentation links in error messages — keep self-contained
- Claude's discretion on whether to use custom Error subclasses or standard Error with codes

### Event Naming Conventions
- Simple lowercase event names: "play", "stop", "end", "pause", "resume", "seek"
- Both native addEventListener AND shorthand .on() method supported
- .on() supports array of event types: sound.on(['play', 'stop'], handler)
- Add .once() method for single-fire subscriptions

### Unsubscribe Patterns
- .on() returns the sound instance (chainable): sound.on('play', fn).on('stop', fn2)
- .off() works both ways:
  - With handler: sound.off('play', fn) removes specific handler
  - Without handler: sound.off('play') removes ALL play handlers
- Add removeAllListeners() method to clear all subscriptions
- Auto-cleanup listeners when sound is disposed/destroyed

### Claude's Discretion
- Event payload contents (timing, source refs, position format)
- TypeScript type strategy for events
- Error class implementation (subclasses vs codes)

</decisions>

<specifics>
## Specific Ideas

- Error messages should be minimal and technical, but still include actionable fix suggestions for Web Audio gotchas (like suspended AudioContext)
- Event API should feel familiar to Node.js EventEmitter users (.on, .once, .off pattern) while also working with native addEventListener
- Chainable .on() enables fluent setup: sound.on('play', onPlay).on('end', onEnd)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-31*
