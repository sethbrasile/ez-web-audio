# Feature Landscape: Web Audio Libraries

**Domain:** Web Audio API wrappers and music/sound libraries
**Researched:** 2026-01-31
**Confidence:** MEDIUM (based on official docs + web search verification)

## Executive Summary

Modern Web Audio libraries fall into three categories: **full-featured DAWs** (Tone.js), **playback-focused** (Howler.js), and **simplicity-focused** (Pizzicato.js, EZ Audio). EZ Audio's current positioning is simplicity-focused with room to add power-user features without sacrificing ease of use.

Key finding: The most successful libraries have **excellent DX through fluent APIs** and **clear separation between basic playback and advanced synthesis**. Users expect events, but synthesis libraries (Tone.js) go beyond basic playback events to provide transport/scheduling systems.

## Table Stakes

Features users expect in a Web Audio library. Missing these makes the library feel incomplete.

| Feature | Why Expected | Complexity | Notes | EZ Audio Status |
|---------|--------------|------------|-------|-----------------|
| **Audio Playback** | Core purpose of library | Low | Load, play, pause, stop, seek | ✅ Has (Sound, Track) |
| **Volume Control** | Basic expectation for all audio | Low | Gain adjustment | ✅ Has (via controllers) |
| **Playback Events** | State management requirement | Low | play, pause, stop, ended events | ⚠️ Partial (no event system) |
| **Audio Loading** | Users need to get audio into the system | Low | Fetch + decode AudioBuffer | ✅ Has (createSound, createTrack) |
| **Format Support** | Cross-browser compatibility | Low | MP3, OGG, WAV minimum | ✅ Has (browser handles) |
| **AudioContext Management** | Browser requirement | Medium | User interaction unlock, iOS workarounds | ✅ Has (initAudio) |
| **Pan Control** | Stereo positioning | Low | Left/right balance | ✅ Has (via controllers) |
| **Loop Control** | Music and ambient sound | Low | Enable/disable looping | ✅ Has (Track) |

## Differentiators

Features that set libraries apart. Not expected, but provide competitive advantage.

| Feature | Value Proposition | Complexity | Notes | Recommendation |
|---------|-------------------|------------|-------|----------------|
| **ADSR Envelopes** | Professional synthesis capability | Medium | Attack, Decay, Sustain, Release curves | **HIGH PRIORITY** - Tone.js signature feature |
| **Audio Sprites** | Efficient asset loading for games | Low | Define segments in single file | **HIGH PRIORITY** - Howler.js signature feature |
| **Fluent Parameter API** | Excellent DX for scheduled changes | Medium | Method chaining, scheduled value changes | ✅ **Already has** (onPlaySet, onPlayRamp) |
| **Visual Waveforms** | User engagement and debugging | Medium | Canvas rendering with AnalyserNode | **MEDIUM PRIORITY** - wavesurfer.js specialty |
| **Effects Presets** | Quick professional sound | Medium | Reverb, delay, distortion with presets | **MEDIUM PRIORITY** - Pizzicato.js has 13 effects |
| **Crossfading** | Smooth transitions between tracks | Medium | Equal-power curve scheduling | **HIGH PRIORITY** - Common DJ/music app need |
| **3D Spatial Audio** | Game audio positioning | High | PannerNode, distance/position modeling | **LOW PRIORITY** - Niche use case |
| **Transport System** | DAW-like scheduling | High | Global timeline, tempo sync, loops | **LOW PRIORITY** - Tone.js specialty, complex |
| **Round-robin Sampling** | Realistic instrument sound | Low | Rotate through samples | ✅ **Already has** (Sampler) |
| **LayeredSound** | Parallel playback for richness | Low-Medium | Multiple sources, volume mix | **HIGH PRIORITY** - Planned feature |
| **Debug Mode** | Developer experience | Low | Audio graph visualization, state inspection | **MEDIUM PRIORITY** - Unique differentiator |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full DAW Features** | Scope creep, complex API, maintenance burden | Focus on simple playback + synthesis building blocks. Let Tone.js own the DAW space. |
| **Custom Audio Codecs** | Browser handles this well | Trust browser AudioContext.decodeAudioData() |
| **Visual Music Notation** | Out of scope, niche need | Provide hooks for visualization, let users build UI |
| **Built-in Audio Recording** | Different use case (MediaRecorder API) | Support Input source for processing, not recording management |
| **MIDI File Parsing** | Format-specific, niche | Provide timing/scheduling primitives, let users parse MIDI |
| **Audio Analysis ML** | Bleeding edge, unstable | Expose AnalyserNode data, let users integrate ML |
| **Server-side Processing** | Different architecture | Stay browser-focused |
| **Plugin System** | Premature complexity | Expose AudioNode connections, use composition |

## Feature Categories by Library

### Tone.js (Full-Featured DAW)

**Signature Features:**
- ADSR envelopes (AmplitudeEnvelope, Envelope classes)
- Transport system (global timeline, tempo sync, scheduling)
- Multiple synthesizers (Synth, FMSynth, AMSynth, PolySynth, NoiseSynth)
- Effect chains (Distortion, Filter, FeedbackDelay, Reverb)
- Scheduling system (Loop, Part, Pattern, Sequence)
- Signal automation (rampTo, exponential/linear curves)

**API Pattern:**
```javascript
// Fluent, musical, time-based
const synth = new Tone.Synth().toDestination()
synth.triggerAttackRelease("C4", "8n", Tone.now())

// Transport scheduling
Tone.Transport.scheduleRepeat((time) => {
  synth.triggerAttackRelease("C4", "8n", time)
}, "4n")
```

**Learning:** Complex but powerful. Users who need synthesis expect Tone.js-level features.

### Howler.js (Playback-Focused)

**Signature Features:**
- Audio sprites (offset + duration in single file)
- Automatic caching (loaded sounds cached)
- Spatial audio plugin (3D positioning)
- Fade utilities (fade in/out)
- Playback rate control
- HTML5 Audio fallback

**API Pattern:**
```javascript
// Simple, imperative
const sound = new Howl({
  src: ['sound.webm', 'sound.mp3'],
  sprite: {
    blast: [0, 3000],
    laser: [4000, 1000]
  }
})
sound.play('blast')
sound.fade(1, 0, 1000) // from, to, duration
```

**Learning:** Simplicity wins for playback. Sprites are killer feature for games.

### Pizzicato.js (Simplicity-Focused)

**Signature Features:**
- 13 built-in effects with simple API
- Sound groups (apply effects to multiple sounds)
- Multiple source types (wave, file, input, script)
- Event system (play, pause, stop, end)
- Effect chaining

**API Pattern:**
```javascript
// Simple objects, method calls
const sound = new Pizzicato.Sound('sound.mp3')
const delay = new Pizzicato.Effects.Delay()
sound.addEffect(delay)
sound.play()

sound.on('play', () => console.log('playing'))
```

**Learning:** Effects-as-objects pattern is intuitive. Event system is clean.

### Wavesurfer.js (Visualization-Focused)

**Signature Features:**
- Interactive waveform rendering
- Regions (time-based markers)
- Plugins (Timeline, Minimap, Spectrogram, Envelope)
- Zoom, scroll, seek via waveform
- Record plugin

**API Pattern:**
```javascript
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'violet',
  progressColor: 'purple'
})
wavesurfer.load('audio.mp3')
wavesurfer.play()
```

**Learning:** Visualization drives engagement. Users expect interactive waveforms in audio editors.

## Feature Dependencies

```
Core Foundation
├─ AudioContext Management
│  ├─ User interaction unlock
│  └─ iOS workarounds
│
Basic Playback (EZ Audio has this)
├─ Sound (one-shot playback)
├─ Track (music with position, seek)
├─ Sampler (round-robin)
└─ BeatTrack (rhythmic patterns)

Advanced Features (Proposed)
├─ Event System ← **Foundation for everything**
│  ├─ Playback events (play, pause, stop, ended)
│  └─ Parameter change events
│
├─ ADSR Envelopes ← **Depends on: Event system**
│  └─ Time-based gain curves
│
├─ Audio Sprites ← **Independent**
│  └─ Segment definitions + offset playback
│
├─ LayeredSound ← **Depends on: Event system (sync)**
│  └─ Multiple sounds mixed
│
├─ Crossfading ← **Depends on: Event system (timing)**
│  └─ Equal-power curve scheduling
│
├─ Visualization ← **Depends on: Event system (updates)**
│  ├─ AnalyserNode integration
│  └─ Canvas rendering
│
├─ Effects Presets ← **Independent**
│  └─ Configured effect node chains
│
└─ Debug Mode ← **Depends on: Event system**
   └─ Graph visualization, state inspection
```

**Critical Path:** Event system must come first. Almost all advanced features depend on it.

## API Design Patterns from Ecosystem

### Pattern 1: Fluent Interface (EZ Audio already has this)

**What:** Method chaining for parameter control
**Examples:**
```javascript
// EZ Audio (existing)
sound.update('gain').to(0.5).from('ratio')
sound.onPlaySet('gain').to(0).endingAt(1, 'exponential')

// Tone.js
synth.volume.rampTo(-12, 0.5)

// jQuery-style (Mooog library)
osc().gain(0.5).filter('lowpass', 440)
```

**Learning:** Users love fluent APIs for audio because they match the mental model of "configure then play."

### Pattern 2: Event System

**What:** Emit events for state changes
**Examples:**
```javascript
// Pizzicato.js
sound.on('play', callback)
sound.on('pause', callback)
sound.on('stop', callback)
sound.on('end', callback)

// AudioBufferSourceNode (native)
source.onended = callback
```

**Learning:** Simple event emitter pattern. 4 core events: play, pause, stop, ended.

### Pattern 3: Audio Sprites

**What:** Define named segments in a single audio file
**Examples:**
```javascript
// Howler.js
const sound = new Howl({
  src: ['sounds.mp3'],
  sprite: {
    blast: [0, 3000],      // offset ms, duration ms
    laser: [4000, 1000],
    winner: [6000, 5000]
  }
})
sound.play('blast')

// Implementation: Use AudioBufferSourceNode with offset
source.start(when, offset, duration)
```

**Learning:** Simple object format. Key = name, value = [offset, duration] in milliseconds.

### Pattern 4: ADSR Envelope

**What:** Attack-Decay-Sustain-Release curves for parameter control
**Examples:**
```javascript
// Tone.js
const envelope = new Tone.AmplitudeEnvelope({
  attack: 0.1,
  decay: 0.2,
  sustain: 0.5,
  release: 0.8
})
synth.connect(envelope)
envelope.triggerAttackRelease("8n")

// Pizzicato.js (simpler)
sound.attack = 0.04  // seconds to reach full volume
sound.release = 0.02 // seconds to reach zero volume
```

**Learning:** Full ADSR is complex (Tone.js). Simple attack/release (Pizzicato) covers 80% of use cases.

### Pattern 5: Effects as Objects

**What:** Create effect instances, add to sounds
**Examples:**
```javascript
// Pizzicato.js
const delay = new Pizzicato.Effects.Delay({
  time: 0.4,
  feedback: 0.6,
  mix: 0.5
})
sound.addEffect(delay)
sound.removeEffect(delay)

// Tone.js
const reverb = new Tone.Reverb({
  decay: 2.5,
  preDelay: 0.01
})
synth.connect(reverb)
```

**Learning:** Effect-as-object pattern is intuitive. Configurable parameters, add/remove from chain.

### Pattern 6: Crossfading

**What:** Smooth volume transitions using equal-power curves
**Examples:**
```javascript
// Tone.js CrossFade utility
const crossFade = new Tone.CrossFade(0.5).toDestination()
sourceA.connect(crossFade.a)
sourceB.connect(crossFade.b)
crossFade.fade.value = 1 // 0 = all A, 1 = all B

// Web Audio API (equal-power curve)
const gain1 = Math.cos(x * 0.5 * Math.PI)
const gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI)
gainNode1.gain.linearRampToValueAtTime(gain1, time)
gainNode2.gain.linearRampToValueAtTime(gain2, time)
```

**Learning:** Equal-power curve prevents volume dip. Linear crossfade sounds bad.

## Complexity Assessment

| Feature | Implementation Complexity | API Complexity | Maintenance |
|---------|---------------------------|----------------|-------------|
| **Event System** | Low (EventEmitter pattern) | Low (on/off/emit) | Low |
| **Audio Sprites** | Low (offset playback) | Low (object config) | Low |
| **ADSR (Simple)** | Medium (attack/release only) | Low (2 params) | Low |
| **ADSR (Full)** | High (4-stage envelope) | Medium (4 params + curves) | Medium |
| **LayeredSound** | Medium (sync multiple sources) | Low (array of sounds) | Medium |
| **Crossfading** | Medium (equal-power curves) | Medium (timing control) | Low |
| **Visualization** | Medium (AnalyserNode + Canvas) | Medium (config + render) | Medium |
| **Effects Presets** | Medium (configure nodes) | Low (name + params) | Medium |
| **Debug Mode** | Medium (graph traversal) | Low (enable flag) | Low |

## MVP Recommendation for EZ Audio Advanced Features

Based on complexity, dependencies, and ecosystem analysis:

### Phase 1: Foundation (Enables everything else)
1. **Event System** - CRITICAL, low complexity, unlocks all other features
2. **Audio Sprites** - HIGH VALUE, low complexity, Howler.js signature feature

### Phase 2: Differentiators (Quick wins)
3. **LayeredSound** - PLANNED, medium complexity, unique capability
4. **Crossfading** - HIGH VALUE, medium complexity, music apps expect this
5. **Simple ADSR (attack/release only)** - GOOD DX, medium complexity

### Phase 3: Polish (Advanced features)
6. **Effects Presets** - NICE TO HAVE, medium complexity
7. **Visualization** - USER ENGAGEMENT, medium complexity
8. **Debug Mode** - UNIQUE DIFFERENTIATOR, medium complexity

### Defer to Post-MVP
- **Full ADSR (4-stage)** - Complex, niche, Tone.js already owns this
- **Transport System** - Complex, DAW feature, out of scope
- **3D Spatial Audio** - Niche, plugin could add later

## Table Stakes Gap Analysis

EZ Audio is missing:

1. **Event System** - HIGH PRIORITY
   - Howler.js, Pizzicato.js, Tone.js all have this
   - Required for state management, UI updates
   - Foundation for many advanced features

2. **Audio Sprites** - MEDIUM PRIORITY
   - Howler.js signature feature, games expect this
   - Low complexity, high value
   - Efficient asset loading

## Sources

**Library Documentation (MEDIUM confidence - verified with official sources):**
- [Tone.js](https://tonejs.github.io/)
- [Howler.js](https://howlerjs.com/)
- [Pizzicato.js](http://alemangui.github.io/pizzicato/)
- [Wavesurfer.js](https://wavesurfer.xyz/)

**Ecosystem Comparisons (MEDIUM confidence - multiple sources):**
- [9 libraries to kickstart your Web Audio stuff](https://areknawo.com/10-libraries-for-web-audio-stuff/)
- [Best Libraries For Audio Processing](https://www.restack.io/p/web-audio-processing-libraries-answer-best-libraries-audio-processing)

**Technical Implementation (HIGH confidence - official MDN docs):**
- [Web Audio API Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio crossfade implementation](https://webaudioapi.com/samples/crossfade/)
- [How to add effects to audio](https://web.dev/patterns/media/audio-effects)

**Community Patterns (LOW-MEDIUM confidence - needs verification):**
- [Web Audio API – things I learned the hard way](https://blog.szynalski.com/2014/04/web-audio-api/)
- [awesome-webaudio curated list](https://github.com/notthetup/awesome-webaudio)

**Browser Tools (MEDIUM confidence - official sources):**
- [Chrome Audion extension](https://github.com/GoogleChrome/audion)
- [Tools for analyzing Web Audio usage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

**Library GitHub Repositories (HIGH confidence - official source code):**
- [Tone.js GitHub](https://github.com/Tonejs/Tone.js)
- [Howler.js GitHub](https://github.com/goldfire/howler.js)
- [Pizzicato.js GitHub](https://github.com/alemangui/pizzicato)
- [Wavesurfer.js GitHub](https://github.com/katspaugh/wavesurfer.js)
