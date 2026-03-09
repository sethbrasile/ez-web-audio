import { expect, test } from '@playwright/test'

/**
 * E2E interaction tests for demo pages.
 * These tests click buttons and verify DOM state changes after interaction.
 * They verify that interactions work correctly — not just that pages load.
 *
 * Goals addressed:
 * - H-10: Interaction tests (click buttons, toggle beats)
 * - M-26: DOM verification after interaction (aria-pressed, text content, disabled state)
 * - L-17: Mobile viewport coverage
 *
 * No waitForTimeout calls — all waits are condition-based.
 */

test.describe('Basic Playback page interactions', () => {
  test('Play Sound button is present and clickable', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/basic-playback')
    await page.waitForSelector('.play-btn', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify button is visible
    expect(await page.locator('.play-btn').isVisible()).toBe(true)

    // Click play button
    await page.locator('.play-btn').click()

    // Verify button still exists after click (handler fired without crashing)
    expect(await page.locator('.play-btn').isVisible()).toBe(true)

    // Verify no uncaught errors
    expect(errors, 'basic-playback should have no page errors').toHaveLength(0)
  })
})

test.describe('Effects page (FilterDemo) interactions', () => {
  test('Filter type select is enabled after starting playback', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/effects')
    await page.waitForSelector('.play-button', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify filter type select is initially disabled (controls disabled until playing)
    expect(await page.locator('#filter-type').isDisabled()).toBe(true)

    // Click play button to start playback
    await page.locator('.play-button').click()

    // Wait for select to become enabled
    await page.waitForFunction(
      () => !document.querySelector('#filter-type')?.hasAttribute('disabled'),
      { timeout: 10000 },
    )

    // Verify select is now enabled
    expect(await page.locator('#filter-type').isDisabled()).toBe(false)

    // Select highpass filter value
    await page.locator('#filter-type').selectOption('highpass')

    // Verify the select now has value 'highpass' — DOM state changed
    expect(await page.locator('#filter-type').inputValue()).toBe('highpass')

    // Click play button again to stop
    await page.locator('.play-button').click()

    // Verify no uncaught errors
    expect(errors, 'effects should have no page errors').toHaveLength(0)
  })
})

test.describe('Drum Machine page interactions', () => {
  test('Beat cell aria-pressed toggles on click', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/drum-machine')
    await page.waitForSelector('.beat-cell', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const beatCell = page.locator('.beat-cell').first()

    // Read initial aria-pressed value
    const initialPressed = await beatCell.getAttribute('aria-pressed')

    // Click the beat cell
    await beatCell.click()

    // Read new aria-pressed value — must differ from initial
    const newPressed = await beatCell.getAttribute('aria-pressed')
    expect(newPressed).not.toBe(initialPressed)

    // Verify no uncaught errors
    expect(errors, 'drum-machine should have no page errors').toHaveLength(0)
  })

  test('Play button text changes to Stop after click', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/drum-machine')
    await page.waitForSelector('.play-btn', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify initial button text is 'Play'
    expect(await page.locator('.play-btn').textContent()).toContain('Play')

    // Click play button
    await page.locator('.play-btn').click()

    // Wait for text to change to 'Stop'
    await page.waitForFunction(
      () => document.querySelector('.play-btn')?.textContent?.trim() === 'Stop',
      { timeout: 10000 },
    )

    // Verify button text is now 'Stop' — DOM state changed
    expect(await page.locator('.play-btn').textContent()).toContain('Stop')

    // Click again to stop
    await page.locator('.play-btn').click()

    // Wait for text to revert to 'Play'
    await page.waitForFunction(
      () => document.querySelector('.play-btn')?.textContent?.trim() === 'Play',
      { timeout: 10000 },
    )

    // Verify no uncaught errors
    expect(errors, 'drum-machine play/stop should have no page errors').toHaveLength(0)
  })
})

test.describe('Synthesis page (OscillatorDemo) interactions', () => {
  test('Synthesis page loads without JS errors and has interactive elements', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/synthesis')
    await page.waitForSelector('.VPContent', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify at least one interactive element is present
    expect(await page.locator('button, input[type="range"]').count()).toBeGreaterThan(0)

    // Verify no uncaught errors
    expect(errors, 'synthesis should have no page errors').toHaveLength(0)
  })
})

test.describe('Drum Machine Vue page interactions', () => {
  test('Beat cell aria-pressed toggles on click', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/drum-machine-vue')
    await page.waitForSelector('.beat-cell', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const beatCell = page.locator('.beat-cell').first()

    // Read initial aria-pressed value
    const initialPressed = await beatCell.getAttribute('aria-pressed')

    // Click the beat cell
    await beatCell.click()

    // Read new aria-pressed value — must differ from initial
    const newPressed = await beatCell.getAttribute('aria-pressed')
    expect(newPressed).not.toBe(initialPressed)

    // Verify no uncaught errors
    expect(errors, 'drum-machine-vue should have no page errors').toHaveLength(0)
  })
})

test.describe('LFO Modulation page interactions', () => {
  test('Play/Stop button toggles text', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/lfo-modulation')
    await page.waitForSelector('.play-button', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify initial button text contains "Play"
    expect(await page.locator('.play-button').textContent()).toContain('Play')

    // Click play button
    await page.locator('.play-button').click()

    // Wait for text to change to "Stop"
    await page.waitForFunction(
      () => document.querySelector('.play-button')?.textContent?.trim() === 'Stop',
      { timeout: 10000 },
    )

    // Verify button text is now "Stop"
    expect(await page.locator('.play-button').textContent()).toContain('Stop')

    // Click again to stop
    await page.locator('.play-button').click()

    // Wait for text to revert to "Play"
    await page.waitForFunction(
      () => document.querySelector('.play-button')?.textContent?.trim() === 'Play',
      { timeout: 10000 },
    )

    // Verify button text reverted
    expect(await page.locator('.play-button').textContent()).toContain('Play')

    // Verify no uncaught errors
    expect(errors, 'lfo play/stop should have no page errors').toHaveLength(0)
  })

  test('Tab switching updates active tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/lfo-modulation')
    await page.waitForSelector('.tab-button', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // First tab (Tremolo) should be active by default
    const tabs = page.locator('.tab-button')
    expect(await tabs.nth(0).getAttribute('class')).toContain('active')

    // Click second tab (Vibrato)
    await tabs.nth(1).click()

    // Verify second tab is now active
    await page.waitForFunction(
      () => document.querySelectorAll('.tab-button')[1]?.classList.contains('active'),
      { timeout: 5000 },
    )
    expect(await tabs.nth(1).getAttribute('class')).toContain('active')
    expect(await tabs.nth(0).getAttribute('class')).not.toContain('active')

    // Click third tab (Filter Sweep)
    await tabs.nth(2).click()

    // Verify third tab is now active
    await page.waitForFunction(
      () => document.querySelectorAll('.tab-button')[2]?.classList.contains('active'),
      { timeout: 5000 },
    )
    expect(await tabs.nth(2).getAttribute('class')).toContain('active')
    expect(await tabs.nth(1).getAttribute('class')).not.toContain('active')

    // Verify no uncaught errors
    expect(errors, 'lfo tab switching should have no page errors').toHaveLength(0)
  })

  test('Canvas element is present and visible', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/lfo-modulation')
    await page.waitForSelector('.waveform-canvas', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify canvas element exists and is visible
    expect(await page.locator('.waveform-canvas').isVisible()).toBe(true)

    // Verify no uncaught errors
    expect(errors, 'lfo canvas should have no page errors').toHaveLength(0)
  })

  test('Sliders are interactive after play', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/lfo-modulation')
    await page.waitForSelector('.play-button', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click Play button
    await page.locator('.play-button').click()

    // Wait for button to show "Stop"
    await page.waitForFunction(
      () => document.querySelector('.play-button')?.textContent?.trim() === 'Stop',
      { timeout: 10000 },
    )

    // Verify range inputs exist (rate and depth sliders)
    const sliders = page.locator('input[type="range"]')
    expect(await sliders.count()).toBeGreaterThanOrEqual(2)

    // Verify sliders are visible and enabled
    expect(await sliders.nth(0).isVisible()).toBe(true)
    expect(await sliders.nth(1).isVisible()).toBe(true)
    expect(await sliders.nth(0).isEnabled()).toBe(true)
    expect(await sliders.nth(1).isEnabled()).toBe(true)

    // Verify no uncaught errors
    expect(errors, 'lfo sliders should have no page errors').toHaveLength(0)
  })
})

test.describe('PolySynth page interactions', () => {
  test('Piano keyboard renders and keys are clickable', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/polysynth')
    await page.waitForSelector('.key.white', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify white and black keys are visible
    expect(await page.locator('.key.white').count()).toBeGreaterThanOrEqual(7)
    expect(await page.locator('.key.black').count()).toBeGreaterThanOrEqual(4)

    // Click a white piano key (C4)
    const c4Key = page.locator('[aria-label="Play C4"]')
    expect(await c4Key.isVisible()).toBe(true)
    await c4Key.click()

    // Verify no JS errors after clicking
    expect(errors, 'polysynth keyboard should have no page errors').toHaveLength(0)
  })

  test('Voice count display is visible', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/polysynth')
    await page.waitForSelector('.voice-badge', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify voice label text is visible
    expect(await page.locator('.voice-label').isVisible()).toBe(true)
    expect(await page.locator('.voice-label').textContent()).toContain('Voices')

    // Verify voice numbers display
    expect(await page.locator('.voice-numbers').isVisible()).toBe(true)

    // Verify fill bar element exists
    expect(await page.locator('.fill-bar').isVisible()).toBe(true)

    // Verify no JS errors
    expect(errors, 'polysynth voice count should have no page errors').toHaveLength(0)
  })

  test('Steal strategy dropdown changes value', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/polysynth')
    await page.waitForSelector('[aria-label="Steal strategy"]', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const dropdown = page.locator('[aria-label="Steal strategy"]')

    // Verify dropdown has expected options
    const options = await dropdown.locator('option').allTextContents()
    expect(options).toContain('Oldest (LRU)')
    expect(options).toContain('Oldest Active')
    expect(options).toContain('Quietest')

    // Verify initial value is 'lru'
    expect(await dropdown.inputValue()).toBe('lru')

    // Change to 'oldest-active'
    await dropdown.selectOption('oldest-active')

    // Verify selection changed
    expect(await dropdown.inputValue()).toBe('oldest-active')

    // Verify no JS errors
    expect(errors, 'polysynth strategy dropdown should have no page errors').toHaveLength(0)
  })

  test('ADSR sliders are present and interactive', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/polysynth')
    await page.waitForSelector('.adsr-row', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify 4 ADSR sliders exist
    const sliders = page.locator('.adsr-row input[type="range"]')
    expect(await sliders.count()).toBe(4)

    // Verify preset buttons exist
    const presetBtns = page.locator('.preset-btn')
    expect(await presetBtns.count()).toBe(4)
    expect(await presetBtns.nth(0).textContent()).toContain('Piano')
    expect(await presetBtns.nth(1).textContent()).toContain('Pad')
    expect(await presetBtns.nth(2).textContent()).toContain('Pluck')
    expect(await presetBtns.nth(3).textContent()).toContain('Lead')

    // Read initial slider values (attack slider = first)
    const attackBefore = await sliders.nth(0).inputValue()

    // Click "Pad" preset (long attack = 0.5, different from default 0.01)
    await presetBtns.nth(1).click()

    // Wait for slider value to update
    await page.waitForFunction(
      () => {
        const slider = document.querySelector('.adsr-row input[type="range"]') as HTMLInputElement
        return slider && slider.value !== '0.01'
      },
      { timeout: 5000 },
    )

    // Verify at least one slider changed value
    const attackAfter = await sliders.nth(0).inputValue()
    expect(attackAfter).not.toBe(attackBefore)

    // Verify no JS errors
    expect(errors, 'polysynth ADSR should have no page errors').toHaveLength(0)
  })
})

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Drum machine loads and beat cells are visible on mobile', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('examples/drum-machine')
    await page.waitForSelector('.beat-cell', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify at least one beat cell is visible on mobile viewport
    expect(await page.locator('.beat-cell').first().isVisible()).toBe(true)

    // Verify no JS errors during mobile render
    expect(errors, 'drum-machine on mobile should have no page errors').toHaveLength(0)
  })
})
