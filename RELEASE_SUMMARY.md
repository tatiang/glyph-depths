# Release Summary

## Escape Route and Terrain Interaction Update

This update reworks Escape Artist movement, adds new item/effect interactions, improves touch controls, and fixes a startup crash that could leave the maze black after beginning a run.

### What changed
- Escape Artist `Escape Route` now teleports to a nearby chamber instead of stairs, with per-floor usage tracking.
- Added `Ring of Detection` and detection-based secret wall shimmer visibility.
- Added `Potion of Water Walking` and temporary water traversal support.
- Added woozy room interactions tied to enchanted walls, including directional drift behavior.
- Added long-press item detail tooltip support for inventory and equipped gear on touch devices.
- Added one-tap mobile cancel for Aimed Shot while in aimed-shot mode.
- Capped enchanted wall spawns to one per eligible floor.
- Fixed potion/scroll randomization indexing to prevent startup crashes when new effects are added.

### Why it changed
- Aligns class ability behavior with updated design goals.
- Improves touch-first usability on iOS/mobile.
- Prevents a regression that blocked new runs.

### Safety
- No external dependencies added.
- No schema/storage migrations required.
- Uses existing state/save structures and UI patterns.

## Enemy Intent Indicators

This update adds enemy intent indicators directly in the dungeon view and a new settings toggle so players can enable or disable them at any time.

### What changed
- Added `Enemy Intent Indicators` in Config → Settings.
- Added intent icon rendering above enemies in `game.js`.
- Added intent state sync and persistence in local settings.

### Why it changed
- Improves turn-to-turn readability by surfacing likely enemy behavior.
- Gives players control over UI density through a dedicated toggle.

### Safety
- No external dependencies added.
- No schema/storage migrations required.
- Uses existing local settings persistence path.
