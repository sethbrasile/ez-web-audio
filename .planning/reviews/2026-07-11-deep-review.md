---
status: final
verdict: NOT READY
blocking: 33
checkpoint: delegated to qc (autonomy signal)
---

# Deep Review — EZ Web Audio
## 2026-07-11 | Mode: full-codebase health check (pre-1.0 API audit) | Scope: entire monorepo

> **How to use this report:** Start with the Proposed Action Plan — each
> grouping is self-contained. Read Critical Findings for evidence and context.
> The full findings sections provide detail on demand. Structural Patterns
> identify root causes spanning multiple findings.

### Meta
- Lenses activated: DX/API design, use-case coverage (both user-requested), architecture, voice-lifecycle, transport/sequence, rhythm, polyphony, modulation/analysis, granular/sprites, effects (×2), playback/crossfade, controllers/support, infra, utils, demos-patterns, bindings, testing, packaging, fix-verification
- Skipped lenses: security (no auth/secrets/network surface), SEO/a11y (gate-2 UI rounds just completed), data/ML (n/a)
- Reviewers: 20 subagents (4 opus holistic, 15 sonnet ~1000-LOC partitions, 1 haiku fix-verification). All returned conforming findings — no reviewer gaps.
- Files examined: ~200 across core src (18.5K LOC), tests (21.6K), demos (13.4K), bindings (1.7K), e2e, packaging
- Spot-checks: all Critical and high-blocking claims verified by orchestrator tool calls (code inspection); R5 critical verified by reviewer-built runtime repro (2505 burst calls); R13 crash verified by reviewer node repro
- Checkpoint: delegated to qc (autonomy signal)
- **Verdict: NOT READY — 33 blocking findings** (2 critical, 19 high, 11 medium, 1 low)
- Blocking findings: 33 / Total findings: ~120 (87 non-blocking documented for reference)
- Fix verification vs 2026-03-19 review: all 21 prior Critical/High findings RESOLVED (18) or OBSOLETE (3). Zero unresolved. Prior review fully discharged.
- Orchestrator reclassification: R13's frequency-setter finding downgraded critical→high (silent wrong behavior, no crash/corruption).

### Critical Findings

#### C1 — Oscillator hard-cut on retrigger after stop(): screech class survives in stop→play path
- severity: critical | blocking: yes
- Evidence: `packages/core/src/oscillator.ts:340-363` (setup() "not playing" branch does immediate `oldNode.stop()` + `disconnect()`), `oscillator.ts:562-580` (stop() sets `_isPlaying=false` + `Envelope._isActive=false` while release tail still ramping), `packages/core/src/poly-synth.ts:572` (retriggerVoice) and `:407,413` (steal path) both do `stopAt(now)` then `play()` in the same synchronous tick — both funnel into the same setup() branch. Confirmed by orchestrator: the else-branch comment documents the hard-cut as deliberate, but instant disconnect mid-waveform clicks, and Envelope's own mid-release smoothing (`estimateCurrentValue`/`cancelAndHoldAtTime`) is bypassed because `_isActive` was cleared early — two competing `setValueAtTime` writes land at the identical timestamp.
- Impact: audible click/screech on (a) any stop()-then-retrigger during the release tail, (b) every PolySynth same-frequency retrigger, (c) every voice steal of an actively-sounding voice — the two most common polyphony operations. The 2026-07-10 hardening fixed only the play→play path. Untested: `oscillator.test.ts:119` covers play→play only.
- Recommendation: fix ONCE in `Oscillator.setup()`'s else-branch — route the old still-audible node through the same release-gain handoff used by the `_isPlaying===true` branch whenever a prior stop's fade hasn't landed (track a `_releaseInFlight`/`_stoppingUntil` timestamp set by stop()/stopAt()); don't clear `Envelope._isActive` until the release ramp completes so `applyTo()` can pick up mid-release. Add stop→play-during-release and PolySynth retrigger/steal click tests.

#### C2 — Transport stop→restart fires a burst of every missed step
- severity: critical | blocking: yes
- Evidence: `packages/core/src/transport.ts:380-388` — fresh `start()` only initializes `nextBeatTime` for tracks NOT already in `trackStates`; `stop()` (`:439-442`) resets entries' `nextBeatTime` to `0` but never deletes them. Confirmed by orchestrator code inspection AND reviewer runtime repro: after stop()+start() at currentTime=50s, `schedulerTick()`'s while-loop races from 0 to currentTime — 2505 `_scheduleBeatFromTransport` calls in a single tick (~5 expected).
- Impact: every stop-then-restart of a transport with previously-synced tracks produces a machine-gun burst of missed steps. The 2026-07-11 resume-burst fix covered pause→resume only.
- Recommendation: in start()'s fresh-start branch, unconditionally reset every existing trackStates entry's `nextBeatTime` to `audioContext.currentTime` and `stepCount` to 0 (or have stop() delete entries so `!has()` recreates them). State is private to Transport — no propagation. Add stop→restart test.

### High Findings (blocking)

- **H1** `oscillator.ts:504-527` — `stopAt(future)` sets `_isPlaying=false` and emits `'stop'` immediately while audio continues (BaseSound.stopAt `base-sound.ts:1041-1091` handles the future/immediate split correctly). `stopIn(5)` lies for 5s and compounds C1. No Oscillator stopIn/stopAt tests. Fix: mirror BaseSound's split.
- **H2** `sequence.ts:292-301` — loop wrap-around branch is an EMPTY STUB with a false comment; events near beat 0 of a looping Sequence lose their lookahead margin at every wrap (~0 lead time → clicks/lateness under jank). Fix: implement wrapped time math + test. (Verified: branch body is comment-only.)
- **H3** `beat-track.ts:113-114,493-513,605-616,533-549` — BeatTrack-level `acTimeout` schedules (emitBeat, visual-only triggers) are never tracked; `internalStop()` only cancels Beat-level timers → stray `'beat'` events and `currentTimeIsPlaying` flips up to ~100ms after every mid-pattern stop. Fix: retain clearTimeout, track ids, clear in internalStop.
- **H4** `beat-track.ts:166-184` — `beats` getter only grows, never truncates when `numBeats` shrinks (verified); `% beats.length` in advanceToNextBeat:628 and transport.ts:599 keep the old loop length → shrinking numBeats mid-pattern has no effect. Fix: return length-numBeats view, keep cache for regrow.
- **H5** `poly-synth.ts:659-676` — `stopAll()` skips `'released'` voices (tails ring up to `release` seconds after panic) and sets stopped voices straight to `'available'` while audio in flight (verified), so a play() soon after recycles the slot into C1's click path. Fix: hard-stop released voices too; drive through released→end→available.
- **H6** `lfo.ts:472-474,234-268` — `_isBaseSound` duck-types (`getGainNode`+`getPannerNode`, verified) so PolySynth/GrainPlayer pass; `syncLifecycle`/`retrigger` register `play`/`stop`/`end` listeners PolySynth never emits (its event map is `voicestolen`/`dispose` only) and GrainPlayer lacks `end` — LFO silently never auto-starts/stops. Tests only assert no-throw. Fix: gate on real event contract; warn/throw otherwise.
- **H7** `grain-player.ts:225` — `compensatedDuration = grainSize / playbackRate` is INVERTED (verified; `start()` duration is buffer-time, audible = duration/rate) — at +12 semitones grains audibly last grainSize/4, tails go silent, texture thins. Companion: offset clamp at `:221` must use the corrected duration. Fix: multiply; re-derive clamp; unit test on start() args.
- **H8** `sprite.ts:309` — `AudioSprite.play()` hardcodes `connect(audioContext.destination)` (verified), bypassing `getMasterDestination()` that every other sound class routes through — sprites escape any global limiter/mute/analyzer. Fix: match the base-sound pattern.
- **H9** `reverb-effect.ts:278-320` — `dispose()` disconnects combs/allpasses/preDelay/convolver but never `combMerge` (verified: zero combMerge.disconnect). missing-effect-dispose regression; no dispose tests for reverb. Fix: disconnect + test.
- **H10** `base-effect.ts:154-185` — generic `rampTo()` sets the AudioParam but never updates the subclass shadow field (verified: only the mix branch updates `_mix`) → getters stale FOREVER after rampTo across reverb preDelay, all 7 EQ band params, distortion tone, filter/compressor/delay params; read-then-write snaps the param back audibly. All existing rampTo tests only assert not.toThrow. Fix: rampTo delegates to a param→setter map (or protected onParamRamped hook); test getter==target.
- **H11** `base-effect.ts:168-177` — `rampTo('mix')` ignores `_bypass` (verified: no bypass check in ramp branch; `applyMix()` forces dry when bypassed) → bypass=true then rampTo('mix',1) re-fades wet in. Fix: bypass check; unify instant+ramped mix paths.
- **H12** `delay-effect.ts:65-68` — constructor clamps feedback with `Math.min(v, 0.99)` only (verified: no lower bound; setter clamps both) → `createDelay({feedback:-5})` = |gain| 5 in the feedback loop = exponential runaway (ear-damage class). Fix: route ctor through setter.
- **H13** `track.ts:104-138,277-290` — `play()` while already playing starts a second RAF position loop without cancelling the first (guards exist in pause/stop/seek only) → position runs at 2×/N× speed on double-click play. Fix: cancel rafId at loop start.
- **H14** `utils/crossfade.ts:97-100,119-123` — `setValueAtTime(current)` + `setValueCurveAtTime(fixedCurve)` at the IDENTICAL startTime (verified); the curve's fixed 1.0/0.0 endpoint wins per spec, snapping gain whenever it isn't already at the assumed value → pop at fade start; root cause of interrupted-crossfade incoherence. Fix: scale curve from actual current value or offset by 1/sampleRate.
- **H15** `utils/crossfade.ts:126-150` — `afterFade` cleanup on a bare setTimeout with no generation token; a second crossfade touching the same track gets hard-cut (pause/stop + position reset) by the first's stale timeout. Fix: per-Track fade-generation token (WeakMap).
- **H16** `musical-identity.ts:134-141` — `frequency` setter scans for exact float equality against a 2-decimal table (verified); any computed/non-tabled frequency silently no-ops — identity stays stale, `note.frequency = x; note.frequency !== x`, no error. (Orchestrator downgraded from critical: silent wrong behavior, narrow path, no crash.) Fix: nearest-note within cents tolerance or store independently; warn/throw on no match.
- **H17** `utils/note-methods.ts:56-72` — `octaveShift` crashes `TypeError` on single-octave note collections (verified: `octaves.shift()` then `octaves[0].map`); on the public `createFont()` path — small/percussion soundfonts crash font loading. Reviewer repro'd in node. Fix: early-return guard + regression test.
- **H18** `controllers/sound-controller.ts:19-22` + `oscillator-controller.ts:46-49` — `updateAudioSource()` swaps in the new single-use node without carrying `detune` over (verified: ref swap only; gain/pan ARE copied; Oscillator.freq was fixed for this exact class) → `update('detune')` silently reverts to 0 on next play. No test covers update-detune-across-replay. Fix: shadow-value pattern in both controllers, one pass.
- **H19** `base-param-controller.ts:223-227` — `onPlaySet().to(0).at(0)` pushes raw 0 with no SAFE_NEAR_ZERO clamp (clamp exists only in onPlayRamp's .from()), and `endingAt` defaults to exponential — the JSDoc's own documented fade-in idiom reproduces the hold-at-0-then-jump pop. Fix: clamp zeros wherever an exponential ramp is pending.
- **H20** `base-sound.ts:1301-1305` — `dispose()` calls `restoreBypass(e)` and clears `effects[]` but never `effect.dispose()` → every effect's internal node graph + listeners leak per sound disposal (PolySynth voice churn multiplies this). Flagged independently by two reviewers. Fix: `e.dispose?.()` in dispose; add `dispose?()` to the Effect interface (see SP4).

### Medium Findings (blocking)

- **M1** `transport.ts:594-599` — loop region length not an integer multiple of a synced track's step duration → `Math.round` pattern-index wrap repeats/skips steps (traced: 0,1,2,3,1,2,3,0…). Fix: validate or integer step-index wrap math.
- **M2** `beat-track.ts:248-262,281-295` — `playBeats()`/`playActiveBeats()` on an already-playing track don't cancel the in-flight schedule (WorkerTimer.start no-ops) → ~100ms flam/doubled hits on restart. Fix: internalStop() first.
- **M3** `lfo.ts:138-144,668-674` — `depth` setter hard-assigns `depthGain.gain.value` (pop) while `rampDepth()` smooths; the exact setter class fixed everywhere else in xn3. Fix: route through smoothing.
- **M4** `lfo.ts:536-542` — depth documented 0–1 but unclamped; ratio depth >1 or negative drives modulated param negative at trough (phase inversion) — the ratio-depth overshoot class already fixed once by hand-tuning. Fix: clamp per unit.
- **M5** `lfo.ts:188-275` — `connect()` has no duplicate-connection guard; connecting the same target+param twice silently doubles modulation. Fix: disconnect-first or warn.
- **M6** `grain-player.ts:579-589` — `dispose()` only disposes the WorkerTimer when `_playing`; play→stop→dispose leaks a live Worker + Blob URL per player. Fix: unconditional timer.dispose().
- **M7** `grain-player.ts:203-212` — grain envelopes peak at 1 with no overlap normalization; legitimately-settable high overlap sums ~100 full-amplitude grains → clipping. Fix: scale peak by hopSize/grainSize or clamp overlap.
- **M8** `distortion-effect.ts:155-179` — amount/type setters swap `waveShaperNode.curve` instantly (not an AudioParam; can't setTargetAtTime) → click; the defect class the smoothing pass closed elsewhere. Fix: dual-shaper crossfade or document residual gap.
- **M9** `eq-effect.ts:169-177` — `midQ` setter has no clamp/finite check; NaN poisons biquad IIR state permanently. Fix: clamp positive + reject non-finite.
- **M10** `reverb-effect.ts:224-235` — `decay` setter unclamped (negative → negative delayTime; NaN propagates). Fix: clamp.
- **M11** `utils/crossfade.ts:100,117,122,139,145` — fade-in hardcodes 1.0 and afterFade restores `changeGainTo(1.0)` — custom volumes silently normalized, `_targetGain` corrupted for the next play. Existing tests assert the wrong behavior. Fix: capture/restore actual volumes + update tests.
- **L-blk** `transport.ts:390` — `schedulerTick` has no try/catch; one throwing callback spams uncaught errors every tick forever. Fix: try/catch → stop() or 'error' event.

### Tension Resolutions
No genuine inter-reviewer tensions surfaced — reviewers converged (two pairs independently flagged the same root causes: C1 by R4+R7; H20 by R3+R11). No debates run.

### Structural Patterns

#### Pattern: Stale scheduled work survives state transitions (stale-scheduled-work)
**Symptoms:** C2, H3, M2, H13, H15, H1 (+utils finding: shared RAF scheduler fires cancelled tasks, `utils/timeout.ts:36-51`)
**Recurrence:** New as a named pattern; sibling of the resolved single-use-source-node work.
**Root cause:** The 2026-07 hardening gave source NODES currency guards, but timers, RAF loops, lookahead schedules, and automation events have no equivalent discipline — each class hand-rolls (or forgets) cancellation, so stop/restart/re-play transitions leave stale work firing afterward.
**Instance-level fix:** per-finding cancellation (listed above).
**Structural fix:** a small shared "scheduled-work registry" convention: every class that schedules (timeout/RAF/worker-tick/automation) tracks ids + a generation token, and stop()/dispose() cancels the registry; async completions check token currency before acting (exactly the onended currency-guard pattern, generalized).
**Research:** matches Tone.js's Transport event-id model (every schedule returns an id owned by the transport, cleared on stop) — established precedent in the same domain.
**Recommendation:** Fix instances now (they're in separate fix units by module); adopt the registry convention in the same pass wherever a unit touches scheduling code. If this pattern reappears next round, escalate to a dedicated design unit.

#### Pattern: rampTo/setter dual-path desync (ramp-setter-desync)
**Symptoms:** H10, H11, M3, plus LFO frequency-setter asymmetry (low)
**Root cause:** `BaseEffect.rampTo()` (and LFO's ramp methods) write AudioParams directly, bypassing the property setters that own shadow state, validation, and bypass semantics — two write paths, one contract.
**Instance-level fix:** patch each desync.
**Structural fix:** ONE write path: rampTo delegates to the property setter mechanism (param→setter map or `onParamRamped` hook); setters own validation + shadow state + smoothing for both instant and ramped writes.
**Recommendation:** USE THE STRUCTURAL FIX. Do not patch shadow fields one param at a time — every future effect param would re-create the bug. One base-class change + per-subclass map covers the whole family.

#### Pattern: Constructor-vs-setter validation parity (ctor-setter-parity)
**Symptoms:** H12 (delay feedback), M9/M10 (unclamped setters), compressor/filter/delay ctor gaps, LFO depth (M4), PolySynth maxVoices, BeatTrack numBeats:0 truthy-check
**Root cause:** constructors assign private fields directly, skipping the clamps/validation the public setters enforce — every hardened setter has an unhardened ctor twin.
**Structural fix:** constructors initialize via their own public setters (`this.feedback = options.feedback ?? 0.4`), making divergence impossible.
**Recommendation:** USE THE STRUCTURAL FIX — mechanical, one sweep across the effect family + LFO + PolySynth + BeatTrack.

#### Pattern: Incomplete disposal cascade (incomplete-disposal-cascade)
**Symptooms:** H20, H9, M6, EffectWrapper/GainEffect no dispose, Font has no dispose() at all (library gap flagged from demo side), bindings reset() orphans live instances, TypedEventEmitter has no listener-clear
**Root cause:** no enforced ownership contract — "if you create it, your dispose() releases it" holds for some classes and silently not for others; the Effect interface doesn't even declare dispose.
**Structural fix:** add `dispose(): void` to the Effect interface (and implement in EffectWrapper/GainEffect), `Font.dispose()`, cascade in `BaseSound.dispose()`, dispose-outgoing in bindings `reset()`, `_clearListeners()` on TypedEventEmitter.
**Recommendation:** USE THE STRUCTURAL FIX — one unit, contract-first, then the instances are forced by the compiler.

#### Pattern updates (prior open patterns)
- **demo-resource-cleanup-inconsistency** and **demo-audio-init-duplication**: substantially addressed since filed — `@ez-web-audio/vue` `useCleanup()` + factory composables adopted by 21/27 demos. Remaining: specific deviating call sites (per-note/per-hit oscillators never disposed, 5 stop-handlers missing dispose, two incompatible hand-rolled ensureLoaded variants across 6 multi-resource demos). Status → fix-in-progress; resolve after the demo sweep unit.

### Notable Non-Blocking Findings (summary — full list in reviewer archive)

**DX/API (user-requested lens; pre-1.0 breaking changes sanctioned):**
- Four incompatible gain/pan spellings across sibling classes; `update()` path skips the validation `changeGainTo()` enforces (R1#1, high).
- 83 `throw new Error` sites vs the documented `AudioError` hierarchy — the library's own catch example misses most misuse errors (R1#3, high). Fix: `ValidationError extends AudioError`, mechanical sweep.
- `SoundControlType` hardcoded — the documented ControlTypeMap module-augmentation feature silently doesn't work for Sound/Track (R1#4, med).
- `'percent'` unit mathematically can't express pan < 0 though docs claim it (R1#2, med).
- GrainPlayer/PolySynth master buses lack onPlaySet/onPlayRamp (R1#6, low). DOM helpers pollute the root audio namespace (R1#7, low).
- Sharp note spellings ("C#5") used in docs but all sharps commented out of frequencyMap → InvalidNoteError (R13#7, low).

**Use-case near-misses (user-requested lens; features, not defects):**
- `playbackRate` on Sound/Track — the one control every podcast player needs; plumbing exists (sibling param on same node) (high-value, small).
- Transport/BeatTrack/Sequence are wall-clock-bound — OfflineAudioContext rendering silently produces nothing though factories accept BaseAudioContext (high-value; short-term docs caveat, long-term render mode).
- Voice-pool/steal exists in PolySynth but not Sampler (SFX pools); no ducking helper; no Playlist abstraction; no mic/MediaStream input; no setGlobalVolume/muteAll sugar; stereo-only panning.

**Architecture:** `src/app` — 2,610 LOC dead pre-VitePress app inside the published package's src root, excluded from build+typecheck (bit-rots invisibly), keeps 3 devDeps alive. Delete. (R3#3, high nb.) `interceptBypass` monkey-patches effect property descriptors (~50 lines reflection) — replace with a bypasschange event (R3#5, med). utils→SampledNote value-import layering violation (R3#4, med).

**Demos:** per-note/per-hit oscillators stop()ped never dispose()d (SynthKeyboard, SynthDrumKit, DrumMachineVanilla, +5 stop-handler sites — useCleanup has no unregister so replaced instances accumulate until unmount); Font.dispose() library gap; 6 demos hand-roll ensureLoaded in 2 incompatible variants → shared `useEnsureLoaded()`.

**Bindings (real, not stubs — 31+34 tests green, StrictMode-safe, SSR-safe):** `reset()` orphans live Workers/timers without disposing (high nb); core option types not re-exported; React README is a 7-line stub for 16 implemented hooks.

**Packaging (solid baseline; provenance + tag-gating CI verified):** vue/react missing main/types fallback fields; missing keywords/bugs/publishConfig/prepublishOnly; CHANGELOG claims 1.0.0.

**Testing:** BaseSound.fadeOut() zero coverage; unlockAudioContext (iOS unlock path) zero coverage; noise.ts DSP untested; audio-sprite + react-integration pages have no E2E; two diverging e2e demo registries.

**Utils/infra:** shared RAF scheduler fires cancelled tasks (repro'd — folded into stale-scheduled-work pattern); musical-time NaN/zero guards; preload intra-call dedup, structured aggregate errors, AbortSignal; dead exports (exponentialRatio, prop-access set).

### Proposed Action Plan

Blocking work first (G1–G9), then sanctioned DX work (G10), hygiene sweeps (G11–G13). Use-case features route to roadmap, not fix units.

#### Grouping G1: Oscillator release-handoff + stopAt (voice lifecycle)
- Goal: eliminate the surviving screech/click class on stop→retrigger and PolySynth retrigger/steal; honest stopAt semantics.
- Findings: C1 (critical), H1 (high), R4 lows (releaseGain explicit disconnect, cancelScheduledValues(0) inconsistency, fadeOut composition).
- Fix approach: Instance fixes centered on one location — Oscillator.setup() else-branch release-gain routing + `_releaseInFlight` tracking + Envelope._isActive lifetime; stopAt future/immediate split mirroring BaseSound. New tests: stop→play-during-release, PolySynth retrigger/steal click paths, oscillator stopIn/stopAt.
- Scope: packages/core/src/oscillator.ts, envelope.ts, sound.ts (release-gain disconnect), poly-synth.ts (verify call sites), tests.
- Effort: large. Dependencies: none. NOTE: G4's PolySynth fixes assume this lands first.

#### Grouping G2: Transport + Sequence scheduling correctness
- Goal: stop→restart burst gone; loop wrap scheduled with full lookahead; scheduler failure-safe.
- Findings: C2 (critical), H2 (high), M1, L-blk try/catch, R5 non-blk (setter validation-vs-docs, hot-add phase, tick rounding, paused-add).
- Fix approach: instance fixes + adopt scheduled-work registry convention for transport state. Tests: stop→restart, wrap-margin, non-multiple loop region, throwing callback.
- Scope: transport.ts, sequence.ts, tests. Effort: large. Dependencies: none.

#### Grouping G3: BeatTrack timers + pattern length
- Goal: no post-stop events; numBeats shrink works; restart clean.
- Findings: H3, H4, M2, R6 lows (numBeats:0 truthy check, playIn duplication).
- Fix approach: instance fixes + tracked acTimeout ids per stale-scheduled-work convention.
- Scope: beat-track.ts, beat.ts, tests. Effort: medium. Dependencies: none.

#### Grouping G4: PolySynth stopAll + LFO lifecycle/depth
- Goal: panic actually panics; LFO lifecycle sync works on all documented targets; depth changes pop-free and bounded.
- Findings: H5, H6, M3, M4, M5, R7 lows (maxVoices validation, Sampler Set dedup doc, swallowed rejections), R8 lows.
- Fix approach: instance fixes. Scope: poly-synth.ts, lfo.ts, sampler.ts, event-types.ts, tests. Effort: large. Dependencies: G1 (shares Oscillator.setup semantics).

#### Grouping G5: GrainPlayer + Sprite correctness
- Goal: pitch compensation right; sprites obey master routing; no Worker leaks; overlap safe.
- Findings: H7, H8, M6, M7, R9 non-blk (offset clamp companion, Hann naming, play-while-paused event, ctor bounds validation, zero-length loop).
- Fix approach: instance fixes. Scope: grain-player.ts, sprite.ts, tests (incl. start()-args unit test at non-zero pitch). Effort: medium. Dependencies: none.

#### Grouping G6: Effects family — structural (ramp-setter-desync + ctor-setter-parity)
- Goal: one write path per param; ctor can't diverge from setter; dispose complete; no residual pop paths.
- Findings: H9, H10, H11, H12, M8, M9, M10, R10/R11 lows (preDelay floor, inline time constants, rampTo silent no-op warn, param-smoothing NaN guard, EffectWrapper minimal-interface wiring), + sweep eq/distortion/reverb/gain for the same two patterns per R11's propagation note.
- Fix approach: STRUCTURAL — rampTo delegates to setter map (base-effect change), ctors initialize via public setters (family-wide sweep). Do not patch shadow fields individually. Tests: getter==target after rampTo, bypassed-mix ramp no-op, ctor clamp parity, dispose completeness incl. combMerge.
- Scope: effects/*.ts, utils/param-smoothing.ts, tests. Effort: large. Dependencies: none.

#### Grouping G7: Track + crossfade
- Goal: position tracking correct under double-play; crossfades pop-free, volume-preserving, interrupt-safe.
- Findings: H13, H14, H15, M11, R12 lows (resume event order, position clamp, cancelScheduledValues(0)).
- Fix approach: instance fixes + fade-generation token per stale-scheduled-work convention. Update the crossfade tests that assert hardcoded-1.0.
- Scope: track.ts, utils/crossfade.ts, tests. Effort: medium. Dependencies: none.

#### Grouping G8: Musical identity + param controllers
- Goal: frequency assignment honest; small fonts load; detune persists; documented fade idiom pop-free.
- Findings: H16, H17, H18, H19, R13 non-blk (sign-crossing exponential pan ramp, onPlaySet accumulate-vs-replace doc, sharp aliases in frequencyMap, ctor precedence doc).
- Fix approach: instance fixes; uncomment sharp aliases (enharmonic equivalence) and fix doc examples in one propagation pass.
- Scope: musical-identity.ts, utils/note-methods.ts, utils/frequency-map.ts, controllers/*.ts, font.ts docs, tests. Effort: medium. Dependencies: none.

#### Grouping G9: Disposal cascade — structural (incomplete-disposal-cascade)
- Goal: "you create it, you dispose it" enforced by the type system.
- Findings: H20, R3#2 (EffectWrapper/GainEffect), Font.dispose gap, R17#1 (bindings reset), R14#1 (emitter listener clear), R14 preload/infra smalls (intra-call dedup, aggregate error, unlock listener churn).
- Fix approach: STRUCTURAL — dispose on Effect interface + implementations, Font.dispose(), BaseSound.dispose cascade, bindings reset() disposes outgoing, TypedEventEmitter._clearListeners. Tests per addition.
- Scope: effects/index.ts + effect-wrapper.ts + gain-effect.ts, base-sound.ts, font.ts, packages/vue+react factory files, events/typed-event-emitter.ts, preload.ts, audio-context.ts, tests. Effort: large. Dependencies: coordinate with G6 (same files, effects/).

#### Grouping G10: DX/API unification (pre-1.0 breaking-changes pass — user-sanctioned)
- Goal: one spelling per concept; documented error taxonomy true; documented extension points work.
- Findings: R1#1 (gain/pan unification + validation into controller), R1#3 (ValidationError sweep, 83 sites), R1#4 (SoundControlType from ControlTypeMap), R1#2 (percent-pan), R1#5/#6 (Connectable doc, bus onPlay*), R1#7 (dom namespace — defer or do), R2#7 (setGlobalVolume/muteAll sugar — smallest use-case win, fits here).
- Fix approach: instance fixes, breaking where needed (pre-1.0). Keep deprecated aliases where cheap. Update docs in same pass.
- Scope: base-sound.ts, controllers/, layered-sound.ts, sampler.ts, beat-track.ts, errors/, index.ts, docs/guide/. Effort: large. Dependencies: after G1–G9 (touches same files; avoid conflicts).

#### Grouping G11: Demos cleanup sweep
- Goal: remaining deviating call sites onto the established useCleanup/dispose convention; shared init helper; close both open demo patterns.
- Findings: R16 1–7 incl. Font.dispose demo-side adoption (after G9), useEnsureLoaded extraction.
- Scope: docs/.vitepress/theme/components/, packages/vue/src/. Effort: medium. Dependencies: G9 (Font.dispose).

#### Grouping G12: Packaging + bindings hygiene
- Goal: bindings resolve everywhere, npm listings complete, READMEs honest.
- Findings: R19 all, R17 2–5 (type re-exports, README port, useCallback wraps, stale placeholders), CHANGELOG heading.
- Scope: packages/vue+react package.json/README/src, CHANGELOG.md. Effort: small.

#### Grouping G13: Tests + utils hardening
- Goal: cover the load-bearing untested paths; fix latent utils bugs; delete dead code.
- Findings: R18 1–5 (fadeOut tests, e2e registry unification + missing pages, noise tests), R14#3 (unlock tests), R15 all (scheduler stale-array fix, musical-time guards, zeroify, dead exports, decode-base64 error tests, base64 perf, arraySwap naming), R3#4 (note-methods layering move).
- Scope: e2e/, packages/core/src/utils/, tests. Effort: medium. Dependencies: none.

#### Roadmap (NOT fix work — user decision menu)
Use-case features from R2, ordered by value/effort: playbackRate on Sound/Track (small, high value); OfflineAudioContext — document the caveat now (docs-only, small), render-mode later (large); Sampler maxConcurrent/VoicePool extraction (medium); duck() helper (small-medium); Playlist wrapper (small-medium); createMicInput (medium); 3D panner option (large, narrow). src/app deletion (R3#3) is also a standalone quick win — bundled into G13.

### Non-blocking findings not listed above
Remaining low-severity items live in the reviewer outputs (archived in QC scratch); each grouping's executor receives its full finding set at dispatch.
