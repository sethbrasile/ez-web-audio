# Spec: Audio Sprites Redesign

## Goal

Redesign the audio sprites example page and add Howler-style manifest support so users form the correct mental model: "a sprite is many distinct sounds packed into one file."

## Motivation

The current demo uses a single kick drum with artificial overlapping segments. It demonstrates the API but completely fails to convey _why_ sprites exist (reducing HTTP requests by bundling distinct sounds).

## Deliverables

### 1. Howler-Style Manifest Support

Add support for the Howler.js sprite format alongside the existing audiosprite format. Detection is automatic based on value shape.

**Howler format** (`sprite` key, millisecond tuples):
```json
{
  "src": ["sounds.mp3"],
  "sprite": {
    "laser": [0, 300],
    "explosion": [1000, 2500],
    "powerup": [4000, 500, true]
  }
}
```

**audiosprite format** (`spritemap` key, second objects) — already supported:
```json
{
  "spritemap": {
    "laser": { "start": 0, "end": 0.3, "loop": false }
  }
}
```

**Implementation**: Update `SpriteManifest` type to accept both. Normalize Howler tuples to internal `{ start, end, loop }` format in `createSprite()` or `AudioSprite` constructor. No breaking changes — existing code continues to work.

### 2. Subset Sprite File from soundfx

Create a sprite file containing 6 distinct sounds from the [soundfx](https://github.com/rse/soundfx) library:
- `beep1` — short beep (CC-BY-3.0, JustinBW)
- `cannon1` — cannon blast (CC-0, nps.gov)
- `whoosh1` — whoosh (CC-BY-3.0, dersuperanton)
- `bling1` — bling/chime (CC-BY-3.0, JustinBW)
- `punch1` — punch impact (CC-0, Vladimir)
- `fanfare1` — fanfare (CC-BY-3.0, _MC5_)

Extract individual MP3s from soundfx, combine into a single sprite file with silence gaps. Create both Howler-style and audiosprite-style manifest JSONs for the docs to reference.

### 3. New AudioSpriteDemo.vue Component

The demo page should build the mental model top-down:

1. **"Play the full file"** button — user hears the raw combined file (all sounds mashed together). This is the "aha" moment: "oh, it's just one file with everything in it."

2. **Visual timeline** — horizontal bar showing the full file duration with colored, labeled segments for each sound. When a segment plays, it highlights on the timeline.

3. **Individual play buttons** — one per sound (beep, cannon, whoosh, bling, punch, fanfare). Clicking plays just that segment and highlights it on the timeline.

4. **Spritemap display** — show the actual JSON manifest that maps names to time regions.

### 4. Rewritten audio-sprite.md

Structure:
1. Demo first (component above)
2. "What just happened?" — explain the concept, why sprites reduce HTTP requests
3. "Sprite Formats" — document both Howler and audiosprite formats, explain when you'd use each
4. "Creating Sprites" — mention [audiosprite CLI](https://github.com/tonistiigi/audiosprite) for generating sprite files, link to [soundfx](https://github.com/rse/soundfx) as a ready-made collection
5. API reference snippets (createSprite, play, stop, etc.)
6. Attribution footer for CC-BY-3.0 sounds

### 5. Attribution

Include on the example page:

> Sound effects from the [soundfx](https://github.com/rse/soundfx) collection. Individual sounds by JustinBW, dersuperanton, and _MC5_ via [FreeSound](https://freesound.org) (CC-BY-3.0), and nps.gov and Vladimir via [SoundBible](https://soundbible.com) (CC-0).

## Technical Notes

- The visual timeline can be pure CSS (colored divs positioned by percentage within a container). No canvas/waveform needed.
- The "play full file" button should play the entire AudioBuffer without any sprite offset/duration — just `source.start(0)`.
- Sprite file should have ~200ms silence gaps between sounds for clean separation.
- Keep the subset sprite file small (likely under 500KB for 6 short SFX).
