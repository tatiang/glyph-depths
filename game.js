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
const HUNGER_TICK = 10; // lose 1 hunger every N turns
const HUNGER_DAMAGE_TICK = 5; // lose 1 HP every N turns at 0 hunger

// Tile types
const T = { WALL: 0, FLOOR: 1, CORRIDOR: 2, STAIRS_DOWN: 3, STAIRS_UP: 4, DOOR_CLOSED: 5, DOOR_OPEN: 6, SPECIAL: 7, DOOR_ONEWAY: 8, DOOR_SEALED: 9 };

// === GAME STATE ===
let state = null; // main game state object
let canvas, ctxC; // canvas and 2d context
let tileSize = 25;
let inputLocked = false;
let settings = { sound: true, haptics: true, dpad: true, autopickup: true, heroIcon: '🧝' };
const HERO_ICONS = ['🧝', '🥷', '🧛', '🧟', '🧞', '🧚', '🦸', '🏹', '🐉'];
const GAME_VERSION = 'UI polish + danger border'; // updated each push
const LAST_UPDATED = '2026-03-22 21:00';

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
  { id: 'deep_diver', name: 'Deep Diver', icon: '🚪', desc: 'Reach floor 5', cat: 'explore' },
  { id: 'citadel_bound', name: 'Citadel Bound', icon: '🏰', desc: 'Reach floor 7', cat: 'explore' },
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
  // Challenge
  { id: 'speed_runner', name: 'Speed Runner', icon: '⚡', desc: 'Win in under 500 turns', cat: 'challenge' },
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
  $('badge-overlay').classList.add('active');
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
  const bonuses = { maxHp: 0, attack: 0, defense: 0, critChance: 0, upgradeBow: false, revealRune: false };
  for (const m of MASTERY_DEFS) {
    if (!masteryState[m.id]) continue;
    if (m.classReq && m.classReq !== classId) continue;
    if (m.bonus.maxHp) bonuses.maxHp += m.bonus.maxHp;
    if (m.bonus.attack) bonuses.attack += m.bonus.attack;
    if (m.bonus.defense) bonuses.defense += m.bonus.defense;
    if (m.bonus.critChance) bonuses.critChance += m.bonus.critChance;
    if (m.bonus.upgradeBow) bonuses.upgradeBow = true;
    if (m.bonus.revealRune) bonuses.revealRune = true;
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
  if (floor >= 5) unlockBadge('deep_diver');
  if (floor >= 7) unlockBadge('citadel_bound');

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
  if (state.player.turnsSurvived < 500) unlockBadge('speed_runner');

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
    passive: '♻ Rapid Regeneration',
    startItems: 'Leather Vest · Healing Potion',
    statBadges: [{ label: '15 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Regen', cls: 'pos' }]
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
    passive: '✝ Holy Aura vs Undead · Curse Immune',
    startItems: 'Mace · Healing Potion · Scroll of Identify',
    statBadges: [{ label: '18 HP', cls: 'pos' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Holy Aura', cls: 'pos' }, { label: 'No Curse', cls: 'pos' }, { label: '✝ Divine Heal', cls: 'pos' }]
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
  showClassSelect();
}

function showClassSelect() {
  const cardsEl = $('class-cards');
  const beginBtn = $('btn-begin');
  if (!cardsEl || !beginBtn) return;
  let selectedClass = null;

  cardsEl.innerHTML = '';
  beginBtn.disabled = true;

  for (const cls of CLASS_DEFS) {
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
      cardsEl.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      beginBtn.disabled = false;
    };
    card.addEventListener('click', selectFn);
    card.addEventListener('touchend', (e) => { e.preventDefault(); selectFn(); }, { passive: false });
    cardsEl.appendChild(card);
  }

  beginBtn.onclick = () => {
    if (!selectedClass) return;
    $('title-screen').classList.remove('active');
    newRun(selectedClass);
  };
  beginBtn.ontouchend = (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    $('title-screen').classList.remove('active');
    newRun(selectedClass);
  };
}

// === NEW RUN ===
function newRun(classId = 'adventurer') {
  randomizePotionScrollNames();
  state = {
    floor: 1,
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
    floorData: Array.from({length: 11}, () => ({ kills: 0, damageDealt: 0, damageTaken: 0 })),
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
    curseImmune: classId === 'cleric'
  };
}

function applyMasteryBonuses(classId) {
  const p = state.player;
  const m = getMasteryBonuses(classId);
  if (m.maxHp > 0)      { p.maxHp += m.maxHp; p.hp += m.maxHp; }
  if (m.attack > 0)     { p.attack += m.attack; }
  if (m.defense > 0)    { p.defense += m.defense; }
  if (m.critChance > 0) { p.critChance += m.critChance; }
}

function applyClassStartingItems(classId) {
  const p = state.player;
  if (classId === 'adventurer') {
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) p.inventory.push({ ...healPotion, glyph: '🧪', itemType: 'potion' });
  } else if (classId === 'berserker') {
    const sword = WEAPONS.find(w => w.name === 'Short Sword');
    if (sword) p.equipped.weapon = { ...sword };
    const strPotion = potionNames.find(n => n.id === 'strength');
    if (strPotion) {
      p.inventory.push({ ...strPotion, glyph: '🧪', itemType: 'potion' });
      p.inventory.push({ ...strPotion, glyph: '🧪', itemType: 'potion' });
    }
  } else if (classId === 'rogue') {
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 6 });
    const invisPotion = potionNames.find(n => n.id === 'invisibility');
    if (invisPotion) p.inventory.push({ ...invisPotion, glyph: '🧪', itemType: 'potion' });
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
    p.inventory.push({ ...FOOD });
    // Rangers have infinite basic arrows — no arrow count needed
  } else if (classId === 'cleric') {
    p.equipped.weapon = { name: 'Mace', glyph: '🔨', itemType: 'weapon', attack: 2, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) p.inventory.push({ ...healPotion, glyph: '🧪', itemType: 'potion' });
    const identifyScroll = scrollNames.find(n => n.id === 'identify');
    if (identifyScroll) {
      scrollIdentified[identifyScroll.id] = true;
      p.inventory.push({ ...identifyScroll, glyph: '📜', itemType: 'scroll', identified: true });
    }
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
  { id: 'warding',   name: 'Glyph of Warding',    symbol: '🛡️', desc: '+1 base defense', effect: 'warding' },
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
  ]
};

const BOSS = {
  name: 'Glyph King', glyph: '👑', hp: 40, attack: 6, defense: 4,
  ai: 'boss', xp: 100, special: 'boss', detect: 50
};

// Mini-bosses guard milestone floors (3, 6, 9)
const MINI_BOSSES = {
  3: { name: 'Cave Troll', glyph: '🧌', hp: 22, attack: 5, defense: 3, ai: 'chase', xp: 30, special: 'troll_regen', detect: 8 },
  6: { name: 'Lich',       glyph: '💀', hp: 28, attack: 3, defense: 2, ai: 'flee',  xp: 45, special: 'summon',      detect: 10 },
  9: { name: 'Balrog',     glyph: '👿', hp: 35, attack: 7, defense: 4, ai: 'chase', xp: 60, special: 'fire_trail',  detect: 9 }
};

// === DUNGEON GENERATION (BSP) ===
function generateFloor() {
  const p = state.player;
  state.map = new Uint8Array(MAP_W * MAP_H);
  state.visible = new Uint8Array(MAP_W * MAP_H);
  state.explored = new Uint8Array(MAP_W * MAP_H);
  state.entities = [];
  // Reset per-floor abilities
  p.enrageFloorUsed = false;
  p.undyingFuryUsed = false;
  p.enrageActive = false;
  p.engageTurnsLeft = 0;
  state.rooms = [];

  if (state.floor === 10) {
    generateBossFloor();
  } else {
    generateBSP();
  }

  // Announce biome when entering a new region
  if ([1, 4, 7, 10].includes(state.floor)) {
    const biome = getFloorBiome(state.floor);
    addMessage(`Entering ${biome.name}...`, 'gold');
  }

  // Place stairs down (except floor 10)
  if (state.floor < 10) {
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
  if ([3, 6, 9].includes(state.floor)) {
    spawnMerchant();
  }

  // Sage on floors 2, 5, 8 (uncurse, identify, heal)
  if ([2, 5, 8].includes(state.floor)) {
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

  // Spawn special tiles (risk/reward)
  if (state.floor >= 2) {
    spawnSpecialTiles();
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
  if (state.floor <= 1 || state.floor >= 10) return;

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
  return t !== T.WALL && t !== T.DOOR_CLOSED && t !== T.DOOR_ONEWAY && t !== T.DOOR_SEALED;
}

function isTransparent(x, y) {
  const t = getTile(x, y);
  return t !== T.WALL && t !== T.DOOR_CLOSED && t !== T.DOOR_SEALED;
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
    hp: template.hp,
    maxHp: template.hp,
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
  if (state.floor === 10) return; // Boss already placed
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
    // Don't spawn on player
    if (pos.x === state.player.x && pos.y === state.player.y) continue;
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
  // Purpose / world
  "A ghostly wanderer murmurs: \"The Glyph King once ruled these depths with forbidden runes. Destroy him before he rewrites reality.\"",
  "A faint shade whispers: \"Ten floors stand between you and the Sanctum. Each deeper level is older, darker, more wrong.\"",
  "A spectral scribe warns: \"The Glyph King feeds on the memories of adventurers who fell here. Do not add to his collection.\"",
  "A spirit hisses: \"The glyphs on the walls are not decoration — they are locks. Only the King's death will break them.\"",
  // Gameplay hints
  "A lingering echo advises: \"Sealed doors can be bashed open. It will cost you, but you will survive — barely.\"",
  "A wandering shade notes: \"One-way doors seal behind you. There is always a way out, but it will hurt.\"",
  "A fading voice murmurs: \"Hunger is the silent killer here. Find rations before the torches run out.\"",
  "An old shade cautions: \"Cursed items bind to the bearer. Seek a Scroll of Remove Curse before equipping unknown armor.\"",
  "A translucent figure advises: \"Mimics disguise themselves as chests. Step close — their true nature reveals itself.\"",
  "A spirit warns: \"Demons leave fire in their wake. Flames linger for several turns and burn deeply.\"",
  "A shade recalls: \"Poison from spiders lasts many turns. Use a healing potion to cleanse it before it kills you.\"",
  "A ghost mutters: \"Ghosts walk through walls. There is no wall thick enough to stop one that wants you dead.\"",
  "A spectral guide says: \"Level up wisely. Extended Vision keeps enemies from ambushing you in dark corridors.\"",
  "A faint voice observes: \"Gold is not just for merchants. Hoard enough and surviving becomes much more forgiving.\"",
  // Atmosphere
  "A lost soul sighs: \"I tried to run from the Glyph King. The depths simply do not end — until he does.\"",
  "A pale wanderer says: \"The deeper biomes grow stranger. The Crypt remembers every death. The Citadel enjoys them.\"",
  "A translucent pilgrim whispers: \"Many came before you. Fewer left. The ones who did left only footprints — and warnings.\"",
  "A shade confides: \"The Sanctum on the tenth floor is beautiful. You will never want to see it again.\"",
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
      const w = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      items.push({ item: { ...w }, price: w.value });
    }
  } else {
    const rangedPool = RANGED_WEAPONS.filter(r => r.tier <= tier);
    if (rangedPool.length > 0) {
      const r = rangedPool[Math.floor(Math.random() * rangedPool.length)];
      items.push({ item: { ...r }, price: r.value });
    }
  }
  // Arrow bundle
  items.push({ item: { name: '5 Arrows', glyph: '➶', itemType: 'arrows', count: 5, value: 0 }, price: 8 });
  // Food
  items.push({ item: { ...FOOD }, price: 8 });
  return items;
}

function spawnSpecialTiles() {
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const pos = randomFloorTile();
    if (pos) setTile(pos.x, pos.y, T.SPECIAL);
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
    1:  { tier: 1, nextTier: null,  minEnemies: 2, maxEnemies: 3, minItems: 2, maxItems: 3, food: 1 },
    2:  { tier: 1, nextTier: null,  minEnemies: 3, maxEnemies: 4, minItems: 2, maxItems: 3, food: 1 },
    3:  { tier: 1, nextTier: 2,     minEnemies: 5, maxEnemies: 6, minItems: 3, maxItems: 4, food: 1 },
    4:  { tier: 2, nextTier: null,  minEnemies: 5, maxEnemies: 7, minItems: 3, maxItems: 4, food: 1 },
    5:  { tier: 2, nextTier: null,  minEnemies: 6, maxEnemies: 8, minItems: 3, maxItems: 4, food: Math.random() < 0.5 ? 1 : 0 },
    6:  { tier: 2, nextTier: 3,     minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1 },
    7:  { tier: 3, nextTier: null,  minEnemies: 7, maxEnemies: 10, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    8:  { tier: 3, nextTier: null,  minEnemies: 8, maxEnemies: 10, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    9:  { tier: 3, nextTier: null,  minEnemies: 8, maxEnemies: 12, minItems: 2, maxItems: 3, food: 1 },
    10: { tier: 3, nextTier: null,  minEnemies: 0, maxEnemies: 0,  minItems: 0, maxItems: 0, food: 0 }
  };
  return configs[floor] || configs[1];
}

function generateRandomItem(floor) {
  const roll = Math.random();
  const tier = Math.ceil(floor / 3);
  if (roll < 0.25) {
    // Weapon
    const pool = WEAPONS.filter(w => w.tier <= tier + (Math.random() < 0.15 ? 1 : 0));
    return maybeCurse({ ...pool[Math.floor(Math.random() * pool.length)] }, floor);
  } else if (roll < 0.4) {
    // Armor
    const pool = ARMORS.filter(a => a.tier <= tier + (Math.random() < 0.15 ? 1 : 0));
    return maybeCurse({ ...pool[Math.floor(Math.random() * pool.length)] }, floor);
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
    if (rPool.length > 0) return { ...rPool[Math.floor(Math.random() * rPool.length)] };
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
    // Gold (Greed rune: +50%)
    let amount = 3 + Math.floor(Math.random() * (2 + floor * 2));
    if (state && hasRune('greed')) amount = Math.floor(amount * 1.5);
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
    if (pool.length > 0) return maybeCurse({ ...pool[Math.floor(Math.random() * pool.length)] }, state.floor);
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
  const floorIdx = Math.min(state.floor, 10);
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

  // Wraith drain
  if (attacker.special === 'drain' && targetIsPlayer) {
    state.player.maxHp = Math.max(5, state.player.maxHp - 1);
    addMessage('You feel your life force drain away!', 'damage');
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
  state.floorData[Math.min(state.floor, 10)].kills++;
  state.score += enemy.xp * 10;
  Audio.kill();

  // Track toughest kill
  if (!state.toughestKill || enemy.xp > state.toughestKill.xp) {
    state.toughestKill = { name: enemy.name, glyph: enemy.glyph, xp: enemy.xp };
  }

  // Slime split — disabled on floors 1-2 so new players aren't overwhelmed
  if (enemy.special === 'split' && state.floor >= 3) {
    const existingMinis = state.entities.filter(e => e.type === 'enemy' && e.name === 'Mini Slime' && e.hp > 0).length;
    const maxMinis = 6;
    if (existingMinis < maxMinis) {
      const template = { name: 'Mini Slime', glyph: '🟢', hp: 3, attack: 1, defense: 0, ai: 'chase', xp: 2, special: null, detect: 5, slowMove: true };
      let spawned = 0;
      for (const [dx, dy] of [[0, 1], [1, 0]]) {
        if (spawned >= 2) break;
        const nx = enemy.x + dx, ny = enemy.y + dy;
        if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
          const mini = createEnemy(template, nx, ny);
          mini.alertness = 2;
          state.entities.push(mini);
          spawned++;
        }
      }
      addMessage(spawned > 1 ? 'The Slime splits in two!' : 'The Slime oozes apart!', 'damage');
    } else {
      addMessage('The Slime dissolves!', '');
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
  $('levelup-label').textContent = `Level ${state.player.level}!`;

  const allPerks = [
    { name: 'Extended Vision', desc: 'See 1 tile further in all directions', apply: () => { state.player.fovBonus = (state.player.fovBonus || 0) + 1; computeFOV(); } },
    { name: '+1 Attack',   desc: 'Increase base attack by 1',             apply: () => { state.player.attack += 1; } },
    { name: '+1 Defense',  desc: 'Increase base defense by 1',            apply: () => { state.player.defense += 1; } },
    { name: 'Rapid Regeneration', desc: 'Heal 1 HP every 15 turns',      apply: () => { state.player.hasRegen = true; }, rare: true, unique: true, flag: 'hasRegen' },
    { name: '+5 Max HP',   desc: 'Increase max HP by 5 and full heal',    apply: () => { state.player.maxHp += 5; state.player.hp = state.player.maxHp; }, rare: true },
    { name: 'Glass Cannon', desc: 'Double your attack — but halve max HP', apply: () => { state.player.attack *= 2; state.player.glassCannon = true; state.player.maxHp = Math.max(5, Math.floor(state.player.maxHp / 2)); state.player.hp = Math.min(state.player.hp, state.player.maxHp); }, rare: true },
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

  // Enemy effects
  for (const e of state.entities) {
    if (e.type === 'enemy') processEntityEffects(e);
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
      case 'poison':
        entity.hp -= 3;
        if (isPlayer) addMessage('Poison courses through you! (-3 HP)', 'damage');
        break;
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

  const px = state.player.x, py = state.player.y;
  const dist = Math.abs(enemy.x - px) + Math.abs(enemy.y - py);

  // Adjacent — attack
  if (dist === 1) {
    attackEntity(enemy, state.player);
    return;
  }

  // Demon fire trail
  if (enemy.special === 'fire_trail' && getTile(enemy.x, enemy.y) === T.FLOOR) {
    // Leave a burning effect that damages player if stepped on
    state.entities.push({
      type: 'hazard',
      x: enemy.x, y: enemy.y,
      glyph: '🔥',
      name: 'Fire',
      hazardType: 'fire',
      turns: 5
    });
  }

  const step = findPath(enemy.x, enemy.y, px, py, enemy.special === 'phase');
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

  // Phase 2
  if (enemy.hp <= 20 && enemy.phase === 1) {
    enemy.phase = 2;
    addMessage('The Glyph King enters a fury!', 'damage');
    screenShake();
  }

  // Summon minions
  if (enemy.summonCooldown <= 0) {
    const template = ENEMY_TIERS[1][1]; // Skeleton
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = enemy.x + dx, ny = enemy.y + dy;
      if (isWalkable(nx, ny) && !enemyAt(nx, ny)) {
        const minion = createEnemy(template, nx, ny);
        minion.alertness = 2;
        state.entities.push(minion);
        addMessage('The Glyph King summons a minion!', 'damage');
        break;
      }
    }
    enemy.summonCooldown = enemy.phase === 1 ? 5 : 3;
  } else {
    enemy.summonCooldown--;
  }

  // Phase 2: teleport
  if (enemy.phase === 2 && enemy.teleportCooldown <= 0 && dist > 2) {
    const pos = randomFloorTile();
    if (pos) {
      enemy.x = pos.x;
      enemy.y = pos.y;
      addMessage('The Glyph King teleports!', 'damage');
      enemy.teleportCooldown = 3;
    }
  } else {
    enemy.teleportCooldown--;
  }

  // Phase 2: projectile
  if (enemy.phase === 2 && dist > 1 && Math.random() < 0.4) {
    const dx = Math.sign(px - enemy.x);
    const dy = Math.sign(py - enemy.y);
    // Trace line
    let bx = enemy.x + dx, by = enemy.y + dy;
    for (let i = 0; i < 10; i++) {
      if (!isWalkable(bx, by)) break;
      if (bx === px && by === py) {
        state.player.hp -= 3;
        addMessage('A dark bolt strikes you! (-3 HP)', 'damage');
        screenShake();
        Audio.playerHit();
        haptic(50);
        if (state.player.hp <= 0) { playerDeath('Glyph King', '👑'); return; }
        break;
      }
      bx += dx;
      by += dy;
    }
  }

  // Melee
  if (dist === 1) {
    attackEntity(enemy, state.player);
  } else {
    const step = findPath(enemy.x, enemy.y, px, py, false);
    if (step) tryMoveEnemy(enemy, enemy.x + step.x, enemy.y + step.y);
  }
}

function allyAI(ally) {
  // Find nearest enemy
  let nearestEnemy = null, nearestDist = 999;
  for (const e of state.entities) {
    if (e.type !== 'enemy' || e.isAlly || e.hp <= 0) continue;
    const d = Math.abs(e.x - ally.x) + Math.abs(e.y - ally.y);
    if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
  }

  if (!nearestEnemy) return;

  if (nearestDist === 1) {
    // Attack
    const dmg = Math.max(1, ally.attack - nearestEnemy.defense + Math.floor(Math.random() * 3) - 1);
    nearestEnemy.hp -= dmg;
    addMessage(`Your ${ally.name} hits ${nearestEnemy.name} for ${dmg}!`, '');
    if (nearestEnemy.hp <= 0) {
      addMessage(`${nearestEnemy.name} is destroyed!`, 'good');
      removeEntity(nearestEnemy);
      state.enemiesKilled++;
    }
  } else {
    const step = findPath(ally.x, ally.y, nearestEnemy.x, nearestEnemy.y, false);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
  }
}

function tryMoveEnemy(enemy, nx, ny) {
  const phaseThrough = enemy.special === 'phase';
  if (phaseThrough) {
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
  } else {
    if (!isWalkable(nx, ny)) return;
  }

  // Don't move onto other enemies (unless phasing)
  const other = enemyAt(nx, ny);
  if (other && other !== enemy) return;

  // Don't move onto player — that's handled by attack
  if (nx === state.player.x && ny === state.player.y) return;

  enemy.x = nx;
  enemy.y = ny;
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

  // Throw mode — launch projectile in chosen direction
  if (state.throwMode) {
    throwProjectile(dx, dy);
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

  // Check walkable
  if (!isWalkable(nx, ny)) return;

  p.x = nx;
  p.y = ny;
  Audio.step();
  haptic(10);

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

  // Ring of haste: 30% chance for free extra move
  if (hasRingEffect('haste') && Math.random() < 0.3) {
    addMessage('You move with haste!', 'good');
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
  if (state.player.inventory.length >= MAX_INVENTORY) {
    addMessage(`Inventory full! Cannot pick up ${itemEntity.item.glyph} ${itemEntity.item.name}.`, 'damage');
    return;
  }
  state.player.inventory.push(itemEntity.item);
  state.itemsFound++;
  addMessage(`You pick up ${itemEntity.item.name}.`, 'good');
  // Show hint on first item pickup
  if (state.itemsFound === 1) {
    addMessage('Tip: Tap an item in the bar below to Equip, Use, or Drop it.', 'gold');
  }
  Audio.pickup();
  removeEntity(itemEntity);
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
    if (state.floor < 10) {
      const firstRoom = state.rooms[0];
      state.player.x = firstRoom.x + Math.floor(firstRoom.w / 2);
      state.player.y = firstRoom.y + Math.floor(firstRoom.h / 2);
      setTile(state.player.x, state.player.y, T.STAIRS_UP);
    }
    addMessage(`You descend to floor ${state.floor}...`, '');
    if (state.floor === 10) addMessage('You sense an overwhelming presence...', 'damage');
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

    case 'food':
      p.hunger = Math.min(100, p.hunger + 30);
      p.inventory.splice(index, 1);
      addMessage('You eat a ration. (+30 hunger)', 'good');
      Audio.useItem();
      if (state.runStats) state.runStats.foodEaten++;
      break;
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
            state.floorData[Math.min(state.floor, 10)].kills++;
          }
        }
      }
      addMessage(`A fireball erupts! ${hits} enemies hit for ${fbDamage}!`, 'damage');
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
        if (state.player.inventory.length < MAX_INVENTORY) {
          state.player.inventory.push({ ...FOOD });
          added++;
        }
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
  const sacrifices = [
    { text: 'Sacrifice 5 Max HP for +2 Attack', apply: () => { state.player.maxHp -= 5; state.player.hp = Math.min(state.player.hp, state.player.maxHp); state.player.attack += 2; }},
    { text: 'Sacrifice 10 Gold for +1 Defense', apply: () => { state.player.gold = Math.max(0, state.player.gold - 10); state.player.defense += 1; }},
    { text: 'Leave the shrine alone', apply: () => {} }
  ];

  const container = $('perk-choices');
  container.innerHTML = '';
  $('levelup-overlay').querySelector('h1').textContent = '⛩️ SHRINE';
  $('levelup-label').textContent = 'Make an offering?';

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

function renderShopItems(merchant) {
  $('merchant-gold').textContent = `Your gold: ${state.player.gold}`;
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
    div.innerHTML = `<span>${it.glyph} ${it.name}${statTag}</span><span class="price">${shopItem.price}💰</span>`;
    div.addEventListener('click', () => {
      if (state.player.gold >= shopItem.price) {
        if (state.player.inventory.length >= MAX_INVENTORY && shopItem.item.itemType !== 'food' && shopItem.item.itemType !== 'arrows') {
          addMessage('Inventory full!', 'damage');
          return;
        }
        state.player.gold -= shopItem.price;
        if (shopItem.item.itemType === 'food') {
          state.player.hunger = Math.min(100, state.player.hunger + 30);
          addMessage('You eat a ration. (+30 hunger)', 'good');
        } else if (shopItem.item.itemType === 'arrows') {
          state.player.arrows += shopItem.item.count;
          addMessage(`You buy ${shopItem.item.count} arrows! (${state.player.arrows} total)`, 'good');
        } else {
          state.player.inventory.push({ ...shopItem.item });
          addMessage(`You buy ${shopItem.item.name}.`, 'good');
        }
        Audio.gold();
        $('merchant-gold').textContent = `Your gold: ${state.player.gold}`;
        div.style.opacity = '0.3';
        div.style.pointerEvents = 'none';
        updateUI();
      } else {
        addMessage("You can't afford that.", 'damage');
      }
    });
    container.appendChild(div);
  }

  // Refresh stock button
  const REFRESH_COST = 20;
  const refreshDiv = document.createElement('div');
  refreshDiv.className = 'shop-item';
  if (merchant.refreshesLeft > 0) {
    refreshDiv.innerHTML = `<span>🔄 Refresh Stock</span><span class="price" style="color:var(--accent)">${REFRESH_COST}💰 (${merchant.refreshesLeft} left)</span>`;
    refreshDiv.addEventListener('click', () => {
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
    });
  } else {
    refreshDiv.innerHTML = `<span style="color:var(--text-dim)">🔄 No more refreshes</span><span></span>`;
    refreshDiv.style.opacity = '0.4';
    refreshDiv.style.pointerEvents = 'none';
  }
  container.appendChild(refreshDiv);
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
    const rate = classRate * ringBonus * runeBonus;
    const drainBase = Math.floor(rate);
    const drainFrac = rate % 1;
    const drain = drainBase + (Math.random() < (drainFrac || 1) ? 1 : 0);
    state.player.hunger = Math.max(0, state.player.hunger - drain);
  }

  // Survivor's Instinct (Adventurer perk): auto-eat food when starving
  if (state.player.hunger <= 0 && state.player.survivorInstinct) {
    const foodIdx = state.player.inventory.findIndex(i => i.itemType === 'food');
    if (foodIdx >= 0) {
      state.player.inventory.splice(foodIdx, 1);
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
  if (state.idleTurns > 0 && state.idleTurns % 15 === 0 && state.floor < 10) {
    const spawnCount = 1 + (state.idleTurns >= 30 ? 1 : 0);
    const tier = Math.ceil(state.floor / 3);
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

  // Victory check (boss dead on floor 10)
  if (state.floor === 10 && !state.entities.some(e => e.type === 'enemy' && e.name === 'Glyph King')) {
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
const SAVE_SLOTS = 3;
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
    } else if (key === 'ghost') {
      s[key] = val; // ghost is already a simple object
    } else {
      s[key] = JSON.parse(JSON.stringify(val)); // deep clone
    }
  }
  return s;
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
      }
    }
    state = s;

    // Reset transient state
    inputLocked = false;
    state.throwMode = false;
    state.throwItem = null;
    state.minimapOpen = false;

    // Close all overlays
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
    $('minimap-overlay').classList.remove('active');

    // Ensure audio is initialized (in case loading from title)
    Audio.init();
    Audio.setEnabled(settings.sound);

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

      // Draw tile glyph
      ctx.font = `${fontSize}px monospace`;
      let tileGlyph, tileColor;
      switch (tile) {
        case T.WALL:
          tileGlyph = '▓';
          tileColor = vis ? biome.wallVis : biome.wallDim;
          break;
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
          tileColor = '#8B6914';
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
        case T.SPECIAL:
          tileGlyph = '·';
          tileColor = vis ? '#8060c0' : '#302040';
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

  // Draw items (only visible ones)
  for (const e of state.entities) {
    if (e.type !== 'item' && e.type !== 'hazard') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;

    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;

    ctx.font = `${Math.floor(ts * 0.65)}px serif`;
    ctx.fillText(e.glyph, sx, sy);
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

  // Draw enemies (only visible ones)
  for (const e of state.entities) {
    if (e.type !== 'enemy') continue;
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
  const dangerHP = hpPct <= 0.25;
  const dangerHunger = p.hunger <= 15;
  if (dangerHP || dangerHunger) {
    const intensity = dangerHP ? Math.max(0.3, 1 - hpPct * 4) : 0.3; // stronger as HP drops
    const pulseAlpha = intensity * (0.7 + 0.3 * Math.sin(Date.now() / 300)); // subtle pulse
    const borderW = 3;
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.strokeStyle = dangerHP ? '#ff2020' : '#ff6020'; // red for HP, orange for hunger-only
    ctx.lineWidth = borderW * 2; // doubled because half is clipped by canvas edge
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    // Inner glow gradient on edges
    const glowSize = 12;
    ctx.globalAlpha = pulseAlpha * 0.4;
    // Top edge
    const gt = ctx.createLinearGradient(0, 0, 0, glowSize);
    gt.addColorStop(0, dangerHP ? 'rgba(255,32,32,1)' : 'rgba(255,96,32,1)');
    gt.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gt;
    ctx.fillRect(0, 0, canvas.width, glowSize);
    // Bottom edge
    const gb = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - glowSize);
    gb.addColorStop(0, dangerHP ? 'rgba(255,32,32,1)' : 'rgba(255,96,32,1)');
    gb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gb;
    ctx.fillRect(0, canvas.height - glowSize, canvas.width, glowSize);
    // Left edge
    const gl = ctx.createLinearGradient(0, 0, glowSize, 0);
    gl.addColorStop(0, dangerHP ? 'rgba(255,32,32,1)' : 'rgba(255,96,32,1)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, glowSize, canvas.height);
    // Right edge
    const gr = ctx.createLinearGradient(canvas.width, 0, canvas.width - glowSize, 0);
    gr.addColorStop(0, dangerHP ? 'rgba(255,32,32,1)' : 'rgba(255,96,32,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(canvas.width - glowSize, 0, glowSize, canvas.height);
    ctx.restore();
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
      runeBar.textContent = p.runes.map(r => r.symbol).join(' ');
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
      if (p.spellCooldown > 0) {
        setBtn(`✨ BLAST ${p.spellCooldown}t`, false);
        setBar(((12 - p.spellCooldown) / 12) * 100, '#7c5cbf');
      } else {
        setBtn('✨ ARCANE BLAST', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'ranger') {
      spRow.style.display = '';
      if (p.aimedShotCooldown > 0) {
        setBtn(`🏹 AIM ${p.aimedShotCooldown}t`, false);
        setBar(((8 - p.aimedShotCooldown) / 8) * 100, '#4a9');
      } else {
        setBtn('🏹 AIMED SHOT', true);
        setBar(100, 'var(--gold)');
      }
    } else if (cls === 'cleric') {
      spRow.style.display = '';
      if (p.divineHealUsed) {
        setBtn('✝ DIVINE HEAL ✓', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('✝ DIVINE HEAL', true);
        setBar(100, 'var(--gold)');
      }
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
  if (['weapon', 'armor', 'ring', 'ranged'].includes(item.itemType)) {
    actions.push({ label: 'Equip', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (['potion', 'scroll', 'food'].includes(item.itemType)) {
    actions.push({ label: 'Use', fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'thrown') {
    actions.push({ label: `Throw (${item.ammo} left)`, fn: () => { useItem(item, index); closeItemMenu(); }});
  } else if (item.itemType === 'special_arrow') {
    const isLoaded = state.player.loadedSpecialArrow === item;
    actions.push({ label: isLoaded ? '✓ Loaded' : `Load (${item.ammo} left)`, fn: () => {
      if (isLoaded) { state.player.loadedSpecialArrow = null; addMessage('Special arrow unloaded.', ''); }
      else { useItem(item, index); }
      closeItemMenu();
    }});
  }
  actions.push({ label: 'Drop', fn: () => { dropItem(index); closeItemMenu(); }});
  actions.push({ label: 'Destroy', fn: () => {
    // Replace menu content with an inline confirmation
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
      // Item menu
      if ($('item-menu').classList.contains('active')) { closeItemMenu(); return; }
      // Settings
      if ($('settings-overlay').classList.contains('active')) { $('settings-overlay').classList.remove('active'); inputLocked = false; return; }
      // Help / Manual
      if ($('help-overlay').classList.contains('active')) { closeHelp(); return; }
      if ($('manual-overlay').classList.contains('active')) { closeManual(); return; }
      // Minimap
      if ($('minimap-overlay').classList.contains('active')) { state.minimapOpen = false; $('minimap-overlay').classList.remove('active'); return; }
      // Badge overlay
      if ($('badge-overlay').classList.contains('active')) { $('badge-overlay').classList.remove('active'); return; }
      // Merchant
      if ($('merchant-overlay').classList.contains('active')) { $('merchant-overlay').classList.remove('active'); inputLocked = false; endTurn(); return; }
      // Sage
      if ($('sage-overlay').classList.contains('active')) { $('sage-overlay').classList.remove('active'); inputLocked = false; endTurn(); return; }
      // Throw/aim mode
      if (state && state.throwMode) { state.throwMode = false; state.throwItem = null; addMessage('Cancelled.', ''); updateUI(); render(); return; }
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
      case 'b': if (state && !state.gameOver) showBadgeOverlay(); break;
      case 'h': case '?': showHelp(); break;
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

  // Fire ranged weapon button
  const fireBtn = $('btn-fire');
  const handleFire = () => { Audio.resume(); fireRangedWeapon(); };
  fireBtn.addEventListener('click', handleFire);
  fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleFire(); }, { passive: false });

  // Special class ability button (Berserker / Wizard)
  const spBtn = $('btn-special');
  const handleSpecial = () => {
    Audio.resume();
    if (!state) return;
    if (state.player.classId === 'berserker') activateEnrage();
    else if (state.player.classId === 'wizard') castAoeSpell();
    else if (state.player.classId === 'ranger') activateAimedShot();
    else if (state.player.classId === 'cleric') activateDivineHeal();
  };
  spBtn.addEventListener('click', handleSpecial);
  spBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleSpecial(); }, { passive: false });

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
      const tileNames = { [T.WALL]: 'Wall', [T.FLOOR]: 'Floor', [T.CORRIDOR]: 'Corridor', [T.STAIRS_DOWN]: 'Stairs Down', [T.STAIRS_UP]: 'Stairs Up', [T.DOOR_CLOSED]: 'Closed Door', [T.DOOR_OPEN]: 'Open Door', [T.DOOR_ONEWAY]: 'One-Way Door', [T.DOOR_SEALED]: 'Sealed Passage', [T.SPECIAL]: 'Mysterious Glyph' };
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
    closeBadgeBtn.addEventListener('click', () => $('badge-overlay').classList.remove('active'));
    closeBadgeBtn.addEventListener('touchend', (e) => { e.preventDefault(); $('badge-overlay').classList.remove('active'); }, { passive: false });
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
  $('minimap-overlay').addEventListener('click', () => { state.minimapOpen = false; $('minimap-overlay').classList.remove('active'); });

  // Merchant close
  $('btn-leave-shop').addEventListener('click', () => {
    $('merchant-overlay').classList.remove('active');
    inputLocked = false;
    endTurn();
  });

  $('btn-leave-sage').addEventListener('click', () => {
    $('sage-overlay').classList.remove('active');
    inputLocked = false;
    endTurn();
  });

  // Tap message log to expand/collapse history
  $('msg-log').addEventListener('click', () => {
    $('msg-log').classList.toggle('expanded');
    updateUI();
  });

  // Settings
  $('btn-close-settings').addEventListener('click', () => {
    $('settings-overlay').classList.remove('active');
    inputLocked = false;
  });

  // Help screen
  $('btn-help-from-title').addEventListener('click', showHelp);
  $('btn-help-from-settings').addEventListener('click', () => {
    $('settings-overlay').classList.remove('active');
    showHelp();
  });
  $('btn-badges-from-settings').addEventListener('click', () => {
    $('settings-overlay').classList.remove('active');
    showBadgeOverlay();
  });
  $('btn-badges-from-settings').addEventListener('touchend', (e) => {
    e.preventDefault();
    $('settings-overlay').classList.remove('active');
    showBadgeOverlay();
  }, { passive: false });
  $('btn-close-help').addEventListener('click', closeHelp);
  $('btn-close-help-bottom').addEventListener('click', closeHelp);

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

  // Load from title screen
  const loadFromTitle = $('btn-load-from-title');
  if (loadFromTitle) {
    const loadTitleFn = () => { Audio.resume(); showLoadOverlay(true); };
    loadFromTitle.addEventListener('click', loadTitleFn);
    loadFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); loadTitleFn(); }, { passive: false });
  }
}

function showSettings() {
  inputLocked = true;

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
          abilities.push({ icon: '✝️', name: 'Holy Aura', desc: '+3 ATK vs undead enemies' });
          abilities.push({ icon: '🛡️', name: 'Curse Immune', desc: 'Cannot be cursed' });
          abilities.push({ icon: '💛', name: 'Divine Heal', desc: `Full HP heal (1/run)${p.divineHealUsed ? ' — USED' : ' — Ready'}` });
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
      ];
      for (const cp of classPerkFlags) {
        if (p[cp.flag]) abilities.push({ icon: cp.icon, name: `★ ${cp.name}`, desc: cp.desc });
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

  $('settings-overlay').classList.add('active');
}

// === HELP SCREEN ===
function showHelp() {
  inputLocked = true;
  $('help-overlay').classList.add('active');
}

function closeHelp() {
  $('help-overlay').classList.remove('active');
  inputLocked = false;
}

function showManual() {
  inputLocked = true;
  $('manual-overlay').classList.add('active');
}

function closeManual() {
  $('manual-overlay').classList.remove('active');
  inputLocked = false;
}

// === MINIMAP ===
function toggleMinimap() {
  if (!state) return;
  state.minimapOpen = !state.minimapOpen;
  const overlay = $('minimap-overlay');
  if (state.minimapOpen) {
    renderMinimap();
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

function renderMinimap() {
  const mc = $('minimap-canvas');
  const ctx = mc.getContext('2d');
  const scale = 5; // pixels per tile
  const biome = getFloorBiome(state.floor);
  const LEGEND_H = 68; // pixels of legend strip at bottom
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
          ctx.fillStyle = '#8B6914';
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
        case T.SPECIAL:
          ctx.fillStyle = '#8060c0';
          break;
        default:
          continue;
      }

      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  // Draw stairs labels (▼ down, ▲ up)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 7px monospace';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      if (!state.explored[idx]) continue;
      const tile = state.map[idx];
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

  // Draw merchants as gold dots
  for (const e of state.entities) {
    if (e.type !== 'merchant') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    ctx.fillStyle = '#f0c040';
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
  const row4 = ly + 42;
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
  const row5 = ly + 54;
  ctx.fillStyle = '#8B6914'; ctx.fillRect(4, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Door', 12, row5 - 1);

  ctx.fillStyle = '#c06030'; ctx.fillRect(54, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('1-Way', 62, row5 - 1);

  ctx.fillStyle = '#6a2020'; ctx.fillRect(110, row5, 6, 6);
  ctx.fillStyle = '#aaa'; ctx.fillText('Sealed', 118, row5 - 1);
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
  if (floor <= 3) return {
    name: 'The Sewers',
    wallVis: '#4a7a4a', wallDim: '#1e321e',
    floorVis: '#2e4e2e', floorDim: '#16221a',
    corrVis:  '#264020', corrDim:  '#121a10',
    bg: '#080f08'
  };
  if (floor <= 6) return {
    name: 'The Crypt',
    wallVis: '#5a5a72', wallDim: '#282838',
    floorVis: '#40405a', floorDim: '#1e1e2c',
    corrVis:  '#38384e', corrDim:  '#181820',
    bg: '#0c0c14'
  };
  if (floor <= 9) return {
    name: 'The Citadel',
    wallVis: '#6a3a3a', wallDim: '#301818',
    floorVis: '#4a2424', floorDim: '#201010',
    corrVis:  '#3e1e1e', corrDim:  '#180c0c',
    bg: '#100606'
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
  if (effects.length === 0 && !state.throwMode) { bar.innerHTML = ''; return; }

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
  for (const eff of effects) {
    const cfg = labels[eff.type];
    if (!cfg) continue;
    html += `<div class="fx-pill ${cfg.cls}">${cfg.icon} ${cfg.text} ${eff.turns}</div>`;
  }
  bar.innerHTML = html;
}

// === RANGED COMBAT — BOW FIRING ===
function fireRangedWeapon() {
  if (inputLocked || !state || state.gameOver || state.victory) return;
  if (state.throwMode) return; // already in aim mode

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
function throwProjectile(dx, dy) {
  state.throwMode = false;
  const throwData = state.throwItem;
  state.throwItem = null;
  if (!throwData) { endTurn(); return; }

  const { item } = throwData;
  const isAimedShot = item.itemType === 'aimed_shot';
  const isRangedShot = item.itemType === 'ranged_shot';
  const maxRange = isAimedShot ? 50 : (isRangedShot ? (item.range || 8) : 8);
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
  const projGlyph = (isAimedShot || isRangedShot) ? '🏹' : '🗡️';
  animateProjectile(p.x, p.y, landX, landY, projGlyph);

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

// === BOOT ===
document.addEventListener('DOMContentLoaded', boot);

})();
