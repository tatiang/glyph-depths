# Live App: [https://tatiang.github.io/glyph-depths/](https://tatiang.github.io/glyph-depths/)

# Glyph Depths

Glyph Depths is a mobile-first, turn-based roguelike dungeon crawler built as a zero-dependency web app.

## Features

- Procedurally generated dungeon floors with room/corridor layouts.
- Multiple playable classes with unique abilities and cooldown systems.
- Inventory, equipment, consumables, shops, NPC lore, and status effects.
- Touch-first controls tuned for iOS Safari and PWA install flow.
- Save/load support (local, with optional cloud save integration).

## Play

- Open the live app link above, or open `index.html` locally in a browser.
- Controls:
  - Move with the on-screen D-pad (or keyboard on desktop).
  - Use `Special`, `Fire`, `Wait`, and `Stairs` buttons for class actions and turn control.
  - Tap inventory slots to equip/use/manage gear.

## Tech Stack

No framework, no build tooling, and no package dependencies.

- `index.html`: UI, layout, and all CSS.
- `game.js`: Core gameplay logic and game state.
- `audio.js`: Procedural Web Audio effects (no external assets).

## Local Development

1. Clone the repository.
2. Open `index.html` directly in your browser.
3. Optionally run a static server for easier iterative testing.

Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deployment

The project is published with GitHub Pages at:

- [https://tatiang.github.io/glyph-depths/](https://tatiang.github.io/glyph-depths/)

## Project Notes

- Designed to remain lightweight and fully playable without a build step.
- Optimized for touch interaction and short session gameplay loops.
- Architecture intentionally keeps game logic centralized for predictable turn sequencing.
