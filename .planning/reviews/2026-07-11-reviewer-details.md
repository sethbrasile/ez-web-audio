# Reviewer results (condensed, for synthesis)

## R2 use-case coverage (opus) — 8 findings, 0 blocking
1. HIGH nb — no playbackRate on Sound/Track (SoundControlType gain|pan|detune, base-param-controller.ts:24); podcast speed use case; plumbing exists (detune same node). Fix: add 'playbackRate' to SoundControlType + sound-controller wiring.
2. MED nb — no SFX pool/voice-steal outside PolySynth (sampler.ts:33-86 round-robin only vs poly-synth.ts maxVoices/stealStrategy). Fix: extract VoicePool, add maxConcurrent to SamplerOptions.
3. MED nb — no ducking/sidechain helper; building blocks exist (gain ramp + Analyzer + play/stop/end events). Fix: duck(target, trigger, {amount,attack,release}) utility.
4. MED nb — no Playlist/queue abstraction (crossfade.ts two-track only; track.ts single). Fix: createPlaylist w/ auto-advance on 'end' + crossfade.
5. HIGH nb — Transport/BeatTrack/Sequence wall-clock-bound (utils/timeout.ts:16-53 RAF, beat-track.ts:552-604, transport.ts:125,576-607) → OfflineAudioContext render silently produces nothing though factories accept BaseAudioContext (docs multiple-contexts.md:114-139). Fix short: document; real: offline render mode computing schedule synchronously.
6. MED nb — no mic/MediaStream input (AudioInput union index.ts:304 lacks MediaStream). Fix: createMicInput wrapping MediaStreamAudioSourceNode reusing Connectable chain.
7. LOW nb — no setGlobalVolume/muteAll sugar atop setMasterDestination (index.ts:198-243).
8. LOW nb — stereo-only panning; no 3D/HRTF PannerNode option (base-sound.ts:94,220,601-609). Bigger lift, low priority.
Non-finding: automation curves/time-stretch reasonably covered.
Coverage: 19 files.

## R10 effects A: reverb/distortion/eq (sonnet) — 10 findings, 5 blocking
1. HIGH BLK — reverb-effect.ts:278-320 dispose() never disconnects combMerge GainNode (missing-effect-dispose regression; no dispose tests in reverb-effect.test.ts). Fix: add combMerge.disconnect() + dispose test.
2. HIGH BLK — base-effect.ts:154-185 rampTo() calls setTargetAtTime but never updates subclass shadow field → getter stale FOREVER after rampTo. Repro: reverb preDelay (238-247), all 7 EQ band params (eq-effect.ts:110-177), distortion tone (182-189). Fix: protected onParamRamped hook in BaseEffect called from rampTo.
3. MED BLK — distortion-effect.ts:155-179 amount/type setters swap waveShaperNode.curve instantly, no crossfade → click (the defect class smoothing pass meant to close; curve not an AudioParam). Fix: dual-waveshaper crossfade ~10-20ms or document.
4. MED BLK — eq-effect.ts:169-177 midQ setter no clamp/finite check → NaN poisons IIR state permanently. Fix: Math.max(0.0001,v) + reject non-finite.
5. MED BLK — reverb-effect.ts:224-235 decay setter no clamp → negative delayTime / NaN propagation. Fix: Math.max(0.05,v).
6. LOW nb — reverb preDelay setter (242-247)+ctor(121) missing lower floor 0.
7. LOW nb — reverb decay/damping setters inline timeConstant instead of smoothParamSet (drift risk).
8. LOW nb — rampTo silent no-op for unmapped names (decay/damping/amount/type) — no warn; DX trap.
9. LOW nb — bypass not bit-exact during ~30-50ms smoothing window (deliberate tradeoff, awareness only).
10. LOW nb — distortion curve regen allocates Float32Array(1024) per set (fine at UI rate; memoize if automated).
Coverage: 6 files + 6 test files. delay/compressor/filter/gain/wrapper out of scope (R11 covers).

## R9 grain-player/sprite (sonnet) — 9 findings, 4 blocking
1. HIGH BLK — grain-player.ts:225 compensatedDuration = grainSize / rate INVERTED; should be grainSize * rate (start() duration is buffer-time). At +12st grains audibly last grainSize/4, silent tails, texture thins. Fix: multiply; re-verify offset clamp.
2. HIGH BLK — sprite.ts:309 play() hardcodes connect(audioContext.destination), bypasses getMasterDestination() (all other classes route through it: base-sound.ts:228, layered-sound.ts:74, poly-synth.ts:276, grain-player.ts:115). Sprites escape global limiter/mute. Fix: getMasterDestination() ?? destination.
3. MED BLK — grain-player.ts:579-589 dispose() only disposes timer if _playing; play→stop→dispose leaks live Worker + Blob URL (worker-timer.ts:124-138). Fix: unconditional timer.dispose().
4. MED BLK — grain-player.ts:203-212 grain envelopes peak at 1, no overlap normalization; high overlap (hop 0.001) sums ~100 full-amplitude grains → clipping. Fix: scale peak by hopSize/grainSize or clamp overlap.
5. MED nb — grain-player.ts:220-226 maxOffset clamp uses grainSize not compensatedDuration (tail truncation at high pitch after fix 1). Fix: clamp w/ compensatedDuration.
6. LOW nb — doc says "Hann window", implementation is triangular linear ramp. Rename or implement cosine.
7. LOW nb — play() while paused runs full play path, emits 'play' not 'resume' (grain-player.ts:254-275).
8. MED nb — sprite.ts:178-186/272-280 end>buffer.duration validated only at play(), not ctor (fail-fast gap).
9. LOW nb — zero-length sprite + loop:true → loopEnd<=loopStart loops ENTIRE buffer per spec (sprite.ts:179,316-330). Throw or no-op.
Coverage: 2 scope files + worker-timer/audio-context supporting. Static analysis; recommends unit test on start() duration arg.

## R8 lfo/analyzer (sonnet) — 6 findings, 4 blocking; analyzer.ts clean
1. HIGH BLK — lfo.ts:472-474+234-268 _isBaseSound duck-types PolySynth/GrainPlayer as BaseSound; syncLifecycle/retrigger register play/stop/end listeners PolySynth never emits (PolySynthEventMap only voicestolen/dispose) and GrainPlayer lacks 'end' → LFO silently never auto-starts/stops. Untested (lfo.test.ts:838-844 only asserts no-throw). Fix: narrow check to real event contract; warn/throw when target can't emit.
2. MED BLK — lfo.ts:138-144+668-674 depth setter hard-assigns depthGain.gain.value (pop) while rampDepth uses setTargetAtTime. Fix: route setter through smoothing.
3. MED BLK — lfo.ts:20-51,138-144,536-542 depth documented 0-1 but unclamped; ratio depth>1 or negative → param negative at trough (phase inversion). Fix: clamp [0,1] for ratio/cents; clamp absoluteDepth for gain-like params.
4. MED BLK — lfo.ts:188-275 connect() no duplicate-connection guard; connect(target,'gain') twice silently doubles modulation. Fix: disconnect-first or warn.
5. LOW nb — frequency setter hard-assign vs rampFrequency (same asymmetry, less audible).
6. LOW nb — ratio branch silently falls back to absolute when |paramValue|<0.001 — undocumented (lfo.ts:538-539). Doc fix.
Analyzer: clean (fft validation correct, serial pass-through per spec, no internal rAF).
Coverage: 2 scope + 5 supporting + lfo.test.ts.

## R4 voice lifecycle (opus) — 5 findings, 2 blocking
1. CRIT BLK — oscillator.ts:562-580 stop() + retrigger during release tail: stop() sets _isPlaying=false + Envelope._isActive=false immediately though release still ramping; play() before tail end takes setup() "not playing" branch → hard oldNode.stop() + competing setValueAtTime writes at same timestamp = screech class survives for stop→play (2026-07-10 fix only covered play→play). Untested (oscillator.test.ts:119 is play→play only). Fix: _releaseInFlight/_stoppingUntil timestamp; route retriggers before that time through release-gain handoff; keep Envelope._isActive until release completes.
2. HIGH BLK — oscillator.ts:504-527 stopAt(future) sets _isPlaying=false + emits 'stop' NOW, audio continues (BaseSound.stopAt:1041-1091 does it right). stopIn(5) lies for 5s; compounds finding 1. No oscillator stopIn/stopAt tests. Fix: mirror BaseSound future/immediate split.
3. MED nb — sound.ts:108-126 + oscillator.ts:302-363 releaseGain temp node never explicitly disconnected (GC reliance; 1 orphan per retrigger under arpeggio traffic). Fix: timed disconnect w/ currency guard.
4. LOW nb — oscillator.ts:374 cancelScheduledValues(0) vs currentTime elsewhere (3 sites: sound.ts:138, osc:374, osc:516; fix 374 only).
5. LOW nb — base-sound.ts:1229-1242 fadeOut() writes raw gain w/o cancelScheduledValues, layered on envelope/ramp state; stop() after re-triggers redundant release.
Error paths (play-before-load etc) spot-checked clean. Track out of scope here (R12).
Coverage: 7 files + 3 test files.

## R6 beat/beat-track (sonnet) — 5 findings, 3 blocking
1. HIGH BLK — beat-track.ts:113-114,493-513,605-616,533-549 acTimeout schedules (emitBeat, visual-only triggers) never tracked/cancelled; internalStop() only cancels Beat's own timers → stray 'beat' events + currentTimeIsPlaying flips up to ~100ms after stop, every mid-pattern stop. Fix: retain clearTimeout, track ids, clear in internalStop.
2. HIGH BLK — beat-track.ts:166-184 beats getter only grows, never truncates on numBeats reduction; % beats.length in advanceToNextBeat:628 + transport.ts:599 keep old loop length → shrinking numBeats mid-pattern no effect. Fix: getter returns length-numBeats view (keep cache for regrow).
3. MED BLK — beat-track.ts:248-262,281-295 playBeats/playActiveBeats don't cancel in-flight schedule on restart (WorkerTimer.start no-op when running) → ~100ms stale notes flam/doubled hits on restart. Fix: internalStop() at top.
4. LOW nb — numBeats:0 truthy-check silently ignored instead of hitting validation throw (beat-track.ts:115-117).
5. LOW nb — beat.ts:119-133 playIn() duplicates markPlaying logic inline.
wrapWith reactivity: clean. Round-robin: predictable. Swing lives in transport (out of scope here).
Coverage: 2 in-scope full + 4 supporting + tests.

## R5 transport/sequence (sonnet) — 8 findings, 4 blocking (built live repro for #1)
1. CRIT BLK — transport.ts:380-388 + 439-442 stop→restart burst: stop() resets trackStates nextBeatTime to 0 but doesn't delete entries; start() only initializes tracks NOT in trackStates → stale nextBeatTime=0, schedulerTick races 0→currentTime firing every missed step (repro: 2505 calls one tick at 50s). Resume-burst fix covered pause→resume only. Fix: unconditional reset of all trackStates in start() fresh-start branch (or stop() deletes entries). Private state, no propagation.
2. HIGH BLK — sequence.ts:292-301 loop wrap-around branch is EMPTY STUB w/ false comment; events near beat 0 lose lookahead margin at every wrap (scheduled with ~0 lead → clicks/lateness under jank). Fix: implement wrapped time math + test.
3. MED BLK — transport.ts:594-599 loop region length not multiple of track step duration → Math.round pattern-index repeats/skips steps (traced 0,1,2,3,1,2,3,0...). Fix: validate or integer step-index wrap math.
4. MED nb — loop/loopStart/loopEnd setters unvalidated while playing (docs claim validated); silently no-loop when loopEnd<=loopStart. Validate in setters or fix docs.
5. LOW BLK — transport.ts:390 schedulerTick uncaught throw spams every tick forever (interval never cleared). Fix: try/catch → stop() or 'error' event.
6. LOW nb — syncTo() mid-playback ignores loop region; hot-added track starts step 0 out of phase. Document or derive loop-relative stepCount.
7. LOW nb — sequence.ts:269 position.tick can round to ticksPerBeat (out of documented range). % ticksPerBeat.
8. LOW nb — Sequence created while paused gets wrong transportStartTime on resume (starts mid-loop). Fix in _addSequence.
Coverage: 3 files + tests; throwaway repro removed.

## R1 DX/API design (opus) — 7 findings, 0 blocking (all DX)
1. HIGH nb — FOUR gain/pan API shapes: changeGainTo (validated) / update().to().as() (NO validation) / LayeredSound setGain/setPan (bypasses fluent, raw setValueAtTime) / Sampler+BeatTrack raw public mutable gain/pan fields (lazy-applied at next play). Files: base-sound.ts:695, base-param-controller.ts:183, layered-sound.ts:211,223, sampler.ts:51,59. Fix: standardize changeGainTo/changePanTo + update() everywhere; move validation into controller so paths can't diverge.
2. MED nb — convert-value.ts:26-27 'percent' = value/100, can't express pan < 0; docs table claims percent covers pan. Fix: scope percent to gain or pan-specific mapping ((v/100)*2-1).
3. HIGH nb — AudioError hierarchy documented as catch-all but 83 `throw new Error` sites for validation/misuse (base-sound.ts:697,900; transport.ts many; beat-track.ts many; sprite.ts; sequence.ts; layered-sound.ts; sampler.ts:148; oscillator.ts:184). Fix: ValidationError extends AudioError, mechanical sweep.
4. MED nb — SoundControlType hardcoded 'gain'|'pan'|'detune' (base-param-controller.ts:24), NOT derived from augmentable ControlTypeMap; docs "Extending ControlType" (parameter-control.md:155-169) silently doesn't work for Sound/Track update/onPlaySet/onPlayRamp — only Oscillator. Fix: derive from ControlTypeMap.
5. LOW nb — Connectable.update() interface undocumented zero-validation contract (connectable.ts:15-19).
6. LOW nb — GrainPlayer (462)/PolySynth (689) master bus lack onPlaySet/onPlayRamp (only update()); no fade-on-next-play equivalent. Small delta via BaseParamController.
7. LOW nb — preventEventDefaults/useInteractionMethods DOM helpers in root audio namespace (index.ts:1364,1415); use* prefix reads as framework hook. Consider /dom subpath at major.
Coverage: ~22 files + 2 demos.

## R3 architecture (opus) — 5 findings, 1 blocking
1. HIGH BLK — base-sound.ts:1301-1305 dispose() calls restoreBypass per effect + clears array but NEVER effect.dispose() → effects' internal nodes (Biquad/Convolver/Delay/Compressor) + listeners leak on every sound dispose (PolySynth voice churn!). Fix: e.dispose?.() in dispose(); add optional dispose to Effect interface; requires finding 2 fix.
2. MED nb — EffectWrapper + GainEffect implement Effect directly, don't extend BaseEffect, NO dispose() (missing-effect-dispose partial regression; copy-paste template hazard). Fix: extend BaseEffect or add dispose.
3. HIGH nb — src/app 33 files/2610 LOC dead pre-VitePress app inside published package src root; excluded from build+typecheck (bit-rots invisibly) but still linted; 3 devDeps (prismjs etc) + @app tsconfig aliases kept for it; no index.html/dev script. Fix: delete (or move to playground/); drop deps + aliases.
4. MED nb — utils/note-methods.ts:4,205-214 imports SampledNote as VALUE + constructs it (sole utils layering violation; others import type). Fix: move createNoteObjectsForFont to font.ts/index.ts; update index.ts:73; no test changes needed.
5. MED nb — base-sound.ts:261-309 interceptBypass monkey-patches effect.bypass property descriptor via Object.defineProperty (~50 lines reflection bookkeeping; surprising; custom effects handled only via hack). Fix: BaseEffect emits bypasschange event; addEffect subscribes.
Event-system consistency: no regression found. Coverage: 24 files + greps.

## R20 fix verification vs 2026-03-19 review (haiku) — 21 prior crit/high checked
18 RESOLVED, 0 partial, 0 unresolved, 3 OBSOLETE (triplet preset approach abandoned for swing engine). All evidence cited w/ current file:line. Notable: useCleanup() composable in packages/vue/src/use-cleanup.ts now handles demo disposal (C1). Prior review fully discharged.

## R7 poly-synth/sampler (sonnet) — 6 findings, 3 blocking
1. HIGH BLK — poly-synth.ts:572 (retriggerVoice) + 407/413 (steal path): stopAt(now) then play() same tick → Oscillator.setup() "not playing" branch hard-disconnects still-producing node before 10ms anti-click fade renders. Click/screech on every same-freq retrigger + every steal of sounding voice. Root: oscillator.ts:341-362. Fix ONCE in Oscillator.setup() else-branch (release-gain route) — same fix location as R4 finding 1.
2. HIGH BLK — poly-synth.ts:659-676 stopAll() skips 'released' voices (mid-release tails keep ringing up to release seconds after panic). Fix: also hard-stop released voices.
3. MED BLK — poly-synth.ts:672 stopAll() sets state='available' directly while tail in flight (bypasses released→end→available invariant); play() soon after recycles slot → same click path. Fix: proper lifecycle or hard-neutralize first.
4. LOW nb — maxVoices:0 unvalidated, fails late w/ generic error (poly-synth.ts:246,391,430).
5. LOW nb — sampler.ts:35 new Set(sounds) silently dedups; [kick1,kick1,kick2] weighting collapses. Document or array-rotate.
6. LOW nb — sampler.ts:86,119 .catch(()=>{}) swallows playback failures silently, no logging/hook.
Clean: retrigger-held-note, stale handles, per-voice detune, 0/1-sound sampler, round-robin sync. Coverage: 3 files + tests.

## R18 testing (sonnet) — 7 findings, 0 blocking
1. MED nb — examples/audio-sprite + examples/react-integration in docs nav but ZERO e2e coverage (demos.spec.ts:12-33). Add to smoke list.
2. LOW nb — crossfade + layered-sound in loudness list but not smoke list; two silently-diverging demo registries. Derive from shared constant.
3. MED nb — synth-keyboard, xy-pad, soundfont-piano, synth-drum-kit, sampled-drum-kit, drum-machine-vanilla: smoke only, no interaction/loudness tests. Add loudness for the button-triggered kits at least.
4. MED nb — BaseSound.fadeOut() (base-sound.ts:1229-1240) ZERO test coverage (fadeIn covered). Pop/click-class method unguarded. Add tests.
5. LOW nb — utils/noise.ts pink/brown DSP no tests (bounds clamp regression risk). Add noise.test.ts.
6. LOW nb — TypedEventEmitter no direct unit test (indirect coverage solid; low priority).
7. LOW nb — settle() real-timer helper 63 uses vs fake-timers elsewhere; latent flake vector, not observed; no action unless flaky.
Solid: safety/integration/concurrent/transport tests, double-pass lifecycles covered, smooth-param regression suite correct pattern. Coverage: 9 test files deep + greps + 4 e2e specs.

## R11 effects B: base/wrapper/compressor/delay/filter/param-smoothing (sonnet) — 11 findings, 3 blocking
1. HIGH BLK — base-effect.ts:168-177 rampTo('mix') ignores _bypass (applyMix forces dry when bypassed; ramp path doesn't) → bypass=true then rampTo('mix',1) re-fades wet in. Fix: bypass check in mix ramp branch; shared helper; regression test.
2. HIGH BLK — base-effect.ts:154-185 rampTo() bypasses subclass setters → shadow fields (_frequency,_threshold,_time,_feedback,_ratio,_knee,_attack,_release,_q,_gain,_detune) stale after rampTo; read-then-write snaps param back (audible jump). SAME ROOT as R10 finding 2. Fix: rampTo delegates to setter map; test getter==target.
3. HIGH BLK — delay-effect.ts:65-68 constructor feedback clamp Math.min(v,0.99) only — NO lower bound; createDelay({feedback:-5}) → |gain| 5 in feedback loop = runaway amplitude (ear damage). Setter clamps correctly. Fix: route ctor through setter.
4. MED nb — delay _time, compressor threshold/ratio/knee/attack/release, filter everything: ctor skips setter clamps → shadow state diverges from browser-clamped actual. One propagating pattern: ctor should call public setters. (3 files.)
5. MED nb — filter-effect.ts:66-121 zero validation anywhere (siblings clamped in same gate-2 pass; looks reviewed, isn't).
6. MED nb — effect-wrapper.ts no dispose(), no BaseEffect extension (matches R3 finding 2; user-supplied effect class = the one that most needs the contract).
7. MED nb — base-sound.ts:1301-1305 dispose doesn't call effect.dispose() (DUPLICATE of R3 finding 1 which rates it HIGH BLK).
8. MED nb — wireEffectChain() add/remove/reorder mid-playback = instant graph cut, no fade (topology-level pop class). Follow-up: ramp gain around rewire.
9. LOW nb — param-smoothing.ts:20-22 no Number.isFinite guard; NaN throws TypeError from setter w/o context. Defensive.
10. LOW nb — effect-wrapper.ts:85-98 documented minimum "any object with connect()" falls through both wiring branches → input never connected (silent dead-input for processors). Fix wiring fallback or narrow docs.
11. LOW nb — filter type change inherently hard-cut (doc); gain silently ignored on non-shelf types (dev warn).
Verified correct: tau math (10ms=95%), no-cancelScheduledValues layering, delay time setter clamp, compressor/delay/filter dispose, equal-power crossfade sharing.
NOTE: reviewer suggests same ctor-clamp-parity + rampTo-shadow sweep needed for eq/distortion/reverb/gain (R10 partially confirms).
Coverage: 6 scope + 3 adjacent + 5 test files.

## R12 playback: track/layered-sound/crossfade (sonnet) — 8 findings, 4 blocking
1. HIGH BLK — track.ts:104-138,277-290 play() while playing starts second RAF position loop w/o cancelling first → position runs 2x/Nx speed (double-click play). Fix: cancel rafId at _onPlaybackStarted top (pattern exists in layered-sound.ts:375-381).
2. HIGH BLK — crossfade.ts:97-100,119-123 setValueAtTime + setValueCurveAtTime at IDENTICAL startTime — curve wins per spec, snaps gain to fixed 1.0/0.0 endpoint at fade start → pop whenever gain ≠ curve's assumed start; root cause of interrupted-crossfade incoherence. Fix: scale curve dynamically from actual current value, or offset curve by 1/sampleRate.
3. MED BLK — crossfade.ts:100,117,122,139,145 fade-in hardcodes 1.0 target; afterFade restores changeGainTo(1.0) — custom volume (0.6) silently normalized to full, _targetGain corrupted for next play. Tests assert the wrong behavior (crossfade.test.ts:230-243,323-377). Fix: capture volumes, scale endpoints, update tests.
4. HIGH BLK — crossfade.ts:126-150 afterFade cleanup on bare setTimeout, no coordination w/ second crossfade touching same track → stale timeout pauses/stops (position reset!) track being faded in by newer crossfade. Fix: per-Track fade generation token (WeakMap).
5. LOW nb — track.ts:223-238 'resume' emitted before play(), rejection swallowed → resume event w/o resume.
6. LOW nb — position can transiently read >100% in last RAF frame (clamp to durationRaw).
7. LOW nb — LayeredSound no addLayer/removeLayer — constructor-only (missing feature; flag so not mistaken for working).
8. LOW nb — crossfade.ts:128 cancelScheduledValues(0) wipes entire automation history incl. onPlaySet schedules; use currentTime.
Coverage: 5 files + spot-check crossfade.test.ts.

## R17 bindings vue/react (sonnet) — 6 findings, 0 blocking; both bindings REAL not stubs
Overall: 31 vue + 34 react tests passing, StrictMode-safe, SSR-safe by construction, correct shallowRef/useRef identity.
1. HIGH nb — create-factory-composable.ts:44-48 + create-factory-hook.ts:58-65 reset() nulls ref but never stop()/dispose() → orphans live Workers/timers (Transport, GrainPlayer, LFO, PolySynth, Sequence, Sprite); name implies cleanup. Fix both packages same pass: dispose outgoing or document non-destructive.
2. MED nb — neither package re-exports core option types (OscillatorOptions etc.) → dual-import requirement. Fix: re-export from index.ts, both packages.
3. LOW nb — react README 7 lines vs vue full docs; useBeatTrack reactivity caveat only in code comment. Port structure.
4. LOW nb — both READMEs "coming in 0.2.0" stale (already 0.2.0).
5. LOW nb — react use-cleanup register/disposeAll not useCallback-wrapped (identity instability if in deps).
6. LOW nb — useBeatTrack semantics differ vue (wrapWith reactive) vs react (none) — same name, different reactivity; document in README (no code change).
Coverage: 20 files.

## R19 packaging (sonnet) — 6 findings, 0 blocking; baseline SOLID
CI publish.yml gates typecheck/lint/test/E2E + tag-version match + provenance. sideEffects:false everywhere. dist clean (rolled-up d.ts, no src/app leak). workspace: protocol rewrites verified via pnpm pack.
1. MED nb — vue/react package.json missing main/types fallback fields (core has them) → node10/legacy resolution fails entirely. Add both.
2. LOW nb — vue/react missing keywords + bugs fields (npm search invisibility).
3. MED nb — react README stub ("coming in 0.2.0", no usage) despite 16 implemented hooks (dupe of R17 finding 3; also stale line in vue README:7).
4. LOW nb — vue/react no prepublishOnly guard (core has).
5. LOW nb — scoped packages rely on CI --access public flag; add publishConfig.access to package.json.
6. LOW nb — CHANGELOG.md top entry "[1.0.0] - 2026-02-23" contradicts 0.2.0 reality + pre-1.0 stance. Rename [Unreleased].
Coverage: 22 files + built dist + pack tarballs.

## R13 controllers/support (sonnet) — 8 findings, 4 blocking (1 crash repro'd in node)
1. CRIT BLK — musical-identity.ts:134-141 frequency setter exact-float-equality scan vs 2-decimal table; non-tabled/computed frequency silently no-ops (identity stays stale, note.frequency ≠ assigned). Untested beyond exact table values. Fix: store frequency independently or nearest-note within cents tolerance; warn/throw on no match.
2. HIGH BLK — note-methods.ts:56-72 octaveShift crashes TypeError on single-octave note collection (octaves.shift() then octaves[0].map) — on createFont() public path; small/percussion fonts crash load. REPRO'D. Fix: early-return guard + regression test.
3. HIGH BLK — sound-controller.ts:19-22 + oscillator-controller.ts:46-49 updateAudioSource never carries detune to new source node (gain/pan copied; Oscillator.freq persisted w/ comment for this exact bug class) → update('detune') silently reverts to 0 on next play. No test covers update-detune-across-replay. Fix both in one pass (shadow value pattern).
4. HIGH BLK — base-param-controller.ts:223-227 onPlaySet .at() pushes raw 0 into valuesAtTime; documented fade-in idiom (to(0).at(0) + endingAt default-exponential) reproduces hold-at-0-then-jump pop that SAFE_NEAR_ZERO (262-264, onPlayRamp only) exists to prevent. Fix: clamp zeros where exponential ramp pending.
5. MED nb — applyRampToParam (386) only guards value===0, not sign-crossing exponential pan ramps (-1→1, default exp) — undefined per spec, mock can't verify. Fix: same-sign check → linear fallback; verify real browser first.
6. MED nb — onPlaySet .to() dedups by type but .at()/.endingAt() accumulate (internal comment only, no public doc) → re-scheduling before play applies stale+new events. Document or dedup.
7. LOW nb — docs use "C#5" in font.ts:8,41,60 + musical-identity.ts:144,174 but frequencyMap sharps ALL commented out → InvalidNoteError/type error. Fix: uncomment sharp aliases (enharmonic equivalence) or fix docs — one pass.
8. LOW nb — MusicallyAware ctor identifier+frequency conflict: console.warn + silent last-wins precedence undocumented.
Coverage: 11 files + spot-checks.

## R14 events/infra (sonnet) — 10 findings, 0 blocking
1. MED nb — typed-event-emitter.ts:26 no _clearListeners/removeAllListeners; dispose() only neuters dispatchEvent, listener closures retained until GC (JSDoc admits manual off() burden). Fix: AbortController-based clear (BeatTrack's composition emitter shows working alternative).
2. LOW nb — on() accepts K[], once()/off() don't (batch asymmetry, partial unsubscribe hazard).
3. MED nb — audio-context.ts:90-108 unlockAudioContext ZERO test coverage (load-bearing iOS unlock path).
4. LOW nb — unlockAudioContext registers 4 fresh body listeners per pre-gesture factory call (4×N churn, self-cleaning). Module-scope shared unlock.
5. LOW nb — 'interrupted' AudioContextError message doesn't name recovery API (index.ts:122-127).
6. LOW nb — AudioEventSource docstring claims all emitting classes; BaseEffect excluded (deliberate, undocumented).
7. MED nb — preload.ts:60-68 no intra-call URL dedup → duplicate parallel fetches. [...new Set()].
8. LOW nb — preload aggregate failure re-throws plain Error, discards structured AudioLoadError[] (DX).
9. LOW nb — preload no AbortSignal support (missing feature).
10. LOW nb — debug calls unconditional in hot paths — not tree-shakeable (bundle-size only; no action unless goal).
Verified correct: multi-context skip of initAudio documented; all error classes thrown as documented; all event-map events actually emitted; inconsistent-event-systems still resolved; preload cache FIFO consistent.
Coverage: 14 files + cross-refs.

## R16 demos patterns (sonnet) — 8 findings, 0 blocking; both open patterns SUBSTANTIALLY ADDRESSED
Informational: @ez-web-audio/vue useCleanup() + factory composables adopted by 21/27 demos — patterns demo-resource-cleanup-inconsistency + demo-audio-init-duplication mostly closed; remaining = specific deviating call sites.
1. HIGH nb — DrumMachineVanilla.vue:227-239 onUnmounted stop() not dispose() per beatTrack (WorkerTimer + Sound nodes stay connected).
2. HIGH nb — SynthKeyboard.vue:104-133 per-note oscillators stop() never dispose() (composables.ts:39-43 documents exactly this case + prescribes useCleanup.register); every note leaks node pair.
3. HIGH nb — SynthDrumKit.vue:235-244 same per-hit voice pattern.
4. MED nb — 5 sites (DistortionDemo:40, XYPad:216, VisualizationDemo:119, OscillatorDemo:67, LFODemo:203 osc-only) stop+reset w/o dispose; useCleanup has NO unregister →每 stop/play cycle accumulates orphaned nodes until unmount. Propagating same 3-line fix ×5.
5. MED nb — SoundfontPiano.vue:62-81 + LIBRARY GAP: Font has no dispose() (holds dozens of SampledNotes, 1.4MB font). Library fix: Font.dispose() iterating notes (mirror BeatTrack.dispose). Demo interim: forEach dispose.
6. LOW nb — PlayTogetherDemo/LayeredSoundDemo/SampledDrumKit UI-reset setTimeouts uncleared (cosmetic only).
7. MED nb — ensureLoaded hand-rolled in 6 multi-resource demos in 2 INCOMPATIBLE variants (A: loaded/loading refs+try/catch returns bool ×4; B: if-instance-return void ×2). Fix: shared useEnsureLoaded(fn) in @ez-web-audio/vue, standardize variant A.
8. Clean: library fidelity (zero raw Web Audio), load-button rule, layout shift, RAF/interval/listener pairing, MutationObserver disconnects, no module singletons.
Coverage: 27 files.

## R15 utils (sonnet) — 8 findings, 0 blocking
1. MED nb — timeout.ts:36-51,133-135 shared RAF scheduler tick() forEach iterates stale array after clearTimeout reassigns tasks → cancelled task still fires same tick (verified via repro of algorithm). Cross-sound hazard (shared per-context scheduler). Fix: pre-filter due tasks or cancelled flag.
2. LOW nb — musical-time.ts NaN bpm passes guard (NaN<=0 false); timeSignature[1]/ticksPerBeat zero → Infinity/NaN silently. Extend guards Number.isFinite.
3. LOW nb — zeroify(-5) → "0-5" (latent; track.ts clamps today). Guard negative.
4. LOW nb — exponential-ratio.ts DEAD (zero call sites outside own test). Wire or delete.
5. LOW nb — prop-access.ts set() dead (only get used). Drop or export deliberately.
6. LOW nb — decode-base64 5 throw branches untested (recently hardened defensive code).
7. LOW nb — base64ToUint8 split('').map allocation on multi-MB fonts; use indexed loop.
8. LOW nb — arraySwap endOfArr/beginOfArr names INVERTED + dead console.logs (array-methods.ts:16-23).
Clean: param-smoothing (single impl), collections, equal-power-crossfade, play-together, noise, worker-timer, frequency-map values, convert-value, within-range. unmute.js vendored — not reviewed.
Coverage: 17 impl + 6 test files.
