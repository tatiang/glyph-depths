# ExecPlan: Title Screen Mockup Refresh (Non-Emoji)

## Summary
- Redesign only the initial title section with a dark-stone + gold premium roguelike visual direction.
- Replace inline emoji glyph map art with a static local sprite collage.
- Preserve all existing title actions and class-mode transition behavior.

## Acceptance Steps
1. `node --check game.js`
2. `rg -n "title-hero-card|title-collage|title-fog-layer|title-rune-layer|btn-start|btn-saves-from-title" index.html game.js`
3. Manual smoke test in browser:
   - Title renders with non-emoji key art on load.
   - `Descend` still transitions into class selection.
   - Title secondary buttons (Saved Games, Runs, Manual, etc.) still work.
   - Layout remains readable at 320/390/430/768 widths.

## Progress
- Completed: replaced title-section structure with header, hero-card collage, and CTA stack while preserving existing action IDs.
- Completed: added title-only CSS visual system (stone/gold palette, framed collage, fog+rune motion, responsive spacing).
- Completed: refactored `showTitle()` to remove inline emoji art generation and initialize lightweight ambient rune sparks.
- Completed: verification commands and changelog/release summary updates.
- In progress: stage, commit, and push.

## Decision Log
- Scope is title section only; class-selection layout remains unchanged.
- Use existing local assets (`images/sample_character.png`, `images/slime.png`, `images/black-widow.png`) with CSS layering.

## Surprises
- Existing title visuals are generated dynamically in `showTitle()`, so JS cleanup is required alongside HTML/CSS redesign.
- Existing styles animated all title `big-btn` elements uniformly, so the new CTA grouping required dedicated title button classes.
