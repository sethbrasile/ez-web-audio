# Transport/Sequencer Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swing, transport loop region, and per-step velocity to ez-web-audio core; root-cause the demo play screech; rebuild TransportSequencerDemo as an editable "Transport showcase" with authentic drum-book patterns and synth voices.

**Architecture:** Core-first, three layered core features (velocity → swing → loop) each TDD'd against the existing 1944-test Vitest suite, then a demo rebuild that consumes only public API (no raw gain automation — the round-3 screech trigger site is deleted). Spec: `.planning/specs/transport-sequencer-rework.md`. Bead: `ez-audio-a30`.

**Tech Stack:** TypeScript, Vitest + happy-dom + standardized-audio-context-mock (core), Vue 3 + VitePress (demo), Playwright (E2E).

## Global Constraints

- pnpm workspace. Core tests: `pnpm --filter ez-web-audio test <file>` (script embeds `--run` — NEVER append `--run`, vitest 4 errors on duplicate).
- Quality gates before final commit of each task: `pnpm --filter ez-web-audio test` for core tasks; `pnpm typecheck` and `pnpm lint` at least once per task.
- Backward compatibility: existing `setPattern([0,1])` arrays, existing Transport/Sequence behavior with swing=0 and loop=false must be bit-identical. No existing test may be modified to pass (fix code instead, or flag genuine behavior-change conflicts to orchestrator).
- Demo rules: no Load/Init buttons (first interaction initializes); no layout shift from loading states; demos must only use public `ez-web-audio` API (library-fidelity rule — no manual `gain.setValueAtTime` on library-owned nodes).
- Beads for tracking, not TodoWrite. Commit per task, conventional commits.
- JSDoc on every new public API member, with `@example` blocks (codebase convention).

---

### Task 1: Beat velocity + numeric setPattern

**Files:**
- Modify: `packages/core/src/beat.ts`
- Modify: `packages/core/src/sampler.ts`
- Modify: `packages/core/src/beat-track.ts` (setPattern ~line 211, beats getter ~line 166)
- Test: `packages/core/src/beat.test.ts`, `packages/core/src/beat-track.test.ts`

**Interfaces:**
- Consumes: existing `Sampler.playIn(seconds)`, `Beat` parent callbacks.
- Produces: `Beat.velocity: number` (0–1, default 1); `Sampler.play(velocity?: number)`, `Sampler.playIn(seconds: number, velocity?: number)`, `Sampler.playAt(time: number, velocity?: number)`; `BeatTrack.setPattern(pattern: (number | boolean)[])` where numeric values 0 < v are velocity. Task 6 relies on `setPattern([1, 0, 0.6, ...])` and `beats[i].velocity`.

- [ ] **Step 1: Write failing tests**

In `packages/core/src/beat-track.test.ts` (follow existing describe/mock style in that file — use its existing helpers for creating a BeatTrack with mock sounds):

```typescript
describe('velocity', () => {
  it('defaults every beat velocity to 1', async () => {
    const track = await createTestBeatTrack({ numBeats: 4 }) // use file's existing factory helper
    expect(track.beats.map(b => b.velocity)).toEqual([1, 1, 1, 1])
  })

  it('setPattern with numeric values sets active and velocity', async () => {
    const track = await createTestBeatTrack({ numBeats: 4 })
    track.setPattern([1, 0, 0.6, 0])
    expect(track.beats.map(b => b.active)).toEqual([true, false, true, false])
    expect(track.beats[0].velocity).toBe(1)
    expect(track.beats[2].velocity).toBe(0.6)
    // rests keep default velocity
    expect(track.beats[1].velocity).toBe(1)
  })

  it('setPattern clamps velocity to 0..1', async () => {
    const track = await createTestBeatTrack({ numBeats: 2 })
    track.setPattern([1.5, 1])
    expect(track.beats[0].velocity).toBe(1)
  })

  it('setPattern with booleans keeps velocity 1 (backward compat)', async () => {
    const track = await createTestBeatTrack({ numBeats: 2 })
    track.setPattern([true, false])
    expect(track.beats[0].active).toBe(true)
    expect(track.beats[0].velocity).toBe(1)
  })
})
```

In `packages/core/src/beat.test.ts`:

```typescript
it('passes velocity to parent playIn callback', () => {
  const playIn = vi.fn()
  const beat = new Beat(ctx, { playIn, play: vi.fn() }) // ctx per file's existing mock setup
  beat.velocity = 0.6
  beat.active = true
  beat.playInIfActive(0.1)
  expect(playIn).toHaveBeenCalledWith(0.1, 0.6)
})
```

Sampler velocity test — in `packages/core/src/beat-track.test.ts` or `index.test.ts` wherever Sampler is already unit-tested (search `describe('Sampler'`); add:

```typescript
it('playIn scales sound gain by velocity', () => {
  // sounds: mock objects with changeGainTo/changePanTo/playIn spies (follow existing Sampler test mocks)
  const sampler = new Sampler([mockSound])
  sampler.gain = 0.8
  sampler.playIn(0.5, 0.5)
  expect(mockSound.changeGainTo).toHaveBeenCalledWith(0.4) // 0.8 * 0.5
})
```

- [ ] **Step 2: Run tests, verify failure**

Run: `pnpm --filter ez-web-audio test src/beat-track.test.ts src/beat.test.ts`
Expected: new tests FAIL (`velocity` undefined / playIn called with 1 arg).

- [ ] **Step 3: Implement**

`beat.ts` — add field + thread velocity through the four play methods:

```typescript
export interface BeatOptions {
  duration?: number
  playIn: (time: number, velocity?: number) => void
  play: (velocity?: number) => void
  // ... setTimeout/clearTimeout unchanged
}
```

```typescript
/**
 * Playback velocity (0–1) applied as a gain multiplier when this beat plays.
 * 1 = full volume, lower values are quieter hits (e.g. ghost notes at 0.4).
 * Set directly or via BeatTrack.setPattern numeric values.
 * @default 1
 */
public velocity = 1
```

In `playIn`: `this.parentPlayIn(offset, this.velocity)`. In `playInIfActive`: `this.parentPlayIn(offset, this.velocity)`. In `play` and `playIfActive`: `this.parentPlay(this.velocity)`.

`sampler.ts` — optional velocity params, applied in `setGainAndPan`:

```typescript
public play(velocity = 1): void {
  void Promise.resolve(this.getNextSound(velocity).play()).catch(() => {})
}

public playIn(seconds: number, velocity = 1): void {
  this.getNextSound(velocity).playIn(seconds)
}

public playAt(time: number, velocity = 1): void {
  void Promise.resolve(this.getNextSound(velocity).playAt(time)).catch(() => {})
}

private getNextSound(velocity = 1): Playable & Connectable {
  // ... existing iterator logic unchanged ...
  return this.setGainAndPan(nextSound.value, velocity)
}

private setGainAndPan(sound: Playable & Connectable, velocity = 1): Playable & Connectable {
  sound.changeGainTo(this.gain * velocity)
  sound.changePanTo(this.pan)
  return sound
}
```

(Velocity is applied at schedule time exactly like the existing sampler `gain` — same semantics, no new timing behavior. Update the JSDoc on `play`/`playIn`/`playAt` to document the parameter.)

`beat-track.ts` — `setPattern`:

```typescript
public setPattern(pattern: (number | boolean)[]): this {
  const beats = this.beats
  for (let i = 0; i < beats.length; i++) {
    const value = i < pattern.length ? pattern[i] : 0
    beats[i].active = !!value
    beats[i].velocity = typeof value === 'number' && value > 0
      ? Math.min(1, value)
      : 1
  }
  return this
}
```

Update `setPattern` JSDoc: numeric values > 0 set velocity (`[1, 0, 0.6, 0]` — 0.6 = quieter hit), booleans/0/1 behave as before.

- [ ] **Step 4: Run full core suite**

Run: `pnpm --filter ez-web-audio test`
Expected: all pass (existing + new). Then `pnpm typecheck && pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/beat.ts packages/core/src/sampler.ts packages/core/src/beat-track.ts packages/core/src/beat.test.ts packages/core/src/beat-track.test.ts
git commit -m "feat(core): per-beat velocity via numeric setPattern values"
```

---

### Task 2: Transport swing

**Files:**
- Modify: `packages/core/src/transport.ts`
- Modify: `packages/core/src/sequence.ts` (`_scheduleEventsInWindow`, ~line 200)
- Test: `packages/core/src/transport.test.ts`, `packages/core/src/sequence.test.ts`

**Interfaces:**
- Consumes: `Transport.schedulerTick()` scheduling loops; `SyncedTrackState`.
- Produces: `transport.swing: number` (0–1, throw outside range), `transport.swingSubdivision: number` (must be `1/8` or `1/16`, default `1/16`); internal `transport._swingDelayFor(positionBeats: number): number` used by Sequence. Task 6 relies on `transport.swing = 0.55` working live during playback.

**Swing math (single source of truth):** an event whose musical position in beats lands exactly (±1e-6) on an odd multiple of the swing subdivision is delayed by `swing * subdivisionSeconds / 3`, where `subdivisionSeconds = (240 * swingSubdivision) / bpm`. At swing=1, off-16ths land on the triplet position. Off-grid events and even subdivisions are never delayed. Position/tick events are NEVER swung — the playhead stays on-grid.

- [ ] **Step 1: Write failing tests**

`packages/core/src/transport.test.ts` (follow the file's existing mock-clock/track-spy patterns — it already tests `_scheduleBeatFromTransport` call times):

```typescript
describe('swing', () => {
  it('defaults to 0 and subdivision 1/16', () => {
    expect(transport.swing).toBe(0)
    expect(transport.swingSubdivision).toBe(1 / 16)
  })

  it('throws on swing outside 0..1 and invalid subdivision', () => {
    expect(() => { transport.swing = -0.1 }).toThrow()
    expect(() => { transport.swing = 1.1 }).toThrow()
    expect(() => { transport.swingSubdivision = 1 / 4 }).toThrow()
  })

  it('delays odd 16th track beats by swing * subdivision / 3', () => {
    // bpm 120 → 16th = 0.125s; swing 0.5 → delay = 0.5 * 0.125 / 3 ≈ 0.02083
    // Sync a 4-beat track at noteType 1/16, start, advance mock clock,
    // capture _scheduleBeatFromTransport times.
    // beats 0 and 2 (even 16ths): unswung grid times
    // beats 1 and 3 (odd 16ths): grid time + 0.0208333...
  })

  it('_swingDelayFor returns 0 for off-grid positions', () => {
    transport.swing = 1
    expect(transport._swingDelayFor(0.30)).toBe(0)   // not on a 0.25-beat boundary
    expect(transport._swingDelayFor(0.25)).toBeCloseTo((240 * (1 / 16)) / 120 / 3, 6)
    expect(transport._swingDelayFor(0.5)).toBe(0)    // even subdivision
  })
})
```

`packages/core/src/sequence.test.ts`:

```typescript
it('swings sequence events on odd subdivisions, leaves off-grid events alone', () => {
  // transport bpm 120, swing 1, subdivision 1/16
  // seq.at(0.25, cb1)  → expect callback time = gridTime + 0.125/3
  // seq.at(0.30, cb2)  → expect callback time = gridTime exactly (off-grid, unswung)
  // Use the file's existing pattern for capturing callback `time` arguments.
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter ez-web-audio test src/transport.test.ts src/sequence.test.ts`
Expected: FAIL (`swing` undefined).

- [ ] **Step 3: Implement in transport.ts**

Fields + accessors:

```typescript
private _swing = 0
private _swingSubdivision = 1 / 16

/**
 * Swing amount (0–1). 0 = straight; 1 = full triplet feel — every other
 * swing subdivision is delayed to the triplet position. Applies to synced
 * BeatTrack beats and Sequence events that land exactly on an odd
 * subdivision; position/tick events are unaffected. Live-changeable.
 * @default 0
 */
get swing(): number { return this._swing }
set swing(value: number) {
  if (value < 0 || value > 1)
    throw new Error(`swing must be between 0 and 1. Received: ${value}`)
  this._swing = value
}

/**
 * The subdivision swing applies to: 1/8 (eighth notes) or 1/16 (sixteenth
 * notes, MPC-style). @default 1/16
 */
get swingSubdivision(): number { return this._swingSubdivision }
set swingSubdivision(value: number) {
  if (value !== 1 / 8 && value !== 1 / 16)
    throw new Error(`swingSubdivision must be 1/8 or 1/16. Received: ${value}`)
  this._swingSubdivision = value
}

/**
 * Swing delay in seconds for an event at the given musical position (in
 * beats from transport start/loop origin). Used by the scheduler and by
 * synced Sequences.
 * @internal
 */
_swingDelayFor(positionBeats: number): number {
  if (this._swing === 0)
    return 0
  const subdivisionBeats = 4 * this._swingSubdivision // 1/16 → 0.25 beats
  const index = positionBeats / subdivisionBeats
  const nearest = Math.round(index)
  if (Math.abs(index - nearest) > 1e-6)
    return 0 // off-grid: never swung
  if (nearest % 2 === 0)
    return 0
  const subdivisionSeconds = (240 * this._swingSubdivision) / this._bpm
  return this._swing * subdivisionSeconds / 3
}
```

Track scheduling: `SyncedTrackState` gains `stepCount: number` (absolute steps since start, never wraps — initialize 0 wherever `currentBeatIndex` is initialized: `start()`, `_addTrack` hot-add, `stop()` reset). In `schedulerTick()`'s track loop:

```typescript
const noteTypeBeats = 4 * noteType // musical beats per step
while (state.nextBeatTime < currentTime + this.scheduleAheadTime) {
  const positionBeats = state.stepCount * noteTypeBeats
  const swingDelay = this._swingDelayFor(positionBeats)
  state.track._scheduleBeatFromTransport(state.currentBeatIndex, state.nextBeatTime + swingDelay)
  state.nextBeatTime += beatDuration
  state.stepCount++
  state.currentBeatIndex = (state.currentBeatIndex + 1) % state.track.beats.length
}
```

(`nextBeatTime` accumulation stays straight — swing only offsets the scheduled time handed to the track. Task 3 will reuse `stepCount` for loop mapping.)

Sequence side, in `sequence.ts` `_scheduleEventsInWindow` where `eventTime` is computed (~line 261):

```typescript
const eventTime = currentTime + timeOffset + this.transport._swingDelayFor(eventBeat)
```

(`eventBeat` is sequence-relative; parity is correct whenever the sequence starts on a bar boundary and its length is a whole, even number of subdivisions — true for all `Nm` lengths. Note this in the JSDoc for `swing`.)

- [ ] **Step 4: Run full core suite + gates**

Run: `pnpm --filter ez-web-audio test` then `pnpm typecheck && pnpm lint`
Expected: all green — swing=0 default keeps every existing timing test byte-identical.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/transport.ts packages/core/src/sequence.ts packages/core/src/transport.test.ts packages/core/src/sequence.test.ts
git commit -m "feat(core): transport swing with 1/8 and 1/16 subdivisions"
```

---

### Task 3: Transport loop region

**Files:**
- Modify: `packages/core/src/transport.ts`
- Modify: `packages/core/src/events/event-types.ts` (TransportEventMap, line 257)
- Test: `packages/core/src/transport.test.ts`

**Interfaces:**
- Consumes: `musicalTimeToBeats` from `./utils/musical-time`; `SyncedTrackState.stepCount` from Task 2.
- Produces: `transport.loop: boolean` (default false), `transport.loopStart` / `transport.loopEnd` (MusicalTimeNotation getters return beats as number), `'loop'` event `CustomEvent<TransportLoopDetail>` with `{ iteration, time, source }`. Task 6 relies on `transport.loop = true; transport.loopEnd = '2m'` wrapping the bar:beat display back to 1:1.
- Explicit non-goal (spec): Sequences are NOT remapped — they self-loop at their own length. Document on `loop` JSDoc: "for lockstep, give sequences the same length as the loop region."

- [ ] **Step 1: Write failing tests**

`packages/core/src/transport.test.ts`:

```typescript
describe('loop region', () => {
  it('defaults off, loopStart 0', () => {
    expect(transport.loop).toBe(false)
    expect(transport.loopStart).toBe(0)
  })

  it('accepts musical notation and stores beats', () => {
    transport.loopEnd = '2m'   // 4/4 → 8 beats
    expect(transport.loopEnd).toBe(8)
    transport.loopStart = '1m'
    expect(transport.loopStart).toBe(4)
  })

  it('throws when loopEnd <= loopStart on start()', () => {
    transport.loop = true
    transport.loopStart = '2m'
    transport.loopEnd = '1m'
    expect(() => transport.start()).toThrow()
  })

  it('wraps position at loop end and emits loop event', () => {
    // bpm 120, ticksPerBeat 4, loopEnd '1m' (= 4 beats = 16 ticks = 2s)
    // advance mock clock past 2s of scheduling
    // expect position.bar to have returned to 1 (not 2)
    // expect 'loop' handler called with iteration 1
  })

  it('wraps synced track pattern index at loop boundary', () => {
    // track numBeats 8, noteType 1/4, loopEnd '1m' (4 beats)
    // after wrap, _scheduleBeatFromTransport must be called with indices 0,1,2,3,0,1,2,3
    // NOT 0..7 (free-run) — loop constrains the pattern to its first 4 steps
  })

  it('loop=false behavior unchanged (position runs past loopEnd)', () => { /* guard */ })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter ez-web-audio test src/transport.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`events/event-types.ts` — add detail + map entry:

```typescript
/**
 * Detail for Transport 'loop' events, fired each time the loop region wraps.
 */
export interface TransportLoopDetail {
  /** Loop iteration count (1-indexed) */
  iteration: number
  /** AudioContext time of the wrap */
  time: number
  /** The Transport instance that emitted this event */
  source: AudioEventSource
}

export interface TransportEventMap {
  // ...existing...
  loop: CustomEvent<TransportLoopDetail>
}
```

`transport.ts`:

```typescript
private _loop = false
private _loopStartBeats = 0
private _loopEndBeats = 0 // 0 = unset
private loopIteration = 0

/**
 * Whether the transport loops over the region [loopStart, loopEnd).
 * When enabled, position and synced-track pattern indices wrap at loopEnd
 * and a 'loop' event fires on each wrap. Sequences are not remapped — they
 * loop at their own length; give them the same length as the loop region
 * for lockstep. @default false
 */
get loop(): boolean { return this._loop }
set loop(value: boolean) { this._loop = value }

/** Loop region start. Set with musical notation ('1m', '2:1:0') or beats; reads back as beats. @default 0 */
get loopStart(): number { return this._loopStartBeats }
set loopStart(value: MusicalTimeNotation) {
  this._loopStartBeats = musicalTimeToBeats(value, this._timeSignature[0], this._ticksPerBeat)
}

/** Loop region end. Set with musical notation ('2m') or beats; reads back as beats. */
get loopEnd(): number { return this._loopEndBeats }
set loopEnd(value: MusicalTimeNotation) {
  this._loopEndBeats = musicalTimeToBeats(value, this._timeSignature[0], this._ticksPerBeat)
}
```

`start()` fresh-start branch — validate: if `this._loop && this._loopEndBeats <= this._loopStartBeats` throw `new Error('loopEnd must be greater than loopStart when loop is enabled')`. Reset `this.loopIteration = 0` (also in `stop()`).

`advancePosition()` — wrap tick index after increment:

```typescript
this.currentTickIndex++
if (this._loop) {
  const loopStartTick = Math.round(this._loopStartBeats * this._ticksPerBeat)
  const loopEndTick = Math.round(this._loopEndBeats * this._ticksPerBeat)
  if (this.currentTickIndex >= loopEndTick) {
    this.currentTickIndex = loopStartTick
    this.loopIteration++
    this.emit('loop', { iteration: this.loopIteration, time: this.nextTickTime, source: this })
  }
}
// ...existing bar/beat/tick derivation from currentTickIndex unchanged
```

Track loop in `schedulerTick()` — map `positionBeats` into the loop region before deriving pattern index AND swing parity (replaces the Task 2 body):

```typescript
const noteTypeBeats = 4 * noteType
while (state.nextBeatTime < currentTime + this.scheduleAheadTime) {
  let positionBeats = state.stepCount * noteTypeBeats
  if (this._loop && this._loopEndBeats > this._loopStartBeats && positionBeats >= this._loopStartBeats) {
    const loopLen = this._loopEndBeats - this._loopStartBeats
    positionBeats = this._loopStartBeats + ((positionBeats - this._loopStartBeats) % loopLen)
  }
  const patternIndex = Math.round(positionBeats / noteTypeBeats) % state.track.beats.length
  const swingDelay = this._swingDelayFor(positionBeats)
  state.track._scheduleBeatFromTransport(patternIndex, state.nextBeatTime + swingDelay)
  state.nextBeatTime += beatDuration
  state.stepCount++
}
```

(`currentBeatIndex` on `SyncedTrackState` is now dead — remove it and its initializations; `stepCount` + derived `patternIndex` replace it. With loop off, `patternIndex === stepCount % length`, identical to old behavior.)

- [ ] **Step 4: Run full core suite + gates**

Run: `pnpm --filter ez-web-audio test` then `pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/transport.ts packages/core/src/events/event-types.ts packages/core/src/transport.test.ts
git commit -m "feat(core): transport loop region with position and track wrap"
```

---

### Task 4: Screech root-cause investigation

**Files:**
- Read: `docs/.vitepress/theme/components/TransportSequencerDemo.vue` (current version, before Task 6 replaces it), `packages/core/src/oscillator.ts`, `packages/core/src/base-sound.ts`
- Possibly modify: `packages/core/src/oscillator.ts` or `packages/core/src/base-sound.ts` + matching test file
- Update: bead `ez-audio-a30` notes

**Interfaces:**
- Consumes: nothing from other tasks (run any time before Task 6).
- Produces: written root cause on the bead; if library-level, a core fix + regression test that Task 6's voices then rely on.

This is an investigation task — use superpowers:systematic-debugging. No fixed code steps; the deliverable is knowledge plus (conditionally) a fix.

- [ ] **Step 1: Reproduce.** `pnpm dev`, open `examples/transport-sequencer`, hammer Play/Stop/preset switches and BPM drags; also pause→resume rapidly. Note exact gesture that produces glitch/screech. If unreproducible after ~10 min of adversarial clicking, record that on the bead and move to Step 2 anyway (code-level analysis).
- [ ] **Step 2: Test hypotheses in ranked order** (from spec):
  1. Demo's manual `gain.setValueAtTime`/`linearRampToValueAtTime` (TransportSequencerDemo.vue lines ~329-333) colliding with library `changeGainTo`/setup gain writes on retrigger — write a minimal unit test in `packages/core/src/oscillator.test.ts` that: creates an Oscillator, calls `playIn(0.05)`, externally schedules a ramp on `getGainNode().gain`, calls `playIn(0.02)` again before the ramp completes, and inspects the mock AudioParam's scheduled values for discontinuity (mock library records scheduled automation calls).
  2. `Oscillator.setup()` neutralizing the previous node while its ramp is pending — inspect `setup()`/release-gain handoff path (see memory: round-3 single-use-source-node fixes) for a window where the old node's gain jumps to full before release.
  3. Soundfont note overlap — only if 1 and 2 come up clean.
- [ ] **Step 3: Record verdict.** `bd update ez-audio-a30 --notes="SCREECH ROOT CAUSE: <finding>. <library-level|demo-level>. <fix|removed by demo rebuild>"`.
- [ ] **Step 4 (conditional): Core fix + regression test.** Only if library-level. Likely shape: `Oscillator.playAt`/`setup()` must `cancelScheduledValues` on the gain param at the new note's start time before applying its own values, so externally- or previously-scheduled automation can't bleed into the new note. TDD it: failing regression test from Step 2's repro, minimal fix, full suite green.
- [ ] **Step 5: Commit** (only if code changed)

```bash
git add packages/core/src/oscillator.ts packages/core/src/oscillator.test.ts
git commit -m "fix(core): cancel stale gain automation on oscillator retrigger"
```

---

### Task 5: Preset data module (book-derived patterns + voices)

**Files:**
- Create: `docs/.vitepress/theme/components/transport-sequencer-presets.ts`

**Interfaces:**
- Consumes: nothing (pure data).
- Produces: the module below, imported by Task 6. Exact exported shapes:

```typescript
export interface DrumLanePattern {
  /** 32 steps (2 bars of 16ths); 0 = rest, >0 = velocity */
  steps: number[]
}

export interface NoteEvent {
  /** Position in beats, 0-indexed, 0..7.75 (2 bars in 4/4) */
  time: number
  /** Note name, e.g. 'E2' — passed to createOscillator({ note }) */
  note: string
}

export interface ChordEvent {
  time: number
  notes: string[]
  /** Grid display label, e.g. 'Em' */
  label: string
}

export interface VoiceSpec {
  type: OscillatorType // 'sine' | 'square' | 'sawtooth' | 'triangle'
  gain: number
  envelope: { attack: number, decay: number, sustain: number, release: number }
}

export interface TransportPreset {
  name: string
  bpm: number
  /** 0–1, applied to transport.swing on preset select */
  swing: number
  kick: DrumLanePattern
  snare: DrumLanePattern
  hihat: DrumLanePattern
  bass: { voice: VoiceSpec, notes: NoteEvent[] }
  lead: { voice: VoiceSpec, notes: ChordEvent[] }
}

export const TRANSPORT_PRESETS: TransportPreset[]
export const ACCENT = 1
export const NORMAL = 0.7
export const GHOST = 0.4
```

- [ ] **Step 1: Write the module.** Header comment: `// Drum patterns adapted from René-Pierre Bardet, "200/260 Drum Machine Patterns" (via github.com/stephenhandley/DrumMachinePatterns transcriptions). Rhythm patterns are not copyrightable; accents map to velocity.` Five presets. Full data (A = ACCENT = 1, N = NORMAL = 0.7, G = GHOST = 0.4, dot = 0 in these comments; arrays written out numerically in code):

**Rock** (Rock 1 family) — bpm 112, swing 0
- kick:  `A...............A.....N.........` → steps 0, 16 accented; 22 normal (and-of-2 pickup bar 2); plus 8, 24 normal (beat 3): `[1,0,0,0,0,0,0,0,.7,0,0,0,0,0,0,0, 1,0,0,0,0,0,.7,0,.7,0,0,0,0,0,0,0]`
- snare: backbeat accented: steps 4, 12, 20, 28 = 1, rest 0
- hihat: 8ths, accent on quarters: `[1,0,.7,0,1,0,.7,0,1,0,.7,0,1,0,.7,0]` ×2
- bass (E minor, voice: triangle, gain 0.5, env `{attack:.005, decay:.25, sustain:0, release:.05}`): `E2@0, E2@1.5, G2@2, A2@3, E2@4, E2@5.5, G2@6, D2@7`
- lead (saw pluck, gain 0.22, env `{attack:.005, decay:.3, sustain:0, release:.08}`): `Em(E4,G4,B4)@1.5, Em@3.5, Em@5.5, G(G4,B4,D5)@7.5`

**Funk** (Funk 1 family) — bpm 104, swing 0.15
- kick: `A..N......N.....A..N.....N......` → `[1,0,0,.7,0,0,0,0,0,0,.7,0,0,0,0,0, 1,0,0,.7,0,0,0,0,0,.7,0,0,0,0,0,0]`
- snare: backbeat + ghosts: steps 4, 12, 20, 28 = 1; steps 7, 15, 23 = 0.4
- hihat: 16ths, accents on 8th positions: `[1,.4,.7,.4]` repeating ×8
- bass (A minor, square, gain 0.4, env `{attack:.005, decay:.18, sustain:0, release:.04}`): `A1@0, A1@0.75, A2@1.25, G1@2.5, A1@3, A1@4, C2@4.75, D2@5, E2@5.75, G1@6.5, A1@7`
- lead (square clav stab, gain 0.16, env `{attack:.003, decay:.15, sustain:0, release:.05}`): `Am7(A3,C4,E4,G4)@1.5, Am7@3.75, Am7@5.5, Am7@7.5`

**Disco** (Disco 1 family) — bpm 118, swing 0
- kick: four-on-the-floor accented: steps 0,4,8,12,16,20,24,28 = 1
- snare: backbeat: 4,12,20,28 = 0.7 (layered under kick)
- hihat: offbeat 8ths accented (open-hat feel with closed samples): `[.4,0,1,0]` repeating ×8
- bass (A minor octaves, sawtooth, gain 0.35, env `{attack:.005, decay:.2, sustain:0, release:.05}`): `A1@0, A2@0.5, A1@1, A2@1.5, A1@2, A2@2.5, A1@3, A2@3.5, A1@4, A2@4.5, A1@5, A2@5.5, A1@6, A2@6.5, G1@7, G2@7.5`
- lead (octave saw stab, gain 0.14, env `{attack:.005, decay:.22, sustain:0, release:.06}`): `Am(A4,E5)@1, Am@3, Am@5, G(G4,D5)@7`

**Bossa** (Bossa Nova 1 family) — bpm 132, swing 0
- kick: bossa surdo feel: steps 0, 3, 8, 11, 16, 19, 24, 27; velocities `[1,.7,...]` (0 and 16 accented, rest 0.7)
- snare: rim-style 2-3 clave at GHOST-to-NORMAL: steps 0, 6, 12, 20, 26 = 0.5
- hihat: steady 8ths, quarters slightly accented, softer overall: `[.9,0,.6,0]` ×8
- bass (C major, triangle, gain 0.45, env `{attack:.008, decay:.3, sustain:0, release:.06}`): `C2@0, G1@1.5, C2@2, G1@3.5, A1@4, E1@5.5, A1@6, G1@7.5`
- lead (soft sine keys, gain 0.2, env `{attack:.01, decay:.35, sustain:0, release:.1}`): `Cmaj7(C4,E4,G4,B4)@1.5, Cmaj7@3.5, Am7(A3,C4,E4,G4)@5.5, Am7@7.5`

**Shuffle** (Shuffle/blues family) — bpm 96, swing 0.55
- WRITTEN STRAIGHT — the swing knob supplies the shuffle (pedagogical point).
- kick: steps 0, 8, 16, 24 = 1; steps 6, 22 = 0.7
- snare: backbeat: 4, 12, 20, 28 = 1
- hihat: straight 8ths, quarter accents: `[1,0,.6,0]` ×8
- bass (E blues walk, triangle, gain 0.5, env `{attack:.005, decay:.28, sustain:0, release:.05}`): `E2@0, G2@0.5, A2@1, B2@2, A2@2.5, G2@3, E2@4, G2@4.5, A2@5, B2@6, D3@6.5, B2@7` — 8th-note walk; odd-8th notes get swung by the knob
- lead (triangle, gain 0.2, env `{attack:.005, decay:.25, sustain:0, release:.08}`): `E7(E4,G#4,D5)@1.5, E7@3.5, E7@5.5, A(A4,C#5,E5)@7.5`

- [ ] **Step 2: Verify module compiles**

Run: `pnpm typecheck`
Expected: clean. (Import `OscillatorType` from lib DOM types — it's a built-in TS DOM type, no import needed.)

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/transport-sequencer-presets.ts
git commit -m "feat(demos): book-derived preset data for transport sequencer"
```

---

### Task 6: Rebuild TransportSequencerDemo.vue

**Files:**
- Rewrite: `docs/.vitepress/theme/components/TransportSequencerDemo.vue`
- Consume: `./transport-sequencer-presets.ts` (Task 5), kit `Knob.vue`, `PlayButton.vue`, `SegmentDisplay.vue`, `DemoFrame.vue`
- Reference for composable API: `@ez-web-audio/vue` (`useTransport`, `useBeatTrack`, `useSequence`, `useCleanup`, `useAudioContext` — same imports the current file uses)

**Interfaces:**
- Consumes: `setPattern` numeric velocities (Task 1), `transport.swing` (Task 2), `transport.loop`/`loopEnd` (Task 3), `TRANSPORT_PRESETS` (Task 5).
- Produces: user-facing demo. E2E (Task 7) relies on these hooks: root class `transport-sequencer-demo` (kept), drum step cells clickable with classes `step-cell`, `active`, `accent`, swing Knob labeled `Swing`, preset buttons with `aria-pressed`.

Structure notes for the implementer (keep the current file's DemoFrame/PlayButton/SegmentDisplay/transport-bar/sticky-grid skeleton and CSS where it still applies — this is a rework of behavior + data flow, not a from-scratch visual redesign):

- [ ] **Step 1: Wire presets + transport features.**
  - `ensureLoaded()`: as now, but `loadTransport({ bpm, timeSignature: [4,4], ticksPerBeat: 12 })` then `tp.loop = true; tp.loopEnd = '2m'`. After load: `applyPreset(activePreset)` sets `transport.bpm`, `transport.swing`, drum patterns via `setPattern(preset.kick.steps)` etc. (numeric velocities flow through Task 1).
  - Swing state: `const swing = ref(0)` bound to a kit `Knob` (`label="Swing"`, min 0, max 100, format `v => \`${Math.round(v)}%\``); watch → `transport.value.swing = v / 100`. Preset select sets `swing.value = preset.swing * 100`.
  - BPM watch as now. Position display as now (loop makes bar wrap 1→2→1 naturally).
- [ ] **Step 2: Editable drum lanes.**
  - Local reactive mirror: `const drumSteps = reactive<Record<'kick'|'snare'|'hihat', number[]>>(...)` seeded from preset; cell click cycles value: `0 → NORMAL(0.7) → ACCENT(1) → 0`. On change: `track.setPattern(drumSteps[lane])` (guard: audio loaded). Preset switch overwrites `drumSteps` from preset data.
  - Cell rendering: class `active` when value > 0, additional class `accent` when value === 1; accent cells use stronger fill (`background: var(--ewa-accent)` full vs `color-mix(in srgb, var(--ewa-accent) 55%, var(--ewa-bg))` for normal). Cursor `pointer` on drum cells only. `aria-label` includes state: `"Kick step 5 (accent)"`.
  - Grid remains demo-local markup (kit StepGrid is boolean-only; do NOT extend it here — note as potential kit follow-up for Phase 76).
  - Melody lanes (Bass, Lead): read-only cells derived from preset data — map `NoteEvent.time`/`ChordEvent.time` to step `Math.round(time * 4)`, display `NoteEvent.note` / `ChordEvent.label` in the cell (keep the current file's note-name cell rendering; drop its freq-to-note lookup — preset data now carries note names directly).
- [ ] **Step 3: Melodic voices — library idioms only.**
  - Per-note oscillators as now (one `Oscillator` per NoteEvent / per chord tone), but created with `createOscillator(ctx, { note: ev.note, type: voice.type, gain: voice.gain, envelope: voice.envelope })`. Envelopes have `sustain: 0` → notes self-terminate. The scheduled callback becomes exactly: `if (shouldPlay('bass')) osc.playIn(Math.max(0, t - ctx.currentTime))`. **DELETE all manual `getGainNode().gain.setValueAtTime/linearRampToValueAtTime` code — this is the screech trigger site.**
  - `bassSeq`/`leadSeq` via `useSequence(tp, { length: '2m', loop: true })` as now; re-scheduled on preset change (clear + re-add, dispose/recreate note oscillators — keep current `disposeBassNotes` pattern, generalized for both voices).
  - Stop/pause: `osc.stop()` over all note oscillators (core cancels lookahead-scheduled plays — round-3 guarantee).
- [ ] **Step 4: Mute/solo** — keep current M/S UI. Drums via `track.muted` as now; bass/lead via the `shouldPlay()` guard as now.
- [ ] **Step 5: Verify by hand.** `pnpm dev` → `examples/transport-sequencer`. Checklist: play from cold (no screech), all 5 presets audibly distinct and musical, swing knob at 0/55/100% audibly changes hat feel on Shuffle, cell editing audible next loop pass, accents audible (hat quarters louder), bar display wraps 1↔2, stop silences everything instantly, pause leaves no tails, BPM drag stays glitch-free.
- [ ] **Step 6: Gates + commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add docs/.vitepress/theme/components/TransportSequencerDemo.vue
git commit -m "feat(demos): rebuild transport sequencer as editable transport showcase"
```

---

### Task 7: E2E + loudness coverage

**Files:**
- Modify: `e2e/interactions.spec.ts` (existing `TransportSequencer page interactions` describe, line ~686)
- Modify: `e2e/loudness.spec.ts` (transport row — update trigger if needed; peak thresholds unchanged)

**Interfaces:**
- Consumes: Task 6 DOM hooks (`.step-cell`, `.active`, `.accent`, Knob `Swing`, preset `aria-pressed`).

- [ ] **Step 1: Update/extend interactions spec.** Keep existing passing assertions where still valid (play/stop, preset buttons, BPM). Add:

```typescript
test('drum cell click cycles rest → normal → accent → rest', async ({ page }) => {
  await gotoTransport(page) // existing helper/nav in the describe
  const cell = page.locator('.track-row', { hasText: 'Kick' }).locator('.step-cell').nth(1)
  await cell.click()
  await expect(cell).toHaveClass(/active/)
  await expect(cell).not.toHaveClass(/accent/)
  await cell.click()
  await expect(cell).toHaveClass(/accent/)
  await cell.click()
  await expect(cell).not.toHaveClass(/active/)
})

test('swing knob present and preset switch updates it', async ({ page }) => {
  await gotoTransport(page)
  // Knob renders its label; Shuffle preset should set it to 55%
  await page.getByRole('button', { name: /Shuffle/i }).click()
  await expect(page.getByText(/55\s*%/)).toBeVisible()
})

test('position display stays within loop (bar 1-2) while playing', async ({ page }) => {
  await gotoTransport(page)
  await page.getByRole('button', { name: /^Play$/i }).click()
  await page.waitForTimeout(5000) // > 1 loop at 112bpm... 2 bars ≈ 4.3s
  const display = await page.locator('.transport-sequencer-demo').getByLabel(/Transport position/).textContent()
  expect(display).toMatch(/^[12]:/)
})
```

(Adapt selectors to the describe's existing helpers; the block already navigates and inits audio — follow its established patterns, including any `page.waitForFunction` audio-ready guards.)

- [ ] **Step 2: Loudness row.** Confirm the transport-sequencer entry in `loudness.spec.ts` still triggers via its Play button and passes NO_CLIP/AUDIBLE with the new voices. Adjust only the trigger selector if it changed; thresholds stay.
- [ ] **Step 3: Run**

Run: `pnpm test:e2e`
Expected: all pass (Playwright starts docs dev server itself).

- [ ] **Step 4: Commit**

```bash
git add e2e/interactions.spec.ts e2e/loudness.spec.ts
git commit -m "test(e2e): transport sequencer editing, swing, loop coverage"
```

---

### Task 8: Docs + wrap-up

**Files:**
- Modify: `docs/examples/transport-sequencer.md`
- Modify: whichever guide page documents Transport/Sequence API (search `docs/` for `createTransport` — likely `docs/guide/` page; update inline API examples)
- Update: bead `ez-audio-a30`

- [ ] **Step 1: Rewrite demo page prose.** Structure: what Transport is (worker-backed musical clock) → multi-resolution track sync → swing (one knob vs hand-placed shuffle; call out that the Shuffle preset is straight 8ths + `transport.swing = 0.55`) → loop region → live BPM. Code samples:

```typescript
const transport = await createTransport({ bpm: 96 })
transport.loop = true
transport.loopEnd = '2m'
transport.swing = 0.55        // triplet shuffle from straight 8ths
transport.swingSubdivision = 1 / 8

kick.setPattern([1, 0, 0, 0, 0.7, 0, 0, 0]) // numbers = velocity; 0.7 = softer hit
kick.syncTo(transport, { noteType: 1 / 8 })
transport.on('loop', e => console.log(`loop ${e.detail.iteration}`))
transport.start()
```

- [ ] **Step 2: Guide page.** Add swing/loop/velocity sections to the Transport guide page with the same API surface. Typedoc regenerates from source JSDoc at build — verify `pnpm build` passes.
- [ ] **Step 3: Close out.** `bd update ez-audio-a30 --notes="<append: rework shipped, screech verdict recap>"`. Leave bead OPEN — closes after Seth re-listen (gate-2 protocol).
- [ ] **Step 4: Full gates + commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e && pnpm build`

```bash
git add docs/examples/transport-sequencer.md docs/guide/
git commit -m "docs(transport): swing, loop region, velocity guide + demo page rewrite"
```
