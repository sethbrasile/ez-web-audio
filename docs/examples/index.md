---
title: Interactive Examples
---

# Interactive Examples

Try EZ Web Audio features directly in your browser.

::: warning Browser Requirement
All examples require clicking a button to start. This is a browser security
requirement - audio cannot auto-play without user interaction.
:::

## Basic Examples

### [Basic Playback](/examples/basic-playback)

Play sounds and music tracks with volume and pan control. Learn the difference
between Sound (one-shot effects) and Track (music with pause/resume).

**You'll learn:**
- Loading and playing audio files
- Controlling volume and stereo position
- Pause, resume, and seek for music tracks
- Position tracking and progress display

### [Synthesis](/examples/synthesis)

Generate sounds with oscillators, including ADSR envelopes for shaping tone.

**You'll learn:**
- Creating oscillators with different waveforms
- Using ADSR envelopes for natural sound shaping
- Playing musical notes
- Real-time frequency control

### [Effects](/examples/effects)

Add effects like filters and gain to shape your audio.

**You'll learn:**
- Creating and applying filter effects
- Adjusting filter parameters in real-time
- Chaining multiple effects
- Understanding the audio signal path

## Advanced Examples

### Drum Machine

Build rhythmic patterns with BeatTrack and timed playback.

**Features:**
- Step sequencer interface
- Multiple drum tracks (kick, snare, hi-hat)
- Tempo control
- Pattern saving

### Layered Sounds

Combine multiple sounds for complex audio experiences.

**Features:**
- Synchronize multiple audio sources
- Individual layer volume control
- Start/stop all layers together
- Dynamic layer management

### Audio Sprites

Efficiently play multiple sounds from a single audio file.

**Features:**
- Define named regions within an audio file
- Play specific sprites by name
- Reduce HTTP requests
- Overlap handling

## Running Examples Locally

Clone the repository and run the development server:

```bash
git clone https://github.com/sethbrasile/ez-web-audio.git
cd ez-web-audio
pnpm install
pnpm docs:dev
```

Then visit http://localhost:5173/ez-web-audio/examples/

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
