# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: 6 — DX & Discoverability

**Shipped:** 2026-03-08
**Phases:** 6 | **Plans:** 12

### What Was Built
- Howler-style sprite manifest auto-detection with visual timeline demo
- Optional BaseAudioContext first-param overloads on all 16+ factory functions
- llms.txt/llms-full.txt AI discoverability with llm-exclude/llm-only Vue demo annotations
- Demo UX overhaul: lazy init, no load buttons, animated playheads
- Human verification caught 3 real bugs (sprite timing, drum machine playhead, crossfade overlap)
- Full orphaned component audit (0/24 orphaned)

### What Worked
- Human verification step (Phase 65) caught bugs that automated tests couldn't — crossfade AudioParam overlap, sprite timing boundary, CSS class cleanup
- Audit-driven gap closure phases (65-66) efficiently closed all tech debt before milestone completion
- Demo-first documentation approach worked well for audio sprites — showing the concept before explaining it
- llm-exclude/llm-only annotation pattern cleanly separates interactive demos (browsers) from text descriptions (AI assistants)

### What Was Inefficient
- VALIDATION.md metadata (status: draft, nyquist_compliant) not finalized automatically during phase execution — required separate cleanup
- M6 had no formal REQUIREMENTS.md (inherited M5's) — success criteria lived only in ROADMAP.md phase sections
- Phase 66 was a false positive from the audit (PlayTogetherDemo was already in use) — could have been caught with a simple grep during audit

### Patterns Established
- `ensureLoaded()` lazy init pattern for demo components — guards all user interactions, initializes on first call
- `requestAnimationFrame` playhead animation using `performance.now()` independent of AudioContext timing
- BaseAudioContext instanceof detection with Symbol.hasInstance polyfill for test environments
- CustomLayout wrapper pattern for VitePress slot injection (doc-footer-before)
- Blank lines required inside llm-only/llm-exclude custom tags for remark parser compatibility

### Key Lessons
1. Human verification is worth the investment — 3 bugs found that unit tests missed because they involved real browser audio behavior
2. Milestone audits should include basic code-level checks (grep for imports) not just structural analysis — avoids false positives like the PlayTogetherDemo finding
3. Build pipeline ordering matters: TypeDoc -> VitePress -> llms.txt post-build patching is fragile; domain/path issues compound across stages

### Cost Observations
- Sessions: ~3 (research/plan, execute, verify/cleanup)
- Notable: Entire milestone completed in 2 days — small, focused phases with clear success criteria executed quickly

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| M1 (MVP) | 11 | 48 | Initial build |
| M2 (Quality) | 5 | 20 | Audit-driven improvements |
| M3 (Stable) | 30 | 52+ | Breaking API cleanup, dependency upgrades |
| M4 (Hardening) | 6 | 13 | Deep review findings |
| M5 (Effects) | 8+ | 20+ | Feature expansion (effects, transport, synth) |
| M6 (DX) | 6 | 12 | DX polish, AI discoverability |

### Cumulative Quality

| Milestone | Tests | Key Addition |
|-----------|-------|--------------|
| M1 | 711 | Core library + demos |
| M2 | 913 | Audit, E2E tests |
| M3 | 1038+ | API hardening |
| M5 | 1891 | Effects, transport, synth |
| M6 | 1920 | Bug fixes from human verification |

### Top Lessons (Verified Across Milestones)

1. Audit-then-fix cycles (M2, M4, M6) consistently surface real issues — invest in audits before shipping
2. Demo-first documentation drives better API design — if the demo is awkward, the API is awkward
3. Human verification catches browser-specific bugs that mocked tests miss — worth doing for UI-heavy phases
