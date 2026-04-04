# ExecPlan: Character Class Consolidation and Legacy Cleanup

## Summary
- Finish the 9-class consolidation in `game.js`.
- Remove legacy runtime wiring for deleted classes from specials, save/load, stats panels, and item/equipment flows.
- Add Monk, Conjurer, Ranger, Rogue, and Beastmaster mechanic updates from the approved design.
- Keep the floor-13 unlock on `maze_master`.

## Acceptance Steps
1. `node --check game.js`
2. `rg -n "classId === 'wizard'|classId === 'bard'|classId === 'artificer'|classId === 'ninja'|classId === 'mason'|classId === 'daredevil'|classId === 'barterer'|classId === 'sage'" game.js`
3. Start a new run and verify:
   - Ranger starts with 50 arrows.
   - Monk cannot equip weapons/armor/ranged items and can use Meditate.
   - Conjurer special opens a spell menu for Arcane Dart and Illusion.
   - Rogue gains Roundhouse Kick behavior at level 5.
   - Beastmaster starts with a hound and can charm Bats, Slimes, and Spiders.

## Progress
- Completed: normalized the live roster to 9 classes and added legacy-class save remapping.
- Completed: added Ranger finite ammo, Monk song mastery + Meditate, Conjurer Arcane Dart menu, Rogue Roundhouse Kick, and Beastmaster animal charm + hound helper.
- Completed: pruned legacy UI/action routing for removed class specials from the main runtime paths.
- Completed: removed dead deleted-class helper functions plus leftover Barterer/Artificer/Ninja merchant and item-menu behavior.
- In progress: verification, changelog finalization, and release bookkeeping.

## Decision Log
- Reused the existing `maze_master` badge for Monk/Beastmaster unlocking instead of adding a duplicate floor-13 badge.
- Monk gear lockout is hard prevention, with rings still allowed.
- Beastmaster charm replaces the prior charmed animal by removing the old charmed ally before converting a new one.
- Dark Wizard kept Arcane Affinity, Necromancy, Acid Bolt, and Necrotic Surge; old Wizard perks stayed removed.

## Surprises
- The in-progress local `game.js` already contained part of the roster consolidation, but special-button logic, level-up perks, save/load, and class info panels were still split across the deleted roster.
- Beastmaster’s initial hound spawn used an invalid `'.'` tile check, so it needed a real ally-spawn helper.
- Merchant pricing, appraise, and minimap visibility still had live Barterer-era behavior even after the class cards were already reduced to 9 classes.
