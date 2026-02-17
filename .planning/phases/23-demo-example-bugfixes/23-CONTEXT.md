# Phase 23 Context: Demo Example Bugfixes

## Origin

A thorough code review of all VitePress demo components against the library's actual API and web audio best practices revealed 12 issues ranging from critical runtime crashes to minor inconsistencies. These were introduced during the Phase 22 API migration and earlier example creation (Phase 9).

## Issues Found

### Critical Bugs (runtime crashes or wrong behavior)

| # | Component | Line(s) | Problem |
|---|-----------|---------|---------|
| 1 | VisualizationDemo.vue | 78 | `createAnalyzer({ fftSize })` missing required `audioContext` first parameter |
| 2 | AmbientGenerator.vue | 165, 179 | `.as('number')` is not a valid RatioType — throws at runtime |
| 2 | VisualizationDemo.vue | 225 | Same `.as('number')` bug |
| 3 | AmbientGenerator.vue | 68 | `Q:` (uppercase) instead of `q:` — silently ignored |
| 4 | DistortionDemo.vue | 86 | `wrapEffect(ctx, distNode)` uses old context-requiring API |

### Significant Design Issues

| # | Component | Problem |
|---|-----------|---------|
| 5 | OscillatorDemo.vue | Stop/recreate on every slider change causes audio gaps — should use `update()` for freq/gain |
| 6 | VisualizationDemo.vue | Same stop/recreate for waveform change (acceptable) but frequency uses broken `.as('number')` |
| 7 | XYPad.vue | `mouseup` on canvas instead of `document` — sound keeps playing if mouse released outside |
| 8 | TimingDemo.vue | `window.setTimeout` for visual sync in a timing demo — should use audioContext-aware timeout |

### Minor Issues

| # | Component | Problem |
|---|-----------|---------|
| 9 | SynthKeyboard.vue | `noteOff` immediately kills oscillator — ADSR release phase truncated |
| 10 | XYPad.vue, VisualizationDemo.vue | Canvas DPI not accounted for — blurry on Retina displays |
| 11 | AmbientGenerator.vue | `textureFilter.frequency.value` accesses internals — should use `textureFilter.frequency = v` |
| 12 | DistortionDemo.vue | `effect.input.curve` fragile internal access |

## Key Technical Context

- `audioContextAwareTimeout` is currently internal (`src/utils/timeout.ts`) — Plan 23-01 exports it as a public API
- `getAudioContext()` IS exported and returns the shared AudioContext
- `createAnalyzer(audioContext, options?)` requires AudioContext as first parameter — no context-free overload exists
- Valid `RatioType` values: `'ratio' | 'inverseRatio' | 'percent'` — there is no `'number'`
- `FilterEffectOptions.q` is lowercase
- `wrapEffect(externalEffect)` is the context-free overload (new API)
- Once exported, `audioContextAwareTimeout` can be used in TimingDemo as both a fix and a documentation example of the utility

## Decision: Export audioContextAwareTimeout

The utility is already battle-tested across BeatTrack, Beat, BaseSound, and LayeredSound. Exporting it:
1. Solves a real problem for consumers building audio UIs (native setTimeout drifts under browser throttling)
2. Makes the TimingDemo fix cleaner — uses the library's own API instead of reimplementing RAF+currentTime
3. Lets demo code serve as documentation of the utility's usage
4. Allows consumers to share the same AudioContext their app already uses
