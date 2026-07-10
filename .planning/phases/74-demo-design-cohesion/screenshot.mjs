/**
 * 74-02 screenshot harness — captures light+dark screenshots of docs pages
 * for the human design gate.
 *
 * Usage:
 *   pnpm dev            # in another terminal (vitepress dev on :5173)
 *   node .planning/phases/74-demo-design-cohesion/screenshot.mjs <page> [...pages]
 *
 * <page> is the path under /examples/ (e.g. `drum-machine`), or `index` for
 * the docs home, or a path starting with `/` for an arbitrary docs route.
 * Output: .planning/phases/74-demo-design-cohesion/screenshots/<name>-{light,dark}.png
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:5173/ez-web-audio'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'screenshots')

const pages = process.argv.slice(2)
if (pages.length === 0) {
  console.error('usage: node screenshot.mjs <page> [...pages]')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const p of pages) {
  const route = p === 'index' ? '/' : p.startsWith('/') ? p : `/examples/${p}`
  const name = p === 'index' ? 'home' : p.replace(/^\//, '').replaceAll('/', '_')
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } })
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })

  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    // VitePress themes by class on <html>, not media query — set it directly.
    await page.evaluate((dark) => {
      document.documentElement.classList.toggle('dark', dark)
    }, scheme === 'dark')
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(OUT, `${name}-${scheme}.png`), fullPage: true })
    console.log(`✓ ${name}-${scheme}.png`)
  }
  await page.close()
}

await browser.close()
