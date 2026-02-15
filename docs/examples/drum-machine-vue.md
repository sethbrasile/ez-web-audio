---
title: "Drum Machine: Vue Reactive Pattern"
---

<script setup>
import DrumMachineVue from '../.vitepress/theme/components/DrumMachineVue.vue'
</script>

# Drum Machine: Vue Reactive Pattern

This page demonstrates using Vue's `reactive()` with BeatTrack's `wrapWith` option. Beat properties auto-toggle and trigger re-renders — **no event listeners needed for visual sync**.

<DrumMachineVue />

## How to Use

- **Click cells** to toggle beats on/off
- **Press Play** to start the pattern loop
- **Mute (M)** silences a track by deactivating all its beats
- **Solo (S)** mutes all other tracks (exclusive solo)
- **Adjust BPM** to change tempo in real-time
- **Step counter** shows current playhead position

## How It Works

The reactive property pattern eliminates the need for event listeners:

1. `wrapWith: (beat) => reactive(beat)` wraps each Beat in a Vue reactive proxy
2. `beat.currentTimeIsPlaying` auto-toggles true/false on the scheduler's timeline
3. Vue detects the property change and re-renders the bound CSS class
4. **No `.on('beat', ...)` event listener needed** — the Beat IS the state

This is possible because of the WeakMap→instance property refactor. Previously, Beat objects were cached in a module-level `WeakMap`, which broke when Vue's `reactive()` wrapped the instance (proxy !== original object as Map key). Now beats use a private instance property `_beats` on the BeatTrack, so reactive proxies work correctly.

## Key Code

### Setup with wrapWith

```typescript
import { createBeatTrack } from 'ez-web-audio'
import { reactive } from 'vue'

const kick = await createBeatTrack([
  '/audio/kick1.wav',
  '/audio/kick2.wav',
  '/audio/kick3.wav'
], {
  numBeats: 16,
  wrapWith: (beat) => reactive(beat) // ← Makes beat properties reactive
})

// Set default pattern
;[0, 4, 8, 12].forEach(i => kick.beats[i].active = true)
```

### Template Binding

```vue
<button
  v-for="(beat, i) in kick.beats"
  :key="i"
  @click="beat.active = !beat.active"
  :class="{
    active: beat.active,
    current: beat.currentTimeIsPlaying
  }"
/>
```

The `current` class binds directly to `beat.currentTimeIsPlaying`. When the BeatTrack scheduler toggles this property internally, Vue automatically re-renders — **zero manual event handling**.

## Mute & Solo Implementation

Mute and solo controls demonstrate direct Beat property manipulation:

```typescript
function toggleMute(track) {
  track.muted = !track.muted

  if (track.muted) {
    // Store current active states
    track.activeStates.clear()
    track.beats.forEach((beat, i) => {
      if (beat.active) {
        track.activeStates.set(i, true)
        beat.active = false  // ← Deactivate beat
      }
    })
  } else {
    // Restore active states
    track.activeStates.forEach((active, i) => {
      if (active) {
        track.beats[i].active = true  // ← Reactivate beat
      }
    })
  }
}
```

Muting stores the active pattern in a `Map`, sets all beats inactive (creating silence), then restores the pattern when unmuted. This preserves the user's pattern while controlling audio output.

Solo is similar but operates across all tracks:

```typescript
function toggleSolo(track) {
  if (soloedTrack === track.name) {
    // Un-solo: restore all tracks
    tracks.forEach(restoreActiveStates)
  } else {
    // Solo: mute all other tracks
    tracks.forEach(t => {
      if (t.name !== track.name) {
        muteTrack(t)
      }
    })
  }
}
```

## Why This Works

### The WeakMap Refactor

Previously, BeatTrack used a module-level `WeakMap` to cache beats:

```typescript
// OLD (broken with reactive proxies)
const beatBank = new WeakMap()
```

When Vue's `reactive()` wrapped a BeatTrack instance, the proxy object didn't match the original as a WeakMap key, breaking beat lookups.

**The fix:** Replace the WeakMap with a private instance property:

```typescript
// NEW (works with reactive proxies)
class BeatTrack {
  private _beats: Beat[] = []

  get beats() {
    // Beats are stored on the instance, not in a separate WeakMap
    return this._beats
  }
}
```

Now reactive proxies work correctly because the `_beats` array lives on the instance itself.

## When to Use This Pattern

**Use reactive properties with:**
- Vue 3 with `reactive()` or `ref()`
- Solid.js with `createMutable()`
- Any framework with reactive proxies that can wrap plain objects

**Advantages:**
- Zero event listener boilerplate
- Beat objects serve as single source of truth
- Automatic UI sync without manual state management
- Simpler component code

**Limitations:**
- Requires a reactive framework with proxy support
- Slight overhead from proxy wrapping (negligible in practice)

## When NOT to Use This Pattern

For frameworks without reactive proxies (React, vanilla JS, Svelte), use the event-based pattern instead:

**See:** [Vanilla TS Events](/examples/drum-machine-vanilla) — `track.on('beat', ...)` drives DOM updates. Framework-agnostic.

## Complete Example

Here's the full component implementation:

```vue
<template>
  <div class="drum-machine">
    <button @click="toggle">{{ playing ? 'Stop' : 'Play' }}</button>

    <label>BPM: {{ bpm }}
      <input type="range" v-model.number="bpm" min="60" max="200" />
    </label>

    <div v-for="track in tracks" :key="track.name">
      <span>{{ track.name }}</span>

      <button
        v-for="(beat, i) in track.beatTrack.beats"
        :key="i"
        @click="beat.active = !beat.active"
        :class="{
          active: beat.active,
          current: beat.currentTimeIsPlaying && playing
        }"
      >
        {{ i + 1 }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const playing = ref(false)
const bpm = ref(120)
const tracks = ref<any[]>([])

async function init() {
  const { createBeatTrack } = await import('ez-web-audio')

  const kick = await createBeatTrack(['/audio/kick1.wav'], {
    numBeats: 16,
    wrapWith: (beat) => reactive(beat),
  })
  const snare = await createBeatTrack(['/audio/snare1.wav'], {
    numBeats: 16,
    wrapWith: (beat) => reactive(beat),
  })

  // Default pattern
  ;[0, 4, 8, 12].forEach(i => kick.beats[i].active = true)
  ;[4, 12].forEach(i => snare.beats[i].active = true)

  tracks.value = [
    { name: 'Kick', beatTrack: kick },
    { name: 'Snare', beatTrack: snare },
  ]
}

async function toggle() {
  if (!tracks.value.length) await init()

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack.stop())
    playing.value = false
  } else {
    tracks.value.forEach(t => t.beatTrack.playBeats(bpm.value, 1/16))
    playing.value = true
  }
}

watch(bpm, (val) => {
  if (playing.value) {
    // Restart playback with new tempo
    tracks.value.forEach(t => t.beatTrack.stop())
    setTimeout(() => {
      tracks.value.forEach(t => t.beatTrack.playBeats(val, 1/16))
    }, 50)
  }
})
</script>
```

## Key Takeaways

1. **`wrapWith: reactive()`** makes Beat properties trigger Vue re-renders
2. **Direct property binding** eliminates event listener boilerplate
3. **Beat objects are the state** — no separate UI state management needed
4. **Mute/solo via `beat.active`** — pattern manipulation preserves user intent
5. **WeakMap→instance property refactor** made this pattern possible

## See Also

- [Drum Machine Overview](/examples/drum-machine) — General drum machine concepts
- [Vanilla TS Events](/examples/drum-machine-vanilla) — Event-based pattern for React/vanilla JS
- [Timing Basics](/examples/timing) — Understanding Web Audio scheduling
