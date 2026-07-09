---
phase: 44-docs-site-seo-and-accessibility
plan: "03"
subsystem: ui
tags: [accessibility, wcag, aria, keyboard, canvas, vue]

# Dependency graph
requires:
  - phase: 44-01
    provides: baseline docs site SEO and meta improvements
  - phase: 44-02
    provides: AudioSpriteDemo and SynthKeyboard accessibility groundwork
provides:
  - Keyboard-operable XY Pad canvas via arrow keys
  - Screen-reader-announced piano keyboard shortcut hint via aria-describedby
  - focus-visible styles for SynthKeyboard interactive elements
affects: [44-docs-site-seo-and-accessibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Arrow key step control: heldKeys Set tracks pressed keys, oscillator stops when all released"
    - "focus-visible preferred over :focus for outline styles — avoids showing outline on mouse click"
    - "role=note + aria-label + aria-describedby pattern for screen-reader-announced hints"

key-files:
  created: []
  modified:
    - docs/.vitepress/theme/components/XYPad.vue
    - docs/.vitepress/theme/components/PianoKeyboard.vue
    - docs/.vitepress/theme/components/SynthKeyboard.vue

key-decisions:
  - "XY Pad oscillator starts on first arrow keydown and stops when all arrow keys released (matches mouse press-and-hold semantics)"
  - "kbX/kbY refs track keyboard-controlled position independently from mouse/touch position"
  - "canvas:focus updated to canvas:focus-visible to avoid outline appearing on mouse click"
  - "PianoKeyboard .key:focus updated to .key:focus-visible for same reason"

patterns-established:
  - "Arrow key canvas control: heldKeys Set + arrowKeys array for reliable multi-key tracking"

requirements-completed: [A11Y-03, A11Y-06]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 44 Plan 03: Keyboard Accessibility for XY Pad and Piano Keyboard Summary

**Arrow key control for XY Pad canvas (WCAG 2.1.1 fix) and aria-describedby-linked piano shortcut hint for screen readers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T18:31:13Z
- **Completed:** 2026-02-24T18:32:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- XY Pad canvas now responds to arrow keys: left/right controls frequency, up/down controls gain, Shift for 10x step
- Oscillator starts on first arrow keydown and stops when all arrow keys are released (matching mouse press-and-hold behavior)
- Piano keyboard hint now has `role="note"`, `aria-label`, and is linked to `.keys-container` via `aria-describedby="keyboard-shortcut-hint"` for screen reader announcement
- Updated `canvas:focus` and `.key:focus` to `focus-visible` variants to avoid unwanted outlines on mouse interaction
- Added `focus-visible` focus styles to SynthKeyboard buttons, selects, and inputs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add keyboard operation to XY Pad canvas** - `684463a` (feat)
2. **Task 2: Make piano keyboard hint screen-reader-accessible and add SynthKeyboard focus styles** - `c159deb` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `docs/.vitepress/theme/components/XYPad.vue` - Added arrow key handlers, heldKeys tracking, kbX/kbY position refs, @blur stop, updated aria-label and focus-visible
- `docs/.vitepress/theme/components/PianoKeyboard.vue` - Added id/role/aria-label to hint div, aria-describedby on keys-container, focus-visible for key focus
- `docs/.vitepress/theme/components/SynthKeyboard.vue` - Added focus-visible styles for button/select/input

## Decisions Made
- XY Pad oscillator starts on first arrow keydown and stops when all arrow keys released — matches mouse press-and-hold semantics rather than toggle behavior
- kbX/kbY refs track keyboard-controlled position independently (canvas does not store position in refs normally)
- canvas:focus and .key:focus updated to :focus-visible — avoids outline appearing on mouse click (better UX per modern a11y guidance)

## Deviations from Plan

**1. [Rule 1 - Bug] Updated PianoKeyboard .key:focus to .key:focus-visible**
- **Found during:** Task 2 (PianoKeyboard accessibility)
- **Issue:** Plan only mentioned updating XYPad focus-visible; PianoKeyboard also had plain :focus on .key elements
- **Fix:** Updated .key:focus to .key:focus-visible in PianoKeyboard.vue alongside the SynthKeyboard focus-visible addition
- **Files modified:** docs/.vitepress/theme/components/PianoKeyboard.vue
- **Verification:** grep confirms focus-visible in PianoKeyboard
- **Committed in:** c159deb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - consistency bug fix)
**Impact on plan:** Minor consistency improvement — PianoKeyboard had same :focus issue as XYPad mentioned in the plan. Fixed inline with Task 2.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All A11Y requirements for Phase 44 complete
- XY Pad fully keyboard-operable (WCAG 2.1.1 satisfied)
- Piano keyboard shortcuts announced to screen readers
- All interactive demo controls have proper focus-visible indicators

---
*Phase: 44-docs-site-seo-and-accessibility*
*Completed: 2026-02-24*
