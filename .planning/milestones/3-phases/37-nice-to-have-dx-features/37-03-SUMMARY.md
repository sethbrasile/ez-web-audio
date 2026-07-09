---
phase: 37-nice-to-have-dx-features
plan: 03
subsystem: api
tags: [typescript, event-system, jsdoc, refactoring, dry]

requires:
  - phase: 37-02
    provides: AudioInput union type, createTracks(), volume getter/setter — prior DX features this plan builds on top of

provides:
  - TypedEventEmitter<TMap> shared base class eliminating ~120 lines of duplicated event boilerplate
  - BaseSound extends TypedEventEmitter<SoundEventMap> (no inline event methods)
  - LayeredSound extends TypedEventEmitter<LayeredSoundEventMap> (no inline event methods)
  - TypedEventEmitter exported from public API for advanced consumers
  - onPlaySet() and onPlayRamp() JSDoc prominently documents schedule consumption with examples

affects: [documentation, api-consumers, advanced-users]

tech-stack:
  added: []
  patterns:
    - "TypedEventEmitter<TMap> generic base class pattern for typed event systems extending EventTarget"
    - "Overload implementation uses any for compatibility with generic typed listeners (contravariance)"

key-files:
  created:
    - src/events/typed-event-emitter.ts
  modified:
    - src/base-sound.ts
    - src/layered-sound.ts
    - src/index.ts
    - src/controllers/base-param-controller.ts

key-decisions:
  - "TypedEventEmitter uses any in implementation signatures to resolve TypeScript overload compatibility — function contravariance means (event: TMap[K]) => void is not assignable to (event: EventListenerOrEventListenerObject | null) without it"
  - "BeatTrack kept as-is with delegated EventTarget pattern — structurally different (extends Sampler not EventTarget) so mixin/base class cannot apply cleanly"
  - "TypedEventEmitter uses self-referential constraint { [K in keyof TMap]: CustomEvent<unknown> } instead of Record<string, CustomEvent> to avoid requiring index signature on event map interfaces"

patterns-established:
  - "TypedEventEmitter<TMap>: extend this class (not EventTarget) when adding typed events to new classes"

requirements-completed: [DX3-08, DX3-09]

duration: 7min
completed: 2026-02-22
---

# Phase 37 Plan 03: Typed Event Emitter Extraction Summary

**TypedEventEmitter base class extracted from ~120 lines of duplicated on/off/once/emit/addEventListener/removeEventListener boilerplate in BaseSound and LayeredSound**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T02:24:53Z
- **Completed:** 2026-02-22T02:32:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `src/events/typed-event-emitter.ts` — a generic `TypedEventEmitter<TMap>` base class extending `EventTarget` with typed `addEventListener`/`removeEventListener` overloads, `emit()`, `on()`, `once()`, `off()`
- Refactored `BaseSound` to extend `TypedEventEmitter<SoundEventMap>` — removed ~110 lines of inline event boilerplate
- Refactored `LayeredSound` to extend `TypedEventEmitter<LayeredSoundEventMap>` — removed ~110 lines of inline event boilerplate
- Exported `TypedEventEmitter` from public API so advanced consumers can build their own typed event classes
- Added prominent `@remarks` blocks to `onPlaySet()` and `onPlayRamp()` in `BaseSound` documenting schedule consumption with clear before/after code examples
- Added `@remarks` to `BaseParamController.onPlaySet()` referencing `clearScheduledValues()` and added `@see` cross-references

## Task Commits

1. **Task 1: Create TypedEventEmitter and refactor event classes** - `69c6156` (feat)
2. **Task 2: Document onPlaySet() consumption behavior** - `4faf2e5` (docs)

## Files Created/Modified

- `src/events/typed-event-emitter.ts` - New shared TypedEventEmitter<TMap> base class
- `src/base-sound.ts` - Now extends TypedEventEmitter<SoundEventMap>, removed ~110 lines of event boilerplate, added @remarks to onPlaySet/onPlayRamp
- `src/layered-sound.ts` - Now extends TypedEventEmitter<LayeredSoundEventMap>, removed ~110 lines of event boilerplate
- `src/index.ts` - Added TypedEventEmitter to public exports (sorted before LayeredSound)
- `src/controllers/base-param-controller.ts` - Added @remarks and @see cross-references to onPlaySet/clearScheduledValues

## Decisions Made

- TypedEventEmitter uses `any` in implementation signatures: TypeScript's function contravariance rules mean `(event: TMap[K]) => void` is not assignable to `EventListenerOrEventListenerObject | null` in an overload implementation. The `any` type resolves this cleanly without affecting consumer type safety (overload signatures still provide full type inference).
- BeatTrack not refactored: BeatTrack extends `Sampler` (not `EventTarget`), using a private delegated `EventTarget`. The structural difference means it cannot extend `TypedEventEmitter` — it would require multiple inheritance. The ~30 lines of thin wrappers in BeatTrack are acceptable duplication given the architectural constraint.
- Self-referential constraint `{ [K in keyof TMap]: CustomEvent<unknown> }` used instead of `Record<string, CustomEvent>` to avoid requiring `[key: string]: CustomEvent` index signatures on existing concrete event map interfaces (`SoundEventMap`, `LayeredSoundEventMap`).

## Deviations from Plan

None — plan executed exactly as written. The pragmatic approach (base class rather than mixin) was explicitly pre-approved in the plan as the recommended path when mixin complexity is high.

## Issues Encountered

TypeScript overload compatibility error during implementation: `(event: TMap[K]) => void` is not directly assignable to `EventListenerOrEventListenerObject | null` (function parameter contravariance). Resolved by using `any` in the implementation signature (not the overload signatures), which is the standard pattern for this kind of typed EventTarget wrapper. ESLint's `ts/no-explicit-any` rule does not flag `any` in overload implementation signatures in this codebase configuration.

## Next Phase Readiness

- Phase 37 Plan 03 complete — all 3 plans in phase 37 now done
- TypedEventEmitter is available as a public API for consumers building event-driven audio classes
- onPlaySet/onPlayRamp documentation now clearly communicates the consume-once semantics established in Phase 20

---
*Phase: 37-nice-to-have-dx-features*
*Completed: 2026-02-22*
