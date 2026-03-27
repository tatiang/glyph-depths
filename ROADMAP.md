# Glyph Depths Roadmap

*Assessment date: 3/27/26*

---

## What's Already Strong

15 classes, 60 badges, 12 runes with synergies, 5 biomes, 20 floors, a multi-phase boss, mastery meta-progression, procedural audio, polished mobile UI — this is genuinely remarkable for a zero-dependency PWA. The mechanical depth rivals commercial roguelikes.

---

## High-Impact Additions

### 1. Ambient Soundscape / Floor Music
The audio system is excellent but silent during gameplay. Title music exists, boss entry exists, but floors 1-19 have no ambient audio. A procedurally generated drone/pad per biome (Sewers = dripping reverb, Crypt = eerie chords, Abyss = deep rumbles) playing quietly during exploration would massively elevate atmosphere. This is probably the single highest-impact change — silence makes it feel like a prototype.

### 2. Run History / Death Log
Award-winning roguelikes (Hades, Slay the Spire, Spelunky) all have a persistent record of past runs. Show a scrollable history: class played, floor reached, cause of death, runes collected, badges earned, turns taken. This creates the "one more run" loop and makes each death feel meaningful rather than disposable.

### 3. Lore Discovery System
You have 43 NPC lore entries, but they're random and fire-and-forget. A persistent Codex/Bestiary that unlocks entries as you encounter enemies, find runes, read lore, and discover biomes would give collectors a reason to keep playing. Award judges love discoverable narrative.

### 4. Daily Challenge / Seeded Runs
A seeded daily run where all players get the same dungeon would add competitive replayability. Show a leaderboard (even just local). This is a hallmark feature of award-winning roguelikes (Spelunky Daily Challenge, Dead Cells).

### 5. Animation Polish: Death Animations & Transitions
Enemies currently just disappear. A brief death animation (flash → fade, or glyph scatter) and a floor transition effect (fade to black → biome name card → fade in) would make the game feel cinematic. The screen shake system is already there — extend it.

### 6. Interactive Tutorial / First-Run Experience
New players are dropped into the deep end. A guided first floor that teaches movement, combat, items, hunger, and doors through play (not text walls) would dramatically improve first impressions. Award judges play the game once — that first impression matters enormously.

### 7. Event System / Floor Modifiers
Random per-floor modifiers ("This floor is cursed — enemies regenerate", "Merchant's blessing — all items half price", "Darkness — FOV reduced by 2") would make each run feel more unique and create memorable moments. Roguelikes live and die by emergent stories.

### 8. Visual Juice: Hit Numbers & Damage Popups
Floating damage numbers that drift upward on hits (both player and enemy) would make combat feel impactful. Canvas-rendered, short-lived, color-coded (red for damage taken, white for dealt, gold for crits). Small change, huge feel improvement.

### 9. Unlockable Starting Conditions
Beyond mastery bonuses, let players unlock starting loadout options or challenge modifiers through badges. "Earn Regicide → unlock Cursed Crown start item" or "Earn Speed Runner → unlock Turbo Mode". This creates goal-oriented play across runs.

### 10. Deeper Boss Encounter
The Glyph King is good with 3 phases, but award-winning boss fights have environmental mechanics. Pillars that block line of sight, rune circles on the floor that power up/heal him if you stand on them, a phase where he extinguishes your FOV to 2 tiles — make the arena itself part of the fight.

---

## Lower-Effort / Polish Items

- **Tombstones**: Mark where previous runs died with a small grave glyph on the map
- **Streak counter**: Track consecutive wins per class
- **Stats page**: Total play time, total kills, favorite class, deepest floor across all runs
- **Biome name card**: Brief text overlay ("Entering The Crypt...") on floor transitions
- **Inventory tooltips**: Long-press on mobile to see item stats without using it
- **Enemy intent indicators**: Show what an enemy will do next turn (attack, move, special) like Slay the Spire — this is a massive strategic depth addition

---

## Suggested Priority Order

If aiming for an award submission, tackle in this order:

1. **Ambient biome audio** — transforms the feel immediately
2. **Floating damage numbers** — makes combat satisfying
3. **Floor transition cards** — biome name + brief atmosphere text
4. **Run history log** — "one more run" addiction loop
5. **Enemy intent indicators** — strategic depth leap
6. **Codex/Bestiary** — collectible narrative
7. **Interactive tutorial** — first impression for judges
