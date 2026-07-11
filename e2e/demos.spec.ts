import { expect, test } from '@playwright/test'
import { DEMO_PAGES } from './demo-pages'

/**
 * E2E tests for interactive demo components.
 * These tests verify that demo pages load without JavaScript errors.
 * They do NOT test audio playback (not possible in headless browser).
 *
 * Primary goal: Ensure all demo pages render without uncaught exceptions.
 */

test.describe('Demo Pages - Error Detection', () => {
  for (const path of DEMO_PAGES) {
    test(`${path} loads without JavaScript errors`, async ({ page }) => {
      const errors: string[] = []

      // Capture uncaught exceptions
      page.on('pageerror', err => errors.push(err.message))

      // Navigate and wait
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForSelector('.VPContent', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Verify no uncaught errors
      expect(errors, `${path} should have no page errors`).toHaveLength(0)
    })
  }
})
