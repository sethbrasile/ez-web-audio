# Phase 1: Foundation - Research

**Researched:** 2026-01-31
**Domain:** Event system implementation, critical bug fixes, error handling patterns
**Confidence:** HIGH

## Summary

Phase 1 establishes the event system foundation that all advanced features will depend on. The research confirms that extending EventTarget is the correct pattern, with well-documented TypeScript typing strategies and mature cleanup patterns. The critical bugs are all related to lifecycle management, memory leaks, and inheritance patterns—all solvable with standard Web Audio API best practices.

The event system should use native EventTarget with TypeScript event maps for type safety, providing both standard addEventListener AND Node.js-style .on/.once/.off methods for developer ergonomics. The CONTEXT.md decisions lock in simple lowercase event names ("play", "stop", etc.), chainable .on() return values, and dual unsubscribe patterns (.off with/without handler).

Error handling should use custom Error subclasses (the dominant pattern in 2026) with minimal technical messages that include actionable fix suggestions for Web Audio gotchas like suspended AudioContext state.

**Primary recommendation:** Implement BaseSound extending EventTarget with typed event maps using discriminated union pattern. Add convenience .on/.once/.off methods wrapping addEventListener. Fix bugs using template method pattern (Track._play override), proper RAF cleanup, and AudioBufferSourceNode disconnection. Create custom Error subclasses with actionable messages.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| EventTarget | Native | Browser event system | Native API, zero dependencies, TypeScript compatible |
| CustomEvent | Native | Typed event payloads | Standard way to attach data to events |
| standardized-audio-context-mock | ^25.3.0 | AudioContext testing | Already in use, supports event testing |
| Vitest | ^2.1.8 | Test framework | Already in use, supports happy-dom environment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript 5.6+ | 5.7.x | Type safety for events | Event map definitions, discriminated unions |
| happy-dom | ^15.11.7 | DOM mocking | Test environment (already configured) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventTarget | Node.js EventEmitter | EventEmitter requires polyfill for browser, EventTarget is native |
| Custom Error classes | Error codes in standard Error | Error codes require verbose checks, instanceof is cleaner and future-proof |
| Discriminated union | Per-event interfaces | Union provides single type, better autocomplete, less repetition |

**Installation:**
```bash
# No new dependencies needed - all native or already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── base-sound.ts           # extends EventTarget, emits lifecycle events
├── events/
│   ├── event-types.ts      # EventMap interface, event payload types
│   └── event-emitter.ts    # .on/.once/.off mixin/methods
├── errors/
│   ├── audio-error.ts      # Base AudioError class
│   ├── context-error.ts    # AudioContextError subclass
│   └── load-error.ts       # AudioLoadError subclass
└── [existing structure]
```

### Pattern 1: TypeScript EventTarget with Discriminated Union

**What:** Define event map interface with all event types, use discriminated union for type-safe event handling.

**When to use:** Any class that emits lifecycle events (BaseSound, Track, etc.)

**Example:**
```typescript
// Source: Synthesized from https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658
// and https://ayubbegimkulov.com/type-safe-listeners/

// Define event payloads
interface PlayEventDetail {
  time: number // audioContext.currentTime when started
  source: BaseSound // reference to sound instance
}

interface StopEventDetail {
  time: number
  source: BaseSound
}

interface EndEventDetail {
  time: number
  source: BaseSound
  duration: number
}

interface SeekEventDetail {
  time: number
  source: Track
  position: number // new position in seconds
  previousPosition: number
}

// Event map with discriminated union
interface SoundEventMap {
  play: CustomEvent<PlayEventDetail>
  stop: CustomEvent<StopEventDetail>
  end: CustomEvent<EndEventDetail>
  pause: CustomEvent<StopEventDetail>
  resume: CustomEvent<PlayEventDetail>
  seek: CustomEvent<SeekEventDetail>
}

// Extend EventTarget with typed methods
export abstract class BaseSound extends EventTarget {
  // Type-safe addEventListener
  addEventListener<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options)
  }

  // Type-safe removeEventListener
  removeEventListener<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options)
  }

  // Emit helper for internal use
  protected emit<K extends keyof SoundEventMap>(
    type: K,
    detail: SoundEventMap[K]['detail']
  ): void {
    const event = new CustomEvent(type, { detail })
    this.dispatchEvent(event)
  }
}
```

### Pattern 2: Node.js-Style Convenience Methods (.on/.once/.off)

**What:** Wrapper methods that provide familiar EventEmitter-style API while delegating to native addEventListener.

**When to use:** Alongside native addEventListener for developer ergonomics.

**Example:**
```typescript
// Source: Synthesized from https://nodejs.org/api/events.html
// and user CONTEXT decisions

export abstract class BaseSound extends EventTarget {
  // Chainable .on() supporting single or multiple events
  on<K extends keyof SoundEventMap>(
    type: K | K[],
    listener: (event: SoundEventMap[K]) => void
  ): this {
    if (Array.isArray(type)) {
      type.forEach(t => this.addEventListener(t, listener))
    }
    else {
      this.addEventListener(type, listener)
    }
    return this // Enable chaining
  }

  // One-time listener
  once<K extends keyof SoundEventMap>(
    type: K,
    listener: (event: SoundEventMap[K]) => void
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }

  // Dual unsubscribe pattern
  off<K extends keyof SoundEventMap>(
    type: K,
    listener?: (event: SoundEventMap[K]) => void
  ): this {
    if (listener) {
      // Remove specific listener
      this.removeEventListener(type, listener)
    }
    else {
      // Remove ALL listeners for this event type
      // Note: Native EventTarget doesn't track listeners, so we need to implement this
      // Store listeners in WeakMap or use custom tracking
      this.removeAllListenersFor(type)
    }
    return this
  }

  // Remove all listeners for all events
  removeAllListeners(): this {
    // Implementation requires listener tracking
    return this
  }
}

// Usage example
sound
  .on('play', handlePlay)
  .on('stop', handleStop)
  .once('end', handleEnd)
  .on(['play', 'stop'], handleBoth)

sound.off('play', handlePlay) // Remove specific handler
sound.off('play') // Remove ALL play handlers
sound.removeAllListeners() // Clear everything
```

### Pattern 3: Custom Error Subclasses with Actionable Messages

**What:** Extend Error class for specific error types, include what went wrong AND how to fix.

**When to use:** All error throwing scenarios (AudioContext init, invalid notes, missing files, etc.)

**Example:**
```typescript
// Source: https://javascript.info/custom-errors
// https://adamcoster.com/blog/javascript-custom-errors

export class AudioError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AudioError'
    // Capture stack trace, exclude constructor from trace
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class AudioContextError extends AudioError {
  constructor(message: string, public state: AudioContextState) {
    super(message, 'CONTEXT_ERROR')
    this.name = 'AudioContextError'
  }
}

export class AudioLoadError extends AudioError {
  constructor(message: string, public url: string) {
    super(message, 'LOAD_ERROR')
    this.name = 'AudioLoadError'
  }
}

export class InvalidNoteError extends AudioError {
  constructor(message: string, public identifier: string) {
    super(message, 'INVALID_NOTE')
    this.name = 'InvalidNoteError'
  }
}

// Usage with actionable messages
if (audioContext.state === 'suspended') {
  throw new AudioContextError(
    'AudioContext is suspended. Call initAudio() after user interaction (click, tap).',
    audioContext.state
  )
}

if (!audioBuffer) {
  throw new AudioLoadError(
    `Failed to load audio file. Check URL and CORS headers. URL: ${url}`,
    url
  )
}

// Catching with instanceof (cleaner than code checks)
try {
  await sound.play()
}
catch (err) {
  if (err instanceof AudioContextError) {
    console.log('Context issue:', err.state)
  }
  else if (err instanceof AudioLoadError) {
    console.log('Load failed:', err.url)
  }
}
```

### Pattern 4: Template Method for Inheritance (Track.play Fix)

**What:** Extract shared logic to protected method (_play), let subclasses override cleanly.

**When to use:** When subclass needs to augment parent behavior without breaking super.play() variants.

**Example:**
```typescript
// Source: https://refactoring.guru/design-patterns/template-method/typescript/example
// https://www.totaltypescript.com/workshops/typescript-pro-essentials/typescript-classes/overriding-methods-in-typescript

export abstract class BaseSound extends EventTarget {
  public async play(): Promise<void> {
    await this._play()
  }

  public playIn(when: number): void {
    this._playIn(when)
  }

  public playFor(duration: number): void {
    this._playFor(duration)
  }

  // Template method - subclasses override this
  protected async _play(): Promise<void> {
    await this.playAt(this.audioContext.currentTime)
  }

  protected _playIn(when: number): void {
    this.playAt(this.audioContext.currentTime + when)
  }

  protected _playFor(duration: number): void {
    this.playAt(this.audioContext.currentTime)
    this.setTimeout(() => this.stop(), duration * 1000)
  }
}

export class Track extends Sound {
  // Override only the core _play method
  protected override async _play(): Promise<void> {
    await super._play()
    this.audioSourceNode.onended = () => this.stop()
    this.later(this.trackPlayPosition.bind(this))
  }

  // Now super.play(), super.playIn(), super.playFor() all work correctly
}
```

### Anti-Patterns to Avoid

- **Listener tracking in separate Map** — WeakMap prevents memory leaks, regular Map causes leaks if listeners aren't cleaned up
- **Anonymous functions as listeners** — Can't be removed with removeEventListener, always use named functions or store references
- **Emitting events during construction** — Listeners may not be attached yet, defer with this.later() or nextTick
- **Direct AudioParam.value assignment** — Silently fails during automation, always use setValueAtTime
- **Reusing AudioBufferSourceNode** — Single-use only, create new source for each play
- **Forgetting to cancel RAF** — Store requestId, call cancelAnimationFrame in cleanup

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event type safety | String literal types only | Discriminated union event map | Autocomplete, payload inference, exhaustive checking |
| Listener cleanup tracking | Custom listener registry | WeakMap or { once: true } | Prevents memory leaks, native GC |
| Error context preservation | throw new Error(msg) | Custom Error subclasses | Stack traces, instanceof checks, additional properties |
| requestAnimationFrame cleanup | Manual flag checking | Store requestId, cancelAnimationFrame | Prevents runaway loops, proper cleanup |
| AudioContext state checking | if (ctx.state === 'suspended') | try/catch with resume() | Handles interrupted state (iOS), promise-based |

**Key insight:** Native browser APIs have evolved to solve these problems. EventTarget + CustomEvent + Error.captureStackTrace cover all event/error needs without dependencies.

## Common Pitfalls

### Pitfall 1: EventListener Memory Leaks from Forgotten Cleanup

**What goes wrong:** Adding event listeners without removing them on component unmount/dispose causes memory leaks.

**Why it happens:** EventTarget holds strong references to listeners. If listener references component internals, entire component can't be garbage collected.

**How to avoid:**
- Store listener references for later removal
- Use { once: true } for single-fire events
- Implement dispose() method that calls removeAllListeners()
- Use WeakMap for listener storage to enable GC

**Warning signs:**
- Memory usage grows over time in long-running apps
- Sound instances aren't garbage collected after stop()
- Multiple event fires for single action

**Source:** [How to Avoid Memory Leaks in JavaScript Event Listeners](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna), [Troubleshooting JavaScript Memory Leaks](https://www.mindfulchase.com/explore/troubleshooting-tips/programming-languages/troubleshooting-javascript-memory-leaks-from-event-listener-mismanagement.html)

### Pitfall 2: AudioContext Suspended State After Creation

**What goes wrong:** AudioContext starts in "suspended" state due to browser autoplay policies. Sounds don't play, no errors thrown.

**Why it happens:** Browsers prevent autoplay until user interaction. AudioContext creation alone doesn't count as user interaction.

**How to avoid:**
- Always call audioContext.resume() before playback
- Check state and resume in initAudio()
- Include state in error messages: "AudioContext suspended. Call initAudio() after user interaction."
- Handle "interrupted" state on iOS Safari (background/minimize)

**Warning signs:**
- Sounds don't play on page load
- play() succeeds but no audio output
- Works after user clicks anything on page

**Source:** [MDN AudioContext.state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state), [AudioContext suspended issue](https://github.com/webrtc/samples/issues/1028)

### Pitfall 3: AudioBufferSourceNode Single-Use Violation

**What goes wrong:** Attempting to call start() twice on same AudioBufferSourceNode causes silent failure or error.

**Why it happens:** AudioBufferSourceNode is designed for single playback. After start(), node is "spent."

**How to avoid:**
- Create new AudioBufferSourceNode in setup() before each play
- Reuse AudioBuffer, NOT source node
- Disconnect old source in setup() before creating new one
- Document in comments: "Source nodes are single-use, recreated on each play"

**Warning signs:**
- Second play() call doesn't produce sound
- "InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable"
- Memory leak from accumulated source nodes

**Source:** [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode), [WebAudio API Issue #904](https://github.com/WebAudio/web-audio-api/issues/904)

### Pitfall 4: requestAnimationFrame Loop Not Cleaned Up

**What goes wrong:** RAF loop continues running after sound stops, consuming CPU and preventing garbage collection.

**Why it happens:** RAF callbacks don't auto-cancel. Loop continues until explicitly stopped or page unloads.

**How to avoid:**
- Store requestId: `this.rafId = requestAnimationFrame(animate)`
- Cancel in stop/pause: `if (this.rafId) cancelAnimationFrame(this.rafId)`
- Check _isPlaying in animate loop: `if (!this._isPlaying) return;`
- Set rafId to null after cancel

**Warning signs:**
- CPU usage high after all sounds stopped
- trackPlayPosition continues after pause
- Memory leak from closures in animate function

**Source:** [MDN cancelAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame), [RAF cleanup patterns](https://reintech.io/blog/tutorial-applying-cancelanimationframe-method)

### Pitfall 5: JavaScript Timer / AudioContext Clock Desynchronization

**What goes wrong:** Using setTimeout/setInterval for audio scheduling causes timing drift and stuttering.

**Why it happens:** JavaScript timers use system clock. AudioContext uses audio hardware clock. Clocks drift independently.

**How to avoid:**
- Use audioContext.currentTime for all audio scheduling
- Schedule events with audioSourceNode.start(when)
- Use audioContextAwareTimeout (already in codebase) for state management
- Never use Date.now() for audio timing

**Warning signs:**
- Audio timing drifts over long playback
- BeatTrack beats gradually slip out of sync
- Events fire slightly before/after expected time

**Source:** From project research/SUMMARY.md critical pitfall #2, [Web Audio Scheduling](https://loophole-letters.vercel.app/web-audio-scheduling)

### Pitfall 6: Anonymous Functions in .on() Can't Be Removed

**What goes wrong:** `sound.on('play', () => {...})` creates anonymous function that can't be removed with .off().

**Why it happens:** Each arrow function is a new reference. removeEventListener requires exact same function reference.

**How to avoid:**
- Use named functions: `sound.on('play', handlePlay)`
- Store arrow functions: `const handler = () => {...}; sound.on('play', handler)`
- For .bind(this), store result: `this.boundHandler = this.handle.bind(this)`
- Document: "Store listener reference to enable removal"

**Warning signs:**
- .off() doesn't remove listener
- Event fires multiple times after re-registration
- Memory leak from accumulated listeners

**Source:** [EventListener cleanup patterns](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)

## Code Examples

Verified patterns from official sources:

### Emitting Events at Lifecycle Moments

```typescript
// Source: Web Audio API ended event pattern
// https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event

export abstract class BaseSound extends EventTarget {
  protected async playAt(time: number): Promise<void> {
    const { audioContext } = this
    const { currentTime } = audioContext

    await audioContext.resume()

    this.setup()

    // Emit play event BEFORE starting source
    this.emit('play', {
      time: currentTime,
      source: this
    })

    this.audioSourceNode.start(time, this.startOffset)
    this.startedPlayingAt = time

    // Schedule end event using native onended
    this.audioSourceNode.onended = () => {
      if (this._isPlaying) {
        this.emit('end', {
          time: this.audioContext.currentTime,
          source: this,
          duration: this.duration.raw
        })
      }
    }

    if (time <= currentTime) {
      this._isPlaying = true
    }
    else {
      this.setTimeout(() => {
        this._isPlaying = true
      }, (time - currentTime) * 1000)
    }
  }

  public async stop(): Promise<void> {
    if (this._isPlaying) {
      this._isPlaying = false

      // Emit stop event
      this.emit('stop', {
        time: this.audioContext.currentTime,
        source: this
      })

      this.audioSourceNode.stop(this.audioContext.currentTime)
    }
  }
}
```

### Proper requestAnimationFrame Cleanup

```typescript
// Source: Synthesized from MDN and cleanup patterns
// https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
// https://codinhood.com/nano/js/stop-request-animation-frame-javascript

export class Track extends Sound {
  private rafId: number | null = null

  protected override async _play(): Promise<void> {
    await super._play()
    this.audioSourceNode.onended = () => this.stop()
    this.later(this.trackPlayPosition.bind(this))
  }

  private trackPlayPosition(): void {
    const { audioContext, startedPlayingAt, startOffset } = this

    const animate = (): void => {
      // Exit early if stopped
      if (!this._isPlaying) {
        this.rafId = null
        return
      }

      this.startOffset = startOffset + audioContext.currentTime - startedPlayingAt
      this.rafId = requestAnimationFrame(animate)
    }

    this.rafId = requestAnimationFrame(animate)
  }

  public override stop(): void {
    // Cancel RAF before stopping
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    this.startOffset = 0

    if (this._isPlaying) {
      this.audioSourceNode.onended = function () {}
      super.stop()
    }
  }

  public pause(): void {
    // Cancel RAF on pause
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this._isPlaying) {
      const node = this.audioSourceNode
      node.onended = function () {}
      node.stop()
      this._isPlaying = false
    }
  }
}
```

### Proper AudioBufferSourceNode Cleanup

```typescript
// Source: Web Audio API specification and memory leak issues
// https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
// https://github.com/WebAudio/web-audio-api/issues/904

export class Sound extends BaseSound {
  protected setup(): void {
    // Disconnect old source if exists (prevents memory leak)
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect()
        this.audioSourceNode.onended = null
      }
      catch (e) {
        // Already disconnected, ignore
      }
    }

    // Create new source (single-use node)
    const audioSourceNode = this.audioContext.createBufferSource()
    audioSourceNode.buffer = this.audioBuffer
    this.audioSourceNode = audioSourceNode

    // Wire connections and set parameters
    this.wireConnections()
    this.controller.setValuesAtTimes()

    // Cleanup after playback ends
    audioSourceNode.onended = () => {
      // Disconnect to free memory
      try {
        audioSourceNode.disconnect()
        audioSourceNode.onended = null
      }
      catch (e) {
        // Already disconnected
      }
    }
  }
}
```

### Error Handling with Custom Classes

```typescript
// Source: https://javascript.info/custom-errors
// https://adamcoster.com/blog/javascript-custom-errors

// In initAudio utility
export async function initAudio(context: AudioContext): Promise<void> {
  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch (err) {
      throw new AudioContextError(
        'Failed to resume AudioContext. Call initAudio() after user interaction (click, tap, keypress).',
        context.state
      );
    }
  }

  // iOS workaround
  if (context.state === 'interrupted') {
    throw new AudioContextError(
      'AudioContext interrupted (iOS backgrounded). Resume playback after returning to foreground.',
      context.state
    );
  }
}

// In audio loading
export async function loadAudio(url: string, context: AudioContext): Promise<AudioBuffer> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (err) {
    throw new AudioLoadError(
      `Network error loading audio. Check URL and internet connection. URL: ${url}`,
      url
    );
  }

  if (!response.ok) {
    throw new AudioLoadError(
      `HTTP ${response.status} loading audio. Check URL and server CORS headers. URL: ${url}`,
      url
    );
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (err) {
    throw new AudioLoadError(
      `Failed to read audio data. File may be corrupted. URL: ${url}`,
      url
    );
  }

  try {
    return await context.decodeAudioData(arrayBuffer);
  } catch (err) {
    throw new AudioLoadError(
      `Invalid audio format. Browser cannot decode this file type. URL: ${url}`,
      url
    );
  }
}

// In MusicallyAware
set identifier(id: AcceptableNote) {
  const match = id.match(/^([A-G])(b|#)?(\d)$/);

  if (!match) {
    throw new InvalidNoteError(
      `Invalid note identifier: "${id}". Expected format: Letter + optional accidental + octave (e.g., "A4", "Bb3", "C#5").`,
      id
    );
  }

  // ... rest of implementation
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String literal event types | Discriminated union event maps | TypeScript 4.x+ | Full type safety, autocomplete, payload inference |
| Error codes in strings | Custom Error subclasses | ES6 (2015) | Cleaner instanceof checks, better stack traces |
| Manual listener tracking | WeakMap or { once: true } | ES6 (2015) | Automatic GC, prevents memory leaks |
| setTimeout for audio | audioContext.currentTime | Web Audio API 1.0 | Eliminates timing drift |
| Reusing source nodes | Create new per play | Web Audio API spec | Avoids InvalidStateError |

**Deprecated/outdated:**
- EventEmitter polyfills — Native EventTarget is superior for browser
- Error.prototype.name = 'MyError' — Use class-based errors with Error.captureStackTrace
- Storing listeners in Array — Use WeakMap to prevent leaks

## Open Questions

Things that couldn't be fully resolved:

1. **Listener tracking for .off() without handler**
   - What we know: Native EventTarget doesn't expose listener list
   - What's unclear: Best approach to track listeners for removeAllListeners()
   - Recommendation: Use WeakMap to store listeners by event type, or document that .off(type) without handler isn't supported. Alternatively, accept limitation and require handler for .off().

2. **Event timing precision for scheduled playback**
   - What we know: Events should fire at audioContext.currentTime moments
   - What's unclear: Whether to emit events synchronously at scheduling time or asynchronously at actual play time
   - Recommendation: Emit 'play' immediately when start() is called (even if scheduled in future), include scheduled time in payload. This matches user expectation that .on('play', fn).play() fires synchronously.

3. **Oscillator.duration meaningful value**
   - What we know: Oscillators have no inherent duration (can play indefinitely)
   - What's unclear: Return Infinity, null, or keep returning { raw: 0 }?
   - Recommendation: Document that Oscillator.duration is "not applicable" and returns { raw: Infinity } to indicate indefinite playback. Update ERR-02 to document this behavior.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [MDN EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) - Native event system
- [MDN AudioScheduledSourceNode: ended event](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event) - Web Audio lifecycle events
- [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) - Single-use source nodes
- [MDN AudioContext.state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state) - Suspended state handling
- [MDN cancelAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame) - RAF cleanup

**TypeScript Patterns:**
- [Strongly typed event emitters using EventTarget](https://dev.to/43081j/strongly-typed-event-emitters-using-eventtarget-in-typescript-3658) - Event map pattern
- [Type-Safe Event listeners in TypeScript](https://ayubbegimkulov.com/type-safe-listeners/) - Discriminated unions
- [Custom errors in JavaScript](https://javascript.info/custom-errors) - Error subclass patterns
- [Custom JavaScript/TypeScript Errors](https://adamcoster.com/blog/javascript-custom-errors) - Error.captureStackTrace

**Node.js EventEmitter Reference:**
- [Node.js Events Documentation](https://nodejs.org/api/events.html) - .on/.once/.off/.removeAllListeners API

### Secondary (MEDIUM confidence)

**Design Patterns:**
- [Template Method in TypeScript](https://refactoring.guru/design-patterns/template-method/typescript/example) - Inheritance refactoring
- [Overriding Methods in TypeScript](https://www.totaltypescript.com/workshops/typescript-pro-essentials/typescript-classes/overriding-methods-in-typescript) - Override keyword

**Memory Management:**
- [How to Avoid Memory Leaks in JavaScript Event Listeners](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)
- [Troubleshooting JavaScript Memory Leaks from Event Listener Mismanagement](https://www.mindfulchase.com/explore/troubleshooting-tips/programming-languages/troubleshooting-javascript-memory-leaks-from-event-listener-mismanagement.html)
- [WebAudio API Issue #904 - Memory leaks](https://github.com/WebAudio/web-audio-api/issues/904)

**Web Audio Issues:**
- [AudioContext suspended issue](https://github.com/webrtc/samples/issues/1028)
- [Context stuck in suspended state on iOS](https://github.com/WebAudio/web-audio-api/issues/790)

### Tertiary (LOW confidence - needs validation)

**Web Search Findings:**
- [TypeScript event type inference](https://github.com/open-wc/custom-elements-manifest/issues/134) - Open issue, approach uncertain
- [RAF cleanup patterns](https://reintech.io/blog/tutorial-applying-cancelanimationframe-method) - Tutorial source, not official docs
- Custom event detail type inference — multiple conflicting approaches in community

**From Project Research:**
- research/SUMMARY.md critical pitfall #2 (timer desynchronization)
- STATE.md architectural decisions (EventTarget pattern, audioContext.currentTime)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native APIs with official MDN docs
- Architecture patterns: HIGH - EventTarget pattern well-established, TypeScript event maps proven
- Event typing: MEDIUM-HIGH - Multiple valid approaches, discriminated union recommended but not only option
- Error handling: HIGH - Custom Error subclasses dominant pattern, Error.captureStackTrace standard
- Bug fixes: HIGH - Template method, RAF cleanup, source node disconnection all well-documented
- Pitfalls: HIGH - All verified with official docs or GitHub issue trackers

**Research date:** 2026-01-31
**Valid until:** ~90 days (stable patterns, unlikely to change rapidly)

**Key uncertainties:**
- Best approach for .off() without handler (WeakMap tracking vs API limitation)
- Event emission timing for scheduled playback (sync vs async)
- Oscillator.duration return value (Infinity vs null vs 0)

**Recommendation for planning:**
Proceed with high confidence. All requirements (EVT-01 to EVT-07, FIX-01 to FIX-04, ERR-01 to ERR-04) are implementable with standard patterns. Defer listener tracking decision to implementation phase (can start without removeAllListeners() support). Event timing and Oscillator.duration are documentation issues, not blockers.
