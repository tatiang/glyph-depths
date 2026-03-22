# CLAUDE.md — Glyph Depths

Development guide for AI-assisted work on this codebase.

---

## Project overview

Glyph Depths is a turn-based roguelike dungeon crawler built as a zero-dependency single-page web app, optimized for iOS Safari (add-to-home-screen PWA). The entire game runs in three files:

| File | Role |
|---|---|
| `game.js` | All game logic (~3 900 lines, wrapped in a single IIFE) |
| `index.html` | HTML structure + all CSS embedded in `<style>` |
| `audio.js` | Procedural audio via Web Audio API — no audio asset files |

There is no build step, no bundler, no npm, no framework. Open `index.html` in a browser and the game runs.

---

## Architecture rules

### State lives in one object
All mutable runtime data is stored in `state`. Never add top-level `let`/`var` for game state — put it in `state` instead.

```js
// Good
state.player.fovBonus += 1;

// Bad — leaks into the IIFE closure
let playerFovBonus = 0;
```

Player sub-state lives in `state.player`. Entities (enemies, items, NPCs, hazards, merchant) live in `state.entities[]`.

### Entities follow a flat duck-typed schema
Every entity in `state.entities` has at minimum `{ type, x, y, glyph }`. Beyond that, properties are added as needed per type:

```js
// Enemy
{ type: 'enemy', x, y, glyph, name, hp, maxHp, attack, defense, ai, alertness, statusEffects, ... }

// Item on the ground
{ type: 'item', x, y, glyph, item: { name, glyph, itemType, ... } }

// NPC
{ type: 'npc', x, y, glyph, name, lore, spoken }

// Merchant
{ type: 'merchant', x, y, glyph, shopItems, refreshesLeft, visited }
```

Never add a new entity type without also handling it in:
- `render()` — drawing
- `playerMove()` — interaction when the player bumps it
- `renderMinimap()` — minimap dot (if it should appear there)
- Any serialisation/cleanup logic

### Turn flow
Every player action must end with exactly one call to `endTurn()` (or return early without one). `endTurn()` calls `processStatusEffects()`, `processEnemies()`, hunger tick, regen, then `render()` + `updateUI()`.

```
playerAction → endTurn() → processEnemies() → render() / updateUI()
```

Overlays (merchant, level-up) set `inputLocked = true` and do **not** call `endTurn()` — they wait for the player to close the overlay.

### Tile types
Use the `T` constant, never raw numbers:

```js
// Good
if (getTile(x, y) === T.DOOR_SEALED) { ... }

// Bad
if (state.map[idx] === 9) { ... }
```

Tile type reference: `WALL=0 FLOOR=1 CORRIDOR=2 STAIRS_DOWN=3 STAIRS_UP=4 DOOR_CLOSED=5 DOOR_OPEN=6 SPECIAL=7 DOOR_ONEWAY=8 DOOR_SEALED=9`

---

## iOS / mobile-first rules

These are non-negotiable for the game to feel native on iOS.

### Always register both `click` and `touchend`
iOS tap events fire in the order `touchstart → touchend → click`. `click` alone has a ~300ms delay on older iOS. Use the helper pattern already in the codebase:

```js
function makeTappable(el, handler) {
  el.addEventListener('click', handler);
  el.addEventListener('touchend', (e) => { e.preventDefault(); handler(e); }, { passive: false });
}
```

For canvas swipe input, use `touchstart`/`touchmove`/`touchend` with `e.preventDefault()` and `{ passive: false }`.

### Never use `passive: true` on game canvas touch events
The canvas needs `e.preventDefault()` to suppress iOS rubber-band scroll and context menus. Registering listeners as passive will throw a console error and the prevents will be ignored.

### Haptic feedback for all meaningful interactions
Call `haptic(ms)` for player hits (50ms), enemy kills (30ms), death (100ms), door bashes (40ms). Keep durations short — long vibrations feel wrong on phones.

```js
function haptic(ms) {
  if (settings.haptics && navigator.vibrate) navigator.vibrate(ms);
}
```

### Safe-area insets
The layout uses `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` CSS variables (exposed as `--safe-top` / `--safe-bottom`). Don't place interactive elements — buttons, inventory slots — in the bottom safe area without padding.

### Audio context must be resumed on user gesture
Web Audio is suspended by default on iOS until a user gesture. Always call `Audio.resume()` at the top of any touch/click handler that might play sound.

```js
wrap.addEventListener('touchstart', (e) => {
  Audio.resume(); // must be first
  // ... rest of handler
}, { passive: false });
```

### No audio files — use procedural synthesis only
All sounds are generated via Web Audio API oscillators and noise in `audio.js`. This keeps the app loadable offline and avoids CORS issues. When adding a new sound, follow the existing `env()` + `osc()` pattern in `audio.js`.

---

## Roguelike design rules

### The dungeon
- **BSP generation**: `generateBSP()` splits the 50×50 map into rooms connected by L-shaped corridors. Rooms are stored in `state.rooms[]`.
- **Minimum room size**: rooms are at least 4×4. Don't reduce this — smaller rooms break door placement and NPC spawning.
- **Corridors**: carved only through WALL tiles; they don't overwrite FLOOR. Don't change this — it's what makes rooms merge correctly with corridors.
- **Item spawning**: use `randomRoomFloorTile()` for items the player must find (food, key items). Use `randomFloorTile()` for optional loot. Never spawn items on CORRIDOR tiles for essential items — players may not explore every corridor.
- **Connectivity**: every room must be reachable. `bfsReachable()` validates one-way door placement. Don't add any tile-conversion logic that could orphan rooms without running BFS first.

### Perks (level-up)
- Each perk must have `{ name, desc, apply }` at minimum.
- **Unique perks** (can only be picked once) require `unique: true` and `flag: 'flagName'` where `state.player.flagName` is the boolean tracking it. Add the flag initialised to `false` in `createPlayer()`.
- **Rare perks** add `rare: true` — they have a 70% skip chance per draw to appear less often.
- Never add a perk that is strictly dominated by another (e.g., "+3 HP with partial heal" vs "+5 HP with full heal"). Every perk must have a scenario where a rational player would choose it.
- Current perk pool reference: Extended Vision, +1 Attack, +1 Defense, Rapid Regeneration (unique/rare), +5 Max HP (rare), Glass Cannon (rare), Vampiric Strikes (unique/rare), Iron Skin (unique/rare), Battle Fury (unique/rare).

### Enemy AI
AI types: `wander`, `patrol`, `chase`, `ambush`, `flee`, `boss`, `ally`. Assign via the `ai` field on enemy templates in `ENEMY_TIERS`. All AI runs in `processEnemies()` each turn. Enemies only act if `hp > 0`. Phase enemies (`special: 'phase'`) walk through walls in A* pathfinding.

### Balance guidelines
- Floor progression: tier 1 enemies floors 1–3, tier 2 floors 4–6, tier 3 floors 7–9, boss floor 10.
- Merchants appear only on floors 3, 6, 9. Players get one visit per merchant per floor.
- Each floor has exactly one ration (50% chance on floors 5, 7, 8) — hunger is intentionally tight.
- HP costs that can kill the player are a design smell. Sealed door bashing is clamped to `Math.max(1, hp - 1)` for this reason.
- One-way doors must never create permanently inaccessible rooms. `addOneWayDoors()` validates with BFS before placing.

### Friendly NPCs
NPCs (`type: 'npc'`) are stationary, cannot be attacked, and do not attack. Interacting (bumping) shows lore from `NPC_LORE[]` once, then fades the sprite. When adding lore strings, keep them to one or two sentences from a spectral/shade persona. Lore should hint at mechanics or world-building, not state rules bluntly.

---

## Rendering rules

### Canvas is the game view — DOM is the HUD
- The `<canvas>` element renders the dungeon, entities, and visual effects.
- The DOM (status bar, inventory bar, message log, overlays) renders the HUD.
- Never render HUD elements to canvas; never render dungeon tiles to DOM.

### FOV and visibility
- `computeFOV()` uses octant-based recursive shadowcasting. Call it any time the player moves or the map changes.
- Tiles have three states: unexplored (skip drawing), explored-but-dim (`alpha = 0.65`), visible (`alpha = 1.0 / 0.85 / 0.70` by distance).
- Only visible entities are drawn. Items and enemies at unexplored tiles are hidden.

### Biome tile colors
Colors are defined in `getFloorBiome(floor)`. Each biome has six color properties: `wallVis`, `wallDim`, `floorVis`, `floorDim`, `corrVis`, `corrDim`, and a canvas background `bg`. Keep colors readable — the minimum wall brightness on visible tiles should be discernible from the floor.

### Entity draw order
Items/hazards → Merchant → NPCs → Enemies → Player. This ensures the player always renders on top of items and NPCs they are standing on.

### Minimap
`renderMinimap()` draws to a separate `<canvas id="minimap-canvas">`. The map has a LEGEND_H pixel legend strip appended below the map tiles. Stairs use distinct colors: green (`#00e060`) for down, blue (`#60c0ff`) for up. The player is drawn as a cross (+1px on each axis) in gold.

---

## CSS / UI rules

### CSS variables — use them, don't hardcode colors
All palette colors are defined as `--var-name` in `:root`. Reference them with `var(--name)`. Inline hex colors are acceptable only for procedurally generated or canvas-drawn colors.

### Overlays
Overlays use the class `overlay` and become visible with `.active`. They are fixed-position, full-screen, flex-centered. All overlays set `inputLocked = true` on open and `inputLocked = false` on close.

### No animations that block gameplay
CSS transitions on overlays use `opacity` and `transform` only — never `display` or `visibility` transitions that would break the `.active` toggle. Durations stay under 200ms to avoid feeling sluggish on older phones.

---

## Code conventions

### Naming
- Functions: `camelCase` verbs — `generateFloor`, `spawnEnemies`, `showMerchant`
- Constants: `SCREAMING_SNAKE_CASE` — `MAP_W`, `FOV_RADIUS`, `MAX_INVENTORY`
- State flags: `camelCase` booleans — `state.player.hasRegen`, `state.gameOver`
- Entity type strings: lowercase — `'enemy'`, `'item'`, `'npc'`, `'merchant'`, `'hazard'`

### The `$()` helper
`$('id')` is shorthand for `document.getElementById('id')`. Use it everywhere — don't use `querySelector` for ID lookups.

### Section comments
Major code sections are delimited with `// === SECTION NAME ===`. Keep new functions in the logical section they belong to. Don't add functions at arbitrary line positions.

### `addMessage(text, cls)`
All player-visible messages go through `addMessage`. Class values: `'good'` (green), `'damage'` (red), `'gold'` (gold), `''` (default gray). Only the last 3 messages show in the HUD at a time, so keep messages short (under ~60 characters ideally).

### No floating promises or async code
The game is entirely synchronous. Don't introduce `async/await` or `Promise` chains into game logic — it will break turn sequencing and `inputLocked` management.

---

## Workflow for new features

1. **New entity type**: add spawning, interaction in `playerMove()`, rendering, minimap dot.
2. **New perk**: add to `allPerks[]` in `showLevelUp()`. If unique, add flag to `createPlayer()` and set `unique: true, flag: 'flagName'`.
3. **New item type**: add to item generation pools, add `itemType` string, add handling in `useItem()` and `showItemMenu()`.
4. **New status effect**: add processing in `processEntityEffects()`, add label in `renderStatusFX()` and the settings overlay `efxLabels`, add HP-bar color override in `updateUI()` if the effect is visually critical.
5. **New tile type**: add to `T` constant, handle in `isWalkable()`, `isTransparent()`, `render()`, `renderMinimap()`, and any pathfinding that inspects tile types.

---

## What not to do

- **Don't add external dependencies.** No npm, no CDN imports, no frameworks. Everything runs from the three local files.
- **Don't split the IIFE.** `game.js` is intentionally one self-contained closure. Don't refactor it into ES modules — that would require a build step or `type="module"` with CORS restrictions that break local file:// loading.
- **Don't add loading screens or asset fetches.** The game must load instantly. All assets are code.
- **Don't use `innerHTML` on player-controlled text** without sanitising — this is an XSS surface. `textContent` is safe; `innerHTML` is only acceptable for trusted template strings.
- **Don't create perks that stack without limit** unless that's intentional (Extended Vision stacks by design). Unlimited stacking can trivialise the game.
- **Don't make UI elements smaller than 44×44px** — Apple's minimum touch target. The inventory slots and buttons are already at the minimum; don't shrink them.
- **Don't use `alert()`, `confirm()`, or `prompt()`** — they block the thread and look wrong on iOS.
- **Don't skip `endTurn()` after player actions** — status effects and enemy AI won't process, breaking the game.
