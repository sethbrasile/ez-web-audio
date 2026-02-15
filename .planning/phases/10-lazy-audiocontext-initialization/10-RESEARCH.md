# Phase 10: Lazy AudioContext Initialization - Research

**Researched:** 2026-02-15
**Domain:** Web Audio API AudioContext lifecycle management
**Confidence:** HIGH

## Summary

Lazy AudioContext initialization is a well-established pattern in Web Audio applications that eliminates boilerplate user code and aligns with browser autoplay policies. The current ez-web-audio implementation already calls `initAudio()` inside most factory functions and calls `audioContext.resume()` inside `playAt()`, so the library is ~80% ready for this pattern. The remaining work is replacing the module-level `let audioContext` variable with a lazy getter that creates the context on first access, ensuring all code paths (including `createWhiteNoise()`) use the getter, and adding developer-friendly warnings when the context remains suspended.

Browser autoplay policies (Chrome, Safari, Firefox) require that AudioContext creation or first `resume()` call happen within a user gesture. Creating an AudioContext outside a user gesture results in a `suspended` state that persists until `resume()` is called from a click/tap/keypress handler. The pattern implemented by popular libraries like Howler.js is to create the AudioContext lazily on first use and automatically call `resume()` on play operations, logging a warning if the context remains suspended.

**Primary recommendation:** Replace the module-level `let audioContext: AudioContext` with a lazy initialization function that creates the context on first access. All internal code should call this getter instead of accessing the variable directly. The `playAt()` method already calls `audioContext.resume()`, so the final piece is adding a `console.warn()` when the context remains suspended after resume, pointing developers to the cause (no user gesture yet) and solution (call `initAudio()` explicitly or wait for user interaction).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Native | Audio processing and playback | Only browser-native audio API, widely supported since 2014 |
| AudioContext | Native | Single shared context per app | MDN best practices recommend one context per application |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| standardized-audio-context-mock | ^26.0.0 | AudioContext mocking for tests | Already in use for vitest unit tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Lazy getter function | Proxy object | Proxy adds complexity with no benefit for this use case |
| console.warn() | Throwing errors | Warning is friendlier - some users may intentionally pre-create context |
| Single shared context | Multiple contexts | Multiple contexts waste resources and complicate timing (MDN anti-pattern) |

**Installation:**
No new dependencies needed - this is a refactor of existing AudioContext management.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── index.ts              # getOrCreateAudioContext() getter replaces module-level variable
├── base-sound.ts         # Uses audioContext from constructor parameter
├── beat-track.ts         # Uses audioContext from constructor parameter
├── utils/
│   ├── timeout.ts        # Uses audioContext parameter (already correct)
│   └── unmute.ts         # Uses audioContext parameter (already correct)
└── *.test.ts            # Tests continue to pass with lazy initialization
```

### Pattern 1: Lazy AudioContext Getter

**What:** Replace module-level `let audioContext: AudioContext` with a function that creates the context on first call and returns the singleton instance on subsequent calls.

**When to use:** This is the mandatory pattern for this phase - all code paths must use the getter.

**Example:**
```typescript
// BEFORE (current implementation)
let audioContext: AudioContext

export async function initAudio(useIosMuteWorkaround = true): Promise<void> {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  // ... rest of initialization
}

// AFTER (lazy initialization)
let _audioContext: AudioContext | null = null

function getOrCreateAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

export async function initAudio(useIosMuteWorkaround = true): Promise<void> {
  const audioContext = getOrCreateAudioContext()
  // ... rest of initialization (unchanged)
}
```

**Key insight:** The getter must be called by ALL code paths that reference `audioContext`:
- All factory functions (`createSound`, `createTrack`, `createBeatTrack`, `createSampler`, `createOscillator`, `createFont`, `createSprite`, `createWhiteNoise`, `createLayeredSound`)
- `getAudioContext()` function (already calls `initAudio()`)
- `load()` helper function
- Any utility that needs the context (already correct - they take `audioContext` as a parameter)

### Pattern 2: Auto-Resume with Warning

**What:** Automatically call `audioContext.resume()` on play operations and log a `console.warn()` if the context remains suspended after resume attempt.

**When to use:** This is the developer-friendly pattern that eliminates silent failures.

**Example:**
```typescript
// In BaseSound.playAt() - Source: Web Audio API Best Practices
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
public async playAt(time: number): Promise<void> {
  const { audioContext } = this
  const { currentTime } = audioContext

  // Auto-resume suspended context
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // Warn if still suspended (no user gesture yet)
  if (audioContext.state === 'suspended') {
    console.warn(
      'ez-web-audio: AudioContext is suspended. Audio will not play until a user interaction occurs. ' +
      'Call initAudio() from a click/tap/keypress handler, or wait for user interaction before playing audio.'
    )
  }

  // ... rest of playback logic (unchanged)
}
```

**Source:**
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Check state and call resume()
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) - Browsers suspend contexts until user gesture

### Pattern 3: Preserve Explicit initAudio() API

**What:** Keep `initAudio()` as a public API for developers who need explicit control over initialization timing (iOS mute workaround timing, pre-warming, testing).

**When to use:** Always keep this API - it's a power-user escape hatch and doesn't conflict with lazy initialization.

**Example:**
```typescript
// initAudio() becomes optional but still available
// Use case 1: Explicit iOS workaround timing
button.addEventListener('click', async () => {
  await initAudio() // Developer controls exactly when iOS workaround runs
  const sound = await createSound('/click.mp3')
  sound.play()
})

// Use case 2: Pre-warming context
startButton.addEventListener('click', async () => {
  await initAudio() // Context is running before any audio loads
  // Now fetch and decode audio with context already ready
})

// Use case 3: Lazy usage (new in Phase 10)
button.addEventListener('click', async () => {
  // No initAudio() call needed
  const sound = await createSound('/click.mp3')
  sound.play() // Context created and resumed automatically
})
```

### Anti-Patterns to Avoid

- **Creating AudioContext outside getter:** Direct `new AudioContext()` calls bypass lazy initialization and can create multiple contexts (resource leak)
- **Throwing errors on suspended state:** Warnings are friendlier - some users intentionally pre-create context
- **Removing initAudio() API:** Power users need explicit control for iOS workarounds and testing
- **Eager initialization on module load:** Creates context before user interaction, interferes with background audio on mobile ([Howler.js Issue #993](https://github.com/goldfire/howler.js/issues/993))

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AudioContext lifecycle | Custom state machine for tracking created/suspended/running | `audioContext.state` property | Native API tracks all states including `interrupted` (iOS backgrounded) |
| User gesture detection | Click/touch event tracking system | `audioContext.resume()` + state check | Browser autoplay policy handles this automatically |
| iOS audio routing | Custom iOS detection and audio routing | `unmute.js` library (already in codebase) | Handles ringer vs media channel edge cases |
| Multiple context coordination | Singleton pattern with complex locking | Single module-level context | Web Audio spec discourages multiple contexts |

**Key insight:** Browser autoplay policy and AudioContext state machine handle 90% of initialization complexity. The library's job is just wrapping this in a developer-friendly API with helpful warnings.

## Common Pitfalls

### Pitfall 1: Silent Failure on Suspended Context

**What goes wrong:** Developer calls `sound.play()` before user interaction. Context is suspended, audio doesn't play, no error or warning appears. Developer is confused.

**Why it happens:** AudioContext starts in `suspended` state when created outside user gesture. Calling `resume()` without checking result or state allows silent failure.

**How to avoid:**
1. Always check `audioContext.state` after calling `resume()`
2. Log `console.warn()` if state is still `suspended` with actionable message
3. Current code already calls `resume()` in `playAt()` - just needs the warning

**Warning signs:**
- Users report "audio doesn't work" on first page load
- Audio works after first click but not before
- No errors in console but no sound plays

### Pitfall 2: Module-Level Variable Access

**What goes wrong:** Code directly accesses `audioContext` module variable instead of calling the getter. Context is null/undefined, throws runtime error.

**Why it happens:** Refactoring oversight - code assumes `audioContext` is always initialized.

**How to avoid:**
1. Make original variable private (`_audioContext`) so direct access is a TypeScript error
2. Export only the getter function
3. Grep codebase for `\baudioContext\b` and verify each access uses getter or parameter

**Warning signs:**
- `TypeError: Cannot read property 'createGain' of undefined`
- Tests pass but production code fails
- Works when `initAudio()` is called but fails without it

### Pitfall 3: Multiple AudioContext Instances

**What goes wrong:** Getter function creates new AudioContext on every call instead of returning singleton. Multiple contexts waste resources and break timing synchronization.

**Why it happens:** Forgot to store the instance in a module-level variable.

**How to avoid:**
1. Store instance in `_audioContext` module variable
2. Check if variable is set before creating new instance
3. Add test: "creates AudioContext only once across multiple factory calls"

**Warning signs:**
- Memory usage grows unexpectedly
- Audio timing drifts between sounds
- Browser warns about "too many AudioContexts"

### Pitfall 4: Breaking Existing Tests

**What goes wrong:** Tests assume `audioContext` is initialized in specific way. Lazy initialization changes timing, tests fail.

**Why it happens:** Tests may directly mock `audioContext` variable instead of using the getter.

**How to avoid:**
1. Run full test suite (`pnpm test`) before and after refactor
2. Update test mocks to stub the getter function, not the variable
3. Ensure tests that create sounds still work without explicit `initAudio()` call

**Warning signs:**
- Tests fail with "audioContext is not defined"
- Mock assertions fail because getter wasn't called
- Tests pass individually but fail when run together (state pollution)

## Code Examples

Verified patterns from official sources and library implementation:

### Lazy Initialization Pattern
```typescript
// Source: Web Audio API Best Practices
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices

let _audioContext: AudioContext | null = null

function getOrCreateAudioContext(): AudioContext {
  if (!_audioContext) {
    _audioContext = new AudioContext()
  }
  return _audioContext
}

// All factory functions use the getter
export async function createSound(url: string): Promise<Sound> {
  const audioContext = getOrCreateAudioContext()
  return load(url, 'sound', audioContext) as Promise<Sound>
}

export async function createWhiteNoise(): Promise<Sound> {
  const audioContext = getOrCreateAudioContext()
  const bufferSize = audioContext.sampleRate
  const audioBuffer = audioContext.createBuffer(1, bufferSize, bufferSize)
  const output = audioBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1
  }

  return new Sound(audioContext, audioBuffer)
}
```

### Auto-Resume with Warning
```typescript
// Source: MDN Web Audio Best Practices + Chrome Autoplay Policy
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
// https://developer.chrome.com/blog/autoplay

// In BaseSound.playAt()
public async playAt(time: number): Promise<void> {
  const { audioContext } = this
  const { currentTime } = audioContext

  // Try to resume suspended context
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // Warn if still suspended after resume attempt
  if (audioContext.state === 'suspended') {
    console.warn(
      'ez-web-audio: AudioContext is suspended. Audio may not play until resumed from a user gesture. ' +
      'To fix this, call initAudio() from a click/tap/keypress handler, or wait for user interaction before calling play().'
    )
  }

  // ... rest of playback (unchanged)
}
```

### Migrating User Code (Breaking Change Assessment)
```typescript
// BEFORE Phase 10 (required initAudio call)
button.addEventListener('click', async () => {
  await initAudio()  // REQUIRED
  const sound = await createSound('/click.mp3')
  sound.play()
})

// AFTER Phase 10 (initAudio is optional)
// Option 1: Explicit control (still works, no breaking change)
button.addEventListener('click', async () => {
  await initAudio()  // OPTIONAL - for iOS workaround timing
  const sound = await createSound('/click.mp3')
  sound.play()
})

// Option 2: Fully lazy (new capability)
button.addEventListener('click', async () => {
  const sound = await createSound('/click.mp3')
  sound.play()  // Context created + resumed automatically
})

// Option 3: Pre-warm context, play later (new capability)
button.addEventListener('click', async () => {
  const sound = await createSound('/click.mp3')
  // Context created but may be suspended

  // Later, after another user gesture...
  sound.play()  // Auto-resumes if needed
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Require explicit `initAudio()` | Lazy initialization on first use | Howler.js moved to lazy in ~2018 | Simpler developer API, no boilerplate |
| Silent failure on suspended context | Console warnings with actionable guidance | Chrome autoplay policy in 2018 | Developers see clear error messages |
| Create context on module load | Create context on first API call | Howler.js Issue #993 (2017) | Avoids interfering with background audio on mobile |
| Throw errors on suspended state | Warn and continue | Common pattern in modern libraries | More forgiving UX - audio may work after user gesture |

**Deprecated/outdated:**
- **ScriptProcessorNode**: Replaced by AudioWorklet (2018) - not used in ez-web-audio
- **webkitAudioContext prefix**: No longer needed - standardized in all browsers
- **Multiple AudioContext pattern**: MDN now recommends single shared context per app

## Open Questions

1. **Should we warn on every play() while suspended, or once per session?**
   - What we know: Current debug system can suppress repeated warnings
   - What's unclear: Best UX balance between "helpful" and "noisy"
   - Recommendation: Warn once per AudioContext instance (use a flag `_hasWarnedAboutSuspended`), reset flag on successful resume. This prevents console spam while still alerting developers to the issue.

2. **Should createWhiteNoise() also call initAudio() like other factory functions?**
   - What we know: It currently uses `audioContext` directly without initialization
   - What's unclear: Whether this is an oversight or intentional
   - Recommendation: Make it consistent - call `getOrCreateAudioContext()` like other factories. This ensures white noise generation works without explicit `initAudio()` call.

3. **Should we auto-run iOS workaround on first play() or only when initAudio() is explicitly called?**
   - What we know: iOS mute workaround (`unmute.js`) must run from user gesture
   - What's unclear: If we auto-resume in `play()`, should we also auto-run iOS workaround?
   - Recommendation: Run iOS workaround on first `play()` if not already run. Store flag `iosWorkaroundPerformed` (already exists) and check in `playAt()`. This makes iOS audio work without explicit `initAudio()` call, fully delivering on "developers never need to think about AudioContext initialization" goal.

## Sources

### Primary (HIGH confidence)
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Lazy initialization, single context, state checking
- [MDN AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) - AudioContext states and lifecycle
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay) - Browser requirements for audio playback
- [MDN Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) - User gesture requirements and handling

### Secondary (MEDIUM confidence)
- [Howler.js GitHub Issues](https://github.com/goldfire/howler.js/issues/993) - Real-world lazy initialization challenges (mobile background audio)
- [Howler.js AudioContext Initialization Discussion](https://github.com/goldfire/howler.js/issues/1105) - How other libraries handle resume()
- [Web Audio API GitHub Discussion #2604](https://github.com/WebAudio/web-audio-api/discussions/2604) - Community consensus on handling suspended state

### Tertiary (LOW confidence)
- None - all findings are verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Web Audio API is the only browser-native option, well-documented
- Architecture: HIGH - Lazy initialization is established pattern in Howler.js, Tone.js, verified by MDN
- Pitfalls: HIGH - Based on known issues from Howler.js and MDN guidance on common mistakes

**Research date:** 2026-02-15
**Valid until:** 2026-08-15 (6 months - Web Audio API is mature and stable)
