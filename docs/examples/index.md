---
title: Interactive Examples - Web Audio Demos with Source Code
description: "Try interactive web audio demos: drum machines, synthesizers, piano keyboards, XY pads, audio visualization, and more. Each example includes source code using EZ Web Audio."
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

## Composition

### [Audio Sprite](/examples/audio-sprite)

Pack multiple short sounds into a single audio file and play them by name. Reduce HTTP requests in audio-heavy applications by loading once and playing many.

**You'll learn:**
- Loading a sprite with `createSprite()` and a spritemap definition
- Playing named segments with `sprite.play('name')`
- Looping sprite segments and stopping them with `sprite.stop('name')`
- Reducing HTTP requests with sprite bundling

### [Layered Sound](/examples/layered-sound)

Play multiple audio layers in perfect synchronization using a shared `audioContext.currentTime`. Control all layers as a group or adjust each individually.

**You'll learn:**
- Creating synchronized playback with `createLayeredSound()`
- Master gain/pan control affecting all layers at once
- Individual layer access and per-layer gain control
- Listening for `play`, `stop`, and `end` events

### [Crossfade](/examples/crossfade)

Transition smoothly between two tracks using equal-power crossfade curves. Create DJ-style fades that maintain constant perceived loudness throughout.

**You'll learn:**
- Using `crossfade(fromTrack, toTrack, duration)` for smooth transitions
- How equal-power curves prevent the volume dip of linear fades
- Awaiting crossfade completion for sequenced transitions
- Chaining multiple crossfades together

## Integration Patterns

### [Vue Reactive Pattern](/examples/drum-machine-vue)

Build a drum machine using Vue 3's reactive system for automatic UI updates when beat states change.

**You'll learn:**
- Using `wrapWith: reactive` for Vue reactivity
- Computed properties for beat state
- Watch-based tempo control

### [Vanilla TypeScript Events](/examples/drum-machine-vanilla)

Build a drum machine with vanilla TypeScript using DOM events and manual state management.

**You'll learn:**
- Event-based audio state management
- Manual DOM updates on audio events
- Framework-free audio integration

### [React Integration](/examples/react-integration)

Integrate ez-web-audio into React applications using hooks patterns with useRef, useEffect, and custom hooks.

**You'll learn:**
- Using `useRef` for audio instance management
- `useEffect` cleanup for audio disposal
- Custom hooks for reusable audio logic
- Position tracking with `requestAnimationFrame`

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

## Creative

### [Ambient Generator](/examples/ambient-generator)

Create layered ambient soundscapes by combining oscillators and filtered white noise. Build evolving textures from simple synthesis building blocks.

**You'll learn:**
- Layering multiple sounds for rich textures
- Using white noise with filters for atmospheric effects
- ADSR envelopes for smooth, organic sounds
- Real-time parameter modulation
- Mixing multiple audio sources

### [Visualization](/examples/visualization)

Visualize audio in real-time using the Analyzer API. See both frequency spectrum (FFT) and time-domain waveform visualization.

**You'll learn:**
- Using the Analyzer API for audio visualization
- Frequency spectrum analysis with FFT
- Time-domain waveform display
- Canvas rendering with requestAnimationFrame
- Understanding different waveform shapes

## Running Examples Locally

Clone the repository and run the development server:

```bash
git clone https://github.com/sethbrasile/ez-web-audio.git
cd ez-web-audio
pnpm install
pnpm dev
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
