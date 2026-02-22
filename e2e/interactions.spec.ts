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

    await page.goto('/examples/basic-playback')
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

    await page.goto('/examples/effects')
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

    await page.goto('/examples/drum-machine')
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

    await page.goto('/examples/drum-machine')
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

    await page.goto('/examples/synthesis')
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

    await page.goto('/examples/drum-machine-vue')
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

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Drum machine loads and beat cells are visible on mobile', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/examples/drum-machine')
    await page.waitForSelector('.beat-cell', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify at least one beat cell is visible on mobile viewport
    expect(await page.locator('.beat-cell').first().isVisible()).toBe(true)

    // Verify no JS errors during mobile render
    expect(errors, 'drum-machine on mobile should have no page errors').toHaveLength(0)
  })
})
