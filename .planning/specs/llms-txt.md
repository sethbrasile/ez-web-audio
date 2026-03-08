# Spec: llms.txt Support

## Goal

Add llms.txt support to the docs site so AI coding assistants can efficiently ingest the full documentation (guides + API reference) in one request.

## Motivation

When developers use AI assistants (Claude, Cursor, Copilot) with our library, the assistant needs to understand the API. Currently it would need to scrape individual pages. With llms.txt, the assistant can pull `/llms-full.txt` and get everything — guides, examples, and the full TypeDoc API reference — in one shot.

## Deliverables

### 1. Install and Configure vitepress-plugin-llms

The [vitepress-plugin-llms](https://github.com/okineadev/vitepress-plugin-llms) plugin generates:
- `/llms.txt` — markdown index with links to all pages
- `/llms-full.txt` — all documentation concatenated into one file
- Individual `.md` versions of each HTML page

Installation:
```bash
pnpm add -D vitepress-plugin-llms
```

Configuration in `docs/.vitepress/config.mts`:
```typescript
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [llmstxt()],
  },
})
```

The TypeDoc API reference pages (under `docs/api/`) are regular VitePress markdown pages, so the plugin picks them up automatically — no extra configuration needed.

### 2. Add `description` Frontmatter to Guide/Example Pages

The plugin uses frontmatter `description` fields to generate useful summaries in `llms.txt`. Add descriptions to pages that lack them:
- `docs/guide/*.md`
- `docs/examples/*.md`
- `docs/index.md`

API pages already have descriptions from JSDoc.

### 3. Footer Message on Every Page

Add a message to the VitePress theme footer (or a custom layout slot) that appears on every page, pointing LLMs to the full docs:

```
AI assistants: full documentation available at /llms.txt (index) and /llms-full.txt (NN KB, complete).
```

**Key detail**: Auto-generate the file size of `llms-full.txt` at build time and include it in the footer message. This way an LLM seeing any single page knows:
1. That llms.txt exists
2. How large the full dump is (so it can decide whether to pull it)

Implementation options for auto-sizing:
- A small Vite plugin that runs after the llms plugin, reads the generated file size, and injects it
- A post-build script that patches the output
- The vitepress-plugin-llms may expose this info — check its API

### 4. Verify Output Quality

After setup, review:
- `llms.txt` — confirm it has useful section headers and descriptions
- `llms-full.txt` — confirm API reference pages are included alongside guides
- Spot-check that interactive Vue components (demos) are excluded or gracefully handled (they'll just be missing from the markdown, which is fine)

## Technical Notes

- The plugin is English-only by design (fine for this project)
- The `<llm-only>` and `<llm-exclude>` tags are available if we want to add LLM-specific context or hide interactive-only content
- Build order matters: TypeDoc must run before VitePress build so the API markdown exists when the plugin processes pages. The current `pnpm build` already handles this (`build:lib` → `build:typedoc` → `build:docs`).
