# Phase 7: Documentation & Demo Site - Research

**Researched:** 2026-02-01
**Domain:** TypeScript library documentation with VitePress + TypeDoc
**Confidence:** HIGH

## Summary

VitePress is a Vite & Vue-powered static site generator designed for fast, content-centric documentation sites with first-class TypeScript support. TypeDoc generates API reference documentation from TypeScript source code with JSDoc comments. The `typedoc-vitepress-theme` plugin bridges these tools, auto-generating VitePress-compatible markdown and sidebar navigation from TypeDoc output.

The project currently has:
- TypeDoc already configured (`build:docs` script generates to `./docs`)
- Vanilla TypeScript demo app (not VitePress) with interactive examples in `src/app/`
- GitHub Actions workflow for deployment
- Some JSDoc documentation (older YUIDoc style in places like Track class)

**Migration path:** Convert existing vanilla TS demo app to VitePress, enhance JSDoc coverage, integrate TypeDoc via `typedoc-vitepress-theme`, and create getting started guide.

**Primary recommendation:** Use VitePress 1.x with `typedoc-vitepress-theme` plugin for seamless TypeDoc integration. Create interactive examples using Vue components in markdown (VitePress native capability). Focus documentation effort on JSDoc comments with `@example` tags showing real-world usage patterns.

## Standard Stack

The established libraries/tools for TypeScript library documentation in 2026:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| VitePress | 1.x | Static site generator | Official Vue team SSG, production-ready since 1.0, TypeScript native, fast Vite-powered dev |
| TypeDoc | 0.26+ | API reference generator | De-facto TypeScript documentation tool, generates from source + JSDoc, extensive plugin ecosystem |
| typedoc-plugin-markdown | latest | Markdown output | Enables TypeDoc to output markdown instead of HTML for integration with static site generators |
| typedoc-vitepress-theme | latest | VitePress integration | Auto-generates VitePress sidebar, formats TypeDoc output for VitePress compatibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitepress-demo-preview | latest | Component demos | Show Vue component code + live preview (like element-plus docs) |
| Shiki | built-in | Syntax highlighting | Ships with VitePress, no additional config needed |
| @mdit-vue/plugin-component | built-in | Vue in markdown | Ships with VitePress for component interpolation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| VitePress | Docusaurus | React-based, heavier, more features but slower. VitePress is faster and Vue-native |
| VitePress | VuePress | VitePress is VuePress successor - simpler, faster, better DX |
| TypeDoc + plugin | JSDoc | JSDoc doesn't understand TypeScript types. TypeDoc is TypeScript-native |
| typedoc-vitepress-theme | Manual markdown | Plugin auto-generates sidebar and handles linking. Manual = maintenance burden |

**Installation:**
```bash
pnpm add -D vitepress typedoc typedoc-plugin-markdown typedoc-vitepress-theme
# Optional: for enhanced demos
pnpm add -D vitepress-demo-preview
```

## Architecture Patterns

### Recommended Project Structure
```
.vitepress/
├── config.mts              # VitePress configuration
├── theme/
│   ├── index.ts            # Custom theme entry (extends default)
│   └── components/         # Global demo components
│       ├── AudioExample.vue
│       └── InteractiveDemo.vue
docs/                       # Documentation markdown files
├── index.md                # Homepage
├── guide/
│   ├── getting-started.md
│   ├── concepts.md
│   └── examples/
│       ├── basic-playback.md
│       ├── synthesis.md
│       └── effects.md
├── api/                    # TypeDoc-generated (auto-generated)
│   ├── index.md
│   ├── classes/
│   └── typedoc-sidebar.json
└── public/                 # Static assets (audio files for demos)
src/
├── index.ts                # Library entry (with JSDoc)
├── sound.ts                # Classes with JSDoc
└── ...
typedoc.json                # TypeDoc configuration
```

### Pattern 1: TypeDoc Integration via Plugin
**What:** Use `typedoc-vitepress-theme` to auto-generate API reference as VitePress pages
**When to use:** Always for TypeScript libraries with public API
**Example:**
```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme"],
  "exclude": ["**/*.test.ts", "src/app/**"],
  "excludePrivate": true,
  "excludeProtected": true
}
```

```typescript
// .vitepress/config.mts
import { defineConfig } from 'vitepress'
import typedocSidebar from '../docs/api/typedoc-sidebar.json'

export default defineConfig({
  title: 'EZ Web Audio',
  description: 'Making the Web Audio API super EZ',
  base: '/ez-web-audio/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Concepts', link: '/guide/concepts' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: typedocSidebar
        }
      ]
    }
  }
})
```

**Source:** [typedoc-vitepress-theme Quick Start](https://typedoc-plugin-markdown.org/plugins/vitepress/quick-start)

### Pattern 2: Interactive Examples in Markdown
**What:** Embed Vue components directly in markdown for live demos
**When to use:** For all feature examples requiring user interaction
**Example:**
```markdown
<!-- docs/guide/examples/basic-playback.md -->
# Basic Playback

Play a sound file with just a few lines of code:

<script setup>
import { ref } from 'vue'
import AudioExample from '../../.vitepress/theme/components/AudioExample.vue'

const code = `import { initAudio, createSound } from 'ez-web-audio'

const sound = await createSound('path/to/file.mp3')
sound.play()
`
</script>

<AudioExample :code="code" url="/audio/example.mp3" />

The `createSound` function loads an audio file and returns a Promise...
```

```vue
<!-- .vitepress/theme/components/AudioExample.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  code: string
  url: string
}>()

async function playSound() {
  // Import library dynamically in browser
  const { initAudio, createSound } = await import('ez-web-audio')
  await initAudio()
  const sound = await createSound(props.url)
  sound.play()
}
</script>

<template>
  <div class="audio-example">
    <button @click="playSound">
      Play
    </button>
    <pre><code>{{ code }}</code></pre>
  </div>
</template>
```

**Source:** [VitePress Using Vue in Markdown](https://vitepress.dev/guide/using-vue)

### Pattern 3: JSDoc with @example Tags
**What:** Document every public method with description, parameters, returns, and working code examples
**When to use:** Always for public API
**Example:**
```typescript
/**
 * Creates a Sound instance from an audio file URL.
 *
 * Loads and decodes the audio file into an AudioBuffer. The returned Sound
 * can be played multiple times, with each `.play()` call creating a new
 * AudioBufferSourceNode for simultaneous playback.
 *
 * @param url - The URL of the audio file to load (mp3, wav, ogg, etc.)
 * @returns Promise that resolves to a Sound instance when loaded
 * @throws {AudioLoadError} If the file fails to load or decode
 *
 * @example
 * ```typescript
 * import { createSound } from 'ez-web-audio'
 *
 * // Basic usage
 * const sound = await createSound('click.mp3')
 * sound.play()
 *
 * // With configuration
 * const sound = await createSound('music.mp3')
 * sound.changeGainTo(0.5)  // Set volume to 50%
 * sound.play()
 * ```
 *
 * @example
 * ```typescript
 * // Handle errors
 * try {
 *   const sound = await createSound('missing.mp3')
 * } catch (error) {
 *   if (error instanceof AudioLoadError) {
 *     console.error('Failed to load:', error.url)
 *   }
 * }
 * ```
 */
export async function createSound(url: string): Promise<Sound> {
  return load(url, 'sound') as Promise<Sound>
}
```

**Source:** [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html), [JSDoc @example](https://jsdoc.app/tags-param)

### Pattern 4: Getting Started Guide Structure
**What:** Progressive tutorial that builds from simple to complex
**When to use:** Always - first thing users read
**Example structure:**
```markdown
# Getting Started

## Installation

\`\`\`bash
pnpm add ez-web-audio
\`\`\`

## Your First Sound

The simplest example - play a sound file:

\`\`\`typescript
import { initAudio, createSound } from 'ez-web-audio'

// Must be called in response to user interaction
button.addEventListener('click', async () => {
  await initAudio()
  const sound = await createSound('click.mp3')
  sound.play()
})
\`\`\`

### Why initAudio()?

Browsers require user interaction before playing audio...

## Playing Music Tracks

For longer audio files with pause/resume:

\`\`\`typescript
import { createTrack } from 'ez-web-audio'

const track = await createTrack('song.mp3')
track.play()
track.pause()
track.seek(30) // Jump to 30 seconds
\`\`\`

## Synthesis

Generate sounds from scratch with oscillators:

\`\`\`typescript
import { createOscillator } from 'ez-web-audio'

const synth = await createOscillator({
  frequency: 440,
  type: 'sine'
})
synth.play()
\`\`\`

## Next Steps

- [Core Concepts](./concepts) - Understand Sound vs Track vs Oscillator
- [Interactive Examples](./examples/) - Try features in your browser
- [API Reference](/api/) - Complete documentation
```

**Source:** [Documentation Best Practices - Write the Docs](https://www.writethedocs.org/guide/index.html), [GitHub Documentation Guide](https://github.blog/developer-skills/documentation-done-right-a-developers-guide/)

### Anti-Patterns to Avoid

- **Don't use `<style scoped>` in markdown:** Causes page bloat. Use `<style module>` instead or define styles in theme.
- **Don't put `<script>`/`<style>` before frontmatter:** VitePress requires frontmatter at top of file.
- **Don't generate docs to version-controlled directory without .gitignore:** TypeDoc output (except sidebar JSON) should be build-time only.
- **Don't use `any` type in examples:** Shows bad TypeScript practices. Use proper types or `unknown`.
- **Don't document internal/private APIs:** Use `excludePrivate: true` in TypeDoc config.

**Source:** [VitePress Using Vue](https://vitepress.dev/guide/using-vue), [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API reference generation | Custom script to parse TS | TypeDoc | Handles complex TS types, generics, inheritance, cross-linking |
| Sidebar navigation | Manual JSON file | typedoc-sidebar.json auto-generation | Stays in sync with code structure, updates on rebuild |
| Syntax highlighting | Prism.js manual setup | Shiki (built into VitePress) | Better highlighting, theme support, SSR-compatible |
| Code playground | Custom iframe sandbox | VitePress Vue components | SSR-compatible, can import actual library code |
| Markdown processing | Custom parser | VitePress markdown-it plugins | Handles frontmatter, Vue interpolation, code blocks correctly |
| Search functionality | Custom search index | VitePress built-in search | Works out of box, indexes all content automatically |
| Dark mode | Custom CSS variables | VitePress default theme | Includes OS preference detection, persistence, toggle UI |

**Key insight:** Documentation tooling is mature in 2026. VitePress + TypeDoc handles 90% of needs out-of-box. Custom solutions introduce maintenance burden and miss edge cases (mobile, SSR, a11y).

## Common Pitfalls

### Pitfall 1: Incomplete JSDoc Coverage
**What goes wrong:** TypeDoc generates incomplete API reference with missing descriptions, parameters, or return types
**Why it happens:** Easy to document class but forget methods, or document signature without explaining behavior
**How to avoid:**
- Use ESLint rule `eslint-plugin-jsdoc` to enforce JSDoc on public exports
- Include at least one `@example` tag for each public function
- Document not just "what" but "why" and "when"
**Warning signs:**
- TypeDoc generates pages with only type signatures
- Users file issues asking "how do I..." for documented features

**Example check:**
```bash
# All exported functions should have JSDoc
grep -r "^export (async )?function" src/ | wc -l  # Total exports
grep -r -B2 "^export (async )?function" src/ | grep "/\*\*" | wc -l  # Documented
# Numbers should match
```

### Pitfall 2: Examples That Don't Work
**What goes wrong:** Code examples in docs fail when users copy-paste them
**Why it happens:**
- Examples written from memory, not tested
- Library API changed but examples weren't updated
- Examples assume context not shown (imports, setup)
**How to avoid:**
- Extract examples from actual test files (if tests are readable)
- Use interactive VitePress components that execute real library code
- Include full context in examples (all imports, setup)
- CI check: Parse examples and run them through TypeScript compiler
**Warning signs:**
- "This example doesn't work" issues
- Examples missing imports
- Examples using deprecated APIs

### Pitfall 3: Docs Out of Sync with Code
**What goes wrong:** Documentation describes old behavior, users get confused
**Why it happens:** Code changes in PR but docs aren't updated
**How to avoid:**
- Run TypeDoc in CI - fails if JSDoc syntax invalid
- Include docs checklist in PR template
- Use `predocs` script hook to regenerate before dev/build
- Link to specific version of docs (v1.0 docs vs latest)
**Warning signs:**
- TypeDoc warnings about unresolved links
- Examples reference removed functions
- "Documentation says X but code does Y" issues

### Pitfall 4: Poor Getting Started UX
**What goes wrong:** Users can't figure out how to use library from docs
**Why it happens:**
- Documentation is reference-only (no tutorial)
- Examples are too complex for beginners
- Critical concepts (like `initAudio()` requirement) buried in API docs
**How to avoid:**
- Write Getting Started guide first, before API reference
- Test guide by having someone unfamiliar try it
- Start with simplest possible example (one file, no config)
- Progressively add complexity
- Explain "why" for non-obvious requirements (browser audio limitations)
**Warning signs:**
- High ratio of "how do I..." issues
- Users jumping straight to API reference without reading guide
- Examples in issues that misuse core concepts

### Pitfall 5: VitePress Base Path Mismatch
**What goes wrong:** Site works in dev but breaks in production (404s, broken links)
**Why it happens:** GitHub Pages serves at `/repo-name/` but dev serves at `/`
**How to avoid:**
- Set `base: '/ez-web-audio/'` in VitePress config
- Test production build locally with `vitepress preview`
- Use relative links in markdown (`./other-page` not `/other-page`)
- Use VitePress helpers for asset links
**Warning signs:**
- Works in dev, 404s in production
- CSS/JS loads but pages don't
- TypeDoc links break

**Example fix:**
```typescript
// .vitepress/config.mts
export default defineConfig({
  base: process.env.BASE_PATH || '/ez-web-audio/', // Match GitHub repo name
  // ...
})
```

### Pitfall 6: Audio Files Not Loading in Demos
**What goes wrong:** Interactive examples work locally but fail in production
**Why it happens:**
- Audio files not in VitePress `public/` directory
- CORS issues with external audio
- Audio files too large (slow load)
**How to avoid:**
- Place demo audio in `docs/public/audio/`
- Use small, compressed audio files for demos (<100KB)
- Provide loading states in demo components
- Test demos with throttled network
**Warning signs:**
- Console errors about failed fetches
- Demos stuck on "loading"
- Network tab shows 404 for audio files

## Code Examples

Verified patterns from official sources:

### VitePress Configuration with TypeDoc Sidebar
```typescript
// .vitepress/config.mts
// Source: https://typedoc-plugin-markdown.org/plugins/vitepress/quick-start
import { defineConfig } from 'vitepress'
import typedocSidebar from '../docs/api/typedoc-sidebar.json'

export default defineConfig({
  title: 'EZ Web Audio',
  description: 'Making the Web Audio API super EZ since 2024',
  base: '/ez-web-audio/',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Examples', link: '/examples/' },
      { text: 'API', link: '/api/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/concepts' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: typedocSidebar
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sethbrasile/ez-web-audio' }
    ]
  }
})
```

### TypeDoc Configuration for VitePress
```json
// typedoc.json
// Source: https://typedoc-plugin-markdown.org/plugins/vitepress/quick-start
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": [
    "typedoc-plugin-markdown",
    "typedoc-vitepress-theme"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/app/**"
  ],
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "readme": "none",
  "navigation": {
    "includeCategories": true,
    "includeGroups": true
  }
}
```

### Package.json Scripts Integration
```json
// package.json
// Source: https://typedoc-plugin-markdown.org/plugins/vitepress/quick-start
{
  "scripts": {
    "docs:dev": "typedoc && vitepress dev docs",
    "docs:build": "typedoc && vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### Interactive Audio Component
```vue
<!-- .vitepress/theme/components/AudioExample.vue -->
<!-- Source: https://vitepress.dev/guide/using-vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  url: string
}>()

const playing = ref(false)
const error = ref('')

async function play() {
  try {
    error.value = ''
    playing.value = true

    // Dynamic import to avoid SSR issues
    const { initAudio, createSound } = await import('ez-web-audio')
    await initAudio()

    const sound = await createSound(props.url)
    sound.play()

    // Reset after typical sound duration
    setTimeout(() => { playing.value = false }, 2000)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to play'
    playing.value = false
  }
}

function stop() {
  playing.value = false
}
</script>

<template>
  <div class="audio-example">
    <div class="controls">
      <button :disabled="playing" @click="play">
        Play
      </button>
      <button :disabled="!playing" @click="stop">
        Stop
      </button>
      <span v-if="error" class="error">{{ error }}</span>
    </div>
    <div class="code">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.audio-example {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-brand);
  background: var(--vp-c-brand);
  color: white;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: var(--vp-c-danger);
}
</style>
```

### Using Interactive Component in Markdown
```markdown
<!-- docs/examples/basic-playback.md -->
---
title: Basic Playback
---

# Basic Playback

<script setup>
import AudioExample from '../.vitepress/theme/components/AudioExample.vue'
</script>

## Play a Sound

Try it yourself:

<AudioExample url="/audio/click.mp3">

\`\`\`typescript
import { initAudio, createSound } from 'ez-web-audio'

const sound = await createSound('click.mp3')
sound.play()
\`\`\`

</AudioExample>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate TypeDoc HTML site | TypeDoc markdown integrated in VitePress | 2023-2024 | Single unified site, better navigation, searchable API docs |
| Manual sidebar.json | Auto-generated typedoc-sidebar.json | 2023 | Sidebar stays in sync, less maintenance |
| JSDoc for types in JS | TypeScript types + JSDoc for descriptions | 2018+ | Types are source of truth, JSDoc adds context |
| VuePress | VitePress | 2022 | Faster dev server, better DX, simpler config |
| HTML in markdown | Vue components in markdown | VitePress 1.0 (2023) | Interactive demos, SSR-compatible |
| Manual code highlighting | Shiki built-in | VitePress 1.0 | Better colors, more languages, theme-aware |

**Deprecated/outdated:**
- **YUIDoc comments** (like `{{#crossLink}}`): Found in current ez-audio code (Track class). TypeDoc doesn't parse these. Replace with standard JSDoc + `@link`.
- **Separate docs site at different domain**: Modern practice is GitHub Pages at `user.github.io/repo/` or Netlify with subdomain.
- **VuePress**: VitePress is the official successor.
- **TSDoc tags that TypeDoc doesn't support**: Stick to standard JSDoc tags (`@param`, `@returns`, `@example`, `@link`, `@see`).

## Open Questions

Things that couldn't be fully resolved:

1. **Should existing vanilla TS demo app be migrated or run in parallel?**
   - What we know: Current app in `src/app/` uses vanilla TS router, generates to `dist-app/`
   - What's unclear: Whether to migrate all existing demos to VitePress Vue components or keep both
   - Recommendation: Migrate to VitePress. Maintaining two demo systems is confusing. VitePress can do everything the vanilla app does, plus more (search, navigation, mobile-friendly).

2. **TypeDoc sidebar.json placement - committed or gitignored?**
   - What we know: TypeDoc generates `typedoc-sidebar.json` in output directory
   - What's unclear: VitePress config imports it, so it must exist at build time, but should it be committed?
   - Recommendation: Commit `typedoc-sidebar.json` to avoid build-time dependency ordering issues. File is small and stable. Add comment in file header: `// Auto-generated by TypeDoc - do not edit manually`.

3. **How to handle audio assets for interactive examples?**
   - What we know: Need small audio files for demos, currently in `src/app/public/`
   - What's unclear: Size limits, format choices, where to host for production
   - Recommendation: Use small (<50KB) compressed audio files in `docs/public/audio/`. For larger demos, link to external CDN or soundfont URLs (already done for piano examples). Keep total docs site <10MB for fast loading.

4. **Documentation versioning strategy?**
   - What we know: Library is v0.0.0-notready, will eventually have v1.0
   - What's unclear: Whether to version docs alongside releases
   - Recommendation: Start with single "latest" version docs. Add versioning when v1.0 ships and breaking changes become a concern. VitePress doesn't have built-in versioning (unlike Docusaurus), would need custom solution.

## Sources

### Primary (HIGH confidence)
- [VitePress Official Documentation](https://vitepress.dev/) - Getting started, configuration, deployment
- [VitePress Using Vue in Markdown](https://vitepress.dev/guide/using-vue) - Interactive component patterns
- [TypeDoc Official Documentation](https://typedoc.org/) - API reference generation
- [typedoc-vitepress-theme Quick Start](https://typedoc-plugin-markdown.org/plugins/vitepress/quick-start) - Integration setup
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) - Supported JSDoc tags
- [VitePress Deployment Guide](https://vitepress.dev/guide/deploy) - GitHub Pages, Netlify, Vercel

### Secondary (MEDIUM confidence)
- [Documentation Best Practices - Write the Docs](https://www.writethedocs.org/guide/index.html) - Getting started guide structure
- [GitHub Documentation Guide](https://github.blog/developer-skills/documentation-done-right-a-developers-guide/) - Documentation principles
- [MDN Web Audio Examples](https://mdn.github.io/webaudio-examples/) - Interactive demo inspiration
- [Tone.js Documentation](https://tonejs.github.io/) - Audio library docs example
- [Howler.js Documentation](https://howlerjs.com/) - Simpler audio library docs example

### Tertiary (LOW confidence)
- [Code Documentation Best Practices 2026](https://www.qodo.ai/blog/code-documentation-best-practices-2026/) - General best practices (not library-specific)
- [vitepress-demo-preview plugin](https://github.com/flingyp/vitepress-demo-preview) - Optional demo enhancement (not essential)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - VitePress and TypeDoc are official, mature tools with extensive documentation
- Architecture: HIGH - Patterns verified from official VitePress and TypeDoc documentation
- Pitfalls: MEDIUM - Derived from WebSearch + official docs warnings, not library-specific experience

**Research date:** 2026-02-01
**Valid until:** 90 days (stable ecosystem, VitePress 1.0 is mature, TypeDoc stable)
