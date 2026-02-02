---
phase: 07-documentation-demo-site
plan: 02b
type: execute
wave: 1
depends_on: []
files_modified:
  - src/sampler.ts
  - src/beat-track.ts
  - src/beat.ts
  - src/envelope.ts
  - src/sprite.ts
  - src/font.ts
  - src/note.ts
  - src/sampled-note.ts
  - src/layered-sound.ts
  - src/effects/gain-effect.ts
  - src/effects/filter-effect.ts
  - src/effects/effect-wrapper.ts
  - src/effects/index.ts
  - src/analyzer.ts
  - src/errors/audio-error.ts
  - src/errors/context-error.ts
  - src/errors/load-error.ts
  - src/errors/invalid-note-error.ts
  - src/musical-identity.ts
autonomous: true

must_haves:
  truths:
    - "All remaining public classes have JSDoc with @example tags"
    - "All public methods on these classes have JSDoc documentation"
    - "No YUIDoc-style syntax remains ({{#crossLink}} etc.)"
  artifacts:
    - path: "src/sampler.ts"
      provides: "Sampler class with modern JSDoc"
      contains: "@example"
    - path: "src/beat-track.ts"
      provides: "BeatTrack class with modern JSDoc"
      contains: "@example"
    - path: "src/envelope.ts"
      provides: "Envelope class with modern JSDoc"
      contains: "@example"
    - path: "src/effects/gain-effect.ts"
      provides: "GainEffect class with modern JSDoc"
      contains: "@example"
    - path: "src/analyzer.ts"
      provides: "Analyzer class with modern JSDoc"
      contains: "@example"
  key_links:
    - from: "TypeDoc"
      to: "src/sampler.ts"
      via: "entryPoints config"
      pattern: "@param.*@returns.*@example"
    - from: "TypeDoc"
      to: "src/effects/index.ts"
      via: "entryPoints config"
      pattern: "@param.*@returns.*@example"
---

<objective>
Document remaining public classes not covered by Plan 07-02 to produce comprehensive TypeDoc output.

Purpose: Plan 07-02 covers Sound, Track, Oscillator, BaseSound, and factory functions. This parallel plan documents all other public classes: rhythm/sampling classes, audio utilities, effects, and error classes.

Output: All remaining public APIs have complete, TypeDoc-compatible JSDoc documentation with working examples.
</objective>

<execution_context>
@/Users/seth/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seth/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/07-documentation-demo-site/07-RESEARCH.md
@src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Document rhythm and sampling classes</name>
  <files>src/sampler.ts, src/beat-track.ts, src/beat.ts, src/envelope.ts</files>
  <action>
Update JSDoc for rhythm and sampling classes. Replace any YUIDoc syntax ({{#crossLink}}, {{#crossLinkModule}}) with standard JSDoc.

**src/sampler.ts:**
Replace the existing YUIDoc-style class comment with:
```typescript
/**
 * Round-robin playback of multiple sounds.
 *
 * Sampler holds multiple Sound instances and automatically alternates between them
 * on each play() call. This creates realistic variation when playing repeated samples
 * (e.g., multiple recordings of the same drum hit).
 *
 * @example
 * ```typescript
 * import { createSampler } from 'ez-web-audio'
 *
 * // Load multiple kick drum samples for variation
 * const kick = await createSampler([
 *   'kick-1.mp3',
 *   'kick-2.mp3',
 *   'kick-3.mp3'
 * ])
 *
 * // Each play() uses the next sample in rotation
 * kick.play() // plays kick-1
 * kick.play() // plays kick-2
 * kick.play() // plays kick-3
 * kick.play() // back to kick-1
 * ```
 */
```
Document public methods: play(), stop(), and properties: gain, pan, name.

**src/beat-track.ts:**
Replace the existing class comment with:
```typescript
/**
 * Drum machine lane with rhythmic beat patterns.
 *
 * BeatTrack manages an array of Beat instances for creating drum patterns.
 * It extends Sampler for round-robin sample variation and adds tempo-synced
 * playback with beat events for visual synchronization.
 *
 * @example
 * ```typescript
 * import { createBeatTrack } from 'ez-web-audio'
 *
 * const kick = await createBeatTrack(['kick.mp3'], { numBeats: 8 })
 *
 * // Set a basic 4-on-the-floor pattern
 * kick.beats[0].active = true  // beat 1
 * kick.beats[2].active = true  // beat 3
 * kick.beats[4].active = true  // beat 5
 * kick.beats[6].active = true  // beat 7
 *
 * kick.playAll(120) // Play at 120 BPM
 *
 * // Listen for beat events
 * kick.on('beat', (e) => {
 *   console.log(`Beat ${e.detail.beatIndex}`)
 * })
 * ```
 */
```
Document public methods: playAll(), playActiveBeats(), stop(), pause(), resume(), setTempo(), on(), once(), off(), and properties: beats, isPlaying, tempo, numBeats.

**src/beat.ts:**
The class already has a good description. Update it to modern JSDoc format:
```typescript
/**
 * A single beat position in a rhythmic pattern.
 *
 * Beat represents one position in a drum machine lane. When active, it triggers
 * playback when its time comes. When inactive, it creates a rest (silence).
 * Beat tracks timing and provides properties for UI synchronization.
 *
 * @example
 * ```typescript
 * // Beats are typically created by BeatTrack, not directly
 * const track = await createBeatTrack(['snare.mp3'], { numBeats: 8 })
 *
 * // Toggle a beat on/off
 * track.beats[2].active = true
 * track.beats[2].active = false
 *
 * // Check if this beat was just played
 * if (beat.isPlaying) {
 *   // Highlight in UI
 * }
 * ```
 */
```
Document public methods: play(), playIn(), and properties: active, isPlaying, duration.

**src/envelope.ts:**
Already has good JSDoc. Verify @example block works and add method-level docs for:
- trigger(gainParam, startTime) - starts attack/decay/sustain
- release(gainParam, releaseTime) - starts release phase
- cancel(gainParam) - cancels scheduled values
  </action>
  <verify>Run `pnpm typedoc` and check docs/api/classes/ has detailed pages for Sampler.md, BeatTrack.md, Beat.md, Envelope.md with examples.</verify>
  <done>Sampler, BeatTrack, Beat, and Envelope classes have modern JSDoc that produces useful TypeDoc pages.</done>
</task>

<task type="auto">
  <name>Task 2: Document audio utility classes</name>
  <files>src/sprite.ts, src/font.ts, src/note.ts, src/sampled-note.ts, src/layered-sound.ts, src/musical-identity.ts</files>
  <action>
Update JSDoc for audio utility classes. Replace any YUIDoc syntax with standard JSDoc.

**src/sprite.ts (AudioSprite class):**
Already has good class-level JSDoc with example. Document public methods:
- play(name, options?) - plays a sprite segment by name
- stop() - stops current playback
- getSprite(name) - gets sprite definition
- getSpriteNames() - lists available sprite names

**src/font.ts (Font class):**
Replace the existing class comment with:
```typescript
/**
 * Collection of sampled notes for instrument playback.
 *
 * Font holds multiple SampledNote instances, typically loaded from a soundfont.
 * Each note can be played by its identifier (e.g., "A4", "Bb3", "C#5").
 *
 * @example
 * ```typescript
 * import { createFont } from 'ez-web-audio'
 *
 * const piano = await createFont('piano.js')
 *
 * // Play notes by identifier
 * piano.play('C4')
 * piano.play('E4')
 * piano.play('G4')
 *
 * // Get a specific note for advanced control
 * const note = piano.getNote('A4')
 * note?.changeGainTo(0.5)
 * note?.play()
 * ```
 */
```
Document: getNote(identifier), play(identifier), and the notes property.

**src/note.ts (Note class):**
Replace the existing class comment with:
```typescript
/**
 * A musical note without audio data.
 *
 * Note represents musical identity (letter, accidental, octave, frequency)
 * without any audio capabilities. Use SampledNote for notes with audio.
 * Note is useful for UI components that display note information.
 *
 * @example
 * ```typescript
 * import { Note } from 'ez-web-audio'
 *
 * const note = new Note({ letter: 'A', octave: '4' })
 * console.log(note.frequency)  // 440
 * console.log(note.identifier) // "A4"
 *
 * // Or create from frequency
 * const noteFromFreq = new Note({ frequency: 440 })
 * console.log(noteFromFreq.identifier) // "A4"
 * ```
 */
```

**src/sampled-note.ts (SampledNote class):**
Replace the existing YUIDoc class comment with:
```typescript
/**
 * A Sound with musical identity.
 *
 * SampledNote extends Sound with musical properties (letter, accidental, octave,
 * frequency) via the MusicallyAware mixin. Used in Font collections where each
 * sound represents a specific musical note.
 *
 * @example
 * ```typescript
 * // SampledNote is typically created via createFont(), not directly
 * const piano = await createFont('piano.js')
 * const noteA4 = piano.getNote('A4')
 *
 * console.log(noteA4?.frequency)  // 440
 * console.log(noteA4?.identifier) // "A4"
 * noteA4?.play()
 * ```
 */
```

**src/layered-sound.ts (LayeredSound class):**
Already has good class-level JSDoc with example. Document additional public methods:
- play() - plays all layers simultaneously
- stop() - stops all layers
- getLayer(index) - gets individual layer for control
- setGain(value) - sets master gain for all layers
- setPan(value) - sets master pan for all layers
- layerCount - number of active layers

**src/musical-identity.ts (MusicallyAware mixin):**
Replace the existing class comment with:
```typescript
/**
 * Mixin that adds musical identity to any class.
 *
 * MusicallyAware provides note properties (letter, accidental, octave, frequency,
 * identifier) that are automatically calculated from any provided value.
 * Provide frequency, identifier (e.g., "A4"), or letter/octave/accidental.
 *
 * @example
 * ```typescript
 * import { MusicallyAware } from 'ez-web-audio'
 *
 * // Create a class with musical identity
 * class MyNote extends MusicallyAware(class {}) {
 *   customMethod() { return this.frequency * 2 }
 * }
 *
 * const note = new MyNote({ identifier: 'A4' })
 * console.log(note.letter)     // "A"
 * console.log(note.octave)     // "4"
 * console.log(note.frequency)  // 440
 * ```
 */
```
Document the IMusicallyAware interface properties.
  </action>
  <verify>Run `pnpm typedoc` and check docs/api/classes/ has detailed pages for AudioSprite.md, Font.md, Note.md, SampledNote.md, LayeredSound.md with examples. Check that MusicallyAware appears in docs.</verify>
  <done>AudioSprite, Font, Note, SampledNote, LayeredSound, and MusicallyAware have modern JSDoc that produces useful TypeDoc pages.</done>
</task>

<task type="auto">
  <name>Task 3: Document effects, analyzer, and error classes</name>
  <files>src/effects/gain-effect.ts, src/effects/filter-effect.ts, src/effects/effect-wrapper.ts, src/effects/index.ts, src/analyzer.ts, src/errors/audio-error.ts, src/errors/context-error.ts, src/errors/load-error.ts, src/errors/invalid-note-error.ts</files>
  <action>
Update JSDoc for effects, analyzer, and error classes. Most already have good JSDoc - verify examples work and add any missing method documentation.

**src/effects/index.ts:**
Document the Effect interface with JSDoc:
```typescript
/**
 * Common interface for all audio effects.
 *
 * Effects can be added to any Sound, Oscillator, or LayeredSound via addEffect().
 * All effects support bypass (passthrough) and wet/dry mix controls.
 *
 * @example
 * ```typescript
 * import { createSound, createGainEffect } from 'ez-web-audio'
 *
 * const sound = await createSound('audio.mp3')
 * const boost = createGainEffect(audioContext, 1.5)
 *
 * sound.addEffect(boost)
 * sound.play()
 *
 * // Bypass the effect
 * boost.bypass = true
 * ```
 */
```

**src/effects/gain-effect.ts:**
Already has good JSDoc with example. Verify and add docs for:
- input/output getters
- value getter/setter
- bypass getter/setter
- mix getter/setter

**src/effects/filter-effect.ts:**
Already has good JSDoc with example. Verify and add docs for:
- type getter
- frequency getter/setter
- q getter/setter
- gain getter/setter
- detune getter/setter

**src/effects/effect-wrapper.ts:**
Already has good JSDoc with example. Verify and add docs for:
- effect getter (access to wrapped effect)
- input/output getters
- bypass getter/setter
- mix getter/setter

**src/analyzer.ts:**
Already has good JSDoc with example. Verify and add docs for:
- getFrequencyData() - returns Uint8Array of frequency values
- getWaveformData() - returns Uint8Array of waveform values
- getFrequencyDataFloat() - returns Float32Array in dB
- node getter - access to underlying AnalyserNode
- fftSize, frequencyBinCount properties

Also document the createAnalyzer factory function.

**Error classes (src/errors/*.ts):**
All four error classes already have good JSDoc with examples. Verify:
- AudioError - base class with message and optional code
- AudioContextError - context state errors (suspended, closed)
- AudioLoadError - network/decode errors with url property
- InvalidNoteError - invalid note identifier with identifier property

Ensure all error classes document their constructor parameters and any additional properties.
  </action>
  <verify>Run `pnpm typedoc` and check:
1. docs/api/interfaces/Effect.md exists with example
2. docs/api/classes/ has GainEffect.md, FilterEffect.md, EffectWrapper.md, Analyzer.md with examples
3. docs/api/classes/ has AudioError.md, AudioContextError.md, AudioLoadError.md, InvalidNoteError.md with examples
4. All @example blocks contain valid TypeScript</verify>
  <done>All effect classes, Analyzer, and error classes have modern JSDoc with examples that produce useful TypeDoc pages.</done>
</task>

</tasks>

<verification>
1. `pnpm typedoc` completes without warnings about missing documentation
2. docs/api/classes/ has detailed pages for all classes: Sampler, BeatTrack, Beat, Envelope, AudioSprite, Font, Note, SampledNote, LayeredSound, GainEffect, FilterEffect, EffectWrapper, Analyzer, AudioError, AudioContextError, AudioLoadError, InvalidNoteError
3. docs/api/interfaces/ has Effect.md
4. MusicallyAware appears in the documentation (may be under functions or mixins)
5. All @example blocks contain valid TypeScript that would work if copy-pasted
6. No YUIDoc syntax remains (search for "{{#" returns no results in src/)
</verification>

<success_criteria>
- All remaining public classes have complete JSDoc with @example tags
- Rhythm classes (Sampler, BeatTrack, Beat, Envelope) fully documented
- Audio utility classes (AudioSprite, Font, Note, SampledNote, LayeredSound, MusicallyAware) fully documented
- Effect classes (GainEffect, FilterEffect, EffectWrapper) and Effect interface documented
- Analyzer class fully documented
- Error classes (AudioError, AudioContextError, AudioLoadError, InvalidNoteError) fully documented
- TypeDoc generates comprehensive API pages without "no description" placeholders
- Examples show real-world usage patterns users can copy
- YUIDoc syntax completely removed from all files
</success_criteria>

<output>
After completion, create `.planning/phases/07-documentation-demo-site/07-02b-SUMMARY.md`
</output>
