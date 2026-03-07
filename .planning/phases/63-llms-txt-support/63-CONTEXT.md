# Phase 63: llms.txt Support - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Add llms.txt support to the VitePress docs site using vitepress-plugin-llms so AI coding assistants can efficiently ingest the full documentation (guides + API reference) in one request. Includes plugin setup, content annotations, footer message with auto-generated file size, and output verification.

</domain>

<decisions>
## Implementation Decisions

### Content exclusions
- Wrap interactive Vue demo component tags (e.g., `<DrumMachine/>`, `<PianoKeyboard/>`) in `<llm-exclude>` tags so they don't appear in llms-full.txt
- Add `<llm-only>` annotations near each excluded demo with a demo-specific description (e.g., "Interactive drum machine step sequencer with kick/snare/hi-hat patterns at configurable BPM")
- Only exclude interactive Vue component demos — all prose, code examples, and API reference pages stay in
- Result: LLMs see a descriptive note instead of a meaningless raw Vue tag; humans see the interactive demo

### File size in footer
- Use a post-build script that runs after VitePress build, reads the generated llms-full.txt file size, and patches the footer HTML with the actual size
- No custom Vite plugin or hardcoded estimate

### Footer message
- Both a visible HTML footer on every page AND an `<llm-only>` block in the docs content
- Visible footer: humans and HTML-scraping LLMs see the llms.txt pointer on every page
- `<llm-only>` block: appears in the llms-full.txt output for LLMs reading the concatenated file
- Footer text pattern: "AI assistants: full documentation available at /llms.txt (index) and /llms-full.txt (NN KB, complete)."

### Claude's Discretion
- Exact post-build script implementation (Node.js, shell, etc.)
- Footer styling and placement within VitePress theme
- Whether to use VitePress layout slots or theme footer config
- Exact wording of demo-specific `<llm-only>` descriptions
- Plugin configuration options beyond defaults (if any are beneficial)

</decisions>

<specifics>
## Specific Ideas

- The spec references vitepress-plugin-llms (https://github.com/okineadev/vitepress-plugin-llms) — use this specific plugin
- All guide and example pages already have `description` frontmatter — only the homepage (`docs/index.md`) may need one added
- Build order is already correct: `build:lib` -> `build:typedoc` -> `build:docs` — TypeDoc API markdown exists before the llms plugin processes pages
- The `<llm-only>` and `<llm-exclude>` tags are features of the vitepress-plugin-llms

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/.vitepress/config.mts`: VitePress config with `vite.plugins` array ready for plugin addition
- `docs/.vitepress/theme/index.ts`: Custom theme extending DefaultTheme — can add layout slots or footer components
- All 20+ example pages already have `description` frontmatter fields

### Established Patterns
- VitePress theme uses DefaultTheme extension with global Vue component registration
- No existing footer customization — DefaultTheme footer is unconfigured (no `footer` in themeConfig)
- Build pipeline: `pnpm build` runs `build:lib && build:typedoc && build:docs`

### Integration Points
- `docs/.vitepress/config.mts` `vite.plugins` array — where llmstxt plugin is added
- `docs/.vitepress/theme/index.ts` — where footer layout slot or component would be added
- ~20 example markdown pages — where `<llm-exclude>` / `<llm-only>` tags are added around demos
- `package.json` scripts — where post-build script for file size patching is added

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 63-llms-txt-support*
*Context gathered: 2026-03-07*
