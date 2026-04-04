# Changelog

Apr 4, 2026 — 6:21 AM PT — Harmonized the full UI and map rendering into a unified dark rune-tech style
- Re-themed gameplay HUD controls and overlays to match the Config screen visual hierarchy: pale-gold headers, white core stats, green modifier highlights, and red HP emphasis.
- Replaced emoji-forward control icons with a consistent rune-glyph button language while preserving existing control layout and labels.
- Kept dungeon topology unchanged but skinned map tiles with textured wall/floor rendering, added gold-pile loot rendering, and switched on-map actors to simple sprites (helmet player + simplified enemies, including a rat sprite).

Apr 3, 2026 — 11:48 PM PT — Made Rogues and Detection Ring users immune to enchanted wall effects
- Rogues and characters wearing the Ring of Detection no longer get woozy or direction-distortion from enchanted walls.
- Added the immunity feedback message: "The enchanted walls glow but seem to have no effect on you."

Apr 3, 2026 — 11:41 PM PT — Made allied companions actively defend and engage nearby threats
- Allies now prioritize enemies threatening the player before chasing distant targets.
- Ally pursuit uses deeper pathfinding, so summoned and hired companions navigate corridors into fights more reliably.
- Allies regroup closer to the player when no immediate threat is present.

Apr 3, 2026 — 11:25 PM PT — Added Cleric Weaken spell with room-wide defense debuff
- Cleric special action now opens a spell menu with both `Weaken` and `Divine Heal`.
- `Weaken` applies `Weakened` to enemies in the current room for 4 turns, reducing defense and suppressing dodge/phase avoidance.
- Updated Cleric class UI copy to surface the new spell and cooldown state.

Apr 3, 2026 — 10:58 PM PT — Fixed Cleric Identify scrolls so they correctly reveal carried consumables
- Class starter scrolls are now created with `makeScroll(...)`, ensuring `effectId` is present and Identify effects execute properly.

Apr 3, 2026 — 10:40 PM PT — Fixed enchanted walls rendering as black floor squares
- Added explicit `T.ENCHANTED_WALL` draw handling in the main map and minimap tile renderers so enchanted walls display in purple.

Apr 3, 2026 — 10:28 PM PT — Restored the previous maze and HUD visuals after review
- Reverted the rejected dark-fantasy UI/art overhaul.
- Restored the prior maze readability and the more distinctive original on-map presentation.

Apr 3, 2026 — 8:44 PM PT — 5072265 — Consolidated the character roster into 9 distinct classes
- Finished the merged-class refactor for Rogue, Conjurer, Monk, Beastmaster, Dark Wizard, and Escape Artist.
- Reworked class actions, cooldowns, save migration, and UI text to remove deleted-class runtime wiring.
- Added Monk Meditate, Conjurer Arcane Dart, Rogue Roundhouse Kick, Beastmaster animal charm, and Ranger finite arrows.

Apr 3, 2026 — 1:30 PM PT — Added agent handoff notes for switching computers
- Added `AGENT_HANDOFF.md` with completed work summary, current state, open issues, and restart steps.

Apr 3, 2026 — 11:37 AM PT — Clarified Escape Route availability text in the UI
- Escape Artist special button now shows `ESCAPE` when available instead of `0/1`.
- Escape Route ability text now shows clear `Ready/Used` status (and `X left` with mastery).

Apr 3, 2026 — 11:10 AM PT — Improved Escape Artist mobility and fixed startup crash on new runs
- Escape Artist now teleports to a nearby chamber instead of stairs.
- Added mobile quality-of-life updates, including aimed-shot cancel and long-press gear details.
- Fixed a startup crash in potion/scroll randomization that caused a black/blank maze after Descend.

Apr 3, 2026 — 9:13 AM PT — 7d86b0b — Added enemy intent indicators with a settings toggle
- Added a new `Enemy Intent Indicators` toggle in Config → Settings.
- Added enemy intent icons above visible enemies to preview likely next actions.
- Saved the toggle preference so it persists across reloads.
