# Phase 4: Composition Features - Research

**Researched:** 2026-01-31
**Domain:** Web Audio API composition (layered sounds, beat timing, crossfading)
**Confidence:** HIGH

## Summary

This phase adds three composition systems to ez-web-audio: LayeredSound for simultaneous multi-voice playback, BeatTrack timing control (stop/pause/tempo changes), and crossfade utilities for smooth track transitions. All leverage native Web Audio API scheduling and AudioParam automation with zero dependencies.

The Web Audio API's clock-based scheduling system (audioContext.currentTime) enables microsecond-precision synchronization across multiple audio sources. The established pattern is "lookahead scheduling" (100ms ahead, 25ms intervals) for resilient timing. Equal-power crossfading uses trigonometric curves (cos/sin) to maintain constant perceived loudness.

Key architectural insight: AudioBufferSourceNode instances are single-use and self-cleaning via onended callbacks. LayeredSound should create fresh source nodes per play (like Sound), allowing reusability. BeatTrack already exists but needs stop/pause methods and tempo change support via rescheduling.

**Primary recommendation:** Implement LayeredSound as composition wrapper that synchronizes multiple Sound/Oscillator instances to audioContext.currentTime, extend BeatTrack with stop/pause using WeakMap state tracking, and create standalone crossfade() function using equal-power curve with AudioParam automation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Web Audio API | - | Layered sync, scheduling, crossfading | Zero dependencies maintained, microsecond timing precision |
| AudioContext.currentTime | - | Synchronization clock | Hardware-based clock, avoids JavaScript timer drift |
| AudioParam automation | - | Crossfade curves, scheduled changes | Native scheduling, runs on audio thread (glitch-free) |
| EventTarget pattern | Native | LayeredSound event emission | Already used in BaseSound (Phase 1) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WeakMap | ES2015+ | BeatTrack playback state | Per-instance state without memory leaks |
| requestAnimationFrame | Native | Position tracking (Track pattern) | Already used in Track for offset updates |
| setTimeout (audio-aware) | Native | BeatTrack beat scheduling | Codebase has audioContextAwareTimeout utility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Equal-power curve | Linear crossfade | Linear causes ~3dB volume dip at 50% crosspoint; equal-power maintains constant loudness |
| Lookahead scheduling | Direct setTimeout | setTimeout drifts from audio clock; lookahead with audioContext.currentTime prevents glitches |
| audioContext.currentTime | Date.now() or performance.now() | JavaScript clocks run on main thread, audio clock on audio thread - prevents sync issues |
| Composition pattern | LayeredSound extends BaseSound | Composition allows mixing heterogeneous types (Sound + Oscillator); inheritance locks to single type |

**Installation:**
```bash
# No runtime dependencies needed (native Web Audio API)
# Uses existing codebase patterns: EventTarget, audioContextAwareTimeout
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── layered-sound.ts       # LayeredSound class managing synchronized playback
├── beat-track.ts          # Extend existing with stop/pause/tempo change
├── utils/
│   └── crossfade.ts       # Standalone crossfade function (tree-shakeable)
└── index.ts               # Export createLayeredSound, crossfade functions
```

### Pattern 1: Exact Synchronization via audioContext.currentTime
**What:** All layers start at precisely the same audioContext.currentTime value for exact sync
**When to use:** LayeredSound.play() - ensures no per-layer offset drift
**Example:**
```typescript
// From CONTEXT.md: "All layers start at exactly the same audioContext.currentTime"
export class LayeredSound extends EventTarget {
  async play(): Promise<void> {
    const startTime = this.audioContext.currentTime

    // All layers use SAME start time (exact sync, no drift)
    await Promise.all(
      this.layers.map(layer => layer.playAt(startTime))
    )

    this.emit('play', { time: startTime, source: this })
  }
}
```
**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling), [MDN BaseAudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)

### Pattern 2: Independent Layer End Events
**What:** Each layer emits its own 'end' event, LayeredSound ends when last layer finishes
**When to use:** Handling layers with different durations (e.g., bass line + short melody)
**Example:**
```typescript
// Track when each layer ends, emit LayeredSound 'end' when all complete
private setupLayerEndHandlers(): void {
  const endedLayers = new Set<Sound | Oscillator>()

  this.layers.forEach(layer => {
    layer.addEventListener('end', () => {
      endedLayers.add(layer)

      // Emit LayeredSound 'end' when last layer finishes
      if (endedLayers.size === this.layers.length) {
        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: Math.max(...this.layers.map(l => l.duration.raw))
        })
      }
    })
  })
}
```
**Source:** CONTEXT.md user decision, codebase src/base-sound.ts onended pattern (lines 383-396)

### Pattern 3: Lookahead Scheduling for Beat Events
**What:** Schedule beat events 100ms ahead with 25ms check interval for resilient timing
**When to use:** BeatTrack beat emission - prevents missed beats on slow machines
**Example:**
```typescript
// Pattern from Chris Wilson's "A Tale of Two Clocks"
export class BeatTrack {
  private scheduleAheadTime = 0.1  // 100ms lookahead
  private schedulerInterval = 25   // 25ms check interval
  private nextBeatTime = 0
  private timerID: number | null = null

  private scheduler(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule all beats within lookahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeat, this.nextBeatTime)
      this.advanceToNextBeat()  // Updates nextBeatTime based on current tempo
    }

    this.timerID = setTimeout(
      () => this.scheduler(),
      this.schedulerInterval
    )
  }

  private scheduleBeat(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex]
    if (beat.active) {
      this.play() // Schedule sound at exact 'time'

      // Emit beat event (can use for UI sync)
      this.emit('beat', {
        time,
        beatIndex,
        source: this
      })
    }
  }
}
```
**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling), [MDN Advanced techniques: Creating and sequencing audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)

### Pattern 4: Equal-Power Crossfade Curve
**What:** Use cos/sin curves to maintain constant perceived loudness during crossfade
**When to use:** crossfade() function - prevents volume dip at 50% mix point
**Example:**
```typescript
// Equal-power crossfade implementation
export async function crossfade(
  fromTrack: Track,
  toTrack: Track,
  duration: number
): Promise<void> {
  const audioContext = fromTrack.audioContext
  const startTime = audioContext.currentTime
  const endTime = startTime + duration

  // Equal-power curves: cos for fade-out, sin for fade-in
  // Maintains constant power: cos²(x) + sin²(x) = 1
  const fromGain = fromTrack.gainNode
  const toGain = toTrack.gainNode

  // From track: fade out (1 → 0)
  fromGain.gain.setValueAtTime(1, startTime)
  fromGain.gain.setValueCurveAtTime(
    generateEqualPowerCurve('out', 256),  // cos curve
    startTime,
    duration
  )

  // To track: fade in (0 → 1)
  toGain.gain.setValueAtTime(0, startTime)
  toGain.gain.setValueCurveAtTime(
    generateEqualPowerCurve('in', 256),   // sin curve
    startTime,
    duration
  )

  // Start destination track if not already playing
  if (!toTrack.isPlaying) {
    await toTrack.play()
  }

  // Stop source track after fade completes
  setTimeout(() => {
    fromTrack.stop()
  }, duration * 1000)
}

function generateEqualPowerCurve(
  direction: 'in' | 'out',
  length: number
): Float32Array {
  const curve = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const percent = i / (length - 1)
    const angle = percent * 0.5 * Math.PI
    curve[i] = direction === 'in'
      ? Math.sin(angle)   // fade in: 0 → 1
      : Math.cos(angle)   // fade out: 1 → 0
  }
  return curve
}
```
**Source:** [Web Audio API book - Crossfading](https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch03.html), [GitHub notthetup/crossfade](https://github.com/notthetup/crossfade), [Tone.js CrossFade](https://tonejs.github.io/docs/14.7.58/CrossFade)

### Pattern 5: Tempo Change via Rescheduling
**What:** Tempo changes take effect on next scheduled beat by updating beat interval calculation
**When to use:** BeatTrack.setTempo() during playback
**Example:**
```typescript
export class BeatTrack {
  private currentTempo: number = 120

  setTempo(bpm: number): void {
    // From CONTEXT.md: "Tempo changes supported during playback —
    // setTempo() takes effect on next beat"
    this.currentTempo = bpm

    // Next beat interval recalculated using new tempo
    // No need to reschedule already-scheduled beats
    // (they're within lookahead window, will play at old tempo)
  }

  private advanceToNextBeat(): void {
    // Calculate beat duration from CURRENT tempo
    // http://bradthemad.org/guitar/tempo_explanation.php
    const beatDuration = (240 * this.noteType) / this.currentTempo
    this.nextBeatTime += beatDuration
    this.currentBeat = (this.currentBeat + 1) % this.beats.length
  }
}
```
**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling) - tempo change section, [Understanding The Web Audio Clock](https://sonoport.github.io/web-audio-clock.html)

### Pattern 6: Graceful Layer Loading Failure
**What:** If a layer fails to load, play available layers and emit warning event
**When to use:** LayeredSound construction/loading - graceful degradation
**Example:**
```typescript
export class LayeredSound extends EventTarget {
  private layers: (Sound | Oscillator)[]
  private failedLayers: { index: number; error: Error }[] = []

  constructor(
    private audioContext: AudioContext,
    layerSources: (Sound | Oscillator)[]
  ) {
    super()
    this.layers = layerSources.filter((layer, index) => {
      // From CONTEXT.md: "If a layer fails to load, play available
      // layers anyway and emit warning event"
      if (layer === null || layer === undefined) {
        this.failedLayers.push({ index, error: new Error('Layer is null') })
        return false
      }
      return true
    })

    if (this.failedLayers.length > 0) {
      this.emit('warning', {
        message: `${this.failedLayers.length} layer(s) failed to load`,
        failedLayers: this.failedLayers,
        source: this
      })
    }
  }
}
```
**Source:** CONTEXT.md user decision, [LogRocket Guide to graceful degradation](https://blog.logrocket.com/guide-graceful-degradation-web-development/)

### Pattern 7: Pause/Resume with State Preservation
**What:** Stop cuts immediately, pause preserves beat position for resume
**When to use:** BeatTrack.pause() / BeatTrack.resume() - consistent with Track pattern
**Example:**
```typescript
export class BeatTrack {
  private pausedBeatIndex: number | null = null
  private pausedBeatTime: number | null = null

  pause(): void {
    // From CONTEXT.md: "Pause preserves beat position — resume()
    // continues from paused beat (consistent with Track)"
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.pausedBeatIndex = this.currentBeat
    this.pausedBeatTime = this.nextBeatTime

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
      beatIndex: this.currentBeat
    })
  }

  resume(): void {
    if (this.pausedBeatIndex !== null) {
      this.currentBeat = this.pausedBeatIndex
      this.nextBeatTime = this.pausedBeatTime ?? this.audioContext.currentTime

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        beatIndex: this.currentBeat
      })

      this.scheduler() // Restart lookahead scheduler

      this.pausedBeatIndex = null
      this.pausedBeatTime = null
    }
  }

  stop(): void {
    // From CONTEXT.md: "Stop cuts immediately — no waiting for
    // current beat to finish"
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.currentBeat = 0
    this.nextBeatTime = 0
    this.pausedBeatIndex = null
    this.pausedBeatTime = null

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this
    })
  }
}
```
**Source:** Codebase src/track.ts pause/resume pattern (lines 74-117), CONTEXT.md user decisions

### Anti-Patterns to Avoid
- **Using Date.now() or performance.now() for sync:** These run on JavaScript main thread, Web Audio clock runs on audio thread - causes drift and glitches
- **Linear crossfade curves:** Creates 3dB volume dip at 50% crosspoint - use equal-power (cos/sin) instead
- **Scheduling beats one-at-a-time without lookahead:** Missed beats on slow machines - use 100ms lookahead with 25ms scheduler interval
- **Storing source node references in LayeredSound:** Source nodes are single-use and self-cleaning - create fresh per play() like Sound does
- **Rescheduling already-scheduled beats on tempo change:** Already-scheduled events can't be unscheduled - let them play, new tempo applies to future beats
- **Hard layer count limits:** User decision is soft limit (warn at 8+) - allow any count, warn about performance implications

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio synchronization | setTimeout loops | audioContext.currentTime + lookahead | Hardware clock precision, no JavaScript drift |
| Crossfade curves | Linear interpolation | Equal-power (cos/sin) curves | Prevents volume dip, constant perceived loudness |
| Beat scheduling | setInterval with BPM math | Lookahead scheduler pattern | Resilient to main thread lag, precise timing |
| Event timing | JavaScript timestamps | AudioParam automation with currentTime | Runs on audio thread, sub-sample accuracy |
| Layer end detection | Polling isPlaying flags | onended event handlers | Native, efficient, no timer overhead |
| State management | Global variables | WeakMap for per-instance state | No memory leaks, automatic cleanup |

**Key insight:** Web Audio API provides hardware-precise timing and automated scheduling. Custom timing solutions introduce drift, glitches, and complexity.

## Common Pitfalls

### Pitfall 1: JavaScript Timer Drift from Audio Clock
**What goes wrong:** Using setTimeout/setInterval for beat timing causes audible drift and glitches
**Why it happens:**
- JavaScript timers run on main thread, audio processing on separate audio thread
- Main thread can be blocked by layout, rendering, garbage collection
- Audio clock is hardware-based (crystal oscillator), JavaScript clock is software-based
**How to avoid:**
- Use audioContext.currentTime as single source of truth
- Schedule audio events to currentTime, not Date.now()
- Use setTimeout only for lookahead checks (25ms interval), not for audio timing
- All audio parameter changes via AudioParam.setValueAtTime(value, audioContext.currentTime)
**Warning signs:**
- Beat timing drifts over time
- Audible stuttering or missed beats
- Timing feels "loose" or imprecise
- Sync issues between layers

**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling), [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

### Pitfall 2: Linear Crossfade Volume Dip
**What goes wrong:** Using linear gain interpolation creates audible volume drop at midpoint
**Why it happens:**
- Human hearing perceives loudness logarithmically, not linearly
- At 50% crosspoint with linear fade: each track at 0.5 gain
- Combined power: 0.5² + 0.5² = 0.5 (not 1.0) = ~3dB drop
- Equal-power: cos²(45°) + sin²(45°) = 0.5 + 0.5 = 1.0 (constant)
**How to avoid:**
- Use equal-power curves: cos(x) for fade-out, sin(x) for fade-in
- Angle range: 0 to π/2 (0° to 90°)
- Formula: `gainOut = cos(percent * π/2)`, `gainIn = sin(percent * π/2)`
- Use AudioParam.setValueCurveAtTime() with pre-generated curve
**Warning signs:**
- Volume dips during crossfade
- Crossfade sounds "hollow" at midpoint
- Listener notices transition

**Source:** [Web Audio API book - Crossfading](https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch03.html), [KVR Forum: Equal Power Crossfading](https://www.kvraudio.com/forum/viewtopic.php?t=347151)

### Pitfall 3: Voice Pooling Without Cleanup
**What goes wrong:** Creating layers without cleanup causes memory leaks and performance degradation
**Why it happens:**
- AudioBufferSourceNode holds references until manually disconnected
- Event listeners prevent garbage collection
- Accumulating nodes consume memory and CPU
**How to avoid:**
- Use onended callback for automatic cleanup (codebase pattern in Sound)
- Disconnect nodes after playback: `node.disconnect(); node.onended = null`
- Don't store source node references unnecessarily - let them garbage collect
- Follow "fire and forget" pattern for one-shot sounds
- Soft limit on concurrent layers (warn at 8+, allow more)
**Warning signs:**
- Memory usage grows over time
- Performance degrades with each play
- DevTools shows accumulating AudioNodes
- Mobile devices struggle after extended use

**Source:** [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode), [Web Audio Performance Notes](https://padenot.github.io/web-audio-perf/), codebase src/sound.ts cleanup pattern (lines 56-64)

### Pitfall 4: Rescheduling Already-Scheduled Events
**What goes wrong:** Attempting to change tempo by canceling future beats causes silence or errors
**Why it happens:**
- Web Audio API: "Once you've scheduled sound in the future, there is no way to unschedule that future playback event"
- AudioParam events can be canceled, but source.start() cannot
- Lookahead scheduler may have already scheduled beats within 100ms window
**How to avoid:**
- Don't try to cancel scheduled beats on tempo change
- Let already-scheduled beats play at old tempo
- New tempo takes effect for beats scheduled AFTER the change
- Tempo change latency = lookahead window (typically 100ms)
- For immediate tempo change, stop and restart with new tempo
**Warning signs:**
- Silence after tempo change
- TypeError: invalid state
- Beats play at wrong tempo briefly
- Tempo change feels delayed

**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling), [O'Reilly Web Audio API - Chapter 2](https://www.oreilly.com/library/view/web-audio-api/9781449332679/ch02.html)

### Pitfall 5: Mixing Playable Types in Collection Ops
**What goes wrong:** Calling pauseAll on mixed Sound/Track array causes TypeError (Sound has no pause method)
**Why it happens:**
- Playable interface only guarantees play/stop
- pause() is Track-specific extension
- TypeScript can't enforce method availability at runtime for generic arrays
**How to avoid:**
- Type guard: check for pause method before calling: `if ('pause' in track)`
- Document that pauseAll only works on Track instances
- LayeredSound: accept only Playable & Connectable (both Sound and Oscillator implement)
- Runtime validation with helpful errors: "Layer X does not implement required methods"
**Warning signs:**
- TypeError: X.pause is not a function
- Collection utilities fail inconsistently
- Mixed array types cause runtime errors

**Source:** Codebase src/interfaces/playable.ts and track.ts, Phase 3 research collection utilities pattern

### Pitfall 6: Crossfade Without Gain Node Access
**What goes wrong:** Attempting to crossfade Sounds without exposed gainNode causes indirect manipulation
**Why it happens:**
- Crossfade needs direct AudioParam access for automation
- Some abstractions hide underlying gain nodes
- Using changeGainTo() schedules immediate value, not curve
**How to avoid:**
- Expose gainNode as public property (codebase already does in BaseSound)
- Use gainNode.gain.setValueCurveAtTime() for smooth curves
- Don't use update('gain').to(x) for crossfades - that's for instant/scheduled values
- crossfade() function requires Tracks with accessible gainNode
**Warning signs:**
- Crossfades sound stepped or glitchy
- Can't create smooth curves
- Have to implement own gain envelope

**Source:** Codebase src/base-sound.ts gainNode exposure (line 29), [MDN AudioParam.setValueCurveAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime)

## Code Examples

Verified patterns from codebase and official sources:

### LayeredSound Implementation
```typescript
// src/layered-sound.ts
export interface LayeredSoundOptions {
  name?: string
  warnLayerCount?: number  // Default: 8
}

export class LayeredSound extends EventTarget implements Playable {
  private layers: (Sound | Oscillator)[]
  private failedLayers: { index: number; error: Error }[] = []
  public name: string

  constructor(
    private audioContext: AudioContext,
    layers: (Sound | Oscillator)[],
    opts?: LayeredSoundOptions
  ) {
    super()
    this.name = opts?.name || ''

    // Filter out null/undefined layers (graceful degradation)
    this.layers = layers.filter((layer, index) => {
      if (!layer) {
        this.failedLayers.push({
          index,
          error: new Error(`Layer ${index} is null/undefined`)
        })
        return false
      }
      return true
    })

    // Soft limit warning
    const warnThreshold = opts?.warnLayerCount ?? 8
    if (this.layers.length >= warnThreshold) {
      console.warn(
        `LayeredSound "${this.name}" has ${this.layers.length} layers. ` +
        `High layer counts may impact performance on some devices.`
      )
    }

    if (this.failedLayers.length > 0) {
      this.emit('warning', {
        message: `${this.failedLayers.length} layer(s) failed to load`,
        failedLayers: this.failedLayers,
        source: this
      })
    }
  }

  // Individual layer access for runtime control
  getLayer(index: number): Sound | Oscillator | undefined {
    return this.layers[index]
  }

  get layerCount(): number {
    return this.layers.length
  }

  async play(): Promise<void> {
    const startTime = this.audioContext.currentTime

    // All layers start at EXACTLY same time (exact sync)
    await Promise.all(
      this.layers.map(layer => layer.playAt(startTime))
    )

    this.emit('play', { time: startTime, source: this })

    // Track when each layer ends
    this.setupLayerEndTracking()
  }

  async stop(): Promise<void> {
    await Promise.all(this.layers.map(layer => layer.stop()))
    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this
    })
  }

  // Master gain/pan controls affecting all layers
  setGain(value: number): void {
    this.layers.forEach(layer => layer.changeGainTo(value))
  }

  setPan(value: number): void {
    this.layers.forEach(layer => layer.changePanTo(value))
  }

  private setupLayerEndTracking(): void {
    const endedLayers = new Set<Sound | Oscillator>()

    const handleEnd = (layer: Sound | Oscillator) => {
      endedLayers.add(layer)

      // Emit when last layer finishes
      if (endedLayers.size === this.layers.length) {
        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: Math.max(...this.layers.map(l => l.duration.raw))
        })
      }
    }

    this.layers.forEach(layer => {
      layer.once('end', () => handleEnd(layer))
    })
  }

  // EventTarget type-safe overrides (same pattern as BaseSound)
  override addEventListener<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options)
  }

  protected emit<K extends keyof LayeredSoundEventMap>(
    type: K,
    detail: LayeredSoundEventMap[K]['detail']
  ): void {
    const event = new CustomEvent(type, { detail })
    this.dispatchEvent(event)
  }

  on<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener)
    return this
  }

  once<K extends keyof LayeredSoundEventMap>(
    type: K,
    listener: (event: LayeredSoundEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }
}
```
**Source:** CONTEXT.md user decisions, codebase src/base-sound.ts event pattern

### Crossfade Utility
```typescript
// src/utils/crossfade.ts
export async function crossfade(
  fromTrack: Track,
  toTrack: Track,
  duration: number
): Promise<void> {
  // From CONTEXT.md: "If destination already playing, fade its volume
  // up from current position (don't restart)"
  const isToTrackPlaying = toTrack.isPlaying

  const audioContext = fromTrack.audioContext
  const startTime = audioContext.currentTime

  // Generate equal-power curves
  const curveLength = 256  // Standard curve resolution
  const fadeOutCurve = generateEqualPowerCurve('out', curveLength)
  const fadeInCurve = generateEqualPowerCurve('in', curveLength)

  // Access gain nodes directly (public in BaseSound)
  const fromGain = fromTrack.gainNode.gain
  const toGain = toTrack.gainNode.gain

  // Fade out source track
  fromGain.setValueAtTime(fromGain.value, startTime)
  fromGain.setValueCurveAtTime(fadeOutCurve, startTime, duration)

  // Fade in destination track
  if (isToTrackPlaying) {
    // Already playing - fade up from current volume
    toGain.setValueAtTime(toGain.value, startTime)
  } else {
    // Not playing - start from 0
    toGain.setValueAtTime(0, startTime)
    await toTrack.play()
  }
  toGain.setValueCurveAtTime(fadeInCurve, startTime, duration)

  // Stop source track after fade completes (fire and forget)
  setTimeout(async () => {
    await fromTrack.stop()
    // Reset gain to 1.0 for future playback
    fromGain.setValueAtTime(1.0, audioContext.currentTime)
  }, duration * 1000)
}

function generateEqualPowerCurve(
  direction: 'in' | 'out',
  length: number
): Float32Array {
  const curve = new Float32Array(length)

  for (let i = 0; i < length; i++) {
    const percent = i / (length - 1)
    const angle = percent * 0.5 * Math.PI  // 0 to π/2

    // Equal-power: cos²(x) + sin²(x) = 1
    curve[i] = direction === 'in'
      ? Math.sin(angle)   // 0 → 1
      : Math.cos(angle)   // 1 → 0
  }

  return curve
}
```
**Source:** [Web Audio API book - Crossfading](https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch03.html), CONTEXT.md user decisions

### BeatTrack Stop/Pause/Tempo Extensions
```typescript
// src/beat-track.ts (extend existing class)
export class BeatTrack extends Sampler {
  // Lookahead scheduling state
  private scheduleAheadTime = 0.1  // 100ms lookahead
  private schedulerInterval = 25   // 25ms check interval
  private nextBeatTime = 0
  private currentBeatIndex = 0
  private timerID: number | null = null
  private currentTempo: number = 120

  // Pause state
  private pausedBeatIndex: number | null = null
  private pausedBeatTime: number | null = null

  playBeats(bpm: number, noteType: number): void {
    this.currentTempo = bpm
    this.noteType = noteType
    this.nextBeatTime = this.audioContext.currentTime
    this.currentBeatIndex = 0
    this.scheduler()
  }

  stop(): void {
    // From CONTEXT.md: "Stop cuts immediately — no waiting for
    // current beat to finish"
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.currentBeatIndex = 0
    this.nextBeatTime = 0
    this.pausedBeatIndex = null
    this.pausedBeatTime = null

    this.emit('stop', {
      time: this.audioContext.currentTime,
      source: this
    })
  }

  pause(): void {
    if (this.timerID !== null) {
      clearTimeout(this.timerID)
      this.timerID = null
    }

    this.pausedBeatIndex = this.currentBeatIndex
    this.pausedBeatTime = this.nextBeatTime

    this.emit('pause', {
      time: this.audioContext.currentTime,
      source: this,
      beatIndex: this.currentBeatIndex
    })
  }

  resume(): void {
    if (this.pausedBeatIndex !== null) {
      this.currentBeatIndex = this.pausedBeatIndex
      this.nextBeatTime = this.pausedBeatTime ?? this.audioContext.currentTime

      this.emit('resume', {
        time: this.audioContext.currentTime,
        source: this,
        beatIndex: this.currentBeatIndex
      })

      this.scheduler()

      this.pausedBeatIndex = null
      this.pausedBeatTime = null
    }
  }

  setTempo(bpm: number): void {
    // From CONTEXT.md: "Tempo changes supported during playback —
    // setTempo() takes effect on next beat"
    this.currentTempo = bpm
    // Next beat interval will use new tempo automatically
  }

  private scheduler(): void {
    const currentTime = this.audioContext.currentTime

    // Schedule all beats within lookahead window
    while (this.nextBeatTime < currentTime + this.scheduleAheadTime) {
      this.scheduleBeat(this.currentBeatIndex, this.nextBeatTime)
      this.advanceToNextBeat()
    }

    this.timerID = setTimeout(
      () => this.scheduler(),
      this.schedulerInterval
    )
  }

  private scheduleBeat(beatIndex: number, time: number): void {
    const beat = this.beats[beatIndex]

    if (beat.active) {
      // Play sound at scheduled time
      this.playAt(time)
    }

    // Emit beat event for UI sync, even if inactive (rest)
    this.emit('beat', {
      time,
      beatIndex,
      active: beat.active,
      source: this
    })
  }

  private advanceToNextBeat(): void {
    // Calculate beat duration from CURRENT tempo (allows mid-playback changes)
    const beatDuration = (240 * this.noteType) / this.currentTempo
    this.nextBeatTime += beatDuration
    this.currentBeatIndex = (this.currentBeatIndex + 1) % this.beats.length
  }
}
```
**Source:** [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling), codebase src/track.ts pause/resume pattern, CONTEXT.md user decisions

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setTimeout for beat timing | Lookahead scheduler with audioContext.currentTime | ~2013 Chris Wilson article | Eliminates drift, handles main thread lag |
| Linear crossfade | Equal-power (cos/sin) curves | Audio engineering standard | Constant perceived loudness, no volume dip |
| Polling for layer end detection | onended event callbacks | Web Audio API v1 spec | No timer overhead, automatic cleanup |
| Global BPM state | Per-instance tempo tracking | Best practice | Supports multiple BeatTracks at different tempos |
| Fail-fast layer loading | Graceful degradation with warnings | Modern UX patterns | Better user experience, resilient to partial failures |

**Deprecated/outdated:**
- **setTimeout-only timing:** Web Audio clock required for precise sync
- **Linear gain interpolation for crossfades:** Equal-power is correct approach
- **Storing source node references:** Fire-and-forget with automatic GC is best practice
- **Synchronous layer operations:** async/await for playback allows Promise.all parallel start

## Open Questions

Things that couldn't be fully resolved:

1. **BeatTrack event emission timing: lookahead vs at-play-time?**
   - What we know: Chris Wilson's pattern emits events when scheduled (lookahead), others emit when actually played
   - What's unclear: Which approach better serves UI sync use case (e.g., drum machine step indicators)
   - Recommendation: Emit on schedule (within lookahead), include scheduled time in event detail. UI can sync to scheduled time. Benefits: consistent with Web Audio API scheduling philosophy, UI gets advance notice for smooth animations

2. **LayeredSound reusability: clear per-play or persistent state?**
   - What we know: Sound is reusable (creates fresh source per play). LayeredSound could follow same pattern
   - What's unclear: Whether layer end tracking state should be cleared per-play or persist
   - Recommendation: Clear end tracking on each play (fresh Set), allowing multiple play() calls like Sound. Emit new 'end' event per playback cycle

3. **Crossfade curve resolution: 256 samples sufficient?**
   - What we know: Examples use 256-length Float32Array for curves. Higher = smoother but more memory
   - What's unclear: Whether 256 provides sufficient smoothness for all crossfade durations
   - Recommendation: Start with 256 (standard in examples). Make configurable if users report audible steps in long crossfades (>10 sec)

4. **Warning threshold for layer count: 8 vs other value?**
   - What we know: User decision is "warn at 8+" but exact threshold is Claude's discretion
   - What's unclear: Actual device limits vary wildly (desktop 1000+, mobile 32+)
   - Recommendation: Default to 8 (conservative mobile target), make configurable via LayeredSoundOptions. Log warning only (don't throw), include device recommendation in message

## Sources

### Primary (HIGH confidence)
- [web.dev A Tale of Two Clocks](https://web.dev/articles/audio-scheduling) - Definitive guide for Web Audio scheduling patterns
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - AudioParam scheduling, buffer management
- [MDN Advanced techniques: Creating and sequencing audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) - Lookahead scheduler implementation
- [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) - Fire-and-forget pattern, automatic GC
- [Web Audio API book - Crossfading](https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/ch03.html) - Equal-power curve implementation
- [Web Audio Performance Notes](https://padenot.github.io/web-audio-perf/) - Voice limits, node recycling, memory management
- Codebase src/base-sound.ts - Event pattern, cleanup via onended (lines 383-396)
- Codebase src/track.ts - Pause/resume pattern (lines 74-117)
- Codebase src/sound.ts - Setup/cleanup, fresh source per play (lines 35-65)
- CONTEXT.md - User decisions on LayeredSound behavior, BeatTrack timing, crossfade mechanics

### Secondary (MEDIUM confidence)
- [GitHub notthetup/crossfade](https://github.com/notthetup/crossfade) - Equal-power crossfade reference implementation
- [Tone.js CrossFade](https://tonejs.github.io/docs/14.7.58/CrossFade) - Library implementation of equal-power crossfading
- [Understanding The Web Audio Clock](https://sonoport.github.io/web-audio-clock.html) - Clock system deep dive
- [Chris Lowis: Polyphonic Synthesis](https://chrislowis.co.uk/2013/06/10/playing-multiple-notes-web-audio-api) - Voice management patterns
- [LogRocket Guide to graceful degradation](https://blog.logrocket.com/guide-graceful-degradation-web-development/) - Failure handling patterns

### Tertiary (LOW confidence)
- WebSearch results on Web Audio timing (2026) - General patterns, not deeply technical
- WebSearch results on equal-power crossfading - Multiple sources agree, verified with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native Web Audio API, verified in MDN and authoritative sources
- Architecture: HIGH - Patterns from Chris Wilson's definitive article, verified in codebase
- Pitfalls: HIGH - Sourced from MDN, web.dev, Web Audio perf notes (authoritative)
- Crossfade implementation: HIGH - Verified in Web Audio API book, multiple library implementations
- BeatTrack timing: HIGH - Lookahead scheduler is established pattern from Chris Wilson
- LayeredSound design: HIGH - Follows established codebase patterns (BaseSound, Sound)

**Research date:** 2026-01-31
**Valid until:** 2026-03-31 (60 days - stable domain, Web Audio API mature, established patterns)
