---
title: Drum Machine
---

<script setup>
import DrumMachine from '../.vitepress/theme/components/DrumMachine.vue'
</script>

# Drum Machine

Create rhythmic patterns with a step sequencer using the BeatTrack API. This example demonstrates sample-accurate timing, round-robin playback, and visual synchronization with Web Audio scheduling.

<DrumMachine />

## How to Use

- **Click cells** to toggle beats on/off in the 16-step grid
- **Press Play** to hear your pattern loop
- **Adjust BPM** with the slider (60-200 BPM)
- **Control volume** for each track independently
- **Visual playhead** highlights the current beat in sync with audio

The default pattern is a basic rock beat: kick drum on beats 1, 5, 9, 13 (four on the floor), snare on beats 5 and 13 (backbeat), and hi-hat on eighth notes.

## How It Works

### BeatTrack API

The drum machine uses `createBeatTrack()` to wrap multiple audio samples with a step sequencer interface. Each track (kick, snare, hi-hat) has 3 sample variations that are played in round-robin rotation to prevent the "machine gun" effect.

**Key features:**
- **Sample-accurate timing** via Web Audio lookahead scheduling
- **Round-robin playback** cycles through variations automatically
- **Beat events** sync visual feedback with audio timing
- **Dynamic BPM control** with automatic tempo updates

### Visual Synchronization

BeatTrack emits `beat` events at schedule time (~100ms before audio playback). The component calculates the delay between schedule time and playback time to ensure the visual playhead highlights beats in perfect sync with the sound:

```typescript
kickTrack.on('beat', (e) => {
  const delay = Math.max(0, (e.detail.time - ctx.currentTime) * 1000)
  setTimeout(() => {
    currentBeat.value = e.detail.beatIndex
  }, delay)
})
```

This approach ensures smooth, drift-free synchronization even if the main JavaScript thread is busy.

## Code Example

Here's how to create a basic drum machine pattern:

```typescript
import { initAudio, createBeatTrack } from 'ez-web-audio'

// Initialize audio context (must be called on user interaction)
await initAudio()

// Create BeatTrack with 3 kick drum variations
const kick = await createBeatTrack([
  '/audio/kick1.wav',
  '/audio/kick2.wav',
  '/audio/kick3.wav'
], { numBeats: 16 })

// Set up a four-on-the-floor pattern
kick.beats[0].active = true   // beat 1
kick.beats[4].active = true   // beat 5
kick.beats[8].active = true   // beat 9
kick.beats[12].active = true  // beat 13

// Play at 120 BPM with quarter notes
kick.playActiveBeats(120, 1/4)

// Listen for beat events
kick.on('beat', (e) => {
  console.log(`Beat ${e.detail.beatIndex + 1}`, {
    time: e.detail.time,
    active: e.detail.active
  })
})

// Stop playback
kick.stopAll()
```

### Round-Robin Playback

Each `playActiveBeats()` call cycles through the sample array, preventing repetitive "machine gun" sound:

```typescript
kick.play()  // plays kick1.wav
kick.play()  // plays kick2.wav
kick.play()  // plays kick3.wav
kick.play()  // plays kick1.wav (wraps around)
```

### Dynamic Tempo Control

To change BPM while playing, stop and restart with the new tempo:

```typescript
// BeatTrack doesn't support mid-playback tempo changes
kick.stopAll()
kick.playActiveBeats(140, 1/4)  // now at 140 BPM
```

### Volume Control

Adjust track volume with `changeGainTo()`:

```typescript
kick.changeGainTo(1.0)    // 100% volume
snare.changeGainTo(0.8)   // 80% volume
hihat.changeGainTo(0.6)   // 60% volume
```

## API Used

- **`createBeatTrack(urls, options)`** - Create a step sequencer with sample variations
- **`beats[].active`** - Enable/disable individual beats
- **`playActiveBeats(bpm, noteValue)`** - Start looping playback at specified tempo
- **`stopAll()`** - Stop all playback
- **`on('beat', callback)`** - Listen for beat schedule events
- **`changeGainTo(value)`** - Adjust track volume

## Next Steps

- Explore [Sampled Drum Kit](/examples/sampled-drum-kit) for one-shot drum triggering
- Learn about [Timing & Scheduling](/examples/timing) for advanced rhythm patterns
- Try the [Synth Drum Kit](/examples/synth-drum-kit) to hear synthesized percussion sounds
