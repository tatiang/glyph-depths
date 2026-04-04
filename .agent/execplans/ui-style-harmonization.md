# ExecPlan: UI Style Harmonization

## Goal
Bring the game UI and on-map rendering into a unified dark-fantasy / techno-rune style, using the Config overlay as the visual reference while preserving the ASCII-derived dungeon layout and simple on-map character readability.

## Scope
- Restyle the main HUD, message log frame, inventory bar, action buttons, D-pad, and overlay surfaces in `index.html`.
- Update canvas tile and entity rendering in `game.js` so walls/floors feel skinned rather than plain ASCII while preserving map structure and simple on-map actors.
- Keep gameplay interactions, touch targets, event wiring, and overlay flow intact.

## Acceptance
- Main HUD matches the Config overlay palette and hierarchy: black/deep charcoal surfaces, pale-gold headers/labels, white core stats, green modifiers, red HP emphasis.
- Bottom panel preserves the existing layout footprint but visually reads like the Config/menu style with more ornate buttons and icon treatment.
- Canvas world still follows the same map data and symbol layout, but walls/floors render as high-definition skinned tiles instead of bare glyph-like blocks.
- Player remains a simple helmet-style marker; enemies remain simple, distinct sprites and do not use ornate UI glyph language.
- Message log content and color semantics are preserved.
- Relevant local verification passes and manual UI checks are documented.

## Progress
- [x] Verify repo marker, top-level, remote, branch
- [x] Load repo instructions and relevant frontend design guidance
- [x] Inspect HUD / overlay / renderer implementation details
- [x] Implement shared visual tokens and surface styling
- [x] Restyle bottom controls and inventory/action iconography
- [x] Harmonize overlays with config-standard panels
- [x] Update canvas tile/entity rendering
- [x] Run verification and prepare changelog / commit

## Decision Log
- Use CSS gradients, borders, shadows, and layered pseudo-element effects instead of adding dependencies or image assets.
- Keep DOM structure mostly intact so existing event listeners remain stable.
- Favor procedurally drawn canvas tiles/entities to preserve offline/local-file friendliness.

## Surprises
- The richer top HUD needed a responsive compression pass to stay usable on phone-width screens.
