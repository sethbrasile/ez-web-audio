---
title: Transport + Sequencer - Web Audio BPM-Synced Multi-Track Demo
description: Interactive demo of BPM-synced transport with multi-track sequencing, mute/solo per track, musical time notation, and a visual step grid playhead.
---

# Transport + Sequencer

Control a BPM-synced transport driving 5 tracks -- 3 drum tracks and 2 melody tracks. Switch presets to hear five book-derived grooves (Rock, Funk, Disco, Bossa, Shuffle), then click any drum cell to edit the pattern live.

<script setup>
import TransportSequencerDemo from '../.vitepress/theme/components/TransportSequencerDemo.vue'
</script>

<llm-exclude>
<TransportSequencerDemo />
</llm-exclude>

<llm-only>

Interactive multi-track sequencer demo with Transport clock control. Five tracks: Kick, Snare, Hi-hat (drum BeatTracks), Synth bass (Sequence + Oscillator), Lead (Sequence + Oscillator chords). Controls include Play/Pause/Stop, BPM slider, swing knob, mute (M) and solo (S) buttons per track, and five preset buttons (Rock, Funk, Disco, Bossa, Shuffle) adapted from a public-domain drum machine pattern book. Each drum lane's 32-step grid is directly editable — clicking a cell cycles it rest → normal → accent. A moving playhead column indicates the current step; position display shows current bar and beat.

</llm-only>

## How It Works

The Transport clock is the heartbeat of the whole demo: a Worker-backed musical clock that every track locks to instead of running its own timer. It fires a `tick` event at every 16th note, which the UI uses to advance the step-grid playhead column in sync with playback, and it drives a 2-bar loop (`transport.loop = true`, `transport.loopEnd = '2m'`) so all 5 tracks restart together on every pass.

### Drum Tracks via BeatTrack

Each drum track (Kick, Snare, Hi-hat) is a `BeatTrack` that loads three sample variations and uses round-robin playback for a natural feel. Calling `syncTo(transport)` locks the beat track to the transport clock at whatever resolution it's given — this demo syncs all three drum lanes at 16th notes, while the melody tracks below run on their own musical-time `Sequence`, giving the whole rig multi-resolution sync from one shared clock:

```typescript
import { createBeatTrack, createTransport } from 'ez-web-audio'

const transport = await createTransport({ bpm: 96, timeSignature: [4, 4], ticksPerBeat: 4 })
const kick = await createBeatTrack(['/kick1.wav', '/kick2.wav', '/kick3.wav'], { numBeats: 32 })

// Numbers set velocity (0-1) as well as active/inactive -- 1 = accent, 0.6 = ghost note
kick.setPattern([1, 0, 0, 0, 0, 0, 0.6, 0, 1, 0, 0, 0]) // first 12 of the 32-step pattern
kick.syncTo(transport, { noteType: 1 / 16 }) // lock to transport grid
```

### Swing: One Knob vs. Hand-Placed Shuffle

The **Shuffle** preset is the pedagogical hook of this demo. Its drum and bass patterns are written in perfectly straight 8th/16th notes -- there is no shuffle baked into the pattern data at all. The groove comes entirely from a single Transport property:

```typescript
transport.swing = 0.55 // MPC-style shuffle -- 0 = straight, 1 = full triplet feel
transport.swingSubdivision = 1 / 8 // shuffle the 8th-note grid (default is 1/16)
```

Turn the swing knob down to `0` while Shuffle is playing and the groove flattens back to a straight, mechanical feel instantly -- the pattern didn't change, only the delay applied to every other subdivision did. That's the difference between hand-placing offbeat notes at shuffled positions and letting `swing` do the work: one knob re-shapes the whole track's feel live, without touching a single step.

### Melody Tracks via Sequence

The Bass and Lead tracks use `createSequence()` to schedule notes at precise musical time positions, rather than syncing to a fixed grid like the drum lanes. `Sequence` events are addressed by raw beat number here (`0`, `1.5`, `2.5`...) but also support bar:beat:tick notation and note names (`'4n'`, `'8t'`) -- the same API expresses a bass line or a chord stab equally well. Because each preset supplies its own `length: '2m', loop: true`, matching the Transport's own `loopEnd = '2m'`, both the drum lanes and the melody sequences wrap back to the top of the pattern together.

Each note gets its own `Oscillator` instead of one shared oscillator being retriggered -- reusing a single oscillator across triggers means a new note can race the previous note's release tail and click or screech. A chord stab (several notes at once, like the Lead track) is just several Oscillators triggered by the same sequence event:

```typescript
import { createOscillator, createSequence, createTransport, getAudioContext } from 'ez-web-audio'

const transport = await createTransport({ bpm: 96, timeSignature: [4, 4] })
transport.loop = true
transport.loopEnd = '2m'
const ctx = await getAudioContext()

// sustain: 0 -- each note fades out on its own after decay, so it never
// needs to be stopped or retriggered
const envelope = { attack: 0.005, decay: 0.25, sustain: 0, release: 0.05 }
const e2 = await createOscillator(ctx, { note: 'E2', type: 'triangle', gain: 0.5, envelope })
const g2 = await createOscillator(ctx, { note: 'G2', type: 'triangle', gain: 0.5, envelope })

const bassSeq = createSequence(transport, { length: '2m', loop: true }) // SYNC -- no await
bassSeq.at(0, t => e2.playIn(Math.max(0, t - ctx.currentTime))) // E2
bassSeq.at(1.5, t => g2.playIn(Math.max(0, t - ctx.currentTime))) // G2

transport.start()
```

### Mute and Solo

Drum tracks use `BeatTrack.muted` and `BeatTrack.solo` properties directly -- the library handles solo stacking natively. Melody tracks are guarded by a callback check: if any track is soloed, only soloed melody tracks fire their events:

```typescript
function shouldPlay(name: 'bass' | 'lead'): boolean {
  const anySoloed = Object.values(trackState).some(t => t.soloed)
  if (anySoloed)
    return trackState[name].soloed
  return !trackState[name].muted
}
```

### Live Playhead

The `transport.on('tick')` event drives the step-grid highlight. Each tick carries `{ bar, beat, tick }`, which maps to a 16th-note step index across the 2-bar loop:

```typescript
transport.on('tick', (e) => {
  const { bar, beat, tick } = e.detail
  const step = ((bar - 1) * 16) + ((beat - 1) * 4) + tick
  currentStep.value = step % 32 // 32-step loop
  positionDisplay.value = `${bar}:${beat}` // bar : beat
})
```

### Editable Drum Lanes

Every drum-lane cell is clickable. A click cycles that step's value rest → normal → accent → rest and immediately calls `setPattern()` on the underlying `BeatTrack` -- there's no separate "commit" step, so edits are audible on the next pass through the loop:

```typescript
// Cycle a step's velocity: rest -> normal -> accent -> rest.
function cycleStep(v: number): number {
  if (v <= 0)
    return NORMAL // NORMAL = 0.7
  if (v < ACCENT)
    return ACCENT // ACCENT = 1
  return 0
}

drumSteps[key][index] = cycleStep(drumSteps[key][index])
drumTrackInstance(key)?.setPattern(drumSteps[key])
```

### Preset Switching

Switching presets updates BPM, swing, and all three drum patterns via `setPattern()`, then calls `seq.clear()` followed by re-registration for the bass and lead sequences. All of it is safe during live playback -- changes take effect on the next loop iteration, so a preset swap never clicks or glitches mid-bar.

## Demo Controls

| Control | What It Does |
|---------|-------------|
| Play / Pause / Stop | Controls transport clock |
| BPM slider | Changes tempo immediately during playback |
| Swing knob | Sets `transport.swing` (0-1) live -- try it on the Shuffle preset |
| M button | Mutes / unmutes individual track |
| S button | Solos track (multiple solos stack) |
| Preset buttons | Switches all 5 track patterns, BPM, and swing simultaneously |
| Step grid | Click a drum cell to cycle rest → normal → accent; shows the current playhead position |

## Further Reading

- [Transport Guide](/guide/transport) -- full Transport clock API, tick events, and time signature options
- [Sequence Guide](/guide/sequence) -- musical time notation, bar:beat:tick addressing, and note scheduling
- [Drum Machine](/examples/drum-machine) -- simpler BeatTrack-only pattern sequencer
