/**
 * Canonical list of interactive demo doc pages.
 *
 * Shared between demos.spec.ts (page-load smoke tests) and loudness.spec.ts
 * (loudness / no-clip checks) so the two registries can't silently diverge
 * (R18 finding #2 — crossfade + layered-sound were in the loudness list but
 * missing from the smoke list). loudness.spec.ts types its `Demo.path` field
 * as `DemoPage`, so referencing a path that isn't in this list is a
 * typecheck error.
 */
export const DEMO_PAGES = [
  'examples/basic-playback',
  'examples/synthesis',
  'examples/effects',
  'examples/audio-routing',
  'examples/timing',
  'examples/drum-machine',
  'examples/synth-keyboard',
  'examples/xy-pad',
  'examples/synth-drum-kit',
  'examples/sampled-drum-kit',
  'examples/soundfont-piano',
  'examples/drum-machine-vue',
  'examples/drum-machine-vanilla',
  'examples/ambient-generator',
  'examples/visualization',
  'examples/lfo-modulation',
  'examples/polysynth',
  'examples/effects-chain',
  'examples/grainplayer',
  'examples/transport-sequencer',
  'examples/audio-sprite',
  'examples/react-integration',
  'examples/crossfade',
  'examples/layered-sound',
] as const

export type DemoPage = (typeof DEMO_PAGES)[number]
