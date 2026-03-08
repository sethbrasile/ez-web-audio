# Phase 66: Orphaned Component Cleanup - Research

**Researched:** 2026-03-08
**Domain:** VitePress docs site component hygiene
**Confidence:** HIGH

## Summary

The M6 audit (v6-MILESTONE-AUDIT.md, item under "Pre-existing Issue") flagged `PlayTogetherDemo.vue` as orphaned because `docs/examples/play-together.md` was deleted. However, research shows the component is **NOT orphaned** -- it is actively imported and rendered by `docs/examples/layered-sound.md` (line 7: `import PlayTogetherDemo`, line 38: `<PlayTogetherDemo />`).

The original `play-together.md` page was created in Phase 52 (commit `1a7259a`) but later deleted. The `PlayTogetherDemo` component was preserved because the layered-sound page was redesigned to include both the `playTogether()` utility demo AND the `LayeredSound` class demo on a single "Synchronized Multi-Sound Playback" page.

A full audit of all 22 Vue components in `docs/.vitepress/theme/components/` confirms every component has at least one reference from a docs page or VitePress theme file. There are zero truly orphaned components.

**Primary recommendation:** This phase requires minimal work -- verify the audit finding is a false positive, confirm no other orphaned components exist, and close the phase. No files need to be deleted or created.

## Component Audit Results

### All 22 Components - Reference Status

| Component | Referenced By | Status |
|-----------|--------------|--------|
| AmbientGenerator.vue | ambient-generator.md | USED |
| AudioDemo.vue | basic-playback.md, theme/index.ts | USED |
| AudioSpriteDemo.vue | audio-sprite.md, theme/index.ts | USED |
| CrossfadeDemo.vue | crossfade.md, theme/index.ts | USED |
| DistortionDemo.vue | audio-routing.md, theme/index.ts | USED |
| DrumMachine.vue | drum-machine.md, drum-machine-vue.md, drum-machine-vanilla.md, theme/index.ts | USED |
| DrumMachineVanilla.vue | drum-machine-vanilla.md | USED |
| DrumMachineVue.vue | drum-machine-vue.md | USED |
| FilterDemo.vue | effects.md, theme/index.ts | USED |
| LayeredSoundDemo.vue | layered-sound.md, theme/index.ts | USED |
| LlmsFooter.vue | CustomLayout.vue | USED |
| OscillatorDemo.vue | synthesis.md, theme/index.ts | USED |
| PianoKeyboard.vue | SoundfontPiano.vue, SynthKeyboard.vue, theme/index.ts | USED |
| **PlayTogetherDemo.vue** | **layered-sound.md (line 7, 38)** | **USED** |
| SampledDrumKit.vue | sampled-drum-kit.md, theme/index.ts | USED |
| SoundfontPiano.vue | soundfont-piano.md, theme/index.ts | USED |
| SynthDrumKit.vue | synth-drum-kit.md, theme/index.ts | USED |
| SynthKeyboard.vue | synth-keyboard.md, theme/index.ts | USED |
| TimingDemo.vue | timing.md, theme/index.ts | USED |
| TrackDemo.vue | basic-playback.md, theme/index.ts | USED |
| VisualizationDemo.vue | visualization.md | USED |
| XYPad.vue | xy-pad.md, theme/index.ts | USED |

### Registration Patterns

Components are referenced in two ways:
1. **Global registration** in `docs/.vitepress/theme/index.ts` -- most components (18 of 22)
2. **Direct import** via `<script setup>` in markdown files -- all components

PlayTogetherDemo.vue uses pattern 2 only (direct import in layered-sound.md). This is perfectly valid -- several other components (AmbientGenerator, DrumMachineVanilla, DrumMachineVue, VisualizationDemo) also rely on direct imports rather than (or in addition to) global registration.

## Architecture Patterns

### How the Audit Missed It

The M6 audit checked for a dedicated `docs/examples/play-together.md` page (which was deleted) but did not grep for component imports across all markdown files. The component was moved from its own page to the `layered-sound.md` page during a consolidation -- the `playTogether()` utility and `LayeredSound` class are related features, so combining them on one page makes sense.

### Sidebar Configuration

The sidebar in `docs/.vitepress/config.mts` does NOT have a `play-together` entry (it was removed when the page was deleted). The `layered-sound` entry serves as the combined page for both features.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Component orphan detection | Manual file-by-file checking | `grep -rl "ComponentName" docs/` across all docs | Catches both global registration and direct imports |

## Common Pitfalls

### Pitfall 1: Incomplete Reference Search
**What goes wrong:** Checking only for dedicated pages (1:1 component-to-page mapping) instead of searching all import references
**Why it happens:** Assumption that each component has its own page
**How to avoid:** Always grep for the component name across ALL docs files, theme files, and other components
**Warning signs:** Finding a "missing" page but not checking if the component moved elsewhere

## Code Examples

### How PlayTogetherDemo.vue is Used (from layered-sound.md)

```vue
<!-- docs/examples/layered-sound.md, lines 6-8 -->
<script setup>
import PlayTogetherDemo from '../.vitepress/theme/components/PlayTogetherDemo.vue'
import LayeredSoundDemo from '../.vitepress/theme/components/LayeredSoundDemo.vue'
</script>
```

```markdown
<!-- docs/examples/layered-sound.md, lines 37-39 -->
<llm-exclude>
<PlayTogetherDemo />
</llm-exclude>
```

## Open Questions

None. The research conclusively shows the component is in use and there are no orphaned components.

## Validation Architecture

> Nyquist validation is not explicitly set to false in config.json, but this phase has no testable code changes. The phase is a verification/audit task.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + happy-dom |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | PlayTogetherDemo.vue has a corresponding docs page or is removed | manual-only | `grep -rl "PlayTogetherDemo" docs/examples/` | N/A (audit check) |
| SC-2 | No orphaned Vue components in docs components dir | manual-only | `for comp in $(ls docs/.vitepress/theme/components/*.vue \| xargs -I{} basename {} .vue); do grep -rl "$comp" docs/ --include="*.md" --include="*.vue" --include="*.ts" --include="*.mts" \| grep -v "components/$comp.vue" \| head -1 > /dev/null \|\| echo "ORPHANED: $comp"; done` | N/A (audit check) |

### Sampling Rate
- **Per task commit:** Not applicable (no code changes expected)
- **Phase gate:** Grep-based verification of component references

### Wave 0 Gaps
None -- no test infrastructure needed for this audit-only phase.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `docs/examples/layered-sound.md` lines 7, 38 -- confirms PlayTogetherDemo import and usage
- Direct file inspection: all 22 components in `docs/.vitepress/theme/components/` cross-referenced against `docs/examples/`, `docs/.vitepress/theme/`, and inter-component imports
- `v6-MILESTONE-AUDIT.md` line 168 -- the original audit finding

## Metadata

**Confidence breakdown:**
- Component audit: HIGH - direct grep of all files, every component accounted for
- PlayTogetherDemo status: HIGH - verified import on layered-sound.md line 7, rendered on line 38
- No orphans claim: HIGH - exhaustive search of all 22 components

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- component set changes infrequently)
