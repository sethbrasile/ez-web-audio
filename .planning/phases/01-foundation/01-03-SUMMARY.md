---
phase: 01-foundation
plan: 03
subsystem: events
tags: [eventtarget, customevent, typescript, event-system]

# Dependency graph
requires:
  - phase: 01-01
    provides: SoundEventMap types, event detail interfaces
provides:
  - BaseSound extends EventTarget with typed events
  - Typed addEventListener/removeEventListener overloads
  - .on/.once/.off convenience methods for event subscription
  - Event emission at play/stop/end lifecycle moments
affects: [01-04, 02-adsr, 04-layered-sound]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EventTarget extension with typed method overloads
    - Protected emit() helper for typed CustomEvent dispatch
    - Node.js EventEmitter-style convenience methods (.on/.once/.off)

key-files:
  created: []
  modified:
    - src/base-sound.ts

key-decisions:
  - "Used function overloads for addEventListener/removeEventListener to maintain EventTarget compatibility while adding type safety"
  - "Event 'end' only fires on natural completion (checked via _isPlaying flag)"
  - ".off() requires listener reference (native EventTarget limitation documented)"

patterns-established:
  - "Event subscription: sound.on('play', handler).on('stop', handler2) for chaining"
  - "Single-fire events: sound.once('end', cleanupHandler)"
  - "Event emission: this.emit('play', { time, source }) in lifecycle methods"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 1 Plan 3: Event System Summary

**BaseSound extends EventTarget with typed play/stop/end events, .on/.once/.off convenience methods, and lifecycle emission**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-31T22:11:21Z
- **Completed:** 2026-01-31T22:16:03Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- BaseSound now extends EventTarget, inheriting native browser event handling
- Typed addEventListener/removeEventListener overloads provide autocomplete for 'play', 'stop', 'end' events
- .on()/.once()/.off() convenience methods enable Node.js EventEmitter-style ergonomics with chaining
- Events emitted at correct lifecycle moments: 'play' on playAt(), 'stop' on manual stop, 'end' on natural completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend BaseSound from EventTarget** - `091ede4` (feat)
2. **Task 2: Add .on/.once/.off convenience methods** - `4208071` (feat)
3. **Task 3: Emit events at lifecycle moments** - `098b99b` (feat)

## Files Created/Modified
- `src/base-sound.ts` - Extended from EventTarget, added typed event methods, emit() helper, convenience methods, and lifecycle event emission

## Decisions Made
- **Function overloads for type safety**: Used TypeScript function overloads for addEventListener/removeEventListener to maintain compatibility with EventTarget's signature while providing typed event support for SoundEventMap keys
- **'end' event guards**: The 'end' event only fires when `_isPlaying` is true in the onended callback - this prevents double-emit when stop() is called (which sets _isPlaying=false before onended fires)
- **.off() requires reference**: Documented that native EventTarget doesn't support removing all listeners for an event type - users must store listener references

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript overload compatibility: Initial implementation with generic-only signatures failed to satisfy EventTarget's broader signature. Resolved by using explicit overloads (typed version + generic fallback).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Event system foundation complete for BaseSound
- Ready for Plan 04 to add Track-specific pause/resume/seek events
- All subclasses (Sound, Track, Oscillator) inherit event capabilities automatically

---
*Phase: 01-foundation*
*Completed: 2026-01-31*
