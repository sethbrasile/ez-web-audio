---
title: Vanilla TypeScript Audio - Event-Based Drum Machine
description: Build a drum machine with vanilla TypeScript and DOM events. Demonstrates event-based UI sync pattern for framework-free Web Audio applications.
---

# Drum Machine: Vanilla TS Event Pattern

<script setup>
import DrumMachineVanilla from '../.vitepress/theme/components/DrumMachineVanilla.vue'
</script>

This page demonstrates the **event-based approach** to drum machine UI synchronization. BeatTrack emits `beat` events at play time using AudioContext-aware timing, and we update the DOM directly through event listeners. No reactive framework needed for the playhead.

<llm-exclude>
<DrumMachineVanilla />
</llm-exclude>

<llm-only>
Vanilla TypeScript drum machine using event-based DOM updates. Step sequencer grid with kick/snare/hi-hat, BPM slider, and visual playhead sync via beat events.
</llm-only>

## Key Code

The event listener that drives the playhead:

```typescript
const kick = await createBeatTrack([...urls], { numBeats: 16 })
// No wrapWith needed — events handle sync

kick.on('beat', (e) => {
  const { beatIndex, active } = e.detail

  // Clear previous playhead
  document.querySelectorAll('.beat-cell.current').forEach(
    el => el.classList.remove('current')
  )

  // Highlight current step
  document.querySelectorAll(`.beat-cell[data-beat="${beatIndex}"]`).forEach(
    el => el.classList.add('current')
  )
})
```

Key aspects:
- **No reactive wrapper** — beats are plain objects
- **Direct DOM manipulation** — querySelector + classList
- **Event-driven timing** — visual updates triggered by audio events
- **Scoped to component** — use a ref to scope queries and avoid global DOM pollution

## How It Works Under the Hood

The event-based pattern works in three coordinated phases:

1. **Lookahead Scheduling (100ms ahead):** BeatTrack's internal scheduler runs every 25ms, checking which beats fall within the next 100ms window. For each upcoming beat, it schedules the audio playback on the Web Audio API thread using `audioContext.currentTime`.

2. **Event Emission (at play time):** When a beat is scheduled, BeatTrack also schedules a beat event to fire at the exact moment the audio plays. This event fires using `audioContextAwareTimeout`, which polls `audioContext.currentTime` via `requestAnimationFrame` for frame-accurate timing.

3. **DOM Updates (same frame):** The event handler receives the beat index and updates DOM classes directly. Since the event fires on the same RAF frame as the timing check, the visual update appears synchronized with the audio.

This architecture separates concerns: Web Audio API handles precise audio timing, RAF handles frame-accurate visual timing, and events bridge the two.

## AudioContext-Aware Timing

Why doesn't this drift over time?

**The Problem with Standard Timers:**
- `setTimeout(fn, 1000)` uses the system clock (wall time)
- System clocks can drift, skip, or jump (sleep/wake, NTP adjustments)
- After 2 minutes of playback, audio and visuals can be 100ms+ out of sync

**The AudioContext Solution:**
- `audioContext.currentTime` is hardware-driven and monotonic
- It never drifts, skips, or goes backward
- It's the same clock driving audio playback

**How audioContextAwareTimeout Works:**

```typescript
// Simplified implementation
function audioContextAwareTimeout(audioContext) {
  let tasks = []

  function scheduler() {
    const now = audioContext.currentTime * 1000

    // Execute due tasks
    tasks.forEach((task) => {
      if (task.due <= now)
        task.fn()
    })

    // Remove completed tasks
    tasks = tasks.filter(task => task.due > now)

    // Continue if tasks pending
    if (tasks.length > 0) {
      requestAnimationFrame(scheduler)
    }
  }

  return {
    setTimeout(fn, delayMillis) {
      tasks.push({
        due: now() + delayMillis,
        fn
      })
      if (tasks.length === 1) {
        requestAnimationFrame(scheduler)
      }
    }
  }
}
```

The key insight: by checking `audioContext.currentTime` on every animation frame, visual updates are synchronized to the same clock that drives audio playback. The result: audio and visuals stay perfectly locked even over extended playback.

## Mute & Solo

Mute and solo controls work by toggling beat `active` states:

```typescript
function toggleMute(track) {
  if (track.muted) {
    // Save current pattern
    track.savedStates = track.beats.map(b => b.active)

    // Deactivate all beats
    track.beats.forEach(b => b.active = false)
  }
  else {
    // Restore saved pattern
    track.savedStates.forEach((active, i) => {
      track.beats[i].active = active
    })
  }
}
```

Solo works similarly: when any track is soloed, all non-solo tracks are muted. When no tracks are soloed, all tracks restore their saved states.

## Cleanup

Event listeners must be cleaned up manually to prevent memory leaks:

```typescript
// Store reference for cleanup
function beatHandler(e) {
  const { beatIndex } = e.detail
  // Update DOM...
}

kick.on('beat', beatHandler)

// On teardown (component unmount, page navigation, etc.):
kick.off('beat', beatHandler)
kick.stop()
```

This is the tradeoff of the event-based approach: you manage the lifecycle explicitly. Reactive frameworks handle this automatically through their reactivity systems.

## When to Use This Pattern

**Best for:**
- **React** — combine with refs or state + useEffect for visual updates
- **Vanilla JavaScript / TypeScript** — no framework overhead
- **Svelte, Angular, or any framework** — events are universal
- **Explicit control** — you want precise control over timing and DOM updates
- **No reactive proxies** — when reactive wrappers aren't available or add unwanted overhead

**Use reactive pattern instead when:**
- You're using Vue 3 with Composition API
- You're using Solid.js or another fine-grained reactive framework
- You want automatic cleanup and less boilerplate

## Comparison with Reactive Pattern

| Aspect | Reactive (Vue) | Event-Based (Vanilla) |
|--------|----------------|----------------------|
| Visual sync mechanism | `beat.currentTimeIsPlaying` auto-toggles | `track.on('beat', ...)` fires at play time |
| DOM update | Vue template re-render | Direct class manipulation |
| Setup | `wrapWith: reactive` | Event listener |
| Cleanup | Automatic (Vue reactivity) | Manual `.off()` required |
| Timing precision | Same (both use audioContextAwareTimeout) | Same (both use audioContextAwareTimeout) |
| Boilerplate | Less (framework handles it) | More (manual event management) |
| Best for | Vue, Solid.js | React, vanilla JS, any framework |

Both patterns use the same underlying timing mechanism (`audioContextAwareTimeout` + `audioContext.currentTime`), so they have identical timing precision. The choice is about API style and framework compatibility.

## See Also

- [Drum Machine: Vue Reactive Pattern](/examples/drum-machine-vue) — for Vue, Solid.js, or frameworks with reactive proxies
- [Drum Machine Overview](/examples/drum-machine) — API reference and basic usage
