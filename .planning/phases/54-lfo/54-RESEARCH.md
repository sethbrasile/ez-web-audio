# Phase 54: LFO - Research

**Researched:** 2026-02-28
**Domain:** Web Audio API OscillatorNode modulation, AudioParam.connect(), lifecycle management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- LFO connects to both sound-level parameters (gain, pan, frequency, detune) AND effect parameters (e.g., FilterEffect cutoff frequency)
- One LFO can modulate multiple targets simultaneously
- Connection pattern: `lfo.connect(target, paramName)` style — mirrors Web Audio's native AudioNode.connect() pattern
- Depth is specified as a ratio of the target's current value — `depth: 0.3` means ±30% of current value
- Frequency and depth are changeable while LFO is running, with smooth ramping support
- Standard four waveforms: sine, square, sawtooth, triangle
- Sample-and-hold (S&H / random step) waveform
- Custom PeriodicWave support: `createLFO({ waveform: myPeriodicWave })`
- LFO runs independently from connected sounds by default
- Opt-in lifecycle sync: `lfo.connect(sound, 'gain', { syncLifecycle: true })` ties LFO start/stop to sound play/stop
- Opt-in retrigger: `lfo.connect(sound, 'gain', { retrigger: true })` resets LFO phase to 0 on sound.play()
- BPM sync without Transport: `lfo.syncToBPM(120, '1/4')` sets frequency to match quarter-note rate — just math, no Transport dependency

### Claude's Discretion

- Ownership model: whether connection is LFO-driven (push) or sound-driven (pull), or hybrid — pick based on cleanup ergonomics and BaseSound surface area
- AudioContext sourcing: require upfront vs. infer from first connection — pick based on existing factory function patterns
- Per-target depth semantics: whether frequency modulation uses cents/semitones vs. uniform ratio — pick what produces musically useful results
- Clamping: whether to auto-clamp modulated values to safe ranges — pick based on Web Audio's native behavior
- Presets: whether to ship named presets or just document examples
- Phase configurability: whether LFO starting phase is configurable (0–360°) — pick based on implementation cost vs. usefulness
- Dispose behavior: what happens to LFO when connected sounds are disposed

### Deferred Ideas (OUT OF SCOPE)

- BPM-aware note length syntax on BeatTrack
- Transport-synced LFO (lock LFO to Transport clock) — Phase 55
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD-01 | Developer can create an LFO with configurable frequency, depth, and waveform | `createLFO()` factory using OscillatorNode + GainNode; depth=ratio governs GainNode value; waveform maps to OscillatorNode.type or setPeriodicWave() |
| MOD-02 | Developer can connect an LFO to any AudioParam on any sound (gain, pan, frequency, filter cutoff) | `AudioParam.connect(AudioNode)` not supported — must use `AudioNode.connect(AudioParam)`; LFO's GainNode output connects to target AudioParam directly |
| MOD-03 | LFO is properly disposed when the target sound is disposed (no memory leaks) | Sound's `dispose()` emits no dedicated event — LFO must listen for it or sound must notify LFO; recommend LFO-owns-connections with explicit disconnect on dispose + sound registers LFO for auto-cleanup |
</phase_requirements>

---

## Summary

An LFO in the Web Audio API is implemented as an `OscillatorNode` (the rate oscillator) connected through a `GainNode` (the depth scaler) whose output is connected directly to an `AudioParam` on the target node — **not** to another `AudioNode`. The key API is `AudioNode.connect(destinationParam: AudioParam)`, which is how Web Audio enables modulation. The LFO oscillator produces a signal centered on 0 (ranging from -1 to +1); the GainNode scales that signal by the depth amount, and the resulting signal is *added* to the AudioParam's base value — which is precisely how all Web Audio modulation works.

The depth-as-ratio design decision (±30% of target's current value) requires computing the absolute modulation amount at connect time: `depthAbsolute = targetCurrentValue * depthRatio`. When modulating gain (0–1 range), a depth of 0.3 at gain=1.0 produces ±0.3 oscillation. When modulating frequency (e.g. 440 Hz), a depth of 0.3 produces ±132 Hz oscillation — which may be musically extreme. The planner must decide whether frequency modulation should use a separate depth unit (cents) or inherit the ratio with appropriate documentation.

Memory safety requires that the LFO's OscillatorNode and GainNode be properly disconnected when either the LFO or connected sounds are disposed. The `BaseSound.dispose()` method disconnects audio nodes but does not emit a 'dispose' event — so the LFO cannot subscribe to a 'dispose' event on the sound. Instead, the recommended approach is a weak reference registry: the LFO stores a list of connections (target sound + AudioParam refs), and each `BaseSound` is patched at connect time to call `lfo.disconnect(target)` when `dispose()` runs on that sound.

**Primary recommendation:** Implement LFO as a standalone `LFO` class (not extending BaseSound) with its own `OscillatorNode` + depth `GainNode`. The `createLFO()` factory infers AudioContext from the first `connect()` call (matching how `createFilterEffect()` works without AudioContext). Use a `Map<BaseSound, ConnectionRecord[]>` to track connections per sound so dispose cleanup is O(1) per sound.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API (native) | Living Standard | OscillatorNode, GainNode, AudioParam.connect() | The LFO IS these nodes — no library wraps this better |

### Supporting

No third-party libraries needed. LFO is purely a Web Audio API composition pattern.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OscillatorNode (native) | Custom ScriptProcessorNode | ScriptProcessorNode is deprecated; OscillatorNode is the correct tool |
| AudioParam.connect(GainNode.output) | Direct OscillatorNode.connect(AudioParam) | Direct connect skips depth scaling; the GainNode indirection is required for depth control |

**Installation:** No additional packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lfo.ts              # LFO class definition
├── lfo.test.ts         # Vitest unit tests co-located with source
└── index.ts            # Add createLFO export
```

### Pattern 1: Web Audio Modulation Graph

**What:** OscillatorNode → GainNode (depth) → AudioParam
**When to use:** Every LFO connection. This is the canonical Web Audio modulation pattern.
**Example:**

```typescript
// Source: Web Audio API spec — AudioNode.connect(destinationParam)
// https://webaudio.github.io/web-audio-api/#dom-audionode-connect-destinationparam-output

const lfoOscillator = audioContext.createOscillator()
lfoOscillator.frequency.value = 5   // 5 Hz LFO rate
lfoOscillator.type = 'sine'

const depthGain = audioContext.createGain()
depthGain.gain.value = 0.3          // ±0.3 depth

lfoOscillator.connect(depthGain)
depthGain.connect(targetAudioParam)  // Connect to AudioParam, NOT AudioNode

lfoOscillator.start()
```

### Pattern 2: Sample-and-Hold (S&H) via BufferSourceNode loop

**What:** S&H is not a native waveform type. It must be synthesized with a short looping `AudioBufferSourceNode` containing stepped random values, or approximated with a very short periodic wave.
**When to use:** When `type: 'sample-and-hold'` or `type: 'random'` is specified.
**Example:**

```typescript
// Generate a 1-second buffer of step values at the LFO rate
// Steps are updated by regenerating the buffer and reconnecting
function createSampleAndHoldBuffer(audioContext: AudioContext, frequency: number): AudioBuffer {
  const stepCount = Math.round(audioContext.sampleRate / frequency)
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  // Fill with random steps at the correct step size
  let stepValue = Math.random() * 2 - 1
  for (let i = 0; i < audioContext.sampleRate; i++) {
    if (i % stepCount === 0) stepValue = Math.random() * 2 - 1
    data[i] = stepValue
  }
  return buffer
}

const bufferSource = audioContext.createBufferSource()
bufferSource.buffer = createSampleAndHoldBuffer(audioContext, 5)
bufferSource.loop = true
bufferSource.connect(depthGain)
bufferSource.start()
```

**Note:** S&H frequency changes require recreating the buffer and reconnecting — this is unavoidable with this approach. An alternative is using a `PeriodicWave` with a square approximation, but true random steps require the buffer approach.

### Pattern 3: AudioContext Inference from Connection

**What:** Like `createFilterEffect()`, the LFO factory does not require AudioContext upfront. AudioContext is inferred from the target at connect time.
**When to use:** Always — matches established factory function patterns in this codebase.
**Example:**

```typescript
// createLFO() returns an LFO object without AudioContext
// AudioContext is obtained when connect() is called
export function createLFO(options?: LFOOptions): LFO {
  return new LFO(options)
}

// LFO.connect() extracts audioContext from the sound's audioContext property
connect(target: BaseSound | BaseEffect, paramName: string, options?: ConnectOptions): this {
  const audioContext = target instanceof BaseSound
    ? target.audioContext                          // BaseSound exposes .audioContext
    : (target as any).audioContext                 // BaseEffect stores audioContext internally
  // ... rest of connect
}
```

**Note:** `BaseSound.audioContext` is already `public readonly` — it's safe to read from outside.

### Pattern 4: LFO Owns Connection Lifecycle

**What:** LFO stores all connection records internally. When `dispose()` is called on LFO, it disconnects everything. When a connected sound is disposed, the LFO must be notified.
**When to use:** Always — this is the safest cleanup model.
**Example:**

```typescript
interface ConnectionRecord {
  audioParam: AudioParam
  target: BaseSound | BaseEffect
  options: ConnectOptions
  playListener?: EventListener
  stopListener?: EventListener
}

class LFO {
  private connections: Map<BaseSound | BaseEffect, ConnectionRecord[]> = new Map()
  private soundDisposeCleanup: Map<BaseSound, () => void> = new Map()

  connect(target: BaseSound, paramName: string, options: ConnectOptions = {}): this {
    const audioParam = this.resolveAudioParam(target, paramName)
    this.depthGain.connect(audioParam)

    // Register cleanup for when sound is disposed
    // BaseSound.dispose() sets dispatchEvent to no-op — so register BEFORE dispose
    const cleanup = () => this.disconnectFrom(target)
    // Patch sound's dispose to call our cleanup
    const originalDispose = target.dispose.bind(target)
    target.dispose = () => {
      cleanup()
      originalDispose()
    }
    this.soundDisposeCleanup.set(target, cleanup)
    // ... store connection record
  }
}
```

**Important caveat:** BaseSound does NOT emit a 'dispose' event. The only reliable cleanup hook is patching `dispose()` on the target, or requiring users to call `lfo.disconnect(sound)` before `sound.dispose()`. The recommended approach is to patch `dispose()` — it's invisible to users and prevents zombie AudioNodes.

### Pattern 5: Depth as Ratio Implementation

**What:** Depth ratio is converted to absolute units at connect time by reading the AudioParam's current value.
**When to use:** For gain, pan, detune targets (linear params).

```typescript
// At connect() time:
const baseValue = audioParam.value  // e.g., gainNode.gain.value = 1.0
const absoluteDepth = baseValue * depthRatio  // 1.0 * 0.3 = 0.3
this.depthGain.gain.value = absoluteDepth
```

**Frequency modulation special case:** For `frequency` (e.g., 440 Hz), depth=0.3 means ±132 Hz — musically extreme. Options (Claude's discretion area):
- Option A (recommended): Use a **cents-based** depth for frequency params: depth=0.3 → ±30% of one octave in cents = ±360 cents. Better: accept `depthCents: 100` for explicit vibrato. The connect options can accept a `depthUnit: 'ratio' | 'cents'` for frequency targets.
- Option B: Apply ratio uniformly and document that frequency ratio produces extreme results.
- Option C: For frequency params, interpret depth as semitones always.

Recommendation: **Option A** — accept `depthUnit` in ConnectOptions with default='ratio' for all params except frequency where default='cents'. Document clearly.

**Pan modulation:** Pan range is [-1, 1]. Depth ratio of 0.3 on pan=0 (center) = 0 absolute depth. Must document that pan-based LFO (auto-pan) should use absolute depth, not ratio. Consider allowing `depth` as an absolute value override too, or document the pan=0 edge case.

### Anti-Patterns to Avoid

- **Direct OscillatorNode.connect(AudioParam):** Skips depth scaling — the `depthGain` intermediary is mandatory for controllable depth.
- **Storing AudioContext at createLFO() time:** createLFO() can be called before any AudioContext exists. Match the factory pattern: infer at connect time.
- **Using AudioBufferSourceNode for standard waveforms:** OscillatorNode handles sine/square/sawtooth/triangle; only S&H needs the buffer approach.
- **Not disconnecting AudioParam connections:** `AudioParam.connect()` connections are NOT garbage collected until explicitly disconnected. Forgetting `depthGain.disconnect(audioParam)` creates zombie nodes that continue running.
- **Listening for a 'dispose' event on BaseSound:** No such event exists. Must use dispose() patching or a WeakRef-based approach.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate oscillator | Custom ScriptProcessor | OscillatorNode (native) | OscillatorNode is hardware-accelerated, no main thread cost |
| Smooth frequency change | Custom interpolation loop | `AudioParam.setTargetAtTime()` | Already available on `OscillatorNode.frequency` |
| S&H waveform | Complex modulation graph | Short looping AudioBufferSourceNode | Simplest correct implementation |
| Modulation connection | Manual AudioParam manipulation | `AudioNode.connect(AudioParam)` (native) | Web Audio API's designed modulation pathway |

**Key insight:** The entire LFO is a 2–3 node Web Audio graph (OscillatorNode + GainNode + optionally BufferSourceNode for S&H). Don't over-engineer it.

---

## Common Pitfalls

### Pitfall 1: AudioParam.value vs AudioParam Modulation Interaction

**What goes wrong:** The Web Audio API computes the effective AudioParam value as `value + sum(connected_signals)`. Setting `gainNode.gain.value = 0.5` and connecting an LFO with depth ±0.3 produces oscillation between 0.2 and 0.8 — which is correct. BUT if the user later calls `sound.changeGainTo(0.8)`, the base value changes to 0.8 and the oscillation range shifts to 0.5–1.1 (clamped to 1.0 by Web Audio). The LFO depth absolute value does NOT automatically update.

**Why it happens:** `depthGain.gain.value` is set at connect time. Subsequent base value changes are not observed.

**How to avoid:** Document that `depth` is snapshotted at connect time. Consider providing `lfo.updateDepth(target, paramName, newDepth)` to re-snapshot. Or monitor AudioParam value changes (not natively supported — would require custom tracking).

**Warning signs:** User reports that tremolo "sounds louder" after changing volume — base value shifted.

### Pitfall 2: S&H Phase Reset on Frequency Change

**What goes wrong:** Changing S&H LFO frequency requires recreating the AudioBuffer. The old BufferSourceNode must be stopped and a new one started. There's a brief discontinuity (click) during the transition.

**Why it happens:** `AudioBufferSourceNode.buffer` cannot be changed after `start()`. A new source must be created.

**How to avoid:** For S&H frequency changes, crossfade between old and new buffer source nodes, or accept the click and document the limitation. Since this is a creative effect, a click is acceptable.

### Pitfall 3: OscillatorNode Phase Reset for Retrigger

**What goes wrong:** The Web Audio API provides no direct way to reset an OscillatorNode's phase to 0 while it's running. Stopping and restarting creates a new OscillatorNode (single-use). This means retrigger requires stopping the current oscillator node and starting a new one — which is expensive.

**Why it happens:** `OscillatorNode` is single-use by spec. `stop()` then `start()` fails (cannot restart a stopped node).

**How to avoid:** For retrigger, the LFO must create a new `OscillatorNode` (and possibly new `GainNode`) and reconnect. The LFO class must maintain an `_isRunning` state. On retrigger: disconnect old oscillator, create new one, reconnect, start.

**Alternative:** Accept that retrigger on OscillatorNode-based waveforms incurs a brief restart. For S&H (BufferSourceNode), this is already the model.

### Pitfall 4: Pan = 0 Edge Case with Depth as Ratio

**What goes wrong:** `lfo.connect(sound, 'pan', { depth: 0.3 })` at pan=0 computes `absoluteDepth = 0 * 0.3 = 0`. The LFO produces no audible effect.

**Why it happens:** Ratio depth on a 0-valued param always produces 0.

**How to avoid:** For pan targets where base value is 0, fall back to an absolute depth range of `depth` (treat `depth: 0.3` as ±0.3 absolute when base is 0). Or document and require `depth` to be specified as absolute for pan. Alternatively, offer `absoluteDepth` as an option alongside `depth` (ratio).

### Pitfall 5: Memory Leak from Untracked Connections

**What goes wrong:** If the user calls `sound.dispose()` without first calling `lfo.disconnect(sound)`, the LFO's `depthGain` node remains connected to the now-freed AudioParam. The `OscillatorNode` keeps running.

**Why it happens:** `sound.dispose()` disconnects the sound's nodes, but the LFO's `depthGain.connect(audioParam)` connection is held by the **LFO node**, not the sound. The LFO doesn't know the sound was disposed.

**How to avoid:** This is exactly MOD-03. The patch-dispose approach handles it automatically. If patching dispose is rejected, the LFO must at minimum call `depthGain.disconnect(audioParam)` from its own `dispose()`.

---

## Code Examples

Verified patterns from Web Audio API spec:

### Basic LFO Class Skeleton

```typescript
// Source: Web Audio API spec — AudioNode.connect(destinationParam)
export class LFO {
  private oscillatorNode: OscillatorNode | null = null
  private depthGain: GainNode | null = null
  private audioContext: AudioContext | null = null
  private _isRunning = false
  private connections: Map<AudioParam, BaseSound | BaseEffect> = new Map()

  constructor(private options: LFOOptions = {}) {}

  connect(target: BaseSound, paramName: string, opts: ConnectOptions = {}): this {
    // Lazy AudioContext init
    if (!this.audioContext) {
      this.audioContext = target.audioContext
      this._init()
    }

    const audioParam = this.resolveAudioParam(target, paramName)
    const baseValue = audioParam.value
    const absDepth = Math.abs(baseValue) > 0.001
      ? baseValue * (this.options.depth ?? 0.3)
      : (this.options.depth ?? 0.3)  // fallback for zero-value params

    // Create per-connection depth scaler
    const connGain = this.audioContext.createGain()
    connGain.gain.value = absDepth
    this.oscillatorNode!.connect(connGain)
    connGain.connect(audioParam)

    // Track for cleanup
    this.connections.set(audioParam, target)

    // Patch target.dispose() for MOD-03
    this._patchDispose(target)

    if (opts.syncLifecycle) {
      this._bindLifecycle(target, opts)
    }
    if (opts.retrigger) {
      this._bindRetrigger(target)
    }
    return this
  }

  start(): this {
    if (!this._isRunning && this.oscillatorNode) {
      this.oscillatorNode.start()
      this._isRunning = true
    }
    return this
  }

  stop(): this {
    // Must recreate oscillatorNode for future start()
    // OscillatorNode is single-use
    this._recreateOscillator()
    this._isRunning = false
    return this
  }

  dispose(): void {
    this.depthGain?.disconnect()
    this.oscillatorNode?.stop()
    this.oscillatorNode?.disconnect()
    this.connections.clear()
  }

  private _init(): void {
    const ctx = this.audioContext!
    this.oscillatorNode = ctx.createOscillator()
    this.oscillatorNode.frequency.value = this.options.frequency ?? 1
    this.oscillatorNode.type = this.options.type ?? 'sine'
    this.depthGain = ctx.createGain()
    this.depthGain.gain.value = this.options.depth ?? 0.3
    this.oscillatorNode.connect(this.depthGain)
  }
}
```

### BPM Sync Math

```typescript
syncToBPM(bpm: number, noteLength: string): this {
  // Parse noteLength: '1/4' = quarter note, '1/8' = eighth note, etc.
  const [num, denom] = noteLength.split('/').map(Number)
  const beatsPerSecond = bpm / 60
  const noteHz = beatsPerSecond * (num / denom) * 4  // 4 quarter-notes per whole note
  // Example: 120 BPM, '1/4' → 120/60 * (1/4) * 4 = 2 Hz
  if (this.oscillatorNode) {
    this.oscillatorNode.frequency.value = noteHz
  }
  else {
    this.options.frequency = noteHz  // store for when init happens
  }
  return this
}
```

**Verification:** At 120 BPM, one quarter note = 0.5 seconds = 2 Hz. At 120 BPM, '1/8' (eighth note) = 4 Hz. This math is correct.

### Resolving AudioParam from BaseSound

```typescript
private resolveAudioParam(target: BaseSound, paramName: string): AudioParam {
  switch (paramName) {
    case 'gain':
      return target.getGainNode().gain     // getGainNode() is public on BaseSound
    case 'pan':
      // BaseSound does NOT expose getPannerNode() publicly — needs to be added OR
      // LFO must access target.pannerNode (protected) via a new public accessor
      throw new Error('pan LFO requires BaseSound.getPannerNode() — add to BaseSound')
    case 'frequency':
      // Only Oscillator has audioSourceNode.frequency
      if (!(target instanceof Oscillator)) throw new Error('frequency modulation only on Oscillator')
      return (target.audioSourceNode as OscillatorNode).frequency
    case 'detune':
      return target.audioSourceNode.detune
    default:
      throw new Error(`Unknown param '${paramName}' on sound target`)
  }
}
```

**Important gap discovered:** `BaseSound` exposes `getGainNode()` publicly but does NOT expose a `getPannerNode()` method. For `pan` LFO targets, either:
- Add `getPannerNode(): StereoPannerNode` to `BaseSound` (minimal surface change), OR
- Use `target['pannerNode']` (protected access, fragile), OR
- Only support gain/frequency/detune for sound targets and not pan

**Recommendation:** Add `getPannerNode()` to `BaseSound` — it follows the existing `getGainNode()` pattern exactly.

### Resolving AudioParam from Effect

```typescript
private resolveEffectAudioParam(target: BaseEffect, paramName: string): AudioParam {
  // BaseEffect exposes getAudioParam() as a protected method — not accessible externally
  // Must either:
  // 1. Make getAudioParam() public on BaseEffect
  // 2. Add a public resolveParam(name: string): AudioParam | null to BaseEffect
  // 3. Cast and call (fragile)

  const param = (target as any).getAudioParam(paramName)
  if (!param) throw new Error(`Effect has no AudioParam named '${paramName}'`)
  return param
}
```

**Important gap discovered:** `BaseEffect.getAudioParam()` is `protected` — not accessible from LFO. Options:
- Change `getAudioParam()` to `public` on BaseEffect, OR
- Add a public `getParam(name: string): AudioParam | null` method on BaseEffect that delegates to `getAudioParam()`.

**Recommendation:** Add `public getParam(name: string): AudioParam | null` to `BaseEffect` that calls `this.getAudioParam(name)`. This keeps the protected naming convention for subclass override while providing external access.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for LFO | OscillatorNode.connect(AudioParam) | Web Audio API Level 2 (2018+) | ScriptProcessorNode is deprecated; OscillatorNode approach is the spec-compliant method |
| Manual AudioParam polling/setting | AudioParam modulation graph | Web Audio API design | The modulation graph is sample-accurate; polling on rAF is not |

---

## Open Questions

1. **Frequency LFO depth unit (Claude's discretion)**
   - What we know: Ratio depth on a 440 Hz frequency param produces ±132 Hz oscillation (very wide)
   - What's unclear: What unit produces musically useful vibrato (typically ±50–200 cents)
   - Recommendation: Default `depthUnit` to `'cents'` for `'frequency'` param name, `'ratio'` for everything else. Surface `depthUnit: 'cents' | 'ratio' | 'absolute'` in `ConnectOptions`.

2. **OscillatorNode phase reset for retrigger (technical constraint)**
   - What we know: OscillatorNode cannot be phase-reset while running; must stop + create new node
   - What's unclear: Whether the user-visible latency from node recreation is perceptible
   - Recommendation: Accept the constraint; document that retrigger recreates the oscillator node (imperceptible at typical sample rates if done within one audio processing block ~2.9ms at 44.1kHz)

3. **S&H frequency change approach (Claude's discretion)**
   - What we know: Changing S&H rate requires buffer regeneration
   - Recommendation: Implement frequency change for S&H as a stop-recreate-start cycle (same as retrigger). Accept brief discontinuity; document as expected behavior.

4. **Whether LFO needs its own AudioContext or reuses the singleton**
   - What we know: All other factory functions either require AudioContext or use `getOrCreateAudioContext()`
   - Recommendation: Lazy init from first `connect()` call mirrors the effect factory pattern; also support optional explicit AudioContext in `createLFO(audioContext, options)` for testing.

5. **Connection cleanup when LFO.stop() is called (not dispose)**
   - What we know: OscillatorNode is single-use; stop() cannot be reversed on a node
   - Recommendation: `stop()` internally recreates the `OscillatorNode` (not started) but keeps all `connect()` registrations intact. When `start()` is called again, new oscillator wires into existing connection graph. This mirrors how Oscillator.setup() works in the codebase.

---

## Architecture Recommendations (Claude's Discretion Resolved)

### Ownership Model: LFO-Driven (Push)
LFO owns the connection records. BaseSound does NOT need a registry of connected LFOs. The LFO patches `target.dispose()` to trigger its own cleanup. This keeps BaseSound surface area minimal.

### AudioContext Sourcing: Lazy from first connect()
Match existing factory functions. `createLFO(options)` stores options only. First `lfo.connect()` call extracts audioContext from target and initializes the OscillatorNode graph. Edge case: if `lfo.start()` is called before any `connect()`, throw a helpful error: "LFO has no AudioContext — call connect() first or pass audioContext to createLFO()".

### Per-target depth: Ratio with cents fallback for frequency
- Gain, pan, detune: ratio-based depth (`absoluteDepth = paramValue * depth`)
- Frequency: cents-based depth by default (`absoluteDepth = freq * (2^(depthCents/1200) - 1)` converts semitone range to Hz)
- Allow override via `ConnectOptions.depthUnit: 'ratio' | 'cents' | 'absolute'`

### Clamping: None (native Web Audio behavior)
Web Audio natively clamps AudioParams to their valid range (e.g., StereoPannerNode.pan clamps to [-1, 1]). No explicit clamping needed in LFO. Document this behavior.

### Presets: No presets, but document examples
Aligns with EZ Audio's simplicity philosophy. Example patterns (tremolo, vibrato, auto-filter, auto-pan) belong in docs, not in the library's footprint.

### Phase configurability: Yes, but simple
Accept `phase: number` (0–1, where 1 = full 2π cycle) in `LFOOptions`. Implement via `OscillatorNode.start(audioContext.currentTime, phase * Math.PI * 2)` — the second argument to `start()` is the offset in samples, not phase. Actually: Web Audio `start(when, offset)` only applies to AudioBufferSourceNode, NOT OscillatorNode. **OscillatorNode.start() does not support phase offset.** Phase is not configurable on OscillatorNode.
- **Correction:** Phase configuration is NOT possible for OscillatorNode-based waveforms. Mark as out-of-scope for sine/square/sawtooth/triangle. For S&H (BufferSourceNode), phase is effectively random anyway. Skip phase config — implementation cost too high relative to usefulness (would require PeriodicWave hack with phase-shifted lookup table).

### Dispose behavior: Patch target.dispose()
The LFO patches `target.dispose()` at connect time to call `lfo._cleanupTarget(target)` before the original dispose runs. `_cleanupTarget` disconnects the per-target AudioParam connections and removes lifecycle listeners. The original dispose is then called normally. This is the cleanest approach for MOD-03.

---

## Required Code Changes in Existing Files

The planner MUST account for these changes beyond the new `lfo.ts` file:

1. **`src/base-sound.ts`**: Add `public getPannerNode(): StereoPannerNode { return this.pannerNode }`. One line, follows existing `getGainNode()` pattern.

2. **`src/effects/base-effect.ts`**: Add `public getParam(name: string): AudioParam | null { return this.getAudioParam(name) }`. Exposes the existing protected method for external access.

3. **`src/index.ts`**: Add `createLFO` factory export, `LFO` class re-export, `LFOOptions` and `ConnectOptions` type re-exports.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x with happy-dom |
| Config file | `vite.config.js` (test section) |
| Quick run command | `pnpm test src/lfo.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-01 | `createLFO({ frequency: 5, depth: 0.3, type: 'sine' })` returns LFO with start/stop/dispose | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-01 | LFO frequency/depth changeable while running with smooth ramp | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-01 | S&H waveform creates stepped random signal | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-01 | PeriodicWave accepted as waveform option | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | `lfo.connect(sound, 'gain')` connects to GainNode.gain AudioParam | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | `lfo.connect(sound, 'pan')` connects to StereoPannerNode.pan AudioParam | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | `lfo.connect(oscillator, 'frequency')` connects to OscillatorNode.frequency AudioParam | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | `lfo.connect(filterEffect, 'frequency')` connects to BiquadFilterNode.frequency AudioParam | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | One LFO can connect to multiple targets simultaneously | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | syncLifecycle: LFO starts when sound.play() fires, stops when sound.stop() fires | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | retrigger: LFO phase resets on each sound.play() | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-02 | syncToBPM(120, '1/4') sets LFO frequency to 2 Hz | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-03 | After sound.dispose(), LFO AudioParam connection is removed | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-03 | After lfo.dispose(), all AudioParam connections are removed | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |
| MOD-03 | OscillatorNode stops running after all targets disposed | unit | `pnpm test src/lfo.test.ts` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `src/lfo.ts` — LFO class implementation
- [ ] `src/lfo.test.ts` — covers MOD-01, MOD-02, MOD-03
- [ ] `src/base-sound.ts` — add `getPannerNode()` public accessor
- [ ] `src/effects/base-effect.ts` — add `public getParam()` accessor

*(Existing test infrastructure covers all framework needs — no new config required)*

---

## Sources

### Primary (HIGH confidence)
- Web Audio API Living Standard — AudioNode.connect(destinationParam) modulation: https://webaudio.github.io/web-audio-api/#dom-audionode-connect-destinationparam-output
- Web Audio API Living Standard — OscillatorNode interface: https://webaudio.github.io/web-audio-api/#oscillatornode
- Codebase: `src/effects/base-effect.ts` — BaseEffect pattern (analyzed directly)
- Codebase: `src/base-sound.ts` — dispose pattern, event system, getGainNode() pattern (analyzed directly)
- Codebase: `src/effects/filter-effect.ts` — getAudioParam() pattern (analyzed directly)
- Codebase: `src/controllers/base-param-controller.ts` — AudioParam manipulation patterns (analyzed directly)

### Secondary (MEDIUM confidence)
- General Web Audio modulation patterns: OscillatorNode → GainNode → AudioParam is the universally established pattern, consistent across MDN, W3C spec, and Tone.js source

### Tertiary (LOW confidence)
- S&H via looping AudioBufferSourceNode: community pattern not in W3C spec but widely documented in Web Audio tutorials

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Audio API is the stack; no library choice needed
- Architecture: HIGH — patterns directly derived from existing codebase code reading
- Pitfalls: HIGH — derived from Web Audio spec constraints (single-use OscillatorNode, AudioParam modulation model)
- S&H implementation: MEDIUM — buffer-based approach is common but not in spec

**Research date:** 2026-02-28
**Valid until:** 2026-05-28 (Web Audio API is stable)
