# Soundfont Piano

Play a realistic piano with real instrument samples loaded from a soundfont.

<script setup>
import SoundfontPiano from '../.vitepress/theme/components/SoundfontPiano.vue'
</script>

::: warning Browser Audio Requirement
This example requires user interaction to initialize the Web Audio API. Click or tap a piano key to start.
:::

<SoundfontPiano />

## What is a Soundfont?

A soundfont is a collection of pre-recorded instrument samples mapped to different pitches. Instead of synthesizing sounds with oscillators, soundfonts play back real audio recordings of acoustic instruments.

**How it works:**
1. **Recording** — Each note is recorded from a real piano at different pitches and velocities
2. **Encoding** — Audio samples are compressed and encoded (often as base64 in MIDI.js format)
3. **Decoding** — The library decodes the audio data and creates playable notes
4. **Playback** — When you call `font.play('C4')`, it plays the pre-recorded C4 sample

**Advantages:**
- Realistic, authentic instrument sound
- Natural acoustic characteristics (resonance, harmonics, decay)
- Professional quality without synthesis expertise

**Trade-offs:**
- Larger file size (the piano soundfont is 1.4MB)
- Loading time on slower connections
- Fixed timbre (can't drastically change the sound like synthesis)

## Loading Note

The piano soundfont is **1.4MB** and may take a moment to load on slower connections. The loading indicator shows progress while the soundfont is being fetched and decoded.

## How It Works

The `createFont()` function loads a soundfont file and creates playable notes:

```typescript
import { createFont } from 'ez-web-audio'

const piano = await createFont('/audio/piano.js')

// Play notes by identifier (note name + octave)
piano.play('C4')  // Middle C
piano.play('E4')  // E above middle C
piano.play('G4')  // G major chord with C4

// Get a specific note for advanced control
const note = piano.getNote('A4')
if (note) {
  note.changeGainTo(0.5)  // Adjust volume
  note.play()
}
```

**Note identifiers** use the format `letter + accidental + octave`:
- Letters: C, D, E, F, G, A, B
- Accidentals: flat (b) or natural (no symbol)
- Octave: 0-8

Examples: `C4` (middle C), `Db4` (C# above middle C), `A4` (concert A at 440Hz)

## Comparison with Synthesis

This piano uses **real recorded samples**. Compare with the [Synth Keyboard](/ez-web-audio/examples/synth-keyboard) which generates sounds from oscillators.

| Soundfont Piano | Synth Keyboard |
|-----------------|----------------|
| ✅ Realistic piano sound | ✅ Fully customizable waveforms |
| ✅ Natural acoustic decay | ✅ ADSR envelope control |
| ✅ No synthesis knowledge needed | ✅ Tiny file size (code only) |
| ❌ 1.4MB download | ❌ Harder to sound realistic |
| ❌ Fixed timbre | ✅ Real-time parameter changes |

**When to use soundfonts:**
- You need realistic instrument sounds
- File size is acceptable for your use case
- You don't need to heavily customize the timbre

**When to use synthesis:**
- You need small file sizes
- You want full control over the sound
- You're creating electronic or sci-fi sounds

## Component Reuse

This example reuses the `PianoKeyboard` component from [Synth Keyboard](/ez-web-audio/examples/synth-keyboard). The same visual piano keyboard works for both synthesized and sampled instruments — just swap out the sound engine!

## API Used

This example demonstrates:

- **`createFont(url)`** — Load a soundfont from a MIDI.js format file
- **`font.play(noteIdentifier)`** — Play a note by its identifier string (e.g., 'C4')
- **`font.getNote(noteIdentifier)`** — Get a specific note for advanced control
- **Note naming** — Flat notation (Db, Eb, Gb, Ab, Bb) matches the library's frequency map

## Next Steps

- Try [Sampled Drum Kit](/ez-web-audio/examples/sampled-drum-kit) for another example of sample-based playback
- Explore [Synth Keyboard](/ez-web-audio/examples/synth-keyboard) to compare with oscillator-based synthesis
- Learn about [Beat Track](/ez-web-audio/examples/beat-track) to sequence notes into melodies
