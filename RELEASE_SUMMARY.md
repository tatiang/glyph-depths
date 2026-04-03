# Release Summary

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
