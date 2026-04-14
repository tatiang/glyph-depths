# Changelog

Apr 13, 2026 — 6:07 PM PT — Rebuilt the title screen with premium non-emoji key art and layout
- Replaced the old emoji/glyph title graphic with a framed sprite collage using local assets (`sample_character`, `slime`, `black-widow`).
- Added a new dark-stone + gold title visual system with fog/rune ambient motion and mobile-safe call-to-action layout.
- Refactored `showTitle()` so it initializes title ambient rune sparks instead of generating inline emoji art.

Apr 12, 2026 — 12:41 AM PT — Added persistent Run Chronicle with lifetime stats and cloud run-history merge
- Added a new Run Chronicle overlay with scrollable run history entries (class, floor, outcome/cause, runes, badges, turns, steps, kills, score).
- Added persistent lifetime metrics across runs: total turns, total steps, total kills, favorite class, and deepest floor.
- Added local archive storage (`glyphDepths_runArchive_v1`) plus cloud run-history sync using run-id merge to avoid duplicates across devices.

Apr 12, 2026 — 12:13 AM PT — Bone key gates now generate only on true room boundaries
- Reworked bonus wing entrance selection to validate room-edge wall tiles before placing a locked bone key gate.
- Locked gates now always have room floor on the inside and newly carved wing space on the outside.
- Bone Keys now spawn from pre-wing main-floor rooms to keep the locked wing reliably reachable.

Apr 12, 2026 — 12:04 AM PT — Soul Amulets now offer level-scaled heal, burst, and ward powers
- Replaced the single Soul Amulet heal action with three options: `Soul Mend`, `Soul Burst`, and `Soul Ward`.
- Added player-level scaling for all three effects and a 4-turn Soul Ward shield that absorbs incoming damage.
- Updated Soul Amulet gear/menu text to show current per-level effect values in-game.

Apr 11, 2026 — 11:46 PM PT — Improved title-screen exit flow and fixed multiple targeting/shop bugs
- Added `Back to Title` on class select and `Esc` support to return to the title screen.
- Fixed Merchant item-card `Cancel` interactions and added quantity tags for stackable store inventory entries.
- Mimics now disguise as monsters instead of gear/chest-like visuals, and Ki Bolt indicators with Iron Focus no longer stop at monsters.

Apr 11, 2026 — 2:53 PM PT — Resolved PR #44 merge conflicts against current mainline
- Merged latest `main` changes into PR branch `claude/wizardly-northcutt` to make PR #44 mergeable again.
- Kept current class/audio/input behavior from `main` while preserving existing Bishop class feature content.
- Verified newly tracked class image assets match the local image files in this repo.

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
