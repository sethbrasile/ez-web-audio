# Phase 57: PolySynth - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Polyphonic oscillator voice pool with automatic voice lifecycle management. Developers play multiple simultaneous notes through a single PolySynth instance without manual voice management — chords and rapid melodic passages play cleanly with voice stealing when the pool is full. PolySynth has NO musical identity — it is a voice pool manager that works with frequencies, not note names.

</domain>

<decisions>
## Implementation Decisions

### Voice Pool Sizing
- Default max voices: 8 (configurable at construction via `maxVoices` option)
- On-demand allocation: voices created when needed, recycled when stopped (not pre-allocated)
- `maxVoices` is set once at construction, immutable after creation
- No global voice limit across PolySynth instances — each manages its own pool independently
- Multiple PolySynths can coexist (e.g., split keyboard: 4-voice percussion + 4-voice lead)

### Voice Stealing Behavior
- Configurable steal strategy from day one: `stealStrategy: 'lru' | 'oldest-active' | 'quietest'`
- LRU (default): steal oldest-released voice first, then oldest-active if no released voices
- oldest-active: always steal the voice that started playing earliest
- quietest: steal the voice with the lowest current gain
- If all voices are active (none released), steal oldest active — new note always wins
- Same-frequency retrigger: reuses the same voice, restarts envelope from current gain (clickless)
- Emit `'voicestolen'` event with details: which voice was stolen, which replaced it
- Stolen voice fade-out handled by existing Oscillator.stopAt() 10ms anti-click (no extra work needed)

### Note API Design — Voice Handles
- `play()` returns a voice handle — the handle IS the voice identity
- Frequency is a mutable parameter on the handle, NOT the identity key
- This enables pitch bends, portamento, and per-voice frequency changes without breaking pool tracking
- Voice handle is a thin proxy exposing the full Oscillator fluent API: `update()`, `onPlaySet()`, `onPlayRamp()`, `stop()`
- Stale handles (voice was stolen) silently no-op on all method calls; handle has an `active` property
- `play()` accepts `{ frequency: number, gain?: number }` — gain enables velocity sensitivity
- `stopAll()` on PolySynth for panic/reset scenarios
- `activeVoices` / `availableVoices` getters for UI meters and polyphony load decisions

### Voice Factory — Pluggable Oscillator Types
- PolySynth accepts a `createVoice` factory function: `(ctx: AudioContext) => Oscillator`
- Default: creates plain Oscillator with shared config (type, envelope, filters set at PolySynth creation)
- For MusicallyAware oscillators: developer passes `createVoice: (ctx) => new MusicallyAware(Oscillator)(ctx, opts)`
- PolySynth never learns about notes/octaves/musical identity — the oscillator handles that
- The voice handle reflects the underlying oscillator's capabilities (if musically aware, those properties exist on the handle)

### Shared Output Bus & Effects
- All voices route through a shared output bus (GainNode → PannerNode → destination)
- `polySynth.addEffect(delay)` applies to all voices through the shared bus
- No per-voice effects — only shared bus effects
- Master gain and pan controls on the shared bus using the fluent API pattern: `polySynth.update('gain').to(0.5).as('ratio')`
- Per-voice gain available via play options and handle.update('gain') for velocity/expression
- Analyzer support: `polySynth.setAnalyzer(analyzer)` taps the shared bus output

### Claude's Discretion
- Internal data structures for voice pool tracking (array, map, linked list — whatever performs best)
- Exact handle proxy implementation (class, Proxy object, or interface delegation)
- Whether `createVoice` factory is called eagerly (pre-warm pool) or lazily (first play)
- Audio graph wiring details (how voices connect to the shared bus)
- Event detail shape for 'voicestolen' event

</decisions>

<specifics>
## Specific Ideas

- Split keyboard example in docs: percussion PolySynth (4 voices, short envelope) + lead PolySynth (4 voices, longer envelope) side by side
- Docs should show how to use MusicallyAware mixin at point of use for both Oscillator and PolySynth, and not get in the way of that usage pattern
- API feel: "I call play(), I get back a handle, I can manipulate or stop that handle, and I never think about which oscillator I got, whether one was available, or what happens when I exceed max voices"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Oscillator` class (`src/oscillator.ts`): Full synthesis with envelope, filters, anti-click stop — each PolySynth voice IS an Oscillator
- `Envelope` class (`src/envelope.ts`): ADSR with clickless retriggering — voices reuse this for retrigger
- `OscillatorController` (`src/controllers/oscillator-controller.ts`): Parameter management with fluent API — voice handles proxy through this
- `MusicallyAware` mixin (`src/musical-identity.ts`): Opt-in musical identity — works via `createVoice` factory
- `LayeredSound` (`src/layered-sound.ts`): Multi-instance management pattern, event handling, dispose pattern — reference for PolySynth's container behavior
- `frequencyMap` (`src/utils/frequency-map.ts`): Note-to-frequency lookup — used at developer's app layer, not in PolySynth
- `BaseSound.addEffect()` / effect chain pattern: Source → effects → gain → pan → destination — PolySynth shared bus follows this pattern

### Established Patterns
- Factory functions in `src/index.ts` handle `initAudio()` and AudioContext — `createPolySynth` will follow this
- `TypedEventEmitter` for event system — PolySynth extends this for 'voicestolen' events
- Fluent API for parameter control: `update('gain').to(0.5).as('ratio')` — PolySynth master controls use this
- `audioContextAwareTimeout` for browser-throttle-resistant timing

### Integration Points
- New `createPolySynth` factory function exported from `src/index.ts`
- PolySynth class in `src/poly-synth.ts`
- Voice handle type exported for TypeScript consumers
- Event types added to `src/events/event-types.ts`

</code_context>

<deferred>
## Deferred Ideas

- **Browser MIDI / USB input**: User wants to investigate Web MIDI API integration — either make it EZ in the library or document how to use it with existing APIs. Could be its own phase.
- **MusicallyAwareOscillator as a first-class export**: Currently developer creates `MusicallyAware(Oscillator)` at point of use. Consider whether to export a pre-mixed class for convenience. Separate from PolySynth scope.

</deferred>

---

*Phase: 57-polysynth*
*Context gathered: 2026-02-28*
