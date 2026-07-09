# Code Review: E2E Tests, Integration Tests, and Cross-Cutting Concerns

**Reviewer:** Agent 7 (Code Reviewer)
**Date:** 2026-02-20
**Scope:** E2E tests, integration/concurrent unit tests, Playwright config, cross-cutting concerns
**Files Reviewed:**
- `/Users/seth/Documents/GitHub/ez-audio/e2e/demos.spec.ts`
- `/Users/seth/Documents/GitHub/ez-audio/e2e/navigation.spec.ts`
- `/Users/seth/Documents/GitHub/ez-audio/src/integration.test.ts`
- `/Users/seth/Documents/GitHub/ez-audio/src/concurrent.test.ts`
- `/Users/seth/Documents/GitHub/ez-audio/playwright.config.ts`
- `/Users/seth/Documents/GitHub/ez-audio/docs/.vitepress/config.mts`
- `/Users/seth/Documents/GitHub/ez-audio/src/index.ts`
- `/Users/seth/Documents/GitHub/ez-audio/src/index.test.ts`

---

## Summary

The E2E tests are minimal smoke tests that verify pages load without JavaScript errors. The integration and concurrent tests are well-structured and cover important edge cases (layering, double-stop, rapid seek). However, significant gaps exist in interactive E2E coverage, multi-module integration workflows, and cross-cutting concerns like cleanup and AudioContext sharing across sound types.

---

## [LOW] Demo Page Count Is 15, Not 17

**Category:** E2E Gap
**Description:** The `demos.spec.ts` file tests 15 demo pages. The VitePress sidebar config lists 16 example entries (15 demo pages plus the overview index). The test array matches the sidebar exactly minus the overview page, which is good. However, if the goal was 17 demos, two may be missing or planned. Current coverage:

Tested (15 pages):
1. `/examples/basic-playback`
2. `/examples/synthesis`
3. `/examples/effects`
4. `/examples/audio-routing`
5. `/examples/timing`
6. `/examples/drum-machine`
7. `/examples/synth-keyboard`
8. `/examples/xy-pad`
9. `/examples/synth-drum-kit`
10. `/examples/sampled-drum-kit`
11. `/examples/soundfont-piano`
12. `/examples/drum-machine-vue`
13. `/examples/drum-machine-vanilla`
14. `/examples/ambient-generator`
15. `/examples/visualization`

**Suggestion:** Verify the intended demo count. If new demos are planned (e.g., track playback, audio sprites), add them to the test array when the pages are created. Consider generating the page list from the VitePress config to prevent drift:

```typescript
// Import or define the sidebar config and derive demo paths automatically
const exampleSidebar = config.themeConfig.sidebar['/examples/']
const demoPages = exampleSidebar
  .flatMap(g => g.items)
  .map(i => i.link)
  .filter(l => l !== '/examples/') // exclude overview
```

---

## [HIGH] E2E Tests Only Check for JS Errors -- No Interaction Testing

**Category:** E2E Gap
**Description:** Every E2E test follows the identical pattern: navigate, wait 3 seconds, assert zero `pageerror` events. No test clicks a button, toggles a beat, presses a key, drags a slider, or verifies any DOM rendering. The tests explicitly state "They do NOT test audio playback" but they also do not test any UI interaction at all. This means:

- **Drum machine:** Start/stop button, beat toggle, BPM slider -- all untested
- **Piano/keyboard:** Key press/touch, note triggering -- all untested
- **XY pad:** Pointer drag, parameter display -- all untested
- **Track/basic playback:** Play/pause/stop buttons -- all untested
- **Visualization:** Canvas element presence, animation -- all untested
- **Effects:** Parameter knob/slider changes -- all untested
- **Ambient generator:** Start/stop, layer controls -- all untested

A regression that breaks a button handler, hides a UI element, or prevents initialization after click would pass these tests.

**Suggestion:** Add interaction smoke tests for at least the high-value demos. Audio playback verification is not needed -- just confirm that clicking "init" does not throw, that expected DOM elements appear, and that state transitions work. Example:

```typescript
test('drum machine: init and toggle beat', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))

  await page.goto('/examples/drum-machine')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(3000)

  // Click init/start button (adjust selector to match actual UI)
  const initButton = page.locator('button', { hasText: /init|start/i })
  if (await initButton.isVisible()) {
    await initButton.click()
    await page.waitForTimeout(1000)
  }

  // Verify beat grid rendered
  const beats = page.locator('[data-testid="beat"], .beat, .beat-cell')
  const beatCount = await beats.count()
  expect(beatCount).toBeGreaterThan(0)

  // Toggle first beat
  if (beatCount > 0) {
    await beats.first().click()
  }

  expect(errors).toHaveLength(0)
})
```

---

## [MEDIUM] Navigation E2E Does Not Cover All Sidebar Routes

**Category:** E2E Gap
**Description:** The `navigation.spec.ts` tests only 4 routes:
- `/` (Homepage)
- `/guide/getting-started`
- `/guide/concepts`
- `/examples/` (Overview)

Missing from navigation tests:
- All 15 individual example pages (partially covered by `demos.spec.ts` but not as navigation tests)
- `/api/` (API reference)
- Any guide sub-pages beyond the two listed

The `demos.spec.ts` covers the example pages for error detection, but `navigation.spec.ts` does not test that sidebar links actually navigate correctly -- it only tests direct URL access.

**Suggestion:** Add a test that clicks through sidebar navigation links to verify client-side routing works:

```typescript
test('sidebar navigation works for example pages', async ({ page }) => {
  await page.goto('/examples/')
  await page.waitForLoadState('domcontentloaded')

  // Click first sidebar link
  const sidebarLinks = page.locator('.VPSidebarItem a')
  const linkCount = await sidebarLinks.count()
  expect(linkCount).toBeGreaterThan(0)

  // Navigate to first example via sidebar click
  await sidebarLinks.first().click()
  await page.waitForLoadState('domcontentloaded')

  // Verify URL changed
  expect(page.url()).not.toContain('/examples/$')
})
```

---

## [MEDIUM] Fixed 3-Second Wait Instead of Waiting for Specific Conditions

**Category:** E2E Gap
**Description:** All E2E tests use `await page.waitForTimeout(3000)` after navigation. This is fragile: too short on slow CI machines, too long for fast ones. Vue hydration timing is unpredictable and 3 seconds may not be sufficient for pages that fetch audio files or initialize complex components.

**Suggestion:** Replace with condition-based waits where possible:

```typescript
// Instead of:
await page.waitForTimeout(3000)

// Use:
await page.waitForLoadState('networkidle')
// Or wait for a specific element that signals readiness:
await page.waitForSelector('[data-ready="true"]', { timeout: 10000 })
```

If `waitForTimeout` must be used as a fallback, consider making the duration configurable via an environment variable for CI vs local runs.

---

## [HIGH] Integration Tests Only Cover Sound + Effect/Analyzer and Font -- No Other Module Combinations

**Category:** Integration Gap
**Description:** The integration test file (`/Users/seth/Documents/GitHub/ez-audio/src/integration.test.ts`) covers exactly two workflows:

1. **Sound -> Effect -> Analyzer chain** (add effect, set analyzer, play, stop, verify persistence)
2. **Font / Soundfont workflow** (create Font from mock notes, play notes, verify dispatch)

Major integration workflows that are NOT tested:
- **Track with effects:** Load track, add reverb/delay, play, pause, seek, resume -- verify effects persist through pause/resume cycle
- **Oscillator with effects:** Create oscillator, add filter, play -- verify filter applies
- **BeatTrack with effects:** Create beat track, add gain effect, play pattern -- verify effect routing
- **Sampler workflow:** Load sampler, play multiple times, verify round-robin, verify gain/pan
- **Crossfade between tracks:** Use `crossfade()` utility, verify smooth transition
- **LayeredSound workflow:** Create layered sound from Sound + Oscillator, play, verify sync
- **AudioSprite workflow:** Load sprite, play named segments, verify timing
- **Preload + factory function:** Preload URLs, then create sounds -- verify cache hit
- **Collection utilities:** `playAll()`, `stopAll()`, `pauseAll()` with mixed sound types

**Suggestion:** Add integration tests for at least Track + effects and BeatTrack workflows, as these are the most common real-world usage patterns:

```typescript
describe('track -> Effect -> play/pause/resume', () => {
  it('effect persists through pause/resume cycle', async () => {
    const ctx = createMockContext()
    const track = createTrack(ctx, 60)
    const effect = new EffectWrapper(ctx, createMockExternalEffect())

    track.addEffect(effect)
    await track.play()
    expect(track.getEffects()).toHaveLength(1)

    track.pause()
    expect(track.getEffects()).toHaveLength(1)

    await track.resume()
    expect(track.getEffects()).toHaveLength(1)
    expect(track.getEffects()[0]).toBe(effect)
  })
})
```

---

## [MEDIUM] Concurrent Tests Cover Sound and Track Only -- No Oscillator or Multi-Type Concurrency

**Category:** Integration Gap
**Description:** The concurrent test file (`/Users/seth/Documents/GitHub/ez-audio/src/concurrent.test.ts`) tests three scenarios, all using only `Sound` and `Track`:

1. **Play while playing (layering):** Sound creates new source node on re-play
2. **Rapid seek (coalesces to last value):** Track seek behavior
3. **Double stop (no-op):** Sound and Track stop idempotency

Missing concurrent scenarios:
- **Multiple Oscillators playing simultaneously:** Verify no interference between frequency/gain
- **Sound + Oscillator + Track playing together:** Mixed types sharing same AudioContext
- **Multiple BeatTracks playing simultaneously:** Drum machine with multiple lanes
- **Sampler rapid-fire:** Multiple rapid plays cycling through round-robin without errors
- **Concurrent play + effect changes:** Play while modifying gain/pan/filter in parallel

**Suggestion:** Add a test for mixed-type concurrent playback:

```typescript
describe('mixed-type concurrent playback', () => {
  it('sound and track can play simultaneously without interference', async () => {
    const ctx = createMockContext()
    const sound = createSound(ctx)
    const track = createTrack(ctx)

    await sound.play()
    await track.play()

    expect(sound.isPlaying).toBe(true)
    expect(track.isPlaying).toBe(true)

    await sound.stop()
    expect(sound.isPlaying).toBe(false)
    expect(track.isPlaying).toBe(true) // track unaffected
  })
})
```

---

## [LOW] AudioContext Singleton Sharing Well Tested in index.test.ts

**Category:** Cross-Cutting (Positive Finding)
**Description:** The `index.test.ts` file (`/Users/seth/Documents/GitHub/ez-audio/src/index.test.ts`) thoroughly tests that:
- `AudioContext` is created lazily on first use
- The same singleton is reused across `createWhiteNoise()` and `createOscillator()`
- `getAudioContext()` returns the same instance on repeated calls
- `initAudio()` does not re-create the context

This is solid coverage for the AudioContext sharing concern. No action needed.

---

## [MEDIUM] No Cleanup/Dispose Pattern Tests

**Category:** Cross-Cutting
**Description:** The library has no `dispose()`, `destroy()`, or `cleanup()` method on any sound type, and consequently no tests for resource cleanup. The only cleanup-related test found is in `sprite.test.ts`. When users create many sounds (e.g., a drum machine with 8 tracks x 3 samples = 24 Sounds), there is no tested way to release AudioBuffer references, disconnect nodes, or free memory.

While `stop()` disconnects the source node, the AudioBuffer, GainNode, and PannerNode remain allocated. This is a design choice (sounds are replayable), but the lack of any documented or tested cleanup path for long-running applications is a gap.

**Suggestion:** Consider adding a `dispose()` method to `BaseSound` that disconnects all nodes and nulls references, with corresponding tests. At minimum, document the expected cleanup pattern (e.g., "set the Sound variable to null and let GC handle it").

---

## [MEDIUM] Error Propagation From Factory Functions Not Fully Tested

**Category:** Cross-Cutting
**Description:** The `index.test.ts` tests error handling for `initAudio()` (interrupted state) but does not test error propagation through factory functions like `createSound()`, `createTrack()`, `createFont()`, or `createBeatTrack()`. The `load()` function in `index.ts` throws `AudioLoadError` for network failures, HTTP errors, and decode failures, but these paths are not integration-tested.

Specifically untested:
- `createSound('nonexistent.mp3')` throwing `AudioLoadError`
- `createFont('invalid-url')` propagating fetch errors
- `createBeatTrack(['good.mp3', 'bad.mp3'])` -- partial failure behavior
- `createSprite()` with invalid manifest

**Suggestion:** Add integration tests for error paths through factory functions. These can use `vi.fn()` to mock `fetch`:

```typescript
describe('factory function error propagation', () => {
  it('createSound throws AudioLoadError for network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    const { createSound, AudioLoadError } = await import('./index')

    try {
      await createSound('http://example.com/missing.mp3')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AudioLoadError)
    }

    vi.unstubAllGlobals()
  })
})
```

---

## [LOW] Playwright Config Is Well-Structured for Current Needs

**Category:** Config (Positive Finding)
**Description:** The Playwright config at `/Users/seth/Documents/GitHub/ez-audio/playwright.config.ts` is appropriately configured:
- Chromium-only (matching project memory note)
- 30s test timeout, 10s expect timeout -- reasonable for audio demos
- 120s web server startup timeout -- appropriate for VitePress
- HTML reporter for CI artifacts
- Trace collection on first retry
- 1 retry for flaky network tests
- Dev server auto-start with `pnpm dev`

No issues found with the configuration itself.

---

## [LOW] No Mobile Viewport Testing in Playwright Config

**Category:** Config
**Description:** The Playwright config only defines a single `Desktop Chrome` project. Given that the library includes iOS-specific workarounds (`unmuteIosAudio`, `iosWorkaround`, touch event handlers in `useInteractionMethods`), there is no E2E coverage for mobile viewports. Touch event handlers (`touchstart`, `touchend`, `touchcancel`) added by `useInteractionMethods` and `preventEventDefaults` are never tested in E2E.

**Suggestion:** Add a mobile viewport project for smoke testing layout and touch target sizes:

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 5'] },
  },
],
```

This will not test real touch events or iOS audio behavior, but it will catch layout regressions on small screens.

---

## [MEDIUM] Event System Not Tested Across All Sound Types in Integration

**Category:** Cross-Cutting
**Description:** The `base-sound-events.test.ts` file tests the event system (`on`, `once`, `off`, event payloads) but only on `Sound`. The integration test verifies `play` event fires with effects attached, again only on `Sound`. Events are not integration-tested on:
- `Track` (play, stop, pause, resume, seek, end events)
- `Oscillator` (play, stop events)
- `BeatTrack` (play, stop events on individual beats vs the track)
- `LayeredSound` (play, stop events -- are they forwarded from layers?)

The `Track` unit test (`track.test.ts`) and `layered-sound.test.ts` may cover some of these individually, but there is no cross-type integration verification that event contracts are consistent.

**Suggestion:** Add a parameterized integration test that verifies core event behavior across all playable types:

```typescript
describe.each([
  ['Sound', () => createSound(ctx)],
  ['Track', () => createTrack(ctx)],
])('%s event contract', (name, factory) => {
  it('emits play event with source reference', async () => {
    const instance = factory()
    const handler = vi.fn()
    instance.on('play', handler)
    await instance.play()
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ source: instance })
      })
    )
  })
})
```

---

## [LOW] Concurrent Test Missing: Rapid Play-Stop-Play Cycle

**Category:** Integration Gap
**Description:** The concurrent tests cover double-play (layering) and double-stop (no-op), but not the rapid play-stop-play cycle which is common in UI interactions (user clicks play, immediately clicks stop, then clicks play again). This pattern can surface race conditions where `stop()` disconnects a node that `play()` has not yet finished setting up.

**Suggestion:**

```typescript
it('rapid play-stop-play cycle works without errors', async () => {
  const sound = createSound(audioContext)
  const handler = vi.fn()
  sound.on('play', handler)

  await sound.play()
  await sound.stop()
  await sound.play()

  expect(sound.isPlaying).toBe(true)
  expect(handler).toHaveBeenCalledTimes(2)
})
```

---

## Severity Summary

| Severity | Count | Findings |
|----------|-------|----------|
| HIGH     | 2     | No interaction testing in E2E; Integration tests cover only 2 of ~10 module combinations |
| MEDIUM   | 5     | Navigation route gaps; Fixed waits; No cleanup tests; Error propagation gaps; Event cross-type gaps |
| LOW      | 4     | Demo count verification; AudioContext sharing (positive); Playwright mobile viewport; Rapid play-stop-play |

## Priority Recommendations

1. **Highest impact:** Add interaction E2E tests for drum machine, synth keyboard, and basic playback demos. These are the most visible features and most likely to regress.
2. **Second priority:** Add integration tests for Track + effects and BeatTrack workflows, as these represent the most common real-world usage.
3. **Third priority:** Add factory function error propagation tests to ensure `AudioLoadError` surfaces correctly through the public API.
4. **Ongoing:** Replace `waitForTimeout(3000)` with condition-based waits as demos gain `data-ready` attributes or equivalent signals.
