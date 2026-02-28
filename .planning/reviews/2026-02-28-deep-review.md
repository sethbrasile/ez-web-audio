# Deep Review — EZ Web Audio
## 2026-02-28 | Mode: Mid-build | Scope: Phases 53-54 (Built-in Effects + LFO)

### Meta
- Lenses activated: Architecture, Security/Safety, Performance, API Correctness
- Skills referenced: GSD workflow, superpowers:test-driven-development
- Files examined: ~20 source + test files
- Review duration: ~3 minutes (4 parallel reviewers)

### Critical Findings

#### C1: Multiple LFOs patching same target's dispose() creates broken chain
- **File:** `src/lfo.ts:605-625`
- **Impact:** If LFO-A patches a target, then LFO-B patches it, restoring LFO-A's original severs LFO-B's cleanup. Event listeners and GainNode connections orphaned permanently.
- **Recommendation:** Replace monkey-patching with `'dispose'` event listener pattern. BaseSound already has typed EventTarget.

### High Findings

#### H1: retrigger overwrites syncLifecycle playListener — listener leak
- **File:** `src/lfo.ts:201-231`
- **Impact:** When both options true, line 202 sets record.playListener for sync, line 229 overwrites with retrigger. On disconnect, only retrigger listener removed — sync listener permanently orphaned.
- **Recommendation:** Make mutually exclusive, throw if both set.

#### H2: Empty catch blocks swallow real errors in LFO
- **File:** `src/lfo.ts:298, 322, 524, 534`
- **Impact:** _restart() line 534 catches everything then sets _isRunning=true at 538. If AudioContext closed or _initNodes failed, LFO enters inconsistent state.
- **Recommendation:** Remove try/catch in _restart() (fresh node can't throw). Catch only InvalidStateError elsewhere.

#### H3: Misaligned JSDoc blocks on BaseEffect
- **File:** `src/effects/base-effect.ts:106-135`
- **Impact:** rampTo() JSDoc (106-121) sits above getParam() (131), not rampTo() (135). TypeDoc will generate incorrect documentation.
- **Recommendation:** Move rampTo JSDoc to immediately precede line 135.

#### H4: syncToBPM() doesn't validate — produces NaN on bad input
- **File:** `src/lfo.ts:364-374`
- **Impact:** `syncToBPM(120, 'bad')` → NaN frequency, silent broken state. `'1/0'` → Infinity.
- **Recommendation:** Validate format, throw on NaN/Infinity/zero denominator.

### Medium Findings

#### M1: _disposePatchMap uses Map (strong refs)
- **File:** `src/lfo.ts:83`
- Targets can't be GC'd if LFO isn't disposed

#### M2: _extractAudioContext casts through unknown to access protected audioContext
- **File:** `src/lfo.ts:429`
- Add public getAudioContext() to BaseEffect or make audioContext public readonly

#### M3: BaseEffect not exported from src/index.ts
- Users can't extend it for custom effects despite JSDoc showing how

#### M4: BaseEffect has no dispose()
- Effects with feedback loops (Delay, Reverb) can't be deterministically torn down
- LFO cleanup patching skipped for effects since they lack dispose()

#### M5: DistortionEffect type='custom' without curve silently corrupts state
- **File:** `src/effects/distortion-effect.ts:158-166`
- Changes _type but leaves stale curve; amount setter becomes no-op

#### M6: Distortion curve allocates 44100-sample Float32Array on every setter call
- **File:** `src/effects/distortion-effect.ts:32-33, 146-150`
- Reduce to 1024 samples (WaveShaper interpolates) and reuse buffer

#### M7: Reverb decay setter uses direct .value on delay times — audible clicks
- **File:** `src/effects/reverb-effect.ts:227`
- Use setTargetAtTime for smooth transitions

#### M8: CompressorEffect doesn't validate parameter ranges
- **File:** `src/effects/compressor-effect.ts:81-119`
- ratio < 1, negative attack/release accepted without clamping

#### M9: Delay time setter not validated against maxTime
- **File:** `src/effects/delay-effect.ts:81-83`

### Low Findings

| # | Finding | Location |
|---|---------|----------|
| L1 | LFO type setter dead code — standard-to-standard always _restart() instead of cheap .type | `lfo.ts:134-141` |
| L2 | LFO frequency/depth accept NaN without error | `lfo.ts:99-122` |
| L3 | rampTo(duration=0) causes RangeError from setTargetAtTime | `base-effect.ts:139,151` |
| L4 | S&H buffer fill has redundant outer-loop iterations | `lfo.ts:591-599` |
| L5 | GainEffect doesn't extend BaseEffect (intentional, divergent) | `gain-effect.ts` |
| L6 | AudioContext duck-typing duplicated across 5 factories | Multiple files |
| L7 | rampTo('tone') on Distortion sets raw Hz, bypasses exponential mapping | `distortion-effect.ts:187-192` |
| L8 | Test gaps: disconnect-all, getParam(), convolution URL, edge cases | Various test files |

### Proposed Action Plan

#### Group 1: LFO Listener & Dispose Bugs
- Goal: Fix all LFO lifecycle and cleanup bugs
- Findings addressed: C1, H1, H2, M1
- Scope: `src/lfo.ts`, `src/lfo.test.ts`
- Effort: Medium
- Dependencies: None

#### Group 2: BaseEffect Completeness
- Goal: Complete BaseEffect API surface and documentation
- Findings addressed: H3, M2, M3, M4
- Scope: `src/effects/base-effect.ts`, `src/effects/base-effect.test.ts`, `src/index.ts`
- Effort: Small
- Dependencies: Group 1 benefits from M4 (dispose on BaseEffect)

#### Group 3: Input Validation
- Goal: Add validation to all effect and LFO parameter setters
- Findings addressed: H4, M5, M8, M9, L2, L3
- Scope: All effect files, `src/lfo.ts`
- Effort: Small
- Dependencies: None

#### Group 4: Performance Polish
- Goal: Reduce allocation overhead and fix audio glitches
- Findings addressed: M6, M7, L1, L4
- Scope: `src/effects/distortion-effect.ts`, `src/effects/reverb-effect.ts`, `src/lfo.ts`
- Effort: Small
- Dependencies: None

#### Group 5: Test Coverage
- Goal: Close test gaps for edge cases and untested paths
- Findings addressed: L8
- Scope: All test files
- Effort: Small
- Dependencies: Groups 1-4 (test the fixes)
