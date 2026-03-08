# Phase 2: ADSR Envelopes - Research

**Researched:** 2026-01-31
**Domain:** Web Audio API AudioParam automation and ADSR envelope implementation
**Confidence:** HIGH

## Summary

ADSR (Attack, Decay, Sustain, Release) envelopes are a cornerstone of professional synthesis, controlling how a sound's amplitude evolves over time. This phase implements ADSR for ez-audio's Oscillator class using native Web Audio API AudioParam automation.

The standard implementation uses AudioParam scheduling methods (`linearRampToValueAtTime`, `exponentialRampToValueAtTime`, `setTargetAtTime`) to automate gain changes sample-accurately. The critical challenge is **clickless retriggering** - when a new note starts before the previous envelope completes, the envelope must pick up from the current value rather than jumping to zero (which causes audible pops).

Three major pitfalls emerged from research: (1) `exponentialRampToValueAtTime` cannot use 0 as a target value (mathematical limitation), (2) `cancelAndHoldAtTime` has limited browser support and requires polyfill consideration, and (3) direct AudioParam value assignment during automation causes discontinuities.

**Primary recommendation:** Use separate Envelope class integrated via OscillatorController. Use `linearRampToValueAtTime` for attack/decay phases, hold at sustain level, and use `setTargetAtTime` for release (handles zero target correctly). For retriggering, manually calculate current value using spec formula or use `cancelAndHoldAtTime` with browser support detection.

## Standard Stack

### Core (Native Web Audio API)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| AudioParam automation | Web Audio API 1.0 | Schedule envelope changes | Native browser implementation, sample-accurate timing |
| `linearRampToValueAtTime()` | Web Audio API 1.0 | Attack/decay phases | Widely supported, predictable behavior |
| `setTargetAtTime()` | Web Audio API 1.0 | Release phase (exponential decay to zero) | Only method that handles zero target correctly |
| `cancelScheduledValues()` | Web Audio API 1.0 | Clear scheduled automation | Baseline support since 2015 |

### Supporting (Conditional)

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `cancelAndHoldAtTime()` | Web Audio API (experimental) | Smooth retriggering | Chrome/Edge only - requires polyfill for Firefox/Safari |
| `exponentialRampToValueAtTime()` | Web Audio API 1.0 | Exponential curves (NOT for release to zero) | Frequency changes, never for gain to zero |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native AudioParam | Tone.js Envelope | +28KB dependency, violates zero-dependency requirement |
| Separate Envelope class | Inline in controller | Less modular, harder to test, duplicates logic across controllers |
| Manual calculation | `cancelAndHoldAtTime()` | More code but cross-browser compatible vs. simpler but requires polyfill |

**Installation:**
```bash
# Zero dependencies - uses native Web Audio API
# Optional: cancelAndHoldAtTime polyfill if needed
npm install cancelandholdattime-polyfill --save-dev
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── envelope.ts               # Envelope class (ADSR logic)
├── oscillator.ts             # Integrate envelope via options
├── controllers/
│   ├── base-param-controller.ts  # Extend with envelope support
│   └── oscillator-controller.ts  # Apply envelope to gainNode
└── events/
    └── event-types.ts        # Add envelope phase events (optional)
```

### Pattern 1: Separate Envelope Class

**What:** Envelope as independent class that generates AudioParam scheduling commands

**When to use:** When ADSR logic needs to be testable in isolation, reusable across multiple sound types, and not coupled to specific controllers

**Example:**
```typescript
// Source: mohayonao/adsr-envelope pattern
class Envelope {
  constructor(
    attackTime: number,
    decayTime: number,
    sustainLevel: number,
    releaseTime: number
  ) { /* ... */ }

  // Generates scheduling commands, doesn't execute them
  getSchedulingCommands(startTime: number): SchedulingCommand[] {
    return [
      { method: 'setValueAtTime', args: [0, startTime] },
      { method: 'linearRampToValueAtTime', args: [1, startTime + attackTime] },
      { method: 'linearRampToValueAtTime', args: [sustainLevel, startTime + attackTime + decayTime] },
      // Release scheduled separately on stop()
    ]
  }

  // Apply commands to AudioParam
  applyTo(param: AudioParam, startTime: number): void {
    this.getSchedulingCommands(startTime).forEach((cmd) => {
      param[cmd.method](...cmd.args)
    })
  }

  // Schedule release phase
  release(param: AudioParam, releaseTime: number): void {
    param.setTargetAtTime(0, releaseTime, this.releaseTime / 5) // 5x time constant ≈ 99% complete
  }
}
```

### Pattern 2: Controller Integration

**What:** OscillatorController manages envelope lifecycle, coordinates with play/stop

**When to use:** When envelope timing must sync with sound lifecycle events

**Example:**
```typescript
// Source: ez-audio existing controller pattern
class OscillatorController extends BaseParamController {
  private envelope?: Envelope

  setEnvelope(envelope: Envelope): void {
    this.envelope = envelope
  }

  setValuesAtTimes(): void {
    const { currentTime } = this.oscillator.context

    // Apply existing parameter automation
    super.setValuesAtTimes()

    // Apply envelope if configured
    if (this.envelope) {
      this.envelope.applyTo(this.gainNode.gain, currentTime)
    }
  }

  onStop(stopTime: number): void {
    if (this.envelope) {
      this.envelope.release(this.gainNode.gain, stopTime)
    }
  }
}
```

### Pattern 3: Retriggering Without Clicks

**What:** When play() called during active envelope, pick up from current value instead of restarting from zero

**When to use:** Always - prevents audible pops during fast note changes (critical for playability)

**Example (Manual Calculation):**
```typescript
// Source: Web Audio API spec formula + GitHub issue #510 discussion
class Envelope {
  private lastScheduledTime: number = 0
  private lastScheduledValue: number = 0

  applyTo(param: AudioParam, startTime: number): void {
    const currentValue = this.getCurrentValue(param, startTime)

    // Cancel existing automation, set current value
    param.cancelScheduledValues(startTime)
    param.setValueAtTime(currentValue, startTime)

    // Schedule new envelope from current value
    param.linearRampToValueAtTime(1, startTime + this.attackTime)
    param.linearRampToValueAtTime(this.sustainLevel, startTime + this.attackTime + this.decayTime)

    this.lastScheduledTime = startTime
    this.lastScheduledValue = currentValue
  }

  // Calculate current value using spec formula for linear ramp
  // v(t) = V0 + (V1 - V0) * ((t - T0) / (T1 - T0))
  getCurrentValue(param: AudioParam, currentTime: number): number {
    if (currentTime <= this.lastScheduledTime) {
      return this.lastScheduledValue
    }
    // Implementation requires tracking all scheduled events
    // This is the core complexity - see "Don't Hand-Roll" section
  }
}
```

**Example (cancelAndHoldAtTime - simpler but requires browser support):**
```typescript
// Source: MDN cancelAndHoldAtTime documentation
class Envelope {
  applyTo(param: AudioParam, startTime: number): void {
    // Modern browsers only - holds value at cancellation time
    if ('cancelAndHoldAtTime' in param) {
      param.cancelAndHoldAtTime(startTime)
    }
    else {
      // Fallback: calculate manually or use polyfill
      param.cancelScheduledValues(startTime)
      param.setValueAtTime(this.estimateCurrentValue(param), startTime)
    }

    // Schedule new envelope from held value
    param.linearRampToValueAtTime(1, startTime + this.attackTime)
    // ... rest of envelope
  }
}
```

### Anti-Patterns to Avoid

- **Direct value assignment during automation:** `gainNode.gain.value = 0.5` - creates discontinuities, always use `setValueAtTime()`
- **exponentialRampToValueAtTime to zero:** Throws error - use `setTargetAtTime()` or very small value (0.01)
- **Ignoring retriggering:** Starting envelopes at zero without checking current value - causes clicks
- **Fixed time calculations:** Using `Date.now()` instead of `audioContext.currentTime` - timer desync (Critical Pitfall #2)
- **Accumulating automation events:** Never calling `cancelScheduledValues()` - performance degradation (Critical Pitfall #3)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tracking current AudioParam value during automation | Manual event tracking system | `cancelAndHoldAtTime()` + polyfill OR simplified estimation | Web Audio spec formula complex, cross-browser consistency issues, sample-accurate calculation requires reimplementing browser internals |
| ADSR envelope scheduling | Custom gain control logic | AudioParam automation methods | Native sample-accurate timing, browser-optimized, prevents timer desync |
| Exponential decay to zero | `exponentialRampToValueAtTime(0, ...)` | `setTargetAtTime(0, time, timeConstant)` | Exponential ramp mathematically undefined at zero, setTargetAtTime handles asymptotic approach correctly |
| Envelope phase transitions | JavaScript setInterval callbacks | Scheduled AudioParam automation | JS timers desync from audio clock (Critical Pitfall #2), automation is sample-accurate |

**Key insight:** AudioParam automation is deceptively complex. The Web Audio API provides sample-accurate scheduling, but managing state across retriggering requires either (1) browser-native `cancelAndHoldAtTime()` with polyfill, or (2) careful manual calculation. Don't assume you can improve on native automation - focus on coordination logic.

## Common Pitfalls

### Pitfall 1: Exponential Ramp to Zero (Mathematical Limitation)

**What goes wrong:** Calling `exponentialRampToValueAtTime(0, endTime)` throws "invalid or illegal string" error

**Why it happens:** Exponential curves are mathematically undefined at zero. The formula requires strictly positive values: `v(t) = V0 * (V1/V0)^((t-T0)/(T1-T0))` - division by zero when V1=0

**How to avoid:**
- Use `setTargetAtTime(0, time, timeConstant)` for release phase (asymptotic approach to zero)
- OR use very small positive value: `exponentialRampToValueAtTime(0.01, endTime)` (perceptually silent)
- Never use exponential ramp for final release to silence

**Warning signs:** TypeError when scheduling envelope, "InvalidStateError" in console

**Source:** [MDN exponentialRampToValueAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime)

### Pitfall 2: Retriggering Discontinuities (ADSR Classic Bug)

**What goes wrong:** Rapid note retriggering causes audible clicks/pops - most obvious at fast tempos (quarter notes at 400bpm, thirty-second notes at 60bpm)

**Why it happens:** When play() called during active envelope, naively restarting from zero creates instant gain jump from current value to zero. Human ear very sensitive to discontinuities.

**How to avoid:**
1. **Option A (Chrome/Edge):** Use `cancelAndHoldAtTime()` to preserve current value
   ```typescript
   param.cancelAndHoldAtTime(currentTime)
   param.linearRampToValueAtTime(1, currentTime + attackTime)
   ```

2. **Option B (Cross-browser):** Estimate current value, cancel, set, ramp
   ```typescript
   param.cancelScheduledValues(currentTime)
   param.setValueAtTime(estimatedCurrentValue, currentTime)
   param.linearRampToValueAtTime(1, currentTime + attackTime)
   ```

3. **Option C (Fastidious approach):** Rate-based ramping - maintain consistent rate rather than fixed duration

**Warning signs:** Audible pops during fast arpeggios, clicks when rapidly pressing keys

**Source:** [Web Audio API Issue #510](https://github.com/WebAudio/web-audio-api/issues/510), [fastidious-envelope-generator](https://github.com/rsimmons/fastidious-envelope-generator)

### Pitfall 3: Browser Support Assumptions for cancelAndHoldAtTime

**What goes wrong:** Code uses `cancelAndHoldAtTime()` without detection, breaks in Firefox/Safari

**Why it happens:** Method is experimental, Chrome/Edge-only as of research date. Not baseline Web Audio API.

**How to avoid:**
- Feature detection: `if ('cancelAndHoldAtTime' in AudioParam.prototype)`
- Polyfill: [cancelandholdattime-polyfill](https://github.com/the-monochord/cancelandholdattime-polyfill)
- Fallback: manual calculation approach
- Document browser support requirements

**Warning signs:** "cancelAndHoldAtTime is not a function" in Firefox/Safari

**Source:** [MDN cancelAndHoldAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime), [polyfill project](https://github.com/the-monochord/cancelandholdattime-polyfill)

### Pitfall 4: Direct Value Assignment During Automation

**What goes wrong:** Setting `gainNode.gain.value = 0.5` during scheduled automation causes jumps/clicks

**Why it happens:** Direct assignment bypasses AudioParam timeline, creates instant value change while automation expects smooth transitions

**How to avoid:** ALWAYS use `setValueAtTime()` even for "instant" changes
```typescript
// ❌ WRONG
gainNode.gain.value = 0.5

// ✅ CORRECT
gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
```

**Warning signs:** Clicks when mixing manual gain changes with ADSR, unexpected value jumps

**Source:** Critical Pitfall #5 from STATE.md, Web Audio API best practices

### Pitfall 5: Sustain as Time Instead of Level

**What goes wrong:** Treating sustain parameter as duration (like attack/decay/release) instead of amplitude level

**Why it happens:** ADSR acronym suggests all four are time parameters, but sustain is the only one that's a level (0-1)

**How to avoid:**
- Name clearly: `sustainLevel` not `sustainTime`
- Type as 0-1 range, document "amplitude level during hold"
- Sustain duration = time between decay end and release start (controlled by when stop() called, not ADSR config)

**Warning signs:** Users confused why sustain "duration" doesn't work, envelopes ending too early

**Source:** [Building a Synthesizer - Envelopes](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html)

### Pitfall 6: Time Constant Confusion for setTargetAtTime

**What goes wrong:** Using `setTargetAtTime(0, time, releaseTime)` and expecting release to complete in `releaseTime` seconds - it doesn't

**Why it happens:** Third parameter is time constant (tau), not duration. Each tau brings 63.2% closer to target. Need ~5x tau for 99% completion.

**How to avoid:**
- For release duration of 1 second: `setTargetAtTime(0, time, 1/5)` gives ~1 second to perceptual silence
- Formula: `timeConstant ≈ desiredDuration / 5` for 99.3% completion
- Document: "timeConstant controls rate, not duration"

**Warning signs:** Release phases taking too long or too short, unexpected envelope timing

**Source:** [MDN setTargetAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)

## Code Examples

Verified patterns from official sources:

### Basic ADSR Envelope Application

```typescript
// Source: mohayonao/adsr-envelope + MDN documentation
class Envelope {
  constructor(
    public attackTime: number = 0.01,
    public decayTime: number = 0.1,
    public sustainLevel: number = 0.7,
    public releaseTime: number = 0.3
  ) {}

  // Apply attack-decay-sustain on note start
  applyTo(gainParam: AudioParam, startTime: number): void {
    // Start from silence
    gainParam.setValueAtTime(0, startTime)

    // Attack: ramp to peak (1.0)
    gainParam.linearRampToValueAtTime(1, startTime + this.attackTime)

    // Decay: ramp to sustain level
    gainParam.linearRampToValueAtTime(
      this.sustainLevel,
      startTime + this.attackTime + this.decayTime
    )

    // Sustain: held at sustainLevel until release() called
  }

  // Apply release on note end
  release(gainParam: AudioParam, releaseTime: number): void {
    // Use setTargetAtTime for smooth exponential decay to zero
    // timeConstant = releaseTime/5 gives ~1 second to perceptual silence
    gainParam.setTargetAtTime(0, releaseTime, this.releaseTime / 5)
  }
}

// Usage
const envelope = new Envelope(0.01, 0.1, 0.7, 0.3)
const osc = audioContext.createOscillator()
const gain = audioContext.createGain()

osc.connect(gain)
gain.connect(audioContext.destination)

// Play note
const startTime = audioContext.currentTime
envelope.applyTo(gain.gain, startTime)
osc.start(startTime)

// Stop note after 1 second
const stopTime = audioContext.currentTime + 1
envelope.release(gain.gain, stopTime)
osc.stop(stopTime + envelope.releaseTime)
```

### Retriggering Without Clicks (Cross-Browser)

```typescript
// Source: Web Audio API Issue #510 discussion + fastidious-envelope-generator
class RetriggerableEnvelope extends Envelope {
  private isActive = false
  private attackStartTime = 0
  private attackStartValue = 0

  applyTo(gainParam: AudioParam, startTime: number): void {
    // If envelope already active, pick up from current value
    if (this.isActive) {
      const currentValue = this.estimateCurrentValue(gainParam, startTime)

      // Cancel future automation, preserve current value
      gainParam.cancelScheduledValues(startTime)
      gainParam.setValueAtTime(currentValue, startTime)

      // Attack from current value to peak
      gainParam.linearRampToValueAtTime(1, startTime + this.attackTime)
    }
    else {
      // First trigger - start from zero
      gainParam.setValueAtTime(0, startTime)
      gainParam.linearRampToValueAtTime(1, startTime + this.attackTime)
    }

    // Decay to sustain
    gainParam.linearRampToValueAtTime(
      this.sustainLevel,
      startTime + this.attackTime + this.decayTime
    )

    this.isActive = true
    this.attackStartTime = startTime
    this.attackStartValue = gainParam.value // Approximation
  }

  // Simplified estimation - good enough for most cases
  private estimateCurrentValue(param: AudioParam, currentTime: number): number {
    // If during attack phase, estimate based on ramp progress
    const attackEndTime = this.attackStartTime + this.attackTime
    if (currentTime < attackEndTime) {
      const progress = (currentTime - this.attackStartTime) / this.attackTime
      return this.attackStartValue + (1 - this.attackStartValue) * progress
    }

    // During decay
    const decayEndTime = attackEndTime + this.decayTime
    if (currentTime < decayEndTime) {
      const progress = (currentTime - attackEndTime) / this.decayTime
      return 1 + (this.sustainLevel - 1) * progress
    }

    // During sustain
    return this.sustainLevel
  }

  release(gainParam: AudioParam, releaseTime: number): void {
    super.release(gainParam, releaseTime)
    this.isActive = false
  }
}
```

### Integration with Oscillator Options

```typescript
// Source: ez-audio existing pattern (oscillator.ts + index.ts)
// Extend OscillatorOpts interface
export interface OscillatorOpts extends BaseSoundOptions {
  // ... existing options
  envelope?: {
    attackTime?: number
    decayTime?: number
    sustainLevel?: number
    releaseTime?: number
  }
}

// Extend Oscillator class
export class Oscillator extends BaseSound {
  private envelope?: Envelope

  constructor(audioContext: AudioContext, options?: OscillatorOpts) {
    super(audioContext, options)

    // ... existing setup

    // Configure envelope if provided
    if (options?.envelope) {
      this.envelope = new Envelope(
        options.envelope.attackTime ?? 0.01,
        options.envelope.decayTime ?? 0.1,
        options.envelope.sustainLevel ?? 0.7,
        options.envelope.releaseTime ?? 0.3
      )
    }
  }

  protected setup(): void {
    // ... existing setup

    // Apply envelope in controller
    if (this.envelope) {
      this.controller.setEnvelope(this.envelope)
    }
  }
}

// Usage - simple API surface
const osc = await createOscillator({
  frequency: 440,
  envelope: {
    attackTime: 0.05,
    decayTime: 0.2,
    sustainLevel: 0.6,
    releaseTime: 0.4
  }
})
osc.play() // Envelope applied automatically
```

### Browser-Safe cancelAndHoldAtTime

```typescript
// Source: cancelandholdattime-polyfill + feature detection pattern
class BrowserSafeEnvelope extends Envelope {
  private hasCancelAndHold: boolean

  constructor(...args) {
    super(...args)
    // Feature detection
    this.hasCancelAndHold = 'cancelAndHoldAtTime' in AudioParam.prototype
  }

  applyTo(gainParam: AudioParam, startTime: number): void {
    if (this.isActive) {
      if (this.hasCancelAndHold) {
        // Modern browsers - simple and accurate
        gainParam.cancelAndHoldAtTime(startTime)
      }
      else {
        // Firefox/Safari fallback - good enough approximation
        gainParam.cancelScheduledValues(startTime)
        const currentValue = this.estimateCurrentValue(gainParam, startTime)
        gainParam.setValueAtTime(currentValue, startTime)
      }
    }
    else {
      gainParam.setValueAtTime(0, startTime)
    }

    // Rest of envelope scheduling...
    gainParam.linearRampToValueAtTime(1, startTime + this.attackTime)
    gainParam.linearRampToValueAtTime(
      this.sustainLevel,
      startTime + this.attackTime + this.decayTime
    )

    this.isActive = true
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tone.js for all synthesis | Native Web Audio API with thin wrappers | 2020+ | Zero dependencies, tree-shakeable, smaller bundle |
| Manual timer-based envelopes | AudioParam automation | Web Audio API v1 (2015) | Sample-accurate timing, no desync |
| Ignore retriggering clicks | cancelAndHoldAtTime or manual calculation | 2017+ | Professional-quality synthesis |
| Custom curve calculations | setTargetAtTime for exponential decay | Web Audio API v1 | Mathematically correct asymptotic approach |
| Global AudioContext singleton | User-controlled initialization | Modern best practice | Respects browser autoplay policies |

**Deprecated/outdated:**
- **ScriptProcessorNode:** Deprecated in favor of AudioWorklet (not needed for ADSR)
- **Tone.js dependency:** Modern pattern is zero-dependency native API usage
- **Timer-based envelope control:** AudioParam automation is always superior
- **Hardcoded AudioContext:** User gesture requirement makes global context problematic

## Open Questions

Things that couldn't be fully resolved:

1. **Polyfill vs. Manual Calculation Trade-off**
   - What we know: cancelAndHoldAtTime polyfill exists, adds ~2KB
   - What's unclear: Performance impact of polyfill vs. manual calculation, browser support timeline
   - Recommendation: Start with manual calculation (cross-browser, zero deps), add polyfill if users report issues. Document browser support in README.

2. **Envelope Phase Events**
   - What we know: Phase 1 event system supports custom events
   - What's unclear: Whether users need 'attack-start', 'decay-start', 'sustain-start', 'release-start' events or if play/stop sufficient
   - Recommendation: Defer phase events to user feedback - YAGNI principle. Most synthesis doesn't need this granularity.

3. **ADSR for Sound/Track (not just Oscillator)**
   - What we know: ADSR traditionally for synthesis, but could apply to sample playback
   - What's unclear: Whether AudioBufferSourceNode envelope is useful pattern (samples have natural attack/decay)
   - Recommendation: Start with Oscillator-only ADSR (Phase 2), extend to Sound if users request (Phase 4 or later)

4. **Voice Pooling for Polyphony**
   - What we know: Multiple simultaneous notes need separate gain nodes (Phase 4 concern)
   - What's unclear: Whether Oscillator should support built-in polyphony or if LayeredSound handles this
   - Recommendation: Single-voice Oscillator for Phase 2, polyphony via LayeredSound in Phase 4

## Sources

### Primary (HIGH confidence)

- [MDN: AudioParam.setTargetAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime) - Official Web Audio API documentation
- [MDN: AudioParam.exponentialRampToValueAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime) - Zero value limitation documented
- [MDN: AudioParam.cancelScheduledValues()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelScheduledValues) - Automation cancellation
- [MDN: AudioParam.cancelAndHoldAtTime()](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime) - Retriggering without clicks
- [Building a Synthesizer with Web Audio API - Envelopes](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html) - Educational resource with clear ADSR definitions

### Secondary (MEDIUM confidence)

- [GitHub: mohayonao/adsr-envelope](https://github.com/mohayonao/adsr-envelope) - Reference implementation pattern
- [GitHub: rsimmons/fastidious-envelope-generator](https://github.com/rsimmons/fastidious-envelope-generator) - Retriggering edge case handling
- [GitHub: WebAudio/web-audio-api Issue #510](https://github.com/WebAudio/web-audio-api/issues/510) - Core retriggering problem discussion
- [GitHub: the-monochord/cancelandholdattime-polyfill](https://github.com/the-monochord/cancelandholdattime-polyfill) - Browser support workaround

### Tertiary (LOW confidence - contextual only)

- [Web Audio Weekly Issue #75](https://www.webaudioweekly.com/75) - Community discussion (date unknown)
- [Keith McMillen: Envelope Generator](https://www.keithmcmillen.com/blog/making-music-in-the-browser-web-audio-midi-envelope-generator/) - Tutorial (publication date unclear)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native Web Audio API methods are baseline, widely documented
- Architecture: HIGH - Separate Envelope class is established pattern (mohayonao, fastidious)
- Pitfalls: HIGH - All verified via MDN documentation and GitHub issue discussions
- Browser support: MEDIUM - cancelAndHoldAtTime support confirmed limited, but current 2026 status unclear
- Retriggering solutions: MEDIUM - Multiple approaches documented, but "best" is context-dependent

**Research date:** 2026-01-31
**Valid until:** ~60 days (stable Web Audio API spec, low churn risk)
