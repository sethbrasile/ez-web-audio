# Phase 61: Audio Sprites Redesign - Research

**Researched:** 2026-03-06
**Domain:** Audio sprite manifest formats, sound asset creation, Vue demo component
**Confidence:** HIGH

## Summary

This phase adds Howler-style sprite manifest support to the existing `AudioSprite` class and replaces the current demo (which uses a single kick drum with artificial segments) with a compelling multi-sound demo using sounds from the soundfx library. The technical work is well-scoped: the `AudioSprite` class and `createSprite()` factory already work correctly with audiosprite format -- we need to add a normalization layer for Howler-style `[offset, duration, loop?]` tuples and create a new Vue demo component with a visual timeline.

The soundfx library provides a ready-made sprite file (`soundfx.data-sprite.mp3`) with a Howler-style JSON manifest containing 75 sounds. We will extract 6 specific sounds from the individual MP3 files in `soundfx.d/` and create a custom subset sprite file.

**Primary recommendation:** Add format detection in `createSprite()` (check for `sprite` vs `spritemap` key), normalize Howler tuples to internal `SpriteDefinition`, create a new sprite audio file from soundfx individual MP3s, and build a timeline-based Vue demo.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ez-web-audio (AudioSprite) | current | Sprite playback | Already implemented, just needs format normalization |
| Vue 3 | 3.x | Demo component | Already used for all docs site interactive demos |
| VitePress | current | Docs site | Already the docs framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ffmpeg/sox | system | Combining individual MP3s into sprite file | Asset creation (one-time, manual) |
| audiosprite CLI | npm | Alternative sprite generation | Mention in docs, but manual creation is fine for 6 sounds |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual sprite creation | audiosprite CLI | CLI automates silence gaps but adds a dependency; manual is fine for 6 sounds |
| CSS timeline | Canvas waveform | Canvas is overkill; spec explicitly says "pure CSS (colored divs positioned by percentage)" |

## Architecture Patterns

### Manifest Format Detection

The key design decision is how to detect and normalize the two formats. Detection is based on top-level key:

```typescript
// Howler format: has "sprite" key, values are [offset_ms, duration_ms, loop?]
{
  "sprite": {
    "laser": [0, 300],
    "explosion": [1000, 2500],
    "powerup": [4000, 500, true]
  }
}

// audiosprite format: has "spritemap" key, values are {start, end, loop} in seconds
{
  "spritemap": {
    "laser": { "start": 0, "end": 0.3, "loop": false }
  }
}
```

**CRITICAL difference:** Howler uses `[offset_ms, duration_ms]` while audiosprite uses `{start_seconds, end_seconds}`. The normalization must:
1. Convert ms to seconds (divide by 1000)
2. Convert `[offset, duration]` to `{start, end}` (end = offset + duration, both in seconds)
3. Extract optional third tuple element as `loop`

### Recommended Type Changes

```typescript
// New: Howler-style tuple - [offset_ms, duration_ms] or [offset_ms, duration_ms, loop]
type HowlerSpriteTuple = [number, number] | [number, number, boolean]

// New: Howler-style manifest
interface HowlerSpriteManifest {
  src?: string[]
  sprite: Record<string, HowlerSpriteTuple>
}

// Existing: audiosprite manifest (unchanged)
interface AudiospriteManifest {
  resources?: string[]
  spritemap: Record<string, SpriteDefinition>
}

// Union type for createSprite() parameter
type SpriteManifest = AudiospriteManifest | HowlerSpriteManifest
```

### Normalization Location

Normalize in `createSprite()` before passing to `AudioSprite` constructor. The constructor continues to receive the existing `{ spritemap: Record<string, SpriteDefinition> }` format. This keeps `AudioSprite` class unchanged and puts all format detection in the factory function.

```typescript
function normalizeManifest(manifest: SpriteManifest): AudiospriteManifest {
  if ('spritemap' in manifest) {
    return manifest // Already audiosprite format
  }
  // Howler format: convert tuples to SpriteDefinition
  const spritemap: Record<string, SpriteDefinition> = {}
  for (const [name, tuple] of Object.entries(manifest.sprite)) {
    const [offsetMs, durationMs, loop] = tuple
    spritemap[name] = {
      start: offsetMs / 1000,
      end: (offsetMs + durationMs) / 1000,
      loop: loop ?? false,
    }
  }
  return { spritemap }
}
```

### Vue Demo Component Structure

```
docs/.vitepress/theme/components/
  AudioSpriteDemo.vue    # Replace existing with new implementation
docs/public/audio/
  sfx-sprite.mp3         # New: combined sprite file (6 sounds from soundfx)
  sfx-sprite.json        # New: audiosprite-format manifest (for display)
  sfx-sprite-howler.json # New: howler-format manifest (for display)
```

### Demo Component Architecture

The demo needs these reactive states:
- `playing: Ref<string | null>` -- currently playing sprite name (for timeline highlight)
- `playingFull: Ref<boolean>` -- whether full file is playing
- Timeline segment data derived from manifest (computed from sprite definitions)

Timeline visualization: Container div with `position: relative`, child divs for each segment positioned using `left: (start/totalDuration * 100)%` and `width: ((end-start)/totalDuration * 100)%`. Highlight active segment with CSS class toggle.

### Anti-Patterns to Avoid
- **Don't modify AudioSprite class internals:** Normalization belongs in the factory, not the class
- **Don't use canvas for the timeline:** Pure CSS divs are sufficient and simpler
- **Don't embed the sprite file in the repo as base64:** Use actual MP3 in docs/public/audio/

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio concatenation | Custom JS audio stitching | ffmpeg CLI or manual Audacity export | Audio encoding is complex; use established tools |
| Sprite generation tooling | Custom sprite generator | Mention audiosprite CLI in docs | Already exists, well-maintained |
| Waveform visualization | Canvas-based waveform | CSS percentage-positioned divs | Spec explicitly says no canvas needed |

**Key insight:** The sprite file creation is a one-time asset task, not runtime code. Use standard audio tools (ffmpeg/Audacity) to combine the 6 individual MP3s with silence gaps.

## Common Pitfalls

### Pitfall 1: Howler offset+duration vs audiosprite start+end confusion
**What goes wrong:** Howler uses `[offset, duration]` in milliseconds. audiosprite uses `{start, end}` in seconds. Mixing up the conversion produces wrong playback regions.
**Why it happens:** The two formats look similar but have fundamentally different semantics (duration vs end-time, ms vs seconds).
**How to avoid:** Clear unit tests for normalization with known values. Test boundary: a sound at offset 1000ms with duration 500ms should normalize to `{start: 1.0, end: 1.5}`.
**Warning signs:** Sounds play at wrong times or wrong lengths.

### Pitfall 2: Breaking the existing SpriteManifest type
**What goes wrong:** Making `SpriteManifest` a union type could break existing code that accesses `.spritemap` directly.
**Why it happens:** TypeScript union types require narrowing before property access.
**How to avoid:** Normalize in `createSprite()` before the manifest reaches `AudioSprite`. The class always receives the audiosprite format internally. Export both sub-types but keep the union as the public `SpriteManifest` type.
**Warning signs:** TypeScript errors in existing tests or user code.

### Pitfall 3: Sprite file silence gaps too short
**What goes wrong:** Without sufficient silence between sounds, the tail of one sound bleeds into the start of the next.
**Why it happens:** Audio codecs (MP3 especially) add encoder padding.
**How to avoid:** Use 200ms silence gaps as spec recommends. Verify by listening to each segment boundary.
**Warning signs:** Hearing the end of a previous sound when playing a segment.

### Pitfall 4: Timeline highlight timing
**What goes wrong:** The highlight on the timeline doesn't align with actual playback because sprite play is fire-and-forget (no end callback from AudioSprite).
**Why it happens:** `AudioSprite.play()` returns void, no event when playback ends.
**How to avoid:** Use `setTimeout` with the sprite's duration to clear the highlight. Calculate duration from the manifest data.
**Warning signs:** Highlight stays on after sound finishes, or disappears too early.

### Pitfall 5: "Play full file" implementation
**What goes wrong:** Trying to use `sprite.play()` for the full file -- there's no "full file" sprite name.
**Why it happens:** AudioSprite only plays named segments.
**How to avoid:** For the "play full file" button, create a separate `Sound` instance from the same audio URL using `createSound()`, or play the buffer directly. The spec says "just `source.start(0)`" -- use a separate Sound instance.
**Warning signs:** Full file button doesn't work or plays wrong segment.

## Code Examples

### Format Detection and Normalization
```typescript
// Source: Derived from spec + existing AudioSprite API
function isHowlerManifest(manifest: SpriteManifest): manifest is HowlerSpriteManifest {
  return 'sprite' in manifest && !('spritemap' in manifest)
}

function normalizeManifest(manifest: SpriteManifest): { spritemap: Record<string, SpriteDefinition> } {
  if (!isHowlerManifest(manifest)) {
    return manifest
  }
  const spritemap: Record<string, SpriteDefinition> = {}
  for (const [name, tuple] of Object.entries(manifest.sprite)) {
    spritemap[name] = {
      start: tuple[0] / 1000,
      end: (tuple[0] + tuple[1]) / 1000,
      loop: tuple[2] ?? false,
    }
  }
  return { spritemap }
}
```

### Timeline CSS Pattern
```vue
<!-- Source: Spec requirement for visual timeline -->
<div class="timeline" :style="{ position: 'relative', height: '48px' }">
  <div
    v-for="segment in segments"
    :key="segment.name"
    class="segment"
    :class="{ active: playing === segment.name }"
    :style="{
      position: 'absolute',
      left: `${(segment.start / totalDuration) * 100}%`,
      width: `${((segment.end - segment.start) / totalDuration) * 100}%`,
      height: '100%',
      background: segment.color,
    }"
    @click="playSegment(segment.name)"
  >
    {{ segment.name }}
  </div>
</div>
```

### Creating the Sprite File (Asset Prep)
```bash
# Combine individual soundfx MP3s with 200ms silence gaps
# Using ffmpeg filter_complex to concatenate with silence padding
ffmpeg -i beep1.mp3 -i cannon1.mp3 -i whoosh1.mp3 -i bling1.mp3 -i punch1.mp3 -i fanfare1.mp3 \
  -filter_complex "[0]apad=pad_dur=0.2[a0];[1]apad=pad_dur=0.2[a1];[2]apad=pad_dur=0.2[a2];[3]apad=pad_dur=0.2[a3];[4]apad=pad_dur=0.2[a4];[a0][a1][a2][a3][a4][5]concat=n=6:v=0:a=1" \
  sfx-sprite.mp3
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| audiosprite-only format | Support both Howler + audiosprite | This phase | Users can paste manifests from either ecosystem |
| Single-kick-drum demo | Multi-sound demo with timeline | This phase | Users understand sprites = "many sounds, one file" |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom |
| Config file | vite.config.js (test section) |
| Quick run command | `pnpm test src/sprite.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | SpriteManifest accepts Howler-style tuples | unit | `pnpm test src/sprite.test.ts` | Needs new tests |
| SC-2 | SpriteManifest accepts audiosprite-style objects | unit | `pnpm test src/sprite.test.ts` | Existing tests cover this |
| SC-3 | Format detection is automatic | unit | `pnpm test src/sprite.test.ts` | Needs new tests |
| SC-4 | Howler ms tuples convert to seconds correctly | unit | `pnpm test src/sprite.test.ts` | Needs new tests |
| SC-5 | Howler loop flag (3rd element) is respected | unit | `pnpm test src/sprite.test.ts` | Needs new tests |
| SC-9 | All existing sprite tests continue to pass | unit | `pnpm test src/sprite.test.ts` | Existing (35+ tests) |

### Sampling Rate
- **Per task commit:** `pnpm test src/sprite.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure in sprite.test.ts covers the audiosprite format. New tests for Howler format normalization will be added alongside the implementation.

## Asset Creation Plan

The 6 sounds from soundfx need to be:
1. Downloaded individually from `soundfx.d/` directory on GitHub
2. Combined into a single MP3 sprite file with ~200ms silence gaps
3. Two manifest JSONs created (one Howler-style, one audiosprite-style)
4. Placed in `docs/public/audio/` directory

**Sounds selected (from spec):**
| Name | Source | License | Notes |
|------|--------|---------|-------|
| beep1 | JustinBW via FreeSound | CC-BY-3.0 | Short beep |
| cannon1 | nps.gov via SoundBible | CC-0 | Cannon blast |
| whoosh1 | dersuperanton via FreeSound | CC-BY-3.0 | Whoosh |
| bling1 | JustinBW via FreeSound | CC-BY-3.0 | Bling/chime |
| punch1 | Vladimir via SoundBible | CC-0 | Punch impact |
| fanfare1 | _MC5_ via FreeSound | CC-BY-3.0 | Fanfare |

Target file size: under 500KB for 6 short SFX.

## Open Questions

1. **Sprite file creation tooling**
   - What we know: ffmpeg can concatenate audio files; audiosprite CLI can also do this
   - What's unclear: Whether the implementer has ffmpeg available, or should use audiosprite CLI
   - Recommendation: Document both approaches; prefer ffmpeg as it's more commonly available. Alternatively, use Audacity for manual creation.

2. **Full file playback mechanism**
   - What we know: Spec says "play the entire AudioBuffer without sprite offset/duration -- just `source.start(0)`"
   - What's unclear: Whether to expose the buffer from AudioSprite or create a separate Sound
   - Recommendation: Add a `playAll()` method to AudioSprite, or expose `audioBuffer` as a getter so the demo can create a Sound from it. Simplest: add `playAll()` to AudioSprite that plays the entire buffer.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/sprite.ts`, `src/sprite.test.ts`, `src/index.ts` -- current implementation
- Spec: `.planning/specs/audio-sprites-redesign.md` -- authoritative design document
- Howler.js GitHub README -- sprite format: `[offset_ms, duration_ms, loop?]`
- audiosprite GitHub README -- format: `{start, end, loop}` in seconds
- soundfx GitHub -- sound collection with CC-BY-3.0/CC-0 licensing

### Secondary (MEDIUM confidence)
- soundfx sprite JSON (`soundfx.data-sprite.json`) -- confirmed Howler-style format with ms tuples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- working with existing codebase, no new dependencies
- Architecture: HIGH -- normalization pattern is straightforward, well-defined spec
- Pitfalls: HIGH -- based on direct analysis of the two format differences
- Asset creation: MEDIUM -- depends on tooling availability for combining MP3s

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable domain, no moving targets)
