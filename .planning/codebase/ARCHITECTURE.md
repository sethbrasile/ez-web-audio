# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Abstract Base Class with Mixin Pattern for Cross-Cutting Concerns

**Key Characteristics:**
- Class hierarchy centered on `BaseSound` abstract class providing core audio playback functionality
- Mixin pattern (`MusicallyAware`) for adding musical identity to classes
- Controller pattern for managing audio parameters and scheduled value changes
- Fluent API for chainable parameter control
- Web Audio API abstraction layer hiding native complexity

## Layers

**Public API / Factory Layer:**
- Purpose: Entry points for creating audio objects and initializing the audio system
- Location: `src/index.ts`
- Contains: Factory functions (`createSound`, `createTrack`, `createOscillator`, `createBeatTrack`, `createSampler`, `createFont`, `createWhiteNoise`), audio context initialization, helper utilities
- Depends on: All core classes, controllers, utilities
- Used by: Applications consuming the library

**Core Sound Hierarchy:**
- Purpose: Define base behavior and structure for all playable audio objects
- Location: `src/base-sound.ts`, `src/sound.ts`, `src/track.ts`, `src/oscillator.ts`
- Contains: Abstract base class with common playback methods, specific implementations for different audio sources
- Depends on: Controllers, interfaces, utilities
- Used by: Sampler, BeatTrack, and consumer applications

**Rhythmic/Pattern Layer:**
- Purpose: Enable drum machine-like functionality and round-robin sample playback
- Location: `src/beat.ts`, `src/beat-track.ts`, `src/sampler.ts`
- Contains: Beat class for drum positions, BeatTrack for pattern-based playback, Sampler for round-robin audio
- Depends on: Core sound classes, timeout utilities
- Used by: Applications building drum machines or samplers

**Musical Identity Layer:**
- Purpose: Add awareness of musical notes, frequency, and pitch to audio objects
- Location: `src/musical-identity.ts`, `src/note.ts`, `src/sampled-note.ts`, `src/font.ts`
- Contains: MusicallyAware mixin, Note class, SampledNote class, Font collection
- Depends on: Frequency map utilities, Base classes
- Used by: Sound font loading, instrument collections

**Controllers / Parameter Management:**
- Purpose: Manage audio parameter values (gain, pan, frequency, detune) and schedule their changes
- Location: `src/controllers/base-param-controller.ts`, `src/controllers/sound-controller.ts`, `src/controllers/oscillator-controller.ts`
- Contains: Base parameter controller with fluent parameter update API, concrete implementations for different source types
- Depends on: Web Audio nodes
- Used by: BaseSound and subclasses

**Interfaces / Contracts:**
- Purpose: Define contracts for audio playability and audio routing capabilities
- Location: `src/interfaces/playable.ts`, `src/interfaces/connectable.ts`
- Contains: Playable interface (play/stop methods, duration), Connectable interface (audio routing, gain/pan, parameter control)
- Depends on: Controller types
- Used by: All sound classes, type safety

**Utilities:**
- Purpose: Helper functions and data for audio operations
- Location: `src/utils/`
- Contains: Frequency maps, base64 decoding for sound fonts, time formatting, array methods, math utilities
- Depends on: Web Audio API
- Used by: Core classes, factory functions

## Data Flow

**Audio Playback Flow:**

1. Factory function called (`createSound()`, `createOscillator()`, etc.) with audio source URL or options
2. Audio context initialized (if needed) on user interaction via `initAudio()`
3. Audio data loaded/decoded and buffered
4. Sound instance created with controller instantiated
5. `play()` method called on sound instance
6. `setup()` method creates fresh audio source node and wires connections
7. Audio flows: `audioSourceNode` → [optional `connections[]`] → `gainNode` → `pannerNode` → `audioContext.destination`
8. Controller applies any scheduled parameter changes via `setValuesAtTimes()`
9. `stop()` method called, disconnecting audio source node

**State Management:**

- Play state tracked via `_isPlaying` boolean flag in BaseSound
- Audio context time used for scheduling (not wall-clock time)
- Track position tracked via `startOffset` property for pause/resume
- Controller maintains queues of scheduled value changes (startingValues, valuesAtTime, exponentialValues, linearValues)
- Beat activation state (active property) determines whether Beat produces sound

**Parameter Control Flow:**

1. User calls `sound.onPlaySet('gain').to(0.5).endingAt(1, 'exponential')`
2. Fluent chain builds a scheduled parameter change object
3. Change stored in controller's queue (exponentialValues, linearValues, etc.)
4. When `play()` called, `controller.setValuesAtTimes()` applies all queued changes
5. Web Audio API schedules parameter transitions using `exponentialRampToValueAtTime()` or `linearRampToValueAtTime()`

## Key Abstractions

**BaseSound (Abstract Base Class):**
- Purpose: Provide core audio playback functionality shared by all sound types
- Examples: `src/sound.ts`, `src/track.ts`, `src/oscillator.ts` extend BaseSound
- Pattern: Template method pattern - defines `play()`, `stop()`, `playAt()` methods that call abstract `setup()` and `wireConnections()` for subclasses to implement

**Playable Interface:**
- Purpose: Define contract for anything that can play and stop
- Examples: All sound classes implement Playable
- Pattern: Interface-based contract allowing polymorphism

**Connectable Interface:**
- Purpose: Define contract for audio routing and parameter control
- Examples: All sound classes implement Connectable
- Pattern: Interface-based contract for components that can be wired into effect chains

**ParamController (Base Controller):**
- Purpose: Manage audio parameter scheduling and changes
- Examples: `src/controllers/sound-controller.ts`, `src/controllers/oscillator-controller.ts` extend BaseParamController
- Pattern: Controller pattern - encapsulates parameter state and scheduling logic

**MusicallyAware Mixin:**
- Purpose: Add musical identity properties (note letter, accidental, octave, frequency) to any class
- Examples: `class SampledNote extends MusicallyAware(Sound) {}`
- Pattern: Mixin/composition pattern - returns a new class that extends the provided Base class

**Beat:**
- Purpose: Represent a single rhythmic position that can be active (plays) or inactive (rest)
- Examples: `src/beat.ts`
- Pattern: Value object with callbacks to parent for actual audio playback

## Entry Points

**Library Entry (`src/index.ts`):**
- Location: `src/index.ts`
- Triggers: Called by consuming applications
- Responsibilities:
  - Exports all public classes and factory functions
  - Manages global AudioContext instance
  - Handles AudioContext initialization and iOS audio workarounds
  - Provides factory functions for creating all sound types
  - Manages response caching for audio file loading

**Application Entry (`src/app/main.ts`):**
- Location: `src/app/main.ts`
- Triggers: Entry point for documentation/example application
- Responsibilities: Sets up router, initializes app UI

## Error Handling

**Strategy:** Synchronous errors thrown immediately; AudioContext-aware asynchronous handling for scheduled operations

**Patterns:**
- AudioContext state checked before resume in play methods
- Missing notes in Font throw with descriptive error message
- iOS audio workaround applied automatically to handle browser muting restrictions
- User interaction requirement enforced before AudioContext operations proceed
- Try-catch errors thrown for unsupported control types in controllers

## Cross-Cutting Concerns

**Logging:** Console warnings used for musical identity conflicts in MusicallyAware mixin

**Validation:**
- AudioContext initialization gated on user interaction
- AudioContext state verification before resuming
- Note identifier validation in Font.getNote()

**Authentication/Permissions:** iOS audio unlock workaround automatically applied during `initAudio()` to handle browser muting restrictions

**Timing:**
- AudioContext-aware setTimeout implementation provided in `src/utils/timeout.ts`
- All scheduled operations use AudioContext.currentTime not wall-clock time
- requestAnimationFrame used for Track position tracking
