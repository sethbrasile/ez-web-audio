import { expect, test } from '@playwright/test'

/**
 * E2E tests for documentation site navigation.
 * Verifies that key pages load without JavaScript errors.
 */

test.describe('Documentation Site Navigation', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/guide/getting-started', name: 'Getting Started' },
    { path: '/guide/concepts', name: 'Core Concepts' },
    { path: '/examples/', name: 'Examples Overview' },
  ]

  for (const pageInfo of pages) {
    test(`${pageInfo.name} loads without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      await page.goto(pageInfo.path)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForSelector('.VPContent', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Verify no errors
      expect(errors, `${pageInfo.name} should have no errors`).toHaveLength(0)
    })
  }

  test('homepage has correct title', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Check page title
    await expect(page).toHaveTitle(/EZ Web Audio/)
  })
})
