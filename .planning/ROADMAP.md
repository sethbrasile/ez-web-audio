# Roadmap: EZ Audio

**Project:** EZ Web Audio Library
**Core Value:** Make the Web Audio API easy to use
**Created:** 2026-01-31
**Last Updated:** 2026-03-18

## Milestones

- ✅ **Milestone 1: MVP** — Phases 1-11 (shipped 2026-02-14)
- ✅ **Milestone 2: Quality & Polish** — Phases 12-16 (shipped 2026-02-16)
- ✅ **Milestone 3: Stable Release** — Phases 17-46 (complete)
- ✅ **Milestone 4: Deep Review Hardening** — Phases 47-52 (complete)
- ✅ **Milestone 5: Effects & Transport** — Phases 53-60 (complete)
- ✅ **Milestone 6: DX & Discoverability** — Phases 61-66 (shipped 2026-03-08)
- 🚧 **Milestone 7: Feature Demos** — Phases 67-71 + 71.1-71.6 (code complete, awaiting UAT)
- 📋 **Milestone 8: Demo Excellence, Bindings & 0.2.0** — Phases 72-78 (planned 2026-07-09, starts after M7 UAT)

## Phases

<details>
<summary>✅ Milestone 1: MVP (Phases 1-11) — SHIPPED 2026-02-14</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-02-01
- [x] Phase 2: ADSR Envelopes (4/4 plans) — completed 2026-02-02
- [x] Phase 3: Utility Features (3/3 plans) — completed 2026-02-03
- [x] Phase 4: Composition Features (3/3 plans) — completed 2026-02-04
- [x] Phase 5: Effects & Advanced (4/4 plans) — completed 2026-02-05
- [x] Phase 6: Testing (4/4 plans) — completed 2026-02-06
- [x] Phase 7: Documentation & Demo (7/7 plans) — completed 2026-02-08
- [x] Phase 8: Build & Distribution (3/3 plans) — completed 2026-02-09
- [x] Phase 9: Interactive Examples (10/10 plans) — completed 2026-02-12
- [x] Phase 10: Lazy AudioContext (4/4 plans) — completed 2026-02-13
- [x] Phase 11: Drum Machine Examples (2/2 plans) — completed 2026-02-14

</details>

<details>
<summary>✅ Milestone 2: Quality & Polish (Phases 12-16) — SHIPPED 2026-02-16</summary>

- [x] Phase 12: Comprehensive Audit (5/5 plans) — completed 2026-02-16
- [x] Phase 13: Code Quality Implementation (3/3 plans) — completed 2026-02-16
- [x] Phase 14: Documentation Polish (3/3 plans) — completed 2026-02-16
- [x] Phase 15: Test Coverage Expansion (4/4 plans) — completed 2026-02-16
- [x] Phase 16: SEO Optimization (3/3 plans) — completed 2026-02-16

</details>

<details>
<summary>✅ Milestone 3: Stable Release (Phases 17-46) — COMPLETE</summary>

See milestones/ archive for full phase details.

</details>

<details>
<summary>✅ Milestone 4: Deep Review Hardening (Phases 47-52) — COMPLETE</summary>

See milestones/ archive for full phase details.

</details>

<details>
<summary>✅ Milestone 5: Effects & Transport (Phases 53-60) — COMPLETE</summary>

See milestones/ archive for full phase details.

</details>

<details>
<summary>✅ Milestone 6: DX & Discoverability (Phases 61-66) — SHIPPED 2026-03-08</summary>

- [x] Phase 61: Audio Sprites Redesign (2/2 plans) — completed 2026-03-07
- [x] Phase 62: Multiple AudioContext Support (3/3 plans) — completed 2026-03-07
- [x] Phase 63: llms.txt Support (2/2 plans) — completed 2026-03-07
- [x] Phase 64: Demo Example UX Fixes (2/2 plans) — completed 2026-03-07
- [x] Phase 65: Rebuild & Validation Cleanup (2/2 plans) — completed 2026-03-08
- [x] Phase 66: Orphaned Component Cleanup (1/1 plan) — completed 2026-03-08

</details>

### Milestone 7: Feature Demos (In Progress)

**Milestone Goal:** Build interactive demo pages for all M5 features (effects, LFO, PolySynth, Transport/Sequencer, GrainPlayer) that currently lack examples. Pure documentation/UX work -- no library code changes.

- [x] **Phase 67: LFO Modulation Demo** - Interactive demo showing tremolo, vibrato, and filter sweep with animated waveform visualization (completed 2026-03-09)
- [x] **Phase 68: PolySynth Demo** - Piano keyboard with polyphonic voice allocation, steal strategies, and ADSR controls (completed 2026-03-09)
- [x] **Phase 69: Effects Chain Demo** - Toggle, adjust, reorder, and chain delay/reverb/compressor/EQ effects with signal flow diagram (completed 2026-03-18)
- [x] **Phase 70: GrainPlayer Demo** - Granular synthesis with independent pitch/time control and waveform overlay (completed 2026-03-18)
- [x] **Phase 71: Transport + Sequencer Demo** - BPM clock, musical time notation, mute/solo, and visual playhead (completed 2026-03-19)

## Phase Details

### Phase 67: LFO Modulation Demo
**Goal**: Users can hear and see LFO modulation in action -- tremolo, vibrato, and filter sweep -- with real-time waveform visualization
**Depends on**: Nothing (first M7 phase, simplest demo, establishes canvas animation pattern)
**Requirements**: LFO-01, LFO-02, LFO-03, LFO-04, LFO-05
**Success Criteria** (what must be TRUE):
  1. User can click Play and hear an oscillator modulated by tremolo (gain wobble), then switch to vibrato (pitch wobble) or filter sweep (cutoff wobble) -- each sounds distinctly different
  2. User can see an animated canvas showing the LFO waveform shape updating in real time while audio plays
  3. User can drag rate and depth sliders and hear the modulation change immediately while playing
  4. Demo renders fully visible on page load with no "Load" button -- first Play click initializes audio
**Plans**: 2 plans
Plans:
- [ ] 67-01-PLAN.md — Build LFO demo component, VitePress page, sidebar registration
- [ ] 67-02-PLAN.md — E2E tests and human verification

### Phase 68: PolySynth Demo
**Goal**: Users can play polyphonic chords on a piano keyboard and observe voice allocation behavior across different steal strategies
**Depends on**: Phase 67 (canvas animation pattern established)
**Requirements**: POLY-01, POLY-02, POLY-03, POLY-04
**Success Criteria** (what must be TRUE):
  1. User can click/touch multiple piano keys simultaneously and hear all notes sounding together as a chord
  2. User can see a display showing active voice count out of max voices, updating in real time as notes are played and released
  3. User can select oldest/quietest/newest steal strategy from a dropdown and hear the difference when exceeding max voices
  4. User can adjust ADSR sliders (attack, decay, sustain, release) and hear the envelope shape change on subsequent notes
**Plans**: 2 plans
Plans:
- [ ] 68-01-PLAN.md — Build PolySynthDemo component, VitePress page, sidebar registration
- [ ] 68-02-PLAN.md — E2E tests and human verification

### Phase 69: Effects Chain Demo
**Goal**: Users can build and tweak an audio effects chain by toggling, adjusting, and reordering effects, with a visual signal flow diagram showing the audio path
**Depends on**: Phase 67 (established demo patterns)
**Requirements**: FX-01, FX-02, FX-03, FX-04, FX-05
**Success Criteria** (what must be TRUE):
  1. User can toggle delay, reverb, compressor, and EQ effects on/off individually and hear each effect apply or bypass in real time without audio clicks
  2. User can adjust per-effect parameters (delay time/feedback, reverb mix, compressor threshold/ratio, EQ band gains) via sliders and hear changes immediately
  3. User can reorder effects in the chain (e.g., move reverb before delay) and hear the sonic difference of the new order
  4. User can switch between an oscillator and a loaded audio file as the sound source
  5. User can see a signal flow diagram that updates to show only active (non-bypassed) effects in their current order
**Plans**: 2 plans
Plans:
- [ ] 69-01-PLAN.md — Build EffectsChainDemo component, VitePress page, sidebar entry
- [ ] 69-02-PLAN.md — E2E tests and human verification

### Phase 70: GrainPlayer Demo
**Goal**: Users can explore granular synthesis by independently controlling pitch and playback speed, with a waveform display showing grain positions
**Depends on**: Phase 67 (canvas waveform pattern)
**Requirements**: GRAIN-01, GRAIN-02, GRAIN-03, GRAIN-04
**Success Criteria** (what must be TRUE):
  1. User can drag a pitch slider and hear the audio pitch shift up/down without the playback speed changing
  2. User can drag a speed slider and hear the playback rate change without the pitch shifting
  3. User can adjust grain size and hear the texture change from smooth to granular artifacts
  4. User can see the source audio waveform on a canvas with an overlay indicating current grain playback position
**Plans**: 2 plans
Plans:
- [ ] 70-01-PLAN.md — Build GrainPlayerDemo component, CC0 audio asset, VitePress page, sidebar registration
- [ ] 70-02-PLAN.md — E2E tests and human verification

### Phase 71: Transport + Sequencer Demo
**Goal**: Users can control a BPM-synced transport with mute/solo tracks and hear musical sequences using time notation, with a visual beat/bar playhead
**Depends on**: Phase 67 (demo patterns), Phase 68 (voice management patterns)
**Requirements**: TSEQ-01, TSEQ-02, TSEQ-03, TSEQ-04
**Success Criteria** (what must be TRUE):
  1. User can click Play/Pause/Stop and adjust a BPM slider -- the tempo changes take effect immediately without restarting
  2. User can mute and solo individual tracks and hear them drop in/out of the mix independently
  3. User can hear a musical sequence that uses different note durations (quarter notes, eighth notes, etc.) playing in sync with the transport clock
  4. User can see a visual playhead showing current beat and bar position that advances in sync with the audio
**Plans**: 2 plans
Plans:
- [ ] 71-01-PLAN.md — Build TransportSequencerDemo component, VitePress page, sidebar registration
- [ ] 71-02-PLAN.md — E2E tests and human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 67 -> 68 -> 69 -> 70 -> 71

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 67. LFO Modulation Demo | 2/2 | Complete    | 2026-03-09 | - |
| 68. PolySynth Demo | 2/2 | Complete    | 2026-03-09 | - |
| 69. Effects Chain Demo | 2/2 | Complete    | 2026-03-18 | - |
| 70. GrainPlayer Demo | 2/2 | Complete    | 2026-03-18 | - |
| 71. Transport + Sequencer Demo | 2/2 | Complete   | 2026-03-20 | - |
| 71.1–71.6 Deep Review Fixes | — | Complete (via b0dee2f) | 2026-03-19 | - |

**Milestone 7 status:** all code complete. Awaiting human UAT before `/gsd-complete-milestone`.

---

**Archives:**
- `milestones/3-phases/` — Milestone 3 phase directories (Phases 17-46)
- `milestones/4-phases/` — Milestone 4 phase directories (Phases 47-52)
- `milestones/5-phases/` — Milestone 5 phase directories (Phases 53-60.2)
- `reviews/archive/` — pre-GSD review docs (review-agent1-7, code-review-v2, REVIEW-FINDINGS, etc.)
- `milestones/mvp-phases/` — Milestone 1 phase directories (Phases 1-11)
- `milestones/v1.1-phases/` — Milestone 2 phase directories (Phases 12-16)
- `milestones/v1.1-ROADMAP.md` — Milestone 2 phase details
- `milestones/v1.1-REQUIREMENTS.md` — Milestone 2 requirements with outcomes
- `milestones/6-ROADMAP.md` — Milestone 6 phase details
- `milestones/6-REQUIREMENTS.md` — Milestone 6 requirements (M5 REQUIREMENTS.md, inherited)
- `milestones/6-phases/` — Milestone 6 phase directories (Phases 61-66)

*Last updated: 2026-07-09 — planning reconciliation (71.x phases closed against commit b0dee2f)*

### Phases 71.1–71.6: Deep Review Fix Phases (COMPLETED — consolidated)

Inserted 2026-03-19 from deep review `2026-03-19-deep-review-m7-demos.md` (55 findings, 6 blocking). All six groupings were executed together in commit `b0dee2f` (2026-03-19) rather than as separate planned phases. One regression from that commit (`transport.resume()` no-op) caught by re-verification and fixed 2026-07-09.

- [x] 71.1: LFO Demo — musical calibration (rate mapping, depth ranges, wah bandpass, preset tuning) + UX
- [x] 71.2: TransportSequencer Demo — dispose leak (C1), triplet support (ticksPerBeat:12), preset-before-init guard, UX
- [x] 71.3: EffectsChain Demo — dispose leak (C2), bypass verification, compressor attack/release, reorder UX
- [x] 71.4: GrainPlayer Demo — mobile touchend fix (H1), theme-aware canvas, preset tuning
- [x] 71.5: PianoKeyboard + PolySynth — search-input guard (H13), multi-touch, roving tabindex, keyboard activation
- [x] 71.6: Content/Docs Pages — effects-chain prose, LLM fallback tags, cross-references, SEO titles

**Remaining before milestone close:** human UAT (`71-UAT.md`, 7 tests) + listen-through of all 6 demos.

## Milestone 8: Demo Excellence, Bindings & 0.2.0 (Planned)

**Milestone Goal:** Make the demos truly great, ship official Vue + React bindings, release 0.2.0, and announce publicly. Staying <1.0 until stability confidence is earned (user decision 2026-07-09).

**Strategy:** Vue bindings and demo excellence are the same work — extract composables from the proven demo patterns into `@ez-web-audio/vue`, then refactor all demos onto them. This kills the two open structural patterns from the 2026-03-19 deep review (demo-resource-cleanup-inconsistency, demo-audio-init-duplication) and makes every demo a living test of the binding. The groovebox showcase (Phase 76) fulfills the "pseudo DAW showcase" deferred from M7 requirements.

**Announce sequence:** Phases 72-77 → full human UAT gate → Phase 78 (publish + announce).

- [x] **Phase 72: Workspace + @ez-web-audio/vue** — Convert to pnpm workspace (`packages/core`, `packages/vue`). Extract composables (`useAudioLib`, `useCleanup`, `useSound`, `useBeatTrack`, ...) from demo patterns. Core stays zero-dep; binding peer-depends on core. ✓ 2026-07-09
- [x] **Phase 73: Demo composables refactor** — 24 docs demos refactored onto `@ez-web-audio/vue` composables (+ static-import escape hatch for churn/type-swap demos). Deletes per-demo init/dispose boilerplate; demos dogfood the binding. Hardened the binding (reset, getContext, 6 composables) + `Sound.audioBuffer`. DrumMachineVanilla excluded by design. ✓ 2026-07-10
- [ ] **Phase 74: Demo design cohesion** — Shared demo UI kit (DemoCard, ParameterSlider, PlayButton, VolumeWarning — extraction now earned at 20+ demos, reversing M7's "not worth it for 5 pages" call). Dark/light parity, mobile layout, touch targets ≥44px, a11y sweep across ALL demos.
- [ ] **Phase 75: Demo sound quality** — Gain staging per demo, shared master limiter (nothing clips), curated musical presets (great in first 5 seconds), replace cheap-sounding raw oscillators with better patches/samples where warranted.
- [ ] **Phase 76: Groovebox showcase** — Flagship "everything together" demo: drum machine + bass synth + effects chain + transport/sequencer, state shareable via URL, embedded as homepage hero. The announcement centerpiece.
- [ ] **Phase 77: @ez-web-audio/react** — React hooks package mirroring Vue composables (`useSound`, `usePolySynth`, ...), SSR-safe (no AudioContext until user interaction). Examples via StackBlitz embeds; rewrite React integration guide.
- [ ] **Phase 78: Release 0.2.0 + announce** — GATED on full human UAT of all demos. Publish core 0.2.0 + both bindings, CHANGELOG, demo GIFs/og-images, announcement posts (angles: Howler manifest migration wedge, llms.txt AI-discoverability, interactive demos).

**Requirements:** to be formalized via `/gsd-new-milestone` after M7 close (current REQUIREMENTS.md is M7-scoped and archives at milestone completion).

**Plans (written 2026-07-09, executable via `.planning/M8-PLAYBOOK.md`):**
- 72-01 pnpm workspace conversion · 72-02 @ez-web-audio/vue composables
- 73-01 refactor all demos onto composables
- 74-01 design brief for claude-design (RUNS FIRST) · 74-02 implement handoff packet (runtime-expanded)
- 75-01 master bus, gain staging, preset tuning → listening gate
- 76-01 groovebox engine + state + codec + presets · 76-02 groovebox UI, hero, share, E2E
- 77-01 @ez-web-audio/react hooks + examples + guide
- 78-01 release 0.2.0 + announce (publish behind human gate)
