# Phase 63: llms.txt Support - Research

**Researched:** 2026-03-07
**Domain:** VitePress plugin configuration, llms.txt standard, build pipeline
**Confidence:** HIGH

## Summary

This phase adds llms.txt support via `vitepress-plugin-llms` (v1.11.0), a well-established VitePress plugin used by Vite, Vue.js, and Vitest themselves. The plugin hooks into VitePress's build pipeline to generate `/llms.txt` (index), `/llms-full.txt` (concatenated docs), and per-page `.md` files. It provides `<llm-only>` and `<llm-exclude>` custom tags for content control.

The main implementation work involves: (1) installing and configuring the plugin, (2) wrapping ~20 interactive Vue component tags in `<llm-exclude>` with companion `<llm-only>` descriptions, (3) adding a visible footer on every page via VitePress layout slots, and (4) a post-build script to patch the footer with the actual `llms-full.txt` file size.

**Primary recommendation:** Use `vitepress-plugin-llms` with minimal configuration (defaults are good), VitePress `doc-footer-before` layout slot for the footer, and a Node.js post-build script for file size patching.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Wrap interactive Vue demo component tags (e.g., `<DrumMachine/>`, `<PianoKeyboard/>`) in `<llm-exclude>` tags so they don't appear in llms-full.txt
- Add `<llm-only>` annotations near each excluded demo with a demo-specific description
- Only exclude interactive Vue component demos -- all prose, code examples, and API reference pages stay in
- Use a post-build script that runs after VitePress build, reads the generated llms-full.txt file size, and patches the footer HTML with the actual size (no custom Vite plugin or hardcoded estimate)
- Both a visible HTML footer on every page AND an `<llm-only>` block in the docs content
- Footer text pattern: "AI assistants: full documentation available at /llms.txt (index) and /llms-full.txt (NN KB, complete)."

### Claude's Discretion
- Exact post-build script implementation (Node.js, shell, etc.)
- Footer styling and placement within VitePress theme
- Whether to use VitePress layout slots or theme footer config
- Exact wording of demo-specific `<llm-only>` descriptions
- Plugin configuration options beyond defaults (if any are beneficial)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitepress-plugin-llms | ^1.11.0 | Generate llms.txt, llms-full.txt, per-page .md | Used by Vite, Vue.js, Vitest; de facto standard for VitePress |

### Supporting
No additional libraries needed. The post-build script uses Node.js built-ins (`fs`, `path`, `glob`).

**Installation:**
```bash
pnpm add -D vitepress-plugin-llms
```

## Architecture Patterns

### Plugin Configuration

The plugin accepts a settings object. For this project, most defaults are appropriate:

```typescript
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [
      llmstxt({
        // domain prepends absolute URLs in llms.txt
        domain: 'https://sethbrasile.github.io/ez-web-audio',
      })
    ],
  },
})
```

Key defaults that work well:
- `generateLLMsTxt: true` -- generates index file
- `generateLLMsFullTxt: true` -- generates concatenated file
- `generateLLMFriendlyDocsForEachPage: true` -- per-page .md files
- `stripHTML: true` -- removes HTML tags from LLM output (good for clean markdown)
- `excludeIndexPage: true` -- excludes the homepage from the TOC (fine; homepage is a landing page)

### Content Control Tags

The plugin provides two custom markdown tags processed at build time:

**`<llm-exclude>`**: Content inside is removed from llms-full.txt and per-page .md files, but renders normally in the HTML site.

**`<llm-only>`**: Content inside appears in llms-full.txt and per-page .md files, but is hidden from website visitors (rendered as `display: none` div).

Pattern for each interactive demo:
```markdown
<llm-exclude>
<DrumMachine />
</llm-exclude>

<llm-only>
[Interactive drum machine step sequencer demo with kick, snare, and hi-hat patterns at configurable BPM]
</llm-only>
```

### Footer via Layout Slot

VitePress provides a `doc-footer-before` slot when using `layout: 'doc'` (the default for non-home pages). Create a wrapper Layout component:

```vue
<!-- docs/.vitepress/theme/LlmsFooter.vue -->
<template>
  <p class="llms-footer">
    AI assistants: full documentation available at
    <a href="/ez-web-audio/llms.txt">/llms.txt</a> (index) and
    <a href="/ez-web-audio/llms-full.txt">/llms-full.txt</a>
    (<span class="llms-full-size">NN KB</span>, complete).
  </p>
</template>
```

Register via Layout wrapper in theme/index.ts:
```typescript
// docs/.vitepress/theme/CustomLayout.vue
<script setup>
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-footer-before>
      <LlmsFooter />
    </template>
  </Layout>
</template>
```

Then in theme/index.ts:
```typescript
import CustomLayout from './CustomLayout.vue'

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) { /* existing component registrations */ },
} satisfies Theme
```

**Important note about the home page**: The `doc-footer-before` slot only applies to `layout: 'doc'` pages. The homepage uses `layout: 'home'`, so the footer will not appear there. This is acceptable since the homepage is a landing page, not documentation. If footer visibility on the home page is desired, the `layout-bottom` slot works across all layouts.

### Post-Build Script for File Size

A Node.js script that runs after `vitepress build docs`:

1. Read the generated `docs/.vitepress/dist/llms-full.txt`
2. Get its file size in KB
3. Find all `.html` files in dist
4. Replace the placeholder `NN KB` with the actual size
5. Also patch the `llms-full.txt` itself (the `<llm-only>` footer block will contain the placeholder too)

```javascript
// scripts/patch-llms-size.mjs
import { readFileSync, writeFileSync, statSync } from 'fs'
import { globSync } from 'fs'
// or use node:fs + simple recursive dir walk

const distDir = 'docs/.vitepress/dist'
const llmsFullPath = `${distDir}/llms-full.txt`
const stats = statSync(llmsFullPath)
const sizeKB = Math.round(stats.size / 1024)

// Patch all HTML files
// Replace "NN KB" placeholder with actual size
```

Update package.json scripts:
```json
{
  "docs:build": "typedoc && vitepress build docs && node scripts/patch-llms-size.mjs"
}
```

### Vue Component Tags to Wrap

Based on grep of all `<ComponentName />` tags in example pages:

| File | Component | Description for `<llm-only>` |
|------|-----------|------------------------------|
| synthesis.md | `<OscillatorDemo />` | Interactive oscillator with waveform selector and frequency slider |
| visualization.md | `<VisualizationDemo />` | Real-time audio waveform and frequency visualization |
| xy-pad.md | `<XYPad />` | Two-dimensional touch/mouse pad controlling frequency and filter cutoff |
| ambient-generator.md | `<AmbientGenerator />` | Ambient soundscape generator with layered oscillators |
| synth-keyboard.md | `<SynthKeyboard />` | Playable synthesizer keyboard with ADSR controls |
| audio-routing.md | `<DistortionDemo />` | Audio routing demo with distortion effect chain |
| drum-machine-vanilla.md | `<DrumMachineVanilla />` | Vanilla TypeScript drum machine using event-based pattern |
| effects.md | `<FilterDemo />` | Audio filter demo with lowpass, highpass, and bandpass controls |
| sampled-drum-kit.md | `<SampledDrumKit />` | Sampled drum kit with clickable pads |
| soundfont-piano.md | `<SoundfontPiano />` | Piano keyboard using soundfont samples |
| drum-machine.md | `<DrumMachine />` | Step sequencer drum machine with kick, snare, and hi-hat |
| drum-machine-vue.md | `<DrumMachineVue />` | Vue reactive drum machine pattern |
| basic-playback.md | `<AudioDemo />` | Basic audio file playback with play/stop controls |
| basic-playback.md | `<TrackDemo />` | Music track with position tracking, pause, and seek |
| audio-sprite.md | `<AudioSpriteDemo />` | Audio sprite player with named segment selection |
| synth-drum-kit.md | `<SynthDrumKit />` | Synthesized drum kit with oscillator-based percussion |
| layered-sound.md | `<PlayTogetherDemo />` | Play multiple sounds simultaneously |
| layered-sound.md | `<LayeredSoundDemo />` | Layered sound with volume mixing |
| crossfade.md | `<CrossfadeDemo />` | Crossfade between two audio tracks |
| timing.md | `<TimingDemo />` | Timing and scheduling demo |

Total: 20 component instances across 16 files that need `<llm-exclude>` + `<llm-only>` treatment.

### `<llm-only>` Block for Footer in Content

In addition to the visible HTML footer, add an `<llm-only>` block. This could go in a shared markdown snippet or be added to a layout-level inclusion. The simplest approach: add it to `docs/index.md` since that is the entry point, and let llms-full.txt pick it up:

```markdown
<llm-only>
AI assistants: full documentation available at /llms.txt (index) and /llms-full.txt (NN KB, complete).
</llm-only>
```

### Anti-Patterns to Avoid
- **Hardcoding file size**: The llms-full.txt size changes with every docs update. Always compute at build time.
- **Using a custom Vite plugin for size patching**: Vite plugins run before the llms plugin generates output. The size is only known after build completes, so a post-build script is the correct approach.
- **Forgetting base path**: The site uses `base: '/ez-web-audio/'`, so links in the footer must include the base path prefix (e.g., `/ez-web-audio/llms.txt`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| llms.txt generation | Custom markdown concatenation | vitepress-plugin-llms | Handles frontmatter stripping, TOC generation, content tags, per-page files |
| File size display | Hardcoded estimate | Post-build script reading fs.statSync | Stays accurate automatically |

## Common Pitfalls

### Pitfall 1: Base Path in Footer Links
**What goes wrong:** Links to `/llms.txt` return 404 because the site is deployed at `/ez-web-audio/`
**Why it happens:** VitePress `base` config is `/ez-web-audio/` but footer hardcodes root paths
**How to avoid:** Use `withBase()` from VitePress or hardcode `/ez-web-audio/llms.txt` in the footer component
**Warning signs:** 404 when clicking footer links in preview

### Pitfall 2: stripHTML Removing Code Blocks
**What goes wrong:** `stripHTML: true` (the default) might strip inline HTML that is intentional in code examples
**Why it happens:** The plugin uses remark to strip HTML nodes from the AST
**How to avoid:** This should not be an issue since code blocks are fenced (triple backtick), which are parsed as code nodes not HTML nodes. But verify in output.
**Warning signs:** Missing content in llms-full.txt that exists in the source markdown

### Pitfall 3: Homepage Not Getting Footer
**What goes wrong:** The `doc-footer-before` slot does not render on `layout: 'home'` pages
**Why it happens:** VitePress only renders doc-specific slots on doc layout pages
**How to avoid:** Use `layout-bottom` slot if home page footer is required, or accept that the home page (a landing page) does not need the AI footer
**Warning signs:** Footer missing on homepage only

### Pitfall 4: Post-Build Script Placeholder Mismatch
**What goes wrong:** The placeholder text in HTML does not match what the script searches for
**Why it happens:** Vue template compilation may alter whitespace or encoding
**How to avoid:** Use a distinctive placeholder string (e.g., `__LLMS_FULL_SIZE__`) rather than natural text like "NN KB"
**Warning signs:** File size not replaced in built output

### Pitfall 5: `<script setup>` Tags in Markdown
**What goes wrong:** Pages with `<script setup>` imports for Vue components — the `<llm-exclude>` must only wrap the component tag, not the script setup block
**Why it happens:** Moving `<script setup>` inside `<llm-exclude>` would break the page
**How to avoid:** Only wrap the component invocation tag, never the script setup block
**Warning signs:** Page fails to render after adding exclude tags

## Code Examples

### Plugin Configuration (Recommended)
```typescript
// docs/.vitepress/config.mts
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [
      llmstxt({
        domain: 'https://sethbrasile.github.io/ez-web-audio',
      })
    ],
  },
})
```

### Content Tag Pattern
```markdown
## Try It: Oscillator Demo

Experiment with different waveforms and frequencies.

<llm-exclude>
<OscillatorDemo />
</llm-exclude>

<llm-only>
[Interactive oscillator demo: select waveform type (sine, square, sawtooth, triangle), adjust frequency with a slider, and hear the result in real time. Note name updates as frequency changes.]
</llm-only>

### Code

```typescript
// Code examples remain visible to both humans and LLMs
```
```

### Layout Wrapper for Footer
```vue
<!-- docs/.vitepress/theme/CustomLayout.vue -->
<script setup>
import DefaultTheme from 'vitepress/theme'
import LlmsFooter from './components/LlmsFooter.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-footer-before>
      <LlmsFooter />
    </template>
  </Layout>
</template>
```

### Footer Component
```vue
<!-- docs/.vitepress/theme/components/LlmsFooter.vue -->
<script setup>
import { withBase } from 'vitepress'
</script>

<template>
  <div class="llms-footer">
    <p>
      AI assistants: full documentation available at
      <a :href="withBase('/llms.txt')">/llms.txt</a> (index) and
      <a :href="withBase('/llms-full.txt')">/llms-full.txt</a>
      (<span class="llms-full-size">__LLMS_FULL_SIZE__</span>, complete).
    </p>
  </div>
</template>

<style scoped>
.llms-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}
</style>
```

### Post-Build Script
```javascript
// scripts/patch-llms-size.mjs
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const distDir = 'docs/.vitepress/dist'
const llmsFullPath = join(distDir, 'llms-full.txt')

const stats = statSync(llmsFullPath)
const sizeKB = Math.round(stats.size / 1024)
const sizeStr = `${sizeKB} KB`

function walkDir(dir, callback) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) walkDir(fullPath, callback)
    else callback(fullPath)
  }
}

walkDir(distDir, (filePath) => {
  if (filePath.endsWith('.html') || filePath.endsWith('.txt')) {
    const content = readFileSync(filePath, 'utf-8')
    if (content.includes('__LLMS_FULL_SIZE__')) {
      writeFileSync(filePath, content.replaceAll('__LLMS_FULL_SIZE__', sizeStr))
    }
  }
})

console.log(`Patched llms-full.txt size: ${sizeStr}`)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual llms.txt authoring | vitepress-plugin-llms auto-generation | 2024 | Automatic, stays in sync with docs |
| No LLM discoverability | llms.txt standard (llmstxt.org) | 2024 | AI assistants can ingest full docs in one request |

## Open Questions

1. **`excludeIndexPage` default behavior**
   - What we know: The plugin defaults `excludeIndexPage: true`, which excludes the homepage from the llms.txt TOC
   - What's unclear: Whether this also excludes it from llms-full.txt or just the index
   - Recommendation: Accept the default; the homepage is a landing page with no unique API content. If it should be included, set `excludeIndexPage: false`.

2. **`domain` option and base path interaction**
   - What we know: The `domain` option prepends a domain to URLs in llms.txt. The site uses `base: '/ez-web-audio/'`.
   - What's unclear: Whether the plugin automatically appends the VitePress base path to the domain URLs
   - Recommendation: Test with `domain: 'https://sethbrasile.github.io/ez-web-audio'` (including the base path in the domain). Verify the generated llms.txt URLs are correct.

## Sources

### Primary (HIGH confidence)
- [vitepress-plugin-llms GitHub](https://github.com/okineadev/vitepress-plugin-llms) - README, features, installation
- [DeepWiki analysis](https://deepwiki.com/okineadev/vitepress-plugin-llms) - Full TypeScript types, configuration interface, remark pipeline details
- [VitePress extending default theme](https://vitepress.dev/guide/extending-default-theme) - Layout slots documentation

### Secondary (MEDIUM confidence)
- [GitHub releases](https://github.com/okineadev/vitepress-plugin-llms/releases) - Version history, v1.11.0 latest

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - single well-known plugin, used by Vue/Vite/Vitest
- Architecture: HIGH - plugin API, VitePress layout slots, and content tags are well-documented
- Pitfalls: MEDIUM - base path interaction and stripHTML behavior need build-time verification

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable plugin, slow-moving domain)
