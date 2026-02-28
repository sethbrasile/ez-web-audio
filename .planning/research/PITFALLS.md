# Pitfalls Research: Effects & Transport Milestone

**Domain:** Adding built-in effects, LFO, transport/clock, sequencer, PolySynth, and GrainPlayer to an existing Web Audio library
**Researched:** 2026-02-28
**Confidence:** HIGH (verified with MDN official docs, Web Audio spec issues, and performance guide)

---

## Scope Note

This document is scoped to the **Effects & Transport milestone**. It focuses on pitfalls that arise specifically when:

1. Adding new audio features to an existing, working library
2. Adding a global transport that must coexist with per-track BeatTrack schedulers
3. Adding polyphony to a single-oscillator-per-instance system
4. Integrating granular synthesis without AudioWorklet (or with it)
5. Maintaining the existing connection chain: `source → filters → connections → gain → pan → destination`

General Web Audio pitfalls (ADSR retriggering, AudioParam automation, memory leaks from disconnected nodes) were covered in prior research. This document focuses on what's NEW and DIFFERENT about this milestone.

---

## Critical Pitfalls

Mistakes that cause audible artifacts, API breaking changes, or full rewrites.

---

### Pitfall 1: Global Transport That Fights Per-Track BeatTrack Schedulers

**What goes wrong:**
A global Transport is introduced but each BeatTrack already has its own private lookahead scheduler (25ms interval, 100ms lookahead). When the global transport starts and tries to drive BeatTrack timing, two schedulers compete. Beats fire twice, drift, or desync.

**Why it happens:**
The existing `BeatTrack.scheduler()` is self-contained with its own `timerID`, `nextBeatTime`, and `currentBeatIndex`. A new Transport class cannot simply call `playBeats()` on a BeatTrack without first disabling the BeatTrack's internal scheduler. Developers assume the Transport "takes over" automatically but the BeatTrack's internal scheduling loop keeps running.

**Root cause in the existing code:**
`BeatTrack.playBeats()` and `BeatTrack.playActiveBeats()` immediately start the internal scheduler. If Transport calls these, the BeatTrack manages its own clock. Transport then also schedules beats independently → double-fire.

**Consequences:**
- Beats fire twice (audible as flamming/double-hit)
- BPM appears doubled or halved
- Sync drifts when one scheduler's tick hits a late setTimeout
- Pause/resume from Transport doesn't affect already-running BeatTrack scheduler

**How to avoid:**
Design the Transport/BeatTrack relationship explicitly. Two valid architectures:

Option A — Transport-owned scheduling (recommended):
```typescript
// BeatTrack becomes a passive "sound source" registry
// Transport calls beatTrack._scheduleBeat(beatIndex, time) directly
// BeatTrack.playBeats() internally checks: if locked to transport, no-op

class BeatTrack {
  private _transportLocked = false

  lockToTransport(): void {
    // Stop internal scheduler if running
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }
    this._transportLocked = true
  }

  /** Called by Transport at audio-precise times */
  scheduleBeatAt(beatIndex: number, time: number): void {
    this.scheduleBeat(beatIndex, time) // existing private method
  }
}
```

Option B — Transport as coordinator, BeatTrack keeps scheduler:
Transport sets a shared `nextBeatTime` and `bpm` property on each registered BeatTrack. BeatTrack reads from transport instead of its own state. Risk: more coupling, harder to test independently.

**Warning signs:**
- Drum hits sound like flams (double-strike with 5-25ms gap)
- BPM is exactly double what was configured
- Stop/pause from one object doesn't affect the other
- Adding second BeatTrack causes timing chaos

**Phase to address:** Transport/Clock phase (first thing, before any sequencer work)

---

### Pitfall 2: Transport Resume Catches Up From Paused Time

**What goes wrong:**
When Transport is paused and resumed, `nextBeatTime` is still in the past. The lookahead scheduler immediately fires all missed beats in a burst to "catch up" to the current time. At 120 BPM this can mean dozens of beats firing in one scheduler tick.

**Why it happens:**
The existing BeatTrack already handles this correctly for itself:
```typescript
// From beat-track.ts resume():
// Reset nextBeatTime to current time to prevent scheduler catch-up:
// pausedBeatTime is in the past; restoring it would cause hundreds of beats to fire immediately
this.nextBeatTime = this.audioContext.currentTime
```

But a new Transport implementation might store the paused position as an absolute audio time and restore it on resume, then let the while-loop in `scheduler()` drain the backlog.

**Consequences:**
- Burst of beats fires on resume (sounds like machine gun)
- Performance spike that causes audio dropout
- Beat index jumps incorrectly

**How to avoid:**
Always reset `nextBeatTime` to `audioContext.currentTime` on resume, then advance from the correct beat index:
```typescript
resume(): void {
  if (this._pausedBeatIndex !== null) {
    this.nextBeatTime = this.audioContext.currentTime // critical
    this.currentBeatIndex = this._pausedBeatIndex
    this._pausedBeatIndex = null
    this.scheduler()
  }
}
```

**Warning signs:**
- Burst of sounds immediately on resume
- CPU spike on resume causing dropout
- Beat index wrong after resume

**Phase to address:** Transport/Clock phase

---

### Pitfall 3: LFO Connected to AudioParam Leaks When Sound Is Disposed

**What goes wrong:**
An LFO (OscillatorNode running at low frequency) is connected to an AudioParam of a Sound's gain or filter. When the Sound is disposed or replaced, the LFO OscillatorNode keeps running and stays connected to the now-dead AudioParam. It accumulates silently.

**Why it happens:**
`AudioParam.connect()` keeps the LFO node alive in the audio graph. The Sound's GainNode gets disconnected from the destination, but the LFO is still connected to its `gain` AudioParam — a different connection than node→node. Disconnecting the GainNode from downstream does NOT disconnect the LFO from the GainNode's parameter.

In the existing architecture, `BaseSound.dispose()` disconnects the connection chain but the LFO is an external AudioNode connected via `.connect(gainNode.gain)`. Nothing tracks this reverse dependency.

**Consequences:**
- LFO OscillatorNode runs indefinitely even after its Sound is gone
- Memory leak: each Sound disposal leaves orphaned LFO
- CPU waste: running OscillatorNodes have non-zero render cost
- Can accumulate hundreds of running oscillators in a long session

**How to avoid:**
The LFO must be registered with the Sound it modulates and stopped/disconnected on dispose:

```typescript
class LFO {
  private oscillator: OscillatorNode
  private connections: { param: AudioParam }[] = []

  connect(param: AudioParam): this {
    this.oscillator.connect(param)
    this.connections.push({ param })
    return this
  }

  dispose(): void {
    for (const { param } of this.connections) {
      try { this.oscillator.disconnect(param) } catch {}
    }
    this.connections = []
    this.oscillator.stop()
  }
}
```

Sound/Oscillator must also expose a way to register LFOs for cleanup:
```typescript
class BaseSound {
  private _lfos: LFO[] = []

  attachLFO(lfo: LFO): this {
    this._lfos.push(lfo)
    return this
  }

  dispose(): void {
    for (const lfo of this._lfos) lfo.dispose()
    this._lfos = []
    // ... existing dispose logic
  }
}
```

**Warning signs:**
- Chrome DevTools WebAudio panel shows growing oscillator count
- CPU usage creeps up after repeated Sound creation/disposal
- Memory profiler shows AudioNode count growing unboundedly

**Phase to address:** LFO phase (must be designed with disposal from the start)

---

### Pitfall 4: PolySynth Voice Leak — Voices Never Returned to Pool

**What goes wrong:**
PolySynth allocates new Oscillator instances for each note. Voices are "returned to pool" on note release, but if the user never calls `stop()` (or the release envelope hasn't finished), the voice stays allocated. With rapid playing or held notes, all voices are busy and new notes are silently dropped.

**Why it happens:**
The existing Oscillator has an async stop() with envelope release:
```typescript
// oscillator.ts stop():
this.audioSourceNode.stop(now + release + padding)
this._isPlaying = false
```

The OscillatorNode stops at `now + release`, but the PolySynth might return the voice to the pool when `_isPlaying` becomes false — before the audio node has actually finished outputting the release tail. If another note immediately steals the voice, the old release tail and new attack overlap, causing clicks.

**Consequences:**
- Clicks when two notes use same voice in rapid succession
- Silent notes when all voices busy
- Release tails cut off by voice stealing
- Race condition between JS voice pool and audio render thread timing

**How to avoid:**

1. Track voice readiness separately from `_isPlaying`:
```typescript
interface Voice {
  oscillator: Oscillator
  // Voice is not "free" until the release tail is done at the audio level
  releaseEndTime: number // audioContext time when safe to reuse
}

// Voice is free only when: !isPlaying AND audioContext.currentTime > releaseEndTime
function isVoiceFree(voice: Voice, now: number): boolean {
  return !voice.oscillator.isPlaying && now > voice.releaseEndTime
}
```

2. Voice stealing strategy: steal the voice in release phase that started earliest:
```typescript
function stealVoice(voices: Voice[], now: number): Voice {
  // First preference: voices already done
  const free = voices.find(v => isVoiceFree(v, now))
  if (free) return free

  // Second: voice farthest into release (closest to done)
  const releasing = voices
    .filter(v => !v.oscillator.isPlaying)
    .sort((a, b) => a.releaseEndTime - b.releaseEndTime)
  if (releasing.length) return releasing[0]

  // Last resort: oldest active voice
  return voices[0]
}
```

3. Hard-stop the stolen voice before reuse (with 10ms fade to prevent click):
```typescript
async function stealAndReuse(voice: Voice): Promise<Oscillator> {
  // Cancel release tail immediately with tiny fade
  await voice.oscillator.stopAt(audioContext.currentTime + 0.01)
  // Now safe to retrigger
  return voice.oscillator
}
```

**Warning signs:**
- Clicks when playing fast note runs
- Notes silently not playing at high polyphony counts
- Increasing CPU over time if voices never freed

**Phase to address:** PolySynth phase

---

### Pitfall 5: Built-In Effects Breaking the Existing Connection Chain

**What goes wrong:**
Built-in effects (Delay, Reverb, Distortion, etc.) are implemented as classes that create AudioNodes internally. When added to a Sound via `addEffect()`, the existing chain `source → effectChainInput → [effects] → gain → pan → destination` rewires incorrectly. The new effect's internal nodes bypass the gain/pan nodes, or the feedback loop of a delay effect gets connected after the gain node (so the feedback bypasses volume control).

**Why it happens:**
The existing effects adapter pattern expects effects to expose `{ input: AudioNode, output: AudioNode }`. Built-in effects that use multiple internal nodes (e.g., Delay = DelayNode + feedback GainNode + wet/dry GainNodes) need careful thought about which node is `input` and which is `output`. Getting this wrong causes:
- Feedback that doesn't respect master gain
- Wet/dry mix that's post-gain instead of pre-gain
- Double-connection of nodes already connected internally

**Consequences:**
- Delay feedback bypasses gain control (feedback at full volume even when gain is 0)
- Distortion applied after gain (should be before — ordering matters musically)
- Reverb wet signal not affected by mute

**How to avoid:**
All built-in effects must conform to the existing `Effect` interface with explicit `input` and `output` AudioNode properties:
```typescript
interface Effect {
  input: AudioNode  // Signal enters here
  output: AudioNode // Signal exits here
  bypass: boolean
  mix: number
}
```

Effect ordering rules (document these):
- Pre-gain effects: Distortion, EQ, Chorus (before gain node)
- Post-gain effects: Reverb, Delay (after gain node, so silence mutes them)
- The existing chain puts effects between `effectChainInput` and `gain`, so pre-gain is default

For delay feedback, the feedback loop must be entirely INSIDE the effect:
```typescript
class DelayEffect implements Effect {
  readonly input: GainNode   // external signal enters here
  readonly output: GainNode  // exits here to next in chain

  private delayNode: DelayNode
  private feedbackGain: GainNode  // internal, not exposed

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    this.delayNode = ctx.createDelay()
    this.feedbackGain = ctx.createGain()

    // Wet path: input → delay → output
    this.input.connect(this.delayNode)
    this.delayNode.connect(this.output)

    // Feedback: delay → feedbackGain → delay (fully internal)
    this.delayNode.connect(this.feedbackGain)
    this.feedbackGain.connect(this.delayNode)

    // Dry path: input → output (bypass)
    this.input.connect(this.output)
  }
}
```

**Warning signs:**
- Delay feedback sounds at full volume regardless of gain
- Muting a sound still produces reverb tail
- Effect sounds different when bypassed vs. chain removed entirely
- EQ not affecting the "right" part of the signal

**Phase to address:** Built-in effects phase (must verify each effect's routing)

---

### Pitfall 6: Convolution Reverb IR Buffer — Synchronous Buffer Assignment Blocks Audio Thread

**What goes wrong:**
Setting `ConvolverNode.buffer` after the node is already in the audio graph causes the browser to perform the FFT partitioning synchronously on the audio rendering thread. This can cause an audible dropout or glitch at the moment the IR is assigned.

**Why it happens:**
The Web Audio spec (section on ConvolverNode) notes that changing the buffer after node creation requires re-partitioning the impulse response. Some browsers do this on the audio thread. For large IR buffers (2+ seconds of stereo), this computation takes more than one render quantum (128 samples at 44.1kHz = ~3ms), causing a dropout.

**Consequences:**
- Audible glitch/click when reverb IR is changed live
- Audio dropout when loading reverb on a busy page
- Longer IR files = worse glitch

**How to avoid:**
1. Pre-create ConvolverNode with buffer before connecting to graph:
```typescript
class ReverbEffect implements Effect {
  private convolver: ConvolverNode

  async loadIR(url: string, ctx: AudioContext): Promise<void> {
    // Load and decode BEFORE creating the node
    const response = await fetch(url)
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer())

    // Create a NEW convolver with the buffer, then swap into chain
    const newConvolver = ctx.createConvolver()
    newConvolver.buffer = buffer // Set before connecting

    // Swap (brief crossfade to avoid click)
    this.swapConvolver(newConvolver)
  }
}
```

2. For IR switching at runtime, crossfade between two ConvolverNodes:
```typescript
private swapConvolver(newConvolver: ConvolverNode): void {
  const ctx = this.audioContext
  const now = ctx.currentTime

  // Fade out old, fade in new over 50ms
  this.dryGain.gain.setValueAtTime(1, now)
  this.dryGain.gain.linearRampToValueAtTime(0, now + 0.05)

  newConvolver.connect(this.wetGain)
  this.input.connect(newConvolver)

  setTimeout(() => {
    this.convolver.disconnect()
    this.convolver = newConvolver
  }, 100)
}
```

3. For initial load, always use OfflineAudioContext to pre-decode:
```typescript
// Decoding in offline context offloads from audio thread
const offlineCtx = new OfflineAudioContext(2, buffer.length, 44100)
const decoded = await offlineCtx.decodeAudioData(rawBuffer)
```

**Warning signs:**
- Click/pop when reverb is initialized or IR changes
- Audio dropout lasting exactly one render quantum
- Performance spike visible in Chrome DevTools at reverb load time

**Phase to address:** Built-in effects phase (Reverb specifically)

---

### Pitfall 7: Sequencer Musical Time Notation Parsed Incorrectly at Tempo Change

**What goes wrong:**
Musical time strings like `"4n"` (quarter note), `"8t"` (triplet eighth) are parsed to absolute seconds using the current BPM at parse time. When BPM changes, all already-scheduled events play at the wrong time because they were converted to fixed seconds when the sequence was defined.

**Why it happens:**
The naive approach is: `parseMusicTime("4n", 120) → 0.5 seconds`. Then the event is scheduled at `audioContext.currentTime + 0.5`. If BPM changes to 140, this scheduled event is already committed at 0.5 seconds — it doesn't recompute.

Tone.js solves this by keeping events in transport-time units and converting to absolute seconds only when scheduling. EZ Audio would need the same approach.

**Consequences:**
- Tempo changes take many beats to take effect on already-queued events
- Live tempo control appears broken
- Swing/groove offsets calculated wrong after BPM change

**How to avoid:**
Keep events in beat units, convert to seconds only at schedule time:
```typescript
interface SequenceEvent {
  beatOffset: number  // in beats, NOT seconds
  callback: (time: number) => void
}

class Sequencer {
  private events: SequenceEvent[] = []

  // Schedule based on current transport time and BPM
  private scheduleEvents(): void {
    const now = this.transport.currentBeat
    const secondsPerBeat = 60 / this.transport.bpm

    for (const event of this.events) {
      if (event.beatOffset >= now && event.beatOffset < now + this.lookaheadBeats) {
        const audioTime = this.audioContext.currentTime +
          (event.beatOffset - now) * secondsPerBeat  // Convert NOW
        event.callback(audioTime)
      }
    }
  }
}
```

**Warning signs:**
- Tempo slider feels "laggy" — changes take many beats to land
- Notes play late/early after BPM change
- Swing amount doesn't apply retroactively

**Phase to address:** Sequencer/Pattern phase

---

### Pitfall 8: GrainPlayer Without AudioWorklet — Main Thread Grain Scheduling

**What goes wrong:**
Granular synthesis requires scheduling hundreds of tiny audio buffers (grains) per second, each with random offset, pitch, pan, and envelope. Implementing this with `setTimeout` + `AudioBufferSourceNode` per grain causes main thread overload and timing jitter. At grain rates >10/sec the UI freezes; at 50+ grains/sec the audio dropouts begin.

**Why it happens:**
Each grain needs:
- New `AudioBufferSourceNode` (single-use)
- `playbackRate` set for pitch shift
- `start(time, offset, duration)` with exact audio-time scheduling
- Envelope GainNode
- Pan node for stereo spread

Creating and connecting 50 nodes per second with the main thread scheduler causes GC pressure and render jank.

**Consequences:**
- UI freezes during granular playback
- Grain density limited to ~10-20 grains/sec without glitches
- Click/pop artifacts from scheduling jitter
- Battery drain on mobile

**How to avoid:**
Two approaches, in order of effectiveness:

Option A — AudioWorklet (correct approach, but complex):
Move grain mixing to AudioWorklet processor. The worklet receives the AudioBuffer as SharedArrayBuffer and handles all grain scheduling internally at the audio render rate. Eliminates main-thread scheduling entirely.

Cost: AudioWorklet adds significant architecture complexity, cross-origin isolation requirements (COOP/COEP headers), and testing difficulty. The existing library explicitly listed AudioWorklet as out of scope.

Option B — Hybrid approach (pragmatic):
Keep main thread scheduling but use large grain sizes (50-200ms) and moderate density (5-20 grains/sec). At these parameters, main thread scheduling is feasible with the existing lookahead pattern:

```typescript
class GrainPlayer {
  private scheduleAheadTime = 0.3  // 300ms for grain scheduling
  private schedulerInterval = 50   // Check every 50ms

  private scheduleGrains(): void {
    const now = this.audioContext.currentTime

    while (this.nextGrainTime < now + this.scheduleAheadTime) {
      this.scheduleGrain(this.nextGrainTime)
      this.nextGrainTime += this.getGrainInterval()
    }

    this.timerID = setTimeout(() => this.scheduleGrains(), this.schedulerInterval)
  }

  private scheduleGrain(time: number): void {
    const source = this.audioContext.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this.getRandomizedPitch()

    // Small envelope via GainNode
    const env = this.audioContext.createGain()
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(1, time + this.grainAttack)
    env.gain.linearRampToValueAtTime(0, time + this.grainDuration - this.grainRelease)

    source.connect(env)
    env.connect(this.outputGain)

    const offset = this.getPosition() // current position + random spread
    source.start(time, offset, this.grainDuration)
    source.onended = () => { source.disconnect(); env.disconnect() }
  }
}
```

Document maximum safe grain density: <20 grains/sec for mobile, <50 for desktop.

**Warning signs:**
- UI frame rate drops during granular playback
- "Chirping" artifacts from timing jitter
- Mobile gets hot immediately
- Chrome shows long tasks in Performance timeline

**Phase to address:** GrainPlayer phase (must decide on AudioWorklet vs. pragmatic limits upfront)

---

### Pitfall 9: LFO Rate/Depth Parameter API Ambiguity

**What goes wrong:**
LFO is implemented with `rate` (Hz) and `depth` as raw AudioParam values. Users expect depth to be a multiplier (0-1) but it's applied as absolute gain on the modulation signal. An LFO modulating frequency with depth=1 causes ±1 Hz change — inaudible. Users expect depth=1 to mean "full range" (e.g., ±500 Hz for frequency vibrato).

**Why it happens:**
The LFO's OscillatorNode output is ±1 (full scale). When connected to an AudioParam, the connection adds the LFO's output to the existing value. Without scaling, connecting to frequency means ±1 Hz. The correct implementation requires scaling via a GainNode before the AudioParam connection, where gain = desired modulation depth in the target parameter's units.

Different parameters have different "natural" ranges:
- Gain: depth=1 might mean ±0.5 gain
- Frequency: depth=1 might mean ±50 Hz (one semitone at 440 Hz)
- Pan: depth=1 might mean ±1 (full sweep)

**Consequences:**
- LFO appears to have no effect (depth too small)
- LFO sounds "too extreme" (depth too large)
- API is confusing — users don't know what unit depth is in
- Breaking change required later to fix

**How to avoid:**
Design the API around normalized depth (0-1) and let the LFO know the target parameter type:

```typescript
class LFO {
  private depthGain: GainNode

  connectToGain(gainParam: AudioParam, depth: number): this {
    // depth 0-1 → ±depth amplitude change
    this.depthGain.gain.value = depth
    this.depthGain.connect(gainParam)
    return this
  }

  connectToFrequency(freqParam: AudioParam, depth: number, baseFreq: number): this {
    // depth 0-1 → ±(depth * baseFreq * 0.05) Hz (5% range)
    this.depthGain.gain.value = depth * baseFreq * 0.05
    this.depthGain.connect(freqParam)
    return this
  }

  connectToPan(panParam: AudioParam, depth: number): this {
    // depth 0-1 → ±depth pan
    this.depthGain.gain.value = depth
    this.depthGain.connect(panParam)
    return this
  }
}
```

Alternative: typed connect methods with semantic names:
```typescript
lfo.createTremolo(sound, { depth: 0.3 })       // Amplitude modulation
lfo.createVibrato(sound, { depth: 0.5 })        // Frequency modulation
lfo.createAutoPan(sound, { depth: 1.0 })        // Pan modulation
lfo.createAutoFilter(sound, { depth: 0.7 })     // Filter cutoff modulation
```

**Warning signs:**
- LFO connects but produces no audible effect
- Effect is there but extreme/subtle at wrong depth values
- Users ask "what is depth in units of?"

**Phase to address:** LFO phase (API design must be settled before implementation)

---

### Pitfall 10: Tab Backgrounding Throttles Transport Scheduler → Beat Drift

**What goes wrong:**
When the browser tab goes to background, `setTimeout` is throttled to 1-second intervals (or worse). The transport scheduler, which depends on setTimeout to check and schedule beats, stops updating. When the tab returns to foreground, the scheduler fires, discovers many beats have been "missed," and either: (a) fires them all in a burst, or (b) drops them, causing a gap.

**Why it happens:**
This is a known, documented limitation of the existing BeatTrack scheduler (noted in beat-track.ts comments). A global Transport makes this worse because it coordinates multiple BeatTracks. When the scheduler resumes, it must reconcile multiple tracks' timing.

**Consequences:**
- Sequenced music pauses when tab is backgrounded
- Burst of beats on return to foreground
- Multi-track desync (different tracks may have drifted different amounts)

**How to avoid:**

1. Document the limitation clearly (Transport doesn't play reliably in background tabs)
2. Detect tab visibility and handle gracefully:
```typescript
class Transport {
  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._wasPlayingWhenHidden = this.isPlaying
        // Let scheduler drift — audio thread is unaffected for in-flight events
      } else if (this._wasPlayingWhenHidden) {
        // Re-sync: reset nextBeatTime without catching up
        this.nextBeatTime = this.audioContext.currentTime
        this._reschedule()
      }
    })
  }
}
```

3. For background-critical use cases, suggest AudioWorklet (the worklet runs on audio thread, not throttled by visibility). Document this as the only reliable solution.

**Warning signs:**
- Music stops when switching tabs
- Beat burst on tab focus
- Multi-track desync when returning from background

**Phase to address:** Transport/Clock phase (must be documented even if not fully solved)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Parse musical time to seconds at definition time | Simple implementation | Tempo changes don't apply to queued events | Never — breaks live tempo control |
| LFO connected directly to AudioParam (no GainNode scaler) | Less code | Depth units ambiguous; impossible to normalize across parameter types | Never |
| Voice pool without release-end tracking | Simpler voice allocation | Clicks on voice steal; voices returned before release tail ends | Never |
| GrainPlayer with main-thread grain scheduling at high density | No AudioWorklet required | Hard CPU limit; glitches above ~20 grains/sec | Acceptable at low density (<20/sec) with documented limit |
| Global Transport as module-level singleton | Easy to share BPM everywhere | One transport per module, impossible to have two songs | Acceptable — matches Tone.js pattern; document it |
| Built-in effects mutating existing connection chain directly | Less abstraction | Breaking change when chain structure changes | Never — always use Effect interface |
| ConvolverNode created with buffer in constructor | Simple API | IR change mid-play causes audio thread glitch | Acceptable if IR is only set once |

---

## Integration Gotchas

Common mistakes when connecting new features to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| BeatTrack + Transport | Calling `playBeats()` while Transport is also scheduling | `lockToTransport()` method must disable internal BeatTrack scheduler |
| LFO + Oscillator | Connecting LFO to Oscillator's gain before calling `play()` | LFO must connect after `play()` since `setup()` creates a new GainNode each play |
| PolySynth + Envelope | Sharing one Envelope instance across all voices | Each voice needs its own Envelope instance (Envelope is stateful) |
| Built-in effects + `wrapEffect()` | Wrapping a built-in effect in EffectWrapper (double-wrapping) | Built-in effects already implement `Effect` interface — use directly |
| Sequencer + BeatTrack | Using both simultaneously for different tracks | Fine, but both must lock to same Transport for sync |
| GrainPlayer + Sound | Attempting to use Sound's `play()` for each grain | Grain playback must bypass Sound abstraction — use AudioBufferSourceNode directly |
| Transport + `audioContextAwareTimeout` | Using `window.setTimeout` in Transport scheduler | Must use existing `audioContextAwareTimeout` for consistency |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| New AudioNode per grain in GrainPlayer | UI freezes, audio dropout | Limit grain density; document max safe density | >20 grains/sec on mobile, >50 on desktop |
| LFO connecting to AudioParam without depthGain node | Inaudible or extreme modulation | Always use intermediate GainNode for scaling | Immediately (wrong values from day 1) |
| AudioParam event accumulation in Transport (scheduling many envelopes) | Performance degrades after hours of continuous play | `cancelScheduledValues()` before each rescheduling; node recreation at threshold | >1000 events/node (varies by browser) |
| ConvolverNode with long IR (3+ seconds) | Audio dropout on IR assignment | Set buffer before connecting node to graph | IR > ~1 second stereo on mobile |
| Many PolySynth voices with complex effects chains | CPU overload | Limit voice count; document recommended maximums | 16+ voices on mobile; 32+ on desktop |
| Transport scheduler without WebWorker | Tab throttling in background | Document limitation; detect visibility; handle gracefully | Immediately on tab switch |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Transport:** Often missing visibility-change handling — verify background tab behavior (beats stop or burst)
- [ ] **LFO:** Often missing disposal tracking — verify LFO nodes are stopped when attached Sound is disposed
- [ ] **LFO:** Often missing depth normalization — verify depth=0.5 sounds like "half effect" regardless of parameter type
- [ ] **PolySynth:** Often missing release-end tracking — verify no click when a voice is stolen mid-release
- [ ] **PolySynth:** Often missing voice limit enforcement — verify graceful behavior (silence, not crash) when all voices busy
- [ ] **GrainPlayer:** Often missing grain cleanup — verify `source.onended` disconnects grain nodes (memory leak if not)
- [ ] **GrainPlayer:** Often missing position bounds — verify playback position wraps at end of buffer (or loops, or stops)
- [ ] **Built-in Delay:** Often missing feedback disconnect on dispose — verify feedback GainNode is disconnected from DelayNode
- [ ] **Built-in Reverb:** Often missing IR buffer cleanup — verify AudioBuffer is dereferenced on dispose
- [ ] **Sequencer:** Often missing reschedule on BPM change — verify events already in lookahead window are re-timed
- [ ] **Transport + BeatTrack:** Often missing lockToTransport call — verify BeatTrack internal scheduler disabled when Transport takes over

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Transport fights BeatTrack scheduler (double-fire beats) | MEDIUM | Add `lockToTransport()` method; BeatTrack internal scheduler becomes no-op when locked |
| LFO leak discovered late | MEDIUM | Add `attachLFO()` to BaseSound; `dispose()` calls `lfo.dispose()`; retroactive fix is additive not breaking |
| PolySynth voice stealing clicks | LOW | Add `releaseEndTime` tracking to voice pool; tighten voice allocation logic |
| Musical time parsed at wrong point | HIGH | Requires Sequencer redesign — events must store beat offsets, not absolute seconds |
| GrainPlayer performance problems on mobile | LOW | Reduce `maxGrainDensity` limit; document the constraint |
| Built-in effect breaks connection chain | LOW | Verify effect exposes correct `input`/`output` nodes; add tests per effect |
| ConvolverNode IR glitch on load | LOW | Ensure buffer is set before connecting node; add note to factory function docs |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Transport vs. BeatTrack scheduler conflict | Transport/Clock phase | Test: create BeatTrack, lock to Transport, verify only one scheduler fires |
| Transport resume catch-up burst | Transport/Clock phase | Test: pause for 5 seconds, resume, verify no burst |
| LFO connected to dead AudioParam | LFO phase | Test: create Sound with LFO, dispose Sound, verify LFO oscillator is stopped |
| PolySynth voice leak / steal click | PolySynth phase | Test: play 20 rapid notes with 4-voice polyphony, verify no clicks or leaks |
| Effects breaking connection chain | Effects phase | Test: each effect with bypass toggle; verify routing before and after |
| ConvolverNode IR glitch | Effects phase (Reverb) | Test: load reverb with audio playing, verify no dropout |
| Musical time parsed at wrong BPM | Sequencer phase | Test: schedule events, change BPM mid-sequence, verify new BPM applies |
| GrainPlayer main-thread overload | GrainPlayer phase | Test: 25 grains/sec on mobile device; measure frame rate and CPU |
| LFO depth unit ambiguity | LFO phase | Test: depth=0.5 on gain and frequency both produce perceptually similar "half modulation" |
| Tab backgrounding drift | Transport/Clock phase | Test: play sequence, background tab for 5 seconds, return, verify timing |

---

## Sources

**Official (HIGH confidence):**
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio Performance and Debugging Notes](https://padenot.github.io/web-audio-perf/)
- [MDN ConvolverNode](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode)
- [MDN AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)

**Community (MEDIUM-HIGH confidence):**
- [A Tale of Two Clocks — Chris Wilson (web.dev)](https://web.dev/audio-scheduling/)
- [Tone.js Transport Wiki](https://github.com/Tonejs/Tone.js/wiki/Transport)
- [Tone.js Transport: Multiple Timelines Issue](https://github.com/Tonejs/Tone.js/issues/108)
- [Tone.js Sequence Re-schedule Bug](https://github.com/Tonejs/Tone.js/issues/936)
- [AudioWorklet Disaster Issue Thread](https://github.com/WebAudio/web-audio-api/issues/2632)
- [AudioWorklet Performance Pitfall (Case Study)](https://cprimozic.net/blog/webaudio-audioworklet-optimization/)
- [Web Audio API — Things I Learned the Hard Way](https://blog.szynalski.com/2014/04/web-audio-api/)
- [Reverb with Web Audio API](https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html)

**EZ Audio Source (HIGH confidence — actual codebase):**
- `src/beat-track.ts` — BeatTrack scheduler implementation and backgrounding comment
- `src/oscillator.ts` — single-use OscillatorNode pattern; voice lifecycle
- `src/envelope.ts` — ADSR retriggering; cancelAndHoldAtTime usage
- `src/effects/effect-wrapper.ts` — Effect interface; wet/dry routing pattern

---

*Pitfalls research for: Effects & Transport milestone — EZ Web Audio*
*Researched: 2026-02-28*
