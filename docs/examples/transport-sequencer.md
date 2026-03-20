---
title: Transport + Sequencer - Web Audio BPM-Synced Multi-Track Demo
description: Interactive demo of BPM-synced transport with multi-track sequencing, mute/solo per track, musical time notation, and a visual step grid playhead.
---

# Transport + Sequencer

Control a BPM-synced transport driving 5 tracks -- 3 drum tracks and 2 melody tracks. Switch presets to hear musical time notation in action (straight 8ths, funk syncopation, triplets).

<script setup>
import TransportSequencerDemo from '../.vitepress/theme/components/TransportSequencerDemo.vue'
</script>

<llm-exclude>
<TransportSequencerDemo />
</llm-exclude>

<llm-only>

Interactive multi-track sequencer demo with Transport clock control. Five tracks: Kick, Snare, Hi-hat (drum BeatTracks), Synth bass (Sequence + Oscillator), Piano (Sequence + soundfont). Controls include Play/Pause/Stop, BPM slider (60-180), mute (M) and solo (S) buttons per track, and three preset buttons (Straight Rock, Funk Groove, Triplet Feel). A 32-step visual grid shows each track's beat pattern with a moving playhead column indicating the current step. Position display shows current bar and beat.

</llm-only>

## How It Works

The Transport clock is the heartbeat of the whole demo. It fires a `tick` event at every 16th note, which the UI uses to advance the step-grid playhead column in sync with playback.

### Drum Tracks via BeatTrack

Each drum track (Kick, Snare, Hi-hat) is a `BeatTrack` that loads three sample variations and uses round-robin playback for a natural feel. Calling `syncTo(transport)` locks the beat track to the transport clock:

```typescript
import { createTransport, createBeatTrack } from 'ez-web-audio'

const transport = await createTransport({ bpm: 120, timeSignature: [4, 4], ticksPerBeat: 4 })
const kick = await createBeatTrack(['/kick1.wav', '/kick2.wav', '/kick3.wav'], { numBeats: 32 })

kick.setPattern([1,0,0,0, 0,0,0,0, 1,0,0,0, ...])  // 32-step pattern
kick.syncTo(transport, { noteType: 1/16 })           // lock to transport grid
```

### Melody Tracks via Sequence

The Synth and Piano tracks use `createSequence()` to schedule notes at precise musical time positions. `Sequence` supports bar:beat:tick notation, note names (`'4n'`, `'8t'`), and raw beat numbers -- making it easy to express straight 8ths, syncopation, or triplets in the same API:

```typescript
import { createTransport, createSequence, createOscillator, createFont, getAudioContext } from 'ez-web-audio'

const transport = await createTransport({ bpm: 120, timeSignature: [4, 4] })

// Bass oscillator sequence
const bass = await createOscillator({ frequency: 82.4, type: 'sawtooth' })
const seq = createSequence(transport, { length: '2m', loop: true }) // SYNC -- no await

seq.at('1:1:0', (time) => { bass.frequency = 82.4; bass.playFor(0.4) })  // E2
seq.at('2n',    (time) => { bass.frequency = 110;  bass.playFor(0.4) })  // A2 at beat 2

// Triplet feel uses fractional beat values
seq.at(1/3, (time) => { bass.frequency = 49; bass.playFor(0.3) })  // G1 -- 8th triplet

// Piano soundfont sequence
const piano = await createFont('/audio/piano.js')
const audioContext = await getAudioContext()
seq.at('1:2:0', (time) => piano.getNote('E4')?.playIn(time - audioContext.currentTime))

transport.start()
```

### Mute and Solo

Drum tracks use `BeatTrack.muted` and `BeatTrack.solo` properties directly -- the library handles solo stacking natively. Melody tracks are guarded by a callback check: if any track is soloed, only soloed melody tracks fire their events:

```typescript
function shouldPlay(name: 'bass' | 'piano'): boolean {
  const anySoloed = Object.values(trackState).some(t => t.soloed)
  if (anySoloed) return trackState[name].soloed
  return !trackState[name].muted
}
```

### Live Playhead

The `transport.on('tick')` event drives the step-grid highlight. Each tick carries `{ bar, beat, tick }`, which maps to a 16th-note step index across the 2-bar loop:

```typescript
transport.on('tick', (e) => {
  const { bar, beat, tick } = e.detail
  const step = ((bar - 1) * 16) + ((beat - 1) * 4) + tick
  currentStep.value = step % 32  // 32-step loop
  positionDisplay.value = `${bar}:${beat}` // bar : beat
})
```

### Preset Switching

Switching presets calls `beatTrack.setPattern()` for all drum tracks and `seq.clear()` followed by re-registration for the melody sequences. Both operations are safe during live playback -- changes take effect on the next loop iteration.

## Demo Controls

| Control | What It Does |
|---------|-------------|
| Play / Pause / Stop | Controls transport clock |
| BPM slider | Changes tempo immediately during playback |
| M button | Mutes / unmutes individual track |
| S button | Solos track (multiple solos stack) |
| Preset buttons | Switches all 5 track patterns simultaneously |
| Step grid | Shows beat pattern and current playhead position |

## Further Reading

- [Transport Guide](/guide/transport) -- full Transport clock API, tick events, and time signature options
- [Sequence Guide](/guide/sequence) -- musical time notation, bar:beat:tick addressing, and note scheduling
- [Drum Machine](/examples/drum-machine) -- simpler BeatTrack-only pattern sequencer
