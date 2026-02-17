# Domain Pitfalls: Web Audio Advanced Features

**Domain:** Web Audio API library - advanced features
**Researched:** 2026-01-31
**Confidence:** HIGH (verified with MDN official docs and Web Audio performance guide)

## Executive Summary

Adding advanced Web Audio features introduces timing, memory, and performance challenges that are fundamentally different from traditional JavaScript development. The Web Audio API operates on multiple threads with strict real-time requirements. A single timing error, memory leak, or automation mistake can cause audible artifacts (clicks, pops, dropouts) that destroy the user experience.

The most critical pitfalls affect **ADSR envelopes** (rapid retriggering causes gain discontinuities), **event systems** (JavaScript timers cause drift vs AudioContext clock), **visualization** (requestAnimationFrame coupling with AnalyserNode), and **AudioParam automation** (event accumulation degrades performance).

---

## Critical Pitfalls

Mistakes that cause audible artifacts, rewrites, or major performance issues.

### Pitfall 1: ADSR Envelope Retriggering Discontinuities

**What goes wrong:** When a note is retriggered before the previous envelope completes (fast tempos, rapid note changes, layered sounds), setting a new attack from the current gain value causes audible clicks and pops.

**Why it happens:**
- Attack/decay ramps operate at fixed rates, not fixed durations
- A new envelope starting at gain=0.7 takes less time to reach 1.0 than one starting at 0
- If the previous envelope hasn't ramped to zero before the new attack starts, there's a discontinuity in the gain curve
- Exponential ramps cannot reach exactly zero (only asymptotically approach)

**Consequences:**
- Audible "pops" at fast tempos (e.g., quarter notes at 400bpm, thirty-second notes at 60bpm)
- Clicks when overlapping notes in layered sounds
- User perception of low-quality audio

**Prevention:**
1. **Always ramp to a tiny value (0.0001), never zero** for exponential envelope releases
2. **Pick up from current value** when retriggering:
   ```typescript
   // BAD: Starts new attack from 0, creates discontinuity
   gainParam.cancelScheduledValues(now)
   gainParam.setValueAtTime(0, now)
   gainParam.linearRampToValueAtTime(1, now + attackTime)

   // GOOD: Picks up from current value
   const currentGain = gainParam.value // Get actual current value
   gainParam.cancelScheduledValues(now)
   gainParam.setValueAtTime(currentGain, now)
   // Adjust attack duration based on distance to travel
   const adjustedAttack = attackTime * (1 - currentGain)
   gainParam.linearRampToValueAtTime(1, now + adjustedAttack)
   ```

3. **Use setTargetAtTime for smooth transitions**:
   ```typescript
   // Eliminates clicks by gradually approaching target
   gainParam.setTargetAtTime(targetValue, startTime, timeConstant)
   ```

**Detection:** Listen for clicks/pops during rapid note retriggering, use oscilloscope visualization to see gain discontinuities

**Feature mapping:** ADSR envelopes, LayeredSound

**Sources:**
- [Web Audio ADSR GitHub Issue #510](https://github.com/WebAudio/web-audio-api/issues/510)
- [Fastidious Envelope Generator](https://github.com/rsimmons/fastidious-envelope-generator)
- [Dobrian Envelopes Tutorial](https://dobrian.github.io/cmp/topics/building-a-synthesizer-with-web-audio-api/4.envelopes.html)

---

### Pitfall 2: JavaScript Timer / AudioContext Clock Desynchronization

**What goes wrong:** Using `setTimeout`, `setInterval`, or `Date.now()` to schedule audio events causes timing drift, late triggers, and noticeable stuttering.

**Why it happens:**
- JavaScript timers run on the main thread alongside DOM operations, garbage collection, and user interactions
- AudioContext.currentTime runs on a separate high-priority audio rendering thread
- Main thread blocking (70-100ms computations) delays JavaScript timers but does NOT affect audio clock
- JavaScript timer precision is ~4ms at best, audio requires sub-millisecond precision

**Consequences:**
- Audio events drift out of sync over time
- Stuttering during CPU-intensive operations (animations, rendering)
- Beat grids sound "sloppy" or "drunk"
- Impossible to achieve tight musical timing (sub-10ms accuracy)

**Prevention:**
1. **Never use JavaScript timers for audio scheduling**:
   ```typescript
   // BAD: Will drift and stutter
   setInterval(() => {
     playBeat()
   }, 500) // Supposed to be every 500ms

   // GOOD: Schedule with AudioContext time
   function scheduleBeats(currentBeat: number) {
     const beatTime = audioContext.currentTime + (currentBeat * 0.5)
     scheduleSound(beatTime)
   }
   ```

2. **Use lookahead scheduling pattern**:
   ```typescript
   // Schedule events 100ms ahead using AudioContext time
   let nextNoteTime = audioContext.currentTime
   const scheduleAheadTime = 0.1 // 100ms lookahead

   function scheduler() {
     while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
       scheduleNote(nextNoteTime)
       nextNoteTime += 60.0 / tempo // Advance by note duration
     }
   }

   // Use JavaScript timer ONLY for checking/scheduling, not timing
   setInterval(scheduler, 25) // Check every 25ms
   ```

3. **Dispatch events based on audio time, not wall time**:
   - Store scheduled event times as `audioContext.currentTime` values
   - When dispatching to UI, use `audioContext.currentTime` to determine "now"
   - Use ScriptProcessorNode or AudioWorklet callbacks for sample-accurate events

**Detection:**
- Record audio and compare to expected timing (drift > 10ms is bad)
- Beat sequences that "rush" or "drag" over time
- Events fire late during page scrolling or animations

**Feature mapping:** Event system, BeatTrack enhancements, audio sprites playback timing

**Sources:**
- [Web Audio Timing Tutorial](https://catarak.github.io/blog/2014/12/02/web-audio-timing-tutorial/)
- [Understanding Web Audio Clock](https://sonoport.github.io/web-audio-clock.html)
- [Event Scheduling in Web Audio API](https://vispo.com/netartery/event-scheduling-in-the-web-audio-api.html)

---

### Pitfall 3: AudioParam Event Accumulation Performance Degradation

**What goes wrong:** Scheduling thousands of AudioParam automation events (e.g., long sequences of ADSR envelopes, continuous effects automation) causes performance to degrade over time until audio dropouts occur.

**Why it happens:**
- Non-Gecko browsers accumulate scheduled events in unbounded lists
- Each render cycle iterates through ALL pending events to calculate current value
- As event count grows (thousands), render time exceeds the audio buffer deadline
- AudioParam events are never garbage collected until the node is destroyed

**Consequences:**
- Smooth performance initially, then gradual degradation
- Audio dropouts (clicks, silence, noise) after minutes/hours of use
- Performance cliff is sudden and hard to debug
- More severe on mobile/low-power devices

**Prevention:**
1. **Swap nodes periodically** to clear event lists:
   ```typescript
   class ADSREnvelope {
     private eventCount = 0
     private readonly MAX_EVENTS = 1000

     trigger() {
       this.eventCount++

       // Recreate gain node every 1000 triggers
       if (this.eventCount > this.MAX_EVENTS) {
         const oldGain = this.gainNode
         this.gainNode = audioContext.createGain()
         this.gainNode.gain.value = oldGain.gain.value
         // Reconnect in audio graph
         this.reconnectGainNode()
         oldGain.disconnect()
         this.eventCount = 0
       }

       // Schedule envelope...
     }
   }
   ```

2. **Use cancelScheduledValues() aggressively**:
   ```typescript
   // Before scheduling new events, clear old ones
   gainParam.cancelScheduledValues(audioContext.currentTime)
   ```

3. **Prefer setTargetAtTime over long ramp chains**:
   ```typescript
   // BAD: Creates many automation events
   for (let i = 0; i < 100; i++) {
     gainParam.linearRampToValueAtTime(values[i], times[i])
   }

   // BETTER: Single event with time constant
   gainParam.setTargetAtTime(targetValue, startTime, timeConstant)
   ```

4. **Monitor node reuse in long-running applications**:
   - Track how many times nodes are reused
   - Set thresholds for node recreation
   - Include in debug mode

**Detection:**
- Performance degrades over extended use (hours)
- Chrome DevTools WebAudio panel shows growing event counts
- Audio dropouts that resolve after page refresh

**Feature mapping:** ADSR envelopes, effects automation, crossfading, any feature using AudioParam.setValueAtTime chains

**Sources:**
- [Web Audio Performance Notes](https://padenot.github.io/web-audio-perf/)
- Verified: MDN Best Practices doc

---

### Pitfall 4: AudioBufferSourceNode Single-Use Violation

**What goes wrong:** Attempting to reuse an AudioBufferSourceNode after calling `start()` causes silent failures or crashes. Developers expect source nodes to work like `<audio>` elements (reusable).

**Why it happens:**
- AudioBufferSourceNode is explicitly designed as single-use ("fire and forget")
- After `start()` is called, the node transitions to an unusable state
- Calling `start()` again throws `InvalidStateError`
- This design is intentional but counterintuitive for developers from other audio APIs

**Consequences:**
- Silent failures in audio sprites (only first playback works)
- Confusing errors: "Failed to execute 'start' on 'AudioBufferSourceNode'"
- Memory leaks if developers hold references expecting reuse
- Poor performance if developers recreate AudioBuffers instead of just source nodes

**Prevention:**
1. **ALWAYS create new source node per playback**:
   ```typescript
   class Sound {
     private audioBuffer: AudioBuffer // Reuse this

     play() {
       // Create NEW source for each play
       const source = audioContext.createBufferSource()
       source.buffer = this.audioBuffer // Reuse buffer
       source.connect(this.gainNode)
       source.start()

       // Don't keep reference - "fire and forget"
       // Will be garbage collected after playback
     }
   }
   ```

2. **Separate buffer lifecycle from source lifecycle**:
   ```typescript
   // GOOD pattern (already in ez-audio)
   class Sound {
     constructor(
       private audioContext: AudioContext,
       private audioBuffer: AudioBuffer // Stored once, reused
     ) {}

     play() {
       const source = this.createSourceNode() // New every time
       this.controller.updateAudioSource(source)
       source.start()
     }
   }
   ```

3. **Document the pattern**:
   - Add JSDoc comments explaining single-use nature
   - Show examples of correct reuse pattern (buffer reuse, source recreation)

**Detection:**
- "InvalidStateError" when calling `start()`
- Audio sprites play once then stop working
- Memory usage grows with number of play() calls

**Feature mapping:** Audio sprites, Sound/Track base classes, LayeredSound, preloading system

**Sources:**
- [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
- [Playing Sounds with Web Audio API](https://blog.openreplay.com/playing-sounds-web-audio-api/)

---

### Pitfall 5: Direct AudioParam Value Assignment During Automation

**What goes wrong:** Setting `audioParam.value = X` directly while automation is scheduled causes the change to be silently ignored. Developers expect last-write-wins behavior.

**Why it happens:**
- When AudioParam has scheduled events, the `.value` setter is disabled
- The automation timeline takes complete control
- Direct assignment doesn't throw an error, it just does nothing
- This is by design but extremely counterintuitive

**Consequences:**
- Controls don't work (user moves slider, nothing happens)
- Silent failures hard to debug
- Mixing direct assignment with automation causes unpredictable behavior
- Users report "broken controls"

**Prevention:**
1. **NEVER mix direct assignment with automation**:
   ```typescript
   // BAD: Mixing styles
   gainParam.value = 0.5 // Direct assignment
   gainParam.linearRampToValueAtTime(1, time) // Automation - now .value is ignored!

   // GOOD: Use only automation methods
   gainParam.cancelScheduledValues(audioContext.currentTime)
   gainParam.setValueAtTime(0.5, audioContext.currentTime)
   gainParam.linearRampToValueAtTime(1, time)
   ```

2. **In ez-audio's controller pattern, enforce consistency**:
   ```typescript
   // Update the existing pattern to always use setValueAtTime
   protected _update(type: ControlType, value: number): void {
     switch (type) {
       case 'gain':
         // BAD (current code - uses direct assignment)
         this.gainNode.gain.value = value;

         // BETTER: Use automation method
         this.gainNode.gain.setValueAtTime(
           value,
           this.audioContext.currentTime
         );
         break;
     }
   }
   ```

3. **Clear automation before manual updates**:
   ```typescript
   public update(type: ControlType) {
     return {
       to: (value: number) => {
         return {
           from: (method: RatioType) => {
             const param = this.getAudioParam(type);
             // Clear any scheduled automation first
             param.cancelScheduledValues(this.audioContext.currentTime);
             param.setValueAtTime(
               this.convertValue(value, method),
               this.audioContext.currentTime
             );
           }
         }
       }
     }
   }
   ```

**Detection:**
- UI controls don't affect sound
- Changes work initially but stop after using onPlaySet/onPlayRamp
- Console shows no errors but behavior is wrong

**Feature mapping:** ADSR envelopes, effects automation, existing controller methods, crossfading

**Sources:**
- [MDN AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
- [Web Audio Crossfading Gotchas](http://alemangui.github.io/ramp-to-value)

---

## Moderate Pitfalls

Mistakes that cause delays, performance issues, or technical debt.

### Pitfall 6: AnalyserNode FFT Size / Performance Trade-off

**What goes wrong:** Using large FFT sizes (2048+) for real-time visualization causes frame drops and laggy UI, especially on mobile.

**Why it happens:**
- Larger FFT = more frequency resolution but more computation
- FFT calculation happens on audio thread, stealing CPU from rendering
- AnalyserNode data is heavily skewed toward high frequencies (50%+ of data is inaudible)
- requestAnimationFrame calls every ~16ms (60fps), but FFT might take 10ms+

**Consequences:**
- Visualization frame rate drops below 30fps
- Janky animations and UI lag
- Mobile devices become unusable
- Battery drain

**Prevention:**
1. **Use minimum FFT size for use case**:
   ```typescript
   class AudioVisualizer {
     private analyser: AnalyserNode

     constructor(audioContext: AudioContext, mode: 'waveform' | 'spectrum') {
       this.analyser = audioContext.createAnalyser()

       // Match FFT size to visualization needs
       if (mode === 'waveform') {
         this.analyser.fftSize = 256 // Minimal for waveform
       }
       else {
         this.analyser.fftSize = 1024 // Balance for spectrum
       }
     }
   }
   ```

2. **Downsample frequency data**:
   ```typescript
   getFrequencyData(): Uint8Array {
     const fullData = new Uint8Array(this.analyser.frequencyBinCount);
     this.analyser.getByteFrequencyData(fullData);

     // Only use lower half (high frequencies are less useful for visualization)
     const usefulData = fullData.slice(0, fullData.length / 2);

     // Further downsample to number of visual bars
     return this.downsampleToBarCount(usefulData, this.barCount);
   }
   ```

3. **Throttle visualization updates**:
   ```typescript
   private lastDrawTime = 0;
   private readonly DRAW_INTERVAL = 1000 / 30; // 30fps max

   private draw = () => {
     requestAnimationFrame(this.draw);

     const now = performance.now();
     if (now - this.lastDrawTime < this.DRAW_INTERVAL) {
       return; // Skip this frame
     }
     this.lastDrawTime = now;

     // Update visualization
   }
   ```

4. **Provide performance presets**:
   ```typescript
   const VISUALIZER_PRESETS = {
     performance: { fftSize: 256, smoothing: 0.5 },
     balanced: { fftSize: 1024, smoothing: 0.7 },
     quality: { fftSize: 2048, smoothing: 0.8 },
   }
   ```

**Detection:**
- Chrome DevTools Performance tab shows long AnalyserNode frames
- Frame rate drops during visualization
- Mobile gets hot during playback with visualization

**Feature mapping:** Audio visualization feature

**Sources:**
- [MDN Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [Web Audio Performance Guide](https://padenot.github.io/web-audio-perf/)

---

### Pitfall 7: Memory Leaks from Undisconnected Nodes

**What goes wrong:** AudioNodes remain in memory indefinitely even after audio playback completes, causing memory usage to grow until the browser crashes (especially in games or long-running apps).

**Why it happens:**
- AudioNodes are not garbage collected while connected to the audio graph
- "Fire and forget" pattern (create source, start, don't keep reference) assumes automatic cleanup
- Connections to destination or other nodes prevent GC
- AudioBuffers are large (multiple MB) and shared across source nodes

**Consequences:**
- Memory usage grows 10-50MB per minute in sound-heavy apps
- Mobile browsers force page reload after 100-500 sounds
- Crashes after hours of use
- Worse with audio sprites (many small buffers)

**Prevention:**
1. **Disconnect nodes after playback**:
   ```typescript
   class Sound {
     play() {
       const source = audioContext.createBufferSource()
       source.buffer = this.audioBuffer
       source.connect(this.gainNode)

       // CRITICAL: Disconnect when done
       source.onended = () => {
         source.disconnect()
       }

       source.start()
     }
   }
   ```

2. **Clean up long-running nodes**:
   ```typescript
   class Track {
     stop() {
       if (this.source) {
         this.source.stop()
         this.source.disconnect() // Don't forget this
         this.source = null
       }
     }

     dispose() {
       this.stop()
       // Disconnect the entire chain
       this.gainNode.disconnect()
       this.pannerNode.disconnect()
       // Dereference AudioBuffer
       this.audioBuffer = null
     }
   }
   ```

3. **Monitor memory in debug mode**:
   ```typescript
   class DebugMemoryMonitor {
     private nodeCount = 0

     trackNode(node: AudioNode) {
       this.nodeCount++
       node.addEventListener('ended', () => this.nodeCount--)
     }

     getStats() {
       return {
         activeNodes: this.nodeCount,
         estimatedMemory: this.nodeCount * 50000 // Rough estimate
       }
     }
   }
   ```

4. **Implement buffer pooling for audio sprites**:
   ```typescript
   // Instead of keeping 100 AudioBuffers, use shared buffer with offset
   class AudioSpriteSheet {
     private buffer: AudioBuffer
     private sprites: Map<string, { offset: number, duration: number }>

     play(spriteName: string) {
       const sprite = this.sprites.get(spriteName)
       const source = audioContext.createBufferSource()
       source.buffer = this.buffer // Single shared buffer
       source.start(0, sprite.offset, sprite.duration)
       source.onended = () => source.disconnect() // Clean up
     }
   }
   ```

**Detection:**
- Chrome DevTools Memory profiler shows growing AudioNode count
- Mobile browser forces refresh
- Memory usage grows linearly with play() calls
- Heap snapshots show retained AudioBufferSourceNode instances

**Feature mapping:** All playback features, audio sprites, LayeredSound, Sound/Track base classes

**Sources:**
- [Web Audio Memory Management](https://padenot.github.io/web-audio-perf/)
- [Phaser WebAudio Memory Leak Issue](https://github.com/photonstorm/phaser/issues/5224)
- [MDN Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

---

### Pitfall 8: Effects Chain Connection Order Errors

**What goes wrong:** Connecting effects in the wrong order causes silent audio, context errors, or creates feedback loops that crash the audio thread.

**Why it happens:**
- `connect()` calls must form a directed acyclic graph (DAG)
- Creating cycles without DelayNode causes exceptions
- Connecting nodes from different AudioContexts throws errors (common with multiple contexts)
- Output/input index mismatches fail silently

**Consequences:**
- Complete audio silence (hard to debug)
- "Failed to execute 'connect': cycle detected" errors
- "NotSupportedError: Nodes are from different contexts"
- Subtle timing issues from incorrect routing

**Prevention:**
1. **Validate connection compatibility**:
   ```typescript
   class EffectsChain {
     connect(source: AudioNode, destination: AudioNode) {
       // Validate same context
       if (source.context !== destination.context) {
         throw new Error('Cannot connect nodes from different AudioContexts')
       }

       // Validate index ranges if using specific inputs/outputs
       // (Most nodes have 1 input and 1 output, but some have multiple)

       source.connect(destination)
     }
   }
   ```

2. **Build chains incrementally with validation**:
   ```typescript
   class EffectsChain {
     private nodes: AudioNode[] = []

     addEffect(effect: AudioNode): this {
       if (this.nodes.length > 0) {
         const lastNode = this.nodes[this.nodes.length - 1]
         lastNode.disconnect() // Disconnect old routing
         lastNode.connect(effect) // Connect to new effect
       }

       this.nodes.push(effect)
       return this // Fluent API
     }

     connectToDestination(destination: AudioNode) {
       if (this.nodes.length > 0) {
         const lastNode = this.nodes[this.nodes.length - 1]
         lastNode.connect(destination)
       }
     }
   }
   ```

3. **Implement disconnect-before-reconnect pattern**:
   ```typescript
   // When rebuilding chains
   reconfigureEffects(newEffects: AudioNode[]) {
     // Disconnect entire chain
     this.nodes.forEach(node => node.disconnect());

     // Rebuild from scratch
     this.nodes = newEffects;
     for (let i = 0; i < this.nodes.length - 1; i++) {
       this.nodes[i].connect(this.nodes[i + 1]);
     }
   }
   ```

4. **Visualize graph for debugging**:
   ```typescript
   // Debug mode: print connection graph
   if (DEBUG) {
     console.log('Audio Graph:')
     console.log(this.source, '→', ...this.effects, '→', this.destination)
   }
   ```

**Detection:**
- Complete audio silence
- Console errors about cycles or context mismatches
- Chrome DevTools WebAudio panel shows disconnected nodes
- Following signal path manually (reconnect each node to speakers)

**Feature mapping:** Effects presets, existing `connections` array pattern, crossfading, LayeredSound

**Sources:**
- [MDN AudioNode.connect()](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode/connect)
- [Web Audio Basic Concepts](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API)

---

### Pitfall 9: Crossfade Volume Curve Errors

**What goes wrong:** Using linear crossfading (fade out A while fading in B linearly) causes a volume dip in the middle where both tracks are at 50%, making the crossfade audible and unpleasant.

**Why it happens:**
- Human hearing is logarithmic, not linear
- When two tracks are both at 50% linear gain, perceived loudness is ~70% (not 100%)
- This creates a "hole" in the middle of the crossfade
- Equal-power crossfading is required for constant perceived volume

**Consequences:**
- Audible dip during crossfades
- Unprofessional sound quality
- Crossfades that "pump" or "breathe"
- Users complain transitions are noticeable

**Prevention:**
1. **Use equal-power crossfade curve**:
   ```typescript
   function crossfade(
     trackA: GainNode,
     trackB: GainNode,
     position: number // 0 = full A, 1 = full B
   ) {
     // Equal power curve (constant power panning law)
     const gainA = Math.cos(position * Math.PI / 2)
     const gainB = Math.sin(position * Math.PI / 2)

     trackA.gain.setValueAtTime(gainA, audioContext.currentTime)
     trackB.gain.setValueAtTime(gainB, audioContext.currentTime)
   }
   ```

2. **Implement exponential ramps for fades**:
   ```typescript
   function fadeOut(gainNode: GainNode, duration: number) {
     const now = audioContext.currentTime
     gainNode.gain.setValueAtTime(gainNode.gain.value, now)
     // Exponential feels more natural than linear
     gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration)
   }

   function fadeIn(gainNode: GainNode, duration: number) {
     const now = audioContext.currentTime
     gainNode.gain.setValueAtTime(0.0001, now)
     gainNode.gain.exponentialRampToValueAtTime(1, now + duration)
   }
   ```

3. **Provide crossfade curve options**:
   ```typescript
   type CrossfadeCurve = 'linear' | 'equal-power' | 'exponential'

   class Crossfader {
     crossfade(
       trackA: GainNode,
       trackB: GainNode,
       duration: number,
       curve: CrossfadeCurve = 'equal-power'
     ) {
       switch (curve) {
         case 'equal-power':
           this.equalPowerCrossfade(trackA, trackB, duration)
           break
         case 'exponential':
           this.exponentialCrossfade(trackA, trackB, duration)
           break
         case 'linear':
           // Still provide linear, but document it's not recommended
           this.linearCrossfade(trackA, trackB, duration)
           break
       }
     }
   }
   ```

**Detection:**
- Volume dip in middle of crossfade
- Crossfades sound unnatural or "pumpy"
- A/B testing against professional DJ software shows difference

**Feature mapping:** Crossfading feature, Track transitions

**Sources:**
- [Equal Power Crossfade Discussion](https://github.com/notthetup/smoothfade)
- [Web Audio Crossfade Examples](https://gist.github.com/scneptune/7498000)

---

### Pitfall 10: Multiple AudioContext Instances

**What goes wrong:** Creating multiple AudioContext instances (e.g., one per audio library component, or recreating on errors) causes performance degradation, resource exhaustion, and makes synchronization impossible.

**Why it happens:**
- Each AudioContext spawns a separate high-priority audio rendering thread
- Mobile browsers limit total number of contexts (often 4-6)
- Each context consumes system audio resources
- Contexts cannot be synchronized (different time origins)

**Consequences:**
- Performance degradation from multiple rendering threads
- "Failed to create AudioContext" errors on mobile
- Impossible to synchronize sounds across contexts
- Increased memory and CPU usage
- Audio dropouts from resource contention

**Prevention:**
1. **Singleton pattern for AudioContext (already in ez-audio)**:
   ```typescript
   // GOOD: Already implemented in ez-audio
   let audioContext: AudioContext

   export async function getAudioContext(): Promise<AudioContext> {
     if (!audioContext) {
       audioContext = new AudioContext()
     }
     return audioContext
   }
   ```

2. **Never recreate AudioContext on errors**:
   ```typescript
   // BAD: Creates new context on error
   try {
     audioContext.resume()
   }
   catch (e) {
     audioContext = new AudioContext() // DON'T DO THIS
   }

   // GOOD: Resume existing context
   if (audioContext.state === 'suspended') {
     await audioContext.resume()
   }
   ```

3. **Document single-context requirement**:
   - Warn users not to create their own AudioContext
   - Provide `getAudioContext()` for library extensions
   - Throw error if multiple contexts detected

4. **Handle context state transitions**:
   ```typescript
   async function ensureAudioContext() {
     if (!audioContext) {
       audioContext = new AudioContext()
     }

     // Handle all states
     if (audioContext.state === 'suspended') {
       await audioContext.resume()
     }
     else if (audioContext.state === 'closed') {
       // Context was closed - this is rare and usually intentional
       // Could throw error or create new one, but document this choice
       throw new Error('AudioContext was closed. Cannot reopen.')
     }
   }
   ```

**Detection:**
- Performance degradation over time
- "Too many AudioContext instances" errors on mobile
- Sounds from different sources don't sync
- Chrome DevTools shows multiple AudioContext instances

**Feature mapping:** All features (affects core architecture)

**Sources:**
- [MDN Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio Performance Guide](https://padenot.github.io/web-audio-perf/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 11: iOS Safari Silent Mode Behavior

**What goes wrong:** Web Audio API respects the device silent mode switch on iOS, causing complete audio silence without errors or warnings. HTML `<audio>` and `<video>` elements ignore silent mode, creating inconsistent behavior.

**Why it happens:**
- iOS design decision: Web Audio API is for "app-like" experiences
- System silent mode is meant to silence apps
- HTML media elements are "content" (like YouTube) and bypass silent mode
- No API to detect silent mode state

**Consequences:**
- Users report "audio doesn't work" on iOS
- Appears to be broken only for some users
- No errors in console, hard to diagnose remotely
- User frustration and support burden

**Prevention:**
1. **Show warning when audio fails to play**:
   ```typescript
   class AudioInitializer {
     async init() {
       await audioContext.resume()

       // Test if audio is actually working
       const testOscillator = audioContext.createOscillator()
       const testGain = audioContext.createGain()
       testGain.gain.value = 0.001 // Very quiet
       testOscillator.connect(testGain).connect(audioContext.destination)
       testOscillator.start()
       testOscillator.stop(audioContext.currentTime + 0.01)

       // If iOS and might be muted, warn user
       if (this.isIOS() && audioContext.state === 'running') {
         this.showSilentModeWarning()
       }
     }

     private showSilentModeWarning() {
       // Show UI: "Make sure silent mode is off"
     }
   }
   ```

2. **Document iOS silent mode behavior**:
   - Add to troubleshooting guide
   - Show icon/tooltip about silent mode requirements
   - Provide test button to verify audio

3. **iOS audio unlock workaround (already in ez-audio)**:
   ```typescript
   // GOOD: Already implemented
   if (useIosMuteWorkaround && !iosWorkaroundPerformed) {
     unmuteIosAudio(audioContext)
     iosWorkaroundPerformed = true
   }
   ```

**Detection:**
- User reports of "no sound" only on iOS
- Testing on iOS with silent mode enabled
- No errors but audio doesn't play

**Feature mapping:** Core initialization (already handled), debugging mode

**Sources:**
- [Web Audio API Update on iOS](https://adactio.medium.com/web-audio-api-update-on-ios-1e553fff7847)
- [Perfect Web Audio on iOS](https://matt-harrison.com/posts/web-audio/)

---

### Pitfall 12: Exponential Ramp to Zero Error

**What goes wrong:** Calling `exponentialRampToValueAtTime(0, time)` throws an error because exponential curves cannot reach zero (mathematical limitation).

**Why it happens:**
- Exponential functions asymptotically approach zero but never reach it
- Web Audio API enforces this mathematically
- Developers naturally want to "fade to silence" which is zero

**Consequences:**
- Runtime errors during fade-outs
- Failed envelope releases
- Crashes in production

**Prevention:**
1. **Use tiny value instead of zero**:
   ```typescript
   const ALMOST_ZERO = 0.0001 // -80dB, effectively silent

   function fadeOut(gainParam: AudioParam, duration: number) {
     const now = audioContext.currentTime
     gainParam.setValueAtTime(gainParam.value, now)
     gainParam.exponentialRampToValueAtTime(ALMOST_ZERO, now + duration)
   }
   ```

2. **Validate ramp endpoints**:
   ```typescript
   function exponentialRamp(
     param: AudioParam,
     targetValue: number,
     endTime: number
   ) {
     if (targetValue <= 0) {
       throw new Error('Exponential ramp target must be > 0. Use 0.0001 for silence.')
     }

     if (param.value <= 0) {
       param.setValueAtTime(0.0001, audioContext.currentTime)
     }

     param.exponentialRampToValueAtTime(targetValue, endTime)
   }
   ```

3. **Document in ADSR envelope API**:
   ```typescript
   /**
    * Release stage of ADSR envelope
    * Note: Uses exponential ramp to near-zero (0.0001) not actual zero
    */
   release(duration: number) {
     this.gainParam.exponentialRampToValueAtTime(0.0001, this.now + duration);
   }
   ```

**Detection:**
- Error: "exponentialRampToValueAtTime: target value must be positive"
- Failed fade-outs
- Envelope releases that throw errors

**Feature mapping:** ADSR envelopes, crossfading, effects automation

**Sources:**
- [MDN AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
- [Web Audio Crossfading](http://alemangui.github.io/ramp-to-value)

---

### Pitfall 13: Preloading Without User Gesture

**What goes wrong:** Calling `audioContext.decodeAudioData()` before user interaction causes the AudioContext to start in 'suspended' state, and preloaded buffers don't play until context is resumed.

**Why it happens:**
- Browser autoplay policies require user gesture to create/resume AudioContext
- AudioContext is created in 'suspended' state if not triggered by user gesture
- Buffers decode successfully but can't be played

**Consequences:**
- Preloaded sounds don't play on first interaction
- Users click and nothing happens
- Confusing error: context state is 'suspended'

**Prevention:**
1. **Preload after initial user gesture**:
   ```typescript
   class Preloader {
     private preloadTriggered = false

     async init() {
       // Wait for user gesture
       document.addEventListener('click', async () => {
         if (!this.preloadTriggered) {
           this.preloadTriggered = true
           await this.preloadAllSounds()
         }
       }, { once: true })
     }
   }
   ```

2. **Resume context before playing preloaded sounds**:
   ```typescript
   async playPreloadedSound(soundId: string) {
     await audioContext.resume(); // Ensure context is running
     const sound = this.preloadedSounds.get(soundId);
     sound.play();
   }
   ```

3. **Show loading indicator during decode**:
   ```typescript
   async preloadSound(url: string): Promise<AudioBuffer> {
     this.showLoadingIndicator();
     const response = await fetch(url);
     const arrayBuffer = await response.arrayBuffer();

     // This is fast but not instant for large files
     const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

     this.hideLoadingIndicator();
     return audioBuffer;
   }
   ```

**Detection:**
- Sounds don't play after preloading
- Console shows context state: 'suspended'
- First play() call does nothing

**Feature mapping:** Preloading API, audio sprites initialization

**Sources:**
- [MDN Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

---

## Feature-Specific Pitfall Mapping

| Feature | Critical Pitfalls | Moderate Pitfalls | Minor Pitfalls |
|---------|-------------------|-------------------|----------------|
| ADSR Envelopes | #1 Retriggering, #3 Event Accumulation, #5 Direct Assignment | - | #12 Exponential Zero |
| Event System | #2 Timer Desync | - | - |
| Audio Visualization | - | #6 FFT Performance | - |
| Audio Sprites | #4 Source Reuse | #7 Memory Leaks | #13 Preload Timing |
| Effects Presets | #5 Direct Assignment | #8 Connection Order | - |
| Crossfading | #5 Direct Assignment | #9 Volume Curve | - |
| LayeredSound | #1 Retriggering, #4 Source Reuse | #7 Memory Leaks | - |
| Debug Mode | - | #6 FFT, #7 Memory | #11 iOS Silent |
| Preloading API | - | #7 Memory Leaks | #13 Preload Timing |

---

## Detection Checklist for QA

When testing new features, check for these warning signs:

**Audio Quality Issues:**
- [ ] Clicks or pops during playback (Pitfall #1, #5)
- [ ] Volume dips during transitions (Pitfall #9)
- [ ] Audio dropouts or glitches (Pitfall #3, #10)

**Timing Issues:**
- [ ] Events drift out of sync over time (Pitfall #2)
- [ ] Beats sound "sloppy" or rushed/dragged (Pitfall #2)

**Performance Issues:**
- [ ] Frame rate drops during visualization (Pitfall #6)
- [ ] Performance degrades over extended use (Pitfall #3, #7)
- [ ] Memory usage grows continuously (Pitfall #7)

**Silent Failures:**
- [ ] Audio stops working after many play() calls (Pitfall #4)
- [ ] Controls don't affect sound (Pitfall #5)
- [ ] Complete silence with no errors (Pitfall #8, #11)

**Mobile-Specific:**
- [ ] App works on desktop but not iOS (Pitfall #11)
- [ ] Browser force-refreshes after heavy use (Pitfall #7)
- [ ] "Too many AudioContexts" error (Pitfall #10)

---

## Sources

**Official Documentation (HIGH confidence):**
- [MDN Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Web Audio Performance and Debugging Notes](https://padenot.github.io/web-audio-perf/)
- [MDN AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
- [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)

**Community Resources (MEDIUM-HIGH confidence):**
- [Web Audio ADSR Envelope Issue](https://github.com/WebAudio/web-audio-api/issues/510)
- [Fastidious Envelope Generator](https://github.com/rsimmons/fastidious-envelope-generator)
- [Web Audio Timing Tutorial](https://catarak.github.io/blog/2014/12/02/web-audio-timing-tutorial/)
- [Understanding Web Audio Clock](https://sonoport.github.io/web-audio-clock.html)
- [Web Audio: The Ugly Click](http://alemangui.github.io/ramp-to-value)
- [Perfect Web Audio on iOS](https://matt-harrison.com/posts/web-audio/)

**Issue Trackers (MEDIUM confidence):**
- [Phaser Memory Leak Issue](https://github.com/photonstorm/phaser/issues/5224)
- [Web Audio API Issues](https://github.com/WebAudio/web-audio-api/issues)
