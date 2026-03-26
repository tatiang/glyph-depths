// ============================================================
// GLYPH DEPTHS — Complete Roguelike Game Engine
// ============================================================

(() => {
'use strict';

// === CONSTANTS ===
const MAP_W = 50, MAP_H = 50;
const VIEW_COLS = 15, VIEW_ROWS = 19;
const FOV_RADIUS = 8;
const MAX_INVENTORY = 10;
const MAX_FLOOR = 20;
const HUNGER_TICK = 10; // lose 1 hunger every N turns
const HUNGER_DAMAGE_TICK = 5; // lose 1 HP every N turns at 0 hunger

// Tile types
const T = { WALL: 0, FLOOR: 1, CORRIDOR: 2, STAIRS_DOWN: 3, STAIRS_UP: 4, DOOR_CLOSED: 5, DOOR_OPEN: 6, SPECIAL: 7, DOOR_ONEWAY: 8, DOOR_SEALED: 9, WALL_SECRET: 10, DOOR_LOCKED: 11, TELEPORT: 12, TELEPORT_VIS: 13, RUBBLE: 14 };

// === GAME STATE ===
let state = null; // main game state object
let canvas, ctxC; // canvas and 2d context
let tileSize = 25;
let inputLocked = false;
let settings = { sound: true, haptics: true, dpad: true, autopickup: true, autoEquip: false, heroIcon: '🧝', helpFontSize: 1, difficulty: 'normal' };
const HERO_ICONS = ['🧝', '🥷', '🧛', '🧟', '🧞', '🧚', '🦸', '🏹', '🐉'];
const GAME_VERSION = 'v0.9.5 — 15 classes, teleport tiles, avalanches'; // updated each push
const LAST_UPDATED = '2026-03-23 16:30';

// === BADGE / ACHIEVEMENT SYSTEM ===
const BADGE_DEFS = [
  // Combat Mastery
  { id: 'first_blood', name: 'First Blood', icon: '⚔️', desc: 'Kill your first enemy', cat: 'combat' },
  { id: 'exterminator', name: 'Exterminator', icon: '💀', desc: 'Kill 100 enemies total', cat: 'combat', cumulative: true },
  { id: 'rat_catcher', name: 'Rat Catcher', icon: '🐀', desc: 'Kill 10 rats total', cat: 'combat', cumulative: true },
  { id: 'demon_slayer', name: 'Demon Slayer', icon: '🔥', desc: 'Kill 5 demons total', cat: 'combat', cumulative: true },
  { id: 'regicide', name: 'Regicide', icon: '👑', desc: 'Defeat the Glyph King', cat: 'combat' },
  { id: 'crit_master', name: 'Critical Master', icon: '💥', desc: 'Land 3 crits on a single floor', cat: 'combat' },
  { id: 'untouchable', name: 'Untouchable', icon: '🛡️', desc: 'Clear a floor without taking damage', cat: 'combat' },
  { id: 'one_shot', name: 'One-Shot', icon: '🗡️', desc: 'Kill an enemy with 10+ damage in one hit', cat: 'combat' },
  { id: 'sharpshooter', name: 'Sharpshooter', icon: '🏹', desc: 'Kill 3 enemies with thrown weapons in one run', cat: 'combat' },
  { id: 'boss_rush', name: 'Boss Rush', icon: '☠️', desc: 'Defeat all 3 mini-bosses in one run', cat: 'combat' },
  // Exploration & Survival
  { id: 'deep_diver', name: 'Deep Diver', icon: '🚪', desc: 'Reach floor 8', cat: 'explore' },
  { id: 'citadel_bound', name: 'Citadel Bound', icon: '🏰', desc: 'Reach floor 15', cat: 'explore' },
  { id: 'ascendant', name: 'Ascendant', icon: '🌟', desc: 'Win the game', cat: 'explore' },
  { id: 'cartographer', name: 'Cartographer', icon: '🗺️', desc: 'Reveal 90%+ of a floor', cat: 'explore' },
  { id: 'iron_stomach', name: 'Iron Stomach', icon: '🍖', desc: 'Reach floor 5 without eating', cat: 'explore' },
  { id: 'ghostbuster', name: 'Ghostbuster', icon: '👻', desc: 'Defeat your own ghost', cat: 'explore' },
  { id: 'no_turning_back', name: 'No Turning Back', icon: '🚷', desc: 'Use 5 one-way doors in one run', cat: 'explore' },
  { id: 'shrine_gambler', name: 'Shrine Gambler', icon: '🔮', desc: 'Use 3 shrines in one run', cat: 'explore' },
  { id: 'hoarder', name: 'Hoarder', icon: '💰', desc: 'Finish a run with 200+ gold', cat: 'explore' },
  { id: 'alchemist', name: 'Alchemist', icon: '⚗️', desc: 'Identify all 6 potion types in one run', cat: 'explore' },
  // Class Mastery
  { id: 'win_adventurer', name: "Adventurer's Journey", icon: '🤺', desc: 'Win as Adventurer', cat: 'class' },
  { id: 'win_berserker', name: "Berserker's Fury", icon: '💪', desc: 'Win as Berserker', cat: 'class' },
  { id: 'win_rogue', name: "Shadow's Edge", icon: '🥷', desc: 'Win as Rogue', cat: 'class' },
  { id: 'win_wizard', name: 'Arcane Mastery', icon: '🧙', desc: 'Win as Wizard', cat: 'class' },
  { id: 'win_ranger', name: "Ranger's Mark", icon: '🏹', desc: 'Win as Ranger', cat: 'class' },
  { id: 'win_cleric', name: 'Divine Crusade', icon: '⛪', desc: 'Win as Cleric', cat: 'class' },
  { id: 'win_bard', name: "Bard's Ballad", icon: '🎵', desc: 'Win as Bard', cat: 'class' },
  { id: 'win_artificer', name: "Artificer's Opus", icon: '⚒️', desc: 'Win as Artificer', cat: 'class' },
  { id: 'win_ninja', name: "Ninja's Shadow", icon: '🌟', desc: 'Win as Ninja', cat: 'class' },
  { id: 'win_darkwizard', name: "Necromancer's Throne", icon: '💀', desc: 'Win as Dark Wizard', cat: 'class' },
  { id: 'win_mason', name: "Mason's Bastion", icon: '🧱', desc: 'Win as Brick Mason', cat: 'class' },
  { id: 'win_daredevil', name: "Daredevil's Gamble", icon: '🤸', desc: 'Win as Daredevil', cat: 'class' },
  { id: 'win_escapeartist', name: "Escape Artist's Exit", icon: '💨', desc: 'Win as Escape Artist', cat: 'class' },
  { id: 'win_conjurer', name: "Conjurer's Phantom", icon: '🎭', desc: 'Win as Conjurer', cat: 'class' },
  { id: 'win_barterer', name: "Barterer's Fortune", icon: '🪙', desc: 'Win as Barterer', cat: 'class' },
  // Challenge
  { id: 'speed_runner', name: 'Speed Runner', icon: '⚡', desc: 'Win in under 1000 turns', cat: 'challenge' },
  { id: 'perfectionist', name: 'Perfectionist', icon: '🎯', desc: 'Win on your very first run', cat: 'challenge' },
  { id: 'skeleton_key', name: 'Skeleton Key', icon: '🦴', desc: 'Bash 10 sealed doors total', cat: 'challenge', cumulative: true },
  { id: 'scroll_scholar', name: 'Scroll Scholar', icon: '📜', desc: 'Use 20 scrolls total', cat: 'challenge', cumulative: true },
];

let badgeState = {}; // { badgeId: { unlocked: true, date: '...' } }
let badgeCounts = {}; // cumulative counters: { exterminator: 100, rat_catcher: 10, ... }
let badgesEarnedThisRun = []; // badges unlocked during current run

function loadBadges() {
  try {
    badgeState = JSON.parse(localStorage.getItem('glyphDepths_badges') || '{}');
    badgeCounts = JSON.parse(localStorage.getItem('glyphDepths_badgeCounts') || '{}');
  } catch { badgeState = {}; badgeCounts = {}; }
}

function saveBadges() {
  try {
    localStorage.setItem('glyphDepths_badges', JSON.stringify(badgeState));
    localStorage.setItem('glyphDepths_badgeCounts', JSON.stringify(badgeCounts));
  } catch {}
}

function unlockBadge(id) {
  if (badgeState[id]?.unlocked) return false;
  const def = BADGE_DEFS.find(b => b.id === id);
  if (!def) return false;
  badgeState[id] = { unlocked: true, date: new Date().toISOString().split('T')[0] };
  badgesEarnedThisRun.push(id);
  saveBadges();
  showBadgeToast(def);
  return true;
}

function hasBadge(id) { return !!badgeState[id]?.unlocked; }

function incrementBadgeCount(key, amount) {
  badgeCounts[key] = (badgeCounts[key] || 0) + amount;
  saveBadges();
}

function getBadgeCount() {
  return BADGE_DEFS.filter(b => badgeState[b.id]?.unlocked).length;
}

function showBadgeToast(def) {
  const toast = $('badge-toast');
  if (!toast) return;
  toast.innerHTML = `<span class="badge-toast-icon">${def.icon}</span> <span class="badge-toast-text">Badge Unlocked: ${def.name}</span>`;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function showBadgeOverlay() {
  const grid = $('badge-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const cats = ['combat', 'explore', 'class', 'challenge'];
  const catNames = { combat: 'Combat Mastery', explore: 'Exploration', class: 'Class Mastery', challenge: 'Challenge' };
  for (const cat of cats) {
    const heading = document.createElement('div');
    heading.className = 'badge-cat-heading';
    heading.textContent = catNames[cat];
    grid.appendChild(heading);
    const row = document.createElement('div');
    row.className = 'badge-row';
    for (const b of BADGE_DEFS.filter(d => d.cat === cat)) {
      const cell = document.createElement('div');
      const owned = hasBadge(b.id);
      cell.className = 'badge-cell' + (owned ? ' unlocked' : '');
      cell.innerHTML = `<div class="badge-icon">${owned ? b.icon : '?'}</div><div class="badge-name">${owned ? b.name : '???'}</div>`;
      if (owned) cell.title = b.desc;
      cell.addEventListener('click', () => {
        const tip = $('badge-tip');
        if (tip) {
          tip.textContent = owned ? `${b.icon} ${b.name} — ${b.desc}` : 'Locked';
          tip.style.opacity = '1';
          setTimeout(() => { tip.style.opacity = '0'; }, 2500);
        }
      });
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
  $('badge-count-display').textContent = `${getBadgeCount()} / ${BADGE_DEFS.length}`;
  inputLocked = true;
  $('badge-overlay').classList.add('active');
}

function closeBadgeOverlay() {
  $('badge-overlay').classList.remove('active');
  inputLocked = false;
}

function renderBadgesEarned(containerId) {
  const el = $(containerId);
  if (!el) return;
  if (badgesEarnedThisRun.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);font-size:11px;">No new badges this run</div>';
    return;
  }
  el.innerHTML = badgesEarnedThisRun.map(id => {
    const b = BADGE_DEFS.find(d => d.id === id);
    return b ? `<span class="badge-earned">${b.icon} ${b.name}</span>` : '';
  }).join('');
}

// === PRESTIGE / MASTERY SYSTEM ===
// Persistent cross-run progression stored in localStorage
let masteryState = {};
const MASTERY_PREFIX = 'glyphDepths_mastery';

const MASTERY_DEFS = [
  { id: 'adv_mastery',  trigger: 'win_adventurer', name: 'Adventurer Mastery',  desc: 'All Adventurers start with +1 DEF',       classReq: 'adventurer', bonus: { defense: 1 } },
  { id: 'ber_mastery',  trigger: 'win_berserker',  name: 'Berserker Mastery',   desc: 'All Berserkers start with +3 max HP',     classReq: 'berserker',  bonus: { maxHp: 3 } },
  { id: 'rog_mastery',  trigger: 'win_rogue',      name: 'Rogue Mastery',       desc: 'All Rogues start with +5% crit chance',   classReq: 'rogue',      bonus: { critChance: 0.05 } },
  { id: 'wiz_mastery',  trigger: 'win_wizard',     name: 'Wizard Mastery',      desc: 'All Wizards start with +2 ATK',           classReq: 'wizard',     bonus: { attack: 2 } },
  { id: 'ran_mastery',  trigger: 'win_ranger',     name: 'Ranger Mastery',      desc: 'Rangers start with Hunting Bow',          classReq: 'ranger',     bonus: { upgradeBow: true } },
  { id: 'cle_mastery',  trigger: 'win_cleric',     name: 'Cleric Mastery',      desc: 'All Clerics start with +3 max HP',        classReq: 'cleric',     bonus: { maxHp: 3 } },
  { id: 'brd_mastery',  trigger: 'win_bard',       name: 'Bard Mastery',        desc: 'All Bards start with +5% charm chance',   classReq: 'bard',       bonus: { charmBonus: 0.05 } },
  { id: 'art_mastery',  trigger: 'win_artificer',  name: 'Artificer Mastery',   desc: 'All Artificers start with +2 max HP',     classReq: 'artificer',  bonus: { maxHp: 2 } },
  { id: 'nj_mastery',   trigger: 'win_ninja',      name: 'Ninja Mastery',       desc: 'All Ninjas start with +1 ATK',            classReq: 'ninja',      bonus: { attack: 1 } },
  { id: 'dw_mastery',   trigger: 'win_darkwizard', name: 'Dark Wizard Mastery', desc: 'All Dark Wizards start at 12% necromancy', classReq: 'darkwizard', bonus: { necroBonus: 0.04 } },
  { id: 'bm_mastery',   trigger: 'win_mason',      name: 'Mason Mastery',       desc: 'All Brick Masons start with +1 DEF',      classReq: 'mason',      bonus: { defense: 1 } },
  { id: 'dd_mastery',   trigger: 'win_daredevil',  name: 'Daredevil Mastery',   desc: 'All Daredevils start Flip at 3-turn CD',  classReq: 'daredevil',  bonus: { fastFlip: true } },
  { id: 'ea_mastery',   trigger: 'win_escapeartist', name: 'Escape Artist Mastery', desc: 'All Escape Artists get 2 Escape Route uses/floor', classReq: 'escapeartist', bonus: { extraEscape: true } },
  { id: 'conj_mastery', trigger: 'win_conjurer',   name: 'Conjurer Mastery',    desc: 'All Conjurers start with Illusion cooldown 6 instead of 8', classReq: 'conjurer', bonus: { fastIllusion: true } },
  { id: 'bart_mastery', trigger: 'win_barterer',   name: 'Barterer Mastery',    desc: 'All Barterers start with +5 gold',         classReq: 'barterer',   bonus: { startGold: 5 } },
  { id: 'veteran',      trigger: 'ascendant',      name: 'Veteran',             desc: 'All classes start with +1 max HP',        classReq: null,         bonus: { maxHp: 1 } },
  { id: 'slayer',       trigger: 'exterminator',   name: 'Seasoned Slayer',     desc: 'All classes start with +1 ATK',           classReq: null,         bonus: { attack: 1 } },
  { id: 'rune_adept',   trigger: 'rune_collector', name: 'Rune Adept',          desc: '1st floor rune is always revealed on map', classReq: null,        bonus: { revealRune: true } },
];

function loadMastery() {
  try {
    masteryState = JSON.parse(localStorage.getItem(MASTERY_PREFIX) || '{}');
  } catch { masteryState = {}; }
}

function saveMastery() {
  try { localStorage.setItem(MASTERY_PREFIX, JSON.stringify(masteryState)); } catch {}
}

function checkMasteryUnlocks() {
  let newUnlocks = [];
  for (const m of MASTERY_DEFS) {
    if (masteryState[m.id]) continue; // already unlocked
    // Check if the trigger badge is unlocked
    if (m.trigger === 'rune_collector') {
      // Special: collect 15+ runes across all runs
      if ((masteryState._runesCollected || 0) >= 15) {
        masteryState[m.id] = true;
        newUnlocks.push(m);
      }
    } else if (hasBadge(m.trigger)) {
      masteryState[m.id] = true;
      newUnlocks.push(m);
    }
  }
  if (newUnlocks.length > 0) {
    saveMastery();
    for (const m of newUnlocks) {
      showMasteryToast(m);
    }
  }
}

function trackRuneCollection(count) {
  masteryState._runesCollected = (masteryState._runesCollected || 0) + count;
  saveMastery();
}

function showMasteryToast(mastery) {
  const toast = $('badge-toast');
  if (!toast) return;
  toast.innerHTML = `<span class="badge-toast-icon">⭐</span> <span class="badge-toast-text">Mastery Unlocked: ${mastery.name}</span>`;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3500);
}

function getMasteryBonuses(classId) {
  const bonuses = { maxHp: 0, attack: 0, defense: 0, critChance: 0, charmBonus: 0, necroBonus: 0, upgradeBow: false, revealRune: false, fastFlip: false, extraEscape: false, fastIllusion: false, startGold: 0 };
  for (const m of MASTERY_DEFS) {
    if (!masteryState[m.id]) continue;
    if (m.classReq && m.classReq !== classId) continue;
    if (m.bonus.maxHp) bonuses.maxHp += m.bonus.maxHp;
    if (m.bonus.attack) bonuses.attack += m.bonus.attack;
    if (m.bonus.defense) bonuses.defense += m.bonus.defense;
    if (m.bonus.critChance) bonuses.critChance += m.bonus.critChance;
    if (m.bonus.charmBonus) bonuses.charmBonus += m.bonus.charmBonus;
    if (m.bonus.necroBonus) bonuses.necroBonus += m.bonus.necroBonus;
    if (m.bonus.upgradeBow) bonuses.upgradeBow = true;
    if (m.bonus.revealRune) bonuses.revealRune = true;
    if (m.bonus.fastFlip) bonuses.fastFlip = true;
    if (m.bonus.extraEscape) bonuses.extraEscape = true;
    if (m.bonus.fastIllusion) bonuses.fastIllusion = true;
    if (m.bonus.startGold) bonuses.startGold += m.bonus.startGold;
  }
  return bonuses;
}

function getActiveMasteries(classId) {
  return MASTERY_DEFS.filter(m => {
    if (!masteryState[m.id]) return false;
    if (m.classReq && m.classReq !== classId) return false;
    return true;
  });
}

// === PERK SYNERGIES ===
const PERK_SYNERGIES = [
  {
    id: 'soulfire',
    name: 'Soulfire',
    icon: '🔥',
    desc: 'Burn damage also heals you for 1 HP',
    requires: { perk: 'hasVampire', rune: 'flame' }
  },
  {
    id: 'fortress',
    name: 'Fortress',
    icon: '🏰',
    desc: 'Reflect 3 damage instead of 1 when hit',
    requires: { perk: 'ironSkin', rune: 'thorns' }
  },
  {
    id: 'berserkers_rage',
    name: "Berserker's Rage",
    icon: '💢',
    desc: 'Low-HP fury bonus increased to +5 ATK',
    requires: { perk: 'hasFury', rune: 'wrath' }
  },
  {
    id: 'lifebloom',
    name: 'Lifebloom',
    icon: '🌿',
    desc: 'Regeneration heals 2 HP per tick instead of 1',
    requires: { perk: 'hasRegen', rune: 'vitality' }
  },
  {
    id: 'deadly_precision',
    name: 'Deadly Precision',
    icon: '🎯',
    desc: '+15% crit chance (stacks with Fortune rune)',
    requires: { perk: 'glassCannon', rune: 'fortune' }
  },
  {
    id: 'blood_lord',
    name: 'Blood Lord',
    icon: '🩸',
    desc: 'Vampiric healing increased to 35% of damage',
    requires: { perk: 'hasVampire', rune: 'vampirism' }
  },
];

function hasSynergy(id) {
  const syn = PERK_SYNERGIES.find(s => s.id === id);
  if (!syn) return false;
  const p = state.player;
  const perkMet = syn.requires.perk === 'glassCannon' ? p.glassCannon : !!p[syn.requires.perk];
  const runeMet = hasRune(syn.requires.rune);
  return perkMet && runeMet;
}

function getActiveSynergies() {
  return PERK_SYNERGIES.filter(s => hasSynergy(s.id));
}

function checkNewSynergies() {
  for (const syn of PERK_SYNERGIES) {
    if (hasSynergy(syn.id) && !state.player._activeSynergies?.includes(syn.id)) {
      if (!state.player._activeSynergies) state.player._activeSynergies = [];
      state.player._activeSynergies.push(syn.id);
      addMessage(`⚡ SYNERGY: ${syn.name} — ${syn.desc}`, 'gold');
      haptic(50);
    }
  }
}

// Check badges at specific trigger points
function checkBadgesOnKill(enemy) {
  // First Blood
  unlockBadge('first_blood');

  // Cumulative kill counts
  incrementBadgeCount('total_kills', 1);
  if (badgeCounts.total_kills >= 100) unlockBadge('exterminator');

  if (enemy.name === 'Rat') {
    incrementBadgeCount('rat_kills', 1);
    if (badgeCounts.rat_kills >= 10) unlockBadge('rat_catcher');
  }
  if (enemy.name === 'Demon') {
    incrementBadgeCount('demon_kills', 1);
    if (badgeCounts.demon_kills >= 5) unlockBadge('demon_slayer');
  }

  // Ghostbuster
  if (enemy.name === 'Your Ghost') unlockBadge('ghostbuster');

  // Boss Rush tracking
  if (enemy.isMiniBoss) {
    state.runStats.miniBossesKilled++;
    if (state.runStats.miniBossesKilled >= 3) unlockBadge('boss_rush');
  }

  // Sharpshooter tracking (called separately from throwProjectile)
}

function checkBadgesOnFloorChange() {
  const floor = state.floor;
  if (floor >= 8) unlockBadge('deep_diver');
  if (floor >= 15) unlockBadge('citadel_bound');

  // Untouchable — check previous floor (no damage taken)
  if (floor > 1) {
    const prevFloor = state.floorData[floor - 1];
    if (prevFloor && prevFloor.damageTaken === 0 && prevFloor.kills > 0) {
      unlockBadge('untouchable');
    }
  }

  // Cartographer — check tile reveal percentage of previous floor
  if (floor > 1 && state.runStats.prevFloorExplored >= 0.9) {
    unlockBadge('cartographer');
  }

  // Iron Stomach — reach floor 5 without eating
  if (floor >= 5 && state.runStats.foodEaten === 0) {
    unlockBadge('iron_stomach');
  }
}

function checkBadgesOnVictory() {
  unlockBadge('ascendant');
  unlockBadge('regicide');

  // Class-specific wins
  const classId = state.player.classId;
  unlockBadge('win_' + classId);

  // Speed Runner
  if (state.player.turnsSurvived < 1000) unlockBadge('speed_runner');

  // Hoarder
  if (state.player.gold >= 200) unlockBadge('hoarder');

  // Perfectionist — first run (no previous high scores)
  try {
    const scores = JSON.parse(localStorage.getItem('glyphDepths_scores') || '[]');
    if (scores.length === 0) unlockBadge('perfectionist');
  } catch {}

  // Alchemist — all potion types identified
  const allPotionIds = ['healing', 'strength', 'invisibility', 'poison', 'experience', 'teleport'];
  if (allPotionIds.every(id => potionIdentified[id])) unlockBadge('alchemist');
}

function checkBadgesOnDeath() {
  // Hoarder (can also trigger on death)
  if (state.player.gold >= 200) unlockBadge('hoarder');

  // Alchemist
  const allPotionIds = ['healing', 'strength', 'invisibility', 'poison', 'experience', 'teleport'];
  if (allPotionIds.every(id => potionIdentified[id])) unlockBadge('alchemist');
}

// === CLASS DEFINITIONS ===
const CLASS_DEFS = [
  {
    id: 'adventurer',
    name: 'Adventurer',
    icon: '🧝',
    flavor: 'A steady hand and keen instincts. Heals slowly over time.',
    hp: 15, attack: 2, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '♻ Rapid Regeneration · 🧭 Pathfinder',
    startItems: 'Leather Vest · Healing Potion',
    statBadges: [{ label: '15 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Regen', cls: 'pos' }, { label: 'Pathfinder', cls: 'pos' }]
  },
  {
    id: 'berserker',
    name: 'Berserker',
    icon: '🪖',
    flavor: 'Hits hard but burns through food. Rage sharpens at the brink.',
    hp: 22, attack: 4, defense: 0,
    hungerRate: 2, dodgeBonus: 0, critChance: 0.10,
    passive: '⚡ Rage: +3 ATK below 40% HP',
    startItems: 'Short Sword · 2× Strength Potions',
    statBadges: [{ label: '22 HP', cls: 'pos' }, { label: '+4 ATK', cls: 'pos' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: '2× Hungry', cls: 'neg' }, { label: 'Rage Mode', cls: 'pos' }, { label: '⚡ Enrage/floor', cls: 'pos' }]
  },
  {
    id: 'rogue',
    name: 'Rogue',
    icon: '🥷',
    flavor: 'Fragile but precise. Evades blows and lands deadly strikes.',
    hp: 10, attack: 3, defense: 1,
    hungerRate: 1, dodgeBonus: 0.15, critChance: 0.20,
    passive: '👁 15% Dodge · 20% Crit',
    startItems: '6 Throwing Daggers · Invis Potion',
    statBadges: [{ label: '10 HP', cls: 'neg' }, { label: '+3 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '15% Dodge', cls: 'pos' }, { label: '20% Crit', cls: 'pos' }, { label: '👁 Stealth', cls: 'pos' }]
  },
  {
    id: 'wizard',
    name: 'Wizard',
    icon: '🧙',
    flavor: 'Frail but fearsome. Magic doubles in your learned hands.',
    hp: 11, attack: 1, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '✨ Arcane Affinity: scrolls ×2',
    startItems: 'Arcane Staff · 3 identified scrolls',
    statBadges: [{ label: '11 HP', cls: 'neg' }, { label: '+1 ATK', cls: 'neg' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Arcane ×2', cls: 'pos' }, { label: '✨ AoE Blast', cls: 'pos' }]
  },
  {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    flavor: 'Survivalist and sharpshooter. Sees further, forages better.',
    hp: 13, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0.05, critChance: 0.15,
    passive: '👁 +2 FOV · Forager',
    startItems: 'Hunting Bow · 4 Throwing Daggers · Ration',
    statBadges: [{ label: '13 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '+2 FOV', cls: 'pos' }, { label: 'Forager', cls: 'pos' }, { label: '🏹 Aimed Shot', cls: 'pos' }]
  },
  {
    id: 'cleric',
    name: 'Cleric',
    icon: '⛪',
    flavor: 'Holy warrior. Undead fear the faithful. Heals through devotion.',
    hp: 18, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '✝ Holy Aura vs Undead · Curse/Drain Immune',
    startItems: 'Mace · Healing Potion · Scroll of Identify',
    statBadges: [{ label: '18 HP', cls: 'pos' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Holy Aura', cls: 'pos' }, { label: 'No Curse', cls: 'pos' }, { label: '✝ Divine Heal', cls: 'pos' }]
  },
  {
    id: 'bard',
    name: 'Bard',
    icon: '🎵',
    flavor: 'Charming melodies soothe foes and rally allies.',
    hp: 12, attack: 1, defense: 1,
    hungerRate: 1, dodgeBonus: 0.05, critChance: 0.10,
    passive: '🎶 Charm: 25% pacify on hit · Song of Rest',
    startItems: 'Rusty Dagger · Healing Potion',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+1 ATK', cls: 'neg' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '25% Charm', cls: 'pos' }, { label: '5% Dodge', cls: 'pos' }, { label: '🎵 Song/floor', cls: 'pos' }]
  },
  {
    id: 'artificer',
    name: 'Artificer',
    icon: '⚒️',
    flavor: 'Master of metal and machinery. Upgrades gear on the fly.',
    hp: 14, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '🔧 Tinker: upgrade weapon/armor once per floor (15g) · Exclusive pre-forged item at merchants',
    startItems: 'Short Sword · Leather Vest',
    statBadges: [{ label: '14 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Forge 1/floor', cls: 'pos' }, { label: '⚒️ Forged Loot', cls: 'pos' }]
  },
  {
    id: 'ninja', name: 'Ninja', icon: '🌟',
    flavor: 'Silent, precise. Strikes front and back simultaneously.',
    hp: 11, attack: 3, defense: 0,
    hungerRate: 1, dodgeBonus: 0.15, critChance: 0.20,
    passive: '🗡️ Backstab: hits opposite tile · 🌟 Star Throw',
    startItems: 'Rusty Dagger · Throwing Stars · Healing Potion',
    statBadges: [{ label: '11 HP', cls: 'neg' }, { label: '+3 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Backstab', cls: 'pos' }, { label: '15% Dodge', cls: 'pos' }, { label: '🌟 Stars ×4', cls: 'pos' }]
  },
  {
    id: 'darkwizard', name: 'Dark Wizard', icon: '🧟',
    flavor: 'Death is not the end. The fallen serve the Dark Wizard.',
    hp: 10, attack: 1, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '💀 Necromance: chance to raise slain foes',
    startItems: 'Arcane Staff · Healing Potion · 2 Scrolls',
    statBadges: [{ label: '10 HP', cls: 'neg' }, { label: '+1 ATK', cls: 'neg' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Necromance', cls: 'pos' }, { label: '💀 Acid Bolt', cls: 'pos' }]
  },
  {
    id: 'mason', name: 'Brick Mason', icon: '🧱',
    flavor: 'Walls are not obstacles — they are options.',
    hp: 16, attack: 2, defense: 3,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '🚪 Can close doors · 🧱 Fortify ×2/floor: build or demolish walls',
    startItems: 'Mace · Chain Mail',
    statBadges: [{ label: '16 HP', cls: 'pos' }, { label: '+2 ATK', cls: '' }, { label: '+3 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Close Doors', cls: 'pos' }, { label: '🧱 Fortify ×2', cls: 'pos' }]
  },
  {
    id: 'daredevil', name: 'Daredevil', icon: '🤸',
    flavor: 'Acrobatic and reckless. Ricochets through enemy ranks.',
    hp: 12, attack: 3, defense: 0,
    hungerRate: 1, dodgeBonus: 0.20, critChance: 0.15,
    passive: '💥 Ricochet: chain damage to nearby foes',
    startItems: 'Short Sword · Leather Vest · Healing Potion',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+3 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: '20% Dodge', cls: 'pos' }, { label: 'Ricochet', cls: 'pos' }, { label: '🤸 Flip', cls: 'pos' }]
  },
  {
    id: 'escapeartist', name: 'Escape Artist', icon: '💨',
    flavor: 'Leave nothing behind but ice and regrets.',
    hp: 12, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0.15, critChance: 0.10,
    passive: '❄️ Ice Traps on retreat · 💨 Escape Route',
    startItems: 'Leather Vest · Invis Potion · 6 Throwing Daggers',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Ice Traps', cls: 'pos' }, { label: '15% Dodge', cls: 'pos' }, { label: '💨 Escape/floor', cls: 'pos' }]
  },
  {
    id: 'conjurer', name: 'Conjurer', icon: '🎭',
    flavor: 'Weaves phantoms from thin air. Enemies chase shadows while you survive.',
    hp: 12, attack: 2, defense: 0,
    hungerRate: 1, dodgeBonus: 0.10, critChance: 0.10,
    passive: '🎭 Summon Illusion [8t CD] · Conjure Ration for −5 HP',
    startItems: 'Rusty Dagger · Healing Potion',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: '10% Dodge', cls: 'pos' }, { label: '🎭 Illusion (8t CD)', cls: 'pos' }, { label: 'Ration −5 HP', cls: 'pos' }]
  },
  {
    id: 'barterer', name: 'Barterer', icon: '🪙',
    flavor: 'Everything has a price — and you always pay less than everyone else.',
    hp: 13, attack: 2, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '🪙 25% discount everywhere · Extra gold drops · Merchants always visible on map',
    startItems: '20 Gold · Healing Potion',
    statBadges: [{ label: '13 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: '25% Discount', cls: 'pos' }, { label: 'Extra Gold', cls: 'pos' }, { label: '🪙 Merchant Radar', cls: 'pos' }]
  }
];

// Potion/scroll name randomization for the run
let potionNames = [];
let scrollNames = [];
let potionIdentified = {};
let scrollIdentified = {};

// === DOM REFS ===
const $ = id => document.getElementById(id);

// === INITIALIZATION ===
function boot() {
  canvas = $('game-canvas');
  ctxC = canvas.getContext('2d');
  loadSettings();
  loadBadges();
  loadMastery();
  setupCanvas();
  setupInput();
  setupUI();
  showTitle();
  window.addEventListener('resize', () => { setupCanvas(); if (state) render(); });
}

function setupCanvas() {
  const wrap = $('canvas-wrap');
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  // Calculate tile size to fit
  const ts = Math.floor(Math.min(w / VIEW_COLS, h / VIEW_ROWS));
  tileSize = Math.max(16, Math.min(ts, 32));
  canvas.width = VIEW_COLS * tileSize;
  canvas.height = VIEW_ROWS * tileSize;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
}

// === CHARACTER NAME GENERATION ===
const FIRST_NAMES = [
  'Ronan', 'Elara', 'Thane', 'Mirka', 'Dusk', 'Vorn', 'Syla', 'Grix',
  'Fenn', 'Aldra', 'Zeph', 'Kira', 'Torvik', 'Luma', 'Drex', 'Nyssa',
  'Bram', 'Cael', 'Wren', 'Jorvik', 'Izara', 'Ogg', 'Pell', 'Skiv',
  'Truda', 'Ulvo', 'Vex', 'Wynt', 'Xara', 'Yorg'
];

const EPITHETS = [
  'the Slow', 'the Bold', 'the Unlucky', 'the Hungry', 'the Pale',
  'the Doomed', 'the Stubborn', 'the Grumpy', 'the Confused', 'the Soggy',
  'the Reckless', 'the Sleepy', 'the Forgetful', 'the Peculiar', 'the Cursed',
  'the Mighty', 'the Tiny', 'the Loud', 'the Smelly', 'the Nervous',
  'the Optimistic', 'the Backwards', 'the Slightly Famous', 'the Mostly Dead',
  'the Perpetually Lost', 'the Sneezy', 'the Overconfident', 'the Bewildered',
  'the Rust-Stained', 'the Adequately Brave'
];

function generateCharacterName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const epithet = EPITHETS[Math.floor(Math.random() * EPITHETS.length)];
  return { first, epithet };
}

// === TITLE SCREEN ===
function showTitle() {
  // Build the dungeon graphic
  const graphic = $('title-graphic');
  graphic.innerHTML = [
    '<span style="color:#3a3a4a">  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</span>',
    '<span style="color:#3a3a4a">  ▓</span><span style="color:#2a2a38">···········</span><span style="color:#3a3a4a">▓▓▓</span>',
    '<span style="color:#3a3a4a">  ▓</span><span style="color:#2a2a38">·</span><span style="color:#80ff80">▼</span><span style="color:#2a2a38">·········</span><span style="color:#8B6914">/</span><span style="color:#2a2a38">··</span><span style="color:#3a3a4a">▓</span>',
    '<span style="color:#3a3a4a">  ▓</span><span style="color:#2a2a38">·····</span><span style="color:#f0c040">' + (settings.heroIcon || '🧝') + '</span><span style="color:#2a2a38">····</span><span style="color:#3a3a4a">▓▓▓</span>',
    '<span style="color:#3a3a4a">  ▓</span><span style="color:#2a2a38">·····</span><span style="color:#ff4040">🐀</span><span style="color:#2a2a38">····</span><span style="color:#3a3a4a">▓</span>',
    '<span style="color:#3a3a4a">  ▓</span><span style="color:#2a2a38">···</span><span style="color:#ffcc00">💰</span><span style="color:#2a2a38">·······</span><span style="color:#3a3a4a">▓</span>',
    '<span style="color:#3a3a4a">  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</span>',
  ].join('<br>');

  // Floating particles
  const particles = $('title-particles');
  particles.innerHTML = '';
  const glyphs = ['·', '✦', '◆', '▪', '✧', '⬥'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    p.style.left = (5 + Math.random() * 90) + '%';
    p.style.color = ['#3a3a5a', '#504060', '#2a2a44', '#605040'][Math.floor(Math.random() * 4)];
    p.style.animationDelay = (Math.random() * 8) + 's';
    p.style.animationDuration = (6 + Math.random() * 6) + 's';
    p.style.fontSize = (10 + Math.random() * 10) + 'px';
    particles.appendChild(p);
  }

  // Reset sections so title is visible, class section is hidden
  $('title-section').style.display = 'flex';
  $('class-section').style.display = 'none';
  $('title-screen').classList.add('active');
  $('title-screen').classList.remove('class-mode');

  // Update badge count on title screen
  const badgeCountEl = $('title-badge-count');
  if (badgeCountEl) {
    const count = getBadgeCount();
    badgeCountEl.textContent = count > 0 ? `🏆 ${count}/${BADGE_DEFS.length}` : '';
  }

  // Show/hide continue button based on saved games
  const loadBtn = $('btn-load-from-title');
  if (loadBtn) {
    loadBtn.style.display = hasSavedGames() ? '' : 'none';
  }
}

function startGame() {
  Audio.init();
  Audio.setEnabled(settings.sound);
  Audio.resume();
  Audio.titleMusic();
  // Swap to class selection within the same overlay — no separate overlay needed
  $('title-section').style.display = 'none';
  $('class-section').style.display = 'flex';
  $('title-screen').classList.add('class-mode');
  showClassSelect();
}

function showClassSelect() {
  const track = $('class-pager-track');
  const dotsEl = $('class-dots');
  const pager = $('class-pager');
  const beginBtn = $('btn-begin');
  const labelEl = $('selected-class-label');
  if (!track || !beginBtn) return;
  let selectedClass = null;

  track.innerHTML = '';
  dotsEl.innerHTML = '';
  beginBtn.disabled = true;
  if (labelEl) labelEl.textContent = '';

  // Paginate: 4 classes per page
  const perPage = 4;
  const pages = [];
  for (let i = 0; i < CLASS_DEFS.length; i += perPage) {
    pages.push(CLASS_DEFS.slice(i, i + perPage));
  }

  let currentPage = 0;
  const allCards = [];

  function goToPage(idx) {
    currentPage = Math.max(0, Math.min(pages.length - 1, idx));
    track.style.transform = `translateX(-${currentPage * 100}%)`;
    dotsEl.querySelectorAll('.class-dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentPage);
    });
  }

  // Build pages
  pages.forEach((pageCls) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'class-page';
    const grid = document.createElement('div');
    grid.className = 'class-page-grid';

    for (const cls of pageCls) {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.innerHTML = `
        <div class="class-icon">${cls.icon}</div>
        <div class="class-name">${cls.name}</div>
        <div class="class-flavor">${cls.flavor}</div>
        <div class="class-badge-row">
          ${cls.statBadges.map(b => `<span class="class-stat ${b.cls}">${b.label}</span>`).join('')}
        </div>
        <div class="class-badge-row" style="margin-top:3px;">
          ${cls.passBadges.map(b => `<span class="class-stat ${b.cls}">${b.label}</span>`).join('')}
        </div>
        <div class="class-start-items">${cls.startItems}</div>
      `;
      const selectFn = () => {
        selectedClass = cls.id;
        allCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        beginBtn.disabled = false;
        if (labelEl) labelEl.textContent = `${cls.icon}  ${cls.name}`;
      };
      card.addEventListener('click', selectFn);
      card.addEventListener('touchend', (e) => {
        // Only fire on genuine taps, not swipes
        if (e.cancelable) e.preventDefault();
        selectFn();
      }, { passive: false });
      grid.appendChild(card);
      allCards.push(card);
    }

    pageEl.appendChild(grid);
    track.appendChild(pageEl);
  });

  // Build dots
  pages.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'class-dot' + (idx === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToPage(idx));
    dot.addEventListener('touchend', (e) => { e.preventDefault(); goToPage(idx); }, { passive: false });
    dotsEl.appendChild(dot);
  });

  // Swipe support on pager
  let swipeStartX = 0, swipeStartY = 0, swiping = false;
  pager.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });
  pager.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    // If horizontal swipe dominates, prevent vertical scroll
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }, { passive: false });
  pager.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && currentPage < pages.length - 1) goToPage(currentPage + 1);
      else if (dx > 0 && currentPage > 0) goToPage(currentPage - 1);
    }
  }, { passive: true });

  goToPage(0);

  // Difficulty selector — inserted above Begin button
  const existingDiffRow = $('class-footer').querySelector('.difficulty-row');
  if (existingDiffRow) existingDiffRow.remove();
  const diffRow = document.createElement('div');
  diffRow.className = 'difficulty-row';
  const difficulties = [
    { id: 'easy',   label: '⚡ Easy',   title: 'Less hunger · enemies deal −1 damage' },
    { id: 'normal', label: '⚔️ Normal', title: 'Standard challenge' },
    { id: 'hard',   label: '💀 Hard',   title: 'More hunger · enemies have +20% HP' },
  ];
  for (const d of difficulties) {
    const btn = document.createElement('button');
    btn.className = 'difficulty-btn' + (settings.difficulty === d.id ? ' active' : '');
    btn.setAttribute('data-diff', d.id);
    btn.textContent = d.label;
    btn.title = d.title;
    const handler = () => {
      settings.difficulty = d.id;
      saveSettings();
      diffRow.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handler(); }, { passive: false });
    diffRow.appendChild(btn);
  }
  const footer = $('class-footer');
  footer.insertBefore(diffRow, beginBtn);

  const startRun = () => {
    if (!selectedClass) return;
    $('title-screen').classList.remove('active');
    $('title-screen').classList.remove('class-mode');
    newRun(selectedClass);
  };
  beginBtn.onclick = startRun;
  beginBtn.ontouchend = (e) => { e.preventDefault(); startRun(); };
}

// === NEW RUN ===
function newRun(classId = 'adventurer') {
  randomizePotionScrollNames();
  state = {
    floor: 1,
    difficulty: settings.difficulty || 'normal',
    turnCount: 0,
    player: createPlayer(classId),
    entities: [],
    map: null,
    visible: null,
    explored: null,
    rooms: [],
    messages: [],
    gameOver: false,
    victory: false,
    enemiesKilled: 0,
    itemsFound: 0,
    score: 0,
    ghost: loadGhost(),
    playerName: null,
    playerEpithet: null,
    toughestKill: null,  // { name, glyph, xp }
    idleTurns: 0,        // turns spent near same spot (for wandering monster mechanic)
    lastIdleX: -1,
    lastIdleY: -1,
    minimapOpen: false,
    throwMode: false,
    throwItem: null,
    fortifyMode: false,
    fortifyCandidates: null,
    masonWalls: new Map(),
    floorData: Array.from({length: MAX_FLOOR + 1}, () => ({ kills: 0, damageDealt: 0, damageTaken: 0 })),
    peakHp: CLASS_DEFS.find(c => c.id === classId)?.hp || 15,
    doorBashes: {},
    runStats: {
      miniBossesKilled: 0,
      thrownKills: 0,
      critsThisFloor: 0,
      shrinesUsed: 0,
      oneWayDoorsUsed: 0,
      sealedDoorsBashed: 0,
      scrollsUsed: 0,
      foodEaten: 0,
      prevFloorExplored: 0
    }
  };
  badgesEarnedThisRun = [];
  const charName = generateCharacterName();
  state.playerName = charName.first;
  state.playerEpithet = charName.epithet;
  applyClassStartingItems(classId);
  applyMasteryBonuses(classId);
  const className = CLASS_DEFS.find(c => c.id === classId)?.name || 'Adventurer';
  // Welcome messages with player name and class
  addMessage(`${state.playerName} ${state.playerEpithet} ${className} descends into the Unnamed Depths.`, 'gold');
  const activeMasteries = getActiveMasteries(classId);
  if (activeMasteries.length > 0) {
    addMessage(`Mastery bonuses: ${activeMasteries.map(m => m.name).join(', ')}`, 'gold');
  }
  addMessage('Bump enemies to attack. Tap items in the bar to Equip/Use/Drop.', '');
  generateFloor();
  updateUI();
  render();
}

function createPlayer(classId = 'adventurer') {
  const cls = CLASS_DEFS.find(c => c.id === classId) || CLASS_DEFS[0];
  return {
    x: 0, y: 0,
    classId,
    glyph: cls.icon || settings.heroIcon || '🧝',
    name: 'You',
    hp: cls.hp, maxHp: cls.hp,
    attack: cls.attack, defense: cls.defense,
    level: 1, xp: 0, xpToNext: 15,
    hunger: 100,
    gold: 0,
    inventory: [],
    equipped: { weapon: null, armor: null, ring: null, ranged: null },
    arrows: 0,
    infiniteArrows: classId === 'ranger',
    loadedSpecialArrow: null, // reference to special arrow item in inventory
    runes: [], // collected glyph runes for this run
    statusEffects: [],
    hasRegen: classId === 'adventurer',
    pathfinder: classId === 'adventurer', // always see stairs on minimap
    hasVampire: false,
    ironSkin: false,
    hasFury: false,
    glassCannon: false,
    // Class-specific perk flags
    shadowStep: false,    // Rogue: invisibility on kill
    manaShield: false,    // Wizard: 25% negate incoming damage
    undyingFury: false,   // Berserker: survive lethal once per floor
    undyingFuryUsed: false,
    quickDraw: false,     // Ranger: -3 aimed shot cooldown
    sanctifiedGround: false, // Cleric: heal when standing still
    survivorInstinct: false, // Adventurer: auto-eat food at 0 hunger
    silentKill: false,    // Ninja: kills refresh/grant invisibility
    necroticSurge: false, // Dark Wizard: acid bolt poisons adjacent foes
    recklessCharge: false, // Daredevil: flip damages healthy enemies
    smokeScreen: false,   // Escape Artist: teleport leaves smoke hazard
    sharpDealer: false,   // Barterer: every 3rd purchase is free
    merchantPurchaseCount: 0, // Barterer: tracks Sharp Dealer progress
    arcaneAffinity: classId === 'wizard',
    dodgeBonus: cls.dodgeBonus,
    critChance: cls.critChance,
    hungerRate: cls.hungerRate,
    regenCounter: 0,
    turnsSurvived: 0,
    // Class special abilities
    enrageActive: false,
    engageTurnsLeft: 0,
    enrageFloorUsed: false,
    spellCooldown: 0,
    // Ranger
    fovBonus: classId === 'ranger' ? 2 : 0,
    aimedShotCooldown: 0,
    // Cleric
    divineHealUsed: false,
    curseImmune: classId === 'cleric',
    drainImmune: false, // granted by shrine sacrifice
    // Bard
    charmChance: classId === 'bard' ? 0.25 : 0,
    encore: false,
    songOfRestCooldown: 0,
    songOfRestFloorUsed: false,
    // Artificer
    tinkerFloorUsed: false,
    masterSmith: false,
    // Ninja
    backstab: classId === 'ninja',
    starThrowCooldown: 0,
    // Dark Wizard
    necromancer: classId === 'darkwizard',
    acidBoltCooldown: 0,
    // Brick Mason
    fortifyCharges: 2,
    // Daredevil
    ricochetMelee: classId === 'daredevil',
    flipCooldown: 0,
    flipMode: false,
    // Escape Artist
    stairsTeleportFloorUsed: false,
    iceTrapPassive: classId === 'escapeartist',
    // Conjurer
    illusionCooldown: 0,
    mirrorImage: false,
    // Barterer
    bartererDiscount: classId === 'barterer',
    // Wizard fire ward perk
    fireWard: false,
    fireWardCooldown: 0,
    // Ranger double shot perk
    doubleShot: false
  };
}

function applyMasteryBonuses(classId) {
  const p = state.player;
  const m = getMasteryBonuses(classId);
  if (m.maxHp > 0)      { p.maxHp += m.maxHp; p.hp += m.maxHp; }
  if (m.attack > 0)     { p.attack += m.attack; }
  if (m.defense > 0)    { p.defense += m.defense; }
  if (m.critChance > 0) { p.critChance += m.critChance; }
  if (m.charmBonus > 0) { p.charmChance += m.charmBonus; }
  if (m.startGold > 0)  { p.gold += m.startGold; }
}

function applyClassStartingItems(classId) {
  const p = state.player;
  if (classId === 'adventurer') {
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'berserker') {
    const sword = WEAPONS.find(w => w.name === 'Short Sword');
    if (sword) p.equipped.weapon = { ...sword };
    const strPotion = potionNames.find(n => n.id === 'strength');
    if (strPotion) {
      potionIdentified[strPotion.id] = true;
      p.inventory.push(makePotion(strPotion));
      p.inventory.push(makePotion(strPotion));
    }
  } else if (classId === 'rogue') {
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 6 });
    const invisPotion = potionNames.find(n => n.id === 'invisibility');
    if (invisPotion) { potionIdentified[invisPotion.id] = true; p.inventory.push(makePotion(invisPotion)); }
  } else if (classId === 'wizard') {
    p.equipped.weapon = { name: 'Arcane Staff', glyph: '🪄', itemType: 'weapon', attack: 2, tier: 1, special: 'arcane' };
    const usedIds = new Set();
    let tries = 0;
    while (p.inventory.length < 3 && tries < 30) {
      tries++;
      const s = scrollNames[Math.floor(Math.random() * scrollNames.length)];
      if (!usedIds.has(s.id)) {
        usedIds.add(s.id);
        scrollIdentified[s.id] = true;
        p.inventory.push({ ...s, glyph: '📜', itemType: 'scroll', identified: true });
      }
    }
  } else if (classId === 'ranger') {
    const bowName = getMasteryBonuses(classId).upgradeBow ? 'Hunting Bow' : 'Short Bow';
    p.equipped.ranged = { ...RANGED_WEAPONS.find(r => r.name === bowName) };
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 4 });
    p.inventory.push({ ...FOOD, stack: 1 });
    // Rangers have infinite basic arrows — no arrow count needed
  } else if (classId === 'cleric') {
    p.equipped.weapon = { name: 'Mace', glyph: '🔨', itemType: 'weapon', attack: 2, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
    const identifyScroll = scrollNames.find(n => n.id === 'identify');
    if (identifyScroll) {
      scrollIdentified[identifyScroll.id] = true;
      p.inventory.push({ ...identifyScroll, glyph: '📜', itemType: 'scroll', identified: true });
    }
  } else if (classId === 'bard') {
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'artificer') {
    const sword = WEAPONS.find(w => w.name === 'Short Sword');
    if (sword) p.equipped.weapon = { ...sword };
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
  } else if (classId === 'ninja') {
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    p.inventory.push({ name: 'Throwing Stars', glyph: '🌟', itemType: 'thrown', damage: 3, ammo: 5 });
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'darkwizard') {
    p.equipped.weapon = { name: 'Arcane Staff', glyph: '🪄', itemType: 'weapon', attack: 2, tier: 1, special: 'arcane' };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
    const usedIds = new Set();
    let tries = 0;
    while (p.inventory.length < 3 && tries < 30) {
      tries++;
      const s = scrollNames[Math.floor(Math.random() * scrollNames.length)];
      if (!usedIds.has(s.id)) {
        usedIds.add(s.id);
        scrollIdentified[s.id] = true;
        p.inventory.push({ ...s, glyph: '📜', itemType: 'scroll', identified: true });
      }
    }
  } else if (classId === 'mason') {
    p.equipped.weapon = { name: 'Mace', glyph: '🔨', itemType: 'weapon', attack: 2, tier: 1, special: null };
    const chainMail = ARMORS.find(a => a.name === 'Chain Mail');
    if (chainMail) p.equipped.armor = { ...chainMail };
  } else if (classId === 'daredevil') {
    const sword = WEAPONS.find(w => w.name === 'Short Sword');
    if (sword) p.equipped.weapon = { ...sword };
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'escapeartist') {
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 6 });
    const invisPotion = potionNames.find(n => n.id === 'invisibility');
    if (invisPotion) { potionIdentified[invisPotion.id] = true; p.inventory.push(makePotion(invisPotion)); }
  } else if (classId === 'conjurer') {
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'barterer') {
    p.gold = 20;
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  }
}

// === POTION / SCROLL NAME RANDOMIZATION ===
const POTION_COLORS = [
  { name: 'Fizzy Red Potion', glyph: '🧪', color: '#ff4444' },
  { name: 'Thick Blue Potion', glyph: '🧪', color: '#4488ff' },
  { name: 'Glowing Green Potion', glyph: '🧪', color: '#44ff44' },
  { name: 'Murky Purple Potion', glyph: '🧪', color: '#aa44ff' },
  { name: 'Shimmering Gold Potion', glyph: '🧪', color: '#ffcc00' },
  { name: 'Pale White Potion', glyph: '🧪', color: '#dddddd' }
];

const SCROLL_LABELS = [
  'Scroll labeled XYZZY', 'Scroll labeled LOREM', 'Scroll labeled FOOBAR',
  'Scroll labeled ZELGO', 'Scroll labeled KRUNK', 'Scroll labeled NIMHE',
  'Scroll labeled QUUX', 'Scroll labeled PLUGH'
];

const POTION_EFFECTS = [
  { id: 'healing', name: 'Potion of Healing', desc: 'Restores 10 HP' },
  { id: 'strength', name: 'Potion of Strength', desc: '+2 Attack for 30 turns' },
  { id: 'invisibility', name: 'Potion of Invisibility', desc: 'Invisible for 15 turns' },
  { id: 'poison', name: 'Potion of Poison', desc: 'Lose 3 HP/turn for 5 turns' },
  { id: 'experience', name: 'Potion of Experience', desc: 'Gain 20 XP' },
  { id: 'teleport', name: 'Potion of Teleportation', desc: 'Random relocation' }
];

const SCROLL_EFFECTS = [
  { id: 'mapping', name: 'Scroll of Mapping', desc: 'Reveal entire floor' },
  { id: 'fireball', name: 'Scroll of Fireball', desc: '8 damage to nearby enemies' },
  { id: 'enchant', name: 'Scroll of Enchant', desc: '+1 to equipped weapon' },
  { id: 'confusion', name: 'Scroll of Confusion', desc: 'Confuse visible enemies' },
  { id: 'identify', name: 'Scroll of Identify', desc: 'Identify an item type' },
  { id: 'summon', name: 'Scroll of Summoning', desc: 'Summon a golem ally' },
  { id: 'remove_curse', name: 'Scroll of Remove Curse', desc: 'Uncurse all equipped items' },
  { id: 'create_food', name: 'Scroll of Create Food', desc: 'Conjure two rations' }
];

function randomizePotionScrollNames() {
  const pc = shuffle([...POTION_COLORS]);
  const sl = shuffle([...SCROLL_LABELS]);
  potionNames = POTION_EFFECTS.map((e, i) => ({ ...e, fakeName: pc[i].name, color: pc[i].color }));
  scrollNames = SCROLL_EFFECTS.map((e, i) => ({ ...e, fakeName: sl[i] }));
  potionIdentified = {};
  scrollIdentified = {};
}

// === ITEM DEFINITIONS ===
const WEAPONS = [
  { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, special: null, tier: 1, value: 10 },
  { name: 'Short Sword', glyph: '⚔️', itemType: 'weapon', attack: 2, special: null, tier: 1, value: 25 },
  { name: 'War Axe', glyph: '🪓', itemType: 'weapon', attack: 3, special: 'cleave', tier: 2, value: 50 },
  { name: 'Flame Tongue', glyph: '🔥', itemType: 'weapon', attack: 2, special: 'burn', tier: 2, value: 65 },
  { name: 'Frost Brand', glyph: '❄️', itemType: 'weapon', attack: 2, special: 'freeze', tier: 2, value: 65 },
  { name: 'Vampiric Blade', glyph: '🩸', itemType: 'weapon', attack: 1, special: 'vampiric', tier: 3, value: 80 },
  { name: 'Chaos Hammer', glyph: '🔨', itemType: 'weapon', attack: 4, special: 'chaos', tier: 3, value: 90 }
];

const ARMORS = [
  { name: 'Leather Vest', glyph: '🛡️', itemType: 'armor', defense: 1, special: null, tier: 1, value: 15 },
  { name: 'Chain Mail', glyph: '🛡️', itemType: 'armor', defense: 2, special: null, tier: 2, value: 40 },
  { name: 'Plate Armor', glyph: '🛡️', itemType: 'armor', defense: 3, special: 'heavy', tier: 2, value: 55 },
  { name: 'Shadow Cloak', glyph: '🧥', itemType: 'armor', defense: 1, special: 'stealth', tier: 3, value: 70 },
  { name: 'Thorned Armor', glyph: '🛡️', itemType: 'armor', defense: 2, special: 'thorns', tier: 3, value: 75 }
];

const RINGS = [
  { name: 'Ring of Sight', glyph: '💍', itemType: 'ring', special: 'sight', value: 50 },
  { name: 'Ring of Haste', glyph: '💍', itemType: 'ring', special: 'haste', value: 60 },
  { name: 'Ring of Protection', glyph: '💍', itemType: 'ring', special: 'protection', value: 55 },
  { name: 'Ring of Hunger', glyph: '💍', itemType: 'ring', special: 'hunger', value: 45 }
];

const FOOD = { name: 'Ration', glyph: '🍖', itemType: 'food', value: 5 };
const FOOD_STACK_MAX = 5;

// Try to add a ration to an existing stack; returns true if stacked, false if new slot needed
function addFoodToInventory() {
  const p = state.player;
  const existing = p.inventory.find(i => i.itemType === 'food' && (i.stack || 1) < FOOD_STACK_MAX);
  if (existing) {
    existing.stack = (existing.stack || 1) + 1;
    existing.name = `Ration ×${existing.stack}`;
    return true;
  }
  if (p.inventory.length >= MAX_INVENTORY) return false;
  p.inventory.push({ ...FOOD, stack: 1 });
  return true;
}
const THROWING_DAGGERS = { name: 'Throwing Daggers', glyph: '🎯', itemType: 'thrown', ammo: 5, damage: 3, value: 30 };

// Ranged weapons (bows/crossbows) — equipped in separate ranged slot
const RANGED_WEAPONS = [
  { name: 'Short Bow', glyph: '🏹', itemType: 'ranged', damage: 3, range: 6, tier: 1, special: null, value: 20 },
  { name: 'Hunting Bow', glyph: '🏹', itemType: 'ranged', damage: 4, range: 8, tier: 2, special: null, value: 40 },
  { name: 'Longbow', glyph: '🏹', itemType: 'ranged', damage: 6, range: 10, tier: 3, special: null, value: 70 },
  { name: 'Crossbow', glyph: '⚙️', itemType: 'ranged', damage: 7, range: 8, tier: 3, special: 'pierce', value: 85 },
  { name: 'Elven Bow', glyph: '🏹', itemType: 'ranged', damage: 5, range: 12, tier: 3, special: 'sight', value: 80 }
];

// Special arrows — limited ammo items found as loot
const SPECIAL_ARROWS = [
  { name: 'Fire Arrows', glyph: '🔥', itemType: 'special_arrow', arrowType: 'fire', ammo: 3, damage: 0, value: 25, desc: 'Burns target for 3 turns' },
  { name: 'Frost Arrows', glyph: '❄️', itemType: 'special_arrow', arrowType: 'frost', ammo: 3, damage: 0, value: 25, desc: 'Freezes target for 2 turns' },
  { name: 'Blast Arrows', glyph: '💥', itemType: 'special_arrow', arrowType: 'blast', ammo: 2, damage: 0, value: 35, desc: 'AoE: hits adjacent enemies' },
  { name: 'Piercing Arrows', glyph: '🗡️', itemType: 'special_arrow', arrowType: 'pierce', ammo: 3, damage: 3, value: 30, desc: '+3 dmg, ignores 2 DEF' }
];

const ARROW_BUNDLE = { name: 'Arrows', glyph: '➶', itemType: 'arrows', count: 4, value: 8 };

// === GLYPH RUNE SYSTEM ===
// One rune per floor, hidden as ✦ tiles. Persistent passive effects for the run.
const GLYPH_RUNES = [
  { id: 'flame',     name: 'Glyph of Flame',     symbol: '🔶', desc: '15% chance to burn enemies on hit', effect: 'flame' },
  { id: 'frost',     name: 'Glyph of Frost',      symbol: '🔷', desc: '15% chance to freeze enemies on hit', effect: 'frost' },
  { id: 'thorns',    name: 'Glyph of Thorns',     symbol: '🟢', desc: 'Reflect 1 damage when hit', effect: 'thorns' },
  { id: 'vitality',  name: 'Glyph of Vitality',   symbol: '❤️', desc: '+3 max HP', effect: 'vitality' },
  { id: 'swiftness', name: 'Glyph of Swiftness',  symbol: '⚡', desc: '+8% dodge chance', effect: 'swiftness' },
  { id: 'sight',     name: 'Glyph of Sight',      symbol: '👁️', desc: '+1 FOV radius', effect: 'sight' },
  { id: 'greed',     name: 'Glyph of Greed',      symbol: '💎', desc: 'Enemies drop 50% more gold', effect: 'greed' },
  { id: 'hunger',    name: 'Glyph of Sustenance',  symbol: '🍞', desc: 'Hunger drains 25% slower', effect: 'hunger' },
  { id: 'wrath',     name: 'Glyph of Wrath',      symbol: '💢', desc: '+1 base attack', effect: 'wrath' },
  { id: 'warding',   name: 'Glyph of Warding',    symbol: '🛡️', desc: '+1 base defense, 50% life-drain resist', effect: 'warding' },
  { id: 'vampirism', name: 'Glyph of Vampirism',  symbol: '🩸', desc: 'Heal 1 HP per kill', effect: 'vampirism' },
  { id: 'fortune',   name: 'Glyph of Fortune',    symbol: '🍀', desc: '+5% crit chance', effect: 'fortune' },
];

// Rune tile type — we'll use a special entity, not a tile type, to avoid changing T constants
// Rune entities: { type: 'rune', x, y, glyph: '✦', rune: GLYPH_RUNES[i] }

// === ENEMY DEFINITIONS ===
const ENEMY_TIERS = {
  1: [
    { name: 'Rat', glyph: '🐀', hp: 3, attack: 1, defense: 0, ai: 'wander', xp: 2, special: 'flee', detect: 5 },
    { name: 'Skeleton', glyph: '💀', hp: 4, attack: 2, defense: 0, ai: 'patrol', xp: 4, special: null, detect: 6 },
    { name: 'Bat', glyph: '🦇', hp: 2, attack: 1, defense: 0, ai: 'wander', xp: 2, special: 'erratic', detect: 4 },
    { name: 'Slime', glyph: '🟢', hp: 8, attack: 1, defense: 2, ai: 'chase', xp: 4, special: 'split', detect: 5, slowMove: true }
  ],
  2: [
    { name: 'Goblin', glyph: '👺', hp: 8, attack: 3, defense: 1, ai: 'chase', xp: 8, special: null, detect: 7 },
    { name: 'Ghost', glyph: '👻', hp: 6, attack: 3, defense: 0, ai: 'chase', xp: 10, special: 'phase', detect: 8 },
    { name: 'Spider', glyph: '🕷️', hp: 5, attack: 2, defense: 0, ai: 'ambush', xp: 6, special: 'web', detect: 4 },
    { name: 'Ogre', glyph: '👹', hp: 15, attack: 4, defense: 2, ai: 'chase', xp: 12, special: 'slow', detect: 6 }
  ],
  3: [
    { name: 'Wraith', glyph: '🌑', hp: 10, attack: 5, defense: 1, ai: 'chase', xp: 15, special: 'drain', detect: 8 },
    { name: 'Mimic', glyph: '📦', hp: 12, attack: 4, defense: 3, ai: 'ambush', xp: 18, special: 'mimic', detect: 3 },
    { name: 'Necromancer', glyph: '☠️', hp: 8, attack: 2, defense: 1, ai: 'flee', xp: 20, special: 'summon', detect: 8 },
    { name: 'Demon', glyph: '😈', hp: 18, attack: 5, defense: 3, ai: 'chase', xp: 22, special: 'fire_trail', detect: 7 }
  ],
  4: [
    { name: 'Dark Knight', glyph: '🗡️', hp: 25, attack: 7, defense: 4, ai: 'chase', xp: 28, special: null, detect: 8 },
    { name: 'Banshee', glyph: '👻', hp: 14, attack: 6, defense: 1, ai: 'chase', xp: 25, special: 'phase', detect: 9 },
    { name: 'Hydra', glyph: '🐉', hp: 30, attack: 5, defense: 3, ai: 'chase', xp: 32, special: 'split', detect: 7 },
    { name: 'Warlock', glyph: '🧙', hp: 16, attack: 4, defense: 2, ai: 'flee', xp: 30, special: 'summon', detect: 9 }
  ],
  5: [
    { name: 'Abyssal Fiend', glyph: '👿', hp: 35, attack: 8, defense: 5, ai: 'chase', xp: 40, special: 'fire_trail', detect: 10 },
    { name: 'Void Wraith', glyph: '🌀', hp: 20, attack: 7, defense: 2, ai: 'chase', xp: 38, special: 'drain', detect: 10 },
    { name: 'Elder Mimic', glyph: '📦', hp: 28, attack: 6, defense: 5, ai: 'ambush', xp: 35, special: 'mimic', detect: 4 },
    { name: 'Arch Lich', glyph: '☠️', hp: 22, attack: 5, defense: 3, ai: 'flee', xp: 45, special: 'summon', detect: 10 }
  ]
};

const BOSS = {
  name: 'Glyph King', glyph: '👑', hp: 100, attack: 10, defense: 6,
  ai: 'boss', xp: 200, special: 'boss', detect: 50
};

// Mini-bosses guard milestone floors
const MINI_BOSSES = {
  4:  { name: 'Cave Troll',    glyph: '🧌', hp: 22, attack: 5, defense: 3, ai: 'chase', xp: 30, special: 'troll_regen', detect: 8 },
  8:  { name: 'Lich',          glyph: '🧿', hp: 28, attack: 3, defense: 2, ai: 'flee',  xp: 45, special: 'summon',      detect: 10 },
  12: { name: 'Balrog',        glyph: '👿', hp: 35, attack: 7, defense: 4, ai: 'chase', xp: 60, special: 'fire_trail',  detect: 9 },
  16: { name: 'Void Titan',    glyph: '🌀', hp: 45, attack: 8, defense: 5, ai: 'chase', xp: 80, special: 'drain',      detect: 10 },
  19: { name: 'Glyph Guardian', glyph: '⚔️', hp: 55, attack: 9, defense: 6, ai: 'chase', xp: 90, special: 'boss',      detect: 12 },
};

// === DUNGEON GENERATION (BSP) ===
function generateFloor() {
  const p = state.player;
  state.map = new Uint8Array(MAP_W * MAP_H);
  state.visible = new Uint8Array(MAP_W * MAP_H);
  state.explored = new Uint8Array(MAP_W * MAP_H);
  state.entities = [];
  state.rogueClosedDoors = new Set(); // Track doors closed by Rogue for distinct rendering
  // Reset per-floor abilities
  p.enrageFloorUsed = false;
  p.undyingFuryUsed = false;
  p.enrageActive = false;
  p.engageTurnsLeft = 0;
  state.rooms = [];

  if (state.floor === MAX_FLOOR) {
    generateBossFloor();
  } else {
    generateBSP();
  }

  // Announce biome when entering a new region — lore-flavored messages
  const BIOME_ENTRY = {
    1: 'The drowned foundations of Erathis. Water drips from stone that remembers sunlight.',
    5: 'The air turns cold. Corridors stretch in directions the dead have chosen.',
    9: 'Runed armor lines the walls. The Citadel\'s knights still remember their orders.',
    13: 'Reality thins. The darkness here is not empty — it watches.',
    17: 'Crystalline walls hum with glyph energy. The Sanctum is beautiful. It is also a trap.',
  };
  BIOME_ENTRY[MAX_FLOOR] = 'The throne room. The Glyph King waits in perfect silence.';
  if (BIOME_ENTRY[state.floor]) {
    const biome = getFloorBiome(state.floor);
    addMessage(`${biome.name}: ${BIOME_ENTRY[state.floor]}`, 'gold');
  }

  // Place stairs down (except boss floor)
  if (state.floor < MAX_FLOOR) {
    const farthestRoom = getFarthestRoom(p.x, p.y);
    const sx = farthestRoom.x + Math.floor(farthestRoom.w / 2);
    const sy = farthestRoom.y + Math.floor(farthestRoom.h / 2);
    setTile(sx, sy, T.STAIRS_DOWN);
  }

  // Spawn enemies
  spawnEnemies();

  // Spawn items
  spawnItems();

  // Place ghost from previous run
  if (state.ghost && state.ghost.floor === state.floor) {
    placeGhost();
  }

  // Merchant on floors 3, 6, 9
  if ([3, 7, 11, 15, 19].includes(state.floor)) {
    spawnMerchant();
    addMessage("There's a merchant somewhere around here...", 'good');
  }

  // Sage on floors 2, 5, 8 (uncurse, identify, heal)
  if ([2, 5, 9, 13, 17].includes(state.floor)) {
    spawnSage();
  }

  // Friendly NPC with lore on every floor
  spawnNPCs();

  // Ranger forager passive: 50% bonus ration each floor
  if (state.player.classId === 'ranger' && Math.random() < 0.5) {
    const pos = randomRoomFloorTile();
    if (pos) {
      state.entities.push(createItemEntity({ ...FOOD }, pos.x, pos.y));
      addMessage('Your keen eye spots extra provisions.', 'good');
    }
  }

  // Cleric: reset divine heal each floor
  if (state.player.classId === 'cleric') {
    state.player.divineHealUsed = false;
  }

  // Ranger: reset aimed shot cooldown each floor
  if (state.player.classId === 'ranger') {
    state.player.aimedShotCooldown = 0;
  }

  // Bard: reset song of rest each floor
  if (state.player.classId === 'bard') {
    state.player.songOfRestFloorUsed = false;
  }

  // Artificer: reset tinker each floor
  if (state.player.classId === 'artificer') {
    state.player.tinkerFloorUsed = false;
  }
  // Brick Mason: reset fortify charges each floor
  state.player.fortifyCharges = state.player.fortifyMaxCharges || 2;
  state.masonWalls = new Map();
  // Escape Artist: reset escape route each floor
  state.player.stairsTeleportFloorUsed = false;

  // Spawn special tiles (risk/reward)
  if (state.floor >= 2) {
    spawnSpecialTiles();
  }

  // Secret walls (2-4 per floor)
  if (state.floor < MAX_FLOOR) {
    spawnSecretWalls();
  }

  // Invisible teleport tiles (floor 3+)
  if (state.floor >= 3 && state.floor < MAX_FLOOR) {
    spawnTeleportTiles();
  }

  // Avalanche event (25% chance on floors 4+, never boss floor)
  if (state.floor >= 4 && state.floor < MAX_FLOOR && Math.random() < 0.25) {
    triggerAvalanche();
  }

  // Bonus wing on floors 6, 12, 18
  if ([6, 12, 18].includes(state.floor)) {
    generateBonusWing();
  }

  // Tavern on floors 5, 10, 14
  if ([5, 10, 14].includes(state.floor)) {
    spawnTavern();
  }

  // Spawn a glyph rune on each floor (from pool of runes player hasn't collected yet)
  spawnGlyphRune();

  computeFOV();
  render();
}

function generateBSP() {
  const root = { x: 1, y: 1, w: MAP_W - 2, h: MAP_H - 2, left: null, right: null, room: null };
  splitNode(root, 0);
  createRooms(root);
  connectRooms(root);

  // Place player in first room
  const firstRoom = state.rooms[0];
  state.player.x = firstRoom.x + Math.floor(firstRoom.w / 2);
  state.player.y = firstRoom.y + Math.floor(firstRoom.h / 2);

  // Add some doors
  addDoors();
}

function splitNode(node, depth) {
  if (depth > 5) return;
  if (node.w < 16 || node.h < 16) return;
  if (node.w < 10 && node.h < 10) return;

  // Choose split direction — prefer splitting longer axis
  let splitH;
  if (node.w > node.h * 1.3) splitH = false;
  else if (node.h > node.w * 1.3) splitH = true;
  else splitH = Math.random() < 0.5;

  if (splitH) {
    const split = Math.floor(node.h * (0.35 + Math.random() * 0.3));
    if (split < 8 || node.h - split < 8) return;
    node.left = { x: node.x, y: node.y, w: node.w, h: split, left: null, right: null, room: null };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split, left: null, right: null, room: null };
  } else {
    const split = Math.floor(node.w * (0.35 + Math.random() * 0.3));
    if (split < 8 || node.w - split < 8) return;
    node.left = { x: node.x, y: node.y, w: split, h: node.h, left: null, right: null, room: null };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h, left: null, right: null, room: null };
  }

  splitNode(node.left, depth + 1);
  splitNode(node.right, depth + 1);
}

function createRooms(node) {
  if (node.left || node.right) {
    if (node.left) createRooms(node.left);
    if (node.right) createRooms(node.right);
    return;
  }
  // Leaf node — create a room
  const padX = 2, padY = 2;
  const rw = Math.max(4, Math.floor(Math.random() * (node.w - padX * 2 - 2)) + 4);
  const rh = Math.max(4, Math.floor(Math.random() * (node.h - padY * 2 - 2)) + 4);
  const rx = node.x + padX + Math.floor(Math.random() * Math.max(1, node.w - padX * 2 - rw));
  const ry = node.y + padY + Math.floor(Math.random() * Math.max(1, node.h - padY * 2 - rh));

  node.room = { x: rx, y: ry, w: Math.min(rw, node.w - padX * 2), h: Math.min(rh, node.h - padY * 2) };
  state.rooms.push(node.room);

  // Carve room
  for (let y = ry; y < ry + node.room.h && y < MAP_H - 1; y++) {
    for (let x = rx; x < rx + node.room.w && x < MAP_W - 1; x++) {
      setTile(x, y, T.FLOOR);
    }
  }
}

function getRoom(node) {
  if (node.room) return node.room;
  const rooms = [];
  if (node.left) { const r = getRoom(node.left); if (r) rooms.push(r); }
  if (node.right) { const r = getRoom(node.right); if (r) rooms.push(r); }
  return rooms.length > 0 ? rooms[Math.floor(Math.random() * rooms.length)] : null;
}

function connectRooms(node) {
  if (!node.left || !node.right) return;
  connectRooms(node.left);
  connectRooms(node.right);

  const r1 = getRoom(node.left);
  const r2 = getRoom(node.right);
  if (!r1 || !r2) return;

  const x1 = r1.x + Math.floor(r1.w / 2);
  const y1 = r1.y + Math.floor(r1.h / 2);
  const x2 = r2.x + Math.floor(r2.w / 2);
  const y2 = r2.y + Math.floor(r2.h / 2);

  // L-shaped corridor
  if (Math.random() < 0.5) {
    carveCorridor(x1, y1, x2, y1);
    carveCorridor(x2, y1, x2, y2);
  } else {
    carveCorridor(x1, y1, x1, y2);
    carveCorridor(x1, y2, x2, y2);
  }
}

function carveCorridor(x1, y1, x2, y2) {
  let x = x1, y = y1;
  while (x !== x2 || y !== y2) {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
      if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR);
    }
    if (x < x2) x++; else if (x > x2) x--;
    if (y < y2) y++; else if (y > y2) y--;
  }
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
    if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR);
  }
}

function addDoors() {
  // Only place doors where a corridor meets a room (at least one adjacent FLOOR tile)
  // This prevents multiple doors along mid-corridor stretches
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (getTile(x, y) !== T.CORRIDOR) continue;

      // Horizontal door: walls left & right, passage above & below
      const isHDoor = getTile(x - 1, y) === T.WALL && getTile(x + 1, y) === T.WALL &&
                      (getTile(x, y - 1) === T.FLOOR || getTile(x, y - 1) === T.CORRIDOR) &&
                      (getTile(x, y + 1) === T.FLOOR || getTile(x, y + 1) === T.CORRIDOR);
      // Vertical door: walls above & below, passage left & right
      const isVDoor = getTile(x, y - 1) === T.WALL && getTile(x, y + 1) === T.WALL &&
                      (getTile(x - 1, y) === T.FLOOR || getTile(x - 1, y) === T.CORRIDOR) &&
                      (getTile(x + 1, y) === T.FLOOR || getTile(x + 1, y) === T.CORRIDOR);

      if (!isHDoor && !isVDoor) continue;

      // Must be adjacent to at least one room FLOOR tile (not just corridor-to-corridor)
      const adjFloor = (isHDoor && (getTile(x, y - 1) === T.FLOOR || getTile(x, y + 1) === T.FLOOR)) ||
                       (isVDoor && (getTile(x - 1, y) === T.FLOOR || getTile(x + 1, y) === T.FLOOR));
      if (!adjFloor) continue;

      // Don't place a door if there's already a door within 3 tiles along this corridor
      let nearbyDoor = false;
      if (isHDoor) {
        for (let dy = -3; dy <= 3; dy++) {
          if (dy === 0) continue;
          const t = getTile(x, y + dy);
          if (t === T.DOOR_CLOSED || t === T.DOOR_ONEWAY) { nearbyDoor = true; break; }
          if (t === T.WALL) break; // hit a wall, stop checking this direction
        }
      } else {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx === 0) continue;
          const t = getTile(x + dx, y);
          if (t === T.DOOR_CLOSED || t === T.DOOR_ONEWAY) { nearbyDoor = true; break; }
          if (t === T.WALL) break;
        }
      }
      if (nearbyDoor) continue;

      if (Math.random() < 0.5) {
        setTile(x, y, T.DOOR_CLOSED);
      }
    }
  }

  // Add rare one-way doors (close permanently behind you)
  addOneWayDoors();
}

// BFS reachability check — used to ensure one-way doors don't create dead ends
function bfsReachable(sx, sy, tx, ty) {
  const visited = new Set();
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) return true;
    const k = y * MAP_W + x;
    if (visited.has(k)) continue;
    visited.add(k);
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = x + dx, ny = y + dy;
      const t = getTile(nx, ny);
      // Treat closed doors and corridors as passable for connectivity check
      if (t === T.WALL || t === T.DOOR_SEALED) continue;
      q.push([nx, ny]);
    }
  }
  return false;
}

function addOneWayDoors() {
  if (state.floor <= 1 || state.floor >= MAX_FLOOR) return;

  // Find stairs
  let stx = -1, sty = -1;
  outer: for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (getTile(x, y) === T.STAIRS_DOWN) { stx = x; sty = y; break outer; }
    }
  }
  if (stx < 0) return;

  const candidates = [];
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (getTile(x, y) !== T.DOOR_CLOSED) continue;

      // Identify the tile on each side of the door along its corridor axis.
      // A one-way door is only valid if both sides still connect to each other
      // via an alternative path — guaranteeing the player can always get back.
      let sideA, sideB;
      if (getTile(x - 1, y) !== T.WALL && getTile(x + 1, y) !== T.WALL) {
        sideA = [x - 1, y]; sideB = [x + 1, y]; // horizontal corridor
      } else if (getTile(x, y - 1) !== T.WALL && getTile(x, y + 1) !== T.WALL) {
        sideA = [x, y - 1]; sideB = [x, y + 1]; // vertical corridor
      } else {
        continue; // can't determine axis — skip
      }

      setTile(x, y, T.WALL); // temporarily block
      // Both sides must still reach each other (alternative path exists)
      // AND stairs must still be reachable from the player start
      const altPath  = bfsReachable(sideA[0], sideA[1], sideB[0], sideB[1]);
      const stairsOk = altPath && bfsReachable(state.player.x, state.player.y, stx, sty);
      setTile(x, y, T.DOOR_CLOSED); // restore

      if (altPath && stairsOk) candidates.push({ x, y });
    }
  }

  const count = Math.min(candidates.length, Math.random() < 0.5 ? 1 : 2);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const { x, y } = candidates.splice(idx, 1)[0];
    setTile(x, y, T.DOOR_ONEWAY);
  }
}

function generateBossFloor() {
  // Big open arena with pillars
  state.rooms = [];
  // Fill with walls first (already done by Uint8Array init)
  // Create a big room in the center
  const room = { x: 10, y: 10, w: 30, h: 30 };
  state.rooms.push(room);
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      setTile(x, y, T.FLOOR);
    }
  }
  // Add pillars
  for (let py = 15; py <= 35; py += 5) {
    for (let px = 15; px <= 35; px += 5) {
      setTile(px, py, T.WALL);
    }
  }
  // Entrance corridor
  for (let y = room.y + Math.floor(room.h / 2) - 1; y <= room.y + Math.floor(room.h / 2) + 1; y++) {
    for (let x = 1; x < room.x; x++) {
      setTile(x, y, T.CORRIDOR);
    }
  }
  // Stairs up at entrance
  setTile(2, room.y + Math.floor(room.h / 2), T.STAIRS_UP);
  // Player start
  state.player.x = 5;
  state.player.y = room.y + Math.floor(room.h / 2);
  // Boss in center
  const boss = createEnemy(BOSS, 25, 25);
  state.entities.push(boss);
  Audio.boss();
}

// === TILE HELPERS ===
function getTile(x, y) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return T.WALL;
  return state.map[y * MAP_W + x];
}

function setTile(x, y, t) {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return;
  state.map[y * MAP_W + x] = t;
}

function isWalkable(x, y) {
  const t = getTile(x, y);
  return t !== T.WALL && t !== T.RUBBLE && t !== T.DOOR_CLOSED && t !== T.DOOR_ONEWAY && t !== T.DOOR_SEALED && t !== T.WALL_SECRET && t !== T.DOOR_LOCKED;
  // TELEPORT and TELEPORT_VIS are walkable (floor-like)
}

function isTransparent(x, y) {
  const t = getTile(x, y);
  return t !== T.WALL && t !== T.RUBBLE && t !== T.DOOR_CLOSED && t !== T.DOOR_SEALED && t !== T.WALL_SECRET && t !== T.DOOR_LOCKED;
  // One-way doors are visible (transparent) but handled specially for movement
}

function getFarthestRoom(fromX, fromY) {
  let best = state.rooms[0];
  let bestDist = 0;
  for (const room of state.rooms) {
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    const d = Math.abs(cx - fromX) + Math.abs(cy - fromY);
    if (d > bestDist) { bestDist = d; best = room; }
  }
  return best;
}

// === ENTITY SYSTEM ===
function createEnemy(template, x, y) {
  return {
    type: 'enemy',
    x, y,
    glyph: template.glyph,
    name: template.name,
    hp: state && state.difficulty === 'hard' ? Math.ceil(template.hp * 1.2) : template.hp,
    maxHp: state && state.difficulty === 'hard' ? Math.ceil(template.hp * 1.2) : template.hp,
    attack: template.attack,
    defense: template.defense,
    ai: template.ai,
    xp: template.xp,
    special: template.special,
    detect: template.detect,
    slowMove: template.slowMove || false,
    alertness: 0, // 0=unaware, 1=suspicious, 2=hostile
    turnSkip: false, // for slow enemies
    summonCooldown: 0,
    patrolTarget: null,
    isAlly: false,
    allyTurns: 0,
    confused: 0,
    // Boss specific
    phase: 1,
    teleportCooldown: 0
  };
}

function createItemEntity(item, x, y) {
  return {
    type: 'item',
    x, y,
    glyph: item.glyph,
    name: item.name || item.fakeName || 'Item',
    item: { ...item }
  };
}

function entityAt(x, y, excludeItems) {
  for (const e of state.entities) {
    if (e.x === x && e.y === y) {
      if (excludeItems && e.type === 'item') continue;
      return e;
    }
  }
  return null;
}

function enemyAt(x, y) {
  for (const e of state.entities) {
    if (e.x === x && e.y === y && e.type === 'enemy' && e.hp > 0 && !e.isAlly) return e;
  }
  return null;
}

function allyAt(x, y) {
  for (const e of state.entities) {
    if (e.x === x && e.y === y && e.type === 'enemy' && e.hp > 0 && e.isAlly) return e;
  }
  return null;
}

function itemsAt(x, y) {
  return state.entities.filter(e => e.x === x && e.y === y && e.type === 'item');
}

function removeEntity(e) {
  const idx = state.entities.indexOf(e);
  if (idx >= 0) state.entities.splice(idx, 1);
}

// === SPAWNING ===
function spawnEnemies() {
  if (state.floor === MAX_FLOOR) return; // Boss already placed
  // Spawn mini-boss on milestone floors
  if (MINI_BOSSES[state.floor]) spawnMiniBoss();
  const floorConfig = getFloorConfig(state.floor);
  const count = floorConfig.minEnemies + Math.floor(Math.random() * (floorConfig.maxEnemies - floorConfig.minEnemies + 1));
  const tier = floorConfig.tier;
  const templates = ENEMY_TIERS[tier] || ENEMY_TIERS[1];
  // Maybe add one from next tier
  const nextTemplates = floorConfig.nextTier ? (ENEMY_TIERS[floorConfig.nextTier] || []) : [];

  for (let i = 0; i < count; i++) {
    const pos = randomFloorTile();
    if (!pos) continue;
    // Don't spawn on or adjacent to player (1-tile buffer)
    if (Math.abs(pos.x - state.player.x) <= 1 && Math.abs(pos.y - state.player.y) <= 1) continue;
    let template;
    if (nextTemplates.length > 0 && i === count - 1) {
      template = nextTemplates[Math.floor(Math.random() * nextTemplates.length)];
    } else {
      template = templates[Math.floor(Math.random() * templates.length)];
    }
    state.entities.push(createEnemy(template, pos.x, pos.y));
  }
}

function spawnItems() {
  const floorConfig = getFloorConfig(state.floor);
  const count = floorConfig.minItems + Math.floor(Math.random() * (floorConfig.maxItems - floorConfig.minItems + 1));

  for (let i = 0; i < count; i++) {
    const pos = randomFloorTile();
    if (!pos) continue;
    const item = generateRandomItem(state.floor);
    if (item) {
      state.entities.push(createItemEntity(item, pos.x, pos.y));
    }
  }

  // Food — always spawn in a room interior so the player can always reach it
  const foodCount = floorConfig.food;
  for (let i = 0; i < foodCount; i++) {
    const pos = randomRoomFloorTile();
    if (pos) state.entities.push(createItemEntity({ ...FOOD }, pos.x, pos.y));
  }

  // Arrow bundles (2-4 per floor)
  const arrowCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < arrowCount; i++) {
    const pos = randomFloorTile();
    if (pos) {
      const count = 2 + Math.floor(Math.random() * 4); // 2-5 arrows
      state.entities.push(createItemEntity({ name: `${count} Arrows`, glyph: '➶', itemType: 'arrows', count, value: 0 }, pos.x, pos.y));
    }
  }

  // Gold piles
  const goldCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < goldCount; i++) {
    const pos = randomFloorTile();
    if (pos) {
      const amount = 5 + Math.floor(Math.random() * (5 + state.floor * 3));
      state.entities.push(createItemEntity({ name: `${amount} Gold`, glyph: '💰', itemType: 'gold', goldAmount: amount, value: 0 }, pos.x, pos.y));
    }
  }
}

// === FRIENDLY NPCs ===
const NPC_LORE = [
  // The Glyph King and the Runes
  "A ghostly wanderer murmurs: \"The Glyph King was once a mortal scribe named Aldric. He carved the first rune into living stone and the stone screamed back a language no one had heard.\"",
  "A spectral scribe warns: \"The twelve primordial glyphs are fragments of a word so old it predates speech. Aldric collected them all. He became something else.\"",
  "A spirit hisses: \"Each rune you claim was carved from reality itself. Flame, Frost, Wrath — they are not magic. They are grammar. The grammar of unmaking.\"",
  "A fading voice murmurs: \"The Glyph King does not guard the Sanctum. He IS the Sanctum. The walls pulse with his heartbeat. The floors shift with his breathing.\"",
  "A shade confides: \"Aldric believed the glyphs could rewrite death. He was half right. He stopped dying. But he also stopped living.\"",
  // The Depths and Biomes
  "A pale wanderer says: \"The Sewers were a city once — Erathis, the Bright. Aldric's runes pulled it underground, stone by stone, until only a grate remained above.\"",
  "A translucent pilgrim whispers: \"The Crypt was not built. It grew. Every adventurer who dies here adds another corridor, another empty room. The dead build their own tomb.\"",
  "A lost soul sighs: \"The Citadel is where Aldric's knights still stand guard. They are bone now, but the runes in their armor remember duty.\"",
  "A ghost mutters: \"Below the Citadel lies the Abyss — a wound in the earth where the runes tore too deep. Things dwell there that the King himself fears.\"",
  "An old shade cautions: \"The Sanctum is beautiful. Crystalline walls, glowing glyphs, perfect silence. It is a throne room made for a god who was once just a man with a chisel.\"",
  // Mini-Bosses and Enemies
  "A wandering shade notes: \"The Cave Troll on the fourth floor was once the city's blacksmith. Aldric's runes gave him strength but took his mind. He regenerates because the runes won't let him rest.\"",
  "A spectral guide says: \"The Lich on floor eight collects souls the way you collect gold. He was Aldric's first apprentice — the only one who understood the glyphs, and the first to be consumed by them.\"",
  "A faint shade whispers: \"The Balrog was born when Aldric carved the Glyph of Flame into the earth itself. The fire took shape and purpose — but only the purpose of burning.\"",
  "A spirit warns: \"The Void Titan was not created. It seeped in through the cracks the runes left in reality. It comes from the space between words.\"",
  // Gameplay Hints with Lore
  "A lingering echo advises: \"Sealed doors are bound by minor glyphs. You can break them with brute force — but the runes exact a blood price for defiance.\"",
  "A translucent figure advises: \"Mimics are not creatures. They are mistakes — items that absorbed too much ambient glyph energy and developed hunger.\"",
  "A shade recalls: \"The merchants who trade in these depths were cursed by the King to never leave. They cope by hoarding gold. Do not pity them — they have outlived empires.\"",
  "A faint voice observes: \"The wandering sages are fragments of Aldric's original conscience. He carved his mercy out of himself and it wanders the floors, healing strangers.\"",
  // Class-related Lore
  "A ghost mutters: \"The first to challenge the King was an adventurer with nothing but leather armor and instinct. She reached the Sanctum. Her ghost still searches for the exit.\"",
  "A spirit hisses: \"Berserkers burn through these halls like fire through parchment. The runes feed on their rage. The deeper they go, the angrier they become — and the glyphs drink deeply.\"",
  "A spectral scribe warns: \"Rogues are wise to close doors behind them. The depths have a memory. Leave a path open and something will follow it back to you.\"",
  "An old shade cautions: \"The wizards who enter these depths always believe they can master the glyphs. Some do. The rest become part of the walls.\"",
  // Atmosphere
  "A pale wanderer says: \"The deeper biomes grow stranger. The Crypt remembers every death. The Citadel enjoys them. The Abyss doesn't notice. The Sanctum... the Sanctum applauds.\"",
  "A translucent pilgrim whispers: \"Many came before you. Most added to the architecture. The Crypt has a room for each of them. It is a very large crypt.\"",
  "A lost soul sighs: \"I tried to ascend with a pocketful of runes. The glyphs dissolved in the sunlight. Everything I suffered for turned to dust on the stairs. Only the King's death frees the magic.\"",
  // Additional Lore — Rangers and Clerics
  "A spectral archer murmurs: \"Rangers used to patrol these tunnels before the fall. Their bows still work. Their aim is still true. Only their hearts have stopped.\"",
  "A phantom priest intones: \"The Clerics prayed to the light, but down here the light forgot them. Now they carry it themselves, burning from within.\"",
  // Additional Lore — Bards and Artificers
  "A humming shade says: \"The Bards discovered something terrifying: the glyphs respond to music. Sing the right note near a rune and it vibrates with sympathy. Sing the wrong note and it shatters.\"",
  "A ghostly smith explains: \"Artificers are practical folk. While wizards argue about the grammar of power, Artificers simply hammer it into steel. Crude, effective, and surprisingly hard to kill.\"",
  "A translucent minstrel sighs: \"I was a Bard once. I charmed a demon on floor seven. It followed me like a puppy for three floors. Then the charm broke during dinner.\"",
  // Additional Lore — Deeper World
  "A shade of a merchant grumbles: \"Gold has no value down here. We trade in it because the alternative is silence, and silence in these halls means something is hunting you.\"",
  "A wandering scribe notes: \"The walls on the deeper floors are warm to the touch. Not from fire — from the runes. They generate heat like living things. Because they are.\"",
  "A fading knight whispers: \"I sealed a door once to trap a Wraith. When I returned, the door had moved. The Wraith was waiting on the other side, as if it knew.\"",
  "A translucent child giggles: \"The Mimics aren't trying to eat you. They're lonely. Everything they consume becomes part of them. They just want company, forever and ever.\"",
  "An ancient shade rasps: \"Floor thirteen changes its layout when no one is looking. I mapped it seventeen times. Seventeen different maps. All correct. All wrong.\"",
  // Additional Lore — Taverns and Secrets
  "A shade of a barkeep says: \"The taverns exist because even the cursed need a drink. Aldric built them as a joke. The joke outlasted his sanity.\"",
  "A ghostly prospector whispers: \"Some walls aren't walls. Tap them. Listen. If they sound hollow, push. If they push back, run.\"",
  "A pale figure warns: \"Bone keys unlock more than doors. They unlock appetite. Whatever waits in those side passages has been starving for a very long time.\"",
  "A spectral sage muses: \"The shrines were built for worship. Now they are vending machines for miracles. Insert suffering, receive power. Aldric would be proud.\"",
  // Additional Lore — Enemies and Hazards
  "A ghostly soldier trembles: \"The Hydra on the deep floors was a garden snake before the runes found it. Now it splits and splits, each piece remembering the whole.\"",
  "A shade clutches at nothing: \"Wraiths drain your life because they've forgotten their own. Each stolen year reminds them what warmth felt like. They weep while they kill.\"",
  "A spectral figure points downward: \"The Necromancers don't raise the dead. They convince the dead that they never died. The skeletons believe they are still alive. It is the cruelest magic.\"",
  "A wandering ghost says: \"Spiders in the depths spin webs from crystallized silence. Step on one and the world goes quiet. In the quiet, you can hear the King breathing.\"",
  "A faded warrior mutters: \"Demons leave fire in their wake not as a weapon, but as a signature. They are artists. The medium is suffering. The gallery is everywhere.\"",
  // Additional Atmosphere
  "A shade drifts past murmuring: \"Every torch you see was lit by someone who came before. They are all dead now, but their fires remember.\"",
  "A translucent wanderer pauses: \"The stairs go down, always down. Some say there is no bottom. Others say the bottom found them before they found it.\"",
  "A pale figure stares at the ceiling: \"I can hear the surface sometimes. Rain. Birds. Laughter. Then I remember that I died four hundred years ago and the surface I hear may not exist anymore.\"",
  "A ghost kneels in the corridor: \"I was an adventurer. I found every rune. I slew the King. I won. And then I woke up back on floor one. And again. And again.\"",
  "A spectral wanderer whispers: \"The potions you find are brewed by the dungeon itself. Each sip is a gamble — some heal, some harm. The dungeon giveth, and the dungeon taketh away.\"",
];

function spawnNPCs() {
  if (!state.rooms || state.rooms.length < 2) return;
  // Pick a room that isn't the starting room
  const candidateRooms = state.rooms.slice(1);
  const room = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
  // Place in room interior
  const x = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
  const y = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
  if (getTile(x, y) !== T.FLOOR) return;
  const lore = NPC_LORE[Math.floor(Math.random() * NPC_LORE.length)];
  state.entities.push({ type: 'npc', x, y, glyph: '🗣️', name: 'Wandering Shade', lore, spoken: false });
}

function spawnMerchant() {
  const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
  const x = room.x + Math.floor(room.w / 2);
  const y = room.y + 1;
  state.entities.push({
    type: 'merchant',
    x, y,
    glyph: '🧙',
    name: 'Merchant',
    shopItems: generateShopItems(state.floor),
    refreshesLeft: 2
  });
}

function spawnSage() {
  // Place sage in a different room than the merchant would be
  const candidateRooms = state.rooms.length > 2 ? state.rooms.slice(1) : state.rooms;
  const room = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
  const x = room.x + Math.floor(room.w / 2);
  const y = room.y + Math.floor(room.h / 2);
  if (getTile(x, y) !== T.FLOOR) return;
  state.entities.push({
    type: 'sage',
    x, y,
    glyph: '🔮',
    name: 'Wandering Sage',
    visited: false
  });
}

function showSage(sage) {
  sage.visited = true;
  inputLocked = true;
  Audio.merchant();
  renderSageServices(sage);
  $('sage-overlay').classList.add('active');
}

function renderSageServices(sage) {
  const p = state.player;
  $('sage-gold').textContent = `Your gold: ${p.gold}`;
  const container = $('sage-services');
  container.innerHTML = '';

  const UNCURSE_COST = 30;
  const IDENTIFY_COST = 15;
  const HEAL_COST = 20;

  // Uncurse equipped items
  const hasCursedEquip = ['weapon', 'armor', 'ring', 'ranged'].some(slot => p.equipped[slot]?.cursed);
  const uncurseDiv = document.createElement('div');
  uncurseDiv.className = 'shop-item';
  if (hasCursedEquip) {
    uncurseDiv.innerHTML = `<span>✨ Uncurse Equipment</span><span class="price" style="color:#ff6040">${UNCURSE_COST}💰</span>`;
    uncurseDiv.addEventListener('click', () => {
      if (p.gold >= UNCURSE_COST) {
        p.gold -= UNCURSE_COST;
        let removed = 0;
        for (const slot of ['weapon', 'armor', 'ring']) {
          if (p.equipped[slot]?.cursed) {
            p.equipped[slot].cursed = false;
            p.equipped[slot].name = p.equipped[slot].name.replace(/^Cursed /, '');
            removed++;
          }
        }
        addMessage(`The sage purifies your gear! ${removed} item${removed === 1 ? '' : 's'} uncursed.`, 'good');
        Audio.gold();
        animateEntityFlash(p.x, p.y, '#f0c040');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    uncurseDiv.innerHTML = `<span style="color:var(--text-dim)">✨ Uncurse Equipment</span><span style="color:var(--text-dim)">No cursed items</span>`;
    uncurseDiv.style.opacity = '0.4';
    uncurseDiv.style.pointerEvents = 'none';
  }
  container.appendChild(uncurseDiv);

  // Identify all potions and scrolls in inventory
  const unidentified = p.inventory.filter(it =>
    (it.itemType === 'potion' || it.itemType === 'scroll') && !it.identified
  );
  const identifyDiv = document.createElement('div');
  identifyDiv.className = 'shop-item';
  if (unidentified.length > 0) {
    identifyDiv.innerHTML = `<span>🔍 Identify All (${unidentified.length})</span><span class="price">${IDENTIFY_COST}💰</span>`;
    identifyDiv.addEventListener('click', () => {
      if (p.gold >= IDENTIFY_COST) {
        p.gold -= IDENTIFY_COST;
        let count = 0;
        for (const inv of p.inventory) {
          if (inv.itemType === 'potion' && !inv.identified) {
            potionIdentified[inv.effectId] = true;
            inv.name = inv.trueName;
            inv.identified = true;
            count++;
          }
          if (inv.itemType === 'scroll' && !inv.identified) {
            scrollIdentified[inv.effectId] = true;
            inv.name = inv.trueName;
            inv.identified = true;
            count++;
          }
        }
        addMessage(`The sage reveals ${count} item${count === 1 ? '' : 's'}!`, 'good');
        Audio.gold();
        animateEntityFlash(p.x, p.y, '#60c0ff');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    identifyDiv.innerHTML = `<span style="color:var(--text-dim)">🔍 Identify All</span><span style="color:var(--text-dim)">Nothing to identify</span>`;
    identifyDiv.style.opacity = '0.4';
    identifyDiv.style.pointerEvents = 'none';
  }
  container.appendChild(identifyDiv);

  // Full healing
  const healDiv = document.createElement('div');
  healDiv.className = 'shop-item';
  if (p.hp < p.maxHp) {
    const missing = p.maxHp - p.hp;
    healDiv.innerHTML = `<span>❤️ Full Heal (+${missing} HP)</span><span class="price">${HEAL_COST}💰</span>`;
    healDiv.addEventListener('click', () => {
      if (p.gold >= HEAL_COST) {
        p.gold -= HEAL_COST;
        const healed = p.maxHp - p.hp;
        p.hp = p.maxHp;
        addMessage(`The sage restores you fully! (+${healed} HP)`, 'good');
        Audio.gold();
        animateEntityFlash(p.x, p.y, '#40ff60');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    healDiv.innerHTML = `<span style="color:var(--text-dim)">❤️ Full Heal</span><span style="color:var(--text-dim)">Already at full HP</span>`;
    healDiv.style.opacity = '0.4';
    healDiv.style.pointerEvents = 'none';
  }
  container.appendChild(healDiv);

  // Drop section for inventory management at the sage
  renderDropSection(container, () => renderSageServices(sage));
}

// === SECRET WALLS ===
function spawnSecretWalls() {
  // Find wall tiles adjacent to at least one FLOOR tile
  const candidates = [];
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (getTile(x, y) !== T.WALL) continue;
      // Check if adjacent to FLOOR
      let adjFloor = false;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (getTile(x + dx, y + dy) === T.FLOOR) { adjFloor = true; break; }
      }
      if (!adjFloor) continue;
      // Must also have WALL on the other side (not on map edge)
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return;
  // Pick 2-4 random candidates
  const count = 2 + Math.floor(Math.random() * 3); // 2-4
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  for (const pos of picked) {
    setTile(pos.x, pos.y, T.WALL_SECRET);
  }
}

// === BONUS WING ===
function generateBonusWing() {
  // Find a suitable wall on a room edge to carve a bonus wing
  if (!state.rooms || state.rooms.length < 3) return;
  const room = state.rooms[Math.floor(Math.random() * (state.rooms.length - 1)) + 1];
  // Try to carve rooms beyond the right or bottom edge of chosen room
  const directions = [
    { dx: 1, dy: 0, wallX: room.x + room.w, wallY: room.y + Math.floor(room.h / 2) },
    { dx: 0, dy: 1, wallX: room.x + Math.floor(room.w / 2), wallY: room.y + room.h },
    { dx: -1, dy: 0, wallX: room.x - 1, wallY: room.y + Math.floor(room.h / 2) },
    { dx: 0, dy: -1, wallX: room.x + Math.floor(room.w / 2), wallY: room.y - 1 }
  ];
  // Shuffle directions and try each
  directions.sort(() => Math.random() - 0.5);
  for (const dir of directions) {
    const { dx, dy, wallX, wallY } = dir;
    if (wallX < 2 || wallX >= MAP_W - 2 || wallY < 2 || wallY >= MAP_H - 2) continue;
    // Check if we have enough space for 2 small rooms in this direction
    const startX = wallX + dx * 2;
    const startY = wallY + dy * 2;
    const wingRooms = [];
    let cx = startX, cy = startY;
    let canFit = true;
    for (let r = 0; r < 2; r++) {
      const rw = 3 + Math.floor(Math.random() * 2); // 3-4
      const rh = 3 + Math.floor(Math.random() * 2);
      // Check bounds
      if (cx < 1 || cy < 1 || cx + rw >= MAP_W - 1 || cy + rh >= MAP_H - 1) { canFit = false; break; }
      // Check that area is all walls (unclaimed space)
      let allWall = true;
      for (let yy = cy - 1; yy <= cy + rh; yy++) {
        for (let xx = cx - 1; xx <= cx + rw; xx++) {
          if (xx < 0 || xx >= MAP_W || yy < 0 || yy >= MAP_H) { allWall = false; break; }
          if (getTile(xx, yy) !== T.WALL) { allWall = false; break; }
        }
        if (!allWall) break;
      }
      if (!allWall) { canFit = false; break; }
      wingRooms.push({ x: cx, y: cy, w: rw, h: rh });
      cx += (dx === 0 ? 0 : dx * (rw + 1));
      cy += (dy === 0 ? 0 : dy * (rh + 1));
    }
    if (!canFit || wingRooms.length < 2) continue;

    // Carve the wing rooms
    for (const wr of wingRooms) {
      for (let yy = wr.y; yy < wr.y + wr.h; yy++) {
        for (let xx = wr.x; xx < wr.x + wr.w; xx++) {
          setTile(xx, yy, T.FLOOR);
        }
      }
      state.rooms.push(wr);
    }
    // Connect wing rooms with corridors
    for (let r = 0; r < wingRooms.length - 1; r++) {
      const a = wingRooms[r], b = wingRooms[r + 1];
      const ax = a.x + Math.floor(a.w / 2), ay = a.y + Math.floor(a.h / 2);
      const bx = b.x + Math.floor(b.w / 2), by = b.y + Math.floor(b.h / 2);
      // Carve L-shaped corridor
      let x = ax, y = ay;
      while (x !== bx) { if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR); x += x < bx ? 1 : -1; }
      while (y !== by) { if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR); y += y < by ? 1 : -1; }
    }
    // Carve corridor from main room wall to first wing room
    let x = wallX, y = wallY;
    const firstWR = wingRooms[0];
    const tx = firstWR.x + Math.floor(firstWR.w / 2), ty = firstWR.y + Math.floor(firstWR.h / 2);
    while (x !== tx) { if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR); x += x < tx ? 1 : -1; }
    while (y !== ty) { if (getTile(x, y) === T.WALL) setTile(x, y, T.CORRIDOR); y += y < ty ? 1 : -1; }
    // Place locked door at the entrance
    setTile(wallX, wallY, T.DOOR_LOCKED);
    // Spawn Bone Key somewhere on the main floor (in a room)
    const keyPos = randomRoomFloorTile();
    if (keyPos) {
      state.entities.push(createItemEntity({
        name: 'Bone Key', glyph: '🗝️', itemType: 'key', keyType: 'bone', value: 0
      }, keyPos.x, keyPos.y));
    }
    // Spawn tougher enemies in wing rooms
    const tier = Math.min(7, Math.ceil(state.floor / 3) + 1);
    for (const wr of wingRooms) {
      const ex = wr.x + Math.floor(Math.random() * wr.w);
      const ey = wr.y + Math.floor(Math.random() * wr.h);
      if (getTile(ex, ey) === T.FLOOR && !enemyAt(ex, ey)) {
        const template = getEnemyTemplate(tier);
        if (template) {
          const enemy = createEnemy(template, ex, ey);
          enemy.alertness = 2; // already alert
          state.entities.push(enemy);
        }
      }
    }
    // Spawn guaranteed rare loot in the last wing room
    const lastWR = wingRooms[wingRooms.length - 1];
    const lootPos = { x: lastWR.x + Math.floor(lastWR.w / 2), y: lastWR.y + Math.floor(lastWR.h / 2) };
    const loot = generateRandomItem(state.floor + 3);
    if (loot) {
      state.entities.push(createItemEntity(loot, lootPos.x, lootPos.y));
    }
    // Also spawn some gold
    const goldAmt = 15 + Math.floor(Math.random() * 20) + state.floor * 2;
    state.entities.push(createItemEntity({ name: `${goldAmt} Gold`, glyph: '💰', itemType: 'gold', goldAmount: goldAmt, value: 0 }, lastWR.x + 1, lastWR.y + 1));
    break; // only one bonus wing per floor
  }
}

function getEnemyTemplate(tier) {
  const templates = ENEMY_TIERS[tier] || ENEMY_TIERS[Math.min(tier, Object.keys(ENEMY_TIERS).length)] || ENEMY_TIERS[1];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

// === TAVERN ===
function spawnTavern() {
  const candidateRooms = state.rooms.length > 2 ? state.rooms.slice(2) : state.rooms;
  const room = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
  const x = room.x + Math.floor(room.w / 2);
  const y = room.y + Math.floor(room.h / 2);
  if (getTile(x, y) !== T.FLOOR) return;
  // Don't overlap with other entities at this position
  if (state.entities.some(e => e.x === x && e.y === y)) return;
  state.entities.push({
    type: 'tavern',
    x, y,
    glyph: '🍺',
    name: 'Tavern',
    visited: false
  });
}

function showTavern(tavern) {
  inputLocked = true;
  Audio.merchant();

  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '🍺 TAVERN';
  const p = state.player;
  $('levelup-label').textContent = `💰 ${p.gold} gold`;
  const container = $('perk-choices');
  container.innerHTML = '';

  // Inline feedback area
  const feedbackDiv = document.createElement('div');
  feedbackDiv.style.cssText = 'color:var(--gold);font-size:13px;text-align:center;min-height:20px;margin:4px 0 8px;padding:4px 8px;';
  feedbackDiv.textContent = "What'll it be?";
  container.appendChild(feedbackDiv);

  function tavernFeedback(text, cls) {
    feedbackDiv.textContent = text;
    feedbackDiv.style.color = cls === 'damage' ? 'var(--hp-low)' : cls === 'gold' ? 'var(--gold)' : 'var(--accent)';
  }

  function refreshGold() {
    $('levelup-label').textContent = `💰 ${p.gold} gold`;
    updateUI();
  }

  // Buy Ration — 5 gold
  const rationBtn = document.createElement('button');
  rationBtn.className = 'perk-btn';
  rationBtn.innerHTML = `<div class="perk-name">🍖 Buy Ration (5💰)</div><div class="perk-desc">Add food to your inventory</div>`;
  const rationHandler = () => {
    if (p.gold >= 5) {
      if (addFoodToInventory()) {
        p.gold -= 5;
        tavernFeedback('You buy a warm ration.', 'good');
        Audio.gold();
      } else {
        tavernFeedback('Inventory full!', 'damage');
      }
      refreshGold();
    } else {
      tavernFeedback('Not enough gold.', 'damage');
    }
  };
  rationBtn.addEventListener('click', rationHandler);
  rationBtn.addEventListener('touchend', (e) => { e.preventDefault(); rationHandler(); }, { passive: false });
  container.appendChild(rationBtn);

  // Hear Rumor — 3 gold
  const rumorBtn = document.createElement('button');
  rumorBtn.className = 'perk-btn';
  rumorBtn.innerHTML = `<div class="perk-name">🗣️ Hear Rumor (1💰)</div><div class="perk-desc">One rumor per visit</div>`;
  let rumorHeard = false;
  const rumorHandler = () => {
    if (rumorHeard) {
      tavernFeedback('No more rumors this visit.', '');
      return;
    }
    if (p.gold >= 1) {
      p.gold -= 1;
      rumorHeard = true;
      const nextFloor = state.floor + 1;
      const rumors = [
        `The barkeep leans in: "Floor ${nextFloor}? I hear the enemies grow fiercer there."`,
        `A drunk whispers: "Treasure hides in the walls, if you know where to look."`,
        `The barkeep warns: "Something stalks the corridors of the next floor."`,
        `A patron mutters: "Merchants on deeper floors carry finer wares."`,
        `The barkeep nods: "Stock up on food. The path ahead is long and hungry."`,
        `A traveler whispers: "Runes of power await the brave."`,
        `The barkeep says: "A sage wanders the mid floors. Pay for his wisdom."`,
        `A drunk slurs: "I once found a ring in a secret wall... changed my life."`,
      ];
      tavernFeedback(rumors[Math.floor(Math.random() * rumors.length)], 'gold');
      Audio.gold();
      rumorBtn.style.opacity = '0.4';
      rumorBtn.style.pointerEvents = 'none';
      refreshGold();
    } else {
      tavernFeedback('Not enough gold.', 'damage');
    }
  };
  rumorBtn.addEventListener('click', rumorHandler);
  rumorBtn.addEventListener('touchend', (e) => { e.preventDefault(); rumorHandler(); }, { passive: false });
  container.appendChild(rumorBtn);

  // Gamble — 10 gold, 50/50
  const gambleBtn = document.createElement('button');
  gambleBtn.className = 'perk-btn';
  gambleBtn.innerHTML = `<div class="perk-name">🎲 Gamble (10💰)</div><div class="perk-desc">50/50: double your bet or lose it</div>`;
  const gambleHandler = () => {
    if (p.gold >= 10) {
      p.gold -= 10;
      if (Math.random() < 0.5) {
        p.gold += 20;
        tavernFeedback('You win! The dice favor you. (+20 gold)', 'gold');
        Audio.gold();
      } else {
        tavernFeedback('You lose... The house always wins. (-10 gold)', 'damage');
        Audio.hit();
      }
      haptic(30);
      refreshGold();
    } else {
      tavernFeedback('Not enough gold to gamble.', 'damage');
    }
  };
  gambleBtn.addEventListener('click', gambleHandler);
  gambleBtn.addEventListener('touchend', (e) => { e.preventDefault(); gambleHandler(); }, { passive: false });
  container.appendChild(gambleBtn);

  // Leave button
  const leaveBtn = document.createElement('button');
  leaveBtn.className = 'perk-btn';
  leaveBtn.style.borderColor = 'var(--text-dim)';
  leaveBtn.innerHTML = `<div class="perk-name">🚶 Leave Tavern</div><div class="perk-desc">Return to the dungeon</div>`;
  const leaveHandler = () => {
    tavern.visited = true;
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    endTurn();
  };
  leaveBtn.addEventListener('click', leaveHandler);
  leaveBtn.addEventListener('touchend', (e) => { e.preventDefault(); leaveHandler(); }, { passive: false });
  container.appendChild(leaveBtn);

  overlay.classList.add('active');
}

// Apply a curse to a weapon/armor copy (15% chance on floor 3+)
function maybeCurse(item, floor) {
  if (floor < 3) return item;
  if (['weapon', 'armor'].includes(item.itemType) && Math.random() < 0.10) {
    item.cursed = true;
    item.curseRevealed = false;
    if (item.attack !== undefined) item.attack += 1;
    if (item.defense !== undefined) item.defense += 1;
  }
  return item;
}

function generateShopItems(floor) {
  const items = [];
  const tier = Math.ceil(floor / 3);
  // Always have a healing potion
  const healPotion = potionNames.find(p => p.id === 'healing');
  items.push({ item: makePotion(healPotion), price: 15 });
  // Random weapon or armor (50%) or ranged weapon (50%)
  if (Math.random() < 0.5) {
    const weaponPool = WEAPONS.filter(w => w.tier <= tier);
    if (weaponPool.length > 0) {
      const w = applyFloorBonus({ ...weaponPool[Math.floor(Math.random() * weaponPool.length)] }, floor);
      items.push({ item: w, price: w.value + (floor >= 9 ? 10 : 0) });
    }
  } else {
    const rangedPool = RANGED_WEAPONS.filter(r => r.tier <= tier);
    if (rangedPool.length > 0) {
      const r = applyFloorBonus({ ...rangedPool[Math.floor(Math.random() * rangedPool.length)] }, floor);
      items.push({ item: r, price: r.value + (floor >= 9 ? 10 : 0) });
    }
  }
  // Arrow bundle
  items.push({ item: { name: '5 Arrows', glyph: '➶', itemType: 'arrows', count: 5, value: 0 }, price: 8 });
  // Food
  items.push({ item: { ...FOOD }, price: 8 });
  // Artificer exclusive: a pre-forged item one tier above current stock
  if (state.player && state.player.classId === 'artificer') {
    const bonusTier = Math.min(tier + 1, 3);
    let exclusiveItem = null;
    if (Math.random() < 0.5) {
      const wPool = WEAPONS.filter(w => w.tier === bonusTier);
      if (wPool.length > 0) {
        exclusiveItem = { ...wPool[Math.floor(Math.random() * wPool.length)] };
        exclusiveItem.attack = (exclusiveItem.attack || 0) + 1;
        exclusiveItem.name = exclusiveItem.name + ' +1';
      }
    } else {
      const aPool = ARMORS.filter(a => a.tier === bonusTier);
      if (aPool.length > 0) {
        exclusiveItem = { ...aPool[Math.floor(Math.random() * aPool.length)] };
        exclusiveItem.defense = (exclusiveItem.defense || 0) + 1;
        exclusiveItem.name = exclusiveItem.name + ' +1';
      }
    }
    if (exclusiveItem) {
      items.push({ item: exclusiveItem, price: exclusiveItem.value + 20, artificerOnly: true });
    }
  }
  return items;
}

function spawnSpecialTiles() {
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const pos = randomFloorTile();
    if (pos) setTile(pos.x, pos.y, T.SPECIAL);
  }
}

// Spawn invisible teleport tiles (1-2 per floor, starting floor 3)
function spawnTeleportTiles() {
  const count = 1 + (Math.random() < 0.4 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const pos = randomRoomFloorTile();
    if (pos) setTile(pos.x, pos.y, T.TELEPORT);
  }
}

// Avalanche: fill part of a random room with rocks (WALL tiles)
// Never affects the player's current tile, stairs, doors, or entities
function triggerAvalanche() {
  if (state.rooms.length < 3) return;
  // Pick a room that isn't the player's current room
  const pRoom = state.rooms.find(r =>
    state.player.x >= r.x && state.player.x < r.x + r.w &&
    state.player.y >= r.y && state.player.y < r.y + r.h
  );
  const candidates = state.rooms.filter(r => r !== pRoom && r.w >= 4 && r.h >= 4);
  if (candidates.length === 0) return;
  const room = candidates[Math.floor(Math.random() * candidates.length)];

  // Fill 30-70% of the room tiles with WALL
  const fillPct = 0.3 + Math.random() * 0.4;
  let filled = 0;
  const tiles = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      tiles.push({ x, y });
    }
  }
  // Shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const maxFill = Math.floor(tiles.length * fillPct);
  for (const t of tiles) {
    if (filled >= maxFill) break;
    // Never fill player's tile
    if (t.x === state.player.x && t.y === state.player.y) continue;
    const tile = getTile(t.x, t.y);
    // Only fill floor tiles — skip stairs, doors, specials
    if (tile !== T.FLOOR) continue;
    // Skip tiles with entities (enemies, items, NPCs, merchants)
    if (state.entities.some(e => e.x === t.x && e.y === t.y)) continue;
    setTile(t.x, t.y, T.RUBBLE);
    filled++;
  }
  if (filled > 0) {
    addMessage('The earth rumbles! Rocks collapse in a nearby chamber.', 'damage');
    haptic(60);
    Audio.hit();
  }
}

function collectGlyphRune(runeEntity) {
  const rune = runeEntity.rune;
  const p = state.player;
  p.runes.push(rune);
  removeEntity(runeEntity);

  // Apply immediate effects
  switch (rune.effect) {
    case 'vitality':
      p.maxHp += 3;
      p.hp = Math.min(p.maxHp, p.hp + 3);
      break;
    case 'wrath':
      p.attack += 1;
      break;
    case 'warding':
      p.defense += 1;
      break;
    case 'sight':
      p.fovBonus = (p.fovBonus || 0) + 1;
      computeFOV();
      break;
    // Passive effects (flame, frost, thorns, swiftness, greed, hunger, vampirism, fortune)
    // are checked dynamically in combat/hunger/etc.
  }

  addMessage(`${rune.symbol} ${rune.name} — ${rune.desc}`, 'gold');
  haptic(50);
  checkNewSynergies();
  // Animation: expanding glyph circle
  animateAoeBlast(p.x, p.y, 2, '#f0c040');
}

function hasRune(id) {
  return state.player.runes.some(r => r.id === id);
}

function spawnGlyphRune() {
  // Pick a rune the player hasn't collected yet
  const collected = new Set(state.player.runes.map(r => r.id));
  const available = GLYPH_RUNES.filter(r => !collected.has(r.id));
  if (available.length === 0) return; // all 12 collected!
  const rune = available[Math.floor(Math.random() * available.length)];
  const pos = randomRoomFloorTile();
  if (pos) {
    state.entities.push({ type: 'rune', x: pos.x, y: pos.y, glyph: '✦', rune });
    // Rune Adept mastery: reveal first floor's rune on the map
    if (state.floor === 1 && getMasteryBonuses(state.player.classId).revealRune) {
      state.explored[pos.y * MAP_W + pos.x] = 1;
      addMessage('⭐ Rune Adept: a rune\'s location is revealed!', 'gold');
    }
  }
}

function randomFloorTile() {
  for (let attempts = 0; attempts < 100; attempts++) {
    const x = Math.floor(Math.random() * MAP_W);
    const y = Math.floor(Math.random() * MAP_H);
    const t = getTile(x, y);
    if (t === T.FLOOR || t === T.CORRIDOR) {
      if (x === state.player.x && y === state.player.y) continue;
      if (enemyAt(x, y)) continue;
      return { x, y };
    }
  }
  return null;
}

// Pick a tile from the interior of a room (guaranteed accessible, not a corridor dead-end)
function randomRoomFloorTile() {
  if (!state.rooms || state.rooms.length === 0) return randomFloorTile();
  for (let attempts = 0; attempts < 100; attempts++) {
    const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    // Use interior tiles (1 tile in from each edge) to avoid corridor junctions
    const x = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const y = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    if (getTile(x, y) !== T.FLOOR) continue;
    if (x === state.player.x && y === state.player.y) continue;
    if (enemyAt(x, y)) continue;
    if (itemsAt(x, y).length > 0) continue;
    return { x, y };
  }
  return randomFloorTile();
}

function getFloorConfig(floor) {
  const configs = {
    1:  { tier: 1, nextTier: null, minEnemies: 2, maxEnemies: 3, minItems: 2, maxItems: 3, food: 1 },
    2:  { tier: 1, nextTier: null, minEnemies: 3, maxEnemies: 4, minItems: 2, maxItems: 3, food: 1 },
    3:  { tier: 1, nextTier: 2,   minEnemies: 4, maxEnemies: 5, minItems: 3, maxItems: 4, food: 1 },
    4:  { tier: 1, nextTier: 2,   minEnemies: 5, maxEnemies: 6, minItems: 3, maxItems: 4, food: 1 },
    5:  { tier: 2, nextTier: null, minEnemies: 5, maxEnemies: 7, minItems: 3, maxItems: 4, food: 1 },
    6:  { tier: 2, nextTier: null, minEnemies: 6, maxEnemies: 8, minItems: 3, maxItems: 4, food: Math.random() < 0.5 ? 1 : 0 },
    7:  { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1 },
    8:  { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1 },
    9:  { tier: 3, nextTier: null, minEnemies: 7, maxEnemies: 10, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    10: { tier: 3, nextTier: null, minEnemies: 8, maxEnemies: 10, minItems: 2, maxItems: 3, food: 1 },
    11: { tier: 3, nextTier: 4,   minEnemies: 8, maxEnemies: 11, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    12: { tier: 3, nextTier: 4,   minEnemies: 8, maxEnemies: 12, minItems: 2, maxItems: 3, food: 1 },
    13: { tier: 4, nextTier: null, minEnemies: 8, maxEnemies: 12, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    14: { tier: 4, nextTier: null, minEnemies: 9, maxEnemies: 12, minItems: 2, maxItems: 3, food: 1 },
    15: { tier: 4, nextTier: 5,   minEnemies: 9, maxEnemies: 13, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    16: { tier: 4, nextTier: 5,   minEnemies: 10, maxEnemies: 14, minItems: 2, maxItems: 3, food: 1 },
    17: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 14, minItems: 1, maxItems: 2, food: Math.random() < 0.5 ? 1 : 0 },
    18: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 15, minItems: 1, maxItems: 2, food: Math.random() < 0.5 ? 1 : 0 },
    19: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 15, minItems: 1, maxItems: 2, food: 1 },
    20: { tier: 5, nextTier: null, minEnemies: 0,  maxEnemies: 0,  minItems: 0, maxItems: 0, food: 0 }
  };
  return configs[floor] || configs[1];
}

// Add floor-scaling bonus to equipment: deeper floors grant +1 ATK/DEF/DMG at certain thresholds
function applyFloorBonus(item, floor) {
  const bonus = floor >= 16 ? 2 : floor >= 9 ? 1 : 0;
  if (bonus === 0) return item;
  if (item.itemType === 'weapon' && item.attack != null) {
    item.attack += bonus;
    item.name += ` +${bonus}`;
  } else if (item.itemType === 'armor' && item.defense != null) {
    item.defense += bonus;
    item.name += ` +${bonus}`;
  } else if (item.itemType === 'ranged' && item.damage != null) {
    item.damage += bonus;
    item.name += ` +${bonus}`;
  }
  return item;
}

function generateRandomItem(floor) {
  const roll = Math.random();
  const tier = Math.ceil(floor / 3);
  if (roll < 0.25) {
    // Weapon
    const pool = WEAPONS.filter(w => w.tier <= tier + (Math.random() < 0.15 ? 1 : 0));
    return maybeCurse(applyFloorBonus({ ...pool[Math.floor(Math.random() * pool.length)] }, floor), floor);
  } else if (roll < 0.4) {
    // Armor
    const pool = ARMORS.filter(a => a.tier <= tier + (Math.random() < 0.15 ? 1 : 0));
    return maybeCurse(applyFloorBonus({ ...pool[Math.floor(Math.random() * pool.length)] }, floor), floor);
  } else if (roll < 0.6) {
    // Potion
    const p = potionNames[Math.floor(Math.random() * potionNames.length)];
    return makePotion(p);
  } else if (roll < 0.8) {
    // Scroll
    const s = scrollNames[Math.floor(Math.random() * scrollNames.length)];
    return makeScroll(s);
  } else if (roll < 0.85) {
    // Ring
    return { ...RINGS[Math.floor(Math.random() * RINGS.length)] };
  } else if (roll < 0.89) {
    // Throwing Daggers
    return { ...THROWING_DAGGERS };
  } else if (roll < 0.93) {
    // Ranged weapon
    const rPool = RANGED_WEAPONS.filter(r => r.tier <= tier + (Math.random() < 0.15 ? 1 : 0));
    if (rPool.length > 0) return applyFloorBonus({ ...rPool[Math.floor(Math.random() * rPool.length)] }, floor);
    return { ...FOOD };
  } else if (roll < 0.96) {
    // Special arrows
    return { ...SPECIAL_ARROWS[Math.floor(Math.random() * SPECIAL_ARROWS.length)] };
  } else {
    // Food
    return { ...FOOD };
  }
}

function generateMonsterDrop(floor, enemyXp) {
  const roll = Math.random();
  const tier = Math.ceil(floor / 3);
  if (roll < 0.3) {
    // Gold (Greed rune: +50%, Barterer: +50%)
    let amount = 3 + Math.floor(Math.random() * (2 + floor * 2));
    if (state && hasRune('greed')) amount = Math.floor(amount * 1.5);
    if (state && state.player.bartererDiscount) amount = Math.floor(amount * 1.5);
    return { name: `${amount} Gold`, glyph: '💰', itemType: 'gold', goldAmount: amount, value: 0 };
  } else if (roll < 0.5) {
    // Food
    return { ...FOOD };
  } else if (roll < 0.7) {
    // Potion
    const p = potionNames[Math.floor(Math.random() * potionNames.length)];
    return makePotion(p);
  } else if (roll < 0.85) {
    // Scroll
    const s = scrollNames[Math.floor(Math.random() * scrollNames.length)];
    return makeScroll(s);
  } else {
    // Equipment appropriate to floor
    const pool = [...WEAPONS.filter(w => w.tier <= tier), ...ARMORS.filter(a => a.tier <= tier), ...RANGED_WEAPONS.filter(r => r.tier <= tier)];
    if (pool.length > 0) return maybeCurse(applyFloorBonus({ ...pool[Math.floor(Math.random() * pool.length)] }, floor), state.floor);
    return { ...FOOD };
  }
}

function makePotion(p) {
  const identified = potionIdentified[p.id];
  return {
    itemType: 'potion',
    glyph: '🧪',
    name: identified ? p.name : p.fakeName,
    trueName: p.name,
    effectId: p.id,
    desc: identified ? p.desc : '???',
    color: p.color,
    identified: !!identified,
    value: 12
  };
}

function makeScroll(s) {
  const identified = scrollIdentified[s.id];
  return {
    itemType: 'scroll',
    glyph: '📜',
    name: identified ? s.name : s.fakeName,
    trueName: s.name,
    effectId: s.id,
    desc: identified ? s.desc : '???',
    identified: !!identified,
    value: 15
  };
}

// === FOV — RECURSIVE SHADOWCASTING ===
const OCTANT_TRANSFORMS = [
  { xx: 1, xy: 0, yx: 0, yy: 1 },
  { xx: 0, xy: 1, yx: 1, yy: 0 },
  { xx: 0, xy: -1, yx: 1, yy: 0 },
  { xx: -1, xy: 0, yx: 0, yy: 1 },
  { xx: -1, xy: 0, yx: 0, yy: -1 },
  { xx: 0, xy: -1, yx: -1, yy: 0 },
  { xx: 0, xy: 1, yx: -1, yy: 0 },
  { xx: 1, xy: 0, yx: 0, yy: -1 }
];

function computeFOV() {
  const p = state.player;
  const rangedSightBonus = (state.player.equipped.ranged?.special === 'sight') ? 1 : 0;
  const radius = FOV_RADIUS + (hasRingEffect('sight') ? 2 : 0) + (state.player.fovBonus || 0) + rangedSightBonus;
  state.visible.fill(0);

  // Player's tile is always visible
  state.visible[p.y * MAP_W + p.x] = 1;
  state.explored[p.y * MAP_W + p.x] = 1;

  for (const oct of OCTANT_TRANSFORMS) {
    castLight(p.x, p.y, 1, 1.0, 0.0, radius, oct);
  }
}

function castLight(cx, cy, row, startSlope, endSlope, radius, oct) {
  if (startSlope < endSlope) return;

  let nextStartSlope = startSlope;

  for (let i = row; i <= radius; i++) {
    let blocked = false;

    for (let dx = -i, dy = -i; dx <= 0; dx++) {
      const mapX = cx + dx * oct.xx + dy * oct.xy;
      const mapY = cy + dx * oct.yx + dy * oct.yy;

      const leftSlope = (dx - 0.5) / (dy + 0.5);
      const rightSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) break;

      // Within radius?
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      if (mapX >= 0 && mapX < MAP_W && mapY >= 0 && mapY < MAP_H) {
        state.visible[mapY * MAP_W + mapX] = 1;
        state.explored[mapY * MAP_W + mapX] = 1;
      }

      if (blocked) {
        if (!isTransparent(mapX, mapY)) {
          nextStartSlope = rightSlope;
          continue;
        } else {
          blocked = false;
          startSlope = nextStartSlope;
        }
      } else if (!isTransparent(mapX, mapY) && i < radius) {
        blocked = true;
        castLight(cx, cy, i + 1, startSlope, rightSlope, radius, oct);
        nextStartSlope = rightSlope;
      }
    }
    if (blocked) break;
  }
}

// === A* PATHFINDING (BOUNDED) ===
function findPath(sx, sy, gx, gy, phaseThrough) {
  const open = [{ x: sx, y: sy, g: 0, h: Math.abs(gx - sx) + Math.abs(gy - sy), parent: null }];
  const closed = new Set();
  let expansions = 0;

  while (open.length > 0 && expansions < 25) {
    open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
    const cur = open.shift();
    const key = cur.x + ',' + cur.y;
    if (closed.has(key)) continue;
    closed.add(key);
    expansions++;

    if (cur.x === gx && cur.y === gy) {
      // Trace back to first step
      let node = cur;
      while (node.parent && node.parent.parent) node = node.parent;
      return { x: node.x - sx, y: node.y - sy };
    }

    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const nk = nx + ',' + ny;
      if (closed.has(nk)) continue;
      if (!phaseThrough && !isWalkable(nx, ny)) {
        // Allow walking to goal even if it's the player's position
        if (nx !== gx || ny !== gy) continue;
      }
      if (phaseThrough && (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H)) continue;
      // Don't walk into other enemies
      const other = enemyAt(nx, ny);
      if (other && (nx !== gx || ny !== gy)) continue;

      open.push({ x: nx, y: ny, g: cur.g + 1, h: Math.abs(gx - nx) + Math.abs(gy - ny), parent: cur });
    }
  }

  // Fallback: greedy move toward goal
  return greedyStep(sx, sy, gx, gy, phaseThrough);
}

function greedyStep(sx, sy, gx, gy, phaseThrough) {
  const dx = Math.sign(gx - sx);
  const dy = Math.sign(gy - sy);
  const candidates = [];
  if (dx !== 0) candidates.push({ x: dx, y: 0 });
  if (dy !== 0) candidates.push({ x: 0, y: dy });
  if (dx !== 0 && dy !== 0) candidates.push({ x: dx, y: dy });

  for (const c of candidates) {
    const nx = sx + c.x, ny = sy + c.y;
    if (phaseThrough || isWalkable(nx, ny)) {
      if (!enemyAt(nx, ny)) return c;
    }
  }
  return null;
}

// === COMBAT ===
const UNDEAD_NAMES = ['Skeleton', 'Ghost', 'Wraith', 'Necromancer', 'Lich', 'Your Ghost'];

function isUndead(entity) {
  return UNDEAD_NAMES.includes(entity.name);
}

function attackEntity(attacker, defender) {
  const atk = getEffectiveAttack(attacker);
  const def = getEffectiveDefense(defender);
  let critChance = (attacker === state.player)
    ? (state.player.critChance || 0.10)
    : (state.floor <= 2 ? 0.04 : 0.10); // enemies crit less on early floors
  if (attacker === state.player && hasRune('fortune')) critChance += hasSynergy('deadly_precision') ? 0.15 : 0.05;
  const isCrit = Math.random() < critChance;
  let damage = Math.max(1, atk - def + Math.floor(Math.random() * 5) - 2);
  if (isCrit) damage *= 2;
  // Easy mode: enemies deal 1 less damage
  if (state.difficulty === 'easy' && attacker !== state.player) {
    damage = Math.max(1, damage - 1);
  }

  // Cleric Holy Aura: +2 damage vs undead, -1 damage from undead
  if (state.player.classId === 'cleric') {
    if (attacker === state.player && isUndead(defender)) {
      damage += 2;
    }
    if (defender === state.player && isUndead(attacker)) {
      damage = Math.max(1, damage - 1);
    }
  }

  // Mana Shield (Wizard perk): 25% chance to negate damage
  if (defender === state.player && state.player.manaShield && Math.random() < 0.25) {
    addMessage('✨ Mana Shield absorbs the attack!', 'good');
    Audio.miss();
    return;
  }

  // Iron Skin perk: reduce incoming damage to player by 1
  if (defender === state.player && state.player.ironSkin) {
    damage = Math.max(1, damage - 1);
  }

  // Ghost miss chance
  if (defender.special === 'phase' && Math.random() < 0.5) {
    addMessage(`Your attack passes through the ${defender.name}!`, '');
    Audio.miss();
    return;
  }

  // Dodge check
  const dodgeChance = getDodgeChance(attacker, defender);
  if (dodgeChance > 0 && Math.random() < dodgeChance) {
    const targetIsPlayerDodge = defender === state.player;
    addMessage(targetIsPlayerDodge ? 'You dodge the attack!' : `${defender.name} dodges!`, targetIsPlayerDodge ? 'good' : '');
    Audio.miss();
    return;
  }

  defender.hp -= damage;

  // Hit flash on the defender
  animateEntityFlash(defender.x, defender.y, isCrit ? '#ff4040' : '#ffffff');

  const isPlayer = attacker === state.player;
  const targetIsPlayer = defender === state.player;

  // Track damage for death recap
  const floorIdx = Math.min(state.floor, MAX_FLOOR);
  if (isPlayer && !targetIsPlayer) state.floorData[floorIdx].damageDealt += damage;
  else if (!isPlayer && targetIsPlayer) state.floorData[floorIdx].damageTaken += damage;

  // Vampiric Strikes perk: heal 20% of damage dealt (Blood Lord synergy: 35%)
  if (isPlayer && !targetIsPlayer && state.player.hasVampire) {
    const vRate = hasSynergy('blood_lord') ? 0.35 : 0.2;
    const vHeal = Math.max(1, Math.floor(damage * vRate));
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + vHeal);
    if (vHeal > 1) addMessage(`Vampiric: +${vHeal} HP`, 'good');
  }

  // Badge: track crits and one-shot kills
  if (isPlayer && !targetIsPlayer && isCrit && state.runStats) {
    state.runStats.critsThisFloor++;
    if (state.runStats.critsThisFloor >= 3) unlockBadge('crit_master');
  }
  if (isPlayer && !targetIsPlayer && damage >= 10 && defender.hp <= 0) {
    unlockBadge('one_shot');
  }

  if (isCrit) {
    addMessage(`${isPlayer ? 'You' : attacker.name} critically hit${isPlayer ? '' : 's'} ${targetIsPlayer ? 'you' : defender.name} for ${damage}!`, 'damage');
    Audio.crit();
    screenShake();
  } else {
    addMessage(`${isPlayer ? 'You' : attacker.name} hit${isPlayer ? '' : 's'} ${targetIsPlayer ? 'you' : defender.name} for ${damage}.`, targetIsPlayer ? 'damage' : '');
    if (targetIsPlayer) Audio.playerHit(); else Audio.hit();
  }

  if (targetIsPlayer) {
    screenShake();
    haptic(50);
  } else {
    haptic(30);
  }

  // Weapon specials
  if (isPlayer && state.player.equipped.weapon) {
    applyWeaponSpecial(state.player.equipped.weapon, defender);
  }

  // Bard Charm: 25% chance to pacify enemy on hit (skip 2 turns)
  if (isPlayer && !targetIsPlayer && defender.hp > 0 && state.player.charmChance > 0) {
    if (Math.random() < state.player.charmChance) {
      // Encore perk: 30% chance to convert charmed enemy to temporary ally
      if (state.player.encore && Math.random() < 0.30) {
        defender.isAlly = true;
        defender.ai = 'ally';
        addMessage(`🎶 ${defender.name} is charmed and fights for you!`, 'gold');
      } else {
        defender.confused = (defender.confused || 0) + 2;
        addMessage(`🎶 ${defender.name} is pacified by your melody!`, 'good');
      }
    }
  }

  // Glyph Rune effects: flame, frost on player attack
  if (isPlayer && !targetIsPlayer && defender.hp > 0) {
    if (hasRune('flame') && Math.random() < 0.15) {
      addStatusEffect(defender, 'burning', 2);
      addMessage(`🔶 Flame glyph ignites ${defender.name}!`, 'good');
    }
    if (hasRune('frost') && Math.random() < 0.15) {
      addStatusEffect(defender, 'frozen', 1);
      addMessage(`🔷 Frost glyph freezes ${defender.name}!`, 'good');
    }
  }

  // Glyph Rune: thorns reflect when player is hit (Fortress synergy: 3 dmg)
  if (targetIsPlayer && hasRune('thorns')) {
    const thornsDmg = hasSynergy('fortress') ? 3 : 1;
    attacker.hp -= thornsDmg;
    addMessage(hasSynergy('fortress') ? `🏰 Fortress reflects ${thornsDmg} damage!` : `🟢 Thorns glyph reflects 1 damage!`, '');
    if (attacker.hp <= 0) killEnemy(attacker);
  }

  // Thorned armor
  if (targetIsPlayer && state.player.equipped.armor?.special === 'thorns') {
    attacker.hp -= 1;
    addMessage(`Thorns deal 1 damage to ${attacker.name}!`, '');
  }

  // Wraith drain — blocked by Cleric Holy Aura, resisted by Warding rune, blocked by sanctified soul
  if (attacker.special === 'drain' && targetIsPlayer) {
    if (state.player.classId === 'cleric') {
      addMessage('✝️ Your holy aura repels the life drain!', 'good');
    } else if (state.player.drainImmune) {
      addMessage('🛡️ Your sanctified soul resists the drain!', 'good');
    } else if (hasRune('warding') && Math.random() < 0.5) {
      addMessage('🛡️ The Glyph of Warding deflects the drain!', 'good');
    } else {
      state.player.maxHp = Math.max(5, state.player.maxHp - 1);
      addMessage('You feel your life force drain away!', 'damage');
    }
  }

  // Spider web
  if (attacker.special === 'web' && targetIsPlayer && Math.random() < 0.4) {
    addStatusEffect(state.player, 'webbed', 1);
    addMessage('You are caught in a web!', 'damage');
  }

  // Check death
  if (defender.hp <= 0) {
    if (targetIsPlayer) {
      // Undying Fury (Berserker perk): survive lethal once per floor
      if (state.player.undyingFury && !state.player.undyingFuryUsed) {
        state.player.hp = 1;
        state.player.undyingFuryUsed = true;
        addMessage('💢 UNDYING FURY! You refuse to fall!', 'good');
        animateEntityFlash(state.player.x, state.player.y, '#ff4040');
        haptic(80);
      } else {
        playerDeath(attacker.name, attacker.glyph);
      }
    } else {
      killEnemy(defender);
      // Vampiric weapon
      if (isPlayer && state.player.equipped.weapon?.special === 'vampiric') {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
        addMessage('You drain life from your foe!', 'good');
      }
      // Glyph Rune: vampirism — heal 1 HP on kill
      if (isPlayer && hasRune('vampirism')) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
        addMessage('🩸 Vampirism glyph heals you!', 'good');
      }
      // Shadow Step (Rogue perk): invisibility for 2 turns on kill
      if (isPlayer && state.player.shadowStep) {
        addStatusEffect(state.player, 'invisibility', 2);
        addMessage('💨 Shadow Step! You vanish into darkness.', 'good');
      }
      // Silent Kill (Ninja perk): grants invisibility on kill; refreshes timer if already invisible
      if (isPlayer && state.player.silentKill) {
        const existingInvis = state.player.statusEffects.find(e => e.type === 'invisibility');
        if (existingInvis) {
          existingInvis.turns = 2;
          addMessage('💨 Silent Kill! Stealth extended.', 'good');
        } else {
          addStatusEffect(state.player, 'invisibility', 2);
          addMessage('💨 Silent Kill! You melt into shadow.', 'good');
        }
      }
    }
  }
}

function getEffectiveAttack(entity) {
  if (entity === state.player) {
    let atk = state.player.attack;
    if (state.player.equipped.weapon) atk += state.player.equipped.weapon.attack;
    // Chaos hammer penalty to defense but we handle attack bonus here
    if (state.player.equipped.armor?.special === 'heavy') atk -= 1;
    // Strength potion
    if (hasStatusEffect(state.player, 'strength')) atk += 2;
    // Battle Fury perk: +3 attack when below 30% HP (Berserker's Rage synergy: +5)
    if (state.player.hasFury && state.player.hp < state.player.maxHp * 0.3) {
      atk += hasSynergy('berserkers_rage') ? 5 : 3;
    }
    // Berserker class rage: +3 attack when below 40% HP
    if (state.player.classId === 'berserker' && state.player.hp < state.player.maxHp * 0.4) atk += 3;
    return Math.max(1, atk);
  }
  return entity.attack;
}

function getEffectiveDefense(entity) {
  if (entity === state.player) {
    let def = state.player.defense;
    if (state.player.equipped.armor) def += state.player.equipped.armor.defense;
    if (state.player.equipped.ring?.special === 'protection') def += 3;
    if (state.player.equipped.weapon?.special === 'chaos') def -= 1;
    return Math.max(0, def);
  }
  return entity.defense;
}

function applyWeaponSpecial(weapon, target) {
  if (!weapon.special || target.hp <= 0) return;
  switch (weapon.special) {
    case 'burn':
      addStatusEffect(target, 'burning', 3);
      addMessage(`${target.name} catches fire!`, 'damage');
      break;
    case 'freeze':
      if (Math.random() < 0.3) {
        addStatusEffect(target, 'frozen', 1);
        addMessage(`${target.name} is frozen solid!`, '');
      }
      break;
  }
}

function killEnemy(enemy) {
  state.player.xp += enemy.xp;
  state.enemiesKilled++;
  state.floorData[Math.min(state.floor, MAX_FLOOR)].kills++;
  state.score += enemy.xp * 10;
  Audio.kill();

  // Track toughest kill
  if (!state.toughestKill || enemy.xp > state.toughestKill.xp) {
    state.toughestKill = { name: enemy.name, glyph: enemy.glyph, xp: enemy.xp };
  }

  // Split mechanic — disabled on floors 1-2 so new players aren't overwhelmed
  if (enemy.special === 'split' && state.floor >= 3) {
    const isHydra = enemy.name === 'Hydra';
    const miniName = isHydra ? 'Hatchling' : 'Mini Slime';
    const existingMinis = state.entities.filter(e => e.type === 'enemy' && e.name === miniName && e.hp > 0).length;
    const maxMinis = 6;
    if (existingMinis < maxMinis) {
      const template = isHydra
        ? { name: 'Hatchling', glyph: '🐍', hp: 6, attack: 3, defense: 1, ai: 'chase', xp: 5, special: null, detect: 6 }
        : { name: 'Mini Slime', glyph: '🟢', hp: 3, attack: 1, defense: 0, ai: 'chase', xp: 2, special: null, detect: 5, slowMove: true };
      let spawned = 0;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        if (spawned >= (isHydra ? 3 : 2)) break;
        const nx = enemy.x + dx, ny = enemy.y + dy;
        if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
          const mini = createEnemy(template, nx, ny);
          mini.alertness = 2;
          state.entities.push(mini);
          spawned++;
        }
      }
      if (isHydra) {
        addMessage(spawned > 1 ? `The Hydra spawns ${spawned} hatchlings!` : 'A hatchling slithers from the Hydra!', 'damage');
      } else {
        addMessage(spawned > 1 ? 'The Slime splits in two!' : 'The Slime oozes apart!', 'damage');
      }
    } else {
      addMessage(isHydra ? 'The Hydra collapses!' : 'The Slime dissolves!', '');
    }
  }

  // Dark Wizard necromancy — animate killed enemy as ally skeleton
  if (state.player.classId === 'darkwizard' && state.player.necromancer) {
    const undead = ['Skeleton', 'Wraith', 'Ghost', 'Banshee', 'Arch Lich', 'Void Wraith', 'Mini Slime', 'Hatchling'];
    if (!undead.includes(enemy.name) && enemy.ai !== 'boss' && !enemy.isAlly) {
      const necroChance = Math.min(0.30, 0.08 + 0.02 * state.player.level);
      if (Math.random() < necroChance) {
        const skel = createEnemy(
          { name: 'Skeletal ' + enemy.name, glyph: '💀', hp: Math.max(3, Math.floor(enemy.maxHp / 2)),
            attack: enemy.attack, defense: 0, ai: 'chase', xp: 0, special: null, detect: 10 },
          enemy.x, enemy.y
        );
        skel.isAlly = true;
        skel.allyTurns = 20;
        skel.alertness = 2;
        state.entities.push(skel);
        addMessage(`💀 The ${enemy.name} rises to serve you!`, 'good');
      }
    }
  }

  // Mini-boss guaranteed tier-appropriate drop
  if (enemy.isMiniBoss) {
    const tier = Math.ceil(state.floor / 3);
    const pool = [...WEAPONS.filter(w => w.tier >= tier), ...ARMORS.filter(a => a.tier >= tier)];
    if (pool.length > 0) {
      const drop = { ...pool[Math.floor(Math.random() * pool.length)] };
      state.entities.push(createItemEntity(drop, enemy.x, enemy.y));
      addMessage(`The ${enemy.name} drops ${drop.name}!`, 'gold');
    }
  }

  // Random monster drop — chance scales with enemy XP
  const dropChance = Math.min(0.35, 0.08 + enemy.xp * 0.01);
  if (Math.random() < dropChance) {
    const drop = generateMonsterDrop(state.floor, enemy.xp);
    if (drop) {
      state.entities.push(createItemEntity(drop, enemy.x, enemy.y));
      addMessage(`${enemy.name} drops ${drop.name}!`, 'gold');
    }
  }

  addMessage(`${enemy.name} is destroyed! (+${enemy.xp} XP)`, 'good');
  removeEntity(enemy);

  // Badge checks
  checkBadgesOnKill(enemy);

  // Check level up
  while (state.player.xp >= state.player.xpToNext) {
    state.player.xp -= state.player.xpToNext;
    state.player.level++;
    state.player.xpToNext = 15 + state.player.level * 10;
    showLevelUp();
  }
}

function playerDeath(killerName, killerGlyph) {
  state.gameOver = true;
  state.score += state.player.gold + state.floor * 50 + state.player.level * 20;
  Audio.death();
  haptic(100);

  // Auto-delete save slot if this run was loaded from a save
  if (state._loadedFromSlot != null) {
    deleteSaveSlot(state._loadedFromSlot);
    state._loadedFromSlot = null;
  }

  const tk = state.toughestKill;
  const kg = killerGlyph || '';
  const deathClassName = CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Adventurer';
  $('death-cause').textContent = `${state.playerName} ${state.playerEpithet} ${deathClassName} was slain by ${kg ? kg + ' ' : ''}${killerName} on Floor ${state.floor}`;
  $('death-stats').innerHTML = `
    Level <span>${state.player.level}</span> ${deathClassName} | Score: <span>${state.score}</span><br>
    Slain by: <span>${kg ? kg + ' ' : ''}${killerName}</span><br>
    Toughest kill: <span>${tk ? `${tk.glyph} ${tk.name}` : 'none'}</span><br>
    Enemies slain: <span>${state.enemiesKilled}</span> | Items found: <span>${state.itemsFound}</span>
  `;
  $('last-words-input').value = '';

  // Populate full character stats for "View Stats" button
  const p = state.player;
  function sr(label, val) { return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-val">${val}</span></div>`; }

  const totalDealt = state.floorData.reduce((acc, f) => acc + f.damageDealt, 0);
  const totalTaken = state.floorData.reduce((acc, f) => acc + f.damageTaken, 0);

  $('death-char-stats').innerHTML = [
    sr('Level', p.level),
    sr('XP', `${p.xp}/${p.xpToNext}`),
    sr('HP', `${p.hp}/${p.maxHp}`),
    sr('Peak HP', state.peakHp),
    sr('Attack', p.attack + (p.equipped.weapon?.attack || 0)),
    sr('Defense', p.defense + (p.equipped.armor?.defense || 0) + (p.equipped.ring?.special === 'protection' ? 3 : 0)),
    sr('Dmg Dealt', totalDealt),
    sr('Dmg Taken', totalTaken),
    sr('Turns', p.turnsSurvived),
    sr('Gold', p.gold),
  ].join('');

  // Floor-by-floor history
  const activeFloors = state.floorData
    .map((f, i) => ({ floor: i, ...f }))
    .filter(f => f.floor >= 1 && f.floor <= state.floor && (f.kills > 0 || f.damageDealt > 0 || f.damageTaken > 0));
  let historyHtml = '';
  if (activeFloors.length > 0) {
    historyHtml = `<div class="stats-heading" style="margin-top:10px;">FLOOR HISTORY</div>
      <div style="font-size:11px;font-family:monospace;">
        <div style="display:grid;grid-template-columns:1.5fr 1fr 1.5fr 1.5fr;gap:2px;padding:3px 0;color:var(--gold);border-bottom:1px solid var(--panel-border);">
          <span>Floor</span><span>Kills</span><span>Dealt</span><span>Taken</span>
        </div>`;
    for (const f of activeFloors) {
      historyHtml += `<div style="display:grid;grid-template-columns:1.5fr 1fr 1.5fr 1.5fr;gap:2px;padding:2px 0;color:var(--text-dim);">
        <span style="color:var(--accent)">F${f.floor}</span>
        <span>${f.kills}</span>
        <span style="color:var(--hp-high)">${f.damageDealt}</span>
        <span style="color:var(--danger)">${f.damageTaken}</span>
      </div>`;
    }
    historyHtml += '</div>';
    historyHtml += `<div style="display:grid;grid-template-columns:1.5fr 1fr 1.5fr 1.5fr;gap:2px;padding:3px 0;font-size:11px;border-top:1px solid var(--panel-border);font-weight:600;">
      <span style="color:var(--text-dim)">Total</span>
      <span style="color:var(--text)">${state.enemiesKilled}</span>
      <span style="color:var(--hp-high)">${totalDealt}</span>
      <span style="color:var(--danger)">${totalTaken}</span>
    </div>`;
  }
  // Inject floor history after equip stats
  $('death-floor-history').innerHTML = historyHtml;
  const w = p.equipped.weapon, a = p.equipped.armor, r = p.equipped.ring;
  $('death-equip-stats').innerHTML = [
    sr('⚔️ Weapon', w ? `${w.name} (+${w.attack})` : 'None'),
    sr('🛡️ Armor', a ? `${a.name} (+${a.defense})` : 'None'),
    sr('💍 Ring', r ? r.name : 'None'),
  ].join('');
  const invItems = p.inventory.length > 0 ? p.inventory.map(it => `${it.glyph} ${it.name}`).join('<br>') : 'Empty';
  $('death-inv-stats').innerHTML = `<div style="font-size:12px;color:var(--text-dim);padding:4px 8px;">${invItems}</div>`;
  $('death-full-stats').style.display = 'none';

  checkBadgesOnDeath();
  trackRuneCollection(state.player.runes ? state.player.runes.length : 0);
  checkMasteryUnlocks();
  renderBadgesEarned('death-badges');

  setTimeout(() => {
    $('death-overlay').classList.add('active');
  }, 300);
}

function showVictory() {
  state.victory = true;
  state.score += state.player.gold + 500 + state.player.hp * 5 + state.player.level * 50;
  Audio.victory();
  haptic(100);

  // Auto-delete save slot if this run was loaded from a save
  if (state._loadedFromSlot != null) {
    deleteSaveSlot(state._loadedFromSlot);
    state._loadedFromSlot = null;
  }

  const tk = state.toughestKill;
  const victoryClassName = CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Adventurer';
  $('victory-overlay').querySelector('h2').textContent = `${state.playerName} ${state.playerEpithet} ${victoryClassName} is victorious!`;
  $('victory-stats').innerHTML = `
    Level <span>${state.player.level}</span> | Score: <span>${state.score}</span><br>
    Toughest kill: <span>${tk ? `${tk.glyph} ${tk.name}` : 'none'}</span><br>
    Enemies slain: <span>${state.enemiesKilled}</span> | Items found: <span>${state.itemsFound}</span><br>
    HP remaining: <span>${state.player.hp}/${state.player.maxHp}</span>
  `;

  checkBadgesOnVictory();
  trackRuneCollection(state.player.runes ? state.player.runes.length : 0);
  checkMasteryUnlocks();
  renderBadgesEarned('victory-badge-list');

  setTimeout(() => {
    $('victory-overlay').classList.add('active');
  }, 500);

  saveHighScore();
}

// === LEVEL UP ===
function showLevelUp() {
  Audio.levelUp();
  haptic(50);
  $('canvas-wrap').classList.add('levelup-flash');
  setTimeout(() => $('canvas-wrap').classList.remove('levelup-flash'), 500);

  inputLocked = true;
  const p = state.player;
  const atkTotal = p.attack + (p.equipped.weapon?.attack || 0);
  const defTotal = p.defense + (p.equipped.armor?.defense || 0);
  $('levelup-label').innerHTML = `Level ${p.level}! <span style="font-size:11px;color:var(--text-dim);display:block;margin-top:4px;">⚔️ ${atkTotal} ATK · 🛡️ ${defTotal} DEF · ❤️ ${p.hp}/${p.maxHp} HP</span>`;

  const allPerks = [
    { name: 'Extended Vision', desc: 'See 1 tile further in all directions', apply: () => { state.player.fovBonus = (state.player.fovBonus || 0) + 1; computeFOV(); } },
    { name: '+1 Attack',   desc: 'Increase base attack by 1',             apply: () => { state.player.attack += 1; } },
    { name: '+1 Defense',  desc: 'Increase base defense by 1',            apply: () => { state.player.defense += 1; } },
    { name: 'Rapid Regeneration', desc: 'Heal 1 HP every 15 turns',      apply: () => { state.player.hasRegen = true; }, rare: true, unique: true, flag: 'hasRegen' },
    { name: '+5 Max HP',   desc: 'Increase max HP by 5 and full heal',    apply: () => { state.player.maxHp += 5; state.player.hp = state.player.maxHp; }, rare: true },
    { name: 'Glass Cannon', desc: 'Double your attack — but lose 30% max HP', apply: () => { state.player.attack *= 2; state.player.glassCannon = true; state.player.maxHp = Math.max(5, Math.floor(state.player.maxHp * 0.7)); state.player.hp = Math.min(state.player.hp, state.player.maxHp); }, rare: true },
    { name: 'Vampiric Strikes', desc: 'Heal 20% of all damage you deal',  apply: () => { state.player.hasVampire = true; }, rare: true, unique: true, flag: 'hasVampire' },
    { name: 'Iron Skin',   desc: 'Reduce all incoming damage by 1',       apply: () => { state.player.ironSkin = true; }, rare: true, unique: true, flag: 'ironSkin' },
    { name: 'Battle Fury', desc: '+3 attack when below 30% HP',           apply: () => { state.player.hasFury = true; }, rare: true, unique: true, flag: 'hasFury' },
    // Class-exclusive perks
    { name: "Survivor's Instinct", desc: 'Auto-eat food from inventory when starving', apply: () => { state.player.survivorInstinct = true; }, rare: false, unique: true, flag: 'survivorInstinct', classOnly: 'adventurer' },
    { name: 'Undying Fury', desc: 'Survive a lethal hit with 1 HP (once per floor)', apply: () => { state.player.undyingFury = true; }, rare: true, unique: true, flag: 'undyingFury', classOnly: 'berserker' },
    { name: 'Shadow Step', desc: 'Become invisible for 2 turns after a kill', apply: () => { state.player.shadowStep = true; }, rare: true, unique: true, flag: 'shadowStep', classOnly: 'rogue' },
    { name: 'Mana Shield', desc: '25% chance to negate incoming damage', apply: () => { state.player.manaShield = true; }, rare: true, unique: true, flag: 'manaShield', classOnly: 'wizard' },
    { name: 'Quick Draw', desc: 'Aimed Shot cooldown reduced by 3 turns', apply: () => { state.player.quickDraw = true; }, rare: false, unique: true, flag: 'quickDraw', classOnly: 'ranger' },
    { name: 'Sanctified Ground', desc: 'Heal 1 HP when you wait (Space)', apply: () => { state.player.sanctifiedGround = true; }, rare: false, unique: true, flag: 'sanctifiedGround', classOnly: 'cleric' },
    { name: 'Encore', desc: 'Charmed enemies have 30% chance to fight for you', apply: () => { state.player.encore = true; }, rare: true, unique: true, flag: 'encore', classOnly: 'bard' },
    { name: 'Master Smith', desc: 'Forge upgrades give +2 instead of +1', apply: () => { state.player.masterSmith = true; }, rare: false, unique: true, flag: 'masterSmith', classOnly: 'artificer' },
    { name: 'Rampart', desc: '+1 fortify charge per floor (max 3)', apply: () => { state.player.fortifyMaxCharges = Math.min(3, (state.player.fortifyMaxCharges || 2) + 1); state.player.fortifyCharges = Math.min(state.player.fortifyMaxCharges, state.player.fortifyCharges + 1); }, rare: false, unique: true, flag: 'rampart', classOnly: 'mason' },
    { name: 'Mirror Image', desc: 'Can place 2 illusions at once', apply: () => { state.player.mirrorImage = true; }, rare: false, unique: true, flag: 'mirrorImage', classOnly: 'conjurer' },
    { name: 'Fire Ward', desc: 'Cast fire spheres around you (8-turn CD)', apply: () => { state.player.fireWard = true; state.player.fireWardCooldown = 0; }, rare: false, unique: true, flag: 'fireWard', classOnly: 'wizard' },
    { name: 'Double Shot', desc: 'Fire 2 arrows in one turn', apply: () => { state.player.doubleShot = true; }, rare: false, unique: true, flag: 'doubleShot', classOnly: 'ranger' },
    { name: 'Silent Kill', desc: 'Kills grant invisibility; kills while invisible refresh it', apply: () => { state.player.silentKill = true; }, rare: false, unique: true, flag: 'silentKill', classOnly: 'ninja' },
    { name: 'Necrotic Surge', desc: 'Acid bolt splashes poison to adjacent foes', apply: () => { state.player.necroticSurge = true; }, rare: false, unique: true, flag: 'necroticSurge', classOnly: 'darkwizard' },
    { name: 'Reckless Charge', desc: 'Flip deals full ATK to enemies above 75% HP', apply: () => { state.player.recklessCharge = true; }, rare: false, unique: true, flag: 'recklessCharge', classOnly: 'daredevil' },
    { name: 'Smoke Screen', desc: 'Teleport leaves a 3-turn smoke cloud behind', apply: () => { state.player.smokeScreen = true; }, rare: false, unique: true, flag: 'smokeScreen', classOnly: 'escapeartist' },
    { name: 'Sharp Dealer', desc: 'Every 3rd merchant purchase grants a free item', apply: () => { state.player.sharpDealer = true; }, rare: false, unique: true, flag: 'sharpDealer', classOnly: 'barterer' },
  ];

  // Filter out already-owned unique perks and class-restricted perks
  const available = allPerks.filter(p => {
    if (p.unique && p.flag && state.player[p.flag]) return false;
    // Berserker already has Rage — Battle Fury would stack to +6 ATK
    if (state.player.classId === 'berserker' && p.name === 'Battle Fury') return false;
    // Class-exclusive perks only appear for their class
    if (p.classOnly && p.classOnly !== state.player.classId) return false;
    return true;
  });

  // Pick 3 random perks (weighted: rare perks less likely)
  const perks = [];
  const pool = [...available];
  while (perks.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const perk = pool[idx];
    if (perk.rare && Math.random() > 0.3) {
      pool.splice(idx, 1);
      pool.push(perk); // re-add for another chance
      continue;
    }
    perks.push(perk);
    pool.splice(idx, 1);
  }

  const container = $('perk-choices');
  container.innerHTML = '';
  for (const perk of perks) {
    const btn = document.createElement('button');
    btn.className = 'perk-btn';
    const classTag = perk.classOnly ? `<div style="font-size:10px;color:#c0a0ff;margin-bottom:2px;">★ CLASS PERK</div>` : '';
    btn.innerHTML = `${classTag}<div class="perk-name">${perk.name}</div><div class="perk-desc">${perk.desc}</div>`;
    btn.addEventListener('click', () => {
      perk.apply();
      checkNewSynergies();
      $('levelup-overlay').classList.remove('active');
      inputLocked = false;
      updateUI();
      render();
    });
    container.appendChild(btn);
  }

  $('levelup-overlay').classList.add('active');
}

// === STATUS EFFECTS ===
function addStatusEffect(entity, type, turns) {
  const existing = entity.statusEffects?.find(s => s.type === type);
  if (existing) { existing.turns = Math.max(existing.turns, turns); return; }
  if (!entity.statusEffects) entity.statusEffects = [];
  entity.statusEffects.push({ type, turns });
}

function hasStatusEffect(entity, type) {
  return entity.statusEffects?.some(s => s.type === type);
}

function processStatusEffects() {
  // Player effects
  processEntityEffects(state.player);

  // Enemy effects — snapshot array to avoid mutation during iteration
  const enemies = state.entities.filter(e => e.type === 'enemy' && e.hp > 0);
  for (const e of enemies) {
    processEntityEffects(e);
  }
}

function processEntityEffects(entity) {
  if (!entity.statusEffects) return;
  const isPlayer = entity === state.player;

  for (let i = entity.statusEffects.length - 1; i >= 0; i--) {
    const eff = entity.statusEffects[i];
    switch (eff.type) {
      case 'burning':
        entity.hp -= 2;
        if (isPlayer) addMessage('You burn! (-2 HP)', 'damage');
        // Soulfire synergy: player heals from enemy burn damage
        if (!isPlayer && hasSynergy('soulfire')) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
          addMessage('🔥 Soulfire heals you!', 'good');
        }
        break;
      case 'poison': {
        // Poison scales with depth: 1 dmg floors 1-6, 2 dmg floors 7-13, 3 dmg floors 14+
        const poisonDmg = state.floor <= 6 ? 1 : state.floor <= 13 ? 2 : 3;
        entity.hp -= poisonDmg;
        if (isPlayer) addMessage(`Poison courses through you! (-${poisonDmg} HP)`, 'damage');
        break;
      }
    }

    eff.turns--;
    if (eff.turns <= 0) {
      entity.statusEffects.splice(i, 1);
      if (isPlayer && eff.type === 'invisibility') addMessage('You become visible again.', '');
      if (isPlayer && eff.type === 'strength') addMessage('Your strength fades.', '');
    }
  }

  // Check death from status effects
  if (entity.hp <= 0 && isPlayer) {
    playerDeath('status effects', '☠️');
  } else if (entity.hp <= 0 && !isPlayer) {
    addMessage(`${entity.name} succumbs to their wounds!`, 'good');
    removeEntity(entity);
    state.enemiesKilled++;
  }
}

// === ENEMY AI ===
function processEnemies() {
  // Sort by distance to player (closest first)
  const enemies = state.entities.filter(e => e.type === 'enemy' && e.hp > 0);
  enemies.sort((a, b) => {
    const da = Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y);
    const db = Math.abs(b.x - state.player.x) + Math.abs(b.y - state.player.y);
    return da - db;
  });

  for (const enemy of enemies) {
    if (state.gameOver) return;
    if (enemy.hp <= 0) continue;

    // Frozen — skip turn
    if (hasStatusEffect(enemy, 'frozen')) continue;

    // Slow enemies skip every other turn
    if (enemy.special === 'slow' || enemy.slowMove) {
      enemy.turnSkip = !enemy.turnSkip;
      if (enemy.turnSkip) continue;
    }

    // Ally behavior
    if (enemy.isAlly) {
      enemy.allyTurns--;
      if (enemy.allyTurns <= 0) {
        addMessage(`Your ${enemy.name} crumbles to dust.`, '');
        removeEntity(enemy);
        continue;
      }
      allyAI(enemy);
      continue;
    }

    // Troll regeneration: heals 2 HP every 4 turns
    if (enemy.special === 'troll_regen' && enemy.hp > 0 && enemy.hp < enemy.maxHp && state.turnCount % 4 === 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + 2);
      if (state.visible[enemy.y * MAP_W + enemy.x]) {
        addMessage(`The ${enemy.name} regenerates!`, 'damage');
      }
    }

    // Confused — move randomly
    if (enemy.confused > 0) {
      enemy.confused--;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      tryMoveEnemy(enemy, enemy.x + d[0], enemy.y + d[1]);
      continue;
    }

    // Detection
    const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
    const playerInvis = hasStatusEffect(state.player, 'invisibility');
    const stealthBonus = state.player.equipped.armor?.special === 'stealth' ? 2 : 0;
    const rogueBonus = state.player.classId === 'rogue' ? Math.floor(enemy.detect / 2) : 0;
    const canDetect = dist <= enemy.detect - stealthBonus - rogueBonus && !playerInvis;

    if (canDetect && hasLOS(enemy.x, enemy.y, state.player.x, state.player.y)) {
      // Ninja/Rogue sense approaching enemies
      if (enemy.alertness < 2 && (state.player.classId === 'rogue' || state.player.classId === 'ninja')) {
        addMessage(`You sense a ${enemy.name} approaching!`, 'damage');
      }
      enemy.alertness = 2;
    } else if (enemy.alertness > 0 && dist > enemy.detect + 3) {
      enemy.alertness = Math.max(0, enemy.alertness - 1);
    }

    // Execute AI
    switch (enemy.ai) {
      case 'wander': wanderAI(enemy); break;
      case 'chase': chaseAI(enemy); break;
      case 'patrol': patrolAI(enemy); break;
      case 'ambush': ambushAI(enemy); break;
      case 'flee': fleeAI(enemy); break;
      case 'boss': bossAI(enemy); break;
      default: wanderAI(enemy);
    }
  }
}

function wanderAI(enemy) {
  if (enemy.alertness >= 2) {
    chaseAI(enemy);
    return;
  }
  // Rat flees at low HP
  if (enemy.special === 'flee' && enemy.hp <= 1) {
    fleeAI(enemy);
    return;
  }
  // Random movement
  if (Math.random() < 0.4) {
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    // Bats move erratically
    if (enemy.special === 'erratic') {
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      tryMoveEnemy(enemy, enemy.x + d[0], enemy.y + d[1]);
    } else {
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      tryMoveEnemy(enemy, enemy.x + d[0], enemy.y + d[1]);
    }
  }
}

function chaseAI(enemy) {
  if (enemy.alertness < 2) { wanderAI(enemy); return; }

  // Conjurer illusion: enemies prefer the decoy over the player
  const illusion = state.entities.find(e => e.type === 'illusion');
  const tx = illusion ? illusion.x : state.player.x;
  const ty = illusion ? illusion.y : state.player.y;

  const px = state.player.x, py = state.player.y;
  const dist = Math.abs(enemy.x - tx) + Math.abs(enemy.y - ty);

  // Adjacent to target — attack it
  if (dist === 1) {
    if (illusion) {
      // Attack the illusion: deal damage to it, destroying it when hp runs out
      illusion.hp--;
      if (state.visible[illusion.y * MAP_W + illusion.x]) {
        addMessage(`${enemy.name} strikes the illusion!`, '');
      }
      if (illusion.hp <= 0) {
        removeEntity(illusion);
        addMessage('The illusion shatters!', 'good');
      }
    } else {
      attackEntity(enemy, state.player);
    }
    return;
  }

  // Demon fire trail
  if (enemy.special === 'fire_trail' && getTile(enemy.x, enemy.y) === T.FLOOR) {
    state.entities.push({
      type: 'hazard',
      x: enemy.x, y: enemy.y,
      glyph: '🔥',
      name: 'Fire',
      hazardType: 'fire',
      turns: 5
    });
  }

  const step = findPath(enemy.x, enemy.y, tx, ty, enemy.special === 'phase');
  if (step) {
    tryMoveEnemy(enemy, enemy.x + step.x, enemy.y + step.y);
  }
}

function patrolAI(enemy) {
  if (enemy.alertness >= 2) { chaseAI(enemy); return; }

  if (!enemy.patrolTarget || (enemy.x === enemy.patrolTarget.x && enemy.y === enemy.patrolTarget.y)) {
    // Pick new patrol target
    const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    enemy.patrolTarget = { x: room.x + Math.floor(Math.random() * room.w), y: room.y + Math.floor(Math.random() * room.h) };
  }

  const step = findPath(enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y, false);
  if (step) {
    tryMoveEnemy(enemy, enemy.x + step.x, enemy.y + step.y);
  }
}

function ambushAI(enemy) {
  const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
  if (dist <= 1) {
    enemy.alertness = 2;
    attackEntity(enemy, state.player);
  } else if (enemy.alertness >= 2) {
    chaseAI(enemy);
  }
  // Otherwise sit still
}

function fleeAI(enemy) {
  // Necromancer: summon and flee
  if (enemy.special === 'summon' && enemy.alertness >= 2) {
    if (enemy.summonCooldown <= 0) {
      // Summon a skeleton
      const template = ENEMY_TIERS[1][1]; // Skeleton
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nx = enemy.x + dx, ny = enemy.y + dy;
        if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
          const minion = createEnemy(template, nx, ny);
          minion.alertness = 2;
          state.entities.push(minion);
          addMessage(`${enemy.name} summons a ${template.name}!`, 'damage');
          break;
        }
      }
      enemy.summonCooldown = 3;
    } else {
      enemy.summonCooldown--;
    }
  }

  if (enemy.alertness < 2) { wanderAI(enemy); return; }

  // Move away from player
  const dx = Math.sign(enemy.x - state.player.x);
  const dy = Math.sign(enemy.y - state.player.y);
  const candidates = [[dx, 0], [0, dy], [dx, dy]].filter(c => c[0] !== 0 || c[1] !== 0);

  for (const [mx, my] of candidates) {
    const nx = enemy.x + mx, ny = enemy.y + my;
    if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
      enemy.x = nx;
      enemy.y = ny;
      return;
    }
  }
}

function bossAI(enemy) {
  const px = state.player.x, py = state.player.y;
  const dist = Math.abs(enemy.x - px) + Math.abs(enemy.y - py);

  // Phase transitions (3 phases)
  if (enemy.hp <= 35 && enemy.phase === 1) {
    enemy.phase = 2;
    enemy.attack += 2; // 10 → 12
    addMessage('The Glyph King roars! "You dare challenge a god?"', 'damage');
    screenShake();
    animateAoeBlast(enemy.x, enemy.y, 4, '#a040ff');
  }
  if (enemy.hp <= 15 && enemy.phase === 2) {
    enemy.phase = 3;
    enemy.attack += 2; // 12 → 14
    enemy.defense += 2; // 6 → 8
    addMessage('The Glyph King shimmers with dark energy! FINAL PHASE!', 'damage');
    screenShake();
    animateAoeBlast(enemy.x, enemy.y, 5, '#ff2020');
    // Heal slightly on phase 3 entry
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + 10);
  }

  // Summon minions — tier scales with phase
  if (enemy.summonCooldown <= 0) {
    const summonTier = enemy.phase === 1 ? 2 : enemy.phase === 2 ? 3 : 4;
    const templates = ENEMY_TIERS[summonTier] || ENEMY_TIERS[3];
    const template = templates[Math.floor(Math.random() * templates.length)];
    let spawned = 0;
    const maxMinions = enemy.phase === 3 ? 2 : 1;
    for (const [ddx, ddy] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      if (spawned >= maxMinions) break;
      const nx = enemy.x + ddx, ny = enemy.y + ddy;
      if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
        const minion = createEnemy(template, nx, ny);
        minion.alertness = 2;
        state.entities.push(minion);
        spawned++;
      }
    }
    if (spawned > 0) addMessage(`The Glyph King conjures ${spawned > 1 ? 'servants' : 'a servant'}!`, 'damage');
    enemy.summonCooldown = enemy.phase === 1 ? 6 : enemy.phase === 2 ? 4 : 3;
  } else {
    enemy.summonCooldown--;
  }

  // Phase 2+: teleport when far away
  if (enemy.phase >= 2 && enemy.teleportCooldown <= 0 && dist > 3) {
    // Teleport near the player
    for (const [ddx, ddy] of [[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,-2]]) {
      const tx = px + ddx, ty = py + ddy;
      if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H && isWalkable(tx, ty) && !enemyAt(tx, ty)) {
        enemy.x = tx; enemy.y = ty;
        addMessage('The Glyph King teleports beside you!', 'damage');
        enemy.teleportCooldown = enemy.phase === 3 ? 2 : 4;
        break;
      }
    }
  } else if (enemy.teleportCooldown > 0) {
    enemy.teleportCooldown--;
  }

  // Phase 2+: dark bolt projectile
  if (enemy.phase >= 2 && dist > 1 && Math.random() < (enemy.phase === 3 ? 0.6 : 0.4)) {
    const ddx = Math.sign(px - enemy.x);
    const ddy = Math.sign(py - enemy.y);
    let bx = enemy.x + ddx, by = enemy.y + ddy;
    const boltDmg = enemy.phase === 3 ? 5 : 3;
    for (let i = 0; i < 12; i++) {
      if (!isWalkable(bx, by)) break;
      if (bx === px && by === py) {
        state.player.hp -= boltDmg;
        addMessage(`A dark bolt strikes you! (-${boltDmg} HP)`, 'damage');
        screenShake();
        Audio.playerHit();
        haptic(50);
        if (state.player.hp <= 0) { playerDeath('Glyph King', '👑'); return; }
        break;
      }
      bx += ddx; by += ddy;
    }
  }

  // Phase 3: AoE blast every few turns
  if (enemy.phase === 3 && (enemy.aoeCooldown || 0) <= 0 && dist <= 4) {
    const aoeDmg = 4;
    if (dist <= 3) {
      state.player.hp -= aoeDmg;
      addMessage(`The Glyph King unleashes a glyph nova! (-${aoeDmg} HP)`, 'damage');
      screenShake();
      Audio.playerHit();
      haptic(60);
      if (state.player.hp <= 0) { playerDeath('Glyph King', '👑'); return; }
    }
    animateAoeBlast(enemy.x, enemy.y, 3, '#a040ff');
    enemy.aoeCooldown = 4;
  } else if (enemy.aoeCooldown > 0) {
    enemy.aoeCooldown--;
  }

  // Melee attack (double attack in phase 3)
  if (dist === 1) {
    attackEntity(enemy, state.player);
    if (enemy.phase === 3 && !state.gameOver && Math.random() < 0.4) {
      addMessage('The Glyph King strikes again!', 'damage');
      attackEntity(enemy, state.player);
    }
  } else {
    const step = findPath(enemy.x, enemy.y, px, py, false);
    if (step) tryMoveEnemy(enemy, enemy.x + step.x, enemy.y + step.y);
  }
}

function allyAI(ally) {
  const p = state.player;
  const distToPlayer = Math.abs(ally.x - p.x) + Math.abs(ally.y - p.y);

  // Find nearest enemy within a reasonable range
  let nearestEnemy = null, nearestDist = 999;
  for (const e of state.entities) {
    if (e.type !== 'enemy' || e.isAlly || e.hp <= 0) continue;
    const d = Math.abs(e.x - ally.x) + Math.abs(e.y - ally.y);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
  }

  // Priority 1: Attack adjacent enemy
  if (nearestEnemy && nearestDist === 1) {
    const dmg = Math.max(1, ally.attack - nearestEnemy.defense + Math.floor(Math.random() * 3) - 1);
    nearestEnemy.hp -= dmg;
    addMessage(`Your ${ally.name} hits ${nearestEnemy.name} for ${dmg}!`, '');
    if (nearestEnemy.hp <= 0) {
      addMessage(`${nearestEnemy.name} is destroyed!`, 'good');
      removeEntity(nearestEnemy);
      state.enemiesKilled++;
    }
    return;
  }

  // Priority 2: Chase nearby enemy (within 5 tiles) if not too far from player
  if (nearestEnemy && nearestDist <= 5 && distToPlayer <= 6) {
    const step = findPath(ally.x, ally.y, nearestEnemy.x, nearestEnemy.y, false);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
    return;
  }

  // Priority 3: Move toward player if too far away (>3 tiles)
  if (distToPlayer > 3) {
    const step = findPath(ally.x, ally.y, p.x, p.y, false);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
    return;
  }

  // Priority 4: Chase any enemy if close to player
  if (nearestEnemy) {
    const step = findPath(ally.x, ally.y, nearestEnemy.x, nearestEnemy.y, false);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
  }
  // Otherwise: idle near the player
}

function tryMoveEnemy(enemy, nx, ny) {
  const phaseThrough = enemy.special === 'phase';
  if (phaseThrough) {
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
  } else {
    // Enemies on floor 5+ can bash open closed doors while chasing
    if (getTile(nx, ny) === T.DOOR_CLOSED && enemy.alertness >= 2 && state.floor >= 5) {
      setTile(nx, ny, T.DOOR_OPEN);
      addMessage(`${enemy.name} smashes the door open!`, 'damage');
      Audio.door();
      return; // uses their move for this turn
    }
    // Strong enemies (attack >= 5) can bash through Mason-built walls (takes 3 hits)
    if (getTile(nx, ny) === T.WALL && enemy.attack >= 5 && enemy.alertness >= 2 &&
        state.masonWalls && state.masonWalls.has(ny * MAP_W + nx)) {
      const eKey = ny * MAP_W + nx;
      const eWallHp = (state.masonWalls.get(eKey) || 3) - 1;
      if (eWallHp <= 0) {
        setTile(nx, ny, T.FLOOR);
        state.masonWalls.delete(eKey);
        addMessage(`${enemy.name} smashes through your wall!`, 'damage');
      } else {
        state.masonWalls.set(eKey, eWallHp);
        addMessage(`${enemy.name} hammers your wall (${eWallHp} HP left)!`, 'damage');
      }
      Audio.door();
      computeFOV();
      return; // uses their move for this turn
    }
    if (!isWalkable(nx, ny)) return;
  }

  // Don't move onto other enemies (unless phasing)
  const other = enemyAt(nx, ny);
  if (other && other !== enemy) return;

  // Don't move onto player — that's handled by attack
  if (nx === state.player.x && ny === state.player.y) return;

  enemy.x = nx;
  enemy.y = ny;

  // Check for ice trap placed by Escape Artist
  const iceTrap = state.entities.find(e => e.type === 'hazard' && e.hazardType === 'ice' && e.x === nx && e.y === ny);
  if (iceTrap && !enemy.isAlly) {
    addStatusEffect(enemy, 'frozen', 2);
    addMessage(`❄️ ${enemy.name} hits an ice trap!`, 'good');
    removeEntity(iceTrap);
  }

  // Fire ward hazard: damage enemies that walk into fire spheres
  const fireWard = state.entities.find(e => e.type === 'hazard' && e.hazardType === 'fireward' && e.x === nx && e.y === ny);
  if (fireWard && !enemy.isAlly && enemy.hp > 0) {
    const dmg = Math.max(1, 2 + Math.floor((state.player?.level || 1) / 3));
    enemy.hp -= dmg;
    addMessage(`🔥 ${enemy.name} walks into a fire sphere! (-${dmg})`, 'good');
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  // Smoke Screen hazard: enemies that step in smoke lose the player
  const smoke = state.entities.find(e => e.type === 'hazard' && e.hazardType === 'smoke' && e.x === nx && e.y === ny);
  if (smoke && !enemy.isAlly) {
    enemy.alertness = 0;
    addMessage(`💨 ${enemy.name} stumbles through the smoke!`, 'good');
    removeEntity(smoke);
  }
}

function hasLOS(x1, y1, x2, y2) {
  // Bresenham line check
  let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1, y = y1;

  while (true) {
    if (x === x2 && y === y2) return true;
    if (!isTransparent(x, y) && !(x === x1 && y === y1)) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// === PLAYER ACTIONS ===
function playerMove(dx, dy) {
  if (inputLocked || state.gameOver || state.victory) return;

  // Flip mode — Daredevil jump over enemy
  if (state.player && state.player.flipMode) {
    state.player.flipMode = false;
    const p = state.player;
    const nx = p.x + dx, ny = p.y + dy;
    const nx2 = p.x + 2 * dx, ny2 = p.y + 2 * dy;
    const foe = enemyAt(nx, ny);
    if (foe && foe.hp > 0 && !foe.isAlly && isWalkable(nx2, ny2) && !enemyAt(nx2, ny2)) {
      p.x = nx2;
      p.y = ny2;
      p.flipCooldown = getMasteryBonuses(p.classId).fastFlip ? 3 : 4;
      // Reckless Charge: deal bonus damage when flipping over a healthy enemy
      if (p.recklessCharge && foe.hp > (foe.maxHp || foe.hp) * 0.75) {
        const chargeDmg = getEffectiveAttack(p);
        foe.hp -= chargeDmg;
        addMessage(`🤸 Reckless Charge! ${foe.name} takes ${chargeDmg} damage!`, 'good');
        haptic(40);
        if (foe.hp <= 0) killEnemy(foe);
      }
      addMessage(`🤸 You flip over the ${foe.name}!`, 'good');
      Audio.step();
      haptic(30);
      animateEntityFlash(p.x, p.y, '#ffee00');
      computeFOV();
      autoPickup();
      updateUI();
      render();
      endTurn();
    } else {
      addMessage("Can't flip — no enemy to jump or landing blocked.", '');
      updateUI();
      render();
    }
    return;
  }

  // Throw mode — launch projectile in chosen direction
  if (state.throwMode) {
    throwProjectile(dx, dy);
    return;
  }

  // Fortify mode — place wall in chosen direction
  if (state.fortifyMode) {
    executeFortify(dx, dy);
    return;
  }

  const p = state.player;
  const nx = p.x + dx, ny = p.y + dy;

  // Webbed — skip movement
  if (hasStatusEffect(p, 'webbed')) {
    addMessage('You struggle free from the web!', '');
    endTurn();
    return;
  }

  // Check for friendly ally at destination — swap positions
  const ally = allyAt(nx, ny);
  if (ally) {
    ally.x = p.x;
    ally.y = p.y;
    p.x = nx;
    p.y = ny;
    addMessage(`You swap places with your ${ally.name}.`, '');
    computeFOV();
    autoPickup();
    endTurn();
    return;
  }

  // Check for enemy at destination
  const enemy = enemyAt(nx, ny);
  if (enemy) {
    attackEntity(p, enemy);
    // Berserker enrage: bonus attack on a neighbouring enemy after every action
    if (p.enrageActive) {
      for (const [ddx, ddy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
        const bonus = enemyAt(p.x + ddx, p.y + ddy);
        if (bonus && bonus !== enemy && bonus.hp > 0) { attackEntity(p, bonus); break; }
      }
    }
    // Ninja backstab: also attack enemy directly behind player
    if (p.backstab) {
      const backEnemy = enemyAt(p.x - dx, p.y - dy);
      if (backEnemy && backEnemy.hp > 0 && !backEnemy.isAlly) {
        attackEntity(p, backEnemy);
        addMessage('🌟 Backstab!', 'good');
      }
    }
    // Daredevil ricochet: chain to adjacent enemies at 50% then 25%
    if (p.ricochetMelee) {
      const atk = getEffectiveAttack(p);
      let ricCount = 0;
      for (const [ddx, ddy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
        if (ricCount >= 2) break;
        const adj = enemyAt(p.x + ddx, p.y + ddy);
        if (adj && adj.hp > 0 && adj !== enemy && !adj.isAlly) {
          const pct = ricCount === 0 ? 0.5 : 0.25;
          const dmg = Math.max(1, Math.floor(atk * pct));
          adj.hp -= dmg;
          addMessage(`💥 Ricochet! ${adj.name} takes ${dmg}.`, 'good');
          haptic(20);
          if (adj.hp <= 0) killEnemy(adj);
          ricCount++;
        }
      }
    }
    endTurn();
    return;
  }

  // Check for closed door
  if (getTile(nx, ny) === T.DOOR_CLOSED) {
    setTile(nx, ny, T.DOOR_OPEN);
    addMessage('You open the door.', '');
    Audio.door();
    endTurn();
    return;
  }

  // Check for one-way door — opens, then seals behind you
  if (getTile(nx, ny) === T.DOOR_ONEWAY) {
    setTile(nx, ny, T.FLOOR);
    const ox = state.player.x, oy = state.player.y;
    state.player.x = nx;
    state.player.y = ny;
    setTile(ox, oy, T.DOOR_SEALED);
    addMessage('The door slams shut behind you! Bash it 5 times to break through.', 'damage');
    Audio.door();
    haptic(50);
    if (state.runStats) {
      state.runStats.oneWayDoorsUsed++;
      if (state.runStats.oneWayDoorsUsed >= 5) unlockBadge('no_turning_back');
    }
    autoPickup();
    endTurn();
    return;
  }

  // Bash Mason-built walls — costs 1 HP, takes 3 hits to break
  if (getTile(nx, ny) === T.WALL && state.masonWalls && state.masonWalls.has(ny * MAP_W + nx)) {
    const key = ny * MAP_W + nx;
    state.player.hp = Math.max(1, state.player.hp - 1);
    const wallHp = (state.masonWalls.get(key) || 3) - 1;
    if (wallHp <= 0) {
      setTile(nx, ny, T.FLOOR);
      state.masonWalls.delete(key);
      addMessage('You smash through the mason wall! (-1 HP)', 'good');
    } else {
      state.masonWalls.set(key, wallHp);
      addMessage(`You chip the mason wall (${wallHp} HP left, -1 HP)`, '');
    }
    Audio.door();
    haptic(40);
    computeFOV();
    endTurn();
    return;
  }

  // Bash sealed doors — costs 1 HP per hit, breaks after 5 hits
  // HP is clamped to 1 so the player can never die bashing their only way out
  if (getTile(nx, ny) === T.DOOR_SEALED) {
    const key = ny * MAP_W + nx;
    state.doorBashes[key] = (state.doorBashes[key] || 0) + 1;
    const hitsLeft = 5 - state.doorBashes[key];
    state.player.hp = Math.max(1, state.player.hp - 1);
    if (hitsLeft <= 0) {
      setTile(nx, ny, T.FLOOR);
      delete state.doorBashes[key];
      addMessage('You bash through the sealed door! (-1 HP)', 'good');
      Audio.door();
      incrementBadgeCount('sealed_doors', 1);
      if (badgeCounts.sealed_doors >= 10) unlockBadge('skeleton_key');
    } else {
      addMessage(`You bash the sealed door... ${hitsLeft} more hit${hitsLeft === 1 ? '' : 's'} to break it (-1 HP)`, 'damage');
      Audio.hit();
    }
    haptic(40);
    endTurn();
    return;
  }

  // Secret wall — reveals hidden passage and spawns item
  if (getTile(nx, ny) === T.WALL_SECRET) {
    const key = ny * MAP_W + nx;
    state.secretBashes = state.secretBashes || {};
    state.secretBashes[key] = (state.secretBashes[key] || 0) + 1;
    if (state.secretBashes[key] >= 2) {
      // Break through on second hit
      delete state.secretBashes[key];
      setTile(nx, ny, T.FLOOR);
      addMessage('You break through the cracked wall!', 'gold');
      Audio.door();
      haptic(40);
      const secretItem = generateRandomItem(state.floor);
      if (secretItem) {
        state.entities.push(createItemEntity(secretItem, nx, ny));
        addMessage(`A ${secretItem.name} was hidden in the wall!`, 'gold');
      }
      computeFOV();
    } else {
      // First hit — wall cracks, changes color
      addMessage('The wall cracks! Hit it again to break through.', 'gold');
      Audio.hit();
      haptic(30);
    }
    endTurn();
    return;
  }

  // Locked door — requires Bone Key
  if (getTile(nx, ny) === T.DOOR_LOCKED) {
    const keyIdx = p.inventory.findIndex(i => i.itemType === 'key' && i.keyType === 'bone');
    if (keyIdx >= 0) {
      p.inventory.splice(keyIdx, 1);
      setTile(nx, ny, T.DOOR_OPEN);
      addMessage('You use the Bone Key! The lock clicks open.', 'gold');
      Audio.door();
      haptic(30);
      computeFOV();
    } else {
      addMessage('This door is locked. You need a key.', 'damage');
    }
    endTurn();
    return;
  }

  // Check walkable
  if (!isWalkable(nx, ny)) return;

  const oldX = p.x, oldY = p.y;
  p.x = nx;
  p.y = ny;
  Audio.step();
  haptic(10);

  // Escape Artist ice trap: leave a trap at old tile if enemies were adjacent
  if (p.iceTrapPassive) {
    const wasNearEnemy = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].some(([ddx, ddy]) => {
      const e = enemyAt(oldX + ddx, oldY + ddy);
      return e && e.hp > 0 && !e.isAlly;
    });
    if (wasNearEnemy) {
      state.entities.push({ type: 'hazard', x: oldX, y: oldY, glyph: '❄️', name: 'Ice Trap', hazardType: 'ice', turns: 5 });
    }
  }

  // Check for items on ground
  autoPickup();

  // Check for glyph rune
  const runeEntity = state.entities.find(e => e.type === 'rune' && e.x === nx && e.y === ny);
  if (runeEntity) {
    collectGlyphRune(runeEntity);
  }

  // Check for special tile
  if (getTile(nx, ny) === T.SPECIAL) {
    triggerSpecialEvent();
    setTile(nx, ny, T.FLOOR);
  }

  // Check for teleport tile (invisible or visible — both active)
  const tpTile = getTile(nx, ny);
  if (tpTile === T.TELEPORT || tpTile === T.TELEPORT_VIS) {
    // Reveal the tile if it was hidden
    if (tpTile === T.TELEPORT) {
      setTile(nx, ny, T.TELEPORT_VIS);
      addMessage('A teleport glyph flares to life beneath you!', 'gold');
    } else {
      addMessage('The teleport glyph activates!', '');
    }
    // Teleport to a semi-random floor tile (not on another teleport)
    for (let tpAttempt = 0; tpAttempt < 100; tpAttempt++) {
      const tpPos = randomFloorTile();
      if (tpPos) {
        const destTile = getTile(tpPos.x, tpPos.y);
        if (destTile !== T.TELEPORT && destTile !== T.TELEPORT_VIS) {
          state.player.x = tpPos.x;
          state.player.y = tpPos.y;
          break;
        }
      }
    }
    haptic(40);
    Audio.useItem();
    computeFOV();
  }

  // Check for hazards
  const hazard = state.entities.find(e => e.type === 'hazard' && e.x === nx && e.y === ny);
  if (hazard && hazard.hazardType === 'fire') {
    state.player.hp -= 1;
    addMessage('You step in fire! (-1 HP)', 'damage');
    if (state.player.hp <= 0) { playerDeath('fire', '🔥'); return; }
  }

  // Check for NPC (friendly shade — cannot be attacked, gives lore)
  const npc = state.entities.find(e => e.type === 'npc' && e.x === nx && e.y === ny);
  if (npc) {
    if (!npc.spoken) {
      npc.spoken = true;
      addMessage(npc.lore, 'gold');
    } else {
      addMessage(`${npc.name} drifts silently, its message already given.`, '');
    }
    endTurn();
    return;
  }

  // Check for merchant
  const merchant = state.entities.find(e => e.type === 'merchant' && e.x === nx && e.y === ny);
  if (merchant) {
    if (merchant.visited) {
      addMessage('The merchant shrugs. "Nothing more to offer this level."', '');
      endTurn();
    } else {
      showMerchant(merchant);
    }
    return;
  }

  // Check for sage
  const sage = state.entities.find(e => e.type === 'sage' && e.x === nx && e.y === ny);
  if (sage) {
    if (sage.visited) {
      addMessage('The sage nods quietly. "I have done all I can for now."', '');
      endTurn();
    } else {
      showSage(sage);
    }
    return;
  }

  // Check for tavern
  const tavern = state.entities.find(e => e.type === 'tavern' && e.x === nx && e.y === ny);
  if (tavern) {
    if (tavern.visited) {
      addMessage('The barkeep waves. "Come back next floor!"', '');
      endTurn();
    } else {
      showTavern(tavern);
    }
    return;
  }

  // Ring of haste: 30% chance for free extra move
  if (hasRingEffect('haste') && Math.random() < 0.3) {
    if (!state._hasteShown) {
      addMessage('⚡ Haste active! You sometimes move for free.', 'good');
      state._hasteShown = true;
    }
    computeFOV();
    updateUI();
    render();
    return; // Free move — don't end turn
  }

  // Berserker enrage: bonus attack on a neighbouring enemy after every move
  if (p.enrageActive) {
    for (const [ddx, ddy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const bonus = enemyAt(p.x + ddx, p.y + ddy);
      if (bonus && bonus.hp > 0) { attackEntity(p, bonus); break; }
    }
  }

  endTurn();
}

function closeDoor() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (!['rogue', 'mason'].includes(state.player.classId)) {
    addMessage('Only Rogues and Brick Masons can close doors.', '');
    return;
  }
  // Find adjacent open door
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  let closed = false;
  for (const [dx, dy] of dirs) {
    const nx = state.player.x + dx, ny = state.player.y + dy;
    if (getTile(nx, ny) === T.DOOR_OPEN) {
      // Check no entity is standing in the doorway
      const blocked = state.entities.some(e => e.x === nx && e.y === ny && (e.type === 'enemy' || e.type === 'npc' || e.type === 'merchant'));
      if (blocked) {
        addMessage('Something is in the doorway.', '');
        continue;
      }
      setTile(nx, ny, T.DOOR_CLOSED);
      state.rogueClosedDoors.add(ny * MAP_W + nx); // Track for distinct rendering
      closed = true;
      addMessage('You quietly close the door.', 'good');
      Audio.door();
      break;
    }
  }
  if (!closed) {
    addMessage('No open door nearby to close.', '');
    return;
  }
  computeFOV();
  endTurn();
}

function playerWait() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.throwMode) {
    state.throwMode = false;
    state.throwItem = null;
    addMessage('Throw cancelled.', '');
    updateUI();
    render();
    return;
  }
  addMessage('You wait...', '');
  // Sanctified Ground (Cleric perk): heal 1 HP when waiting
  if (state.player.sanctifiedGround && state.player.hp < state.player.maxHp) {
    state.player.hp++;
    addMessage('✝️ Sanctified Ground heals you. (+1 HP)', 'good');
  }
  endTurn();
}

function playerPickup() {
  if (inputLocked || state.gameOver || state.victory) return;
  const items = itemsAt(state.player.x, state.player.y);
  if (items.length === 0) {
    addMessage('Nothing to pick up here.', '');
    return;
  }
  for (const item of items) {
    pickupItem(item);
  }
  endTurn();
}

function autoPickup() {
  const items = itemsAt(state.player.x, state.player.y);
  for (const item of [...items]) {
    if (item.item.itemType === 'gold') {
      state.player.gold += item.item.goldAmount;
      addMessage(`You pick up ${item.item.goldAmount} gold!`, 'gold');
      Audio.gold();
      removeEntity(item);
      state.score += item.item.goldAmount;
    } else if (item.item.itemType === 'arrows') {
      state.player.arrows += item.item.count;
      addMessage(`You pick up ${item.item.count} arrows! (${state.player.arrows} total)`, 'good');
      Audio.pickup();
      removeEntity(item);
    } else if (settings.autopickup) {
      pickupItem(item);
    }
  }
}

function pickupItem(itemEntity) {
  if (itemEntity.item.itemType === 'gold') {
    state.player.gold += itemEntity.item.goldAmount;
    addMessage(`You pick up ${itemEntity.item.goldAmount} gold!`, 'gold');
    Audio.gold();
    removeEntity(itemEntity);
    return;
  }
  if (itemEntity.item.itemType === 'arrows') {
    state.player.arrows += itemEntity.item.count;
    addMessage(`You pick up ${itemEntity.item.count} arrows! (${state.player.arrows} total)`, 'good');
    Audio.pickup();
    removeEntity(itemEntity);
    return;
  }
  // Food stacks (up to 5 per stack)
  if (itemEntity.item.itemType === 'food') {
    if (addFoodToInventory()) {
      const stack = state.player.inventory.find(i => i.itemType === 'food');
      state.itemsFound++;
      addMessage(`You pick up a ration. (${stack.stack || 1} in stack)`, 'good');
      Audio.pickup();
      removeEntity(itemEntity);
    } else {
      addMessage('Inventory full! Cannot pick up ration.', 'damage');
    }
    return;
  }
  if (state.player.inventory.length >= MAX_INVENTORY) {
    addMessage(`Inventory full! Cannot pick up ${itemEntity.item.glyph} ${itemEntity.item.name}.`, 'damage');
    showPopupNotice('Inventory Full');
    return;
  }
  state.player.inventory.push(itemEntity.item);
  state.itemsFound++;
  const it = itemEntity.item;
  let pickupMsg = `You pick up ${it.name}`;
  if (it.itemType === 'weapon' && it.attack !== undefined) pickupMsg += ` (+${it.attack} ATK)`;
  if (it.itemType === 'armor' && it.defense !== undefined) pickupMsg += ` (+${it.defense} DEF)`;
  if (it.itemType === 'ranged' && it.damage !== undefined) pickupMsg += ` (${it.damage} DMG, ${it.range || '?'} rng)`;
  if (it.itemType === 'ring' && it.ringEffect) pickupMsg += ` [${it.ringEffect}]`;
  if (it.special) pickupMsg += ` {${it.special}}`;
  pickupMsg += '.';
  addMessage(pickupMsg, 'good');
  // Show hint on first item pickup
  if (state.itemsFound === 1) {
    addMessage('Tip: Tap an item in the bar below to Equip, Use, or Drop it.', 'gold');
  }
  Audio.pickup();
  removeEntity(itemEntity);
  // Auto-equip if enabled
  if (settings.autoEquip) tryAutoEquip(itemEntity.item);
}

function tryAutoEquip(item) {
  const p = state.player;
  const slot = item.itemType === 'weapon' ? 'weapon'
    : item.itemType === 'armor' ? 'armor'
    : item.itemType === 'ring' ? 'ring'
    : item.itemType === 'ranged' ? 'ranged'
    : null;
  if (!slot) return;

  // Never auto-equip cursed items
  if (item.cursed) return;

  const current = p.equipped[slot];
  let isBetter = false;

  if (!current) {
    isBetter = true; // empty slot — always equip
  } else if (current.cursed) {
    // Don't replace cursed gear (it's stuck)
    isBetter = false;
  } else if (slot === 'weapon') {
    if (item.attack > current.attack) {
      isBetter = true;
    } else if (item.attack === current.attack) {
      // Same ATK: prefer specialty over plain, or higher tier
      const newHasSpecial = !!item.special;
      const oldHasSpecial = !!current.special;
      if (newHasSpecial && !oldHasSpecial) isBetter = true;
      else if (newHasSpecial === oldHasSpecial && (item.tier || 0) > (current.tier || 0)) isBetter = true;
    }
  } else if (slot === 'armor') {
    if (item.defense > current.defense) {
      isBetter = true;
    } else if (item.defense === current.defense) {
      // Same DEF: prefer specialty over plain, or higher tier
      const newHasSpecial = !!item.special;
      const oldHasSpecial = !!current.special;
      if (newHasSpecial && !oldHasSpecial) isBetter = true;
      else if (newHasSpecial === oldHasSpecial && (item.tier || 0) > (current.tier || 0)) isBetter = true;
    }
  } else if (slot === 'ranged') {
    if (item.damage > current.damage) {
      isBetter = true;
    } else if (item.damage === current.damage) {
      // Same damage: prefer longer range, then specialty, then higher tier
      if ((item.range || 0) > (current.range || 0)) isBetter = true;
      else if ((item.range || 0) === (current.range || 0)) {
        if (!!item.special && !current.special) isBetter = true;
        else if ((item.tier || 0) > (current.tier || 0)) isBetter = true;
      }
    }
  }
  // Rings: don't auto-swap (subjective which is "better")

  if (isBetter) {
    // Unequip current into inventory
    if (current) {
      p.inventory.push(current);
    }
    p.equipped[slot] = item;
    // Remove from inventory
    const idx = p.inventory.indexOf(item);
    if (idx >= 0) p.inventory.splice(idx, 1);
    addMessage(`⚔️ Auto-equipped ${item.name}!`, 'good');
    updateUI();
  }
}

function playerDescend() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.throwMode) {
    state.throwMode = false;
    state.throwItem = null;
    addMessage('Throw cancelled.', '');
    updateUI();
    render();
    return;
  }
  const t = getTile(state.player.x, state.player.y);
  if (t !== T.STAIRS_DOWN) {
    addMessage('No stairs here.', '');
    updateUI();
    return;
  }

  // Badge: track exploration % before leaving floor
  if (state.runStats) {
    const totalTiles = MAP_W * MAP_H;
    const explored = state.explored.reduce((a, v) => a + v, 0);
    state.runStats.prevFloorExplored = explored / totalTiles;
    state.runStats.critsThisFloor = 0; // reset per-floor crit counter
  }

  state.floor++;
  Audio.descend();
  haptic(30);
  checkBadgesOnFloorChange();

  // Fade transition
  $('fade').classList.add('active');
  inputLocked = true;

  setTimeout(() => {
    generateFloor();
    // Place player at stairs up position or first room
    if (state.floor < MAX_FLOOR) {
      const firstRoom = state.rooms[0];
      state.player.x = firstRoom.x + Math.floor(firstRoom.w / 2);
      state.player.y = firstRoom.y + Math.floor(firstRoom.h / 2);
      setTile(state.player.x, state.player.y, T.STAIRS_UP);
    }
    addMessage(`You descend to floor ${state.floor}...`, '');
    if (state.floor === MAX_FLOOR) addMessage('You sense an overwhelming presence...', 'damage');
    computeFOV();
    updateUI();
    render();
    $('fade').classList.remove('active');
    inputLocked = false;
  }, 400);
}

function useItem(item, index) {
  const p = state.player;

  switch (item.itemType) {
    case 'weapon':
      // Unequip current weapon, equip new one
      if (p.equipped.weapon) p.inventory.push(p.equipped.weapon);
      p.equipped.weapon = item;
      p.inventory.splice(index, 1);
      addMessage(`You equip the ${item.name}.`, 'good');
      if (item.cursed && p.curseImmune) {
        item.cursed = false;
        addMessage('Your holy aura purifies the curse!', 'good');
      } else if (item.cursed && !item.curseRevealed) {
        item.curseRevealed = true;
        item.name = 'Cursed ' + item.name;
        addMessage('A dark aura binds the weapon to you! It\'s cursed!', 'damage');
        haptic(60);
      }
      Audio.useItem();
      break;

    case 'armor':
      if (p.equipped.armor) p.inventory.push(p.equipped.armor);
      p.equipped.armor = item;
      p.inventory.splice(index, 1);
      addMessage(`You equip the ${item.name}.`, 'good');
      if (item.cursed && p.curseImmune) {
        item.cursed = false;
        addMessage('Your holy aura purifies the curse!', 'good');
      } else if (item.cursed && !item.curseRevealed) {
        item.curseRevealed = true;
        item.name = 'Cursed ' + item.name;
        addMessage('A dark aura binds the armor to you! It\'s cursed!', 'damage');
        haptic(60);
      }
      Audio.useItem();
      break;

    case 'ring':
      if (p.equipped.ring) p.inventory.push(p.equipped.ring);
      p.equipped.ring = item;
      p.inventory.splice(index, 1);
      addMessage(`You put on the ${item.name}.`, 'good');
      if (item.cursed && p.curseImmune) {
        item.cursed = false;
        addMessage('Your holy aura purifies the curse!', 'good');
      } else if (item.cursed && !item.curseRevealed) {
        item.curseRevealed = true;
        item.name = 'Cursed ' + item.name;
        addMessage('A dark aura binds the ring to you! It\'s cursed!', 'damage');
        haptic(60);
      }
      if (item.special === 'protection') addMessage('You feel a magical barrier (+3 DEF).', 'good');
      else if (item.special === 'sight') addMessage('Your vision sharpens.', 'good');
      else if (item.special === 'haste') addMessage('You feel quicker on your feet.', 'good');
      else if (item.special === 'hunger') addMessage('Your hunger fades slightly.', 'good');
      Audio.useItem();
      break;

    case 'potion':
      applyPotionEffect(item);
      p.inventory.splice(index, 1);
      // Identify this potion type
      if (!item.identified) {
        potionIdentified[item.effectId] = true;
        addMessage(`It was a ${item.trueName}!`, 'good');
        // Update names of matching potions in inventory
        for (const inv of p.inventory) {
          if (inv.itemType === 'potion' && inv.effectId === item.effectId) {
            inv.name = inv.trueName;
            inv.identified = true;
          }
        }
        // Update matching potions on the ground (floor entities)
        for (const e of state.entities) {
          if (e.type === 'item' && e.item && e.item.itemType === 'potion' && e.item.effectId === item.effectId) {
            e.item.name = e.item.trueName;
            e.item.identified = true;
          }
        }
      }
      break;

    case 'scroll':
      applyScrollEffect(item);
      p.inventory.splice(index, 1);
      if (!item.identified) {
        scrollIdentified[item.effectId] = true;
        addMessage(`It was a ${item.trueName}!`, 'good');
        for (const inv of p.inventory) {
          if (inv.itemType === 'scroll' && inv.effectId === item.effectId) {
            inv.name = inv.trueName;
            inv.identified = true;
          }
        }
        // Update matching scrolls on the ground
        for (const e of state.entities) {
          if (e.type === 'item' && e.item && e.item.itemType === 'scroll' && e.item.effectId === item.effectId) {
            e.item.name = e.item.trueName;
            e.item.identified = true;
          }
        }
      }
      break;

    case 'ranged':
      // Equip ranged weapon
      if (p.equipped.ranged) p.inventory.push(p.equipped.ranged);
      p.equipped.ranged = item;
      p.inventory.splice(index, 1);
      addMessage(`You equip the ${item.name}.`, 'good');
      if (item.cursed && p.curseImmune) {
        item.cursed = false;
        addMessage('Your holy aura purifies the curse!', 'good');
      } else if (item.cursed && !item.curseRevealed) {
        item.curseRevealed = true;
        item.name = 'Cursed ' + item.name;
        addMessage('A dark aura binds the weapon to you! It\'s cursed!', 'damage');
        haptic(60);
      }
      if (item.special === 'sight') addMessage('Your vision sharpens through the bowstring.', 'good');
      Audio.useItem();
      break;

    case 'special_arrow':
      // Load special arrow for next ranged shot
      if (!p.equipped.ranged) {
        addMessage('You need a ranged weapon equipped to use special arrows.', 'damage');
        return;
      }
      if (item.ammo <= 0) {
        addMessage('No special arrows remaining!', 'damage');
        return;
      }
      p.loadedSpecialArrow = item;
      addMessage(`🔥 ${item.name} loaded! Fire your bow to use.`, 'good');
      break;

    case 'thrown':
      if (item.ammo <= 0) {
        addMessage('Your throwing daggers are exhausted!', 'damage');
        return;
      }
      state.throwMode = true;
      state.throwItem = { item, index };
      addMessage(`Choose a direction to throw (${item.ammo} left). Wait to cancel.`, 'good');
      updateUI();
      render();
      return; // Don't end turn or call updateUI again

    case 'food': {
      p.hunger = Math.min(100, p.hunger + 30);
      const foodItem = p.inventory[index];
      if (foodItem.stack && foodItem.stack > 1) {
        foodItem.stack--;
        foodItem.name = foodItem.stack === 1 ? 'Ration' : `Ration ×${foodItem.stack}`;
      } else {
        p.inventory.splice(index, 1);
      }
      addMessage('You eat a ration. (+30 hunger)', 'good');
      Audio.useItem();
      if (state.runStats) state.runStats.foodEaten++;
      break;
    }
  }

  updateUI();
  render();
}

function dropItem(index) {
  const item = state.player.inventory[index];
  state.entities.push(createItemEntity(item, state.player.x, state.player.y));
  state.player.inventory.splice(index, 1);
  addMessage(`You drop the ${item.name}.`, '');
  updateUI();
  render();
}

function applyPotionEffect(potion) {
  const p = state.player;
  Audio.useItem();
  // Potion drinking flash
  animateEntityFlash(p.x, p.y, potion.effectId === 'poison' ? '#40c040' : '#60c0ff');
  switch (potion.effectId) {
    case 'healing':
      p.hp = Math.min(p.maxHp, p.hp + 10);
      addMessage('You feel much better! (+10 HP)', 'good');
      break;
    case 'strength':
      addStatusEffect(p, 'strength', 30);
      addMessage('You feel incredibly strong!', 'good');
      break;
    case 'invisibility':
      addStatusEffect(p, 'invisibility', 15);
      addMessage('You fade from sight!', 'good');
      break;
    case 'poison':
      addStatusEffect(p, 'poison', 5);
      addMessage('That tasted terrible! You feel sick!', 'damage');
      break;
    case 'experience':
      p.xp += 20;
      addMessage('Wisdom floods your mind! (+20 XP)', 'good');
      while (p.xp >= p.xpToNext) {
        p.xp -= p.xpToNext;
        p.level++;
        p.xpToNext = 15 + p.level * 10;
        showLevelUp();
      }
      break;
    case 'teleport':
      const pos = randomFloorTile();
      if (pos) { p.x = pos.x; p.y = pos.y; }
      addMessage('The world blurs around you!', '');
      computeFOV();
      break;
  }
}

function applyScrollEffect(scroll) {
  Audio.useItem();
  animateEntityFlash(state.player.x, state.player.y, '#f0c040');
  incrementBadgeCount('scrolls_used', 1);
  if (badgeCounts.scrolls_used >= 20) unlockBadge('scroll_scholar');
  switch (scroll.effectId) {
    case 'mapping':
      state.explored.fill(1);
      addMessage('The layout of this floor is revealed!', 'good');
      break;
    case 'fireball': {
      const arcane = state.player.arcaneAffinity;
      const fbDamage = arcane ? 16 : 8;
      const fbRadius = arcane ? 4 : 3;
      let hits = 0;
      for (const e of [...state.entities]) {
        if (e.type !== 'enemy') continue;
        const d = Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y);
        if (d <= fbRadius) {
          e.hp -= fbDamage;
          hits++;
          if (e.hp <= 0) {
            addMessage(`${e.name} is incinerated!`, 'good');
            removeEntity(e);
            state.player.xp += e.xp;
            state.enemiesKilled++;
            state.floorData[Math.min(state.floor, MAX_FLOOR)].kills++;
          }
        }
      }
      addMessage(`A fireball erupts! ${hits} enemies hit for ${fbDamage}!`, 'damage');
      animateAoeBlast(state.player.x, state.player.y, fbRadius, 'rgba(255, 80, 20, 0.6)');
      screenShake();
      break;
    }
    case 'enchant': {
      const arcane = state.player.arcaneAffinity;
      const enchBonus = arcane ? 2 : 1;
      if (state.player.equipped.weapon) {
        state.player.equipped.weapon.attack += enchBonus;
        state.player.equipped.weapon.name += enchBonus === 2 ? ' ++' : ' +';
        addMessage(`Your ${state.player.equipped.weapon.name} blazes with power!`, 'good');
      } else {
        addMessage('You have no weapon to enchant.', '');
      }
      break;
    }
    case 'confusion': {
      const arcane = state.player.arcaneAffinity;
      const confDur = arcane ? 20 : 10;
      for (const e of state.entities) {
        if (e.type !== 'enemy') continue;
        if (state.visible[e.y * MAP_W + e.x]) {
          e.confused = confDur;
        }
      }
      addMessage(`Visible enemies look ${arcane ? 'completely lost' : 'dazed'}!`, 'good');
      animateAoeBlast(state.player.x, state.player.y, 6, 'rgba(160, 80, 255, 0.4)');
      break;
    }
    case 'identify':
      // Identify all potions and scrolls in inventory
      for (const item of state.player.inventory) {
        if (item.itemType === 'potion' && !item.identified) {
          potionIdentified[item.effectId] = true;
          item.name = item.trueName;
          item.identified = true;
        }
        if (item.itemType === 'scroll' && !item.identified) {
          scrollIdentified[item.effectId] = true;
          item.name = item.trueName;
          item.identified = true;
        }
      }
      addMessage('Your items shimmer with clarity!', 'good');
      break;
    case 'remove_curse': {
      const p2 = state.player;
      let removed = 0;
      for (const slot of ['weapon', 'armor', 'ring']) {
        if (p2.equipped[slot]?.cursed) {
          p2.equipped[slot].cursed = false;
          p2.equipped[slot].name = p2.equipped[slot].name.replace(/^Cursed /, '');
          removed++;
        }
      }
      addMessage(removed > 0 ? `${removed} item${removed === 1 ? '' : 's'} uncursed!` : 'Nothing to uncurse.', removed > 0 ? 'good' : '');
      break;
    }
    case 'summon': {
      const arcane = state.player.arcaneAffinity;
      // Spawn golem(s) adjacent to player
      const dirs = [[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
      const spawnGolem = (stats) => {
        let pos = null;
        for (const [dx, dy] of dirs) {
          const nx = state.player.x + dx, ny = state.player.y + dy;
          if (isWalkable(nx, ny) && !enemyAt(nx, ny)) { pos = { x: nx, y: ny }; break; }
        }
        if (!pos) pos = randomFloorTile();
        if (pos) {
          const golem = createEnemy(stats, pos.x, pos.y);
          golem.isAlly = true;
          golem.allyTurns = arcane ? 40 : 25;
          golem.alertness = 2;
          state.entities.push(golem);
          return true;
        }
        return false;
      };
      const golemStats = arcane
        ? { name: 'Iron Golem', glyph: '🗿', hp: 25, attack: 5, defense: 4, ai: 'chase', xp: 0, special: null, detect: 10 }
        : { name: 'Golem', glyph: '🗿', hp: 15, attack: 3, defense: 2, ai: 'chase', xp: 0, special: null, detect: 10 };
      const spawned = spawnGolem(golemStats);
      if (arcane && spawned) spawnGolem({ ...golemStats }); // second golem for wizard
      if (spawned) addMessage(arcane ? 'Two iron golems rise to serve you!' : 'A stone golem materializes to aid you!', 'good');
      else addMessage('The scroll fizzles... no room for a summon.', 'damage');
      break;
    }
    case 'create_food': {
      const arcane = state.player.arcaneAffinity;
      const count = arcane ? 3 : 2;
      let added = 0;
      for (let i = 0; i < count; i++) {
        if (addFoodToInventory()) added++;
      }
      if (added > 0) {
        addMessage(`${added} ration${added > 1 ? 's' : ''} materialize${added === 1 ? 's' : ''} in your pack!`, 'good');
      } else {
        addMessage('Your inventory is too full for food!', 'damage');
      }
      break;
    }
  }
}

// === SPECIAL EVENT TILES ===
function triggerSpecialEvent() {
  const roll = Math.random();
  if (roll < 0.35) {
    // Treasure
    const item = generateRandomItem(state.floor + 1);
    if (item) {
      state.player.inventory.push(item);
      state.itemsFound++;
      addMessage(`A hidden cache! You find a ${item.name}!`, 'gold');
      Audio.pickup();
    }
  } else if (roll < 0.6) {
    // Ambush
    const template = (ENEMY_TIERS[Math.ceil(state.floor / 3)] || ENEMY_TIERS[1])[0];
    for (let i = 0; i < 2; i++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = state.player.x + dx * (i + 1), ny = state.player.y + dy * (i + 1);
        if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
          const e = createEnemy(template, nx, ny);
          e.alertness = 2;
          state.entities.push(e);
          break;
        }
      }
    }
    addMessage('An ambush! Enemies emerge from the shadows!', 'damage');
    screenShake();
  } else {
    // Sacrifice shrine
    showShrineChoice();
  }
}

function showShrineChoice() {
  inputLocked = true;
  const allSacrifices = [
    { text: 'Sacrifice 5 Max HP for +2 Attack', apply: () => { state.player.maxHp -= 5; state.player.hp = Math.min(state.player.hp, state.player.maxHp); state.player.attack += 2; }},
    { text: 'Sacrifice 10 Gold for +1 Defense', apply: () => { state.player.gold = Math.max(0, state.player.gold - 10); state.player.defense += 1; }},
    { text: 'Sanctify your soul — gain life-drain immunity', apply: () => { state.player.drainImmune = true; addMessage('🛡️ Your soul is shielded from the hunger of wraiths.', 'good'); }, condition: () => !state.player.drainImmune && state.player.classId !== 'cleric' },
    { text: 'Sacrifice 3 Max HP to restore 30 hunger', apply: () => { state.player.maxHp -= 3; state.player.hp = Math.min(state.player.hp, state.player.maxHp); state.player.hunger = Math.min(100, state.player.hunger + 30); }},
  ];
  // Filter to available options + always include "leave"
  const sacrifices = allSacrifices.filter(s => !s.condition || s.condition());
  // Pick 2 random options from available, plus "leave"
  while (sacrifices.length > 2) sacrifices.splice(Math.floor(Math.random() * sacrifices.length), 1);
  sacrifices.push({ text: 'Leave the shrine alone', apply: () => {} });

  const container = $('perk-choices');
  container.innerHTML = '';
  $('levelup-overlay').querySelector('h1').textContent = '⛩️ SHRINE';
  $('levelup-label').textContent = `Make an offering?  ❤️ ${state.player.hp}/${state.player.maxHp} HP  ·  💰 ${state.player.gold} Gold`;

  for (const sac of sacrifices) {
    const btn = document.createElement('button');
    btn.className = 'perk-btn';
    btn.innerHTML = `<div class="perk-name">${sac.text}</div>`;
    btn.addEventListener('click', () => {
      sac.apply();
      $('levelup-overlay').classList.remove('active');
      $('levelup-overlay').querySelector('h1').textContent = '⬆️ LEVEL UP';
      inputLocked = false;
      addMessage('The shrine glows...', 'good');
      if (state.runStats && sac.text !== 'Leave the shrine alone') {
        state.runStats.shrinesUsed++;
        if (state.runStats.shrinesUsed >= 3) unlockBadge('shrine_gambler');
      }
      updateUI();
      render();
    });
    container.appendChild(btn);
  }

  $('levelup-overlay').classList.add('active');
}

// === MERCHANT ===
function showMerchant(merchant) {
  merchant.visited = true;
  inputLocked = true;
  Audio.merchant();
  renderShopItems(merchant);
  $('merchant-overlay').classList.add('active');
}

function renderDropSection(container, refreshCallback) {
  const p = state.player;
  if (p.inventory.length === 0) return;
  const dropLabel = document.createElement('div');
  dropLabel.style.cssText = 'color:var(--text-dim);font-size:11px;margin:12px 0 4px;text-align:center;letter-spacing:0.05em;';
  dropLabel.textContent = `— DROP ITEM (${p.inventory.length}/${MAX_INVENTORY}) —`;
  container.appendChild(dropLabel);
  for (let i = 0; i < p.inventory.length; i++) {
    const item = p.inventory[i];
    const div = document.createElement('div');
    div.className = 'shop-item';
    let detail = '';
    if (item.itemType === 'weapon' && item.attack != null) detail = ` [+${item.attack} ATK]`;
    else if (item.itemType === 'armor' && item.defense != null) detail = ` [+${item.defense} DEF]`;
    else if (item.itemType === 'thrown') detail = ` [×${item.ammo}]`;
    div.innerHTML = `<span>${item.glyph || ''} ${item.name}${detail}</span><span style="color:#ff6040;font-size:11px;">Drop</span>`;
    const idx = i;
    const dropHandler = () => {
      dropItem(idx);
      addMessage(`Dropped ${item.name} to make room.`, '');
      refreshCallback();
    };
    div.addEventListener('click', dropHandler);
    div.addEventListener('touchend', (e) => { e.preventDefault(); dropHandler(); }, { passive: false });
    container.appendChild(div);
  }
}

function renderShopItems(merchant) {
  $('merchant-gold').textContent = `Your gold: ${state.player.gold}`;
  const discountEl = $('merchant-discount');
  if (discountEl) discountEl.style.display = state.player.bartererDiscount ? '' : 'none';
  const container = $('shop-items');
  container.innerHTML = '';

  for (const shopItem of merchant.shopItems) {
    const div = document.createElement('div');
    div.className = 'shop-item';
    const it = shopItem.item;
    let statTag = '';
    if (it.itemType === 'weapon' && it.attack != null) statTag = ` <span style="color:var(--accent);font-size:11px;">[+${it.attack} ATK]</span>`;
    else if (it.itemType === 'ranged') statTag = ` <span style="color:#4a9;font-size:11px;">[${it.damage} DMG, ${it.range} rng]</span>`;
    else if (it.itemType === 'armor' && it.defense != null) statTag = ` <span style="color:#60c0ff;font-size:11px;">[+${it.defense} DEF]</span>`;
    else if (it.cursed && it.curseRevealed) statTag = ` <span style="color:#ff4040;font-size:11px;">[CURSED]</span>`;
    const effectivePrice = state.player.bartererDiscount ? Math.max(1, Math.floor(shopItem.price * 0.75)) : shopItem.price;
    const exclusiveTag = shopItem.artificerOnly ? ` <span style="color:#f0a030;font-size:11px;">[⚒️ Forged]</span>` : '';
    div.innerHTML = `<span>${it.glyph} ${it.name}${statTag}${exclusiveTag}</span><span class="price">${effectivePrice}💰</span>`;
    const buyHandler = () => {
      if (div.style.pointerEvents === 'none') return;
      if (state.player.gold >= effectivePrice) {
        state.player.gold -= effectivePrice;
        if (shopItem.item.itemType === 'food') {
          if (state.player.inventory.length < MAX_INVENTORY) {
            addFoodToInventory();
            addMessage('You buy a ration.', 'good');
          } else {
            state.player.hunger = Math.min(100, state.player.hunger + 30);
            addMessage('Inventory full — you eat the ration. (+30 hunger)', 'good');
          }
        } else if (shopItem.item.itemType === 'arrows') {
          state.player.arrows += shopItem.item.count;
          addMessage(`You buy ${shopItem.item.count} arrows! (${state.player.arrows} total)`, 'good');
        } else if (state.player.inventory.length >= MAX_INVENTORY) {
          // Drop purchased item on the ground at player's feet
          const bought = { ...shopItem.item };
          state.entities.push({ type: 'item', x: state.player.x, y: state.player.y, glyph: bought.glyph, item: bought });
          addMessage(`Inventory full — ${bought.name} dropped at your feet.`, 'damage');
        } else {
          state.player.inventory.push({ ...shopItem.item });
          addMessage(`You buy ${shopItem.item.name}.`, 'good');
          if (settings.autoEquip) tryAutoEquip(state.player.inventory[state.player.inventory.length - 1]);
        }
        Audio.gold();
        // Sharp Dealer: every 3rd purchase grants a free item
        if (state.player.sharpDealer) {
          state.player.merchantPurchaseCount = (state.player.merchantPurchaseCount || 0) + 1;
          if (state.player.merchantPurchaseCount >= 3) {
            state.player.merchantPurchaseCount = 0;
            const freeItem = generateMonsterDrop(state.floor, 20);
            if (freeItem && freeItem.itemType !== 'gold') {
              if (state.player.inventory.length < MAX_INVENTORY) {
                state.player.inventory.push(freeItem);
                addMessage(`🎁 Sharp Dealer! Free ${freeItem.name}!`, 'gold');
              } else {
                state.entities.push({ type: 'item', x: state.player.x, y: state.player.y, glyph: freeItem.glyph || '?', item: freeItem });
                addMessage(`🎁 Sharp Dealer! ${freeItem.name} dropped at your feet!`, 'gold');
              }
            }
          }
        }
        $('merchant-gold').textContent = `Your gold: ${state.player.gold}`;
        div.style.opacity = '0.3';
        div.style.pointerEvents = 'none';
        updateUI();
      } else {
        addMessage("You can't afford that.", 'damage');
      }
    };
    div.addEventListener('click', buyHandler);
    div.addEventListener('touchend', (e) => { e.preventDefault(); buyHandler(); }, { passive: false });
    container.appendChild(div);
  }

  // Refresh stock button
  const REFRESH_COST = 20;
  const refreshDiv = document.createElement('div');
  refreshDiv.className = 'shop-item';
  if (merchant.refreshesLeft > 0) {
    refreshDiv.innerHTML = `<span>🔄 Refresh Stock</span><span class="price" style="color:var(--accent)">${REFRESH_COST}💰 (${merchant.refreshesLeft} left)</span>`;
    const refreshHandler = () => {
      if (state.player.gold >= REFRESH_COST) {
        state.player.gold -= REFRESH_COST;
        merchant.shopItems = generateShopItems(state.floor);
        merchant.refreshesLeft--;
        addMessage('The merchant reveals new wares!', 'good');
        Audio.gold();
        renderShopItems(merchant);
        updateUI();
      } else {
        addMessage("Not enough gold to refresh.", 'damage');
      }
    };
    refreshDiv.addEventListener('click', refreshHandler);
    refreshDiv.addEventListener('touchend', (e) => { e.preventDefault(); refreshHandler(); }, { passive: false });
  } else {
    refreshDiv.innerHTML = `<span style="color:var(--text-dim)">🔄 No more refreshes</span><span></span>`;
    refreshDiv.style.opacity = '0.4';
    refreshDiv.style.pointerEvents = 'none';
  }
  container.appendChild(refreshDiv);

  // Drop section for inventory management while shopping
  renderDropSection(container, () => renderShopItems(merchant));
}

// === TURN PROCESSING ===
function endTurn() {
  if (state.gameOver || state.victory) return;

  state.turnCount++;
  state.player.turnsSurvived++;
  if (state.player.hp > state.peakHp) state.peakHp = state.player.hp;

  // Hunger (Berserker drains 2x faster; Ring of Hunger halves drain)
  if (state.turnCount % HUNGER_TICK === 0) {
    const ringBonus = hasRingEffect('hunger') ? 0.5 : 1;
    const runeBonus = hasRune('hunger') ? 0.75 : 1;
    const classRate = state.player.hungerRate || 1;
    const diffMult = state.difficulty === 'easy' ? 0.75 : state.difficulty === 'hard' ? 1.25 : 1;
    const rate = classRate * ringBonus * runeBonus * diffMult;
    const drainBase = Math.floor(rate);
    const drainFrac = rate % 1;
    const drain = drainBase + (Math.random() < (drainFrac || 1) ? 1 : 0);
    state.player.hunger = Math.max(0, state.player.hunger - drain);
  }

  // Survivor's Instinct (Adventurer perk): auto-eat food when starving
  if (state.player.hunger <= 0 && state.player.survivorInstinct) {
    const foodIdx = state.player.inventory.findIndex(i => i.itemType === 'food');
    if (foodIdx >= 0) {
      const foodItem = state.player.inventory[foodIdx];
      if (foodItem.stack && foodItem.stack > 1) {
        foodItem.stack--;
        foodItem.name = foodItem.stack === 1 ? 'Ration' : `Ration ×${foodItem.stack}`;
      } else {
        state.player.inventory.splice(foodIdx, 1);
      }
      state.player.hunger = Math.min(100, state.player.hunger + 40);
      addMessage("🍖 Survivor's Instinct: you eat a ration automatically!", 'good');
    }
  }

  if (state.player.hunger <= 0 && state.turnCount % HUNGER_DAMAGE_TICK === 0) {
    state.player.hp--;
    addMessage('You are starving! (-1 HP)', 'damage');
    if (state.player.hp <= 0) { playerDeath('starvation', '🍖'); return; }
  }

  // Passive regeneration — base 1 HP/30 turns; Regen perk halves the interval
  state.player.regenCounter++;
  const regenRate = state.player.hasRegen ? 15 : 30;
  if (state.player.regenCounter >= regenRate && state.player.hp < state.player.maxHp) {
    state.player.regenCounter = 0;
    const regenAmount = hasSynergy('lifebloom') ? 2 : 1;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + regenAmount);
  }

  // Tick class ability cooldowns
  if (state.player.enrageActive) {
    state.player.engageTurnsLeft--;
    if (state.player.engageTurnsLeft <= 0) {
      state.player.enrageActive = false;
      state.player.engageTurnsLeft = 0;
      addMessage('The battle fury fades.', '');
    }
  }
  if (state.player.spellCooldown > 0) state.player.spellCooldown--;
  if (state.player.aimedShotCooldown > 0) state.player.aimedShotCooldown--;
  if (state.player.starThrowCooldown > 0) state.player.starThrowCooldown--;
  if (state.player.acidBoltCooldown > 0) state.player.acidBoltCooldown--;
  if (state.player.flipCooldown > 0) state.player.flipCooldown--;
  if (state.player.illusionCooldown > 0) state.player.illusionCooldown--;
  if (state.player.fireWardCooldown > 0) state.player.fireWardCooldown--;

  // Expire illusion entities
  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    if (e.type === 'illusion') {
      e.turnsLeft--;
      if (e.turnsLeft <= 0) {
        state.entities.splice(i, 1);
        addMessage('The illusion fades.', '');
      }
    }
  }

  // Process hazards
  for (let i = state.entities.length - 1; i >= 0; i--) {
    const e = state.entities[i];
    if (e.type === 'hazard') {
      e.turns--;
      if (e.turns <= 0) state.entities.splice(i, 1);
    }
  }

  // Track idle turns — if player stays in same area too long, attract monsters
  const idleRadius = 5;
  const px = state.player.x, py = state.player.y;
  if (Math.abs(px - state.lastIdleX) <= idleRadius && Math.abs(py - state.lastIdleY) <= idleRadius) {
    state.idleTurns++;
  } else {
    state.idleTurns = 0;
    state.lastIdleX = px;
    state.lastIdleY = py;
  }

  // After lingering too long (15+ turns), wandering monsters approach
  if (state.idleTurns > 0 && state.idleTurns % 15 === 0 && state.floor < MAX_FLOOR) {
    const spawnCount = 1 + (state.idleTurns >= 30 ? 1 : 0);
    const tier = Math.min(5, Math.ceil(state.floor / 4));
    const templates = ENEMY_TIERS[tier] || ENEMY_TIERS[1];
    for (let i = 0; i < spawnCount; i++) {
      // Find a walkable tile just outside the visible area
      let spawnPos = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = FOV_RADIUS + 2 + Math.floor(Math.random() * 3);
        const sx = px + Math.round(Math.cos(angle) * dist);
        const sy = py + Math.round(Math.sin(angle) * dist);
        if (sx >= 0 && sx < MAP_W && sy >= 0 && sy < MAP_H && isWalkable(sx, sy) && !enemyAt(sx, sy)) {
          spawnPos = { x: sx, y: sy };
          break;
        }
      }
      if (spawnPos) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const roamer = createEnemy(template, spawnPos.x, spawnPos.y);
        roamer.alertness = 2; // Already hostile, heading toward player
        state.entities.push(roamer);
      }
    }
    if (state.idleTurns === 15) {
      addMessage('You hear something approaching...', 'damage');
    } else if (state.idleTurns >= 30) {
      addMessage('More creatures are drawn to your presence!', 'damage');
    }
  }

  // Enemy turns
  processEnemies();
  if (state.gameOver) return;

  // Status effects
  processStatusEffects();
  if (state.gameOver) return;

  // Victory check (boss dead on boss floor)
  if (state.floor === MAX_FLOOR && !state.entities.some(e => e.type === 'enemy' && e.name === 'Glyph King')) {
    showVictory();
    return;
  }

  computeFOV();
  updateUI();
  render();
}

// === HELPERS ===
function hasRingEffect(effect) {
  return state.player.equipped.ring?.special === effect;
}

function addMessage(text, cls) {
  if (!state) return;
  state.messages.push({ text, cls });
  if (state.messages.length > 500) state.messages.shift();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showPopupNotice(text) {
  // Brief on-screen popup that auto-dismisses
  let popup = $('popup-notice');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'popup-notice';
    popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);background:rgba(40,20,20,0.95);color:#ff6040;border:2px solid #ff4040;border-radius:10px;padding:14px 24px;font-size:15px;font-weight:700;text-align:center;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.15s,transform 0.15s;';
    document.body.appendChild(popup);
  }
  popup.textContent = text;
  popup.style.opacity = '1';
  popup.style.transform = 'translate(-50%,-50%) scale(1)';
  clearTimeout(popup._timer);
  popup._timer = setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%,-50%) scale(0.9)';
  }, 1500);
}

function screenShake() {
  $('canvas-wrap').classList.add('shake');
  setTimeout(() => $('canvas-wrap').classList.remove('shake'), 150);
}

function haptic(ms) {
  if (settings.haptics && navigator.vibrate) navigator.vibrate(ms);
}

// === CANVAS ANIMATIONS ===
const activeAnimations = [];

function animateProjectile(fromX, fromY, toX, toY, glyph, onDone) {
  const p = state.player;
  const ts = tileSize;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  activeAnimations.push({
    type: 'projectile', glyph,
    sx: (fromX - camX) * ts + ts / 2,
    sy: (fromY - camY) * ts + ts / 2,
    ex: (toX - camX) * ts + ts / 2,
    ey: (toY - camY) * ts + ts / 2,
    targetMapX: toX, targetMapY: toY, // map coords for enemy redraw
    t: 0, dur: 150, onDone
  });
  requestAnimationFrame(tickAnimations);
}

function animateAoeBlast(cx, cy, radius, color) {
  const p = state.player;
  const ts = tileSize;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  activeAnimations.push({
    type: 'aoe', color,
    cx: (cx - camX) * ts + ts / 2,
    cy: (cy - camY) * ts + ts / 2,
    maxR: radius * ts,
    t: 0, dur: 300
  });
  requestAnimationFrame(tickAnimations);
}

function animateEntityFlash(ex, ey, color) {
  const p = state.player;
  const ts = tileSize;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  activeAnimations.push({
    type: 'flash', color,
    cx: (ex - camX) * ts + ts / 2,
    cy: (ey - camY) * ts + ts / 2,
    size: ts,
    t: 0, dur: 200
  });
  requestAnimationFrame(tickAnimations);
}

let lastAnimTime = 0;
function tickAnimations(now) {
  if (!lastAnimTime) lastAnimTime = now;
  const dt = now - lastAnimTime;
  lastAnimTime = now;

  if (activeAnimations.length === 0) { lastAnimTime = 0; return; }

  // Redraw the base scene first
  render();

  const ctx = ctxC;
  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    const a = activeAnimations[i];
    a.t += dt;
    const progress = Math.min(1, a.t / a.dur);

    if (a.type === 'projectile') {
      const x = a.sx + (a.ex - a.sx) * progress;
      const y = a.sy + (a.ey - a.sy) * progress;
      ctx.font = `${Math.floor(tileSize * 0.6)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.glyph, x, y);
      // Redraw enemy on top of projectile so arrow appears to go behind/past monster
      if (a.targetMapX != null && state) {
        const enemy = state.entities.find(e => e.type === 'enemy' && e.x === a.targetMapX && e.y === a.targetMapY && e.hp > 0);
        if (enemy) {
          ctx.font = `${Math.floor(tileSize * 0.7)}px serif`;
          ctx.fillText(enemy.glyph, a.ex, a.ey);
        }
      }
    } else if (a.type === 'aoe') {
      const r = a.maxR * progress;
      ctx.globalAlpha = 0.4 * (1 - progress);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.cx, a.cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else if (a.type === 'flash') {
      ctx.globalAlpha = 0.5 * (1 - progress);
      ctx.fillStyle = a.color;
      ctx.fillRect(a.cx - a.size / 2, a.cy - a.size / 2, a.size, a.size);
      ctx.globalAlpha = 1.0;
    }

    if (progress >= 1) {
      if (a.onDone) a.onDone();
      activeAnimations.splice(i, 1);
    }
  }

  if (activeAnimations.length > 0) requestAnimationFrame(tickAnimations);
  else lastAnimTime = 0;
}

// === GHOST (LAST WORDS) SYSTEM ===
function loadGhost() {
  try {
    const data = localStorage.getItem('glyphDepths_ghost');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveGhost() {
  const p = state.player;
  const lastWords = $('last-words-input').value.trim() || 'No last words...';
  const item = p.inventory.length > 0 ? p.inventory[Math.floor(Math.random() * p.inventory.length)] : null;
  const ghost = {
    floor: state.floor,
    x: p.x, y: p.y,
    message: lastWords,
    item
  };
  try { localStorage.setItem('glyphDepths_ghost', JSON.stringify(ghost)); } catch {}
}

function placeGhost() {
  const g = state.ghost;
  const ghostEntity = createEnemy({ name: 'Your Ghost', glyph: '👻', hp: 5, attack: 2, defense: 0, ai: 'wander', xp: 3, special: null, detect: 4 }, g.x, g.y);
  ghostEntity.ghostData = g;
  state.entities.push(ghostEntity);
  if (g.item) {
    state.entities.push(createItemEntity(g.item, g.x, g.y));
  }
  addMessage(`You see the ghost of your past self... "${g.message}"`, '');
}

function saveHighScore() {
  try {
    let scores = JSON.parse(localStorage.getItem('glyphDepths_scores') || '[]');
    scores.push({
      score: state.score,
      floor: state.floor,
      level: state.player.level,
      date: new Date().toISOString().split('T')[0]
    });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem('glyphDepths_scores', JSON.stringify(scores));
  } catch {}
}

// === SAVE / LOAD SYSTEM ===
const SAVE_SLOTS = 5;
const SAVE_PREFIX = 'glyphDepths_save_';

function saveGameToSlot(slot) {
  if (!state || state.gameOver || state.victory) {
    addMessage('Nothing to save.', 'damage');
    return false;
  }
  try {
    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      state: serializeState(),
      potionNames: potionNames,
      scrollNames: scrollNames,
      potionIdentified: potionIdentified,
      scrollIdentified: scrollIdentified,
      badgesEarnedThisRun: badgesEarnedThisRun
    };
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(saveData));
    return true;
  } catch (e) {
    addMessage('Save failed — storage full?', 'damage');
    return false;
  }
}

function serializeState() {
  // Deep clone state, converting Uint8Arrays to regular arrays for JSON
  const s = {};
  for (const key of Object.keys(state)) {
    const val = state[key];
    if (val instanceof Uint8Array) {
      s[key] = { _uint8: true, data: Array.from(val) };
    } else if (val instanceof Set) {
      s[key] = { _set: true, data: Array.from(val) };
    } else if (key === 'ghost') {
      s[key] = val; // ghost is already a simple object
    } else {
      s[key] = JSON.parse(JSON.stringify(val)); // deep clone
    }
  }
  return s;
}

function loadFromRaw(raw) {
  try {
    const saveData = JSON.parse(raw);
    if (!saveData || !saveData.state) return false;
    potionNames = saveData.potionNames || [];
    scrollNames = saveData.scrollNames || [];
    potionIdentified = saveData.potionIdentified || {};
    scrollIdentified = saveData.scrollIdentified || {};
    badgesEarnedThisRun = saveData.badgesEarnedThisRun || [];
    const s = saveData.state;
    for (const key of Object.keys(s)) {
      if (s[key] && s[key]._uint8) s[key] = new Uint8Array(s[key].data);
      else if (s[key] && s[key]._set) s[key] = new Set(s[key].data);
    }
    state = s;
    inputLocked = false;
    state.throwMode = false;
    state.throwItem = null;
    state.fortifyMode = false;
    state.fortifyCandidates = null;
    state.minimapOpen = false;
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
    $('minimap-overlay').classList.remove('active');
    Audio.init();
    Audio.setEnabled(settings.sound);
    computeFOV();
    render();
    updateUI();
    return true;
  } catch { return false; }
}

function loadGameFromSlot(slot) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    const saveData = JSON.parse(raw);
    if (!saveData || !saveData.state) return false;

    // Restore global potion/scroll names and identification
    potionNames = saveData.potionNames || [];
    scrollNames = saveData.scrollNames || [];
    potionIdentified = saveData.potionIdentified || {};
    scrollIdentified = saveData.scrollIdentified || {};
    badgesEarnedThisRun = saveData.badgesEarnedThisRun || [];

    // Restore state, converting Uint8Array markers back
    const s = saveData.state;
    for (const key of Object.keys(s)) {
      if (s[key] && s[key]._uint8) {
        s[key] = new Uint8Array(s[key].data);
      } else if (s[key] && s[key]._set) {
        s[key] = new Set(s[key].data);
      }
    }
    state = s;

    // Reset transient state
    inputLocked = false;
    state.throwMode = false;
    state.throwItem = null;
    state.fortifyMode = false;
    state.fortifyCandidates = null;
    state.minimapOpen = false;

    // Close all overlays
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
    $('minimap-overlay').classList.remove('active');

    // Ensure audio is initialized (in case loading from title)
    Audio.init();
    Audio.setEnabled(settings.sound);

    // Track which save slot was loaded (for auto-delete on death)
    state._loadedFromSlot = slot;

    // Recompute FOV and render
    computeFOV();
    render();
    updateUI();
    addMessage('Game loaded.', 'good');
    return true;
  } catch (e) {
    return false;
  }
}

function deleteSaveSlot(slot) {
  localStorage.removeItem(SAVE_PREFIX + slot);
}

function getSaveSlotInfo(slot) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.state) return null;
    const p = data.state.player;
    const cls = CLASS_DEFS.find(c => c.id === p.classId);
    return {
      slot: slot,
      className: cls ? cls.name : 'Unknown',
      classIcon: cls ? cls.icon : '?',
      playerName: data.state.playerName || 'Unknown',
      playerEpithet: data.state.playerEpithet || '',
      floor: data.state.floor,
      level: p.level,
      hp: p.hp,
      maxHp: p.maxHp,
      timestamp: data.timestamp
    };
  } catch { return null; }
}

function showSaveOverlay() {
  const overlay = $('save-overlay');
  const slotsEl = $('save-slots');
  slotsEl.innerHTML = '';

  // Find if current hero already has a save slot (match by name + class)
  const curName = state.playerName || '';
  const curClass = state.player ? state.player.classId : '';
  let matchedSlot = state._loadedFromSlot || null;
  if (!matchedSlot) {
    for (let j = 1; j <= SAVE_SLOTS; j++) {
      const si = getSaveSlotInfo(j);
      if (si && si.playerName === curName) {
        const cls = CLASS_DEFS.find(c => c.name === si.className);
        if (cls && cls.id === curClass) { matchedSlot = j; break; }
      }
    }
  }

  // If we found the current hero's slot, prompt to overwrite immediately
  if (matchedSlot) {
    const mInfo = getSaveSlotInfo(matchedSlot);
    if (mInfo) {
      const promptDiv = document.createElement('div');
      promptDiv.className = 'save-slot';
      promptDiv.style.borderColor = 'var(--gold)';
      const age = timeSince(mInfo.timestamp);
      promptDiv.innerHTML =
        `<div style="color:var(--gold);font-weight:700;font-size:12px;margin-bottom:6px;">Update existing save?</div>`
        + `<div class="save-slot-header">`
        + `<span class="save-slot-name">${mInfo.classIcon} ${mInfo.playerName} ${mInfo.playerEpithet}</span>`
        + `<span class="save-slot-meta">${mInfo.className}</span>`
        + `</div>`
        + `<div class="save-slot-details">`
        + `Floor ${mInfo.floor} · Lv.${mInfo.level} · ${mInfo.hp}/${mInfo.maxHp} HP`
        + `<span class="save-slot-time">${age}</span>`
        + `</div>`;
      const btnRow = document.createElement('div');
      btnRow.className = 'save-slot-actions';
      const overwriteBtn = document.createElement('button');
      overwriteBtn.className = 'save-action-btn save-overwrite';
      overwriteBtn.textContent = '💾 Overwrite';
      overwriteBtn.style.background = '#2a5a3a';
      const mSlot = matchedSlot;
      const mSaveFn = () => {
        if (saveGameToSlot(mSlot)) {
          addMessage(`Game saved to slot ${mSlot}.`, 'good');
          closeSaveOverlay();
        }
      };
      overwriteBtn.addEventListener('click', mSaveFn);
      overwriteBtn.addEventListener('touchend', (e) => { e.preventDefault(); mSaveFn(); }, { passive: false });
      btnRow.appendChild(overwriteBtn);
      promptDiv.appendChild(btnRow);
      slotsEl.appendChild(promptDiv);

      // Separator
      const sep = document.createElement('div');
      sep.style.cssText = 'text-align:center;color:var(--text-dim);font-size:11px;margin:8px 0;';
      sep.textContent = '— or choose another slot —';
      slotsEl.appendChild(sep);
    }
  }

  for (let i = 1; i <= SAVE_SLOTS; i++) {
    const info = getSaveSlotInfo(i);
    const slotDiv = document.createElement('div');
    slotDiv.className = 'save-slot';
    if (info) {
      const age = timeSince(info.timestamp);
      slotDiv.innerHTML =
        `<div class="save-slot-header">`
        + `<span class="save-slot-name">${info.classIcon} ${info.playerName} ${info.playerEpithet}</span>`
        + `<span class="save-slot-meta">${info.className}</span>`
        + `</div>`
        + `<div class="save-slot-details">`
        + `Floor ${info.floor} · Lv.${info.level} · ${info.hp}/${info.maxHp} HP`
        + `<span class="save-slot-time">${age}</span>`
        + `</div>`;
      const btnRow = document.createElement('div');
      btnRow.className = 'save-slot-actions';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-action-btn save-overwrite';
      saveBtn.textContent = '💾 Overwrite';
      const slot = i;
      const saveFn = () => {
        if (saveGameToSlot(slot)) {
          addMessage(`Game saved to slot ${slot}.`, 'good');
          closeSaveOverlay();
        }
      };
      saveBtn.addEventListener('click', saveFn);
      saveBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveFn(); }, { passive: false });
      btnRow.appendChild(saveBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'save-action-btn save-delete';
      delBtn.textContent = '🗑️ Delete';
      const delFn = () => { deleteSaveSlot(slot); showSaveOverlay(); };
      delBtn.addEventListener('click', delFn);
      delBtn.addEventListener('touchend', (e) => { e.preventDefault(); delFn(); }, { passive: false });
      btnRow.appendChild(delBtn);

      slotDiv.appendChild(btnRow);
    } else {
      slotDiv.innerHTML = `<div class="save-slot-empty">— Empty Slot ${i} —</div>`;
      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-action-btn save-new';
      saveBtn.textContent = '💾 Save Here';
      const slot = i;
      const saveFn = () => {
        if (saveGameToSlot(slot)) {
          addMessage(`Game saved to slot ${slot}.`, 'good');
          closeSaveOverlay();
        }
      };
      saveBtn.addEventListener('click', saveFn);
      saveBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveFn(); }, { passive: false });
      slotDiv.appendChild(saveBtn);
    }
    slotsEl.appendChild(slotDiv);
  }

  // Cloud save section (only if Firebase is configured)
  if (isFirebaseConfigured()) {
    showCloudSaveOverlay();
  }

  inputLocked = true;
  overlay.classList.add('active');
}

function showLoadOverlay(fromTitle) {
  const overlay = $('load-overlay');
  const slotsEl = $('load-slots');
  slotsEl.innerHTML = '';
  let hasSaves = false;

  for (let i = 1; i <= SAVE_SLOTS; i++) {
    const info = getSaveSlotInfo(i);
    const slotDiv = document.createElement('div');
    slotDiv.className = 'save-slot';
    if (info) {
      hasSaves = true;
      const age = timeSince(info.timestamp);
      slotDiv.innerHTML =
        `<div class="save-slot-header">`
        + `<span class="save-slot-name">${info.classIcon} ${info.playerName} ${info.playerEpithet}</span>`
        + `<span class="save-slot-meta">${info.className}</span>`
        + `</div>`
        + `<div class="save-slot-details">`
        + `Floor ${info.floor} · Lv.${info.level} · ${info.hp}/${info.maxHp} HP`
        + `<span class="save-slot-time">${age}</span>`
        + `</div>`;
      const loadBtn = document.createElement('button');
      loadBtn.className = 'save-action-btn save-new';
      loadBtn.textContent = '▶️ Load';
      const slot = i;
      const loadFn = () => {
        if (loadGameFromSlot(slot)) {
          closeLoadOverlay();
          if (fromTitle) {
            $('title-screen').classList.remove('active');
          }
        } else {
          addMessage('Failed to load save.', 'damage');
        }
      };
      loadBtn.addEventListener('click', loadFn);
      loadBtn.addEventListener('touchend', (e) => { e.preventDefault(); loadFn(); }, { passive: false });
      slotDiv.appendChild(loadBtn);
    } else {
      slotDiv.innerHTML = `<div class="save-slot-empty">— Empty Slot ${i} —</div>`;
    }
    slotsEl.appendChild(slotDiv);
  }

  if (!hasSaves) {
    slotsEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">No saved games found.</div>';
  }

  inputLocked = true;
  overlay.classList.add('active');
}

function closeSaveOverlay() {
  $('save-overlay').classList.remove('active');
  inputLocked = false;
}

function closeLoadOverlay() {
  $('load-overlay').classList.remove('active');
  inputLocked = false;
}

function showCloudOverlay(fromTitle) {
  if (!isFirebaseConfigured()) {
    addMessage('Cloud saves not configured.', 'damage');
    return;
  }
  const overlay = $('cloud-overlay');
  const slotsEl = $('cloud-slots');
  slotsEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;">Loading cloud saves...</div>';

  inputLocked = true;
  overlay.classList.add('active');

  loadFirebaseSDK().then(() => {
    initFirebase();
    if (!firebaseUser) {
      slotsEl.innerHTML = '';
      const signInBtn = document.createElement('button');
      signInBtn.className = 'save-action-btn save-new';
      signInBtn.textContent = '🔑 Sign in with Google';
      signInBtn.style.cssText = 'width:100%;margin:8px 0;padding:12px;font-size:14px;';
      const signInFn = () => {
        cloudSignIn().then(() => renderCloudSlots(slotsEl, fromTitle)).catch(err => {
          slotsEl.innerHTML = '<div style="color:#ff6040;padding:10px;text-align:center;">Sign-in failed: ' + (err.message || err) + '</div>';
        });
      };
      signInBtn.addEventListener('click', signInFn);
      signInBtn.addEventListener('touchend', (e) => { e.preventDefault(); signInFn(); }, { passive: false });
      slotsEl.appendChild(signInBtn);
    } else {
      renderCloudSlots(slotsEl, fromTitle);
    }
  }).catch(err => {
    slotsEl.innerHTML = '<div style="color:#ff6040;padding:10px;text-align:center;">Could not load: ' + (err.message || err) + '</div>';
  });
}

function renderCloudSlots(container, fromTitle) {
  container.innerHTML = '';

  // Header with user info and sign out
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
  header.innerHTML = '<span style="color:var(--accent);font-size:12px;">☁️ ' + (firebaseUser.displayName || firebaseUser.email) + '</span>';
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign Out';
  signOutBtn.style.cssText = 'font-size:10px;padding:2px 8px;background:var(--bg);color:var(--text-dim);border:1px solid var(--text-dim);border-radius:4px;';
  const signOutFn = () => { cloudSignOut(); container.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:10px;">Signed out.</div>'; };
  signOutBtn.addEventListener('click', signOutFn);
  signOutBtn.addEventListener('touchend', (e) => { e.preventDefault(); signOutFn(); }, { passive: false });
  header.appendChild(signOutBtn);
  container.appendChild(header);

  // Save to cloud button (only if there's a game in progress)
  if (state && !state.gameOver) {
    const saveCloudBtn = document.createElement('button');
    saveCloudBtn.className = 'save-action-btn save-new';
    saveCloudBtn.textContent = '☁️ Save Current Game to Cloud';
    saveCloudBtn.style.cssText = 'width:100%;margin:4px 0;padding:10px;';
    const saveCloudFn = () => {
      const name = 'slot_' + (Date.now() % 100000);
      cloudSaveGame(name).then(() => { renderCloudSlots(container, fromTitle); }).catch(err => {
        addMessage('Cloud save failed: ' + (err.message || err), 'damage');
      });
    };
    saveCloudBtn.addEventListener('click', saveCloudFn);
    saveCloudBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveCloudFn(); }, { passive: false });
    container.appendChild(saveCloudBtn);
  }

  // List existing cloud saves
  const listEl = document.createElement('div');
  listEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:10px;font-size:11px;">Loading saves...</div>';
  container.appendChild(listEl);

  cloudListSaves().then(saves => {
    listEl.innerHTML = '';
    if (saves.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:10px;font-size:11px;">No cloud saves yet.</div>';
      return;
    }
    for (const save of saves) {
      const info = save.playerInfo || {};
      const div = document.createElement('div');
      div.className = 'save-slot';
      div.innerHTML = '<div class="save-slot-header"><span class="save-slot-name">' + (info.classIcon || '') + ' ' + (info.name || 'Unknown') + '</span><span class="save-slot-meta">' + (info.className || '') + '</span></div><div class="save-slot-details">Floor ' + (info.floor || '?') + ' · Lv.' + (info.level || '?') + ' · ' + (info.hp || '?') + '/' + (info.maxHp || '?') + ' HP<span class="save-slot-time">' + timeSince(save.timestamp) + '</span></div>';
      const btnRow = document.createElement('div');
      btnRow.className = 'save-slot-actions';
      const loadBtn = document.createElement('button');
      loadBtn.className = 'save-action-btn save-new';
      loadBtn.textContent = '▶️ Load';
      const loadFn = () => {
        cloudLoadGame(save.slotName).then(ok => {
          if (ok) {
            closeCloudOverlay();
            if (fromTitle) $('title-screen').classList.remove('active');
          }
        });
      };
      loadBtn.addEventListener('click', loadFn);
      loadBtn.addEventListener('touchend', (e) => { e.preventDefault(); loadFn(); }, { passive: false });
      btnRow.appendChild(loadBtn);
      const delBtn = document.createElement('button');
      delBtn.className = 'save-action-btn save-delete';
      delBtn.textContent = '🗑️';
      const delFn = () => { cloudDeleteSave(save.slotName).then(() => renderCloudSlots(container, fromTitle)); };
      delBtn.addEventListener('click', delFn);
      delBtn.addEventListener('touchend', (e) => { e.preventDefault(); delFn(); }, { passive: false });
      btnRow.appendChild(delBtn);
      div.appendChild(btnRow);
      listEl.appendChild(div);
    }
  });
}

function closeCloudOverlay() {
  $('cloud-overlay').classList.remove('active');
  inputLocked = false;
}

function timeSince(isoStr) {
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ''; }
}

function hasSavedGames() {
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    if (localStorage.getItem(SAVE_PREFIX + i)) return true;
  }
  return false;
}

// === CLOUD SAVE (Firebase / Google Auth) ===
// Opt-in: Firebase SDK is loaded dynamically only when the user taps "Cloud Save".
// No external scripts are loaded until the user explicitly activates this feature.

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBRjLPYv0sGtVoByExDpX_5pVERUp9BYfI',
  authDomain: 'glyph-depths.firebaseapp.com',
  projectId: 'glyph-depths',
  storageBucket: 'glyph-depths.firebasestorage.app',
  messagingSenderId: '966606470290',
  appId: '1:966606470290:web:3274d0965c5ea644f8fa4b'
};

let firebaseLoaded = false;
let firebaseUser = null;
let firebaseDb = null;

function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey !== '' && FIREBASE_CONFIG.projectId !== '';
}

function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (firebaseLoaded) { resolve(); return; }
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
    ];
    let loaded = 0;
    for (const src of scripts) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { loaded++; if (loaded === scripts.length) { firebaseLoaded = true; resolve(); } };
      s.onerror = () => reject(new Error('Failed to load Firebase SDK'));
      document.head.appendChild(s);
    }
  });
}

function initFirebase() {
  if (!window.firebase) return Promise.resolve();
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  firebaseDb = firebase.firestore();
  // Wait for Firebase Auth to resolve persisted session (currentUser is null until
  // auth state loads asynchronously from localStorage/IndexedDB).
  if (firebaseUser) return Promise.resolve(); // Already signed in this session
  return new Promise(resolve => {
    const unsub = firebase.auth().onAuthStateChanged(user => {
      unsub();
      if (user) firebaseUser = user;
      resolve();
    });
  });
}

function cloudSignIn() {
  if (!window.firebase) return Promise.reject('Firebase not loaded');
  const provider = new firebase.auth.GoogleAuthProvider();
  return new Promise((resolve, reject) => {
    let settled = false;
    function settle() { settled = true; document.removeEventListener('visibilitychange', onVisible); }

    firebase.auth().signInWithPopup(provider).then(result => {
      if (settled) return;
      settle();
      firebaseUser = result.user;
      addMessage(`☁️ Signed in as ${firebaseUser.displayName || firebaseUser.email}`, 'good');
      resolve(firebaseUser);
    }).catch(err => {
      if (settled) return;
      settle();
      reject(err);
    });

    // On iOS/mobile, signInWithPopup opens a new tab. If the Firebase auth
    // handler at authDomain fails (cross-origin storage partitioning), the
    // promise above never settles. Detect when the user returns to the app
    // tab and fail gracefully after a brief grace period.
    function onVisible() {
      if (document.visibilityState !== 'visible' || settled) return;
      setTimeout(() => {
        if (settled) return;
        settle();
        reject(new Error('Sign-in did not complete. On iOS Safari, try Chrome or Firefox.'));
      }, 3000);
    }
    // Delay listener so the initial tab-switch from opening the popup doesn't trigger it
    setTimeout(() => { if (!settled) document.addEventListener('visibilitychange', onVisible); }, 1500);
  });
}

function cloudSignOut() {
  if (!window.firebase) return;
  firebase.auth().signOut();
  firebaseUser = null;
  addMessage('☁️ Signed out of cloud saves.', '');
}

// Wrap a Firestore promise with a timeout so it doesn't hang forever.
// Firestore's SDK silently retries on connection/permission failures
// instead of rejecting, which leaves the UI stuck on "Saving..." etc.
function firestoreTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(
      'Operation timed out. Check that Firestore is enabled and security rules allow access.'
    )), ms || 15000))
  ]);
}

function cloudSaveGame(slotName) {
  if (!firebaseUser || !firebaseDb || !state) return Promise.reject('Not signed in');
  const saveData = {
    version: 1,
    timestamp: new Date().toISOString(),
    state: serializeState(),
    potionNames, scrollNames, potionIdentified, scrollIdentified,
    badgesEarnedThisRun,
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    slotName: slotName || 'Cloud Save',
    playerInfo: {
      name: state.player.name,
      className: state.player.className,
      classIcon: state.player.classIcon,
      floor: state.floor,
      level: state.player.level,
      hp: state.player.hp,
      maxHp: state.player.maxHp
    }
  };
  const docId = `${firebaseUser.uid}_${slotName}`;
  return firestoreTimeout(firebaseDb.collection('saves').doc(docId).set(saveData)).then(() => {
    addMessage(`☁️ Saved to cloud: ${slotName}`, 'good');
  });
}

function cloudLoadGame(slotName) {
  if (!firebaseUser || !firebaseDb) return Promise.reject('Not signed in');
  const docId = `${firebaseUser.uid}_${slotName}`;
  return firestoreTimeout(firebaseDb.collection('saves').doc(docId).get()).then(doc => {
    if (!doc.exists) { addMessage('No cloud save found.', 'damage'); return false; }
    const data = doc.data();
    // Reuse local load logic
    const raw = JSON.stringify({ version: data.version, timestamp: data.timestamp, state: data.state, potionNames: data.potionNames, scrollNames: data.scrollNames, potionIdentified: data.potionIdentified, scrollIdentified: data.scrollIdentified, badgesEarnedThisRun: data.badgesEarnedThisRun });
    localStorage.setItem('_cloud_load_tmp', raw);
    const success = loadFromRaw(raw);
    localStorage.removeItem('_cloud_load_tmp');
    if (success) addMessage(`☁️ Loaded from cloud: ${slotName}`, 'good');
    return success;
  });
}

function cloudListSaves() {
  if (!firebaseUser || !firebaseDb) return Promise.resolve([]);
  return firestoreTimeout(firebaseDb.collection('saves')
    .where('uid', '==', firebaseUser.uid)
    .orderBy('timestamp', 'desc')
    .get()
  ).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

function cloudDeleteSave(slotName) {
  if (!firebaseUser || !firebaseDb) return Promise.reject('Not signed in');
  const docId = `${firebaseUser.uid}_${slotName}`;
  return firestoreTimeout(firebaseDb.collection('saves').doc(docId).delete()).then(() => {
    addMessage(`☁️ Cloud save deleted: ${slotName}`, '');
  });
}

function showCloudSaveOverlay() {
  if (!isFirebaseConfigured()) {
    addMessage('Cloud saves not configured. Set Firebase config in game.js.', 'damage');
    return;
  }

  const overlay = $('save-overlay');
  const slotsEl = $('save-slots');

  // Show a loading message while Firebase loads
  const cloudSection = document.createElement('div');
  cloudSection.style.cssText = 'margin-top:16px;border-top:1px solid var(--text-dim);padding-top:12px;';
  cloudSection.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:10px;">Loading cloud saves...</div>';
  slotsEl.appendChild(cloudSection);

  const doCloud = () => {
    loadFirebaseSDK().then(() => {
      return initFirebase();
    }).then(() => {
      if (!firebaseUser) {
        cloudSection.innerHTML = '';
        const signInBtn = document.createElement('button');
        signInBtn.className = 'save-action-btn save-new';
        signInBtn.textContent = '🔑 Sign in with Google';
        signInBtn.style.cssText = 'width:100%;margin:8px 0;';
        const signInFn = () => {
          signInBtn.disabled = true;
          signInBtn.textContent = '🔑 Signing in...';
          // Remove previous error if retrying
          const prevErr = cloudSection.querySelector('.cloud-sign-in-error');
          if (prevErr) prevErr.remove();
          cloudSignIn().then(() => showCloudSaveUI(cloudSection)).catch(err => {
            signInBtn.disabled = false;
            signInBtn.textContent = '🔑 Sign in with Google';
            const errDiv = document.createElement('div');
            errDiv.className = 'cloud-sign-in-error';
            errDiv.style.cssText = 'color:#ff6040;padding:8px;text-align:center;font-size:11px;';
            errDiv.textContent = 'Sign-in failed: ' + (err.message || err);
            cloudSection.appendChild(errDiv);
          });
        };
        signInBtn.addEventListener('click', signInFn);
        signInBtn.addEventListener('touchend', (e) => { e.preventDefault(); signInFn(); }, { passive: false });
        cloudSection.appendChild(signInBtn);
      } else {
        showCloudSaveUI(cloudSection);
      }
    }).catch(err => {
      cloudSection.innerHTML = `<div style="color:#ff6040;padding:10px;text-align:center;">Could not load cloud saves: ${err.message || err}</div>`;
    });
  };

  doCloud();
}

function showCloudSaveUI(container) {
  container.innerHTML = '';
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
  header.innerHTML = `<span style="color:var(--accent);font-size:12px;">☁️ ${firebaseUser.displayName || firebaseUser.email}</span>`;
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign Out';
  signOutBtn.style.cssText = 'font-size:10px;padding:2px 8px;background:var(--bg);color:var(--text-dim);border:1px solid var(--text-dim);border-radius:4px;';
  const signOutFn = () => { cloudSignOut(); container.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:10px;">Signed out.</div>'; };
  signOutBtn.addEventListener('click', signOutFn);
  signOutBtn.addEventListener('touchend', (e) => { e.preventDefault(); signOutFn(); }, { passive: false });
  header.appendChild(signOutBtn);
  container.appendChild(header);

  // Save to cloud button
  const saveCloudBtn = document.createElement('button');
  saveCloudBtn.className = 'save-action-btn save-new';
  saveCloudBtn.textContent = '☁️ Save to Cloud';
  saveCloudBtn.style.cssText = 'width:100%;margin:4px 0;';
  const saveCloudFn = () => {
    saveCloudBtn.disabled = true;
    saveCloudBtn.textContent = '☁️ Saving...';
    const name = 'slot_' + (Date.now() % 100000);
    cloudSaveGame(name).then(() => { showCloudSaveUI(container); }).catch(err => {
      saveCloudBtn.disabled = false;
      saveCloudBtn.textContent = '☁️ Save to Cloud';
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'color:#ff6040;padding:6px;text-align:center;font-size:11px;';
      errDiv.textContent = `Save failed: ${err.message || err}`;
      container.appendChild(errDiv);
    });
  };
  saveCloudBtn.addEventListener('click', saveCloudFn);
  saveCloudBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveCloudFn(); }, { passive: false });
  container.appendChild(saveCloudBtn);

  // List existing cloud saves
  cloudListSaves().then(saves => {
    if (saves.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:var(--text-dim);padding:10px;font-size:11px;';
      empty.textContent = 'No cloud saves yet.';
      container.appendChild(empty);
      return;
    }
    for (const save of saves) {
      const info = save.playerInfo || {};
      const div = document.createElement('div');
      div.className = 'save-slot';
      div.innerHTML = `<div class="save-slot-header"><span class="save-slot-name">${info.classIcon || ''} ${info.name || 'Unknown'}</span><span class="save-slot-meta">${info.className || ''}</span></div><div class="save-slot-details">Floor ${info.floor || '?'} · Lv.${info.level || '?'} · ${info.hp || '?'}/${info.maxHp || '?'} HP<span class="save-slot-time">${timeSince(save.timestamp)}</span></div>`;
      const btnRow = document.createElement('div');
      btnRow.className = 'save-slot-actions';
      const loadBtn = document.createElement('button');
      loadBtn.className = 'save-action-btn save-new';
      loadBtn.textContent = '▶️ Load';
      const loadFn = () => { cloudLoadGame(save.slotName).then(ok => { if (ok) closeSaveOverlay(); }); };
      loadBtn.addEventListener('click', loadFn);
      loadBtn.addEventListener('touchend', (e) => { e.preventDefault(); loadFn(); }, { passive: false });
      btnRow.appendChild(loadBtn);
      const delBtn = document.createElement('button');
      delBtn.className = 'save-action-btn save-delete';
      delBtn.textContent = '🗑️';
      const delFn = () => { cloudDeleteSave(save.slotName).then(() => showCloudSaveUI(container)); };
      delBtn.addEventListener('click', delFn);
      delBtn.addEventListener('touchend', (e) => { e.preventDefault(); delFn(); }, { passive: false });
      btnRow.appendChild(delBtn);
      div.appendChild(btnRow);
      container.appendChild(div);
    }
  }).catch(err => {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#ff6040;padding:6px;text-align:center;font-size:11px;';
    errDiv.textContent = `Could not list cloud saves: ${err.message || err}`;
    container.appendChild(errDiv);
  });
}

// === SETTINGS ===
function loadSettings() {
  try {
    const s = localStorage.getItem('glyphDepths_settings');
    if (s) settings = { ...settings, ...JSON.parse(s) };
  } catch {}
}

function saveSettings() {
  try { localStorage.setItem('glyphDepths_settings', JSON.stringify(settings)); } catch {}
}

// === RENDERING ===
function render() {
  if (!state) return;

  const ctx = ctxC;
  const ts = tileSize;
  const p = state.player;

  // Camera offset (center on player)
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));

  // Clear with biome background
  const biome = getFloorBiome(state.floor);
  ctx.fillStyle = biome.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = Math.floor(ts * 0.7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw tiles
  for (let vy = 0; vy < VIEW_ROWS; vy++) {
    for (let vx = 0; vx < VIEW_COLS; vx++) {
      const mx = camX + vx, my = camY + vy;
      if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) continue;

      const idx = my * MAP_W + mx;
      const vis = state.visible[idx];
      const exp = state.explored[idx];
      const tile = state.map[idx];

      if (!exp) continue; // Unexplored — leave black

      const px = vx * ts + ts / 2;
      const py = vy * ts + ts / 2;

      // Distance-based brightness
      const dist = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      let alpha;
      if (vis) {
        alpha = dist <= 3 ? 1.0 : dist <= 6 ? 0.85 : 0.7;
      } else {
        alpha = 0.65; // Explored but not visible — clearly readable, slightly dimmed
      }

      ctx.globalAlpha = alpha;

      // Draw tile background for special tiles
      if (tile === T.SPECIAL && vis) {
        ctx.fillStyle = 'rgba(128, 80, 255, 0.15)';
        ctx.fillRect(vx * ts, vy * ts, ts, ts);
      }
      if (tile === T.TELEPORT_VIS && vis) {
        ctx.fillStyle = 'rgba(64, 224, 208, 0.12)';
        ctx.fillRect(vx * ts, vy * ts, ts, ts);
      }

      // Draw tile glyph
      ctx.font = `${fontSize}px monospace`;
      let tileGlyph, tileColor;
      switch (tile) {
        case T.WALL: {
          const mKey = my * MAP_W + mx;
          const isMasonWall = state.masonWalls && state.masonWalls.has(mKey);
          tileGlyph = '▓';
          if (isMasonWall) {
            const mHp = state.masonWalls.get(mKey) || 3;
            // Orange-brown for fresh walls, darkens as damaged
            tileColor = vis ? (mHp >= 3 ? '#c87838' : mHp === 2 ? '#a85e28' : '#804020') : '#5a3018';
          } else {
            tileColor = vis ? biome.wallVis : biome.wallDim;
          }
          break;
        }
        case T.FLOOR:
          tileGlyph = '·';
          tileColor = vis ? biome.floorVis : biome.floorDim;
          break;
        case T.CORRIDOR:
          tileGlyph = '·';
          tileColor = vis ? biome.corrVis : biome.corrDim;
          break;
        case T.STAIRS_DOWN:
          tileGlyph = '▼';
          tileColor = '#80ff80';
          break;
        case T.STAIRS_UP:
          tileGlyph = '▲';
          tileColor = '#ffff80';
          break;
        case T.DOOR_CLOSED:
          tileGlyph = '+';
          tileColor = (state.rogueClosedDoors && state.rogueClosedDoors.has(my * MAP_W + mx)) ? '#40a0a0' : '#8B6914';
          break;
        case T.DOOR_OPEN:
          tileGlyph = '/';
          tileColor = '#6B4914';
          break;
        case T.DOOR_ONEWAY:
          tileGlyph = '⊳';
          tileColor = '#c06030';
          break;
        case T.DOOR_SEALED:
          tileGlyph = '▓';
          tileColor = '#4a2020';
          break;
        case T.WALL_SECRET: {
          // Looks like a normal wall; Rogue class can detect with shimmer
          const sKey = my * MAP_W + mx;
          const cracked = state.secretBashes && state.secretBashes[sKey];
          tileGlyph = cracked ? '▒' : '▓';
          tileColor = cracked ? '#c09040' : (vis ? biome.wallVis : biome.wallDim);
          if (!cracked && vis && state.player.classId === 'rogue' && Math.random() < 0.30) {
            tileColor = '#9090a0';
          }
          break;
        }
        case T.DOOR_LOCKED:
          tileGlyph = '⊞';
          tileColor = vis ? '#c08030' : '#604018';
          break;
        case T.SPECIAL:
          tileGlyph = '·';
          tileColor = vis ? '#8060c0' : '#302040';
          break;
        case T.TELEPORT:
          // Invisible teleport — looks like normal floor until triggered
          tileGlyph = '·';
          tileColor = vis ? biome.floorVis : biome.floorDim;
          break;
        case T.TELEPORT_VIS:
          // Revealed teleport — pulsing cyan
          tileGlyph = '◊';
          tileColor = vis ? '#40e0d0' : '#1a6060';
          break;
        case T.RUBBLE:
          // Avalanche debris — warm brown, impassable
          tileGlyph = '▒';
          tileColor = vis ? '#9a6535' : '#3a2515';
          break;
        default:
          tileGlyph = ' ';
          tileColor = '#000';
      }

      ctx.fillStyle = tileColor;
      ctx.fillText(tileGlyph, px, py);
    }
  }

  ctx.globalAlpha = 1.0;

  // Targeting overlay when in throw/fire mode
  if (state.throwMode) {
    const throwItem = state.throwItem?.item;
    const maxRange = throwItem?.itemType === 'aimed_shot' ? 15 : (throwItem?.range || 8);
    const isBlast = throwItem?.itemType === 'special_arrow' && throwItem?.arrowType === 'blast';
    // If a special arrow is loaded, check for blast
    const loadedArrow = state.player.loadedSpecialArrow;
    const hasBlast = isBlast || (loadedArrow?.arrowType === 'blast');

    // Show targeting lines in 4 cardinal directions (no diagonal input available)
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [ddx, ddy] of dirs) {
      let tx = p.x + ddx, ty = p.y + ddy;
      for (let i = 0; i < maxRange; i++) {
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) break;
        const vx = tx - camX, vy = ty - camY;
        if (vx >= 0 && vx < VIEW_COLS && vy >= 0 && vy < VIEW_ROWS) {
          const enemy = enemyAt(tx, ty);
          if (enemy && enemy.hp > 0) {
            // Mark enemy position in red
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#ff4040';
            ctx.fillRect(vx * ts, vy * ts, ts, ts);
            // Show blast radius if applicable
            if (hasBlast) {
              ctx.globalAlpha = 0.15;
              ctx.fillStyle = '#ff8020';
              for (let ax = -1; ax <= 1; ax++) {
                for (let ay = -1; ay <= 1; ay++) {
                  if (ax === 0 && ay === 0) continue;
                  const bvx = vx + ax, bvy = vy + ay;
                  if (bvx >= 0 && bvx < VIEW_COLS && bvy >= 0 && bvy < VIEW_ROWS) {
                    ctx.fillRect(bvx * ts, bvy * ts, ts, ts);
                  }
                }
              }
            }
            ctx.globalAlpha = 1.0;
            break; // Stop at first enemy in this direction
          }
          if (!isWalkable(tx, ty)) break;
          // Highlight path tile
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(vx * ts, vy * ts, ts, ts);
          ctx.globalAlpha = 1.0;
        }
        tx += ddx;
        ty += ddy;
      }
    }
  }

  // Fortify mode — highlight candidate tiles
  if (state.fortifyMode && state.fortifyCandidates) {
    for (const cand of state.fortifyCandidates) {
      const vx = cand.nx - camX, vy = cand.ny - camY;
      if (vx >= 0 && vx < VIEW_COLS && vy >= 0 && vy < VIEW_ROWS) {
        // Pulsing amber highlight
        const pulse = 0.25 + 0.15 * Math.sin(Date.now() / 250);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#c09040';
        ctx.fillRect(vx * ts, vy * ts, ts, ts);
        ctx.globalAlpha = 1.0;
        // Draw a brick icon
        ctx.font = `${Math.floor(ts * 0.6)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c09040';
        ctx.fillText('🧱', vx * ts + ts / 2, vy * ts + ts / 2);
      }
    }
    // Request continuous redraw for pulsing effect
    requestAnimationFrame(() => { if (state.fortifyMode) render(); });
  }

  // Draw items (only visible ones)
  for (const e of state.entities) {
    if (e.type !== 'item' && e.type !== 'hazard') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;

    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;

    ctx.font = `${Math.floor(ts * 0.65)}px serif`;
    if (e.item?.itemType === 'arrows') {
      ctx.fillStyle = '#ffe066'; // bright amber so arrows stand out on the floor
      ctx.fillText(e.glyph, sx, sy);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillText(e.glyph, sx, sy);
    }
  }

  // Draw glyph runes (shimmer effect)
  for (const e of state.entities) {
    if (e.type !== 'rune') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;
    // Pulsing glow behind the rune
    const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#c0a0ff';
    ctx.beginPath();
    ctx.arc(sx, sy, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillStyle = '#e0c0ff';
    ctx.fillText(e.rune ? e.rune.symbol : '✦', sx, sy);
  }

  // Draw merchant
  for (const e of state.entities) {
    if (e.type !== 'merchant') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
  }

  // Draw sage (with purple glow)
  for (const e of state.entities) {
    if (e.type !== 'sage') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    ctx.globalAlpha = e.visited ? 0.15 : 0.3;
    ctx.fillStyle = '#a060ff';
    ctx.beginPath();
    ctx.arc(sx, sy, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = e.visited ? 0.5 : 1.0;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
    ctx.globalAlpha = 1.0;
  }

  // Draw tavern (with amber glow)
  for (const e of state.entities) {
    if (e.type !== 'tavern') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    ctx.globalAlpha = e.visited ? 0.15 : 0.3;
    ctx.fillStyle = '#d0a030';
    ctx.beginPath();
    ctx.arc(sx, sy, ts * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = e.visited ? 0.5 : 1.0;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
    ctx.globalAlpha = 1.0;
  }

  // Draw friendly NPCs (with cyan background square to distinguish from enemies)
  for (const e of state.entities) {
    if (e.type !== 'npc') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    // Solid cyan background tile
    ctx.globalAlpha = e.spoken ? 0.12 : 0.25;
    ctx.fillStyle = '#40e0ff';
    ctx.fillRect((e.x - camX) * ts + 1, (e.y - camY) * ts + 1, ts - 2, ts - 2);
    ctx.globalAlpha = e.spoken ? 0.5 : 1.0;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
    ctx.globalAlpha = 1.0;
  }

  // Draw Conjurer illusions (shimmering magenta tint)
  for (const e of state.entities) {
    if (e.type !== 'illusion') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    const pulse = 0.15 + 0.10 * Math.sin(Date.now() / 300);
    ctx.globalAlpha = pulse + 0.35;
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect((e.x - camX) * ts + 1, (e.y - camY) * ts + 1, ts - 2, ts - 2);
    ctx.globalAlpha = 0.75;
    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
    ctx.globalAlpha = 1.0;
  }

  // Draw enemies (only visible ones with hp > 0)
  for (const e of state.entities) {
    if (e.type !== 'enemy') continue;
    if (e.hp <= 0) continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;

    // Mimic looks like a chest until adjacent
    if (e.special === 'mimic' && e.alertness < 2) {
      const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      if (dist > 1) {
        const sx = (e.x - camX) * ts + ts / 2;
        const sy = (e.y - camY) * ts + ts / 2;
        ctx.font = `${Math.floor(ts * 0.65)}px serif`;
        ctx.fillText('📦', sx, sy);
        continue;
      }
    }

    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;

    ctx.font = `${Math.floor(ts * 0.7)}px serif`;
    ctx.fillText(e.glyph, sx, sy);

    // HP bar for damaged enemies
    if (e.hp < e.maxHp) {
      const barW = ts - 4;
      const barH = 2;
      const barX = (e.x - camX) * ts + 2;
      const barY = (e.y - camY) * ts;
      ctx.fillStyle = '#c04040';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#40c040';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
    }
  }

  // Draw player
  const playerSX = (p.x - camX) * ts + ts / 2;
  const playerSY = (p.y - camY) * ts + ts / 2;
  ctx.font = `${Math.floor(ts * 0.75)}px serif`;
  if (hasStatusEffect(p, 'invisibility')) {
    ctx.globalAlpha = 0.4;
  }
  ctx.fillText(p.glyph, playerSX, playerSY);
  ctx.globalAlpha = 1.0;

  // Danger border — red glow when low HP or low food
  const hpPct = p.hp / p.maxHp;
  const dangerHP = p.hp < 6;
  const dangerHunger = p.hunger < 31;
  if (dangerHP || dangerHunger) {
    const intensity = dangerHP ? Math.max(0.55, 1 - hpPct * 2) : 0.55;
    const pulseAlpha = intensity * (0.75 + 0.25 * Math.sin(Date.now() / 200)); // fast pulse
    const borderW = 16;
    const glowSize = 55;
    const col = dangerHP ? '#ff2020' : '#ff6020';
    const colRgb = dangerHP ? '255,32,32' : '255,96,32';
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.strokeStyle = col;
    ctx.lineWidth = borderW * 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    // Inner glow gradient on edges
    ctx.globalAlpha = pulseAlpha * 0.6;
    const gt = ctx.createLinearGradient(0, 0, 0, glowSize);
    gt.addColorStop(0, `rgba(${colRgb},1)`);
    gt.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gt;
    ctx.fillRect(0, 0, canvas.width, glowSize);
    const gb = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - glowSize);
    gb.addColorStop(0, `rgba(${colRgb},1)`);
    gb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gb;
    ctx.fillRect(0, canvas.height - glowSize, canvas.width, glowSize);
    const gl = ctx.createLinearGradient(0, 0, glowSize, 0);
    gl.addColorStop(0, `rgba(${colRgb},1)`);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, glowSize, canvas.height);
    const gr = ctx.createLinearGradient(canvas.width, 0, canvas.width - glowSize, 0);
    gr.addColorStop(0, `rgba(${colRgb},1)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(canvas.width - glowSize, 0, glowSize, canvas.height);
    ctx.restore();
    // Throttled danger sound — every 4 seconds while in danger
    const now = Date.now();
    if (now - (render._lastDangerBeep || 0) > 4000) {
      render._lastDangerBeep = now;
      Audio.danger();
    }
  }

  // Vignette effect
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.6
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// === UI UPDATE ===
function updateUI() {
  if (!state) return;
  const p = state.player;

  // Status bar
  $('floor-label').textContent = `⬊${state.floor}`;
  $('level-label').textContent = `Lv.${p.level}`;
  $('gold-label').textContent = `💰 ${p.gold}`;
  $('hunger-label').textContent = `🍖 ${p.hunger}`;
  // Arrow counter — show if player has a ranged weapon or any arrows
  const arrowEl = $('arrow-label');
  if (arrowEl) {
    if (p.equipped.ranged || p.arrows > 0) {
      arrowEl.style.display = '';
      arrowEl.textContent = p.infiniteArrows ? '➶ ∞' : `➶ ${p.arrows}`;
    } else {
      arrowEl.style.display = 'none';
    }
  }
  // Fire button — show when ranged weapon equipped
  const fireBtn = $('btn-fire');
  if (fireBtn) {
    fireBtn.style.display = p.equipped.ranged ? '' : 'none';
  }
  // Rogue close door button
  const closeDoorBtn = $('btn-closedoor');
  if (closeDoorBtn) {
    closeDoorBtn.style.display = (p.classId === 'rogue' || p.classId === 'mason') ? '' : 'none';
  }
  $('hp-text').textContent = `${p.hp}/${p.maxHp}`;

  // HP bar
  const hpPct = Math.max(0, p.hp / p.maxHp * 100);
  $('hp-bar').style.width = hpPct + '%';
  const effects = p.statusEffects || [];
  let hpColor;
  if (effects.some(e => e.type === 'poison')) {
    hpColor = '#50c040'; // green-tinted when poisoned
  } else if (effects.some(e => e.type === 'burning')) {
    hpColor = '#ff6020'; // orange when burning
  } else {
    hpColor = hpPct > 60 ? 'var(--hp-high)' : hpPct > 30 ? 'var(--hp-mid)' : 'var(--hp-low)';
  }
  $('hp-bar').style.backgroundColor = hpColor;

  // Messages
  const msgLog = $('msg-log');
  const expanded = msgLog.classList.contains('expanded');
  msgLog.innerHTML = '';
  const msgs = expanded ? state.messages : state.messages.slice(-3);
  for (const msg of msgs) {
    const div = document.createElement('div');
    div.className = 'msg' + (msg.cls ? ' ' + msg.cls : '');
    div.textContent = msg.text;
    msgLog.appendChild(div);
  }
  if (expanded) msgLog.scrollTop = msgLog.scrollHeight;

  // Rune bar
  const runeBar = $('rune-bar');
  if (runeBar) {
    if (p.runes && p.runes.length > 0) {
      runeBar.style.display = '';
      runeBar.textContent = '✦ Runes: ' + p.runes.map(r => r.symbol).join(' ');
      runeBar.title = p.runes.map(r => r.name).join(', ');
    } else {
      runeBar.style.display = 'none';
    }
  }

  // Inventory
  renderInventory();

  // Status effect indicators
  renderStatusFX();

  // Special ability button with cooldown bar
  const spRow = $('special-row');
  const spBtn = $('btn-special');
  const spTxt = $('btn-special-text');
  const cdBar = $('cd-bar');
  if (spRow && spBtn && spTxt && cdBar) {
    const cls = p.classId;
    const setBtn = (text, active, color) => {
      spTxt.textContent = text;
      spBtn.style.borderColor = active ? (color || 'var(--gold)') : 'var(--panel-border)';
      spBtn.style.color = active ? (color || 'var(--gold)') : 'var(--text-dim)';
      spBtn.style.opacity = active ? '1' : '0.5';
    };
    const setBar = (pct, color) => {
      cdBar.style.width = pct + '%';
      cdBar.style.background = color || 'var(--gold)';
    };
    if (cls === 'berserker') {
      spRow.style.display = '';
      if (p.enrageActive) {
        setBtn(`🔥 FURY ${p.engageTurnsLeft}t`, true, '#ff6020');
        setBar((p.engageTurnsLeft / 5) * 100, '#ff6020');
      } else if (p.enrageFloorUsed) {
        setBtn('⚡ ENRAGE ✓', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('⚡ ENRAGE', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'wizard') {
      spRow.style.display = '';
      if (p.fireWard) {
        // Fire Ward unlocked: button opens spell menu (Arcane Blast + Fire Ward)
        const blastReady = p.spellCooldown <= 0;
        const wardReady = p.fireWardCooldown <= 0;
        if (blastReady && wardReady) {
          setBtn('✨ SPELLS ✓', true);
          setBar(100, 'var(--gold)');
        } else if (blastReady) {
          setBtn(`✨ SPELLS (ward ${p.fireWardCooldown}t)`, true);
          setBar(100, '#a060ff');
        } else if (wardReady) {
          setBtn(`✨ SPELLS (blast ${p.spellCooldown}t)`, true);
          setBar(((12 - p.spellCooldown) / 12) * 100, '#7c5cbf');
        } else {
          const minCD = Math.min(p.spellCooldown, p.fireWardCooldown);
          setBtn(`✨ SPELLS ${minCD}t`, false);
          setBar(((12 - p.spellCooldown) / 12) * 100, '#7c5cbf');
        }
      } else {
        if (p.spellCooldown > 0) {
          setBtn(`✨ BLAST ${p.spellCooldown}t`, false);
          setBar(((12 - p.spellCooldown) / 12) * 100, '#7c5cbf');
        } else {
          setBtn('✨ ARCANE BLAST', true);
          setBar(100, 'var(--gold)');
        }
      }
    } else if (cls === 'ranger') {
      spRow.style.display = '';
      const aimMax = p.quickDraw ? 5 : 8;
      if (p.aimedShotCooldown > 0) {
        setBtn(`🏹 AIM ${p.aimedShotCooldown}t`, false);
        setBar(((aimMax - p.aimedShotCooldown) / aimMax) * 100, '#4a9');
      } else {
        setBtn('🏹 AIMED SHOT', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'cleric') {
      spRow.style.display = '';
      if (p.divineHealUsed) {
        setBtn('✝ HEAL ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('✝ DIVINE HEAL', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'bard') {
      spRow.style.display = '';
      if (p.songOfRestFloorUsed) {
        setBtn('🎵 SONG ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('🎵 SONG OF REST', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'artificer') {
      spRow.style.display = '';
      if (p.tinkerFloorUsed) {
        setBtn('🔧 FORGE ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        const canAfford = p.gold >= 15;
        setBtn(`🔧 FORGE (15💰)`, canAfford);
        setBar(canAfford ? 100 : 0, canAfford ? 'var(--gold)' : 'var(--text-dim)');
      }
    } else if (cls === 'ninja') {
      spRow.style.display = '';
      if (p.starThrowCooldown > 0) {
        setBtn(`🌟 STARS ${p.starThrowCooldown}t`, false);
        setBar(((6 - p.starThrowCooldown) / 6) * 100, '#ffdd44');
      } else {
        setBtn('🌟 STAR THROW', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'darkwizard') {
      spRow.style.display = '';
      if (p.acidBoltCooldown > 0) {
        setBtn(`🟢 BOLT ${p.acidBoltCooldown}t`, false);
        setBar(((7 - p.acidBoltCooldown) / 7) * 100, '#44cc44');
      } else {
        setBtn('🟢 ACID BOLT', true, '#44cc44');
        setBar(100, '#44cc44');
      }
    } else if (cls === 'mason') {
      spRow.style.display = '';
      if (p.fortifyCharges <= 0) {
        setBtn('🧱 FORTIFY ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn(`🧱 FORTIFY ×${p.fortifyCharges}`, true);
        setBar((p.fortifyCharges / (p.fortifyMaxCharges || 2)) * 100, 'var(--gold)');
      }
    } else if (cls === 'daredevil') {
      spRow.style.display = '';
      const flipMax = getMasteryBonuses(cls).fastFlip ? 3 : 4;
      if (p.flipCooldown > 0) {
        setBtn(`🤸 FLIP ${p.flipCooldown}t`, false);
        setBar(((flipMax - p.flipCooldown) / flipMax) * 100, '#ff8844');
      } else {
        setBtn('🤸 FLIP', true, '#ff8844');
        setBar(100, '#ff8844');
      }
    } else if (cls === 'escapeartist') {
      spRow.style.display = '';
      if (p.stairsTeleportFloorUsed && !getMasteryBonuses(cls).extraEscape) {
        setBtn('💨 ESCAPE ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('💨 ESCAPE ROUTE', true, '#80ffff');
        setBar(100, '#80ffff');
      }
    } else if (cls === 'conjurer') {
      spRow.style.display = '';
      const maxCD = getMasteryBonuses(cls).fastIllusion ? 6 : 8;
      if (p.illusionCooldown > 0) {
        setBtn(`🎭 ILLUSION ${p.illusionCooldown}t`, false);
        setBar(((maxCD - p.illusionCooldown) / maxCD) * 100, '#cc44ff');
      } else {
        setBtn('🎭 ILLUSION', true, '#cc44ff');
        setBar(100, '#cc44ff');
      }
    } else if (cls === 'barterer') {
      spRow.style.display = '';
      const canAfford = p.hp > 5;
      setBtn(`🪙 RATION (−5 HP)`, canAfford);
      setBar(canAfford ? 100 : 0, canAfford ? '#f0c040' : 'var(--text-dim)');
    } else {
      spRow.style.display = 'none';
    }
  }
}

function renderInventory() {
  const bar = $('inv-bar');
  bar.innerHTML = '';

  // Show equipped items first with gold border
  const equipped = [
    { label: '⚔️', slot: 'weapon', item: state.player.equipped.weapon },
    { label: '🏹', slot: 'ranged', item: state.player.equipped.ranged },
    { label: '🛡️', slot: 'armor', item: state.player.equipped.armor },
    { label: '💍', slot: 'ring', item: state.player.equipped.ring }
  ];

  // Helper: make a slot tappable on mobile (iOS needs touchend, not just click)
  function makeTappable(el, handler) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', handler);
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    }, { passive: false });
  }

  for (const eq of equipped) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (eq.item ? ' equipped' : ' empty');
    if (eq.item?.cursed && eq.item?.curseRevealed) slot.style.boxShadow = '0 0 6px rgba(200,40,40,0.7), inset 0 0 6px rgba(200,40,40,0.2)';
    else if (eq.slot === 'ranged' && eq.item) slot.style.borderColor = '#4a9';
    // Ranged weapon slot: show arrow count overlay
    if (eq.slot === 'ranged' && eq.item) {
      const arrowStr = state.player.infiniteArrows ? '∞' : state.player.arrows;
      slot.style.position = 'relative';
      slot.innerHTML = `${eq.item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#4a9;font-weight:bold;">${arrowStr}</span>`;
    } else {
      slot.textContent = eq.item ? eq.item.glyph : eq.label;
    }
    if (eq.item) {
      makeTappable(slot, (e) => showEquippedMenu(eq, e));
    }
    bar.appendChild(slot);
  }

  // Inventory items
  for (let i = 0; i < state.player.inventory.length; i++) {
    const item = state.player.inventory[i];
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    if (item.itemType === 'thrown' || item.itemType === 'special_arrow') {
      const countLabel = item.ammo != null ? item.ammo : '';
      const isLoaded = item.itemType === 'special_arrow' && state.player.loadedSpecialArrow === item;
      const countColor = isLoaded ? '#ff8020' : '#60ffb0';
      slot.innerHTML = `${item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:${countColor};font-weight:bold;">${countLabel}</span>`;
      if (isLoaded) slot.style.boxShadow = '0 0 6px rgba(255,128,32,0.5)';
    } else if (item.itemType === 'food' && item.stack && item.stack > 1) {
      slot.innerHTML = `${item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#f0c040;font-weight:bold;">×${item.stack}</span>`;
    } else {
      slot.textContent = item.glyph;
    }
    const idx = i;
    makeTappable(slot, (e) => showItemMenu(item, idx, e));
    bar.appendChild(slot);
  }

  // Empty slots
  for (let i = state.player.inventory.length; i < MAX_INVENTORY; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot empty';
    slot.textContent = '';
    bar.appendChild(slot);
  }
}

// === ITEM MENUS ===
function showItemMenu(item, index, event) {
  event.stopPropagation();
  const menu = $('item-menu');
  menu.innerHTML = '';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'item-name';
  nameDiv.textContent = `${item.glyph} ${item.name}`;
  if (item.desc && item.desc !== '???') {
    nameDiv.textContent += ` — ${item.desc}`;
  } else if (item.itemType === 'ranged') {
    nameDiv.textContent += ` (${item.damage} DMG, ${item.range} range)`;
  } else if (item.attack) {
    nameDiv.textContent += ` (+${item.attack} ATK)`;
  } else if (item.defense) {
    nameDiv.textContent += ` (+${item.defense} DEF)`;
  }
  menu.innerHTML = '';
  menu.appendChild(nameDiv);

  const actions = [];
  if (['weapon', 'ranged'].includes(item.itemType)) {
    actions.push({ label: 'Wield', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'armor') {
    actions.push({ label: 'Wear', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'ring') {
    actions.push({ label: 'Equip', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'food') {
    actions.push({ label: 'Eat', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'potion') {
    actions.push({ label: 'Drink', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'scroll') {
    actions.push({ label: 'Read', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'thrown') {
    actions.push({ label: `Throw (${item.ammo} left)`, fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'special_arrow') {
    if (state.player.equipped.ranged) {
      const isLoaded = state.player.loadedSpecialArrow === item;
      actions.push({ label: isLoaded ? '✓ Loaded' : `Load (${item.ammo} left)`, fn: () => {
        if (isLoaded) { state.player.loadedSpecialArrow = null; addMessage('Special arrow unloaded.', ''); }
        else { useItem(item, index); }
        closeItemMenu();
      }});
    }
  }
  actions.push({ label: 'Drop', fn: () => { dropItem(index); closeItemMenu(); }});
  actions.push({ label: 'Destroy', fn: () => {
    // Replace menu content with an inline confirmation — stop outside-close from firing during transition
    setTimeout(() => {
      menu.innerHTML = '';
      const warn = document.createElement('div');
      warn.className = 'item-name';
      warn.style.color = '#ff6040';
      warn.textContent = `Destroy ${item.glyph} ${item.name}?`;
      menu.appendChild(warn);
      const note = document.createElement('div');
      note.style.cssText = 'font-size:10px;color:var(--text-dim);margin-bottom:6px;';
      note.textContent = 'This cannot be undone.';
      menu.appendChild(note);
      const yesBtn = document.createElement('button');
      yesBtn.textContent = '🗑 Yes, Destroy';
      yesBtn.style.color = '#ff6040';
      const doDestroy = () => {
        state.player.inventory.splice(index, 1);
        addMessage(`You destroy the ${item.name}.`, 'damage');
        updateUI();
        closeItemMenu();
      };
      yesBtn.addEventListener('click', (e) => { e.stopPropagation(); doDestroy(); });
      yesBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); doDestroy(); }, { passive: false });
      menu.appendChild(yesBtn);
      const noBtn = document.createElement('button');
      noBtn.textContent = 'Cancel';
      noBtn.addEventListener('click', (e) => { e.stopPropagation(); closeItemMenu(); });
      noBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); closeItemMenu(); }, { passive: false });
      menu.appendChild(noBtn);
    }, 50);
  }});
  actions.push({ label: 'Cancel', fn: () => closeItemMenu() });

  for (const act of actions) {
    const btn = document.createElement('button');
    btn.textContent = act.label;
    btn.addEventListener('click', (e) => { e.stopPropagation(); act.fn(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); act.fn(); }, { passive: false });
    menu.appendChild(btn);
  }

  // Position near the tap — center on screen for reliability on mobile
  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  // Close on outside tap (works for both click and touch)
  setTimeout(() => {
    const closer = (e) => {
      if (!$('item-menu').contains(e.target)) closeItemMenu();
    };
    document.addEventListener('click', closer, { once: true });
    document.addEventListener('touchend', closer, { once: true });
  }, 200);
}

function showEquippedMenu(eq, event) {
  event.stopPropagation();
  const item = eq.item;
  const menu = $('item-menu');
  menu.innerHTML = '';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'item-name';
  let desc = `${item.glyph} ${item.name}`;
  if (item.itemType === 'ranged') desc += ` (${item.damage} DMG, ${item.range} range)`;
  else if (item.attack) desc += ` (+${item.attack} ATK)`;
  if (item.defense) desc += ` (+${item.defense} DEF)`;
  if (item.special) desc += ` [${item.special}]`;
  if (item.cursed && item.curseRevealed) desc += ' ⚠ CURSED';
  nameDiv.textContent = desc;
  if (item.cursed && item.curseRevealed) nameDiv.style.color = '#ff6040';
  menu.appendChild(nameDiv);

  const unequipFn = () => {
    if (item.cursed) {
      addMessage(`The ${item.name} is cursed! Read a Scroll of Remove Curse first.`, 'damage');
      closeItemMenu();
      return;
    }
    if (state.player.inventory.length >= MAX_INVENTORY) {
      addMessage('Inventory full!', 'damage');
      closeItemMenu();
      return;
    }
    state.player.inventory.push(item);
    if (eq.slot === 'weapon') state.player.equipped.weapon = null;
    else if (eq.slot === 'armor') state.player.equipped.armor = null;
    else if (eq.slot === 'ranged') state.player.equipped.ranged = null;
    else state.player.equipped.ring = null;
    addMessage(`You unequip the ${item.name}.`, '');
    // Recalculate FOV in case ring of sight was removed
    if (item.special === 'sight') computeFOV();
    updateUI();
    render();
    closeItemMenu();
  };

  const unequipBtn = document.createElement('button');
  unequipBtn.textContent = 'Unequip';
  unequipBtn.addEventListener('click', (e) => { e.stopPropagation(); unequipFn(); });
  unequipBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); unequipFn(); }, { passive: false });
  menu.appendChild(unequipBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); closeItemMenu(); });
  cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); closeItemMenu(); }, { passive: false });
  menu.appendChild(cancelBtn);

  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  setTimeout(() => {
    const closer = (e) => {
      if (!$('item-menu').contains(e.target)) closeItemMenu();
    };
    document.addEventListener('click', closer, { once: true });
    document.addEventListener('touchend', closer, { once: true });
  }, 200);
}

function closeItemMenu() {
  $('item-menu').classList.remove('active');
}

function closeMenuOnOutside(e) {
  if (!$('item-menu').contains(e.target)) {
    closeItemMenu();
  }
}

// === INPUT HANDLING ===
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
let longPressTimer = null;

function setupInput() {
  // Touch events on canvas
  const wrap = $('canvas-wrap');

  wrap.addEventListener('touchstart', (e) => {
    e.preventDefault();
    Audio.resume();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();

    // Long press timer
    longPressTimer = setTimeout(() => {
      handleLongPress(touch.clientX, touch.clientY);
    }, 500);
  }, { passive: false });

  wrap.addEventListener('touchmove', (e) => {
    e.preventDefault();
    // Cancel long press if moved too much
    if (longPressTimer) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }, { passive: false });

  wrap.addEventListener('touchend', (e) => {
    e.preventDefault();
    clearTimeout(longPressTimer);
    longPressTimer = null;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - touchStartTime;

    if (dist > 20 && elapsed < 400) {
      // Swipe
      if (Math.abs(dx) > Math.abs(dy)) {
        playerMove(dx > 0 ? 1 : -1, 0);
      } else {
        playerMove(0, dy > 0 ? 1 : -1);
      }
    } else if (dist < 15 && elapsed < 300) {
      // Tap — try to interact with adjacent tile
      handleTap(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  // Keyboard support (for testing on desktop)
  document.addEventListener('keydown', (e) => {
    Audio.resume();

    // ESC: close any open overlay, menu, or cancel throw mode
    if (e.key === 'Escape') {
      // Save/Load overlays
      if ($('save-overlay').classList.contains('active')) { closeSaveOverlay(); return; }
      if ($('load-overlay').classList.contains('active')) { closeLoadOverlay(); return; }
      if ($('cloud-overlay').classList.contains('active')) { closeCloudOverlay(); return; }
      // Item menu
      if ($('item-menu').classList.contains('active')) { closeItemMenu(); return; }
      // Settings
      if ($('settings-overlay').classList.contains('active')) { $('settings-overlay').classList.remove('active'); inputLocked = false; return; }
      // Help / Manual / Update Log
      if ($('help-overlay').classList.contains('active')) { closeHelp(); return; }
      if ($('manual-overlay').classList.contains('active')) { closeManual(); return; }
      if ($('updatelog-overlay').classList.contains('active')) { closeUpdateLog(); return; }
      // Minimap
      if ($('minimap-overlay').classList.contains('active')) { state.minimapOpen = false; $('minimap-overlay').classList.remove('active'); stopMinimapPulse(); inputLocked = false; return; }
      // Badge overlay
      if ($('badge-overlay').classList.contains('active')) { closeBadgeOverlay(); return; }
      // Merchant
      if ($('merchant-overlay').classList.contains('active')) { $('merchant-overlay').classList.remove('active'); inputLocked = false; endTurn(); return; }
      // Sage
      if ($('sage-overlay').classList.contains('active')) { $('sage-overlay').classList.remove('active'); inputLocked = false; endTurn(); return; }
      // Throw/aim mode
      if (state && state.throwMode) { state.throwMode = false; state.throwItem = null; addMessage('Cancelled.', ''); updateUI(); render(); return; }
      // Fortify mode
      if (state && state.fortifyMode) { state.fortifyMode = false; state.fortifyCandidates = null; addMessage('Fortify cancelled.', ''); updateUI(); render(); return; }
      return;
    }

    switch (e.key) {
      case 'ArrowUp': case 'w': playerMove(0, -1); break;
      case 'ArrowDown': playerMove(0, 1); break;
      case 's': playerDescend(); break;
      case 'ArrowLeft': case 'a': playerMove(-1, 0); break;
      case 'ArrowRight': case 'd': playerMove(1, 0); break;
      case ' ': playerWait(); break;
      case 'g': playerPickup(); break;
      case '>': playerDescend(); break;
      case 'm': toggleMinimap(); break;
      case 'u': showQuickUse(); break;
      case 'e': showQuickEquip(); break;
      case 't': showQuickThrow(); break;
      case 'f': fireRangedWeapon(); break;
      case 'c': closeDoor(); break;
      case 'b': if (state && !state.gameOver) showBadgeOverlay(); break;
      case 'h': case '?': showHelp(); break;
      case 'q': doSpecial(); break;
    }
  });

  // D-pad buttons
  // D-pad with hold-to-repeat: first action fires immediately, then repeats after
  // a short delay (350ms) at a steady interval (120ms) while held down.
  let dpadRepeatTimer = null;
  let dpadRepeatInterval = null;
  function dpadAction(dir) {
    Audio.resume();
    switch (dir) {
      case 'up': playerMove(0, -1); break;
      case 'down': playerMove(0, 1); break;
      case 'left': playerMove(-1, 0); break;
      case 'right': playerMove(1, 0); break;
      case 'wait': playerWait(); break;
    }
  }
  function stopDpadRepeat() {
    if (dpadRepeatTimer) { clearTimeout(dpadRepeatTimer); dpadRepeatTimer = null; }
    if (dpadRepeatInterval) { clearInterval(dpadRepeatInterval); dpadRepeatInterval = null; }
  }
  document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopDpadRepeat();
      const dir = btn.dataset.dir;
      dpadAction(dir);
      // Start repeat after hold delay
      dpadRepeatTimer = setTimeout(() => {
        dpadRepeatInterval = setInterval(() => dpadAction(dir), 120);
      }, 350);
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopDpadRepeat();
    }, { passive: false });

    btn.addEventListener('touchcancel', () => stopDpadRepeat());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Audio.resume();
      const dir = btn.dataset.dir;
      dpadAction(dir);
    });
  });

  // Action buttons
  $('btn-pickup').addEventListener('click', () => { Audio.resume(); playerPickup(); });
  $('btn-stairs').addEventListener('click', () => { Audio.resume(); playerDescend(); });
  $('btn-wait').addEventListener('click', () => { Audio.resume(); playerWait(); });
  $('btn-quickuse').addEventListener('click', () => { Audio.resume(); showQuickUse(); });
  $('btn-settings').addEventListener('click', showSettings);

  // Config pager: swipe navigation and dot indicators
  (function initConfigPager() {
    const pager = $('config-pager');
    const track = $('config-track');
    const dots = $('config-dots');
    const pages = track.querySelectorAll('.config-page');
    const totalPages = pages.length;
    let currentPage = 0;
    let startX = 0, startY = 0, deltaX = 0, swiping = false;

    function goToPage(idx) {
      currentPage = Math.max(0, Math.min(totalPages - 1, idx));
      track.style.transform = `translateX(-${currentPage * 100}%)`;
      dots.querySelectorAll('.config-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentPage);
      });
    }

    // Dot clicks
    dots.querySelectorAll('.config-dot').forEach(dot => {
      dot.addEventListener('click', () => goToPage(parseInt(dot.dataset.page)));
      dot.addEventListener('touchend', (e) => { e.preventDefault(); goToPage(parseInt(dot.dataset.page)); }, { passive: false });
    });

    // Swipe on pager
    pager.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      deltaX = 0;
      swiping = false;
      track.style.transition = 'none';
    }, { passive: true });

    pager.addEventListener('touchmove', (e) => {
      deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      // Only swipe if horizontal motion > vertical
      if (!swiping && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        swiping = true;
      }
      if (swiping) {
        e.preventDefault();
        const offset = -currentPage * 100 + (deltaX / pager.offsetWidth) * 100;
        track.style.transform = `translateX(${offset}%)`;
      }
    }, { passive: false });

    pager.addEventListener('touchend', () => {
      track.style.transition = 'transform 0.3s ease';
      if (swiping) {
        const threshold = pager.offsetWidth * 0.2;
        if (deltaX < -threshold) goToPage(currentPage + 1);
        else if (deltaX > threshold) goToPage(currentPage - 1);
        else goToPage(currentPage);
      }
      swiping = false;
    }, { passive: true });

    // Expose goToPage for resetting on overlay open
    window._configGoToPage = goToPage;
  })();

  // Fire ranged weapon button
  const fireBtn = $('btn-fire');
  const handleFire = () => { Audio.resume(); fireRangedWeapon(); };
  fireBtn.addEventListener('click', handleFire);
  fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleFire(); }, { passive: false });

  // Rogue close door button
  const closeDoorBtn = $('btn-closedoor');
  const handleCloseDoor = () => { Audio.resume(); closeDoor(); };
  closeDoorBtn.addEventListener('click', handleCloseDoor);
  closeDoorBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleCloseDoor(); }, { passive: false });

  // Special class ability button — requires double-tap or tap-and-hold (300ms)
  // to prevent accidental activation
  const spBtn = $('btn-special');
  let spLastTap = 0;
  let spHoldTimer = null;
  let spArmed = false;
  const doSpecial = () => {
    Audio.resume();
    if (!state) return;
    if (state.player.classId === 'berserker') activateEnrage();
    else if (state.player.classId === 'wizard') { if (state.player.fireWard) activateWizardMenu(); else castAoeSpell(); }
    else if (state.player.classId === 'ranger') activateAimedShot();
    else if (state.player.classId === 'cleric') activateDivineHeal();
    else if (state.player.classId === 'bard') activateSongOfRest();
    else if (state.player.classId === 'artificer') activateForge();
    else if (state.player.classId === 'ninja') activateStarThrow();
    else if (state.player.classId === 'darkwizard') activateAcidBolt();
    else if (state.player.classId === 'mason') activateFortify();
    else if (state.player.classId === 'daredevil') activateFlip();
    else if (state.player.classId === 'escapeartist') activateTeleportStairs();
    else if (state.player.classId === 'conjurer') activateIllusion();
    else if (state.player.classId === 'barterer') conjureRation();
    spArmed = false;
  };
  spBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // Hold-to-activate: hold 300ms
    spHoldTimer = setTimeout(() => {
      spHoldTimer = null;
      doSpecial();
    }, 300);
  }, { passive: false });
  spBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (spHoldTimer) {
      clearTimeout(spHoldTimer);
      spHoldTimer = null;
      // Double-tap check: two taps within 400ms
      const now = Date.now();
      if (now - spLastTap < 400) {
        doSpecial();
        spLastTap = 0;
      } else {
        spLastTap = now;
      }
    }
  }, { passive: false });
  spBtn.addEventListener('touchcancel', () => {
    if (spHoldTimer) { clearTimeout(spHoldTimer); spHoldTimer = null; }
  });
  // Keyboard / mouse click (desktop) — works immediately
  spBtn.addEventListener('click', (e) => {
    // Ignore if touch event handled it
    if (e.sourceCapabilities?.firesTouchEvents) return;
    Audio.resume();
    doSpecial();
  });

  // Prevent default touch behaviors on body
  document.body.addEventListener('touchmove', (e) => {
    if (e.target === document.body || e.target === $('app')) {
      e.preventDefault();
    }
  }, { passive: false });
}

function handleTap(clientX, clientY) {
  if (!state || state.gameOver || state.victory || inputLocked) return;

  // Convert tap to map coordinates
  const rect = canvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const vx = Math.floor(cx / tileSize);
  const vy = Math.floor(cy / tileSize);

  const p = state.player;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  const mx = camX + vx;
  const my = camY + vy;

  // Tap on self — pickup
  if (mx === p.x && my === p.y) {
    playerPickup();
    return;
  }

  // Tap on adjacent tile — move there
  const dx = mx - p.x, dy = my - p.y;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
    // Normalize to cardinal direction (prefer the dominant axis)
    if (Math.abs(dx) >= Math.abs(dy)) {
      playerMove(Math.sign(dx), 0);
    } else {
      playerMove(0, Math.sign(dy));
    }
  }
}

function handleLongPress(clientX, clientY) {
  if (!state) return;

  const rect = canvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  const vx = Math.floor(cx / tileSize);
  const vy = Math.floor(cy / tileSize);

  const p = state.player;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  const mx = camX + vx;
  const my = camY + vy;

  if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return;
  if (!state.visible[my * MAP_W + mx]) return;

  // Show inspect tooltip
  let name = '', desc = '';

  const enemy = enemyAt(mx, my);
  if (enemy) {
    name = enemy.glyph + ' ' + enemy.name;
    desc = `HP: ${enemy.hp}/${enemy.maxHp} | ATK: ${enemy.attack} | DEF: ${enemy.defense}`;
    if (enemy.ghostData) desc += `\n"${enemy.ghostData.message}"`;
  } else {
    const items = itemsAt(mx, my);
    if (items.length > 0) {
      const item = items[0];
      name = item.glyph + ' ' + item.name;
      if (item.item.desc) desc = item.item.desc;
      else if (item.item.attack) desc = `+${item.item.attack} Attack`;
      else if (item.item.defense) desc = `+${item.item.defense} Defense`;
    } else {
      const tile = getTile(mx, my);
      const tileNames = { [T.WALL]: 'Wall', [T.FLOOR]: 'Floor', [T.CORRIDOR]: 'Corridor', [T.STAIRS_DOWN]: 'Stairs Down', [T.STAIRS_UP]: 'Stairs Up', [T.DOOR_CLOSED]: 'Closed Door', [T.DOOR_OPEN]: 'Open Door', [T.DOOR_ONEWAY]: 'One-Way Door', [T.DOOR_SEALED]: 'Sealed Passage', [T.SPECIAL]: 'Mysterious Glyph', [T.TELEPORT_VIS]: 'Teleport Glyph' };
      name = tileNames[tile] || 'Unknown';
    }
  }

  if (name) {
    $('tip-name').textContent = name;
    $('tip-desc').textContent = desc;
    const tip = $('inspect-tip');
    tip.style.left = Math.min(clientX, window.innerWidth - 210) + 'px';
    tip.style.top = (clientY - 60) + 'px';
    tip.classList.add('active');

    haptic(20);

    setTimeout(() => tip.classList.remove('active'), 2000);
  }
}

// === UI SETUP ===
function setupUI() {
  // Title screen
  $('btn-start').addEventListener('click', startGame);
  $('btn-start').addEventListener('touchend', (e) => { e.preventDefault(); startGame(); }, { passive: false });

  // Badge buttons
  const badgeBtn = $('btn-badges');
  if (badgeBtn) {
    badgeBtn.addEventListener('click', showBadgeOverlay);
    badgeBtn.addEventListener('touchend', (e) => { e.preventDefault(); showBadgeOverlay(); }, { passive: false });
  }
  const closeBadgeBtn = $('btn-close-badges');
  if (closeBadgeBtn) {
    closeBadgeBtn.addEventListener('click', closeBadgeOverlay);
    closeBadgeBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeBadgeOverlay(); }, { passive: false });
  }

  // Death screen
  $('btn-death-stats').addEventListener('click', () => {
    const panel = $('death-full-stats');
    const btn = $('btn-death-stats');
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      btn.textContent = 'Hide Stats';
    } else {
      panel.style.display = 'none';
      btn.textContent = 'View Stats';
    }
  });
  $('btn-restart').addEventListener('click', () => {
    saveGhost();
    saveHighScore();
    $('death-overlay').classList.remove('active');
    $('death-full-stats').style.display = 'none';
    $('btn-death-stats').textContent = 'View Stats';
    showTitle();
  });

  // Victory screen
  $('btn-victory-restart').addEventListener('click', () => {
    saveHighScore();
    $('victory-overlay').classList.remove('active');
    showTitle();
  });

  // Minimap
  $('btn-minimap').addEventListener('click', () => { Audio.resume(); toggleMinimap(); });
  $('minimap-overlay').addEventListener('click', () => { state.minimapOpen = false; $('minimap-overlay').classList.remove('active'); stopMinimapPulse(); inputLocked = false; });

  // Merchant close
  const leaveShopFn = () => { $('merchant-overlay').classList.remove('active'); inputLocked = false; endTurn(); };
  $('btn-leave-shop').addEventListener('click', leaveShopFn);
  $('btn-leave-shop').addEventListener('touchend', (e) => { e.preventDefault(); leaveShopFn(); }, { passive: false });

  const leaveSageFn = () => { $('sage-overlay').classList.remove('active'); inputLocked = false; endTurn(); };
  $('btn-leave-sage').addEventListener('click', leaveSageFn);
  $('btn-leave-sage').addEventListener('touchend', (e) => { e.preventDefault(); leaveSageFn(); }, { passive: false });

  // Tap chevron to expand/collapse message log
  const msgToggle = $('msg-log-toggle');
  const toggleLog = () => {
    const log = $('msg-log');
    log.classList.toggle('expanded');
    msgToggle.textContent = log.classList.contains('expanded') ? '▴' : '▾';
    updateUI();
  };
  msgToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleLog(); });
  msgToggle.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); toggleLog(); }, { passive: false });

  // Settings
  const closeSettingsFn = () => {
    $('settings-overlay').classList.remove('active');
    inputLocked = false;
  };
  $('btn-close-settings').addEventListener('click', closeSettingsFn);
  $('btn-close-settings').addEventListener('touchend', (e) => { e.preventDefault(); closeSettingsFn(); }, { passive: false });

  // Help screen
  $('btn-help-from-title').addEventListener('click', showHelp);
  $('btn-help-from-title').addEventListener('touchend', (e) => { e.preventDefault(); showHelp(); }, { passive: false });
  const helpFromSettingsFn = () => { $('settings-overlay').classList.remove('active'); showHelp(); };
  $('btn-help-from-settings').addEventListener('click', helpFromSettingsFn);
  $('btn-help-from-settings').addEventListener('touchend', (e) => { e.preventDefault(); helpFromSettingsFn(); }, { passive: false });
  const badgesFromSettingsFn = () => { $('settings-overlay').classList.remove('active'); showBadgeOverlay(); };
  $('btn-badges-from-settings').addEventListener('click', badgesFromSettingsFn);
  $('btn-badges-from-settings').addEventListener('touchend', (e) => { e.preventDefault(); badgesFromSettingsFn(); }, { passive: false });
  $('btn-close-help').addEventListener('click', closeHelp);
  $('btn-close-help').addEventListener('touchend', (e) => { e.preventDefault(); closeHelp(); }, { passive: false });
  $('btn-close-help-bottom').addEventListener('click', closeHelp);
  $('btn-close-help-bottom').addEventListener('touchend', (e) => { e.preventDefault(); closeHelp(); }, { passive: false });

  // Manual overlay
  const manualFromSettings = $('btn-manual-from-settings');
  if (manualFromSettings) {
    const manFn = () => { $('settings-overlay').classList.remove('active'); showManual(); };
    manualFromSettings.addEventListener('click', manFn);
    manualFromSettings.addEventListener('touchend', (e) => { e.preventDefault(); manFn(); }, { passive: false });
  }
  const manualFromTitle = $('btn-manual-from-title');
  if (manualFromTitle) {
    const manFn = () => { showManual(); };
    manualFromTitle.addEventListener('click', manFn);
    manualFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); manFn(); }, { passive: false });
  }
  const closeManualBtn = $('btn-close-manual');
  if (closeManualBtn) {
    const closeFn = () => closeManual();
    closeManualBtn.addEventListener('click', closeFn);
    closeManualBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeFn(); }, { passive: false });
  }
  const closeManualTopBtn = $('btn-close-manual-top');
  if (closeManualTopBtn) {
    const closeFn2 = () => closeManual();
    closeManualTopBtn.addEventListener('click', closeFn2);
    closeManualTopBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeFn2(); }, { passive: false });
  }

  // Update Log buttons
  const updatelogFromTitle = $('btn-updatelog-from-title');
  if (updatelogFromTitle) {
    const ulFn = () => showUpdateLog();
    updatelogFromTitle.addEventListener('click', ulFn);
    updatelogFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); ulFn(); }, { passive: false });
  }
  const closeUpdateLogBtn = $('btn-close-updatelog');
  if (closeUpdateLogBtn) {
    const closeFn = () => closeUpdateLog();
    closeUpdateLogBtn.addEventListener('click', closeFn);
    closeUpdateLogBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeFn(); }, { passive: false });
  }
  const closeUpdateLogTopBtn = $('btn-close-updatelog-top');
  if (closeUpdateLogTopBtn) {
    const closeFn = () => closeUpdateLog();
    closeUpdateLogTopBtn.addEventListener('click', closeFn);
    closeUpdateLogTopBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeFn(); }, { passive: false });
  }

  // Save/Load buttons in settings
  const saveGameBtn = $('btn-save-game');
  if (saveGameBtn) {
    const saveFn = () => { $('settings-overlay').classList.remove('active'); showSaveOverlay(); };
    saveGameBtn.addEventListener('click', saveFn);
    saveGameBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveFn(); }, { passive: false });
  }
  const loadGameBtn = $('btn-load-game');
  if (loadGameBtn) {
    const loadFn = () => { $('settings-overlay').classList.remove('active'); showLoadOverlay(false); };
    loadGameBtn.addEventListener('click', loadFn);
    loadGameBtn.addEventListener('touchend', (e) => { e.preventDefault(); loadFn(); }, { passive: false });
  }
  const closeSaveBtn = $('btn-close-save');
  if (closeSaveBtn) {
    closeSaveBtn.addEventListener('click', closeSaveOverlay);
    closeSaveBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeSaveOverlay(); }, { passive: false });
  }
  const closeLoadBtn = $('btn-close-load');
  if (closeLoadBtn) {
    closeLoadBtn.addEventListener('click', closeLoadOverlay);
    closeLoadBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeLoadOverlay(); }, { passive: false });
  }
  const closeCloudBtn = $('btn-close-cloud');
  if (closeCloudBtn) {
    closeCloudBtn.addEventListener('click', closeCloudOverlay);
    closeCloudBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeCloudOverlay(); }, { passive: false });
  }

  // Load from title screen
  const loadFromTitle = $('btn-load-from-title');
  if (loadFromTitle) {
    const loadTitleFn = () => { Audio.resume(); showLoadOverlay(true); };
    loadFromTitle.addEventListener('click', loadTitleFn);
    loadFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); loadTitleFn(); }, { passive: false });
  }

  // Give Up button
  const giveUpBtn = $('btn-give-up');
  if (giveUpBtn) {
    const giveUpFn = () => {
      // Replace button with confirmation
      const section = $('give-up-section');
      section.innerHTML = '';
      const warn = document.createElement('div');
      warn.style.cssText = 'color:#e05050;font-size:13px;font-weight:700;margin-bottom:8px;';
      warn.textContent = 'Are you sure? This run will end.';
      section.appendChild(warn);
      const yesBtn = document.createElement('button');
      yesBtn.className = 'big-btn';
      yesBtn.style.cssText = 'padding:10px 24px;background:#401515;border:1px solid #a03030;color:#ff4040;font-size:14px;margin-right:8px;';
      yesBtn.textContent = '☠️ Yes, Give Up';
      const confirmFn = () => {
        $('settings-overlay').classList.remove('active');
        inputLocked = false;
        state.gameOver = true;
        state.player.hp = 0;
        showDeath('Gave up the run');
      };
      yesBtn.addEventListener('click', confirmFn);
      yesBtn.addEventListener('touchend', (e) => { e.preventDefault(); confirmFn(); }, { passive: false });
      section.appendChild(yesBtn);
      const noBtn = document.createElement('button');
      noBtn.className = 'big-btn';
      noBtn.style.cssText = 'padding:10px 24px;background:var(--panel-bg);border:1px solid var(--panel-border);font-size:14px;';
      noBtn.textContent = 'Cancel';
      const cancelFn = () => {
        section.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'big-btn';
        btn.id = 'btn-give-up';
        btn.style.cssText = 'padding:10px 24px;background:#2a1515;border:1px solid #803030;color:#e05050;font-size:14px;';
        btn.textContent = '☠️ Give Up Run';
        btn.addEventListener('click', giveUpFn);
        btn.addEventListener('touchend', (e) => { e.preventDefault(); giveUpFn(); }, { passive: false });
        section.appendChild(btn);
      };
      noBtn.addEventListener('click', cancelFn);
      noBtn.addEventListener('touchend', (e) => { e.preventDefault(); cancelFn(); }, { passive: false });
      section.appendChild(noBtn);
    };
    giveUpBtn.addEventListener('click', giveUpFn);
    giveUpBtn.addEventListener('touchend', (e) => { e.preventDefault(); giveUpFn(); }, { passive: false });
  }

  // Cloud save/load from title screen
  const cloudFromTitle = $('btn-cloud-from-title');
  if (cloudFromTitle) {
    const cloudTitleFn = () => { Audio.resume(); showCloudOverlay(true); };
    cloudFromTitle.addEventListener('click', cloudTitleFn);
    cloudFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); cloudTitleFn(); }, { passive: false });
  }
}

function showSettings() {
  inputLocked = true;
  // Reset config pager to first page
  if (window._configGoToPage) window._configGoToPage(0);

  // Populate stats if game is in progress
  const p = state ? state.player : null;
  const noGame = '—';

  function statRow(label, val) {
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-val">${val}</span></div>`;
  }

  $('char-name').textContent = state
    ? `${state.playerName} ${state.playerEpithet} ${CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Adventurer'}`
    : '—';
  $('game-version').textContent = `${GAME_VERSION} · Last updated ${LAST_UPDATED}`;

  $('char-stats').innerHTML = [
    statRow('Level', p ? p.level : noGame),
    statRow('XP', p ? `${p.xp}/${p.xpToNext}` : noGame),
    statRow('HP', p ? `${p.hp}/${p.maxHp}` : noGame),
    statRow('Hunger', p ? p.hunger : noGame),
    statRow('Attack', p ? `${p.attack + (p.equipped.weapon?.attack || 0)}` : noGame),
    statRow('Defense', p ? `${p.defense + (p.equipped.armor?.defense || 0) + (p.equipped.ring?.special === 'protection' ? 3 : 0)}` : noGame),
  ].join('');

  // Class abilities & bonuses panel
  const classSection = $('class-abilities');
  if (classSection) {
    if (p) {
      classSection.style.display = '';
      const cls = CLASS_DEFS.find(c => c.id === p.classId);
      const abilities = [];
      switch (p.classId) {
        case 'adventurer':
          abilities.push({ icon: '♻️', name: 'Regeneration', desc: `Heals 1 HP every 15 turns` });
          abilities.push({ icon: '🎲', name: 'Balanced Stats', desc: '10% crit chance' });
          break;
        case 'berserker':
          abilities.push({ icon: '💢', name: 'Rage', desc: '+3 ATK when below 40% HP' });
          abilities.push({ icon: '⚡', name: 'Enrage', desc: `+5 ATK for 5 turns (1/floor)${p.enrageFloorUsed ? ' — USED' : ' — Ready'}` });
          abilities.push({ icon: '🍖', name: 'Ravenous', desc: '2× hunger drain rate' });
          break;
        case 'rogue':
          abilities.push({ icon: '👁', name: 'Evasion', desc: `${Math.round((p.dodgeBonus || 0) * 100)}% dodge chance` });
          abilities.push({ icon: '🗡️', name: 'Critical Strikes', desc: `${Math.round((p.critChance || 0) * 100)}% crit chance` });
          abilities.push({ icon: '💨', name: 'Stealth', desc: 'Lower enemy detection range' });
          break;
        case 'wizard':
          abilities.push({ icon: '✨', name: 'Arcane Affinity', desc: 'Scroll effects are doubled' });
          abilities.push({ icon: '💥', name: 'Arcane Blast', desc: `AoE spell (${p.spellCooldown > 0 ? p.spellCooldown + 't CD' : 'Ready'})` });
          break;
        case 'ranger':
          abilities.push({ icon: '👁', name: 'Eagle Eye', desc: `+${p.fovBonus || 2} FOV radius` });
          abilities.push({ icon: '🌿', name: 'Forager', desc: '50% chance for bonus food/arrows per floor' });
          abilities.push({ icon: '🎯', name: 'Aimed Shot', desc: `2× bow damage (${p.aimedShotCooldown > 0 ? p.aimedShotCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '♾️', name: 'Infinite Arrows', desc: 'Basic arrows never run out' });
          break;
        case 'cleric':
          abilities.push({ icon: '✝️', name: 'Holy Aura', desc: '+3 ATK vs undead, drain immune' });
          abilities.push({ icon: '🛡️', name: 'Curse Immune', desc: 'Cannot be cursed' });
          abilities.push({ icon: '💛', name: 'Divine Heal', desc: `40% HP heal + cure (1/floor)${p.divineHealUsed ? ' — USED' : ' — Ready'}` });
          break;
        case 'bard':
          abilities.push({ icon: '🎶', name: 'Charm', desc: `${Math.round(p.charmChance * 100)}% chance to pacify on hit` });
          abilities.push({ icon: '🎵', name: 'Song of Rest', desc: `Heal self + allies 3 HP (1/floor)${p.songOfRestFloorUsed ? ' — USED' : ' — Ready'}` });
          abilities.push({ icon: '🎤', name: '5% Dodge', desc: 'Natural agility' });
          break;
        case 'artificer':
          abilities.push({ icon: '🔧', name: 'Forge', desc: `Upgrade weapon/armor +${p.masterSmith ? 2 : 1} (15g, 1/floor)${p.tinkerFloorUsed ? ' — USED' : ' — Ready'}` });
          abilities.push({ icon: '⚒️', name: 'Forged Loot', desc: 'Exclusive +1 gear at merchants' });
          break;
        case 'ninja':
          abilities.push({ icon: '🗡️', name: 'Backstab', desc: 'Hit enemy behind target when attacking' });
          abilities.push({ icon: '🌟', name: 'Star Throw', desc: `Throw 4 stars in all directions (${p.starThrowCooldown > 0 ? p.starThrowCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '👁', name: 'Danger Sense', desc: 'Detect enemy type when alerted' });
          abilities.push({ icon: '💨', name: '15% Dodge', desc: 'Natural agility' });
          break;
        case 'darkwizard':
          abilities.push({ icon: '💀', name: 'Necromancy', desc: `${Math.min(30, 8 + 2 * (p.level || 1))}% chance slain foes rise as allies` });
          abilities.push({ icon: '🟢', name: 'Acid Bolt', desc: `Ranged poison attack (${p.acidBoltCooldown > 0 ? p.acidBoltCooldown + 't CD' : 'Ready'})` });
          break;
        case 'mason':
          abilities.push({ icon: '🧱', name: 'Fortify', desc: `Build/demolish walls (${p.fortifyCharges}/${p.fortifyMaxCharges || 2} charges)` });
          abilities.push({ icon: '🚪', name: 'Close Doors', desc: 'Can close open doors' });
          break;
        case 'daredevil':
          abilities.push({ icon: '🤸', name: 'Flip', desc: `Leap over enemy (${p.flipCooldown > 0 ? p.flipCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '⚡', name: 'Ricochet', desc: '50%/25% chain hit to adjacent enemies' });
          abilities.push({ icon: '💨', name: '10% Dodge', desc: 'Natural agility' });
          break;
        case 'escapeartist':
          abilities.push({ icon: '❄️', name: 'Ice Traps', desc: 'Drop ice traps when retreating from enemies' });
          abilities.push({ icon: '💨', name: 'Escape Route', desc: `Teleport to stairs (1/floor)${p.stairsTeleportFloorUsed ? ' — USED' : ' — Ready'}` });
          abilities.push({ icon: '👁', name: '15% Dodge', desc: 'Natural agility' });
          break;
        case 'conjurer':
          abilities.push({ icon: '👤', name: 'Illusory Double', desc: `Place a decoy (${p.illusionCooldown > 0 ? p.illusionCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🍖', name: 'Conjure Ration', desc: 'Create food for −5 HP' });
          abilities.push({ icon: '💨', name: '5% Dodge', desc: 'Natural agility' });
          break;
        case 'barterer':
          abilities.push({ icon: '💸', name: '25% Discount', desc: 'All merchant prices reduced' });
          abilities.push({ icon: '💰', name: 'Gold Sense', desc: '+50% gold from pickups' });
          abilities.push({ icon: '🗺️', name: 'Merchant Compass', desc: 'Merchants always visible on minimap' });
          abilities.push({ icon: '🔍', name: 'Appraise', desc: `Identify potion/scroll (${p.appraiseCooldown > 0 ? p.appraiseCooldown + 't CD' : 'Ready'})` });
          break;
      }
      // Add unlocked class-specific perks
      const classPerkFlags = [
        { flag: 'survivorInstinct', icon: '🍖', name: "Survivor's Instinct", desc: 'Auto-eat food when starving' },
        { flag: 'undyingFury', icon: '💢', name: 'Undying Fury', desc: `Survive lethal hit 1/floor${p.undyingFuryUsed ? ' — USED' : ' — Ready'}` },
        { flag: 'shadowStep', icon: '💨', name: 'Shadow Step', desc: 'Invisible for 2 turns after a kill' },
        { flag: 'manaShield', icon: '✨', name: 'Mana Shield', desc: '25% chance to negate damage' },
        { flag: 'quickDraw', icon: '🎯', name: 'Quick Draw', desc: 'Aimed Shot cooldown 5 instead of 8' },
        { flag: 'sanctifiedGround', icon: '✝️', name: 'Sanctified Ground', desc: 'Heal 1 HP when waiting' },
        { flag: 'encore', icon: '🎶', name: 'Encore', desc: '30% chance charmed foes fight for you' },
        { flag: 'masterSmith', icon: '⚒️', name: 'Master Smith', desc: 'Forge gives +2 instead of +1' },
        { flag: 'rampart', icon: '🧱', name: 'Rampart', desc: '+1 fortify charge per floor' },
        { flag: 'mirrorImage', icon: '🎭', name: 'Mirror Image', desc: 'Place 2 illusions at once' },
        { flag: 'fireWard', icon: '🔥', name: 'Fire Ward', desc: 'Cast fire spheres around you' },
        { flag: 'doubleShot', icon: '🏹', name: 'Double Shot', desc: 'Fire 2 arrows in one turn' },
        { flag: 'silentKill', icon: '💨', name: 'Silent Kill', desc: 'Kills grant/refresh stealth (2 turns)' },
        { flag: 'necroticSurge', icon: '🟢', name: 'Necrotic Surge', desc: 'Acid bolt splashes poison nearby' },
        { flag: 'recklessCharge', icon: '🤸', name: 'Reckless Charge', desc: 'Flip strikes healthy enemies (>75% HP)' },
        { flag: 'smokeScreen', icon: '💨', name: 'Smoke Screen', desc: 'Teleport leaves smoke at origin' },
        { flag: 'sharpDealer', icon: '🎁', name: 'Sharp Dealer', desc: 'Every 3rd purchase grants a free item' },
      ];
      for (const cp of classPerkFlags) {
        if (p[cp.flag]) abilities.push({ icon: cp.icon, name: `★ ${cp.name}`, desc: cp.desc });
      }
      // Shrine-granted abilities
      if (p.drainImmune && p.classId !== 'cleric') {
        abilities.push({ icon: '🛡️', name: 'Sanctified Soul', desc: 'Immune to life-drain (shrine)' });
      }

      // Prepend difficulty badge
      if (state) {
        const diffLabel = state.difficulty === 'easy' ? '⚡ Easy' : state.difficulty === 'hard' ? '💀 Hard' : '⚔️ Normal';
        const diffDesc = state.difficulty === 'easy' ? 'Less hunger · −1 enemy damage' : state.difficulty === 'hard' ? 'More hunger · +20% enemy HP' : 'Standard challenge';
        abilities.unshift({ icon: diffLabel, name: 'Difficulty', desc: diffDesc });
      }

      const classAbilList = $('class-ability-list');
      classAbilList.innerHTML = abilities.map(a =>
        `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;">`
        + `<span style="font-size:15px;flex-shrink:0;">${a.icon}</span>`
        + `<span style="font-size:12px;"><strong style="color:var(--gold);">${a.name}</strong> — <span style="color:var(--text-dim);">${a.desc}</span></span>`
        + `</div>`
      ).join('');
    } else {
      classSection.style.display = 'none';
    }
  }

  // Active Perk Synergies panel
  const synSection = $('synergy-section');
  if (synSection) {
    if (p) {
      const activeSyn = getActiveSynergies();
      if (activeSyn.length > 0) {
        synSection.style.display = '';
        $('synergy-list').innerHTML = activeSyn.map(s =>
          `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;">`
          + `<span style="font-size:15px;flex-shrink:0;">${s.icon}</span>`
          + `<span style="font-size:12px;"><strong style="color:#c0a0ff;">${s.name}</strong> — <span style="color:var(--text-dim);">${s.desc}</span></span>`
          + `</div>`
        ).join('');
      } else {
        synSection.style.display = 'none';
      }
    } else {
      synSection.style.display = 'none';
    }
  }

  // Mastery bonuses panel
  const masterySection = $('mastery-section');
  if (masterySection) {
    const allMasteries = MASTERY_DEFS.filter(m => masteryState[m.id]);
    if (allMasteries.length > 0) {
      masterySection.style.display = '';
      $('mastery-list').innerHTML = allMasteries.map(m =>
        `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;">`
        + `<span style="font-size:15px;flex-shrink:0;">⭐</span>`
        + `<span style="font-size:12px;"><strong style="color:var(--gold);">${m.name}</strong> — <span style="color:var(--text-dim);">${m.desc}</span></span>`
        + `</div>`
      ).join('');
    } else {
      masterySection.style.display = '';
      $('mastery-list').innerHTML = '<span style="color:var(--text-dim);font-size:12px;">No masteries unlocked yet. Win runs to earn permanent bonuses.</span>';
    }
  }

  $('run-stats').innerHTML = [
    statRow('Floor', state ? state.floor : noGame),
    statRow('Gold', p ? p.gold : noGame),
    statRow('Score', state ? state.score : noGame),
    statRow('Enemies', state ? state.enemiesKilled : noGame),
    statRow('Items', state ? state.itemsFound : noGame),
    statRow('Turns', p ? p.turnsSurvived : noGame),
  ].join('');

  const w = p?.equipped.weapon;
  const a = p?.equipped.armor;
  const r = p?.equipped.ring;
  const rng = p?.equipped.ranged;
  $('equip-stats').innerHTML = [
    statRow('⚔️ Weapon', w ? `${w.name} (+${w.attack})` : 'None'),
    statRow('🏹 Ranged', rng ? `${rng.name} (${rng.damage} dmg, ${rng.range} rng)` : 'None'),
    statRow('🛡️ Armor', a ? `${a.name} (+${a.defense})` : 'None'),
    statRow('💍 Ring', r ? r.name : 'None'),
  ].join('');

  // Glyph Runes panel
  const runeSection = $('rune-section');
  if (runeSection) {
    const runes = p ? (p.runes || []) : [];
    if (p) {
      runeSection.style.display = '';
      const runeList = $('rune-list');
      if (runes.length > 0) {
        runeList.innerHTML = runes.map(r =>
          `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">`
          + `<span style="font-size:16px;">${r.symbol}</span>`
          + `<span style="font-size:12px;"><strong style="color:var(--gold);">${r.name}</strong> — <span style="color:var(--text-dim);">${r.desc}</span></span>`
          + `</div>`
        ).join('');
      } else {
        runeList.innerHTML = '<span style="color:var(--text-dim);font-size:12px;">No runes collected yet. Look for glowing ✦ symbols on each floor.</span>';
      }
    } else {
      runeSection.style.display = 'none';
    }
  }

  // Status effects panel
  const efxSection = $('status-effects-section');
  const efxList = $('status-effects-list');
  const efxLabels = {
    burning:      { icon: '🔥', text: 'Burning',     color: '#ff6020' },
    poison:       { icon: '☠️', text: 'Poisoned',    color: '#50c040' },
    webbed:       { icon: '🕸', text: 'Webbed',      color: '#c0b060' },
    invisibility: { icon: '👁', text: 'Invisible',   color: '#6080ff' },
    strength:     { icon: '💪', text: 'Strengthened',color: '#ff8040' },
    frozen:       { icon: '❄️', text: 'Frozen',      color: '#40c0ff' },
  };
  const effects = p ? (p.statusEffects || []) : [];
  if (effects.length > 0) {
    efxSection.style.display = '';
    efxList.innerHTML = effects.map(eff => {
      const cfg = efxLabels[eff.type] || { icon: '⚡', text: eff.type, color: '#aaa' };
      return `<span style="background:rgba(0,0,0,0.4);border:1px solid ${cfg.color};border-radius:6px;padding:3px 8px;font-size:12px;color:${cfg.color};">${cfg.icon} ${cfg.text} (${eff.turns}t)</span>`;
    }).join('');
  } else {
    efxSection.style.display = p ? '' : 'none';
    efxList.innerHTML = p ? '<span style="color:var(--text-dim);font-size:12px;">None</span>' : '';
    if (p) efxSection.style.display = '';
  }

  // Give Up button — only show during active game
  const giveUpSection = $('give-up-section');
  if (giveUpSection) {
    giveUpSection.style.display = (p && !state.gameOver && !state.victory) ? '' : 'none';
  }

  // Hero icon picker
  const picker = $('hero-picker');
  picker.innerHTML = '';
  for (const icon of HERO_ICONS) {
    const btn = document.createElement('div');
    btn.className = 'hero-choice' + (settings.heroIcon === icon ? ' selected' : '');
    btn.textContent = icon;
    btn.setAttribute('role', 'button');
    const selectIcon = () => {
      settings.heroIcon = icon;
      if (state && state.player) state.player.glyph = icon;
      saveSettings();
      // Update selection visuals
      picker.querySelectorAll('.hero-choice').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');
      if (state) render();
    };
    btn.addEventListener('click', selectIcon);
    btn.addEventListener('touchend', (e) => { e.preventDefault(); selectIcon(); }, { passive: false });
    picker.appendChild(btn);
  }

  // Update toggles
  $('toggle-sound').classList.toggle('on', settings.sound);
  $('toggle-haptics').classList.toggle('on', settings.haptics);
  $('toggle-dpad').classList.toggle('on', settings.dpad);
  $('toggle-autopickup').classList.toggle('on', settings.autopickup);
  $('toggle-autoequip').classList.toggle('on', settings.autoEquip);

  $('toggle-sound').onclick = () => {
    settings.sound = !settings.sound;
    Audio.setEnabled(settings.sound);
    $('toggle-sound').classList.toggle('on', settings.sound);
    saveSettings();
  };

  $('toggle-haptics').onclick = () => {
    settings.haptics = !settings.haptics;
    $('toggle-haptics').classList.toggle('on', settings.haptics);
    saveSettings();
  };

  $('toggle-dpad').onclick = () => {
    settings.dpad = !settings.dpad;
    $('toggle-dpad').classList.toggle('on', settings.dpad);
    $('dpad').style.display = settings.dpad ? 'grid' : 'none';
    saveSettings();
  };

  $('toggle-autopickup').onclick = () => {
    settings.autopickup = !settings.autopickup;
    $('toggle-autopickup').classList.toggle('on', settings.autopickup);
    saveSettings();
  };

  $('toggle-autoequip').onclick = () => {
    settings.autoEquip = !settings.autoEquip;
    $('toggle-autoequip').classList.toggle('on', settings.autoEquip);
    saveSettings();
  };

  $('settings-overlay').classList.add('active');
}

// === HELP SCREEN ===
const HELP_FONT_SIZES = [12, 14, 16]; // small, medium, large
const HELP_FONT_LABELS = ['A-', 'A', 'A+'];

function applyHelpFontSize(overlay) {
  const size = HELP_FONT_SIZES[settings.helpFontSize] || 14;
  const content = overlay.querySelector('.overlay-scroll, .manual-scroll, .help-content, .manual-content');
  if (content) content.style.fontSize = size + 'px';
  // Also try all p, li, td elements in the overlay
  overlay.querySelectorAll('p, li, td, th, dd, dt').forEach(el => {
    el.style.fontSize = size + 'px';
  });
}

function renderFontSizeBar(overlay) {
  // Remove existing bar if present
  let bar = overlay.querySelector('.font-size-bar');
  if (bar) bar.remove();
  bar = document.createElement('div');
  bar.className = 'font-size-bar';
  bar.style.cssText = 'display:flex;justify-content:center;gap:8px;padding:6px 0 2px;';
  for (let i = 0; i < 3; i++) {
    const btn = document.createElement('button');
    btn.textContent = HELP_FONT_LABELS[i];
    btn.style.cssText = `min-width:36px;height:30px;border-radius:6px;border:1px solid var(--panel-border);background:${i === settings.helpFontSize ? 'var(--gold)' : 'var(--panel-bg)'};color:${i === settings.helpFontSize ? '#000' : 'var(--text)'};font-weight:bold;font-size:14px;cursor:pointer;`;
    btn.addEventListener('click', () => {
      settings.helpFontSize = i;
      saveSettings();
      applyHelpFontSize(overlay);
      renderFontSizeBar(overlay);
    });
    bar.appendChild(btn);
  }
  // Insert at top of overlay content
  const firstChild = overlay.querySelector('.overlay-header, h2, h3');
  if (firstChild && firstChild.nextSibling) {
    firstChild.parentNode.insertBefore(bar, firstChild.nextSibling);
  } else {
    overlay.insertBefore(bar, overlay.firstChild);
  }
}

function showHelp() {
  inputLocked = true;
  const overlay = $('help-overlay');
  overlay.classList.add('active');
  renderFontSizeBar(overlay);
  applyHelpFontSize(overlay);
}

function closeHelp() {
  $('help-overlay').classList.remove('active');
  inputLocked = false;
}

function showManual() {
  inputLocked = true;
  const overlay = $('manual-overlay');
  overlay.classList.add('active');
  renderFontSizeBar(overlay);
  applyHelpFontSize(overlay);
  // Wire search if not already wired
  const searchInput = $('manual-search');
  if (searchInput && !searchInput._wired) {
    searchInput._wired = true;
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      const sections = overlay.querySelectorAll('.help-section');
      for (const sec of sections) {
        if (!query) {
          sec.classList.remove('manual-no-match');
        } else {
          const text = sec.textContent.toLowerCase();
          sec.classList.toggle('manual-no-match', !text.includes(query));
        }
      }
    });
  }
  // Clear search on open
  if (searchInput) { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); }
}

function closeManual() {
  $('manual-overlay').classList.remove('active');
  inputLocked = false;
}

// === UPDATE LOG ===
const UPDATE_LOG = [
  {
    date: '2026-03-23',
    version: 'v0.9.5',
    changes: [
      'Inventory full now shows a pop-up alert when buying or picking up items',
      'Secret walls now require 2 hits — first hit cracks the wall (amber ▒), second breaks through',
      'Fireball and Confusion scrolls now show animated AOE blast effects',
      'Lich mini-boss now has a unique 🧿 icon (was same as Skeleton)',
      'Level-up screen shows your current ATK, DEF, and HP to help you choose perks',
      'Item pickup messages now show full stats (e.g. "+6 ATK", "+3 DEF")',
    ]
  },
  {
    date: '2026-03-23',
    version: 'v0.9.4',
    changes: [
      'New feature: invisible teleport floor tiles (floor 3+) — warp you on contact, then stay visible',
      'New feature: avalanche events (floor 4+) — rocks collapse in nearby rooms',
      'Cloud saves via Google account (opt-in, requires Firebase config)',
      'Save slots increased from 3 to 5',
      'Shrine now displays your current HP and gold',
      'Minimap now pauses the game — no accidental moves while viewing',
      'Tavern rumors now cost 1 gold (was 3) and limited to one per visit',
      'Merchant purchases now trigger auto-equip when the setting is enabled',
      'Danger border made thicker and more visible when HP or food is low',
    ]
  },
  {
    date: '2026-03-23',
    version: 'v0.9.3',
    changes: [
      'Added keyboard shortcut Q for special class abilities',
      'Special ability button now visible for all 15 classes with cooldown bars',
      'Fixed syntax error preventing Conjurer and Barterer abilities from working',
    ]
  },
  {
    date: '2026-03-23',
    version: 'v0.9.2',
    changes: [
      'Added 7 new character classes: Ninja, Dark Wizard, Brick Mason, Daredevil, Escape Artist, Conjurer, Barterer',
      'Each new class has unique abilities, stats, and play styles',
      'Daredevil can flip over enemies and ricochet melee hits to adjacent foes',
      'Ninja has stealth kills and thrown star attacks',
      'Escape Artist can teleport to stairs and leaves ice traps',
      'Fixed class selection screen: improved scroll-aware tap detection',
    ]
  },
  {
    date: '2026-03-23',
    version: 'v0.9.1',
    changes: [
      'Arrows now brighter and easier to see in-game',
      'Fixed Load button not working on certain devices',
      'Implemented 9 gameplay fixes including improved combat feedback',
      'Fixed tavern crash on older browsers',
      'Renamed "How to Play" to "Quickstart" and added searchable Manual',
    ]
  },
  {
    date: '2026-03-23',
    version: 'v0.9.0',
    changes: [
      'Added Taverns on floors 5, 10, 14 — buy food, hear rumors, gamble',
      'Added secret walls with hidden loot throughout the dungeon',
      'Added bonus wings on floors 6, 12, 18 — find Bone Keys to unlock',
      'Added Bard and Artificer classes',
      'Added targeting overlay for ranged attacks and thrown items',
      'Added font size toggle (A-/A/A+) for accessibility',
    ]
  },
  {
    date: '2026-03-22',
    version: 'v0.8.0',
    changes: [
      'Floor-scaled loot: deeper floors now drop better equipment (+1 from F9, +2 from F16)',
      'Paged Config screen with Stats, Settings, and Save/Load tabs',
      'Rogue-closed doors now appear teal on the minimap',
      'Poison now scales with floor depth (1-3 HP/turn)',
      'Food stacks up to 5 per inventory slot',
      'Auto-equip now prefers specialty weapons over plain at same stats',
      'Allies now follow the player between rooms',
      'Added life-drain protection: Cleric immunity, Warding rune resist, shrine option',
      'Expanded How to Play and Manual with full class guides, synergies, and mastery info',
    ]
  },
];

function showUpdateLog() {
  inputLocked = true;
  const overlay = $('updatelog-overlay');
  const content = $('updatelog-content');
  content.innerHTML = '';
  for (const entry of UPDATE_LOG) {
    const section = document.createElement('div');
    section.className = 'help-section';
    let html = `<div class="help-heading">${entry.version} — ${entry.date}</div>`;
    html += '<ul style="margin:4px 0 0 16px;padding:0;list-style:disc;">';
    for (const change of entry.changes) {
      html += `<li class="help-note" style="margin-bottom:3px;">${change}</li>`;
    }
    html += '</ul>';
    section.innerHTML = html;
    content.appendChild(section);
  }
  overlay.classList.add('active');
}

function closeUpdateLog() {
  $('updatelog-overlay').classList.remove('active');
  inputLocked = false;
}

// === MINIMAP ===
let minimapPulseRAF = null;

function toggleMinimap() {
  if (!state) return;
  state.minimapOpen = !state.minimapOpen;
  const overlay = $('minimap-overlay');
  if (state.minimapOpen) {
    renderMinimap();
    overlay.classList.add('active');
    startMinimapPulse();
    inputLocked = true;
  } else {
    overlay.classList.remove('active');
    stopMinimapPulse();
    inputLocked = false;
  }
}

function startMinimapPulse() {
  stopMinimapPulse();
  const mc = $('minimap-canvas');
  const ctx = mc.getContext('2d');
  const scale = 5;
  function pulse() {
    if (!state || !state.minimapOpen) return;
    const px = state.player.x * scale;
    const py = state.player.y * scale;
    const t = Date.now() / 600;
    const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t));
    const radius = 1 + 2 * (0.5 + 0.5 * Math.sin(t));
    // Clear just the player area + pulse ring
    const clearR = 8;
    // Redraw background behind player
    const biome = getFloorBiome(state.floor);
    ctx.fillStyle = biome.bg || '#0a0a0f';
    ctx.fillRect(px - clearR, py - clearR, scale + clearR * 2, scale + clearR * 2);
    // Redraw any tiles under the pulse area
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = state.player.x + dx, ty = state.player.y + dy;
        if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue;
        const idx = ty * MAP_W + tx;
        if (!state.explored[idx]) continue;
        const tile = state.map[idx];
        const vis = state.visible[idx];
        switch (tile) {
          case T.WALL:  ctx.fillStyle = vis ? biome.wallVis : biome.wallDim; break;
          case T.FLOOR: ctx.fillStyle = vis ? biome.floorVis : biome.floorDim; break;
          case T.CORRIDOR: ctx.fillStyle = vis ? biome.corrVis : biome.corrDim; break;
          case T.STAIRS_DOWN: ctx.fillStyle = '#00e060'; break;
          case T.STAIRS_UP: ctx.fillStyle = '#60c0ff'; break;
          case T.DOOR_CLOSED: ctx.fillStyle = (state.rogueClosedDoors && state.rogueClosedDoors.has(idx)) ? '#40a0a0' : '#8B6914'; break;
          case T.DOOR_OPEN: ctx.fillStyle = vis ? '#a08030' : '#504020'; break;
          case T.DOOR_ONEWAY: ctx.fillStyle = '#c06030'; break;
          case T.DOOR_SEALED: ctx.fillStyle = '#6a2020'; break;
          case T.WALL_SECRET: ctx.fillStyle = vis ? biome.wallVis : biome.wallDim; break;
          case T.DOOR_LOCKED: ctx.fillStyle = '#c08030'; break;
          case T.SPECIAL: ctx.fillStyle = '#8060c0'; break;
          default: continue;
        }
        ctx.fillRect(tx * scale, ty * scale, scale, scale);
      }
    }
    // Pulse ring
    ctx.beginPath();
    ctx.arc(px + scale / 2, py + scale / 2, radius + scale / 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,232,64,${alpha * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Player cross
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffe840';
    ctx.fillRect(px - 1, py, scale + 2, scale);
    ctx.fillRect(px, py - 1, scale, scale + 2);
    ctx.globalAlpha = 1;
    minimapPulseRAF = requestAnimationFrame(pulse);
  }
  minimapPulseRAF = requestAnimationFrame(pulse);
}

function stopMinimapPulse() {
  if (minimapPulseRAF) {
    cancelAnimationFrame(minimapPulseRAF);
    minimapPulseRAF = null;
  }
}

function renderMinimap() {
  const mc = $('minimap-canvas');
  const ctx = mc.getContext('2d');
  const scale = 5; // pixels per tile
  const biome = getFloorBiome(state.floor);
  const LEGEND_H = 90; // pixels of legend strip at bottom
  mc.width = MAP_W * scale;
  mc.height = MAP_H * scale + LEGEND_H;

  ctx.fillStyle = biome.bg || '#0a0a0f';
  ctx.fillRect(0, 0, mc.width, mc.height);

  // Draw map tiles with biome colors
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      if (!state.explored[idx]) continue;

      const tile = state.map[idx];
      const vis = state.visible[idx];

      switch (tile) {
        case T.WALL:
          ctx.fillStyle = vis ? biome.wallVis : biome.wallDim;
          break;
        case T.FLOOR:
          ctx.fillStyle = vis ? biome.floorVis : biome.floorDim;
          break;
        case T.CORRIDOR:
          ctx.fillStyle = vis ? biome.corrVis : biome.corrDim;
          break;
        case T.STAIRS_DOWN:
          ctx.fillStyle = '#00e060';
          break;
        case T.STAIRS_UP:
          ctx.fillStyle = '#60c0ff';
          break;
        case T.DOOR_CLOSED:
          ctx.fillStyle = (state.rogueClosedDoors && state.rogueClosedDoors.has(idx)) ? '#40a0a0' : '#8B6914';
          break;
        case T.DOOR_OPEN:
          ctx.fillStyle = vis ? '#a08030' : '#504020';
          break;
        case T.DOOR_ONEWAY:
          ctx.fillStyle = '#c06030';
          break;
        case T.DOOR_SEALED:
          ctx.fillStyle = '#6a2020';
          break;
        case T.WALL_SECRET:
          // Render as normal wall on minimap
          ctx.fillStyle = vis ? biome.wallVis : biome.wallDim;
          break;
        case T.DOOR_LOCKED:
          ctx.fillStyle = '#c08030';
          break;
        case T.SPECIAL:
          ctx.fillStyle = '#8060c0';
          break;
        case T.TELEPORT:
          // Hidden teleport — don't show on minimap
          continue;
        case T.TELEPORT_VIS:
          ctx.fillStyle = '#40e0d0';
          break;
        case T.RUBBLE:
          ctx.fillStyle = vis ? '#9a6535' : '#4a2e12';
          break;
        default:
          continue;
      }

      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  // Adventurer Pathfinder: always reveal stairs on minimap
  if (state.player.pathfinder) {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = state.map[y * MAP_W + x];
        if (tile === T.STAIRS_DOWN || tile === T.STAIRS_UP) {
          const explored = state.explored[y * MAP_W + x];
          if (!explored) {
            ctx.fillStyle = tile === T.STAIRS_DOWN ? 'rgba(0,224,96,0.5)' : 'rgba(96,192,255,0.5)';
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
    }
  }

  // Draw stairs labels (▼ down, ▲ up)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 7px monospace';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      const tile = state.map[idx];
      const show = state.explored[idx] || (state.player.pathfinder && (tile === T.STAIRS_DOWN || tile === T.STAIRS_UP));
      if (!show) continue;
      if (tile === T.STAIRS_DOWN) {
        ctx.fillStyle = '#003818';
        ctx.fillText('▼', x * scale + scale / 2, y * scale + scale / 2);
      } else if (tile === T.STAIRS_UP) {
        ctx.fillStyle = '#002840';
        ctx.fillText('▲', x * scale + scale / 2, y * scale + scale / 2);
      }
    }
  }

  // Draw items on explored tiles
  for (const e of state.entities) {
    if (e.type !== 'item') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.explored[idx]) continue;
    ctx.fillStyle = state.visible[idx] ? '#c0c040' : '#606020';
    ctx.fillRect(e.x * scale + 1, e.y * scale + 1, scale - 2, scale - 2);
  }

  // Draw runes as purple dots
  for (const e of state.entities) {
    if (e.type !== 'rune') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#c0a0ff';
    ctx.fillRect(e.x * scale + 1, e.y * scale + 1, scale - 2, scale - 2);
  }

  // Draw merchants as gold dots (Barterer always sees them even through fog)
  for (const e of state.entities) {
    if (e.type !== 'merchant') continue;
    const idx = e.y * MAP_W + e.x;
    const alwaysShow = state.player.bartererDiscount;
    if (!state.visible[idx] && !alwaysShow) continue;
    ctx.fillStyle = alwaysShow && !state.visible[idx] ? 'rgba(240,192,64,0.45)' : '#f0c040';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
    if (alwaysShow && !state.visible[idx]) {
      ctx.fillStyle = '#f0c040';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', e.x * scale + scale / 2, e.y * scale + scale / 2);
    }
  }

  // Draw Conjurer illusions as purple dots on minimap
  for (const e of state.entities) {
    if (e.type !== 'illusion') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#cc44ff';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
  }

  // Draw visible enemies
  for (const e of state.entities) {
    if (e.type !== 'enemy' || e.hp <= 0) continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = e.isAlly ? '#40c040' : '#ff4040';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
  }

  // Draw NPCs as cyan dots
  for (const e of state.entities) {
    if (e.type !== 'npc') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#40e0ff';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
  }

  // Draw sage as purple dot
  for (const e of state.entities) {
    if (e.type !== 'sage') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#a060ff';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
  }

  // Draw tavern as amber dot
  for (const e of state.entities) {
    if (e.type !== 'tavern') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#d0a030';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
  }

  // Draw player as bright gold cross
  const px = state.player.x * scale;
  const py = state.player.y * scale;
  ctx.fillStyle = '#ffe840';
  ctx.fillRect(px - 1, py, scale + 2, scale);
  ctx.fillRect(px, py - 1, scale, scale + 2);

  // Legend strip
  const ly = MAP_H * scale + 4;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#c8a840';
  ctx.fillText(`Floor ${state.floor} — ${biome.name}`, 4, ly);

  ctx.fillStyle = '#ffe840';
  ctx.fillText(`You: (${state.player.x}, ${state.player.y})`, 4, ly + 14);

  // Row 1: stairs
  const row3 = ly + 30;
  ctx.fillStyle = '#00e060'; ctx.fillRect(4, row3, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Down', 12, row3 - 1);

  ctx.fillStyle = '#60c0ff'; ctx.fillRect(54, row3, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Up', 62, row3 - 1);

  // Row 2: entities
  const row4 = ly + 46;
  ctx.fillStyle = '#ff4040'; ctx.fillRect(4, row4, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Foe', 12, row4 - 1);

  ctx.fillStyle = '#40e0ff'; ctx.fillRect(46, row4, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('NPC', 54, row4 - 1);

  ctx.fillStyle = '#f0c040'; ctx.fillRect(90, row4, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Shop', 98, row4 - 1);

  ctx.fillStyle = '#c0c040'; ctx.fillRect(140, row4, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Item', 148, row4 - 1);

  const halfW = MAP_W * scale / 2;
  ctx.fillStyle = '#a060ff'; ctx.fillRect(halfW + 4, row4, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Sage', halfW + 12, row4 - 1);

  // Row 3: doors
  const row5 = ly + 62;
  ctx.fillStyle = '#8B6914'; ctx.fillRect(4, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Door', 12, row5 - 1);

  ctx.fillStyle = '#c06030'; ctx.fillRect(54, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('1-Way', 62, row5 - 1);

  ctx.fillStyle = '#6a2020'; ctx.fillRect(110, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Sealed', 118, row5 - 1);

  // Row 4: terrain
  const row6 = ly + 78;
  ctx.fillStyle = '#9a6535'; ctx.fillRect(4, row6, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Rubble', 12, row6 - 1);
}

// === QUICKCAST ===
function showQuickUse() {
  if (!state || state.gameOver || state.victory || inputLocked) return;

  const consumables = state.player.inventory
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => ['potion', 'scroll', 'food', 'thrown'].includes(item.itemType));

  if (consumables.length === 0) {
    addMessage('No consumables in inventory.', '');
    return;
  }

  const menu = $('item-menu');
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'item-name';
  title.textContent = '🧪 Quick Use';
  menu.appendChild(title);

  for (const { item, idx } of consumables) {
    const btn = document.createElement('button');
    let label = `${item.glyph} ${item.name}`;
    if (item.itemType === 'thrown') label += ` (${item.ammo})`;
    btn.textContent = label;
    const captureIdx = idx;
    const fn = () => { closeItemMenu(); useItem(item, captureIdx); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    menu.appendChild(btn);
  }

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', (e) => { e.stopPropagation(); closeItemMenu(); });
  cancel.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); closeItemMenu(); }, { passive: false });
  menu.appendChild(cancel);

  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  setTimeout(() => {
    const closer = (e) => { if (!$('item-menu').contains(e.target)) closeItemMenu(); };
    document.addEventListener('click', closer, { once: true });
    document.addEventListener('touchend', closer, { once: true });
  }, 200);
}

function showQuickEquip() {
  if (!state || state.gameOver || state.victory || inputLocked) return;

  const equippable = state.player.inventory
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => ['weapon', 'armor', 'ring', 'ranged'].includes(item.itemType));

  if (equippable.length === 0) {
    addMessage('No equippable items in inventory.', '');
    return;
  }

  const menu = $('item-menu');
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'item-name';
  title.textContent = '⚔️ Quick Equip';
  menu.appendChild(title);

  for (const { item, idx } of equippable) {
    const btn = document.createElement('button');
    let label = `${item.glyph} ${item.name}`;
    if (item.itemType === 'ranged') label += ` (${item.damage} DMG, ${item.range} rng)`;
    else if (item.attack) label += ` (+${item.attack} ATK)`;
    else if (item.defense) label += ` (+${item.defense} DEF)`;
    else if (item.special) label += ` (${item.special})`;
    btn.textContent = label;
    const captureIdx = idx;
    const fn = () => { closeItemMenu(); useItem(item, captureIdx); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    menu.appendChild(btn);
  }

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', (e) => { e.stopPropagation(); closeItemMenu(); });
  cancel.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); closeItemMenu(); }, { passive: false });
  menu.appendChild(cancel);

  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  setTimeout(() => {
    const closer = (e) => { if (!$('item-menu').contains(e.target)) closeItemMenu(); };
    document.addEventListener('click', closer, { once: true });
    document.addEventListener('touchend', closer, { once: true });
  }, 200);
}

function showQuickThrow() {
  if (!state || state.gameOver || state.victory || inputLocked) return;

  const throwable = state.player.inventory.find(it => it.itemType === 'thrown' && it.ammo > 0);
  if (!throwable) {
    addMessage('No throwing weapons in inventory.', '');
    return;
  }
  const idx = state.player.inventory.indexOf(throwable);
  useItem(throwable, idx);
}

// === FLOOR BIOMES ===
function getFloorBiome(floor) {
  if (floor <= 4) return {
    name: 'The Sewers',
    wallVis: '#4a7a4a', wallDim: '#1e321e',
    floorVis: '#2e4e2e', floorDim: '#16221a',
    corrVis:  '#264020', corrDim:  '#121a10',
    bg: '#080f08'
  };
  if (floor <= 8) return {
    name: 'The Crypt',
    wallVis: '#5a5a72', wallDim: '#282838',
    floorVis: '#40405a', floorDim: '#1e1e2c',
    corrVis:  '#38384e', corrDim:  '#181820',
    bg: '#0c0c14'
  };
  if (floor <= 12) return {
    name: 'The Citadel',
    wallVis: '#6a3a3a', wallDim: '#301818',
    floorVis: '#4a2424', floorDim: '#201010',
    corrVis:  '#3e1e1e', corrDim:  '#180c0c',
    bg: '#100606'
  };
  if (floor <= 16) return {
    name: 'The Abyss',
    wallVis: '#3a5a6a', wallDim: '#152030',
    floorVis: '#24405a', floorDim: '#101828',
    corrVis:  '#1e3448', corrDim:  '#0c1420',
    bg: '#060a10'
  };
  return {
    name: 'The Sanctum',
    wallVis: '#5a2a6a', wallDim: '#280f32',
    floorVis: '#3e1858', floorDim: '#1c0a28',
    corrVis:  '#321444', corrDim:  '#160820',
    bg: '#0c0210'
  };
}

// === DODGE CHANCE ===
function getDodgeChance(attacker, defender) {
  if (defender === state.player) {
    let dodge = 0.05; // base 5% for all
    if (state.player.equipped.armor?.special === 'stealth') dodge += 0.15;
    dodge += (state.player.dodgeBonus || 0); // class-based bonus (Rogue: +15%)
    if (hasRune('swiftness')) dodge += 0.08; // Glyph of Swiftness
    return dodge;
  }
  // Evasive enemies can dodge player attacks
  if (['Bat', 'Spider', 'Rat'].includes(defender.name)) return 0.10;
  return 0;
}

// === STATUS EFFECT INDICATORS ===
function renderStatusFX() {
  const bar = $('fx-bar');
  if (!state || !bar) return;
  const effects = state.player.statusEffects || [];
  const hasHaste = hasRingEffect('haste');
  if (effects.length === 0 && !state.throwMode && !state.fortifyMode && !hasHaste) { bar.innerHTML = ''; return; }

  const labels = {
    burning:      { icon: '🔥', text: 'Burn',   cls: 'fx-burning' },
    frozen:       { icon: '❄️', text: 'Frozen', cls: 'fx-frozen' },
    poison:       { icon: '☠️', text: 'Poison', cls: 'fx-poison' },
    webbed:       { icon: '🕸', text: 'Webbed', cls: 'fx-webbed' },
    invisibility: { icon: '👁', text: 'Invis',  cls: 'fx-invisibility' },
    strength:     { icon: '💪', text: 'Str+',   cls: 'fx-strength' }
  };

  let html = '';
  if (state.throwMode) {
    html += '<div class="fx-pill fx-throw-mode">🎯 Aim&hellip;</div>';
  }
  if (state.fortifyMode) {
    html += '<div class="fx-pill" style="background:rgba(192,144,64,0.2);border-color:#c09040;color:#c09040;">🧱 Build&hellip;</div>';
  }
  for (const eff of effects) {
    const cfg = labels[eff.type];
    if (!cfg) continue;
    html += `<div class="fx-pill ${cfg.cls}">${cfg.icon} ${cfg.text} ${eff.turns}</div>`;
  }
  // Passive ring indicators
  if (hasHaste) {
    html += '<div class="fx-pill" style="background:rgba(255,180,0,0.2);border-color:#ffa000;color:#ffa000;">⚡ Haste</div>';
  }
  bar.innerHTML = html;
}

// === RANGED COMBAT — BOW FIRING ===
function fireRangedWeapon() {
  if (inputLocked || !state || state.gameOver || state.victory) return;
  // If already in aim mode, cancel it
  if (state.throwMode) {
    state.throwMode = false;
    state.throwItem = null;
    addMessage('Cancelled.', '');
    updateUI();
    render();
    return;
  }

  const p = state.player;
  const bow = p.equipped.ranged;
  if (!bow) {
    addMessage('No ranged weapon equipped.', '');
    return;
  }

  // Check ammo (Rangers have infinite basic arrows)
  if (!p.infiniteArrows && p.arrows <= 0 && !p.loadedSpecialArrow) {
    addMessage('No arrows! Find or buy more.', 'damage');
    return;
  }

  // Calculate damage with Ranger level scaling
  let baseDmg = bow.damage;
  if (p.infiniteArrows) {
    baseDmg += Math.floor(p.level / 3); // Rangers scale with level
  }

  // Enter aim mode using throwMode system
  state.throwMode = true;
  const arrowLabel = p.loadedSpecialArrow ? p.loadedSpecialArrow.name : 'Arrow';
  state.throwItem = {
    item: {
      name: arrowLabel,
      damage: baseDmg,
      ammo: Infinity, // don't consume via throwProjectile — we handle ammo ourselves
      itemType: 'ranged_shot',
      range: bow.range,
      bowSpecial: bow.special,
      loadedArrow: p.loadedSpecialArrow
    },
    index: -1
  };

  const ammoStr = p.infiniteArrows ? '∞' : `${p.arrows}`;
  const specialStr = p.loadedSpecialArrow ? ` [${p.loadedSpecialArrow.name}]` : '';
  addMessage(`🏹 ${bow.name}${specialStr} — choose direction! (${ammoStr} arrows)`, 'good');
  updateUI();
  render();
}

// === RANGED COMBAT — THROWING DAGGERS ===
function throwProjectile(dx, dy, isSecondShot) {
  state.throwMode = false;
  const throwData = isSecondShot ? isSecondShot : state.throwItem;
  if (!isSecondShot) state.throwItem = null;
  if (!throwData) { endTurn(); return; }

  const { item } = throwData;
  const isAimedShot = item.itemType === 'aimed_shot';
  const isRangedShot = item.itemType === 'ranged_shot';
  const isAcidBolt = item.itemType === 'acid_bolt';
  const maxRange = isAimedShot ? 50 : (isRangedShot || isAcidBolt ? (item.range || 8) : 8);
  const p = state.player;

  let x = p.x + dx;
  let y = p.y + dy;
  let hit = false;
  let hitTarget = null;
  let landX = x, landY = y;

  // Crossbow pierce special: ignore some DEF
  const pierceDef = (isRangedShot && item.bowSpecial === 'pierce') ? 1 : 0;
  // Piercing arrow: ignore 2 DEF + bonus damage
  const loadedArrow = isRangedShot ? item.loadedArrow : null;
  const piercingArrowDef = (loadedArrow?.arrowType === 'pierce') ? 2 : 0;
  const bonusDmg = (loadedArrow?.damage || 0);

  for (let i = 0; i < maxRange; i++) {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) break;
    const target = enemyAt(x, y);
    if (target && target.hp > 0) {
      landX = x; landY = y;
      const def = Math.max(0, getEffectiveDefense(target) - pierceDef - piercingArrowDef);
      const baseDmg = (item.damage || item.attack || 1) + bonusDmg;
      const dmg = Math.max(1, baseDmg - def + Math.floor(Math.random() * 3) - 1);
      target.hp -= dmg;

      if (isAimedShot) {
        addMessage(`🏹 Aimed Shot hits ${target.name} for ${dmg}!`, 'good');
      } else if (isRangedShot) {
        addMessage(`🏹 Arrow hits ${target.name} for ${dmg}!`, 'good');
      } else {
        addMessage(`Your dagger strikes ${target.name} for ${dmg}!`, 'good');
      }

      Audio.hit();
      haptic((isAimedShot || isRangedShot) ? 40 : 20);
      hit = true;
      hitTarget = target;

      // Apply special arrow effects
      if (isRangedShot && loadedArrow) {
        if (loadedArrow.arrowType === 'fire' && target.hp > 0) {
          addStatusEffect(target, 'burning', 3);
          addMessage(`🔥 ${target.name} catches fire!`, 'good');
        } else if (loadedArrow.arrowType === 'frost' && target.hp > 0) {
          addStatusEffect(target, 'frozen', 2);
          addMessage(`❄️ ${target.name} is frozen!`, 'good');
        }
      }
      // Aimed shot with special arrow loaded also applies effects
      if (isAimedShot && p.loadedSpecialArrow) {
        const sa = p.loadedSpecialArrow;
        if (sa.arrowType === 'fire' && target.hp > 0) {
          addStatusEffect(target, 'burning', 3);
          addMessage(`🔥 ${target.name} catches fire!`, 'good');
        } else if (sa.arrowType === 'frost' && target.hp > 0) {
          addStatusEffect(target, 'frozen', 2);
          addMessage(`❄️ ${target.name} is frozen!`, 'good');
        }
      }

      if (target.hp <= 0) {
        killEnemy(target);
        if (state.runStats) {
          state.runStats.thrownKills++;
          if (state.runStats.thrownKills >= 3) unlockBadge('sharpshooter');
        }
      }
      break;
    }
    if (!isWalkable(x, y)) break;
    landX = x; landY = y;
    x += dx;
    y += dy;
  }

  // Blast arrow AoE: damage all enemies adjacent to impact point
  if (isRangedShot && loadedArrow?.arrowType === 'blast' && hit && hitTarget) {
    const aoeDmg = Math.max(1, Math.floor((item.damage || 1) * 0.5));
    let aoeCount = 0;
    for (let ax = landX - 1; ax <= landX + 1; ax++) {
      for (let ay = landY - 1; ay <= landY + 1; ay++) {
        if (ax === landX && ay === landY) continue;
        const adj = enemyAt(ax, ay);
        if (adj && adj.hp > 0) {
          adj.hp -= aoeDmg;
          aoeCount++;
          if (adj.hp <= 0) killEnemy(adj);
        }
      }
    }
    if (aoeCount > 0) {
      addMessage(`💥 Blast hits ${aoeCount} adjacent foe${aoeCount > 1 ? 's' : ''}!`, 'good');
      animateAoeBlast(landX, landY, 1.5, '#ff8020');
    }
  }

  // Animation
  const projGlyph = isAcidBolt ? '🟢' : (isAimedShot || isRangedShot) ? '🏹' : '🗡️';
  animateProjectile(p.x, p.y, landX, landY, projGlyph);

  // Acid bolt: apply poison on hit, set cooldown
  if (isAcidBolt) {
    if (!hit) addMessage('The acid bolt splashes into the darkness.', '');
    else if (hitTarget && hitTarget.hp > 0) {
      addStatusEffect(hitTarget, 'poison', 5);
      addMessage(`🟢 ${hitTarget.name} is coated in acid! (poison)`, 'good');
    }
    // Necrotic Surge: splash poison to adjacent enemies on hit
    if (p.necroticSurge && hit && hitTarget) {
      for (let ax = landX - 1; ax <= landX + 1; ax++) {
        for (let ay = landY - 1; ay <= landY + 1; ay++) {
          if (ax === landX && ay === landY) continue;
          const adj = enemyAt(ax, ay);
          if (adj && adj.hp > 0 && !adj.isAlly) {
            addStatusEffect(adj, 'poison', 3);
            addMessage(`🟢 Necrotic Surge poisons ${adj.name}!`, 'good');
          }
        }
      }
    }
    state.player.acidBoltCooldown = 7;
  }

  if (isAimedShot) {
    if (!hit) addMessage('Your arrow flies into the darkness.', '');
    p.aimedShotCooldown = p.quickDraw ? 5 : 8;
    // Aimed shot consumes special arrow if loaded
    if (p.loadedSpecialArrow && hit) {
      p.loadedSpecialArrow.ammo--;
      if (p.loadedSpecialArrow.ammo <= 0) {
        const saIdx = p.inventory.indexOf(p.loadedSpecialArrow);
        if (saIdx >= 0) p.inventory.splice(saIdx, 1);
        addMessage(`Last ${p.loadedSpecialArrow.name} used!`, '');
      }
      p.loadedSpecialArrow = null;
    }
  } else if (isRangedShot) {
    if (!hit) addMessage('Your arrow flies into the darkness.', '');

    // Consume ammo: Rangers use no basic arrows; non-Rangers use 1
    if (!p.infiniteArrows) {
      p.arrows--;
      if (p.arrows <= 0) {
        addMessage('That was your last arrow!', 'damage');
      } else {
        addMessage(`${p.arrows} arrow${p.arrows === 1 ? '' : 's'} remaining.`, '');
      }
    }

    // Consume special arrow if loaded
    if (loadedArrow) {
      loadedArrow.ammo--;
      if (loadedArrow.ammo <= 0) {
        const saIdx = p.inventory.indexOf(loadedArrow);
        if (saIdx >= 0) p.inventory.splice(saIdx, 1);
        addMessage(`Last ${loadedArrow.name} used!`, '');
      }
      p.loadedSpecialArrow = null;
    }
  } else {
    // Throwing daggers
    if (!hit) addMessage('Your dagger clatters harmlessly away.', '');

    // Identify thrown weapon after first use
    if (!item.identified) {
      item.identified = true;
      item.name = `${item.name} (+${item.damage || item.attack || 1} ATK)`;
      addMessage(`You recognize these as ${item.name}!`, 'good');
    }

    item.ammo--;
    if (item.ammo <= 0) {
      const idx = p.inventory.indexOf(item);
      if (idx >= 0) p.inventory.splice(idx, 1);
      addMessage('Your last throwing dagger is gone!', '');
    } else {
      addMessage(`${item.ammo} throwing dagger${item.ammo === 1 ? '' : 's'} remaining.`, '');
    }
  }

  // Ranger Double Shot: fire a second arrow in the same direction
  if (isRangedShot && !isSecondShot && p.doubleShot) {
    addMessage('🏹 Double Shot!', 'good');
    // Consume second arrow for non-Rangers
    if (!p.infiniteArrows) {
      if (p.arrows <= 0) {
        addMessage('No arrows for second shot!', 'damage');
      } else {
        const secondThrow = { item: { ...item, loadedArrow: null }, index: -1 };
        throwProjectile(dx, dy, secondThrow);
        return;
      }
    } else {
      const secondThrow = { item: { ...item, loadedArrow: null }, index: -1 };
      throwProjectile(dx, dy, secondThrow);
      return;
    }
  }

  updateUI();
  render();
  endTurn();
}

// === MINI-BOSS SPAWNING ===
function spawnMiniBoss() {
  const template = MINI_BOSSES[state.floor];
  if (!template) return;

  const room = getFarthestRoom(state.player.x, state.player.y);
  const x = room.x + Math.floor(room.w / 2);
  const y = room.y + Math.floor(room.h / 2);

  const miniBoss = createEnemy(template, x, y);
  miniBoss.isMiniBoss = true;
  state.entities.push(miniBoss);
  addMessage(`⚠ A ${template.name} guards this floor!`, 'damage');
}

// === CLASS SPECIAL ABILITIES ===

function activateEnrage() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.enrageFloorUsed) {
    addMessage('Enrage already used this floor.', '');
    return;
  }
  if (state.player.enrageActive) return;
  Audio.resume();
  haptic(50);
  state.player.enrageActive = true;
  state.player.engageTurnsLeft = 5;
  state.player.enrageFloorUsed = true;
  addMessage('⚡ Battle fury! Bonus attacks for 5 turns!', 'good');
  animateAoeBlast(state.player.x, state.player.y, 1.5, '#ff4040');
  updateUI();
}

function castAoeSpell() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.spellCooldown > 0) {
    addMessage(`Arcane blast recharging (${state.player.spellCooldown} turns).`, '');
    return;
  }
  Audio.resume();
  haptic(40);
  const radius = 3;
  const targets = state.entities.filter(e => {
    if (e.type !== 'enemy' || e.hp <= 0) return false;
    const dx = e.x - state.player.x, dy = e.y - state.player.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  });
  // AoE blast animation
  animateAoeBlast(state.player.x, state.player.y, radius, '#a060ff');
  if (targets.length === 0) {
    addMessage('✨ Arcane blast — no enemies in range!', '');
  } else {
    addMessage(`✨ Arcane blast — ${targets.length} target${targets.length > 1 ? 's' : ''}!`, 'good');
    for (const t of targets) { if (t.hp > 0) attackEntity(state.player, t); }
  }
  state.player.spellCooldown = 12;
  endTurn();
}

// === WIZARD: FIRE WARD + MENU ===
function activateWizardMenu() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  // Check if both abilities are on cooldown — show status
  const spellReady = p.spellCooldown <= 0;
  const wardReady = p.fireWardCooldown <= 0;
  inputLocked = true;
  Audio.resume();
  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '✨ WIZARD';
  $('levelup-label').textContent = 'Choose a spell:';
  const container = $('perk-choices');
  container.innerHTML = '';
  // Option 1: Arcane Blast
  const blastBtn = document.createElement('button');
  blastBtn.className = 'perk-btn';
  const blastStatus = spellReady ? 'Ready' : `${p.spellCooldown} turns`;
  blastBtn.innerHTML = `<div class="perk-name">✨ Arcane Blast</div><div class="perk-desc">AoE damage to nearby enemies${spellReady ? '' : ` (${blastStatus})`}</div>`;
  if (!spellReady) blastBtn.style.opacity = '0.5';
  const blastHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (spellReady) castAoeSpell();
    else addMessage(`Arcane blast recharging (${p.spellCooldown} turns).`, '');
  };
  blastBtn.addEventListener('click', blastHandler);
  blastBtn.addEventListener('touchend', (e) => { e.preventDefault(); blastHandler(); }, { passive: false });
  container.appendChild(blastBtn);
  // Option 2: Fire Ward
  const wardBtn = document.createElement('button');
  wardBtn.className = 'perk-btn';
  const wardStatus = wardReady ? 'Ready' : `${p.fireWardCooldown} turns`;
  wardBtn.innerHTML = `<div class="perk-name">🔥 Fire Ward</div><div class="perk-desc">Ring of fire spheres (3 turns)${wardReady ? '' : ` (${wardStatus})`}</div>`;
  if (!wardReady) wardBtn.style.opacity = '0.5';
  const wardHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (wardReady) castFireWard();
    else addMessage(`Fire Ward recharging (${p.fireWardCooldown} turns).`, '');
  };
  wardBtn.addEventListener('click', wardHandler);
  wardBtn.addEventListener('touchend', (e) => { e.preventDefault(); wardHandler(); }, { passive: false });
  container.appendChild(wardBtn);
  // Cancel
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'perk-btn';
  cancelBtn.style.borderColor = 'var(--text-dim)';
  cancelBtn.innerHTML = `<div class="perk-name">❌ Cancel</div>`;
  const cancelHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
  };
  cancelBtn.addEventListener('click', cancelHandler);
  cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); cancelHandler(); }, { passive: false });
  container.appendChild(cancelBtn);
  overlay.classList.add('active');
}

function castFireWard() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  Audio.resume();
  haptic(40);
  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1}];
  let placed = 0;
  for (const d of dirs) {
    const nx = p.x + d.x, ny = p.y + d.y;
    if (isWalkable(nx, ny)) {
      state.entities.push({ type: 'hazard', x: nx, y: ny, glyph: '🔥', name: 'Fire Ward', hazardType: 'fireward', turns: 3 });
      animateEntityFlash(nx, ny, '#ff6020');
      placed++;
      // Damage any enemy standing there immediately
      const enemy = enemyAt(nx, ny);
      if (enemy && enemy.hp > 0 && !enemy.isAlly) {
        const dmg = Math.max(1, 2 + Math.floor(p.level / 3));
        enemy.hp -= dmg;
        addMessage(`🔥 ${enemy.name} is scorched! (-${dmg})`, 'good');
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
  }
  if (placed === 0) {
    addMessage('No space for fire spheres!', 'damage');
    return;
  }
  addMessage(`🔥 Fire Ward! ${placed} fire spheres surround you!`, 'good');
  animateAoeBlast(p.x, p.y, 1.5, '#ff4000');
  Audio.hit();
  p.fireWardCooldown = 8;
  computeFOV();
  updateUI();
  endTurn();
}

function activateAimedShot() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.aimedShotCooldown > 0) {
    addMessage(`Aimed Shot recharging (${state.player.aimedShotCooldown} turns).`, '');
    return;
  }
  Audio.resume();
  // Enter throw-like targeting mode but with infinite range and 2x damage
  // If a bow is equipped, use bow damage × 2 + level scaling; otherwise ATK × 2
  const bow = state.player.equipped.ranged;
  let aimDmg;
  if (bow) {
    aimDmg = (bow.damage + Math.floor(state.player.level / 3)) * 2;
  } else {
    aimDmg = state.player.attack * 2;
  }
  state.throwMode = true;
  state.throwItem = { item: { name: 'Aimed Shot', damage: aimDmg, ammo: Infinity, itemType: 'aimed_shot' }, index: -1 };
  addMessage('🏹 Aimed Shot — choose a direction!', 'good');
  updateUI();
  render();
}

function activateDivineHeal() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.divineHealUsed) {
    addMessage('Divine Heal already used this floor.', '');
    return;
  }
  Audio.resume();
  haptic(40);
  const p = state.player;
  const healAmount = Math.floor(p.maxHp * 0.4);
  p.hp = Math.min(p.maxHp, p.hp + healAmount);
  // Cure poison and burning
  p.statusEffects = p.statusEffects.filter(e => e.type !== 'poison' && e.type !== 'burning');
  p.divineHealUsed = true;
  addMessage(`✝ Divine light restores ${healAmount} HP!`, 'good');
  animateAoeBlast(p.x, p.y, 1.5, '#f0e060');
  Audio.useItem();
  updateUI();
  endTurn();
}

// === BARD: SONG OF REST ===
function activateSongOfRest() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.songOfRestFloorUsed) {
    addMessage('Song of Rest already used this floor.', '');
    return;
  }
  Audio.resume();
  haptic(40);
  const p = state.player;
  const healAmount = 3;
  p.hp = Math.min(p.maxHp, p.hp + healAmount);
  // Heal allies too
  const allies = state.entities.filter(e => e.type === 'enemy' && e.isAlly && e.hp > 0);
  for (const ally of allies) {
    ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
  }
  p.songOfRestFloorUsed = true;
  const allyMsg = allies.length > 0 ? ` and ${allies.length} ally${allies.length > 1 ? 'es' : ''}` : '';
  addMessage(`🎵 Song of Rest heals you${allyMsg} for ${healAmount} HP!`, 'good');
  animateAoeBlast(p.x, p.y, 2, '#60c0a0');
  Audio.useItem();
  updateUI();
  endTurn();
}

// === ARTIFICER: FORGE ===
function activateForge() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.tinkerFloorUsed) {
    addMessage('Forge already used this floor.', '');
    return;
  }
  const p = state.player;
  if (p.gold < 15) {
    addMessage('Forge costs 15 gold.', 'damage');
    return;
  }
  // Gather all forgeable items (weapons and armors, equipped and inventory)
  const candidates = [];
  if (p.equipped.weapon) candidates.push({ item: p.equipped.weapon, label: '⚔️ ' + p.equipped.weapon.name + ' (equipped)', slot: 'weapon' });
  if (p.equipped.armor) candidates.push({ item: p.equipped.armor, label: '🛡️ ' + p.equipped.armor.name + ' (equipped)', slot: 'armor' });
  if (p.equipped.ranged) candidates.push({ item: p.equipped.ranged, label: '🏹 ' + p.equipped.ranged.name + ' (equipped)', slot: 'ranged' });
  for (let i = 0; i < p.inventory.length; i++) {
    const it = p.inventory[i];
    if (it.itemType === 'weapon') candidates.push({ item: it, label: '⚔️ ' + it.name + ` [+${it.attack} ATK]`, slot: null });
    else if (it.itemType === 'armor') candidates.push({ item: it, label: '🛡️ ' + it.name + ` [+${it.defense} DEF]`, slot: null });
    else if (it.itemType === 'ranged') candidates.push({ item: it, label: '🏹 ' + it.name + ` [${it.damage} DMG]`, slot: null });
  }
  if (candidates.length === 0) {
    addMessage('No weapon or armor to forge.', 'damage');
    return;
  }
  // Show forge picker overlay
  inputLocked = true;
  Audio.resume();
  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '🔧 FORGE';
  const bonus = p.masterSmith ? 2 : 1;
  $('levelup-label').textContent = `Choose an item to upgrade (+${bonus}). Cost: 15💰  You have: ${p.gold}💰`;
  const container = $('perk-choices');
  container.innerHTML = '';
  for (const cand of candidates) {
    const btn = document.createElement('button');
    btn.className = 'perk-btn';
    const isWeaponType = cand.item.itemType === 'weapon' || cand.item.itemType === 'ranged';
    const statLabel = isWeaponType ? `+${bonus} ATK/DMG` : `+${bonus} DEF`;
    btn.innerHTML = `<div class="perk-name">${cand.label}</div><div class="perk-desc">${statLabel}</div>`;
    const handler = () => {
      p.gold -= 15;
      if (cand.item.itemType === 'weapon' || cand.item.itemType === 'ranged') {
        const key = cand.item.attack !== undefined ? 'attack' : 'damage';
        cand.item[key] = (cand.item[key] || 0) + bonus;
        const val = cand.item[key];
        cand.item.name = cand.item.name.replace(/ \+\d+$/, '') + ` +${val}`;
        addMessage(`🔧 Forged: +${bonus} ${key === 'attack' ? 'ATK' : 'DMG'}! (${cand.item.name})`, 'gold');
      } else {
        cand.item.defense = (cand.item.defense || 0) + bonus;
        cand.item.name = cand.item.name.replace(/ \+\d+$/, '') + ` +${cand.item.defense}`;
        addMessage(`🔧 Forged: +${bonus} DEF! (${cand.item.name})`, 'gold');
      }
      p.tinkerFloorUsed = true;
      animateEntityFlash(p.x, p.y, '#f0a030');
      Audio.gold();
      haptic(40);
      overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
      overlay.classList.remove('active');
      inputLocked = false;
      updateUI();
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handler(); }, { passive: false });
    container.appendChild(btn);
  }
  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'perk-btn';
  cancelBtn.style.borderColor = 'var(--text-dim)';
  cancelBtn.innerHTML = `<div class="perk-name">❌ Cancel</div><div class="perk-desc">Keep your gold</div>`;
  const cancelHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
  };
  cancelBtn.addEventListener('click', cancelHandler);
  cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); cancelHandler(); }, { passive: false });
  container.appendChild(cancelBtn);
  overlay.classList.add('active');
}

// === NINJA: STAR THROW ===
function activateStarThrow() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.starThrowCooldown > 0) {
    addMessage(`Throwing Stars not ready. (${p.starThrowCooldown} turns)`, '');
    return;
  }
  Audio.resume();
  haptic(40);
  const dmg = p.attack + 2;
  let hitCount = 0;
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let x = p.x + dx, y = p.y + dy;
    let landed = { x: p.x + dx, y: p.y + dy };
    for (let i = 0; i < 8; i++) {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) break;
      const target = enemyAt(x, y);
      if (target && target.hp > 0 && !target.isAlly) {
        const def = getEffectiveDefense(target);
        const d = Math.max(1, dmg - def + Math.floor(Math.random() * 3) - 1);
        target.hp -= d;
        addMessage(`🌟 Star hits ${target.name} for ${d}!`, 'good');
        landed = { x, y };
        hitCount++;
        if (target.hp <= 0) killEnemy(target);
        break;
      }
      if (!isWalkable(x, y)) break;
      landed = { x, y };
      x += dx; y += dy;
    }
    animateProjectile(p.x, p.y, landed.x, landed.y, '🌟');
  }
  if (hitCount === 0) addMessage('🌟 Stars fly in all directions!', 'good');
  p.starThrowCooldown = 6;
  Audio.hit();
  updateUI();
  endTurn();
}

// === DARK WIZARD: ACID BOLT ===
function activateAcidBolt() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.acidBoltCooldown > 0) {
    addMessage(`Acid Bolt not ready. (${p.acidBoltCooldown} turns)`, '');
    return;
  }
  if (state.throwMode) {
    state.throwMode = false;
    state.throwItem = null;
    addMessage('Cancelled.', '');
    updateUI();
    render();
    return;
  }
  state.throwMode = true;
  state.throwItem = {
    item: { name: 'Acid Bolt', damage: p.attack, ammo: Infinity, itemType: 'acid_bolt', range: 10 },
    index: -1
  };
  addMessage('🟢 Acid Bolt — choose direction!', 'good');
  updateUI();
  render();
}

// === BRICK MASON: FORTIFY ===
function activateFortify() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.fortifyCharges <= 0) {
    addMessage('No fortify charges left this floor.', '');
    return;
  }
  // If already in fortify mode, cancel
  if (state.fortifyMode) {
    state.fortifyMode = false;
    state.fortifyCandidates = null;
    addMessage('Fortify cancelled.', '');
    updateUI();
    render();
    return;
  }
  // Find valid adjacent tiles: FLOOR/CORRIDOR to build, WALL (non-border) to demolish
  const candidates = [];
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nx = p.x + dx, ny = p.y + dy;
    const t = getTile(nx, ny);
    if (t === T.FLOOR || t === T.CORRIDOR) {
      // Build candidate — not occupied by enemy
      if (enemyAt(nx, ny)) continue;
      candidates.push({ nx, ny, dx, dy, action: 'build' });
    } else if (t === T.WALL && nx > 0 && nx < MAP_W - 1 && ny > 0 && ny < MAP_H - 1) {
      // Demolish candidate — non-border wall
      candidates.push({ nx, ny, dx, dy, action: 'demolish' });
    }
  }
  if (candidates.length === 0) {
    addMessage('No room to build or demolish here.', '');
    return;
  }
  Audio.resume();
  // Enter fortify targeting mode — player sees the map and picks a direction
  state.fortifyMode = true;
  state.fortifyCandidates = candidates;
  const hasBuild = candidates.some(c => c.action === 'build');
  const hasDemo = candidates.some(c => c.action === 'demolish');
  const modeDesc = hasBuild && hasDemo ? 'build or demolish' : hasBuild ? 'build' : 'demolish';
  addMessage(`🧱 Fortify (${p.fortifyCharges} left) — ${modeDesc}! (hold to cancel)`, 'good');
  updateUI();
  render();
}

function executeFortify(dx, dy) {
  const p = state.player;
  if (!state.fortifyMode || !state.fortifyCandidates) return false;
  const cand = state.fortifyCandidates.find(c => c.dx === dx && c.dy === dy);
  if (!cand) {
    addMessage('Cannot build there.', '');
    return false;
  }
  const key = cand.ny * MAP_W + cand.nx;
  if (cand.action === 'build') {
    setTile(cand.nx, cand.ny, T.WALL);
    state.masonWalls.set(key, 3);
    animateEntityFlash(p.x, p.y, '#a0a0a0');
    addMessage('🧱 You build a wall!', 'good');
  } else {
    setTile(cand.nx, cand.ny, T.FLOOR);
    state.masonWalls.delete(key);
    animateEntityFlash(p.x, p.y, '#c08040');
    addMessage('🧱 You break through the wall!', 'good');
  }
  p.fortifyCharges--;
  state.fortifyMode = false;
  state.fortifyCandidates = null;
  Audio.door();
  haptic(50);
  computeFOV();
  updateUI();
  endTurn();
  return true;
}

// === DAREDEVIL: FLIP ===
function activateFlip() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.flipCooldown > 0) {
    addMessage(`Flip not ready. (${p.flipCooldown} turns)`, '');
    return;
  }
  if (p.flipMode) {
    p.flipMode = false;
    addMessage('Flip cancelled.', '');
    updateUI();
    render();
    return;
  }
  p.flipMode = true;
  addMessage('🤸 Flip — choose direction to jump!', 'good');
  updateUI();
  render();
}

// === ESCAPE ARTIST: TELEPORT STAIRS ===
function activateTeleportStairs() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.stairsTeleportFloorUsed && !getMasteryBonuses(p.classId).extraEscape) {
    addMessage('Escape Route already used this floor.', '');
    return;
  }
  const oldX = p.x, oldY = p.y;
  // Find T.STAIRS_DOWN tile
  let sx = -1, sy = -1;
  for (let i = 0; i < MAP_W * MAP_H; i++) {
    if (state.map[i] === T.STAIRS_DOWN) { sx = i % MAP_W; sy = Math.floor(i / MAP_W); break; }
  }
  if (sx < 0) { addMessage('No stairs found!', 'damage'); return; }
  p.x = sx;
  p.y = sy;
  // Smoke Screen: leave a smoke hazard at the origin tile
  if (p.smokeScreen) {
    state.entities.push({ type: 'hazard', x: oldX, y: oldY, glyph: '💨', name: 'Smoke', hazardType: 'smoke', turns: 3 });
    addMessage('💨 A smoke cloud billows where you stood!', 'good');
  }
  p.stairsTeleportFloorUsed = true;
  addMessage('💨 You vanish and reappear by the stairs!', 'good');
  Audio.gold();
  haptic(40);
  animateEntityFlash(sx, sy, '#80ffff');
  computeFOV();
  updateUI();
  endTurn();
}

// === CONJURER: SUMMON ILLUSION ===
function activateIllusion() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  const maxCD = getMasteryBonuses(p.classId).fastIllusion ? 6 : 8;
  if (p.illusionCooldown > 0) {
    addMessage(`Illusion not ready. (${p.illusionCooldown} turns)`, '');
    return;
  }
  // Remove any existing illusions
  for (let i = state.entities.length - 1; i >= 0; i--) {
    if (state.entities[i].type === 'illusion') state.entities.splice(i, 1);
  }
  // Place illusion(s) on nearby walkable tile(s) — Mirror Image perk allows 2
  const maxIllusions = p.mirrorImage ? 2 : 1;
  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:1,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1}];
  let placedCount = 0;
  for (const d of dirs) {
    if (placedCount >= maxIllusions) break;
    const nx = p.x + d.x, ny = p.y + d.y;
    const tile = getTile(nx, ny);
    if (tile === T.FLOOR || tile === T.CORRIDOR) {
      const blocked = state.entities.some(e => e.x === nx && e.y === ny && (e.type === 'enemy' || e.type === 'merchant' || e.type === 'illusion'));
      if (!blocked) {
        state.entities.push({ type: 'illusion', x: nx, y: ny, hp: 3, turnsLeft: 8, glyph: '🎭' });
        placedCount++;
        animateEntityFlash(nx, ny, '#cc44ff');
      }
    }
  }
  if (placedCount === 0) {
    addMessage('No space to summon an illusion!', 'damage');
    return;
  }
  addMessage(placedCount > 1 ? '🎭 You conjure twin illusions!' : '🎭 You conjure a shimmering illusion!', 'good');
  p.illusionCooldown = maxCD;
  Audio.gold();
  haptic(40);
  computeFOV();
  updateUI();
  endTurn();
}

// === BARTERER: CONJURE RATION ===
function conjureRation() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.hp <= 5) {
    addMessage('Not enough HP to conjure a ration!', 'damage');
    return;
  }
  p.hp -= 5;
  p.hunger = Math.min(100, p.hunger + 30);
  addMessage('🪙 You trade vitality for sustenance. (−5 HP, +30 hunger)', 'good');
  Audio.gold();
  haptic(40);
  updateUI();
  endTurn();
}

// === BOOT ===
document.addEventListener('DOMContentLoaded', boot);

})();
