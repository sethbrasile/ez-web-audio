import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Objective loudness / no-clip harness (phase 75).
 *
 * Every demo routes through the shared demo master bus — a −1 dBFS safety
 * limiter + an AnalyserNode peak meter installed via the core
 * `setMasterDestination` hook (see docs theme `audio/demo-master-bus.ts`).
 * `window.__EZ_DEMO_PEAK__()` reads the current peak. For each demo we trigger
 * its primary sound, sample the peak for ~3s, and assert:
 *   - max peak ≤ 0.985  → the limiter is engaged; nothing digitally clips.
 *   - max peak ≥ 0.05   → the demo is actually audible (catches silent regressions).
 *
 * Demos driven only by piano-key or canvas gestures (PolySynth, SynthKeyboard,
 * SoundfontPiano, XYPad) are covered by demos.spec.ts page-load smoke instead —
 * their triggers don't map to a simple button and are left for manual listening.
 */

const NO_CLIP = 0.985
const AUDIBLE = 0.05

async function clickByName(page: Page, ...patterns: string[]): Promise<void> {
  for (const p of patterns) {
    const btn = page.getByRole('button', { name: new RegExp(p, 'i') }).first()
    if (await btn.count() && await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
      await btn.click()
      return
    }
  }
  await page.locator('.vp-doc button, main button').first().click()
}

async function sampleMaxPeak(page: Page, ms = 3000): Promise<number> {
  return page.evaluate(async (duration) => {
    const read = (window as unknown as { __EZ_DEMO_PEAK__?: () => number }).__EZ_DEMO_PEAK__
    if (!read)
      return -1
    let max = 0
    const end = performance.now() + duration
    while (performance.now() < end) {
      const p = read()
      if (p > max)
        max = p
      await new Promise(r => setTimeout(r, 50))
    }
    return max
  }, ms)
}

interface Demo { path: string, name: string, trigger: (p: Page) => Promise<void> }

const demos: Demo[] = [
  { path: 'examples/synthesis', name: 'Oscillator', trigger: p => clickByName(p, '^play$', 'play') },
  { path: 'examples/basic-playback', name: 'Sound+Track', trigger: p => clickByName(p, 'play sound', 'play') },
  { path: 'examples/effects', name: 'Filter', trigger: p => clickByName(p, 'play') },
  { path: 'examples/audio-routing', name: 'Distortion', trigger: p => clickByName(p, 'play') },
  { path: 'examples/timing', name: 'Timing', trigger: p => clickByName(p, 'chord', 'sequence', 'play') },
  { path: 'examples/visualization', name: 'Visualization', trigger: p => clickByName(p, 'play', 'start') },
  { path: 'examples/lfo-modulation', name: 'LFO', trigger: p => clickByName(p, 'play') },
  { path: 'examples/effects-chain', name: 'EffectsChain', trigger: p => clickByName(p, 'play') },
  { path: 'examples/grainplayer', name: 'GrainPlayer', trigger: p => clickByName(p, 'play', 'start') },
  { path: 'examples/ambient-generator', name: 'Ambient', trigger: p => clickByName(p, 'play', 'start') },
  { path: 'examples/drum-machine', name: 'DrumMachine', trigger: p => clickByName(p, 'play') },
  { path: 'examples/drum-machine-vue', name: 'DrumMachineVue', trigger: p => clickByName(p, 'play') },
  { path: 'examples/transport-sequencer', name: 'TransportSequencer', trigger: p => clickByName(p, '^play$', 'play') },
  { path: 'examples/sampled-drum-kit', name: 'SampledDrumKit', trigger: p => clickByName(p, 'kick', 'snare') },
  { path: 'examples/synth-drum-kit', name: 'SynthDrumKit', trigger: p => clickByName(p, 'kick', 'snare') },
  { path: 'examples/crossfade', name: 'Crossfade', trigger: p => clickByName(p, 'play a', 'play track a', 'play') },
  { path: 'examples/layered-sound', name: 'Layered+PlayTogether', trigger: p => clickByName(p, 'play all', 'play together', 'play') },
]

for (const demo of demos) {
  test(`${demo.name} — no clip, audible`, async ({ page }) => {
    await page.goto(demo.path)
    await page.waitForSelector('.VPContent', { timeout: 10000 })
    await demo.trigger(page)
    const max = await sampleMaxPeak(page)
    // eslint-disable-next-line no-console
    console.log(`[loudness] ${demo.name.padEnd(20)} peak=${max.toFixed(4)}`)
    expect(max, `${demo.name}: meter missing`).toBeGreaterThanOrEqual(0)
    expect(max, `${demo.name}: clipping (peak ${max.toFixed(3)} > ${NO_CLIP})`).toBeLessThanOrEqual(NO_CLIP)
    expect(max, `${demo.name}: inaudible (peak ${max.toFixed(3)} < ${AUDIBLE})`).toBeGreaterThanOrEqual(AUDIBLE)
  })
}
