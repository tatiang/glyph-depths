# ExecPlan: UI Style Overhaul — Uniformity and Harmonization

## Summary
- Re-theme the full HUD/menu layer in `index.html` to match the Config-page visual standard (dark runic frame, pale-gold headers, white stats, green modifiers, red HP bars).
- Preserve gameplay structure while replacing iconography in the lower inventory/action region with a harmonized rune-tech glyph style.
- Keep ASCII map topology unchanged but skin world tiles in `game.js` with high-definition textured rendering for wall/floor/corridor while preserving crisp gameplay symbols like `+` and stairs.
- Keep player/enemy map readability distinct from UI icon fidelity (simple player helmet + simple enemy sprites, no complex UI glyphs on-map).

## Acceptance Steps
1. `node --check game.js`
2. `rg -n "render\(|drawTileSkin|drawHelmetPlayer|drawEnemySprite|style-rune|btn-special" game.js index.html`
3. Manual visual verification in browser:
   - Status bar uses config-like icon cards and red HP fill.
   - Message log retains existing color coding and text format.
   - Inventory/action buttons keep existing layout but render new icon style + pale-gold labels.
   - Map shape remains unchanged while walls/floors are textured (not plain glyph-only output).
   - Player is a simple helmet; enemies are simple sprites; UI glyph complexity does not bleed into map entities.

## Progress
- Completed: implementation planning and code mapping.
- Completed: `index.html` style-system harmonization for HUD, controls, and overlays.
- Completed: `game.js` world skinning helpers plus simple player/enemy/loot sprite rendering.
- Completed: verification (`node --check game.js`) and release bookkeeping updates (`CHANGELOG.md`, `RELEASE_SUMMARY.md`).

## Decision Log
- Keep all existing IDs and DOM interaction targets stable to avoid rewiring input logic.
- Implement skinning entirely in canvas drawing helpers without introducing external assets or dependencies.
- Preserve current HUD text strings and runtime data formatting while changing visual treatment.

## Surprises
- Existing UI already has a partial config pager style, but the active gameplay HUD and controls still use older emoji-forward styling.
- Render pipeline currently depends heavily on text glyph drawing for tiles/entities, so skinning requires helper extraction without changing turn logic.
