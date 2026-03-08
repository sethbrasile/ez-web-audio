# Phase 3: Utility Features - Research

**Researched:** 2026-01-31
**Domain:** Web Audio API utilities (sprites, preloading, collections)
**Confidence:** HIGH

## Summary

This phase adds three utility systems to ez-web-audio: audio sprites (play segments from a single file), collection utilities (stopAll/pauseAll/playAll), and preloading (cache decoded audio). All three leverage native Web Audio API patterns with zero dependencies.

Audio sprites follow the established audiosprite JSON format (compatible with Howler.js/Jukebox) with name-to-timerange mappings. The codebase already has Response-based caching in `load()` function that can be extended for preloading. Collection utilities need recursive array flattening and Promise.allSettled for best-effort error handling.

Key architectural insight: Web Audio API encourages AudioBuffer reuse with lightweight source nodes per playback, which aligns perfectly with sprite concurrent playback (multiple source nodes from one buffer at different offsets).

**Primary recommendation:** Implement sprites as a wrapper class around Sound/Track that manages offset timing, extend existing Response cache for preloading with Map-based API, and create standalone collection utilities using Array.flat(Infinity) with Promise.allSettled.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Web Audio API | - | Audio sprites, buffer management | Zero dependencies maintained, browser native |
| Native Array.prototype.flat | ES2019+ | Recursive array flattening | Built-in, performant, widely supported |
| Native Promise.allSettled | ES2020+ | Best-effort collection ops | Prevents single failure from breaking all operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| audiosprite (dev tool) | Latest | Generate sprite JSON | Development/asset pipeline only, not runtime |
| fetch + decodeAudioData | Native | Preload pipeline | Already used in codebase's load() function |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| audiosprite format | Custom format | audiosprite is de facto standard (Howler.js, Phaser, CreateJS compatible) |
| Promise.allSettled | Promise.all | Promise.all fails-fast; allSettled gives best-effort behavior per requirements |
| Response cache | Cache API | Cache API requires service worker or more complex setup; Response cache simpler |

**Installation:**
```bash
# No runtime dependencies needed (native Web Audio API)
# Optional dev tool for generating sprite JSON:
npm install audiosprite --save-dev
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── sprite.ts           # AudioSprite class wrapping Sound/Track with offset management
├── preload.ts          # Preload cache API extending existing Response map
├── utils/
│   └── collections.ts  # stopAll/pauseAll/playAll standalone functions
└── index.ts            # Export createSprite, preload functions, collection utils
```

### Pattern 1: AudioBuffer Reuse with Offset Playback
**What:** Web Audio API encourages single AudioBuffer with multiple lightweight AudioBufferSourceNode instances for concurrent playback
**When to use:** Audio sprites playing multiple sounds simultaneously from one file
**Example:**
```javascript
// From codebase: src/sound.ts already creates new source per play
protected setup(): void {
  const audioSourceNode = this.audioContext.createBufferSource()
  audioSourceNode.buffer = this.audioBuffer  // Reuse buffer
  this.audioSourceNode = audioSourceNode
  // ...
}

// Sprite extends this pattern with offset:
audioSourceNode.start(when, offset, duration)
// offset = sprite start time
// duration = sprite end - start
```
**Source:** [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), codebase src/sound.ts lines 47-50

### Pattern 2: Response Caching for Preload
**What:** Cache fetch Response objects in Map, clone for reuse (already implemented in codebase)
**When to use:** Preloading audio before Sound/Track creation
**Example:**
```javascript
// From codebase: src/index.ts lines 26-27, 187-191
const responses = new Map<string, Response>()

async function load(src: string, type: 'sound' | 'track' | 'sampler') {
  if (responses.has(src)) {
    const res = await responses.get(src)!.clone()
    const buffer = await audioContext.decodeAudioData(await res.arrayBuffer())
    return createSoundFor(type, buffer)
  }
  // ... fetch and cache
  responses.set(src, response)
}
```
**Source:** Codebase src/index.ts, [MDN Fast playback with preload](https://web.dev/fast-playback-with-preload/)

### Pattern 3: Recursive Array Flatten
**What:** Use native Array.flat(Infinity) for recursive nested array flattening
**When to use:** Collection utilities processing nested Playable arrays
**Example:**
```javascript
// ES2019 native method
function flattenPlayables<T>(items: (T | T[])[]): T[] {
  return items.flat(Infinity) as T[]
}

// Usage in collection utilities
export async function stopAll(sounds: (Playable | Playable[])[]): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  await Promise.allSettled(flattened.map(s => s.stop()))
}
```
**Source:** [MDN Array.prototype.flat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat)

### Pattern 4: Promise.allSettled for Best-Effort Operations
**What:** Use Promise.allSettled to act on all items, collect errors, reject if any failed
**When to use:** Collection utilities where one failure shouldn't block others
**Example:**
```javascript
export async function playAll(sounds: (Playable | Playable[])[]): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  const results = await Promise.allSettled(flattened.map(s => s.play()))

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    throw new Error(`Failed to play ${errors.length} of ${flattened.length} sounds`)
  }
}
```
**Source:** [MDN Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled), [LogRocket Promise.all vs allSettled](https://blog.logrocket.com/promise-all-modern-async-patterns/)

### Pattern 5: Audiosprite JSON Format
**What:** De facto standard JSON structure for sprite metadata (Howler.js/Jukebox compatible)
**When to use:** Audio sprite metadata files
**Example:**
```json
{
  "resources": ["sounds.mp3", "sounds.ogg", "sounds.m4a"],
  "spritemap": {
    "laser": {
      "start": 0,
      "end": 0.3,
      "loop": false
    },
    "explosion": {
      "start": 1.0,
      "end": 2.5,
      "loop": false
    },
    "bgm": {
      "start": 3.0,
      "end": 15.0,
      "loop": true
    }
  }
}
```
**Source:** [audiosprite GitHub](https://github.com/tonistiigi/audiosprite), [Howler.js sprite example](https://github.com/goldfire/howler.js/tree/master/examples/sprite)

### Anti-Patterns to Avoid
- **Storing playback IDs in sprite class state:** Web Audio source nodes are single-use and self-cleaning. Don't track them unnecessarily - let them garbage collect after playback ends
- **Using Promise.all for collection utilities:** Fails fast on first error, violating "best-effort" requirement. Use Promise.allSettled instead
- **Caching AudioBuffer directly:** Cache the Response instead, decode on-demand. Allows cloning without duplicating decoded data in memory
- **Sprite spacing < 300ms:** HTML5 audio inaccuracy and Web Audio timing can cause neighboring clips to bleed. Use 500ms spacing for safety
- **Hand-rolling array flatten:** Native Array.flat(Infinity) is optimized and handles edge cases (holes, non-array items)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array flattening | Recursive function | Array.flat(Infinity) | Native, optimized, handles sparse arrays and edge cases |
| Audiosprite format | Custom JSON schema | audiosprite format | Industry standard, tool ecosystem, library compatibility |
| Concurrent promise handling | try/catch loops | Promise.allSettled | Built-in parallel execution, error collection, simpler code |
| Audio buffer caching | Custom cache class | Map with Response objects | Already implemented in codebase, simple, no dependencies |
| Sprite timing calculations | Manual start/stop tracking | AudioBufferSourceNode offset params | Web Audio API handles timing, sub-sample accuracy |

**Key insight:** Web Audio API and modern JavaScript provide all needed primitives. Custom solutions add complexity without benefit.

## Common Pitfalls

### Pitfall 1: AudioBuffer Memory Leaks
**What goes wrong:** Creating new AudioBuffers instead of reusing them for sprites/preload
**Why it happens:** Misunderstanding Web Audio API pattern - buffers are reusable, sources are single-use
**How to avoid:**
- Cache decoded AudioBuffer per URL, create new AudioBufferSourceNode per play
- Codebase already does this correctly in Sound.setup() (creates new source, reuses buffer)
- Extend this pattern for sprites (multiple sprites share one buffer, different offsets)
**Warning signs:**
- Memory usage grows with each play call
- Performance degrades over time
- Multiple identical buffers in memory profiler

**Source:** [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [Web Audio FAQ](https://developer.chrome.com/blog/web-audio-faq)

### Pitfall 2: Sprite Boundary Bleed
**What goes wrong:** One sprite plays fragments of neighboring sprites
**Why it happens:**
- Insufficient spacing between clips in source audio
- Timing imprecision (especially HTML5 audio, less with Web Audio API)
- Attack/release causing audible clicks extending beyond boundaries
**How to avoid:**
- Space sprites by 500ms minimum (300ms minimum per MDN, 500ms safer)
- Use AudioBufferSourceNode.start(when, offset, duration) with explicit duration
- Apply short fade-in/fade-out envelopes at sprite boundaries if needed
**Warning signs:**
- Audible clicks or pops at sprite start/end
- Wrong sounds bleeding into playback
- Timing feels imprecise

**Source:** [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games), [Mozilla Hacks Audio Sprites](https://hacks.mozilla.org/2012/04/html5-audio-and-audio-sprites-this-should-be-simple/)

### Pitfall 3: Preload Cache Invalidation
**What goes wrong:** Cached audio becomes stale or outdated, or cache grows unbounded
**Why it happens:**
- No cache lifetime strategy
- No way to clear/refresh cache
- Missing URL versioning for asset updates
**How to avoid:**
- Provide clearPreloadCache() and clearPreloadCache(url) functions
- Document that cache persists for page lifetime (no automatic eviction)
- Users handle URL versioning (e.g., 'sound.mp3?v=2') for asset updates
- Cache is in-memory only (cleared on page refresh)
**Warning signs:**
- Outdated audio playing after asset updates
- Memory usage grows indefinitely
- No way to force reload

**Source:** [API Caching Strategies](https://blog.dreamfactory.com/api-caching-strategies-challenges-and-examples)

### Pitfall 4: Collection Utility Type Safety
**What goes wrong:** Runtime errors from calling pauseAll on non-Track types, or stopAll with invalid Playable objects
**Why it happens:**
- TypeScript can't enforce that array elements implement pause() at compile time for generic arrays
- Nested arrays make type checking complex
**How to avoid:**
- Use type guards and runtime checks in collection utilities
- Document that pauseAll only works on Track instances (Playables with pause method)
- Silently skip items without the required method (defensive programming)
- Log warnings for skipped items (helps debugging)
**Warning signs:**
- TypeError: sound.pause is not a function
- Collection utilities fail with cryptic errors
- Type assertions bypass safety

### Pitfall 5: Concurrent Sprite Playback Limits
**What goes wrong:** Assuming unlimited concurrent sprites, then hitting browser/device limits
**Why it happens:**
- Web Audio API has no strict limit, but practical limits exist (browser, CPU, RAM)
- Some processors handle 1000+ sounds, others struggle with 32+
- Mobile devices more constrained than desktop
**How to avoid:**
- Document no hard limit, but warn of practical constraints
- Allow user to configure max concurrent sounds if needed (future enhancement)
- Test on target devices (mobile, low-end hardware)
- Monitor performance and memory usage
**Warning signs:**
- Audio stuttering or dropout
- Increasing latency on subsequent plays
- Browser becoming unresponsive

**Source:** [Web Audio API FAQ](https://developer.chrome.com/blog/web-audio-faq), [Medium Web Audio Streaming](https://medium.com/@coders.stop/audio-streaming-with-web-audio-api-making-sound-actually-sound-good-on-the-web-65915047736f)

## Code Examples

Verified patterns from codebase and official sources:

### Sprite Definition and Playback
```typescript
// Based on audiosprite format and Howler.js patterns
export interface SpriteDefinition {
  start: number // seconds
  end: number // seconds
  loop?: boolean // default false
}

export interface SpriteManifest {
  resources?: string[] // optional, for multi-format support
  spritemap: Record<string, SpriteDefinition>
  autoplay?: string // sprite name to autoplay
}

export class AudioSprite {
  constructor(
    private audioContext: AudioContext,
    private audioBuffer: AudioBuffer,
    private manifest: SpriteManifest
  ) {}

  play(spriteName: string): void {
    const sprite = this.manifest.spritemap[spriteName]
    if (!sprite) {
      throw new Error(`Sprite "${spriteName}" not found`)
    }

    // Create new source node (lightweight, reuse buffer)
    const source = this.audioContext.createBufferSource()
    source.buffer = this.audioBuffer
    source.connect(this.audioContext.destination)

    const offset = sprite.start
    const duration = sprite.end - sprite.start
    source.loop = sprite.loop ?? false

    source.start(this.audioContext.currentTime, offset, duration)
  }
}
```
**Source:** [Howler.js sprite example](https://github.com/goldfire/howler.js/tree/master/examples/sprite), [audiosprite format](https://github.com/tonistiigi/audiosprite)

### Preload Cache Extension
```typescript
// Extend existing Response cache from src/index.ts
const responses = new Map<string, Response>()

export async function preload(urls: string | string[]): Promise<void> {
  const urlArray = Array.isArray(urls) ? urls : [urls]

  const results = await Promise.allSettled(
    urlArray.map(async (url) => {
      if (responses.has(url)) {
        return // already cached
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${url}`)
      }
      responses.set(url, response)
    })
  )

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    throw new Error(`Failed to preload ${errors.length} of ${urlArray.length} URLs`)
  }
}

export function isPreloaded(url: string): boolean {
  return responses.has(url)
}

export function clearPreloadCache(url?: string): void {
  if (url) {
    responses.delete(url)
  }
  else {
    responses.clear()
  }
}
```
**Source:** Codebase src/index.ts, [MDN Fast playback with preload](https://web.dev/fast-playback-with-preload/)

### Collection Utilities
```typescript
// src/utils/collections.ts
export async function stopAll(sounds: (Playable | Playable[])[]): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  const results = await Promise.allSettled(flattened.map(s => s.stop()))

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    throw new Error(`Failed to stop ${errors.length} of ${flattened.length} sounds`)
  }
}

export async function pauseAll(tracks: (Track | Track[])[]): Promise<void> {
  const flattened = tracks.flat(Infinity) as Track[]
  const results = await Promise.allSettled(
    flattened.map(async (track) => {
      // Type guard: only pause if method exists
      if ('pause' in track && typeof track.pause === 'function') {
        track.pause()
      }
    })
  )

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    throw new Error(`Failed to pause ${errors.length} of ${flattened.length} tracks`)
  }
}

export async function playAll(sounds: (Playable | Playable[])[]): Promise<void> {
  const flattened = sounds.flat(Infinity) as Playable[]
  const results = await Promise.allSettled(flattened.map(s => s.play()))

  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    throw new Error(`Failed to play ${errors.length} of ${flattened.length} sounds`)
  }
}
```
**Source:** [MDN Array.flat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat), [MDN Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 `<audio>` sprites with timeupdate | Web Audio API AudioBufferSourceNode offset | ~2014-2015 | Sub-millisecond accuracy vs 250ms event resolution |
| Custom recursive flatten functions | Array.flat(Infinity) | ES2019 (2019) | Native optimization, handles sparse arrays, simpler code |
| Promise.all for bulk operations | Promise.allSettled for best-effort | ES2020 (2020) | Failed operations don't block successful ones |
| IndexedDB for audio cache | Response cloning in Map | ~2018+ | Simpler API, no async storage overhead, adequate for session |
| Custom audio sprite formats | audiosprite JSON standard | ~2013-2014 | Cross-library compatibility (Howler, Phaser, CreateJS) |

**Deprecated/outdated:**
- `<audio>` element sprite playback: Web Audio API provides better timing and control
- Custom Promise combinators: Promise.allSettled is native and standardized
- Manual array flattening: Array.flat handles it natively with better edge case handling

## Open Questions

Things that couldn't be fully resolved:

1. **Should sprites integrate with BaseSound event system?**
   - What we know: BaseSound emits 'play', 'stop', 'end' events (Phase 1). Sprites play segments of a single file
   - What's unclear: Whether sprite plays should emit events per sprite or per buffer, and how to identify which sprite triggered the event
   - Recommendation: Emit events with sprite metadata (name, offset, duration) in event detail. Each sprite play emits its own event

2. **Sprite gain/pan: per-sprite or per-manifest?**
   - What we know: SPRITE-04 requires gain/pan control. Codebase uses GainNode and StereoPannerNode per Sound
   - What's unclear: Whether gain/pan applies to all sprites from a manifest, or individually per sprite
   - Recommendation: Per-play override pattern: `sprite.play('laser', { gain: 0.5, pan: -1 })`, defaults to sprite instance properties

3. **Preload cache: should it decode eagerly or lazily?**
   - What we know: Codebase caches Response objects, decodes on createSound/createTrack. Decoding is CPU-intensive
   - What's unclear: Whether preload should decode immediately (higher upfront cost, faster createSound) or defer (lower preload time, decode on demand)
   - Recommendation: Start with Response caching (lazy decode) per existing pattern. Add optional eager decode in future if needed

4. **Collection utilities: should they return results/stats?**
   - What we know: Requirements say return Promise<void>. Promise.allSettled gives per-item results
   - What's unclear: Whether users need to know which items succeeded/failed beyond just throwing
   - Recommendation: Return Promise<void>, throw with count on error per spec. Add detailed result variant if users request it

## Sources

### Primary (HIGH confidence)
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Buffer management, performance patterns
- [MDN Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games) - Audio sprite implementation, spacing guidelines
- [MDN Array.prototype.flat()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) - Recursive flattening syntax and behavior
- [MDN Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) - Best-effort error handling
- [audiosprite GitHub](https://github.com/tonistiigi/audiosprite) - JSON format specification
- Codebase src/index.ts - Existing Response cache pattern (lines 26-27, 187-227)
- Codebase src/sound.ts - AudioBuffer reuse pattern (lines 36-65)

### Secondary (MEDIUM confidence)
- [Howler.js sprite example](https://github.com/goldfire/howler.js/tree/master/examples/sprite) - Concurrent sprite playback patterns
- [Mozilla Hacks: Audio Sprites](https://hacks.mozilla.org/2012/04/html5-audio-and-audio-sprites-this-should-be-simple/) - Sprite spacing, timing considerations
- [Web.dev Fast playback with preload](https://web.dev/fast-playback-with-preload/) - Preload strategies for media
- [LogRocket Promise.all vs allSettled](https://blog.logrocket.com/promise-all-modern-async-patterns/) - Modern async patterns (2025)
- [Web Audio FAQ - Chrome Developers](https://developer.chrome.com/blog/web-audio-faq) - Concurrent playback limits, buffer reuse

### Tertiary (LOW confidence)
- WebSearch results on Web Audio streaming (Medium 2026) - General patterns, not sprite-specific
- TypeScript recursive types (Medium 2024) - Type-level flattening (not needed, runtime flat() sufficient)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native Web Audio API and ES2019+ features are authoritative standards
- Architecture: HIGH - All patterns verified in codebase (Response cache, buffer reuse) or official docs
- Pitfalls: HIGH - Sourced from MDN, Mozilla Hacks, Chrome Developers blog (authoritative)
- Collection utilities: HIGH - Promise.allSettled and Array.flat are standard features with official docs
- Sprite format: HIGH - audiosprite format is de facto standard, verified in multiple libraries

**Research date:** 2026-01-31
**Valid until:** 2026-03-31 (60 days - stable domain, Web Audio API mature, ES features finalized)
