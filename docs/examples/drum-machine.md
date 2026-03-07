---
title: JavaScript Drum Machine - Step Sequencer with Web Audio
description: Build a drum machine step sequencer with the Web Audio API. Interactive demo with kick, snare, and hi-hat patterns at configurable BPM.
---

<script setup>
import DrumMachine from '../.vitepress/theme/components/DrumMachine.vue'
</script>

# Drum Machine

Create rhythmic patterns with a step sequencer using the BeatTrack API.

<llm-exclude>
<DrumMachine />
</llm-exclude>

<llm-only>

Step sequencer drum machine with kick, snare, and hi-hat tracks. 16-step grid with clickable cells, BPM slider, and visual playhead highlighting the current beat.

</llm-only>

## How to Use

- **Click cells** to toggle beats on/off in the 16-step grid
- **Press Play** to hear your pattern loop
- **Adjust BPM** with the slider (60-200 BPM)
- **Visual playhead** highlights the current beat in sync with audio

## Quick Start

```typescript
import { createBeatTrack } from 'ez-web-audio'

const kick = await createBeatTrack(['/audio/kick1.wav'], { numBeats: 16 })

// Set a four-on-the-floor pattern
kick.beats[0].active = true
kick.beats[4].active = true
kick.beats[8].active = true
kick.beats[12].active = true

kick.playBeats(120, 1 / 16) // 120 BPM, sixteenth notes
```

## Visual Sync

The playhead highlighting in the demo above works because each Beat object has properties that auto-toggle on the scheduler's timeline:

| Property | When true | Use for |
|---|---|---|
| `beat.currentTimeIsPlaying` | This beat's time slot is active (playing or resting) | Playhead indicator on all steps |
| `beat.isPlaying` | This beat is producing sound right now | Highlight only when sound plays |

Both reset to `false` automatically after `duration` ms (default 100ms). No manual bookkeeping needed.

In frameworks with reactive proxies (Vue, Solid, etc.), wrap beats to make these properties trigger re-renders:

```typescript
const kick = await createBeatTrack(['/audio/kick1.wav'], {
  numBeats: 16,
  wrapWith: beat => reactive(beat) // Vue's reactive()
})
```

Then bind directly in your template — no event listeners, no setTimeout, no separate state:

```vue
<button
  v-for="(beat, i) in kick.beats"
  @click="beat.active = !beat.active"
  :class="{ active: beat.active, current: beat.currentTimeIsPlaying }"
/>
```

BeatTrack also emits `beat` events for framework-agnostic use (vanilla JS, React, etc.) — see [Advanced: Event-Based Sync](#advanced-event-based-sync) below.

## Full Vue Example

Here's a complete drum machine — the Beat objects ARE the state:

```vue
<script setup lang="ts">
import { onUnmounted, reactive, ref, watch } from 'vue'

const playing = ref(false)
const bpm = ref(120)
const tracks = ref<{ name: string, beatTrack: any }[]>([])

async function init() {
  const { createBeatTrack } = await import('ez-web-audio')

  const kick = await createBeatTrack(['/audio/kick1.wav'], {
    numBeats: 16,
    wrapWith: beat => reactive(beat),
  })
  const snare = await createBeatTrack(['/audio/snare1.wav'], {
    numBeats: 16,
    wrapWith: beat => reactive(beat),
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
  if (!tracks.value.length)
    await init()

  if (playing.value) {
    tracks.value.forEach(t => t.beatTrack.stop())
    playing.value = false
  }
  else {
    tracks.value.forEach(t => t.beatTrack.playBeats(bpm.value, 1 / 16))
    playing.value = true
  }
}

watch(bpm, (val) => {
  tracks.value.forEach(t => t.beatTrack.setTempo(val))
})

onUnmounted(() => {
  tracks.value.forEach((t) => {
    try { t.beatTrack.stop() }
    catch {}
  })
})
</script>

<template>
  <div class="drum-machine">
    <button @click="toggle">
      {{ playing ? 'Stop' : 'Play' }}
    </button>

    <label>BPM: {{ bpm }}
      <input v-model.number="bpm" type="range" min="60" max="200">
    </label>

    <div v-for="track in tracks" :key="track.name" class="track-row">
      <span>{{ track.name }}</span>

      <button
        v-for="(beat, i) in track.beatTrack.beats"
        :key="i"
        :class="{
          active: beat.active,
          current: beat.currentTimeIsPlaying,
        }"
        @click="beat.active = !beat.active"
      />
    </div>
  </div>
</template>
```

## Advanced: Event-Based Sync

For frameworks without reactive proxies (vanilla JS, React), use `beat` events instead. Events fire in sync with the audio using AudioContext-aware timing:

```typescript
kick.on('beat', (e) => {
  const { beatIndex, active } = e.detail
  highlightStep(beatIndex)
  if (active)
    flashPad(beatIndex)
})
```

## Round-Robin Playback

Pass multiple sample URLs to prevent the "machine gun" effect:

```typescript
const kick = await createBeatTrack([
  '/audio/kick1.wav',
  '/audio/kick2.wav',
  '/audio/kick3.wav',
], { numBeats: 16 })

// Each active beat cycles through samples automatically
kick.play() // kick1.wav
kick.play() // kick2.wav
kick.play() // kick3.wav
kick.play() // kick1.wav (wraps around)
```

## Integration Pattern Examples

These pages build on the drum machine concept with full implementations showing different UI sync approaches:

- **[Vue Reactive Pattern](/examples/drum-machine-vue)** — Beat properties drive UI directly via `wrapWith: reactive()`. No event listeners needed for visual sync. Includes mute/solo controls demonstrating direct Beat property manipulation.
- **[Vanilla TS Events](/examples/drum-machine-vanilla)** — `track.on('beat', ...)` drives DOM updates. Framework-agnostic pattern for React, vanilla JS, or any environment without reactive proxies.

## API Reference

| Method / Property | Description |
|---|---|
| `createBeatTrack(urls, { numBeats })` | Create a step sequencer with sample variations |
| `beats[i].active` | Toggle individual beats on/off |
| `playBeats(bpm, noteValue)` | Start looping playback |
| `stop()` | Stop and reset to beginning |
| `pause()` / `resume()` | Pause/resume from current position |
| `setTempo(bpm)` | Change tempo while playing |
| `gain` | Track volume (0 to 1) |
| `on('beat', fn)` | Beat event with `{ beatIndex, active, time }` |
| `on('stop', fn)` | Fired when `stop()` is called |

## Next Steps

- [Sampled Drum Kit](/examples/sampled-drum-kit) — one-shot drum pad triggering
- [Timing & Scheduling](/examples/timing) — precision scheduling deep-dive
- [Synth Drum Kit](/examples/synth-drum-kit) — synthesized percussion
