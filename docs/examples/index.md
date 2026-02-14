---
title: Interactive Examples
---

# Interactive Examples

Try EZ Web Audio features directly in your browser. Each example demonstrates core library features through interactive demos you can play with immediately.

## Audio Files

### [Basic Playback](/examples/basic-playback)

Play sounds and music tracks with volume and pan control. Learn the difference between Sound (one-shot effects) and Track (music with pause/resume).

**You'll learn:**
- Loading and playing audio files
- Controlling volume and stereo position
- Pause, resume, and seek for music tracks
- Position tracking and progress display

## Sampling

### [Sampled Drum Kit](/examples/sampled-drum-kit)

Build a playable drum kit using audio samples with round-robin playback for natural variation. Play kick, snare, and hi-hat sounds by clicking pads or tapping on mobile.

**You'll learn:**
- Using `createSampler()` with multiple variations
- Round-robin sample rotation
- Loading states and async audio initialization
- Touch and mouse event handling

### [Soundfont Piano](/examples/soundfont-piano)

Play a full piano keyboard using a soundfont with real piano samples. Compare the difference between sampled instruments and synthesized sounds.

**You'll learn:**
- Loading and using soundfonts
- Musical note mapping (letter, accidental, octave)
- Computer keyboard input for musical instruments
- Working with large audio assets (~1.4MB)

## Synthesis

### [Synth Keyboard](/examples/synth-keyboard)

A polyphonic synthesizer keyboard with visual piano keys, ADSR envelope controls, and waveform selection. Hold multiple keys for chords.

**You'll learn:**
- Creating oscillators with different waveforms
- Using ADSR envelopes for natural sound shaping
- Polyphonic playback (multiple notes simultaneously)
- Preset systems for common sounds

### [XY Pad](/examples/xy-pad)

Control frequency and gain in real-time by dragging on a 2D canvas. See how continuous parameter modulation works with visual feedback.

**You'll learn:**
- Real-time parameter updates with `update()`
- Logarithmic frequency scaling for musical perception
- Canvas-based audio control interfaces
- Frequency to note name conversion

### [Synth Drum Kit](/examples/synth-drum-kit)

Create drum sounds entirely from synthesis without any audio files. Learn how to build kick, snare, and hi-hat sounds using oscillators, noise, and filters.

**You'll learn:**
- Synthesizing percussion with frequency sweeps
- Creating noise-based sounds
- Layering multiple oscillators
- Using filters (highpass, bandpass) for tone shaping

## Timing & Sequencing

### [Timing Basics](/examples/timing)

Master the Web Audio timing model with examples of immediate playback, delayed playback, and precise scheduling for musical timing.

**You'll learn:**
- Playing sounds immediately with `play()`
- Delayed playback with `playIn(seconds)`
- Precise scheduling with `playAt(audioContext.currentTime)`
- Perfect synchronization for chords and rhythms

### [Drum Machine](/examples/drum-machine)

A step sequencer with multiple drum lanes, BPM control, and a visual playhead. Create and play rhythmic patterns by toggling beat cells.

**You'll learn:**
- Using `createBeatTrack()` for sequencing
- Beat activation and pattern creation
- Looping playback with tempo control
- Visual feedback during playback

## Effects & Routing

### [Effects](/examples/effects)

Apply and control audio effects in real-time. Experiment with different filter types, frequencies, and resonance settings while audio plays.

**You'll learn:**
- Creating and applying filter effects
- Adjusting filter parameters in real-time
- Different filter types (lowpass, highpass, bandpass, notch)
- Effect bypass and parameter automation

### [Audio Routing](/examples/audio-routing)

Route audio through effects with control over bypass, wet/dry mix, and signal chain order. Visualize how audio flows through the effects chain.

**You'll learn:**
- Adding and removing effects dynamically
- Using `effect.bypass` and `effect.mix`
- Creating custom effects with native Web Audio nodes
- Signal chain visualization

## Running Examples Locally

Clone the repository and run the development server:

```bash
git clone https://github.com/sethbrasile/ez-web-audio.git
cd ez-web-audio
pnpm install
pnpm docs:dev
```

Then visit `http://localhost:5173/ez-web-audio/examples/`

## Browser Compatibility

These examples work in all modern browsers:

| Browser | Version |
|---------|---------|
| Chrome | 66+ |
| Firefox | 60+ |
| Safari | 14.1+ |
| Edge | 79+ |

::: tip Mobile Support
All examples work on mobile devices. Audio requires a tap gesture to initialize,
just like on desktop.
:::

## Source Code

Each example includes its full source code. Click "View Source" on any example
to see how it works, or browse the examples in the
[GitHub repository](https://github.com/sethbrasile/ez-web-audio/tree/main/docs/examples).
