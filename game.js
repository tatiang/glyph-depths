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
const MAX_FLOOR = 24;
const HUNGER_TICK = 10; // lose 1 hunger every N turns
const HUNGER_DAMAGE_TICK = 5; // lose 1 HP every N turns at 0 hunger

// Tile types
const T = { WALL: 0, FLOOR: 1, CORRIDOR: 2, STAIRS_DOWN: 3, STAIRS_UP: 4, DOOR_CLOSED: 5, DOOR_OPEN: 6, SPECIAL: 7, DOOR_ONEWAY: 8, DOOR_SEALED: 9, WALL_SECRET: 10, DOOR_LOCKED: 11, TELEPORT: 12, TELEPORT_VIS: 13, RUBBLE: 14, WATER: 15, BRIDGE: 16, STEPPING_STONE: 17, STALAGMITE: 18, WATERFALL: 19, MOUND: 20, ICY_PATH: 21, FIRE_PATH: 22, CHASM: 23, ENCHANTED_WALL: 24 };

// === GAME STATE ===
let state = null; // main game state object
let canvas, ctxC; // canvas and 2d context
let tileSize = 25;
let inputLocked = false;
let lockedDoorPulseActive = false; // prevents duplicate RAF loops for locked-door pulse
let settings = { sound: true, haptics: true, dpad: true, autopickup: true, autoEquip: false, showIntents: true, heroIcon: '🧝', helpFontSize: 1, difficulty: 'normal' };
const HERO_ICONS = ['🧝', '🥷', '🧛', '🧟', '🧞', '🧚', '🦸', '🏹', '🐉'];
const GAME_VERSION = 'v0.9.8 — waterfall, mound, icy path, fire path, enchanted wall, chasm'; // updated each push
const LAST_UPDATED = 'March 27, 2026 at 12:00 PM';

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
  { id: 'maze_master', name: 'Maze Master', icon: '🌀', desc: 'Reach floor 13', cat: 'explore' },
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
  { id: 'win_berserker', name: "Berserker's Fury", icon: '💪', desc: 'Win as Berserker', cat: 'class' },
  { id: 'win_rogue', name: "Shadow's Edge", icon: '🥷', desc: 'Win as Rogue', cat: 'class' },
  { id: 'win_ranger', name: "Ranger's Mark", icon: '🏹', desc: 'Win as Ranger', cat: 'class' },
  { id: 'win_cleric', name: 'Divine Crusade', icon: '⛪', desc: 'Win as Cleric', cat: 'class' },
  { id: 'win_darkwizard', name: "Necromancer's Throne", icon: '💀', desc: 'Win as Dark Wizard', cat: 'class' },
  { id: 'win_escapeartist', name: "Escape Artist's Exit", icon: '💨', desc: 'Win as Escape Artist', cat: 'class' },
  { id: 'win_conjurer', name: "Conjurer's Phantom", icon: '🎭', desc: 'Win as Conjurer', cat: 'class' },
  { id: 'win_monk', name: "Monk's Enlightenment", icon: '📿', desc: 'Win as Monk', cat: 'class' },
  { id: 'win_beastmaster', name: "Beastmaster's Call", icon: '🐺', desc: 'Win as Beastmaster', cat: 'class' },
  { id: 'win_elementalist', name: "Elementalist's Crucible", icon: '🧪', desc: 'Win as Elementalist', cat: 'class' },
  // Challenge
  { id: 'speed_runner', name: 'Speed Runner', icon: '⚡', desc: 'Win in under 1000 turns', cat: 'challenge' },
  { id: 'perfectionist', name: 'Perfectionist', icon: '🎯', desc: 'Win on your very first run', cat: 'challenge' },
  { id: 'skeleton_key', name: 'Skeleton Key', icon: '🦴', desc: 'Bash 10 sealed doors total', cat: 'challenge', cumulative: true },
  { id: 'scroll_scholar', name: 'Scroll Scholar', icon: '📜', desc: 'Use 20 scrolls total', cat: 'challenge', cumulative: true },
];

let badgeState = {}; // { badgeId: { unlocked: true, date: '...' } }
let badgeCounts = {}; // cumulative counters: { exterminator: 100, rat_catcher: 10, ... }
let badgesEarnedThisRun = []; // badges unlocked during current run

let codexUnlocked = new Set(); // IDs of discovered codex entries
let codexNew = new Set();      // IDs unlocked since last Codex open

function loadBadges() {
  try {
    badgeState = JSON.parse(localStorage.getItem('glyphDepths_badges') || '{}');
    badgeCounts = JSON.parse(localStorage.getItem('glyphDepths_badgeCounts') || '{}');
    const validBadgeIds = new Set(BADGE_DEFS.map(b => b.id));
    badgeState = Object.fromEntries(Object.entries(badgeState).filter(([id]) => validBadgeIds.has(id)));
  } catch { badgeState = {}; badgeCounts = {}; }
}

function saveBadges() {
  try {
    localStorage.setItem('glyphDepths_badges', JSON.stringify(badgeState));
    localStorage.setItem('glyphDepths_badgeCounts', JSON.stringify(badgeCounts));
  } catch {}
}

function loadCodex() {
  try {
    const raw = localStorage.getItem('glyphDepths_codex');
    if (raw) {
      const parsed = JSON.parse(raw);
      codexUnlocked = new Set(parsed.unlocked || []);
      codexNew = new Set(parsed.newIds || []);
    }
  } catch { codexUnlocked = new Set(); codexNew = new Set(); }
}

function saveCodex() {
  try {
    localStorage.setItem('glyphDepths_codex', JSON.stringify({
      unlocked: Array.from(codexUnlocked),
      newIds: Array.from(codexNew)
    }));
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

// === CODEX ===
function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  }
  return r;
}

function biomeCodexId(floor) {
  if (floor <= 4)  return 'biome_sewers';
  if (floor <= 8)  return 'biome_caverns';
  if (floor <= 12) return 'biome_crypt';
  if (floor <= 16) return 'biome_citadel';
  if (floor <= 20) return 'biome_abyss';
  if (floor < MAX_FLOOR) return 'biome_sanctum';
  return 'biome_throne';
}

function findCodexEntry(id) {
  if (id.startsWith('bestiary_')) return CODEX_BESTIARY_DATA.find(e => e.id === id) || null;
  if (id.startsWith('biome_'))    return CODEX_BIOME_DATA.find(e => e.id === id) || null;
  if (id.startsWith('rune_')) {
    const rune = GLYPH_RUNES.find(r => 'rune_' + r.id === id);
    return rune ? { icon: rune.symbol, title: rune.name, cat: 'runes' } : null;
  }
  if (id.startsWith('lore_')) {
    const idx = parseInt(id.slice(5));
    return { icon: '🗣️', title: 'Fragment ' + toRoman(idx + 1), cat: 'lore' };
  }
  return null;
}

function unlockCodexEntry(id) {
  if (codexUnlocked.has(id)) return;
  codexUnlocked.add(id);
  codexNew.add(id);
  saveCodex();
  const entry = findCodexEntry(id);
  if (entry) showCodexToast(entry);
}

function showCodexToast(entry) {
  const toast = $('badge-toast');
  if (!toast) return;
  toast.innerHTML = `<span class="badge-toast-icon">📖</span> <span class="badge-toast-text">Codex Updated: ${entry.title}</span>`;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3200);
}

function getCodexEntriesForCat(cat) {
  if (cat === 'bestiary') return CODEX_BESTIARY_DATA;
  if (cat === 'biomes')   return CODEX_BIOME_DATA;
  if (cat === 'runes') return GLYPH_RUNES.map(r => ({
    id: 'rune_' + r.id, icon: r.symbol, cat: 'runes', title: r.name, text: r.desc, lockedTitle: r.name
  }));
  if (cat === 'lore') return NPC_LORE.map((text, i) => ({
    id: 'lore_' + i, icon: '🗣️', cat: 'lore',
    title: 'Fragment ' + toRoman(i + 1),
    text,
    lockedTitle: 'Unknown Fragment'
  }));
  return [];
}

function renderCodexContent(cat) {
  const container = $('codex-entries');
  const progress  = $('codex-progress');
  if (!container || !progress) return;
  container.innerHTML = '';

  const entries  = getCodexEntriesForCat(cat);
  const found    = entries.filter(e => codexUnlocked.has(e.id)).length;
  progress.textContent = `${found} / ${entries.length} discovered`;

  for (const entry of entries) {
    const isUnlocked = codexUnlocked.has(entry.id);
    const isNew      = codexNew.has(entry.id);
    const div = document.createElement('div');
    div.className = 'codex-entry' + (isUnlocked ? ' codex-entry-unlocked' : ' codex-entry-locked');
    if (isUnlocked) {
      div.innerHTML = `
        <div class="codex-entry-body">
          <div class="codex-glyph-badge">${entry.icon}</div>
          <div class="codex-entry-content">
            <div class="codex-entry-header">
              <span class="codex-entry-title">${entry.title}</span>
              ${isNew ? '<span class="codex-new-badge">NEW</span>' : ''}
            </div>
            <div class="codex-entry-text">${entry.text}</div>
          </div>
        </div>`;
    } else {
      div.innerHTML = `
        <div class="codex-entry-body">
          <div class="codex-glyph-badge" style="opacity:0.25;font-size:20px">❓</div>
          <div class="codex-entry-content">
            <div class="codex-entry-header">
              <span class="codex-entry-title codex-locked-title">${entry.lockedTitle || '???'}</span>
            </div>
            <div class="codex-entry-text codex-locked-text">Not yet discovered.</div>
          </div>
        </div>`;
    }
    container.appendChild(div);
  }
}

let codexActiveCat = 'bestiary';

function showCodexOverlay() {
  codexActiveCat = 'bestiary';
  setActiveCodexTab('bestiary');
  renderCodexContent('bestiary');
  inputLocked = true;
  $('codex-overlay').classList.add('active');
}

function closeCodexOverlay() {
  codexNew.clear();
  saveCodex();
  $('codex-overlay').classList.remove('active');
  inputLocked = false;
}

function setActiveCodexTab(cat) {
  document.querySelectorAll('.codex-tab').forEach(btn => {
    btn.classList.toggle('codex-tab-active', btn.dataset.cat === cat);
  });
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
  { id: 'ber_mastery',  trigger: 'win_berserker',  name: 'Berserker Mastery',   desc: 'All Berserkers start with +3 max HP',     classReq: 'berserker',  bonus: { maxHp: 3 } },
  { id: 'rog_mastery',  trigger: 'win_rogue',      name: 'Rogue Mastery',       desc: 'All Rogues start with +5% crit chance',   classReq: 'rogue',      bonus: { critChance: 0.05 } },
  { id: 'ran_mastery',  trigger: 'win_ranger',     name: 'Ranger Mastery',      desc: 'Rangers start with Hunting Bow',          classReq: 'ranger',     bonus: { upgradeBow: true } },
  { id: 'cle_mastery',  trigger: 'win_cleric',     name: 'Cleric Mastery',      desc: 'All Clerics start with +3 max HP',        classReq: 'cleric',     bonus: { maxHp: 3 } },
  { id: 'dw_mastery',   trigger: 'win_darkwizard', name: 'Dark Wizard Mastery', desc: 'All Dark Wizards start at 12% necromancy', classReq: 'darkwizard', bonus: { necroBonus: 0.04 } },
  { id: 'ea_mastery',   trigger: 'win_escapeartist', name: 'Escape Artist Mastery', desc: 'All Escape Artists get 2 Escape Route uses/floor', classReq: 'escapeartist', bonus: { extraEscape: true } },
  { id: 'conj_mastery', trigger: 'win_conjurer',   name: 'Conjurer Mastery',    desc: 'All Conjurers start with Illusion cooldown 6 instead of 8', classReq: 'conjurer', bonus: { fastIllusion: true } },
  { id: 'monk_mastery', trigger: 'win_monk',       name: 'Monk Mastery',        desc: 'All Monks gain +1 DEF',                   classReq: 'monk',       bonus: { defense: 1 } },
  { id: 'bm_mastery',   trigger: 'win_beastmaster',name: 'Beastmaster Mastery', desc: 'All Beastmasters start with +3 max HP',   classReq: 'beastmaster',bonus: { maxHp: 3 } },
  { id: 'elem_mastery', trigger: 'win_elementalist', name: 'Elementalist Mastery', desc: 'Vial of Slime cooldown 8 instead of 10', classReq: 'elementalist', bonus: { fastVial: true } },
  { id: 'veteran',      trigger: 'ascendant',      name: 'Veteran',             desc: 'All classes start with +1 max HP',        classReq: null,         bonus: { maxHp: 1 } },
  { id: 'slayer',       trigger: 'exterminator',   name: 'Seasoned Slayer',     desc: 'All classes start with +1 ATK',           classReq: null,         bonus: { attack: 1 } },
  { id: 'rune_adept',   trigger: 'rune_collector', name: 'Rune Adept',          desc: '1st floor rune is always revealed on map', classReq: null,        bonus: { revealRune: true } },
];

function loadMastery() {
  try {
    masteryState = JSON.parse(localStorage.getItem(MASTERY_PREFIX) || '{}');
    const validMasteryIds = new Set(MASTERY_DEFS.map(m => m.id));
    masteryState = Object.fromEntries(Object.entries(masteryState).filter(([id]) => id.startsWith('_') || validMasteryIds.has(id)));
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
  const bonuses = { maxHp: 0, attack: 0, defense: 0, critChance: 0, charmBonus: 0, necroBonus: 0, upgradeBow: false, revealRune: false, fastFlip: false, extraEscape: false, fastIllusion: false, fastVial: false, startGold: 0 };
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
    if (m.bonus.fastVial) bonuses.fastVial = true;
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
  if (floor >= 13) unlockBadge('maze_master');
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
    id: 'berserker',
    name: 'Berserker',
    icon: '🪖', img: 'images/berserker.png',
    flavor: 'Hits hard but burns through food. Rage sharpens at the brink.',
    hp: 22, attack: 4, defense: 0,
    hungerRate: 1.5, dodgeBonus: 0, critChance: 0.10,
    passive: '⚡ Rage: +3 ATK below 40% HP · 🍖 1.5× hunger',
    startItems: 'Short Sword · 2× Strength Potions',
    statBadges: [{ label: '22 HP', cls: 'pos' }, { label: '+4 ATK', cls: 'pos' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: '1.5× Hungry', cls: 'neg' }, { label: 'Rage Mode', cls: 'pos' }, { label: '⚡ Enrage/floor', cls: 'pos' }]
  },
  {
    id: 'escapeartist', name: 'Escape Artist', icon: '💨', img: 'images/escape-artist.png',
    flavor: 'Leave nothing behind but ice and regrets. Acrobatic and evasive.',
    hp: 12, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0.20, critChance: 0.15,
    passive: '❄️ Ice Traps on retreat · 💥 Ricochet · 💨 Escape Route',
    startItems: 'Leather Vest · Invis Potion · 6 Throwing Daggers',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '20% Dodge', cls: 'pos' }, { label: 'Ricochet', cls: 'pos' }, { label: '💨 Escape', cls: 'pos' }]
  },
  {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹', img: 'images/ranger.png',
    flavor: 'Survivalist and sharpshooter. Sees further, forages better.',
    hp: 13, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0.05, critChance: 0.15,
    passive: '👁 +2 FOV · Forager',
    startItems: 'Short Bow · 50 Arrows · 4 Throwing Daggers · Ration',
    statBadges: [{ label: '13 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '+2 FOV', cls: 'pos' }, { label: 'Forager', cls: 'pos' }, { label: '🏹 Aimed Shot', cls: 'pos' }]
  },
  {
    id: 'rogue',
    name: 'Rogue',
    icon: '🥷', img: 'images/rogue.png',
    flavor: 'Fragile but precise. Evades blows and lands deadly strikes.',
    hp: 10, attack: 3, defense: 1,
    hungerRate: 1, dodgeBonus: 0.15, critChance: 0.20,
    passive: '👁 15% Dodge · 20% Crit · 🦶 Roundhouse Kick (Lv 5)',
    startItems: '6 Throwing Daggers · Invis Potion',
    statBadges: [{ label: '10 HP', cls: 'neg' }, { label: '+3 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: '15% Dodge', cls: 'pos' }, { label: '20% Crit', cls: 'pos' }, { label: '🦶 Lv 5 Kick', cls: 'pos' }]
  },
  {
    id: 'cleric',
    name: 'Cleric',
    icon: '⛪', img: 'images/cleric.png',
    flavor: 'Holy warrior. Undead fear the faithful. Heals through devotion.',
    hp: 18, attack: 2, defense: 1,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '✝ Holy Aura vs Undead · Weaken + Divine Heal',
    startItems: 'Mace · Healing Potion · Scroll of Identify',
    statBadges: [{ label: '18 HP', cls: 'pos' }, { label: '+2 ATK', cls: '' }, { label: '+1 DEF', cls: 'pos' }],
    passBadges: [{ label: 'Holy Aura', cls: 'pos' }, { label: 'No Curse', cls: 'pos' }, { label: '✝ Weaken', cls: 'pos' }]
  },
  {
    id: 'conjurer', name: 'Conjurer', icon: '🎭', img: 'images/conjurer.png',
    flavor: 'Weaves phantoms from thin air, armed with all the answers.',
    hp: 12, attack: 2, defense: 0,
    hungerRate: 1, dodgeBonus: 0.10, critChance: 0.10,
    passive: '📖 All items identified · ✨ Arcane Dart · 🎭 Illusion',
    startItems: 'Scroll of Mapping · Healing Potion',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+2 ATK', cls: '' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Omniscient', cls: 'pos' }, { label: '✨ Dart', cls: 'pos' }, { label: '🎭 Illusion', cls: 'pos' }]
  },
  {
    id: 'darkwizard', name: 'Dark Wizard', icon: '💀', img: 'images/dark-wizard.png',
    flavor: 'Frail but fearsome. Magic doubles in your hands, and the dead serve you.',
    hp: 10, attack: 1, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '✨ Arcane Affinity: scrolls ×2 · 💀 Necromance',
    startItems: 'Arcane Staff · 3 identified scrolls · Healing Potion',
    statBadges: [{ label: '10 HP', cls: 'neg' }, { label: '+1 ATK', cls: 'neg' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Arcane ×2', cls: 'pos' }, { label: 'Necromance', cls: 'pos' }, { label: '💀 Acid/Blast', cls: 'pos' }]
  },
  {
    id: 'elementalist', name: 'Elementalist', icon: '🧪', img: 'images/elementalist.png',
    flavor: 'A volatile caster who turns the battlefield into a hazard zone.',
    hp: 12, attack: 1, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '🧪 Elemental Immune · Bump = Acid-Soaked · ⚡ Thunderclap',
    startItems: 'Rusty Dagger · Healing Potion · Scroll of Mapping',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+1 ATK', cls: 'neg' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Elem. Immune', cls: 'pos' }, { label: '🟢 Vial', cls: 'pos' }, { label: '⚡ Thunderclap', cls: 'pos' }]
  },
  {
    id: 'beastmaster', name: 'Beastmaster', icon: '🐺',
    flavor: 'Never hunts alone. A loyal hound fights continuously by your side.',
    hp: 12, attack: 1, defense: 0,
    hungerRate: 1, dodgeBonus: 0, critChance: 0.10,
    passive: '🐺 Permanent Hound Companion · ♻ Rapid Regeneration · 🐾 Beast Charm',
    startItems: 'Leather Vest · Healing Potion',
    statBadges: [{ label: '12 HP', cls: '' }, { label: '+1 ATK', cls: 'neg' }, { label: '0 DEF', cls: '' }],
    passBadges: [{ label: 'Loyal Pet', cls: 'pos' }, { label: 'Regen', cls: 'pos' }, { label: '🐾 Beast Charm', cls: 'pos' }]
  },
  {
    id: 'monk', name: 'Monk', icon: '📿',
    flavor: 'Requires no steel. Fists, focus, and inner stillness replace all gear.',
    hp: 12, attack: 0, defense: 0,
    hungerRate: 1, dodgeBonus: 0.10, critChance: 0.15,
    passive: '🥋 ATK/DEF scale with level · 🧘 Meditate · 🌊 Walk on Water',
    startItems: 'Healing Potion · Enchanted Lute',
    statBadges: [{ label: '12 HP', cls: '' }, { label: 'Scales', cls: 'pos' }, { label: 'Scales', cls: 'pos' }],
    passBadges: [{ label: 'Unarmed', cls: 'pos' }, { label: '25% Charm', cls: 'pos' }, { label: '🌊 Water Walk', cls: 'pos' }]
  }
];

// Preloaded Image objects for classes with custom artwork (keyed by img path)
const classImageCache = {};
function preloadClassImages() {
  for (const cls of CLASS_DEFS) {
    if (cls.img && !classImageCache[cls.img]) {
      const img = new Image();
      img.src = cls.img;
      classImageCache[cls.img] = img;
    }
  }
}

const LEGACY_CLASS_REMAP = {
  adventurer: 'beastmaster',
  wizard: 'darkwizard',
  sage: 'conjurer',
  ninja: 'rogue',
  daredevil: 'escapeartist',
  bard: 'monk'
};

const VALID_CLASS_IDS = new Set(CLASS_DEFS.map(cls => cls.id));

function normalizeClassId(classId) {
  const mapped = LEGACY_CLASS_REMAP[classId] || classId;
  return VALID_CLASS_IDS.has(mapped) ? mapped : 'berserker';
}

function getClassDef(classId) {
  const normalizedId = normalizeClassId(classId);
  return CLASS_DEFS.find(c => c.id === normalizedId) || CLASS_DEFS[0];
}

function isMonkRestrictedItem(item) {
  return item && ['weapon', 'armor', 'ranged'].includes(item.itemType);
}

function normalizeLoadedPlayer(player) {
  if (!player) return;
  player.classId = normalizeClassId(player.classId);
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!Array.isArray(player.statusEffects)) player.statusEffects = [];
  if (!player.equipped) player.equipped = { weapon: null, armor: null, ring: null, ranged: null };
  player.infiniteArrows = false;
  player.songMastery = player.classId === 'monk' ? true : !!player.songMastery;
  player.meditateCooldown = Math.max(0, player.meditateCooldown || 0);
  player.arcaneDartCooldown = Math.max(0, player.arcaneDartCooldown || 0);
  player.weakenCooldown = Math.max(0, player.weakenCooldown || 0);
  player.roundhouseKick = player.classId === 'rogue';
  player.charmChance = player.classId === 'monk' ? (player.charmChance || 0.25) : (player.classId === 'beastmaster' ? (player.charmChance || 0) : 0);
  player.hasRegen = player.classId === 'beastmaster' ? true : !!player.hasRegen;
  player.arcaneAffinity = player.classId === 'darkwizard';
  player.sageClass = player.classId === 'conjurer';
  player.scrollMastery = player.classId === 'conjurer';
  player.teleportSight = ['rogue', 'escapeartist'].includes(player.classId);
  player.manaShield = false;
  player.fireWard = false;
  player.fireWardCooldown = 0;
  player.masterSmith = false;
  player.tinkerFloorUsed = false;
  player.bartererDiscount = false;
  player.bartererFreeRefresh = false;
  player.bartererAppraiseUsed = false;
  player.silentKill = false;
  player.rampart = false;
  player.recklessCharge = false;
  player.sharpDealer = false;
  player.encore = false;
  player.backstab = false;
  // Elementalist
  player.poisonImmune = player.classId === 'elementalist';
  player.acidImmune = player.classId === 'elementalist';
  player.fireImmune = player.classId === 'elementalist';
  player.vialOfSlimeCooldown = Math.max(0, player.vialOfSlimeCooldown || 0);
  player.thunderclapCooldown = Math.max(0, player.thunderclapCooldown || 0);
  player.chainLightning = !!player.chainLightning;
  if (!player.classState) {
    player.classState = { haggledThisFloor: false, appraisedThisFloor: false, floorKills: 0, iceTraps: [], fortifiedThisFloor: false, illusionEntity: null };
  }
  if (player.classId === 'ranger' && (!Number.isFinite(player.arrows) || player.arrows <= 0)) {
    player.arrows = 50;
  }
  if (player.classId === 'monk') {
    player.equipped.weapon = null;
    player.equipped.armor = null;
    player.equipped.ranged = null;
  }
}

function ensureMonkInstrument(player) {
  if (!player || player.classId !== 'monk') return;
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const hasInstrument = player.inventory.some(it => it.itemType === 'instrument');
  if (!hasInstrument) {
    player.inventory.push({ name: 'Enchanted Lute', glyph: '🎸', itemType: 'instrument', desc: 'Play songs to create magical effects.', indestructible: true, value: 30 });
  }
}

function ensureBeastmasterHound() {
  if (!state || !state.player || state.player.classId !== 'beastmaster') return;
  const hasHound = state.entities.some(e => e.type === 'enemy' && e.isAlly && e.beastmasterHound);
  if (hasHound) return;
  const hound = createEnemy({
    name: 'Hound',
    glyph: '🐺',
    hp: Math.floor(15 + state.floor * 2),
    attack: Math.floor(3 + state.floor * 0.5),
    defense: Math.floor(1 + state.floor * 0.2),
    ai: 'ally',
    xp: 0,
    special: null,
    detect: 8
  }, state.player.x, state.player.y);
  hound.isAlly = true;
  hound.ai = 'ally';
  hound.allyTurns = 99999;
  hound.beastmasterHound = true;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (const [dx, dy] of dirs) {
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    if (isWalkable(nx, ny) && !entityAt(nx, ny)) {
      hound.x = nx;
      hound.y = ny;
      break;
    }
  }
  state.entities.push(hound);
}


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
  preloadClassImages();
  loadSettings();
  loadBadges();
  loadCodex();
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

  // Show "Saved Games" button — always visible when Firebase is configured,
  // otherwise only when local saves exist.
  const savesBtn = $('btn-saves-from-title');
  if (savesBtn) {
    savesBtn.style.display = (hasSavedGames() || isFirebaseConfigured()) ? '' : 'none';
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
      const isLocked = (cls.id === 'monk' || cls.id === 'beastmaster') && !hasBadge('maze_master');
      
      const card = document.createElement('div');
      card.className = 'class-card' + (isLocked ? ' locked-class' : '');
      
      if (isLocked) {
        card.innerHTML = `
          <div class="class-icon" style="filter: grayscale(1); opacity: 0.5;">🔒</div>
          <div class="class-name" style="color: #666;">Locked Class</div>
          <div class="class-flavor" style="color: #555;">Reach maze floor 13 to unlock.</div>
        `;
      } else {
        card.innerHTML = `
          <div class="class-icon">${cls.img ? `<img src="${cls.img}" class="class-img" alt="${cls.name}">` : cls.icon}</div>
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
      }
      
      const selectFn = () => {
        if (isLocked) return;
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

  // Arrow key navigation for class pager
  function classKeyNav(e) {
    if (!$('title-screen') || !$('title-screen').classList.contains('active') || $('class-section').style.display === 'none') return;
    if (e.key === 'ArrowRight' && currentPage < pages.length - 1) { goToPage(currentPage + 1); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft' && currentPage > 0) { goToPage(currentPage - 1); e.preventDefault(); e.stopPropagation(); }
  }
  document.addEventListener('keydown', classKeyNav);
  pager._classKeyNav = classKeyNav;

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
    Audio.resume();
    $('title-screen').classList.remove('active');
    $('title-screen').classList.remove('class-mode');
    newRun(selectedClass);
  };
  beginBtn.onclick = startRun;
  beginBtn.ontouchend = (e) => { e.preventDefault(); startRun(); };
}

// === NEW RUN ===
function newRun(classId = 'berserker') {
  classId = normalizeClassId(classId);
  setupCanvas();
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
    peakHp: getClassDef(classId).hp || 15,
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
  const className = getClassDef(classId).name || 'Berserker';
  // Welcome messages with player name and class
  addMessage(`${state.playerName} ${state.playerEpithet} ${className} descends into the Shards of the Unknown.`, 'gold');
  const activeMasteries = getActiveMasteries(classId);
  if (activeMasteries.length > 0) {
    addMessage(`Mastery bonuses: ${activeMasteries.map(m => m.name).join(', ')}`, 'gold');
  }
  addMessage('Bump enemies to attack. Tap items in the bar to Equip/Use/Drop.', '');
  generateFloor();
  Audio.startAmbient(getBiomeKey(state.floor));
  updateUI();
  render();
  inputLocked = true;
  showFloorCard(state.floor, getBiomeKey(state.floor), () => {
    inputLocked = false;
  });
}

function createPlayer(classId = 'berserker') {
  classId = normalizeClassId(classId);
  const cls = getClassDef(classId);
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
    infiniteArrows: false,
    loadedSpecialArrow: null, // reference to special arrow item in inventory
    runes: [], // collected glyph runes for this run
    statusEffects: [],
    hasRegen: classId === 'beastmaster',
    pathfinder: false, // always see stairs on minimap (removed Adventurer)
    hasVampire: false,
    ironSkin: false,
    hasFury: false,
    glassCannon: false,
    // Class-specific perk flags
    shadowStep: false,
    undyingFury: false,
    undyingFuryUsed: false,
    quickDraw: false,
    sanctifiedGround: false,
    survivorInstinct: false,
    necroticSurge: false,
    recklessCharge: false,
    smokeScreen: false,
    merchantPurchaseCount: 0,
    arcaneAffinity: classId === 'darkwizard',
    dodgeBonus: cls.dodgeBonus,
    critChance: cls.critChance,
    hungerRate: cls.hungerRate,
    regenCounter: 0,
    turnsSurvived: 0,
    // Class special abilities
    enrageActive: false,
    engageTurnsLeft: 0,
    enrageFloorUsed: false,
    // Ranger
    fovBonus: classId === 'ranger' ? 2 : 0,
    aimedShotCooldown: 0,
    // Cleric
    divineHealUsed: false,
    weakenCooldown: 0,
    curseImmune: classId === 'cleric',
    drainImmune: false, // granted by shrine sacrifice
    // Monk
    charmChance: classId === 'monk' ? 0.25 : 0,
    encore: false,
    songMastery: classId === 'monk',
    meditateCooldown: 0,
    masterSmith: false,
    roundhouseKick: classId === 'rogue',
    // Dark Wizard
    necromancer: classId === 'darkwizard',
    necroBonus: 0,
    acidBoltCooldown: 0,
    // Escape Artist & Daredevil legacy
    ricochetMelee: classId === 'escapeartist',
    stairsTeleportFloorUsed: false,
    escapeRouteUsesFloor: 0,
    iceTrapPassive: classId === 'escapeartist',
    // Conjurer
    illusionCooldown: 0,
    arcaneDartCooldown: 0,
    mirrorImage: false,
    // Ranger double shot perk
    doubleShot: false,
    // Teleport sight
    teleportSight: ['rogue', 'escapeartist'].includes(classId),
    wallTrap: null,
    webSlowSkip: false,
    moundSlowPending: false,
    enchantedImmunityRoomIdx: -1,
    // Conjurer (Sage legacy)
    sageClass: classId === 'conjurer',
    scrollMastery: classId === 'conjurer',
    ancientTongue: false,
    // Elementalist
    poisonImmune: classId === 'elementalist',
    acidImmune: classId === 'elementalist',
    fireImmune: classId === 'elementalist',
    vialOfSlimeCooldown: 0,
    thunderclapCooldown: 0,
    chainLightning: false,
    // Soul Amulet
    soulFragments: 0,
    defPurchases: 0, // Sage shop: tracks escalating +1 DEF cost
    // Per-floor class ability state (reset each floor in playerDescend)
    classState: {
      haggledThisFloor: false,
      appraisedThisFloor: false,
      floorKills: 0,
      iceTraps: [],
      fortifiedThisFloor: false,
      illusionEntity: null
    }
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
  if (m.necroBonus > 0) { p.necroBonus = (p.necroBonus || 0) + m.necroBonus; }
  if (m.startGold > 0)  { p.gold += m.startGold; }
}

function applyClassStartingItems(classId) {
  const p = state.player;
  if (classId === 'berserker') {
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
  } else if (classId === 'ranger') {
    const bowName = getMasteryBonuses(classId).upgradeBow ? 'Hunting Bow' : 'Short Bow';
    p.equipped.ranged = { ...RANGED_WEAPONS.find(r => r.name === bowName) };
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 4 });
    p.inventory.push({ ...FOOD, stack: 1 });
    p.arrows = 50;
  } else if (classId === 'cleric') {
    p.equipped.weapon = { name: 'Mace', glyph: '🔨', itemType: 'weapon', attack: 2, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
    const identifyScroll = scrollNames.find(n => n.id === 'identify');
    if (identifyScroll) {
      scrollIdentified[identifyScroll.id] = true;
      p.inventory.push(makeScroll(identifyScroll));
    }
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
        p.inventory.push(makeScroll(s));
      }
    }
  } else if (classId === 'escapeartist') {
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    p.inventory.push({ name: 'Throwing Daggers', glyph: '🗡️', itemType: 'thrown', damage: 3, ammo: 6 });
    const invisPotion = potionNames.find(n => n.id === 'invisibility');
    if (invisPotion) { potionIdentified[invisPotion.id] = true; p.inventory.push(makePotion(invisPotion)); }
  } else if (classId === 'conjurer') {
    // Conjurer starts with all items identified
    for (const pn of potionNames) potionIdentified[pn.id] = true;
    for (const sn of scrollNames) scrollIdentified[sn.id] = true;
    const mapScroll = scrollNames.find(n => n.id === 'mapping');
    if (mapScroll) {
      p.inventory.push(makeScroll(mapScroll));
    }
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'monk') {
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
    p.inventory.push({ name: 'Enchanted Lute', glyph: '🎸', itemType: 'instrument', desc: 'Play songs to create magical effects.', indestructible: true, value: 30 });
  } else if (classId === 'beastmaster') {
    const armor = ARMORS.find(a => a.name === 'Leather Vest');
    if (armor) p.equipped.armor = { ...armor };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
  } else if (classId === 'elementalist') {
    p.equipped.weapon = { name: 'Rusty Dagger', glyph: '🗡️', itemType: 'weapon', attack: 1, tier: 1, special: null };
    const healPotion = potionNames.find(n => n.id === 'healing');
    if (healPotion) { potionIdentified[healPotion.id] = true; p.inventory.push(makePotion(healPotion)); }
    const mapScroll = scrollNames.find(n => n.id === 'mapping');
    if (mapScroll) { scrollIdentified[mapScroll.id] = true; p.inventory.push(makeScroll(mapScroll)); }
  }
}

// === POTION / SCROLL NAME RANDOMIZATION ===
const POTION_COLORS = [
  { name: 'Fizzy Red Potion', glyph: '🧪', color: '#ff4444' },
  { name: 'Thick Blue Potion', glyph: '🧪', color: '#4488ff' },
  { name: 'Glowing Green Potion', glyph: '🧪', color: '#44ff44' },
  { name: 'Murky Purple Potion', glyph: '🧪', color: '#aa44ff' },
  { name: 'Shimmering Gold Potion', glyph: '🧪', color: '#ffcc00' },
  { name: 'Pale White Potion', glyph: '🧪', color: '#dddddd' },
  { name: 'Swirling Teal Potion', glyph: '🧪', color: '#11cccc' }
];

const SCROLL_LABELS = [
  'Scroll labeled XYZZY', 'Scroll labeled LOREM', 'Scroll labeled FOOBAR',
  'Scroll labeled ZELGO', 'Scroll labeled KRUNK', 'Scroll labeled NIMHE',
  'Scroll labeled QUUX', 'Scroll labeled PLUGH', 'Scroll labeled WXYZZ'
];

const POTION_EFFECTS = [
  { id: 'healing', name: 'Potion of Healing', desc: 'Restores 10 HP' },
  { id: 'strength', name: 'Potion of Strength', desc: '+2 Attack for 30 turns' },
  { id: 'invisibility', name: 'Potion of Invisibility', desc: 'Invisible for 15 turns' },
  { id: 'poison', name: 'Potion of Poison', desc: 'Lose 3 HP/turn for 5 turns' },
  { id: 'experience', name: 'Potion of Experience', desc: 'Gain 20 XP' },
  { id: 'teleport', name: 'Potion of Teleportation', desc: 'Random relocation' },
  { id: 'walk_on_water', name: 'Potion of Walk on Water', desc: 'Walk on water for 30 turns' }
];

const SCROLL_EFFECTS = [
  { id: 'mapping', name: 'Scroll of Mapping', desc: 'Reveal entire floor' },
  { id: 'fireball', name: 'Scroll of Fireball', desc: '8 damage to nearby enemies' },
  { id: 'enchant', name: 'Scroll of Enchant', desc: '+1 to equipped weapon' },
  { id: 'confusion', name: 'Scroll of Confusion', desc: 'Confuse visible enemies' },
  { id: 'identify', name: 'Scroll of Identify', desc: 'Identify an item type' },
  { id: 'summon', name: 'Scroll of Summoning', desc: 'Summon a golem ally' },
  { id: 'remove_curse', name: 'Scroll of Remove Curse', desc: 'Uncurse all equipped items' },
  { id: 'create_food', name: 'Scroll of Create Food', desc: 'Conjure two rations' },
  { id: 'walk_on_water', name: 'Scroll of Walk on Water', desc: 'Walk on water for 45 turns' }
];

function randomizePotionScrollNames() {
  const pc = shuffle([...POTION_COLORS]);
  const sl = shuffle([...SCROLL_LABELS]);
  potionNames = POTION_EFFECTS.map((e, i) => {
    const c = pc[i % pc.length];
    return { ...e, fakeName: c.name, color: c.color };
  });
  scrollNames = SCROLL_EFFECTS.map((e, i) => ({ ...e, fakeName: sl[i % sl.length] }));
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
  { name: 'Ring of Hunger', glyph: '💍', itemType: 'ring', special: 'hunger', value: 45 },
  { name: 'Ring of Detection', glyph: '💍', itemType: 'ring', special: 'detection', value: 55, desc: 'Reveals secret walls and hidden objects' },
  { name: 'Soul Amulet', glyph: '📿', itemType: 'ring', special: 'soul', desc: 'Collects soul fragments from kills. Spend for powerful effects.', value: 30 }
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

// === CODEX DATA ===
const CODEX_BESTIARY_DATA = [
  { id: 'bestiary_rat',              icon: '🐀', cat: 'bestiary', title: 'Sewer Rat',          text: 'Once pets of Erathis\'s inhabitants, warped by ambient rune energy into lean scavengers. They flee when wounded — a rare show of wisdom in these depths.' },
  { id: 'bestiary_skeleton',         icon: '💀', cat: 'bestiary', title: 'Skeleton',            text: 'Bone and iron will, sustained by patrol glyphs carved into their ribs. The runes remember their purpose long after the mind has dissolved.' },
  { id: 'bestiary_bat',              icon: '🦇', cat: 'bestiary', title: 'Bat',                 text: 'Drawn to glyph resonance, they navigate halls where silence is rare. Erratic and quick — kill them before they call others.' },
  { id: 'bestiary_slime',            icon: '🟢', cat: 'bestiary', title: 'Slime',               text: 'A colony of cells unified by terrible hunger. Cutting one in half doesn\'t reduce its appetite — it doubles it. The runes prevent them from ever fully dying.' },
  { id: 'bestiary_goblin',           icon: '👺', cat: 'bestiary', title: 'Goblin',              text: 'Former scavengers who found the depths profitable and stopped leaving. Cunning, greedy, surprisingly resilient. They learned to navigate the runes. Now they enforce them.' },
  { id: 'bestiary_ghost',            icon: '👻', cat: 'bestiary', title: 'Ghost',               text: 'The restless dead who refused the Crypt\'s hospitality. Phase-shifted by unresolved purpose, they drift through walls searching for something they\'ve forgotten they lost.' },
  { id: 'bestiary_spider',           icon: '🕷️', cat: 'bestiary', title: 'Spider',              text: 'Cave spiders grew enormous in the dark and learned patience. Their webs are woven from crystallized silence — step in one and the world goes very, very quiet.' },
  { id: 'bestiary_ogre',             icon: '👹', cat: 'bestiary', title: 'Ogre',                text: 'The dungeon\'s groundskeepers, kept loyal by choice glyphs. Strong enough to move rubble, too dim to ask questions. The runes gave them duty and took their doubts.' },
  { id: 'bestiary_wraith',           icon: '🌑', cat: 'bestiary', title: 'Wraith',              text: 'Creatures of pure hunger — life-draining echoes that have forgotten everything but the cold. They weep as they kill. The tears are the worst part.' },
  { id: 'bestiary_mimic',            icon: '📦', cat: 'bestiary', title: 'Mimic',               text: 'Items that absorbed too much ambient glyph energy and developed appetite. Not malice — just terrible, fundamental loneliness expressed through teeth.' },
  { id: 'bestiary_necromancer',      icon: '☠️', cat: 'bestiary', title: 'Necromancer',         text: 'Aldric\'s former students who believed they could master death. They learned too well. Now they animate the dead out of academic habit and professional despair.' },
  { id: 'bestiary_demon',            icon: '😈', cat: 'bestiary', title: 'Demon',               text: 'Born when Aldric drove flame runes into living rock. Each leaves embers in its wake — not as a weapon, but a signature. They consider it art.' },
  { id: 'bestiary_dark_knight',      icon: '🗡️', cat: 'bestiary', title: 'Dark Knight',        text: 'The Citadel\'s honor guard. Their armor is fused to their bones. They cannot remove it. They cannot stop fighting. They follow orders carved into their marrow.' },
  { id: 'bestiary_banshee',          icon: '👻', cat: 'bestiary', title: 'Banshee',             text: 'Every shriek is a death replayed — not a weapon but a memory. The wail is the precise moment they died, echoing in corridors that learned to carry grief.' },
  { id: 'bestiary_hydra',            icon: '🐉', cat: 'bestiary', title: 'Hydra',               text: 'A garden snake before the runes found it. Each piece remembers the whole. The whole remembers only hunger.' },
  { id: 'bestiary_warlock',          icon: '🧙', cat: 'bestiary', title: 'Warlock',             text: 'Sorcerers who bargained for rune power and received too much of it. They flee because the power burns and they dare not stop moving.' },
  { id: 'bestiary_shadow_stalker',   icon: '🕶️', cat: 'bestiary', title: 'Shadow Stalker',     text: 'Assassins who traded their shadow for speed. The shadow kept hunting independently. Now they are both hunter and hunted.' },
  { id: 'bestiary_abyssal_fiend',    icon: '👿', cat: 'bestiary', title: 'Abyssal Fiend',       text: 'Something that seeped through rune fractures. It burns because it comes from a realm where burning is simply the natural state of all things.' },
  { id: 'bestiary_void_wraith',      icon: '🌀', cat: 'bestiary', title: 'Void Wraith',         text: 'A Wraith that fell into the Abyss and found nothing to anchor to. It drains life to confirm that solid things still exist somewhere in creation.' },
  { id: 'bestiary_elder_mimic',      icon: '📦', cat: 'bestiary', title: 'Elder Mimic',         text: 'Old enough to have forgotten it was ever an object. It has perfected the art of being a room. You may have walked through one already.' },
  { id: 'bestiary_arch_lich',        icon: '☠️', cat: 'bestiary', title: 'Arch Lich',           text: 'Aldric\'s first apprentice, fully consumed. He collects spellbooks with the casual cruelty of a child collecting beetles — for a work he\'ll never finish.' },
  { id: 'bestiary_phantom_assassin', icon: '🗝️', cat: 'bestiary', title: 'Phantom Assassin',   text: 'Rogues who found the depths comfortable and stopped leaving. They strike from angles that don\'t exist, from silence that shouldn\'t be able to hold a shape.' },
  { id: 'bestiary_cave_troll',       icon: '🧌', cat: 'bestiary', title: 'Cave Troll',          text: 'The city\'s blacksmith before the fall. Aldric\'s runes gave him impossible strength and took his mind. He regenerates because the runes refuse a craftsman\'s death.' },
  { id: 'bestiary_lich',             icon: '🧿', cat: 'bestiary', title: 'Lich',                text: 'Aldric\'s second apprentice, who understood death better than his master. He sits on the eighth floor collecting souls like footnotes — for a work he\'ll never finish.' },
  { id: 'bestiary_balrog',           icon: '👿', cat: 'bestiary', title: 'Balrog',              text: 'Born when Aldric drove the Glyph of Flame into the earth itself. The fire took shape and found one purpose: burning everything that isn\'t fire.' },
  { id: 'bestiary_void_titan',       icon: '🌀', cat: 'bestiary', title: 'Void Titan',          text: 'Not created by Aldric — it seeped through rune fractures from the space between words. It drains because that is all that space can do.' },
  { id: 'bestiary_glyph_guardian',   icon: '⚔️', cat: 'bestiary', title: 'Glyph Guardian',     text: 'The last defense before the throne. Not a warrior — a lock. Its entire existence is the act of preventing passage. What it guards against, it has forgotten.' },
  { id: 'bestiary_glyph_king',       icon: '👑', cat: 'bestiary', title: 'Glyph King',          text: 'Once a mortal scribe named Aldric who carved the first rune into living stone and heard it scream a language older than speech. He collected all twelve. He became the dungeon.' },
];

const CODEX_BIOME_DATA = [
  { id: 'biome_sewers',  icon: '🚧', cat: 'biomes', title: 'The Sewers',      lockedTitle: 'The Sewers',      text: 'The drowned foundations of Erathis. Once a vibrant city, pulled underground stone by stone as Aldric\'s runes rewrote the laws of what belonged above and what belonged below.' },
  { id: 'biome_crypt',   icon: '💀', cat: 'biomes', title: 'The Crypt',        lockedTitle: 'The Crypt',        text: 'The Crypt was not built — it grew. Every adventurer who dies here adds another corridor, another empty room. The dead are patient architects with no other appointments.' },
  { id: 'biome_citadel', icon: '🏰', cat: 'biomes', title: 'The Citadel',      lockedTitle: 'The Citadel',      text: 'Runed armor lines the halls. The Citadel\'s knights still remember their orders after centuries. Duty encoded in glyph energy outlasts flesh, mind, and meaning.' },
  { id: 'biome_abyss',   icon: '🌀', cat: 'biomes', title: 'The Abyss',        lockedTitle: 'The Abyss',        text: 'A wound in the earth where the runes tore too deep. Reality thins here. The darkness is not empty — it watches. Even the Glyph King fears what seeps in from below.' },
  { id: 'biome_sanctum', icon: '✨', cat: 'biomes', title: 'The Sanctum',      lockedTitle: 'The Sanctum',      text: 'Crystalline walls hum with glyph energy. Beautiful, silent, perfect. A throne room designed for a god who was once a mortal scribe with a chisel and impossible ambitions.' },
  { id: 'biome_throne',  icon: '👑', cat: 'biomes', title: 'The Throne Room',  lockedTitle: 'The Throne Room',  text: 'The final floor. The Glyph King waits in perfect silence — not a creature guarding his domain, but the domain itself. The walls pulse with his heartbeat. The floors shift with his breathing.' },
];

// Rune tile type — we'll use a special entity, not a tile type, to avoid changing T constants
// Rune entities: { type: 'rune', x, y, glyph: '✦', rune: GLYPH_RUNES[i] }

// === SPECIALTY ITEMS ===
const SPECIALTY_ITEMS = {
  lantern: { name: 'Enchanted Lantern', glyph: '🔦', itemType: 'ring', special: 'lantern', value: 55, desc: 'Equip as ring. Use Oil Flasks to fuel (+3 FOV while lit)' },
  oil: { name: 'Oil Flask', glyph: '🛢️', itemType: 'oil', value: 8, desc: 'Fuel for Enchanted Lantern (+20 turns of light)' },
  soulAmulet: { name: 'Soul Amulet', glyph: '📿', itemType: 'ring', special: 'soul', value: 60, desc: 'Collect soul fragments from kills. Spend 5 to heal 10 HP' },
  mortar: { name: "Alchemist's Mortar", glyph: '🧪', itemType: 'mortar', value: 40, desc: 'Combine 3 herbs to brew a random potion' },
  herb: { name: 'Cave Herb', glyph: '🌿', itemType: 'herb', value: 3, desc: 'Ingredient for brewing. Collect 3 + mortar to brew a potion' }
};

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
    { name: 'Ogre', glyph: '👹', hp: 15, attack: 4, defense: 2, ai: 'chase', xp: 12, special: 'slow', detect: 6 },
    { name: 'Cave Lurker', glyph: '🦎', hp: 6, attack: 4, defense: 0, ai: 'ambush', xp: 9, special: 'ambush_strike', detect: 5 },
    { name: 'River Shade', glyph: '🌊', hp: 9, attack: 3, defense: 1, ai: 'patrol', xp: 10, special: 'aquatic', detect: 7 },
    { name: 'Echo Bat', glyph: '🦇', hp: 4, attack: 2, defense: 0, ai: 'wander', xp: 7, special: 'echo_alert', detect: 6 },
    { name: 'Blind Stalker', glyph: '👁', hp: 12, attack: 4, defense: 1, ai: 'chase', xp: 11, special: 'blind', detect: 10 }
  ],
  3: [
    { name: 'Wraith', glyph: '🌑', hp: 10, attack: 5, defense: 1, ai: 'chase', xp: 15, special: 'drain', detect: 8 },
    { name: 'Mimic', glyph: '📦', hp: 12, attack: 4, defense: 3, ai: 'ambush', xp: 18, special: 'mimic', detect: 3 },
    { name: 'Necromancer', glyph: '☠️', hp: 8, attack: 2, defense: 1, ai: 'flee', xp: 20, special: 'summon', detect: 8 },
    { name: 'Demon', glyph: '😈', hp: 18, attack: 5, defense: 3, ai: 'chase', xp: 22, special: 'fire_trail', detect: 7 },
    { name: 'Orb-Weaver', glyph: '🕷️', hp: 16, attack: 4, defense: 2, ai: 'wander', xp: 20, special: 'web_spinner', detect: 5, slowMove: true }
  ],
  4: [
    { name: 'Dark Knight', glyph: '🗡️', hp: 25, attack: 7, defense: 4, ai: 'chase', xp: 28, special: null, detect: 8 },
    { name: 'Banshee', glyph: '👻', hp: 14, attack: 6, defense: 1, ai: 'chase', xp: 25, special: 'phase', detect: 9 },
    { name: 'Hydra', glyph: '🐉', hp: 30, attack: 5, defense: 3, ai: 'chase', xp: 32, special: 'split', detect: 7 },
    { name: 'Warlock', glyph: '🧙', hp: 16, attack: 4, defense: 2, ai: 'flee', xp: 30, special: 'summon', detect: 9 },
    { name: 'Shadow Stalker', glyph: '🕶️', hp: 16, attack: 6, defense: 2, ai: 'ambush', xp: 26, special: 'stealth', detect: 6 }
  ],
  5: [
    { name: 'Abyssal Fiend', glyph: '👿', hp: 35, attack: 8, defense: 5, ai: 'chase', xp: 40, special: 'fire_trail', detect: 10 },
    { name: 'Void Wraith', glyph: '🌀', hp: 20, attack: 7, defense: 2, ai: 'chase', xp: 38, special: 'drain', detect: 10 },
    { name: 'Elder Mimic', glyph: '📦', hp: 28, attack: 6, defense: 5, ai: 'ambush', xp: 35, special: 'mimic', detect: 4 },
    { name: 'Arch Lich', glyph: '☠️', hp: 22, attack: 5, defense: 3, ai: 'flee', xp: 45, special: 'summon', detect: 10 },
    { name: 'Phantom Assassin', glyph: '🗝️', hp: 24, attack: 9, defense: 3, ai: 'ambush', xp: 42, special: 'stealth', detect: 5 }
  ]
};

const BOSS = {
  name: 'Glyph King', glyph: '👑', hp: 100, attack: 10, defense: 6,
  ai: 'boss', xp: 200, special: 'boss', detect: 50
};

// Mini-bosses guard milestone floors
const MINI_BOSSES = {
  4:  { name: 'Cave Troll',    glyph: '🧌', hp: 22, attack: 5, defense: 3, ai: 'chase', xp: 30, special: 'troll_regen', detect: 8 },
  8:  { name: 'Cavern Wyrm',   glyph: '🐍', hp: 24, attack: 4, defense: 3, ai: 'chase', xp: 40, special: 'aquatic',     detect: 9 },
  12: { name: 'Lich',          glyph: '🧿', hp: 28, attack: 3, defense: 2, ai: 'flee',  xp: 45, special: 'summon',      detect: 10 },
  16: { name: 'Balrog',        glyph: '👿', hp: 35, attack: 7, defense: 4, ai: 'chase', xp: 60, special: 'fire_trail',  detect: 9 },
  20: { name: 'Void Titan',    glyph: '🌀', hp: 45, attack: 8, defense: 5, ai: 'chase', xp: 80, special: 'drain',      detect: 10 },
  23: { name: 'Glyph Guardian', glyph: '⚔️', hp: 55, attack: 9, defense: 6, ai: 'chase', xp: 90, special: 'boss',      detect: 12 },
};

// Water monsters — spawn directly on water tiles in the Caverns biome (floors 5–8)
const WATER_ENEMIES = [
  { name: 'River Leech', glyph: '🐛', hp: 6,  attack: 2, defense: 0, ai: 'chase',  xp: 7,  special: 'aquatic', detect: 4 },
  { name: 'Mud Lurker',  glyph: '🐊', hp: 12, attack: 4, defense: 1, ai: 'ambush', xp: 14, special: 'aquatic', detect: 5 },
];

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
  state.steppingStoneMessageShown = false;

  if (state.floor === MAX_FLOOR) {
    generateBossFloor();
  } else {
    generateBSP();
    // Carve water features on Caverns floors (5-8)
    if (state.floor >= 5 && state.floor <= 8) {
      carveWaterFeatures();
    }
  }

  // Announce biome when entering a new region — lore-flavored messages
  const BIOME_ENTRY = {
    1: 'The drowned foundations of Erathis. Water drips from stone that remembers sunlight.',
    5: 'Water rushes through ancient cracks. Something vast moves beneath the surface.',
    9: 'The air turns cold. Corridors stretch in directions the dead have chosen.',
    13: 'Runed armor lines the walls. The Citadel\'s knights still remember their orders.',
    17: 'Reality thins. The darkness here is not empty — it watches.',
    21: 'Crystalline walls hum with glyph energy. The Sanctum is beautiful. It is also a trap.',
  };
  BIOME_ENTRY[MAX_FLOOR] = 'The throne room. The Glyph King waits in perfect silence.';
  if (BIOME_ENTRY[state.floor]) {
    const biome = getFloorBiome(state.floor);
    addMessage(`${biome.name}: ${BIOME_ENTRY[state.floor]}`, 'gold');
    unlockCodexEntry(biomeCodexId(state.floor));
  }


  // Place stairs down (except boss floor)
  if (state.floor < MAX_FLOOR) {
    const farthestRoom = getFarthestRoom(p.x, p.y);
    if (farthestRoom) {
      let sx = farthestRoom.x + Math.floor(farthestRoom.w / 2);
      let sy = farthestRoom.y + Math.floor(farthestRoom.h / 2);
      // If center is water/stepping stone, find nearest non-water floor tile in the room
      if (getTile(sx, sy) === T.WATER || getTile(sx, sy) === T.STEPPING_STONE) {
        let found = false;
        outer: for (let dy = 0; dy < farthestRoom.h; dy++) {
          for (let dx = 0; dx < farthestRoom.w; dx++) {
            const cx = farthestRoom.x + dx, cy = farthestRoom.y + dy;
            const t = getTile(cx, cy);
            if (t === T.FLOOR || t === T.CORRIDOR) { sx = cx; sy = cy; found = true; break outer; }
          }
        }
        if (!found) { sx = farthestRoom.x; sy = farthestRoom.y; } // fallback to corner
      }
      setTile(sx, sy, T.STAIRS_DOWN);
    }
    // One-way doors must run after stairs are placed (needs valid stair pos)
    // and after player position is set (needs valid player pos for BFS).
    addOneWayDoors();
  }

  // Spawn enemies
  spawnEnemies();
  guaranteeLargeRoomEnemies();

  // Spawn items
  spawnItems();

  // Place ghost from previous run
  if (state.ghost && state.ghost.floor === state.floor) {
    placeGhost();
  }

  // Merchant on floors 3, 7, 11, 15, 19, 23 (24-floor dungeon)
  if ([3, 7, 11, 15, 19, 23].includes(state.floor)) {
    spawnMerchant();
    addMessage("There's a merchant somewhere around here...", 'good');
  }

  // Sage on floors 2, 6, 10, 14, 18, 22 (uncurse, identify, heal)
  if ([2, 6, 10, 14, 18, 22].includes(state.floor)) {
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
  state.masonWalls = new Map();
  // Escape Artist: reset escape route each floor
  state.player.stairsTeleportFloorUsed = false;
  state.player.escapeRouteUsesFloor = 0;

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

  // Special terrain features
  spawnWaterfalls();
  spawnMounds();
  spawnIcyPaths();
  spawnFirePaths();
  spawnChasms();
  spawnEnchantedWalls();

  // Avalanche event (25% chance on floors 4+, never boss floor)
  if (state.floor >= 4 && state.floor < MAX_FLOOR && Math.random() < 0.25) {
    triggerAvalanche();
  }

  // Bonus wing on floors 6, 10, 16, 22
  if ([6, 10, 16, 22].includes(state.floor)) {
    generateBonusWing();
  }

  // Tavern on floors 9, 14, 18
  if ([9, 14, 18].includes(state.floor)) {
    spawnTavern();
  }

  // Spawn a glyph rune on each floor (from pool of runes player hasn't collected yet)
  spawnGlyphRune();

  ensureBeastmasterHound();

  computeFOV();
  render();
}

function generateBSP() {
  const root = { x: 1, y: 1, w: MAP_W - 2, h: MAP_H - 2, left: null, right: null, room: null };
  splitNode(root, 0);
  createRooms(root);

  // Add occasional Enchanted Room (Task 4)
  if (Math.random() < 0.25) { 
    const validRooms = state.rooms.filter(r => r.w >= 4 && r.h >= 4);
    if (validRooms.length > 0) {
      const r = validRooms[Math.floor(Math.random() * validRooms.length)];
      if (r !== state.rooms[0]) {
        r.isEnchanted = true;
        for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
          for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
            if (Math.random() < 0.15) setTile(x, y, T.ENCHANTED_WALL);
          }
        }
      }
    }
  }

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
      if (t === T.WALL || t === T.DOOR_SEALED || t === T.RUBBLE || t === T.WALL_SECRET || t === T.STALAGMITE) continue;
      q.push([nx, ny]);
    }
  }
  return false;
}

// Stricter BFS that also excludes one-way doors and locked doors.
// Used for avalanche validation where we need to be certain the path is walkable.
function bfsReachableStrict(sx, sy, tx, ty) {
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
      if (t === T.WALL || t === T.DOOR_SEALED || t === T.RUBBLE || t === T.WALL_SECRET || t === T.DOOR_ONEWAY || t === T.DOOR_LOCKED || t === T.STALAGMITE) continue;
      q.push([nx, ny]);
    }
  }
  return false;
}

// === WATER FEATURE CARVING (Caverns biome, floors 5-8) ===
function carveWaterFeatures() {
  const p = state.player;

  // 1. River: carve a winding strip of WATER from one edge to another
  // Only convert WALL tiles — never FLOOR or CORRIDOR
  const startEdge = Math.floor(Math.random() * 4); // 0=top,1=bottom,2=left,3=right
  let rx, ry;
  if (startEdge === 0)      { rx = 2 + Math.floor(Math.random() * (MAP_W - 4)); ry = 1; }
  else if (startEdge === 1) { rx = 2 + Math.floor(Math.random() * (MAP_W - 4)); ry = MAP_H - 2; }
  else if (startEdge === 2) { rx = 1; ry = 2 + Math.floor(Math.random() * (MAP_H - 4)); }
  else                      { rx = MAP_W - 2; ry = 2 + Math.floor(Math.random() * (MAP_H - 4)); }

  // Destination: opposite edge area
  let gx, gy;
  if (startEdge === 0)      { gx = 2 + Math.floor(Math.random() * (MAP_W - 4)); gy = MAP_H - 2; }
  else if (startEdge === 1) { gx = 2 + Math.floor(Math.random() * (MAP_W - 4)); gy = 1; }
  else if (startEdge === 2) { gx = MAP_W - 2; gy = 2 + Math.floor(Math.random() * (MAP_H - 4)); }
  else                      { gx = 1; gy = 2 + Math.floor(Math.random() * (MAP_H - 4)); }

  // Drunk-walk river, only converting WALL tiles
  const waterTiles = new Set();
  let cx = rx, cy = ry;
  for (let step = 0; step < 200; step++) {
    // Convert 1x2 strip
    for (let ow = -1; ow <= 0; ow++) {
      const wx = cx + (startEdge < 2 ? ow : 0);
      const wy = cy + (startEdge >= 2 ? ow : 0);
      if (wx > 0 && wx < MAP_W - 1 && wy > 0 && wy < MAP_H - 1) {
        if (getTile(wx, wy) === T.WALL) {
          setTile(wx, wy, T.WATER);
          waterTiles.add(wy * MAP_W + wx);
        }
      }
    }
    if (cx === gx && cy === gy) break;
    // Trend toward goal with some drift
    const ddx = gx - cx, ddy = gy - cy;
    const r = Math.random();
    if (r < 0.6) {
      // Move toward goal
      if (Math.abs(ddx) >= Math.abs(ddy)) cx += Math.sign(ddx);
      else cy += Math.sign(ddy);
    } else if (r < 0.8) {
      // Perpendicular drift
      if (Math.abs(ddx) >= Math.abs(ddy)) cy += (Math.random() < 0.5 ? 1 : -1);
      else cx += (Math.random() < 0.5 ? 1 : -1);
    } else {
      // Move toward goal on both axes
      if (ddx !== 0) cx += Math.sign(ddx);
      if (ddy !== 0) cy += Math.sign(ddy);
    }
    cx = Math.max(1, Math.min(MAP_W - 2, cx));
    cy = Math.max(1, Math.min(MAP_H - 2, cy));
  }

  // 2. Bridges: where WATER crosses a CORRIDOR, place a BRIDGE
  for (const idx of waterTiles) {
    const bx = idx % MAP_W, by = Math.floor(idx / MAP_W);
    // Check if removing this WATER would restore corridor connectivity
    for (const [ddx, ddy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const adjTile = getTile(bx + ddx, by + ddy);
      if (adjTile === T.CORRIDOR || adjTile === T.FLOOR) {
        setTile(bx, by, T.BRIDGE);
        waterTiles.delete(idx);
        break;
      }
    }
  }

  // 3. Validate connectivity: player must reach stairs
  let stx = -1, sty = -1;
  outer: for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (getTile(x, y) === T.STAIRS_DOWN) { stx = x; sty = y; break outer; }
    }
  }
  // If stairs haven't been placed yet, use farthest room center as proxy
  if (stx < 0 && state.rooms.length > 0) {
    const far = state.rooms[state.rooms.length - 1];
    stx = far.x + Math.floor(far.w / 2);
    sty = far.y + Math.floor(far.h / 2);
  }

  if (stx >= 0 && !bfsReachable(p.x, p.y, stx, sty)) {
    // Connectivity broken — add bridges on all remaining WATER tiles adjacent to walkable
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (getTile(x, y) !== T.WATER) continue;
        for (const [ddx, ddy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const adj = getTile(x + ddx, y + ddy);
          if (adj === T.FLOOR || adj === T.CORRIDOR || adj === T.BRIDGE) {
            setTile(x, y, T.BRIDGE);
            break;
          }
        }
      }
    }
  }

  // 3b. Bridge spans: convert water tiles that bridge two walkable areas (river crossings only).
  // Scan rows and columns for contiguous water strips flanked by walkable tiles on both ends.
  // Max span of 6 prevents bridging across the lake (added in step 4).
  const MAX_BRIDGE_SPAN = 6;
  // Horizontal spans
  for (let hy = 1; hy < MAP_H - 1; hy++) {
    let hx = 1;
    while (hx < MAP_W - 1) {
      if (getTile(hx, hy) !== T.WATER) { hx++; continue; }
      const spanStart = hx;
      while (hx < MAP_W - 1 && (getTile(hx, hy) === T.WATER || getTile(hx, hy) === T.BRIDGE)) hx++;
      const spanLen = hx - spanStart;
      const leftOk = spanStart > 0 && isWalkable(spanStart - 1, hy);
      const rightOk = hx <= MAP_W - 1 && isWalkable(hx, hy);
      if (leftOk && rightOk && spanLen <= MAX_BRIDGE_SPAN) {
        for (let bx = spanStart; bx < hx; bx++) {
          if (getTile(bx, hy) === T.WATER) setTile(bx, hy, T.BRIDGE);
        }
      }
    }
  }
  // Vertical spans
  for (let vx = 1; vx < MAP_W - 1; vx++) {
    let vy = 1;
    while (vy < MAP_H - 1) {
      if (getTile(vx, vy) !== T.WATER) { vy++; continue; }
      const spanStart = vy;
      while (vy < MAP_H - 1 && (getTile(vx, vy) === T.WATER || getTile(vx, vy) === T.BRIDGE)) vy++;
      const spanLen = vy - spanStart;
      const topOk = spanStart > 0 && isWalkable(vx, spanStart - 1);
      const botOk = vy <= MAP_H - 1 && isWalkable(vx, vy);
      if (topOk && botOk && spanLen <= MAX_BRIDGE_SPAN) {
        for (let by = spanStart; by < vy; by++) {
          if (getTile(vx, by) === T.WATER) setTile(vx, by, T.BRIDGE);
        }
      }
    }
  }

  // 4. Lake room: pick one room (not the player's starting room, not the farthest room)
  const farthestForLake = getFarthestRoom(p.x, p.y);
  const eligibleRooms = state.rooms.filter(r => {
    const cx2 = r.x + Math.floor(r.w / 2), cy2 = r.y + Math.floor(r.h / 2);
    const isStart = (Math.abs(cx2 - p.x) + Math.abs(cy2 - p.y)) < 3;
    const isFarthest = farthestForLake && r === farthestForLake;
    return !isStart && !isFarthest && r.w >= 5 && r.h >= 5;
  });
  if (eligibleRooms.length > 0) {
    const lakeRoom = eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)];
    const stones = [];
    // Flood interior (exclude 1-tile border) with WATER, scatter stepping stones
    for (let ly = lakeRoom.y + 1; ly < lakeRoom.y + lakeRoom.h - 1; ly++) {
      for (let lx = lakeRoom.x + 1; lx < lakeRoom.x + lakeRoom.w - 1; lx++) {
        if (getTile(lx, ly) === T.FLOOR) {
          if (Math.random() < 0.12) {
            setTile(lx, ly, T.STEPPING_STONE);
            stones.push({ x: lx, y: ly });
          } else {
            setTile(lx, ly, T.WATER);
          }
        }
      }
    }
    // Ensure at least 3 stepping stones
    if (stones.length < 3) {
      for (let ly = lakeRoom.y + 1; ly < lakeRoom.y + lakeRoom.h - 1 && stones.length < 3; ly++) {
        for (let lx = lakeRoom.x + 1; lx < lakeRoom.x + lakeRoom.w - 1 && stones.length < 3; lx++) {
          if (getTile(lx, ly) === T.WATER) {
            setTile(lx, ly, T.STEPPING_STONE);
            stones.push({ x: lx, y: ly });
          }
        }
      }
    }
    // Place an item on one stepping stone
    if (stones.length > 0) {
      const st = stones[Math.floor(Math.random() * stones.length)];
      const lakeItem = generateRandomItem(state.floor);
      if (lakeItem) state.entities.push(createItemEntity(lakeItem, st.x, st.y));
    }
  }

  // 5. Stalagmites: in 2-3 rooms, place 2-4 STALAGMITE tiles at random FLOOR positions
  const stagRooms = shuffle([...state.rooms]).slice(0, 2 + Math.floor(Math.random() * 2));
  for (const sRoom of stagRooms) {
    const count = 2 + Math.floor(Math.random() * 3);
    const midX = sRoom.x + Math.floor(sRoom.w / 2);
    const midY = sRoom.y + Math.floor(sRoom.h / 2);
    let placed = 0;
    for (let attempt = 0; attempt < 30 && placed < count; attempt++) {
      const sx = sRoom.x + 1 + Math.floor(Math.random() * (sRoom.w - 2));
      const sy = sRoom.y + 1 + Math.floor(Math.random() * (sRoom.h - 2));
      // Don't place at room center or on non-floor tiles
      if (sx === midX && sy === midY) continue;
      if (getTile(sx, sy) !== T.FLOOR) continue;
      // Don't block connectivity — temporarily place and check
      setTile(sx, sy, T.STALAGMITE);
      if (stx >= 0 && !bfsReachable(p.x, p.y, stx, sty)) {
        setTile(sx, sy, T.FLOOR); // revert
      } else {
        placed++;
      }
    }
  }
}

function addOneWayDoors() {
  if (state.floor <= 1 || state.floor >= MAX_FLOOR) return; // Not on first or boss floor

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
  // No upstairs — player can only descend
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
  if (t === T.CHASM) {
    // Chasm is passable only if a bridge entity spans it
    return state.entities.some(e => e.type === 'bridge' && e.x === x && e.y === y && e.hp > 0);
  }
  return t !== T.WALL && t !== T.RUBBLE && t !== T.DOOR_CLOSED && t !== T.DOOR_ONEWAY && t !== T.DOOR_SEALED && t !== T.WALL_SECRET && t !== T.DOOR_LOCKED && t !== T.WATER && t !== T.STALAGMITE && t !== T.WATERFALL;
  // TELEPORT, TELEPORT_VIS, BRIDGE, STEPPING_STONE, MOUND, ICY_PATH, FIRE_PATH are walkable (floor-like)
}

function isTransparent(x, y) {
  const t = getTile(x, y);
  // WATERFALL, CHASM, and WATER are transparent (FOV passes through)
  if (t === T.WATERFALL || t === T.CHASM || t === T.WATER) return true;
  return t !== T.WALL && t !== T.RUBBLE && t !== T.DOOR_CLOSED && t !== T.DOOR_SEALED && t !== T.WALL_SECRET && t !== T.DOOR_LOCKED && t !== T.STALAGMITE;
  // One-way doors are visible (transparent) but handled specially for movement
}

function getFarthestRoom(fromX, fromY) {
  if (!state.rooms || state.rooms.length === 0) return null;
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
function spawnWaterEnemies() {
  // Gather all water tiles that are at least 5 tiles from the player start
  const waterTiles = [];
  for (let wy = 0; wy < MAP_H; wy++) {
    for (let wx = 0; wx < MAP_W; wx++) {
      if (getTile(wx, wy) !== T.WATER) continue;
      if (Math.abs(wx - state.player.x) + Math.abs(wy - state.player.y) <= 5) continue;
      waterTiles.push({ x: wx, y: wy });
    }
  }
  if (waterTiles.length === 0) return;
  const shuffled = shuffle([...waterTiles]);
  const count = Math.min(2, shuffled.length);
  for (let i = 0; i < count; i++) {
    const pos = shuffled[i];
    const template = WATER_ENEMIES[Math.floor(Math.random() * WATER_ENEMIES.length)];
    state.entities.push(createEnemy(template, pos.x, pos.y));
  }
}

function spawnEnemies() {
  if (state.floor === MAX_FLOOR) return; // Boss already placed
  // Spawn mini-boss on milestone floors
  if (MINI_BOSSES[state.floor]) spawnMiniBoss();
  // Spawn water monsters on Caverns floors
  if (state.floor >= 5 && state.floor <= 8) spawnWaterEnemies();
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

// Guarantee at least one enemy in every large room (area >= 72 tiles).
// Runs after spawnEnemies() so it only fills rooms left empty by the normal pass.
// Caps extra spawns to avoid flooding early floors.
function guaranteeLargeRoomEnemies() {
  if (state.floor === MAX_FLOOR) return;
  const LARGE_ROOM_AREA = 72; // ~9×8 tiles — noticeably spacious
  // Max extras: scales gently with floor so early levels stay manageable
  const maxExtra = state.floor <= 3 ? 2 : state.floor <= 6 ? 3 : 99;
  const floorConfig = getFloorConfig(state.floor);
  const tier = floorConfig.tier;
  const templates = ENEMY_TIERS[tier] || ENEMY_TIERS[1];
  let extraSpawned = 0;

  for (const room of state.rooms) {
    if (extraSpawned >= maxExtra) break;
    if (room.w * room.h < LARGE_ROOM_AREA) continue;

    // Check if any enemy is already inside this room
    const hasEnemy = state.entities.some(e =>
      e.type === 'enemy' && e.hp > 0 &&
      e.x >= room.x && e.x < room.x + room.w &&
      e.y >= room.y && e.y < room.y + room.h
    );
    if (hasEnemy) continue;

    // Collect valid spawn tiles inside the room
    const candidates = [];
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        if (getTile(rx, ry) !== T.FLOOR) continue;
        if (enemyAt(rx, ry)) continue;
        // Keep a 3-tile buffer from the player
        if (Math.abs(rx - state.player.x) <= 3 && Math.abs(ry - state.player.y) <= 3) continue;
        candidates.push({ x: rx, y: ry });
      }
    }
    if (candidates.length === 0) continue;

    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];
    state.entities.push(createEnemy(template, pos.x, pos.y));
    extraSpawned++;
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
  // Deeper mechanical hints
  "A shade of a scholar reads from nothing: \"Sealed doors cost blood but never kill. The glyphs are cruel but not murderous. A fine distinction when you are bleeding.\"",
  "A ghostly lookout warns: \"Enemies near doors are more dangerous than enemies in open rooms. Corners are where heroes die. Fight in wide spaces.\"",
  "A spectral healer sighs: \"Shrines ask for sacrifice. Always sacrifice what you can afford to lose. Gold buys gear. HP buys survival. Know which you need more.\"",
  "A pale hunter advises: \"Rangers who hoard arrows survive. Rangers who waste them do not. Even infinite quivers run dry against the King.\"",
  "A ghost in armor rattles: \"Defense is arithmetic. Each point of DEF subtracts from every hit. At high DEF, weak enemies cannot hurt you. Stack it.\"",
  "A spirit taps the wall: \"Not all walls are solid. Bump them. Listen. Some crumble. Behind them: gold, potions, sometimes something worse.\"",
  // More class-specific lore
  "A shade of a ninja whispers: \"The shadow arts are simple: strike first, strike hard, vanish. If you are seen, you are already slower than you should be.\"",
  "A translucent mason pats a wall: \"I built walls to survive. The enemies built corridors to hunt. We were both architects of our own fate.\"",
  "A spectral conjurer laughs: \"My illusions fooled even me eventually. I forgot which version of myself was real. The dungeon remembers, but it won't tell.\"",
  "A ghost of a daredevil grins: \"Flipping over enemies is not bravery. It is geometry. They swing where you were. You land where they aren't.\"",
  "A pale escape artist murmurs: \"I could always find the stairs. The problem was what stood between me and them. Speed is survival, not cowardice.\"",
  "A shade of a barterer counts invisible coins: \"Everything has a price. The dungeon sells power for pain. Good barterers know when the price is too high.\"",
  // Environmental and atmospheric
  "A translucent figure traces glyphs on the wall: \"The runes are alive. Not sentient — alive, like moss or coral. They grow where power concentrates. The King is their sun.\"",
  "A ghost stares at its own hands: \"I can see through myself now. Not just my skin — my memories. They are thinning. Soon I will be nothing but an echo of an echo.\"",
  "A shade stands at a crossroads: \"Every corridor is a choice. Left or right. Fight or flee. The dungeon does not judge. It simply remembers.\"",
  "A spectral child draws in the dust: \"The rats in the Sewers are not rats. They are what remains of the city's cats after the runes changed them. Everything changed.\"",
  "A pale figure clutches a broken sword: \"My weapon shattered against the Cave Troll's hide. I fought with my fists after that. I lasted two more floors. Longer than I expected.\"",
  "A wandering shade hums: \"There is music in the deepest floors. Not beautiful music — mathematical music. The runes vibrate at frequencies that rearrange bone.\"",
  "A ghost sits against a wall: \"I have been here so long that I remember when these corridors were streets. When the Sewers were gardens. When the King was just Aldric.\"",
  "A spectral figure examines a crack: \"The Abyss is not below us. The Abyss is beside us. The dungeon is a thin skin over something that has no shape and no patience.\"",
  // Strategy and wisdom
  "A shade of a veteran says: \"Never fight two enemies at once if you can fight them one at a time. Corridors are chokepoints. Use them.\"",
  "A translucent sage advises: \"Hunger is the true enemy. Monsters wound you. Hunger kills you. A ration saved is a floor survived.\"",
  "A ghostly merchant confides: \"The best deals are on floor 3. By floor 15, prices match desperation. Buy early, buy often, buy wisely.\"",
  "A phantom scout warns: \"The minimap lies by omission. It shows where you've been, not what has moved since you left. Clear rooms do not stay clear.\"",
  "A spectral warrior advises: \"Critical hits are luck. Defense is mathematics. Rely on what you can control.\"",
  "A shade recalls: \"I once found three runes on a single floor. The synergy made me invincible. For two floors. Then I met something that didn't care about synergies.\"",
  // Humor and personality
  "A ghost laughs to itself: \"The Glyph King sends his regards. I don't know what that means. I've been saying it for centuries because another ghost told me to.\"",
  "A spectral figure gestures broadly: \"Welcome to the Shards of the Unknown! Population: declining. Amenities: merchants who can't leave and taverns that serve ghost ale. Enjoy your stay.\"",
  "A translucent cook grumbles: \"Rations in this dungeon taste like cardboard soaked in regret. But they keep you alive, so eat them and stop complaining.\"",
  "A shade of a locksmith mutters: \"Bone keys. Who makes keys out of bone? Aldric, that's who. The man was practical in the worst possible way.\"",
  "A ghost waves dismissively: \"Everyone asks how to beat the King. Nobody asks how the King is doing. The answer is: bored, immortal, and rewriting the laws of physics for fun.\"",
  "A pale figure counts on translucent fingers: \"Twenty floors. Five biomes. One king. Zero exits. The math of this place is not in your favor.\"",
  "A spectral poet recites: \"Roses are red, corridors are dark, the Lich took my soul, and the Hydra took my arm.\"",
  // More enemy lore
  "A shade trembles: \"Banshees scream not from rage but from memory. Each wail is the moment of their death, replayed forever. Cover your ears and strike fast.\"",
  "A spectral knight reports: \"Dark Knights were the King's honor guard. Their armor is fused to their bones. They cannot remove it. They cannot stop fighting. Pity them, then kill them.\"",
  "A ghost hides behind a pillar: \"Elder Mimics don't pretend to be chests. They pretend to be rooms. You are standing in one right now. Just kidding. Probably.\"",
  "A wandering shade points: \"Arch Liches collect spellbooks the way children collect beetles. With the same casual cruelty and none of the guilt.\"",
  "A faded ranger whispers: \"Phase enemies walk through walls because the walls are not real to them. To a Phase Wraith, you are the only solid thing. That is why it reaches for you.\"",
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
  const loreIdx = Math.floor(Math.random() * NPC_LORE.length);
  const lore = NPC_LORE[loreIdx];
  state.entities.push({ type: 'npc', x, y, glyph: '🗣️', name: 'Wandering Shade', lore, loreIdx, spoken: false });
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
    visited: false,
    refreshesLeft: 1
  });
}

const SAGE_LORE = [
  '"The labyrinth remembers every soul that passed through it."',
  '"Knowledge costs less than ignorance. Eventually."',
  '"I have uncursed a thousand relics. Each one screamed a different name."',
  '"The deeper you descend, the less the surface will welcome you back."',
  '"Gold means nothing to the dead — and yet they carry it still."',
  '"Not all that descends ascends. The wise accept this early."',
  '"The stairwell ahead breathes. It knows your weight."',
  '"Every curse was once a gift. Someone merely changed their mind."',
];

function showSage(sage) {
  sage.visited = true;
  inputLocked = true;
  Audio.merchant();
  if (!sage._loreSeen) {
    sage._loreSeen = true;
    addMessage('🔮 Sage: ' + SAGE_LORE[Math.floor(Math.random() * SAGE_LORE.length)], '');
  }
  renderSageServices(sage);
  $('sage-overlay').classList.add('active');
}

function renderSageServices(sage) {
  const p = state.player;
  $('sage-gold').textContent = `Your gold: ${p.gold}`;
  const container = $('sage-services');
  container.innerHTML = '';

  // Prices scale with floor depth (+5% per floor)
  const floorMult = 1 + state.floor * 0.05;
  const scalePrice = (base) => Math.floor(base * floorMult);

  // Class-specific base costs
  const isScholar = p.classId === 'darkwizard' || p.classId === 'conjurer';
  const isCleric  = p.classId === 'cleric';
  const UNCURSE_BASE  = isCleric  ? 20 : 30;
  const IDENTIFY_BASE = isScholar ? 8  : 15;
  const HEAL_BASE     = isCleric  ? 12 : 20;
  const BLESS_BASE    = 25;

  const finalPrice = (base) => scalePrice(base);

  const UNCURSE_COST  = getLocalPrice(sage, 'uncurse', finalPrice(UNCURSE_BASE));
  const IDENTIFY_COST = getLocalPrice(sage, 'identify', finalPrice(IDENTIFY_BASE));
  const HEAL_COST     = getLocalPrice(sage, 'heal', finalPrice(HEAL_BASE));
  const BLESS_COST    = getLocalPrice(sage, 'bless', finalPrice(BLESS_BASE));

  if (isScholar || isCleric) {
    const banner = document.createElement('div');
    banner.style.cssText = 'font-size:11px;color:var(--accent);text-align:center;margin-bottom:6px;';
    if (isScholar) banner.textContent = '📜 Scholar pricing';
    else if (isCleric) banner.textContent = '✨ Cleric pricing';
    container.appendChild(banner);
  }

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
        recordLocalPurchase(sage, 'uncurse');
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
          if (inv.itemType === 'potion' && !inv.identified) { potionIdentified[inv.effectId] = true; count++; }
          if (inv.itemType === 'scroll' && !inv.identified) { scrollIdentified[inv.effectId] = true; count++; }
        }
        refreshIdentifiedItems();
        addMessage(`The sage reveals ${count} item${count === 1 ? '' : 's'}!`, 'good');
        Audio.gold();
        recordLocalPurchase(sage, 'identify');
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
        recordLocalPurchase(sage, 'heal');
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

  // Bless: +2 attack for 50 turns
  const alreadyBlessed = hasStatusEffect(p, 'blessed');
  const blessDiv = document.createElement('div');
  blessDiv.className = 'shop-item';
  if (!alreadyBlessed) {
    blessDiv.innerHTML = `<span>⚔️ Bless (+2 Atk, 50 turns)</span><span class="price">${BLESS_COST}💰</span>`;
    blessDiv.addEventListener('click', () => {
      if (p.gold >= BLESS_COST) {
        p.gold -= BLESS_COST;
        applyStatusEffect(p, 'blessed', 50);
        addMessage('The sage blesses your weapon! (+2 Atk, 50 turns)', 'good');
        Audio.gold();
        recordLocalPurchase(sage, 'bless');
        animateEntityFlash(p.x, p.y, '#ffe060');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    blessDiv.innerHTML = `<span style="color:var(--text-dim)">⚔️ Bless</span><span style="color:var(--text-dim)">Already blessed</span>`;
    blessDiv.style.opacity = '0.4';
    blessDiv.style.pointerEvents = 'none';
  }
  container.appendChild(blessDiv);

  // Enchanted Lantern (if player doesn't already have one)
  const hasLantern = p.inventory.some(it => it.itemType === 'lantern');
  const LANTERN_COST = getLocalPrice(sage, 'lantern', finalPrice(35));
  const lanternDiv = document.createElement('div');
  lanternDiv.className = 'shop-item';
  if (!hasLantern) {
    lanternDiv.innerHTML = `<span>🔦 Enchanted Lantern</span><span class="price">${LANTERN_COST}💰</span>`;
    lanternDiv.addEventListener('click', () => {
      if (p.gold >= LANTERN_COST) {
        p.gold -= LANTERN_COST;
        p.inventory.push({ name: 'Enchanted Lantern', glyph: '🔦', itemType: 'lantern', desc: 'Use Oil Flasks to light. +3 FOV when lit.', value: 35, indestructible: true });
        addMessage('You purchase an Enchanted Lantern!', 'good');
        Audio.gold();
        recordLocalPurchase(sage, 'lantern');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    lanternDiv.innerHTML = `<span style="color:var(--text-dim)">🔦 Enchanted Lantern</span><span style="color:var(--text-dim)">Already owned</span>`;
    lanternDiv.style.opacity = '0.4';
    lanternDiv.style.pointerEvents = 'none';
  }
  container.appendChild(lanternDiv);

  // Alchemist's Mortar (if player doesn't already have one)
  const hasMortar = p.inventory.some(it => it.itemType === 'mortar');
  const MORTAR_COST = getLocalPrice(sage, 'mortar', finalPrice(30));
  const mortarDiv = document.createElement('div');
  mortarDiv.className = 'shop-item';
  if (!hasMortar) {
    mortarDiv.innerHTML = `<span>🧪 Alchemist's Mortar</span><span class="price">${MORTAR_COST}💰</span>`;
    mortarDiv.addEventListener('click', () => {
      if (p.gold >= MORTAR_COST) {
        p.gold -= MORTAR_COST;
        p.inventory.push({ name: "Alchemist's Mortar", glyph: '🧪', itemType: 'mortar', desc: 'Combine 2 potions + herb to brew powerful elixirs.', value: 30, indestructible: true });
        addMessage("You purchase an Alchemist's Mortar!", 'good');
        Audio.gold();
        recordLocalPurchase(sage, 'mortar');
        renderSageServices(sage);
        updateUI();
      } else {
        addMessage("Not enough gold.", 'damage');
      }
    });
  } else {
    mortarDiv.innerHTML = `<span style="color:var(--text-dim)">🧪 Alchemist's Mortar</span><span style="color:var(--text-dim)">Already owned</span>`;
    mortarDiv.style.opacity = '0.4';
    mortarDiv.style.pointerEvents = 'none';
  }
  container.appendChild(mortarDiv);

  // +1 Defense (escalating cost per purchase, plus local inflation)
  const DEF_BASE = 15 + (p.defPurchases || 0) * 10;
  const DEF_COST = getLocalPrice(sage, 'defense', finalPrice(DEF_BASE));
  const defDiv = document.createElement('div');
  defDiv.className = 'shop-item';
  defDiv.innerHTML = `<span>🛡️ +1 Defense</span><span class="price">${DEF_COST}💰</span>`;
  defDiv.addEventListener('click', () => {
    if (p.gold >= DEF_COST) {
      p.gold -= DEF_COST;
      p.defense += 1;
      p.defPurchases = (p.defPurchases || 0) + 1;
      addMessage(`The sage hardens your resolve! (+1 DEF, now ${p.defense})`, 'good');
      Audio.gold();
      recordLocalPurchase(sage, 'defense');
      animateEntityFlash(p.x, p.y, '#80b0ff');
      renderSageServices(sage);
      updateUI();
    } else {
      addMessage("Not enough gold.", 'damage');
    }
  });
  container.appendChild(defDiv);

  // Refresh services button
  const REFRESH_COST = getLocalPrice(sage, 'refresh', finalPrice(30));
  const refreshDiv = document.createElement('div');
  refreshDiv.className = 'shop-item';
  if (sage.refreshesLeft > 0) {
    refreshDiv.innerHTML = `<span>🔄 Refresh Services</span><span class="price" style="color:var(--accent)">${REFRESH_COST}💰 (${sage.refreshesLeft} left)</span>`;
    const refreshHandler = () => {
      if (p.gold >= REFRESH_COST) {
        p.gold -= REFRESH_COST;
        recordLocalPurchase(sage, 'refresh');
        sage.refreshesLeft--;
        // Remove blessed status so it can be re-purchased
        p.statusEffects = p.statusEffects.filter(e => e.type !== 'blessed');
        addMessage('The sage prepares fresh incantations!', 'good');
        Audio.gold();
        renderSageServices(sage);
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

  // Buy Ration — base 5 gold, inflates per purchase from this tavern
  const rationPrice = getLocalPrice(tavern, 'ration', 5);
  const rationBtn = document.createElement('button');
  rationBtn.className = 'perk-btn';
  rationBtn.innerHTML = `<div class="perk-name">🍖 Buy Ration (${rationPrice}💰)</div><div class="perk-desc">Add food to your inventory</div>`;
  const rationHandler = () => {
    const cost = getLocalPrice(tavern, 'ration', 5);
    if (p.gold >= cost) {
      if (addFoodToInventory()) {
        p.gold -= cost;
        recordLocalPurchase(tavern, 'ration');
        tavernFeedback('You buy a warm ration.', 'good');
        Audio.gold();
        // Refresh button to show updated price
        rationBtn.innerHTML = `<div class="perk-name">🍖 Buy Ration (${getLocalPrice(tavern, 'ration', 5)}💰)</div><div class="perk-desc">Add food to your inventory</div>`;
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

  // Gamble — base 10 gold, inflates per gamble at this tavern
  const gamblePrice = getLocalPrice(tavern, 'gamble', 10);
  const gambleBtn = document.createElement('button');
  gambleBtn.className = 'perk-btn';
  gambleBtn.innerHTML = `<div class="perk-name">🎲 Gamble (${gamblePrice}💰)</div><div class="perk-desc">50/50: double your bet or lose it</div>`;
  const gambleHandler = () => {
    const cost = getLocalPrice(tavern, 'gamble', 10);
    if (p.gold >= cost) {
      p.gold -= cost;
      recordLocalPurchase(tavern, 'gamble');
      if (Math.random() < 0.5) {
        p.gold += cost * 2;
        tavernFeedback(`You win! The dice favor you. (+${cost * 2} gold)`, 'gold');
        Audio.gold();
      } else {
        tavernFeedback(`You lose... The house always wins. (-${cost} gold)`, 'damage');
        Audio.hit();
      }
      haptic(30);
      gambleBtn.innerHTML = `<div class="perk-name">🎲 Gamble (${getLocalPrice(tavern, 'gamble', 10)}💰)</div><div class="perk-desc">50/50: double your bet or lose it</div>`;
      refreshGold();
    } else {
      tavernFeedback('Not enough gold to gamble.', 'damage');
    }
  };
  gambleBtn.addEventListener('click', gambleHandler);
  gambleBtn.addEventListener('touchend', (e) => { e.preventDefault(); gambleHandler(); }, { passive: false });
  container.appendChild(gambleBtn);

  // Hire Sword — hire a companion ally
  const hasAlly = state.entities.some(e => e.type === 'enemy' && e.isAlly);
  const HIRE_BASE = 40;
  const localHireCost = getLocalPrice(tavern, 'hire', HIRE_BASE);
  const finalHireCost = localHireCost;
  const hireBtn = document.createElement('button');
  hireBtn.className = 'perk-btn';
  const allyHp = Math.floor(10 + state.floor * 2);
  const allyAtk = Math.floor(2 + state.floor);
  hireBtn.innerHTML = `<div class="perk-name">⚔️ Hire Sword (${finalHireCost}💰)</div><div class="perk-desc">${allyHp} HP, ${allyAtk} ATK companion</div>`;
  if (hasAlly) {
    hireBtn.style.opacity = '0.4';
    hireBtn.style.pointerEvents = 'none';
    hireBtn.querySelector('.perk-desc').textContent = 'You already have a companion.';
  }
  const hireHandler = () => {
    if (hasAlly) {
      tavernFeedback('You already have a companion.', 'damage');
      return;
    }
    if (p.gold >= finalHireCost) {
      p.gold -= finalHireCost;
      recordLocalPurchase(tavern, 'hire');
      // Spawn ally near the player
      const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
      let ax = state.player.x, ay = state.player.y;
      for (const [dx, dy] of dirs) {
        const nx = state.player.x + dx, ny = state.player.y + dy;
        if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !allyAt(nx, ny)) { ax = nx; ay = ny; break; }
      }
      state.entities.push({
        type: 'enemy', x: ax, y: ay, glyph: '💂', name: 'Hired Sword',
        hp: allyHp, maxHp: allyHp,
        attack: allyAtk, defense: 1, xp: 0,
        ai: 'chase', alertness: 2, isAlly: true, allyTurns: 999,
        statusEffects: []
      });
      tavernFeedback('A hired sword joins you!', 'good');
      Audio.gold();
      haptic(30);
      hireBtn.style.opacity = '0.4';
      hireBtn.style.pointerEvents = 'none';
      refreshGold();
    } else {
      tavernFeedback('Not enough gold.', 'damage');
    }
  };
  hireBtn.addEventListener('click', hireHandler);
  hireBtn.addEventListener('touchend', (e) => { e.preventDefault(); hireHandler(); }, { passive: false });
  container.appendChild(hireBtn);

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
      items.push({ item: w, price: w.value + (floor >= 13 ? 10 : 0) });
    }
  } else {
    const rangedPool = RANGED_WEAPONS.filter(r => r.tier <= tier);
    if (rangedPool.length > 0) {
      const r = applyFloorBonus({ ...rangedPool[Math.floor(Math.random() * rangedPool.length)] }, floor);
      items.push({ item: r, price: r.value + (floor >= 13 ? 10 : 0) });
    }
  }
  // Arrow bundle
  items.push({ item: { name: '5 Arrows', glyph: '➶', itemType: 'arrows', count: 5, value: 0 }, price: 8 });
  // Food
  items.push({ item: { ...FOOD }, price: 8 });
  // 20% chance merchant stocks an Oil Flask
  if (Math.random() < 0.20) {
    items.push({ item: { name: 'Oil Flask', glyph: '🛢️', itemType: 'oil', desc: 'Fuel for the Enchanted Lantern. +3 FOV.', value: 10 }, price: 10 });
  }
  // 15% chance merchant stocks Herbs (if player has mortar)
  if (state.player && state.player.inventory.some(it => it.itemType === 'mortar') && Math.random() < 0.15) {
    items.push({ item: { name: 'Herb Bundle', glyph: '🌿', itemType: 'herb', desc: 'Combine with potions in the Alchemist\'s Mortar.', value: 5 }, price: 6 });
  }
  // 25% chance merchant stocks a random song
  if (Math.random() < 0.25) {
    const songDef = SONG_DEFS[Math.floor(Math.random() * SONG_DEFS.length)];
    items.push({ item: makeSong(songDef), price: songDef.value });
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
// Never place in the same room as the downstairs
function spawnTeleportTiles() {
  // Find the room containing stairs down
  let stairsRoom = null;
  for (let i = 0; i < state.map.length; i++) {
    if (state.map[i] === T.STAIRS_DOWN) {
      const sx = i % MAP_W, sy = Math.floor(i / MAP_W);
      stairsRoom = state.rooms.find(r => sx >= r.x && sx < r.x + r.w && sy >= r.y && sy < r.y + r.h);
      break;
    }
  }
  const count = 1 + (Math.random() < 0.4 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    for (let attempts = 0; attempts < 50; attempts++) {
      const pos = randomRoomFloorTile();
      if (!pos) break;
      // Reject if in the stairs room
      if (stairsRoom && pos.x >= stairsRoom.x && pos.x < stairsRoom.x + stairsRoom.w &&
          pos.y >= stairsRoom.y && pos.y < stairsRoom.y + stairsRoom.h) continue;
      setTile(pos.x, pos.y, T.TELEPORT);
      break;
    }
  }
}

// === SPECIAL TERRAIN SPAWNERS ===

// Waterfall: impassable FOV-transparent tile that sprays adjacent corridors with wet status.
// Appears on floors 3+ (1-2 per floor). Placed on WALL tiles adjacent to a corridor.
function spawnWaterfalls() {
  if (state.floor < 3 || state.floor >= MAX_FLOOR) return;
  const count = 1 + (Math.random() < 0.4 ? 1 : 0);
  let placed = 0;
  for (let attempts = 0; attempts < 80 && placed < count; attempts++) {
    const x = 1 + Math.floor(Math.random() * (MAP_W - 2));
    const y = 1 + Math.floor(Math.random() * (MAP_H - 2));
    if (getTile(x, y) !== T.WALL) continue;
    // Must have at least one adjacent corridor tile
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const adjCorridor = dirs.some(([dx,dy]) => getTile(x+dx, y+dy) === T.CORRIDOR);
    if (!adjCorridor) continue;
    // Must not be adjacent to player start
    if (Math.abs(x - state.player.x) <= 2 && Math.abs(y - state.player.y) <= 2) continue;
    setTile(x, y, T.WATERFALL);
    placed++;
  }
}

// Mound: passable elevated terrain. Entry costs 2 movement turns; grants +1 FOV and +1 range.
// Appears on floors 2+ in room centers (2-4 per floor).
function spawnMounds() {
  if (state.floor < 2 || state.floor >= MAX_FLOOR) return;
  const count = 2 + Math.floor(Math.random() * 3);
  let placed = 0;
  for (let attempts = 0; attempts < 100 && placed < count; attempts++) {
    const pos = randomRoomFloorTile();
    if (!pos) break;
    if (getTile(pos.x, pos.y) !== T.FLOOR) continue;
    // Not on player or stairs
    if (pos.x === state.player.x && pos.y === state.player.y) continue;
    if (getTile(pos.x, pos.y) === T.STAIRS_DOWN) continue;
    setTile(pos.x, pos.y, T.MOUND);
    placed++;
  }
}

// Icy Path: clusters of 3-5 connected ICY_PATH tiles in Crypt biome (floors 5-8).
// Player slides 1 extra tile in movement direction on entry (unless blocked).
function spawnIcyPaths() {
  if (state.floor < 5 || state.floor > 8 || state.floor >= MAX_FLOOR) return;
  const clusterCount = 1 + Math.floor(Math.random() * 3);
  for (let c = 0; c < clusterCount; c++) {
    // Start from a random corridor or floor tile
    let startPos = null;
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = 2 + Math.floor(Math.random() * (MAP_W - 4));
      const y = 2 + Math.floor(Math.random() * (MAP_H - 4));
      const t = getTile(x, y);
      if (t === T.CORRIDOR || t === T.FLOOR) {
        if (Math.abs(x - state.player.x) > 3 || Math.abs(y - state.player.y) > 3) {
          startPos = { x, y };
          break;
        }
      }
    }
    if (!startPos) continue;
    // Flood-fill up to 5 connected tiles
    const tileCount = 3 + Math.floor(Math.random() * 3);
    const frontier = [startPos];
    const visited = new Set();
    visited.add(startPos.y * MAP_W + startPos.x);
    let count = 0;
    while (frontier.length > 0 && count < tileCount) {
      const idx = Math.floor(Math.random() * frontier.length);
      const cur = frontier.splice(idx, 1)[0];
      const t = getTile(cur.x, cur.y);
      if (t !== T.CORRIDOR && t !== T.FLOOR) continue;
      setTile(cur.x, cur.y, T.ICY_PATH);
      count++;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const key = ny * MAP_W + nx;
        if (!visited.has(key) && nx > 0 && nx < MAP_W-1 && ny > 0 && ny < MAP_H-1) {
          visited.add(key);
          const nt = getTile(nx, ny);
          if (nt === T.CORRIDOR || nt === T.FLOOR) frontier.push({ x: nx, y: ny });
        }
      }
    }
  }
}

// Fire Path: clusters of T.FIRE_PATH tiles in Citadel (9-12) and Abyss (13-16) biomes.
// Deals 1 HP/turn while standing. Extinguished by frozen/ice status.
function spawnFirePaths() {
  if (state.floor < 9 || state.floor > 16 || state.floor >= MAX_FLOOR) return;
  const clusterCount = 1 + Math.floor(Math.random() * 2);
  for (let c = 0; c < clusterCount; c++) {
    let startPos = null;
    for (let attempts = 0; attempts < 50; attempts++) {
      const pos = randomRoomFloorTile();
      if (!pos) break;
      if (getTile(pos.x, pos.y) !== T.FLOOR) continue;
      if (Math.abs(pos.x - state.player.x) > 3 || Math.abs(pos.y - state.player.y) > 3) {
        startPos = pos;
        break;
      }
    }
    if (!startPos) continue;
    const tileCount = 2 + Math.floor(Math.random() * 3);
    const frontier = [startPos];
    const visited = new Set();
    visited.add(startPos.y * MAP_W + startPos.x);
    let count = 0;
    while (frontier.length > 0 && count < tileCount) {
      const idx = Math.floor(Math.random() * frontier.length);
      const cur = frontier.splice(idx, 1)[0];
      if (getTile(cur.x, cur.y) !== T.FLOOR) continue;
      setTile(cur.x, cur.y, T.FIRE_PATH);
      count++;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const key = ny * MAP_W + nx;
        if (!visited.has(key) && nx > 0 && nx < MAP_W-1 && ny > 0 && ny < MAP_H-1) {
          visited.add(key);
          if (getTile(nx, ny) === T.FLOOR) frontier.push({ x: nx, y: ny });
        }
      }
    }
  }
}

// Chasm: impassable void tile in Abyss biome (floors 13-16). FOV-transparent.
// A bridge entity (3 HP) spans it; destroying the bridge makes it permanently impassable.
function spawnChasms() {
  if (state.floor < 13 || state.floor > 16 || state.floor >= MAX_FLOOR) return;
  const count = 1 + (Math.random() < 0.5 ? 1 : 0);
  let placed = 0;
  for (let attempts = 0; attempts < 100 && placed < count; attempts++) {
    // Find a corridor tile that has walkable tiles on both ends to bridge
    const x = 3 + Math.floor(Math.random() * (MAP_W - 6));
    const y = 3 + Math.floor(Math.random() * (MAP_H - 6));
    const t = getTile(x, y);
    if (t !== T.CORRIDOR) continue;
    // Must have walkable tiles on both horizontal or vertical sides
    const hBridge = isWalkable(x-1, y) && isWalkable(x+1, y) &&
                    getTile(x-1, y) !== T.CHASM && getTile(x+1, y) !== T.CHASM;
    const vBridge = isWalkable(x, y-1) && isWalkable(x, y+1) &&
                    getTile(x, y-1) !== T.CHASM && getTile(x, y+1) !== T.CHASM;
    if (!hBridge && !vBridge) continue;
    // Not near player
    if (Math.abs(x - state.player.x) <= 3 && Math.abs(y - state.player.y) <= 3) continue;
    setTile(x, y, T.CHASM);
    // Place bridge entity on the chasm
    state.entities.push({
      type: 'bridge',
      x, y,
      glyph: '═',
      name: 'Stone Bridge',
      hp: 3,
      maxHp: 3
    });
    placed++;
  }
}

// Enchanted Wall: entity on a WALL tile inside a room boundary.
// Teleports to another WALL tile in the room each time player moves in the same room.
function spawnEnchantedWalls() {
  if (state.floor < 3 || state.floor >= MAX_FLOOR) return;
  if (state.rooms.length < 2) return;
  const count = 1;
  // Don't place in the player's starting room
  const playerRoom = state.rooms.find(r =>
    state.player.x >= r.x && state.player.x < r.x + r.w &&
    state.player.y >= r.y && state.player.y < r.y + r.h
  );
  const candidates = state.rooms.filter(r => r !== playerRoom && r.w >= 4 && r.h >= 4);
  if (candidates.length === 0) return;
  let placed = 0;
  for (let c = 0; c < count && placed < count; c++) {
    const room = candidates[Math.floor(Math.random() * candidates.length)];
    // Find wall tiles on the room perimeter
    const wallTiles = [];
    for (let ry = room.y - 1; ry <= room.y + room.h; ry++) {
      for (let rx = room.x - 1; rx <= room.x + room.w; rx++) {
        if (getTile(rx, ry) === T.WALL) wallTiles.push({ x: rx, y: ry });
      }
    }
    if (wallTiles.length === 0) continue;
    const pos = wallTiles[Math.floor(Math.random() * wallTiles.length)];
    state.entities.push({
      type: 'enchanted_wall',
      x: pos.x, y: pos.y,
      glyph: '▓',
      name: 'Enchanted Wall',
      roomIdx: state.rooms.indexOf(room)
    });
    placed++;
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
  // Verify player can still reach downstairs after the avalanche
  if (filled > 0) {
    let sx = -1, sy = -1;
    for (let i = 0; i < state.map.length; i++) {
      if (state.map[i] === T.STAIRS_DOWN) { sx = i % MAP_W; sy = Math.floor(i / MAP_W); break; }
    }
    if (sx >= 0 && !bfsReachableStrict(state.player.x, state.player.y, sx, sy)) {
      // Undo: revert rubble back to floor
      for (const t of tiles) {
        if (getTile(t.x, t.y) === T.RUBBLE) setTile(t.x, t.y, T.FLOOR);
      }
      return; // silently cancel avalanche
    }
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
  unlockCodexEntry('rune_' + rune.id);

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
    1:  { tier: 1, nextTier: null, minEnemies: 2, maxEnemies: 3, minItems: 2, maxItems: 3, food: 2 },
    2:  { tier: 1, nextTier: null, minEnemies: 3, maxEnemies: 4, minItems: 2, maxItems: 3, food: 2 },
    3:  { tier: 1, nextTier: 2,   minEnemies: 4, maxEnemies: 5, minItems: 3, maxItems: 4, food: 2 },
    4:  { tier: 1, nextTier: 2,   minEnemies: 5, maxEnemies: 6, minItems: 3, maxItems: 4, food: 1 },
    // Caverns floors 5-8
    5:  { tier: 2, nextTier: null, minEnemies: 5, maxEnemies: 7, minItems: 3, maxItems: 4, food: 1, caverns: true },
    6:  { tier: 2, nextTier: null, minEnemies: 6, maxEnemies: 8, minItems: 3, maxItems: 4, food: Math.random() < 0.5 ? 1 : 0, caverns: true },
    7:  { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1, caverns: true },
    8:  { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1, caverns: true },
    // Crypt floors 9-12 (was 5-8)
    9:  { tier: 2, nextTier: null, minEnemies: 5, maxEnemies: 7, minItems: 3, maxItems: 4, food: 1 },
    10: { tier: 2, nextTier: null, minEnemies: 6, maxEnemies: 8, minItems: 3, maxItems: 4, food: Math.random() < 0.5 ? 1 : 0 },
    11: { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1 },
    12: { tier: 2, nextTier: 3,   minEnemies: 7, maxEnemies: 9, minItems: 3, maxItems: 4, food: 1 },
    // Citadel floors 13-16 (was 9-12)
    13: { tier: 3, nextTier: null, minEnemies: 7, maxEnemies: 10, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    14: { tier: 3, nextTier: null, minEnemies: 8, maxEnemies: 10, minItems: 2, maxItems: 3, food: 1 },
    15: { tier: 3, nextTier: 4,   minEnemies: 8, maxEnemies: 11, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    16: { tier: 3, nextTier: 4,   minEnemies: 8, maxEnemies: 12, minItems: 2, maxItems: 3, food: 1 },
    // Abyss floors 17-20 (was 13-16)
    17: { tier: 4, nextTier: null, minEnemies: 8, maxEnemies: 12, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    18: { tier: 4, nextTier: null, minEnemies: 9, maxEnemies: 12, minItems: 2, maxItems: 3, food: 1 },
    19: { tier: 4, nextTier: 5,   minEnemies: 9, maxEnemies: 13, minItems: 2, maxItems: 3, food: Math.random() < 0.5 ? 1 : 0 },
    20: { tier: 4, nextTier: 5,   minEnemies: 10, maxEnemies: 14, minItems: 2, maxItems: 3, food: 1 },
    // Sanctum floors 21-23 (was 17-19)
    21: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 14, minItems: 1, maxItems: 2, food: Math.random() < 0.5 ? 1 : 0 },
    22: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 15, minItems: 1, maxItems: 2, food: Math.random() < 0.5 ? 1 : 0 },
    23: { tier: 5, nextTier: null, minEnemies: 10, maxEnemies: 15, minItems: 1, maxItems: 2, food: 1 },
    24: { tier: 5, nextTier: null, minEnemies: 0,  maxEnemies: 0,  minItems: 0, maxItems: 0, food: 0 }
  };
  return configs[floor] || configs[1];
}

// Add floor-scaling bonus to equipment: deeper floors grant +1 ATK/DEF/DMG at certain thresholds
function applyFloorBonus(item, floor) {
  const bonus = floor >= 20 ? 2 : floor >= 13 ? 1 : 0;
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
  if (roll < 0.22) {
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
  } else if (roll < 0.72) {
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
  } else if (roll < 0.975) {
    // Song (rare drop)
    const songDef = SONG_DEFS[Math.floor(Math.random() * SONG_DEFS.length)];
    return makeSong(songDef);
  } else if (roll < 0.985) {
    // Instrument (very rare) — lets non-Bards play songs
    return { name: 'Enchanted Lute', glyph: '🎸', itemType: 'instrument', desc: 'Play songs to create magical effects.', indestructible: true, value: 30 };
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
    if (pool.length > 0) return maybeCurse(applyFloorBonus({ ...pool[Math.floor(Math.random() * pool.length)] }, floor), state.floor);
    return { ...FOOD };
  }
}

// Update ALL existing potion/scroll items in the game to reflect current identification state.
// Called after any identification event (use, Scroll of Identify, Sage Identify All).
function refreshIdentifiedItems() {
  const p = state.player;
  // Inventory
  for (const inv of p.inventory) {
    if (inv.itemType === 'potion' && !inv.identified && potionIdentified[inv.effectId]) {
      inv.name = inv.trueName; inv.identified = true;
      const pe = POTION_EFFECTS.find(e => e.id === inv.effectId);
      if (pe) inv.desc = pe.desc;
    }
    if (inv.itemType === 'scroll' && !inv.identified && scrollIdentified[inv.effectId]) {
      inv.name = inv.trueName; inv.identified = true;
      const se = SCROLL_EFFECTS.find(e => e.id === inv.effectId);
      if (se) inv.desc = se.desc;
    }
  }
  // Ground entities
  for (const e of state.entities) {
    if (e.type === 'item' && e.item) {
      if (e.item.itemType === 'potion' && !e.item.identified && potionIdentified[e.item.effectId]) {
        e.item.name = e.item.trueName; e.item.identified = true;
        const pe = POTION_EFFECTS.find(p => p.id === e.item.effectId);
        if (pe) e.item.desc = pe.desc;
      }
      if (e.item.itemType === 'scroll' && !e.item.identified && scrollIdentified[e.item.effectId]) {
        e.item.name = e.item.trueName; e.item.identified = true;
        const se = SCROLL_EFFECTS.find(s => s.id === e.item.effectId);
        if (se) e.item.desc = se.desc;
      }
    }
    // Merchant shop items
    if (e.type === 'merchant' && e.shopItems) {
      for (const si of e.shopItems) {
        if (si.item.itemType === 'potion' && !si.item.identified && potionIdentified[si.item.effectId]) {
          si.item.name = si.item.trueName; si.item.identified = true;
          const pe = POTION_EFFECTS.find(p => p.id === si.item.effectId);
          if (pe) si.item.desc = pe.desc;
        }
        if (si.item.itemType === 'scroll' && !si.item.identified && scrollIdentified[si.item.effectId]) {
          si.item.name = si.item.trueName; si.item.identified = true;
          const se = SCROLL_EFFECTS.find(s => s.id === si.item.effectId);
          if (se) si.item.desc = se.desc;
        }
      }
    }
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

// === SONG DEFINITIONS ===
const SONG_DEFS = [
  { id: 'courage',  name: 'Song of Courage',  glyph: '🎵', desc: '+1 attack, +1 defense for 20 turns', effectType: 'courage', turns: 20, value: 20 },
  { id: 'lullaby',  name: 'Lullaby',          glyph: '🎵', desc: 'Enemies 30% skip chance for 15 turns', effectType: 'lullaby', turns: 15, value: 22 },
  { id: 'dirge',    name: 'Dirge of Pain',    glyph: '🎵', desc: '1 damage to visible enemies per turn for 10 turns', effectType: 'dirge', turns: 10, value: 25 },
  { id: 'plenty',   name: 'Song of Plenty',   glyph: '🎵', desc: 'Halves hunger consumption for 30 turns', effectType: 'plenty', turns: 30, value: 18 },
];

function makeSong(s) {
  return { name: s.name, glyph: s.glyph, itemType: 'song', songId: s.id, effectType: s.effectType, turns: s.turns, desc: s.desc, value: s.value };
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
  const rangedSightBonus = (state.player.equipped?.ranged?.special === 'sight') ? 1 : 0;
  const lanternBonus = hasStatusEffect(state.player, 'lanternLit') ? 3 : 0;
  const moundBonus = (state.map && getTile(state.player.x, state.player.y) === T.MOUND) ? 1 : 0;
  const radius = FOV_RADIUS + (hasRingEffect('sight') ? 2 : 0) + (state.player.fovBonus || 0) + rangedSightBonus + lanternBonus + moundBonus;
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
function findPath(sx, sy, gx, gy, phaseThrough, canSwim, maxExpansions = 25) {
  const open = [{ x: sx, y: sy, g: 0, h: Math.abs(gx - sx) + Math.abs(gy - sy), parent: null }];
  const closed = new Set();
  let expansions = 0;

  while (open.length > 0 && expansions < maxExpansions) {
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
      const tileAtN = getTile(nx, ny);
      const waterPassable = canSwim && tileAtN === T.WATER;
      if (!phaseThrough && !waterPassable && !isWalkable(nx, ny)) {
        // Allow walking to goal even if it's the player's position
        if (nx !== gx || ny !== gy) continue;
      }
      if (phaseThrough && (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H)) continue;
      // Don't walk into other enemies
      const other = enemyAt(nx, ny);
      if (other && (nx !== gx || ny !== gy)) continue;
      // Illusions block pathfinding for enemies (allow walking to goal tile)
      if (state.entities.some(e => e.type === 'illusion' && e.hp > 0 && e.x === nx && e.y === ny) && (nx !== gx || ny !== gy)) continue;

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
  // Ambush Strike: double damage on first hit while undetected (alertness < 2)
  let ambushBonus = 1;
  if (attacker !== state.player && attacker.special === 'ambush_strike' && !attacker.ambushUsed && attacker.alertness < 2) {
    ambushBonus = 2;
    attacker.ambushUsed = true;
    attacker.alertness = 2;
    if (defender === state.player) {
      addMessage(`The ${attacker.name} strikes from the shadows!`, 'damage');
    }
  }

  const atk = getEffectiveAttack(attacker);
  const def = getEffectiveDefense(defender);
  let critChance = (attacker === state.player)
    ? (state.player.critChance || 0.10)
    : (state.floor <= 2 ? 0.04 : 0.10); // enemies crit less on early floors
  if (attacker === state.player && hasRune('fortune')) critChance += hasSynergy('deadly_precision') ? 0.15 : 0.05;
  const isCrit = Math.random() < critChance;
  let damage = Math.max(1, atk - def + Math.floor(Math.random() * 5) - 2);
  if (isCrit) damage *= 2;
  if (ambushBonus > 1) damage *= ambushBonus;
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

  // Iron Skin perk: reduce incoming damage to player by 1
  if (defender === state.player && state.player.ironSkin) {
    damage = Math.max(1, damage - 1);
  }

  // Ghost miss chance (suppressed while weakened)
  if (defender.special === 'phase' && !hasStatusEffect(defender, 'weakened') && Math.random() < 0.5) {
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

  // Floating damage number
  animateDamageNumber(defender.x, defender.y, damage, isCrit, targetIsPlayer);

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

  // Monk charm / Beastmaster animal charm
  if (isPlayer && !targetIsPlayer && defender.hp > 0) {
    if (state.player.classId === 'beastmaster' && ['Bat', 'Slime', 'Spider'].includes(defender.name) && Math.random() < 0.70) {
      const existingBeast = state.entities.find(e => e.type === 'enemy' && e.hp > 0 && e.charmedByBeastmaster && e !== defender);
      if (existingBeast) {
        removeEntity(existingBeast);
        addMessage(`🐾 ${existingBeast.name} slips back into the shadows.`, '');
      }
      defender.isAlly = true;
      defender.ai = 'ally';
      defender.allyTurns = 99999;
      defender.charmedByBeastmaster = true;
      addMessage(`🐾 ${defender.name} is won over by your beastcraft!`, 'gold');
    } else if (state.player.charmChance > 0 && Math.random() < state.player.charmChance) {
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

  // Elementalist: bump attacks apply Acid-Soaked
  if (isPlayer && !targetIsPlayer && defender.hp > 0 && state.player.classId === 'elementalist') {
    addStatusEffect(defender, 'acid_soaked', 3);
    addMessage(`🧪 ${defender.name} is acid-soaked! (-3 DEF)`, 'good');
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

  // Spider web — duration 2 so it survives the same-turn processStatusEffects decrement
  if (attacker.special === 'web' && targetIsPlayer && Math.random() < 0.4) {
    addStatusEffect(state.player, 'webbed', 2);
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

function getPlayerWeaponAttackContribution(player = state.player) {
  if (!player || player.classId === 'monk') return 0;
  let bonus = player.equipped.weapon?.attack || 0;
  if (bonus <= 0) return 0;
  if (player.classId === 'cleric') bonus -= 1;
  if (player.classId === 'darkwizard' || player.classId === 'conjurer') bonus -= 1;
  return Math.max(0, bonus);
}

function getPlayerRangedDamageBonus(player = state.player) {
  if (!player || player.classId === 'monk') return 0;
  let bonus = 0;
  if (player.classId === 'darkwizard' || player.classId === 'conjurer') bonus -= 2;
  return bonus;
}

function getDisplayedPlayerAttack(player = state.player) {
  if (!player) return 0;
  const monkScaling = player.classId === 'monk' ? Math.floor(player.level * 1.5) : 0;
  return player.attack + monkScaling + getPlayerWeaponAttackContribution(player);
}

function getDisplayedPlayerDefense(player = state.player) {
  if (!player) return 0;
  const monkScaling = player.classId === 'monk' ? Math.floor(player.level * 1.0) : 0;
  const armorBonus = player.classId === 'monk' ? 0 : (player.equipped.armor?.defense || 0);
  const ringBonus = player.equipped.ring?.special === 'protection' ? 3 : 0;
  return player.defense + monkScaling + armorBonus + ringBonus;
}

function getEffectiveAttack(entity) {
  if (entity === state.player) {
    let atk = state.player.attack;
    if (state.player.classId === 'monk') {
      atk += Math.floor(state.player.level * 1.5);
    } else {
      atk += getPlayerWeaponAttackContribution(state.player);
      if (state.player.equipped.armor?.special === 'heavy') atk -= 1;
    }
    // Strength potion
    if (hasStatusEffect(state.player, 'strength')) atk += 2;
    // Sage blessing
    if (hasStatusEffect(state.player, 'blessed')) atk += 2;
    // Song of Courage
    if (hasStatusEffect(state.player, 'courage')) atk += 1;
    // Battle Fury perk: +3 attack when below 30% HP (Berserker's Rage synergy: +5)
    if (state.player.hasFury && state.player.hp < state.player.maxHp * 0.3) {
      atk += hasSynergy('berserkers_rage') ? 5 : 3;
    }
    // Berserker class rage: +3 attack when below 40% HP
    if (state.player.classId === 'berserker' && state.player.hp < state.player.maxHp * 0.4) atk += 3;
    return Math.max(1, atk);
  }
  return entity.attack + (hasStatusEffect(entity, 'strength') ? 2 : 0);
}

function getEffectiveDefense(entity) {
  if (entity === state.player) {
    let def = state.player.defense;
    if (state.player.classId === 'monk') {
      def += Math.floor(state.player.level * 1.0);
    } else {
      if (state.player.equipped.armor) def += state.player.equipped.armor.defense;
    }
    if (state.player.equipped.ring?.special === 'protection') def += 3;
    if (state.player.equipped.weapon?.special === 'chaos') def -= 1;
    // Song of Courage
    if (hasStatusEffect(state.player, 'courage')) def += 1;
    return Math.max(0, def);
  }
  // Aquatic enemies get +1 DEF when on or adjacent to water
  let def = entity.defense + (entity.aquaticDefBonus || 0);
  if (hasStatusEffect(entity, 'weakened')) def -= 2;
  if (hasStatusEffect(entity, 'acid_soaked')) def -= 3;
  return Math.max(0, def);
}

function applyWeaponSpecial(weapon, target) {
  if (!weapon.special || target.hp <= 0) return;
  switch (weapon.special) {
    case 'cleave': {
      const cleaveDmg = Math.max(1, Math.floor(getEffectiveAttack(state.player) * 0.5));
      const adjacent = state.entities.filter(e =>
        e.type === 'enemy' && e.hp > 0 && e !== target &&
        Math.abs(e.x - target.x) <= 1 && Math.abs(e.y - target.y) <= 1
      );
      if (adjacent.length > 0) {
        const splash = adjacent[Math.floor(Math.random() * adjacent.length)];
        splash.hp -= cleaveDmg;
        addMessage(`Cleave hits ${splash.name} for ${cleaveDmg}!`, 'damage');
        if (splash.hp <= 0) killEnemy(splash);
      }
      break;
    }
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

  // Soul Amulet: collect fragment on kill
  if (hasRingEffect('soul')) {
    state.player.soulFragments = Math.min(10, state.player.soulFragments + 1);
    addMessage(`📿 Soul fragment (${state.player.soulFragments}/10)`, '');
  }

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
        if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !(nx === state.player.x && ny === state.player.y)) {
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
      const necroBonus = state.player.necroBonus || 0;
      const necroChance = Math.min(0.50, 0.25 + necroBonus + 0.02 * state.player.level);
      if (Math.random() < necroChance) {
        const skel = createEnemy(
          { name: 'Skeletal ' + enemy.name, glyph: '💀', hp: Math.max(3, Math.floor(enemy.maxHp / 2)),
            attack: enemy.attack, defense: 0, ai: 'chase', xp: 0, special: null, detect: 10 },
          enemy.x, enemy.y
        );
        skel.isAlly = true;
        skel.allyTurns = 9999;
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

  // Soul Amulet: collect fragment
  soulAmuletCollect();

  // Echo Alert: on death, alert all enemies within 8 tiles
  if (enemy.special === 'echo_alert') {
    const echoRadius = 8;
    let alerted = 0;
    for (const e of state.entities) {
      if (e.type !== 'enemy' || e.hp <= 0 || e === enemy) continue;
      const d = Math.abs(e.x - enemy.x) + Math.abs(e.y - enemy.y);
      if (d <= echoRadius) { e.alertness = 2; alerted++; }
    }
    if (alerted > 0) addMessage('A dying shriek echoes through the cavern!', 'damage');
  }

  addMessage(`${enemy.name} is destroyed! (+${enemy.xp} XP)`, 'good');
  removeEntity(enemy);

  // Badge checks
  checkBadgesOnKill(enemy);
  unlockCodexEntry('bestiary_' + enemy.name.toLowerCase().replace(/\s+/g, '_'));

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
  Audio.stopAmbient();
  Audio.death();
  haptic(100);

  // Auto-delete save slot if this run was loaded from a save
  if (state._loadedFromSlot != null) {
    deleteSaveSlot(state._loadedFromSlot);
    state._loadedFromSlot = null;
  }

  const tk = state.toughestKill;
  const kg = killerGlyph || '';
  const deathClassName = CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Berserker';
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
    sr('Attack', getDisplayedPlayerAttack(p)),
    sr('Defense', getDisplayedPlayerDefense(p)),
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
  Audio.stopAmbient();
  Audio.victory();
  haptic(100);

  // Auto-delete save slot if this run was loaded from a save
  if (state._loadedFromSlot != null) {
    deleteSaveSlot(state._loadedFromSlot);
    state._loadedFromSlot = null;
  }

  const tk = state.toughestKill;
  const victoryClassName = CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Berserker';
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
  const atkTotal = getDisplayedPlayerAttack(p);
  const defTotal = getDisplayedPlayerDefense(p);
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
    { name: 'Undying Fury', desc: 'Survive a lethal hit with 1 HP (once per floor)', apply: () => { state.player.undyingFury = true; }, rare: true, unique: true, flag: 'undyingFury', classOnly: 'berserker' },
    { name: 'Shadow Step', desc: 'Become invisible for 2 turns after a kill', apply: () => { state.player.shadowStep = true; }, rare: true, unique: true, flag: 'shadowStep', classOnly: 'rogue' },
    { name: 'Quick Draw', desc: 'Aimed Shot cooldown reduced by 3 turns', apply: () => { state.player.quickDraw = true; }, rare: false, unique: true, flag: 'quickDraw', classOnly: 'ranger' },
    { name: 'Sanctified Ground', desc: 'Heal 1 HP when you wait (Space)', apply: () => { state.player.sanctifiedGround = true; }, rare: false, unique: true, flag: 'sanctifiedGround', classOnly: 'cleric' },
    { name: 'Mirror Image', desc: 'Can place 2 illusions at once', apply: () => { state.player.mirrorImage = true; }, rare: false, unique: true, flag: 'mirrorImage', classOnly: 'conjurer' },
    { name: 'Double Shot', desc: 'Fire 2 arrows in one turn', apply: () => { state.player.doubleShot = true; }, rare: false, unique: true, flag: 'doubleShot', classOnly: 'ranger' },
    { name: 'Necrotic Surge', desc: 'Acid bolt splashes poison to adjacent foes', apply: () => { state.player.necroticSurge = true; }, rare: false, unique: true, flag: 'necroticSurge', classOnly: 'darkwizard' },
    { name: 'Smoke Screen', desc: 'Teleport leaves a 3-turn smoke cloud behind', apply: () => { state.player.smokeScreen = true; }, rare: false, unique: true, flag: 'smokeScreen', classOnly: 'escapeartist' },
    { name: 'Chain Lightning', desc: 'Thunderclap chains to enemies within 2 tiles of hit targets', apply: () => { state.player.chainLightning = true; }, rare: true, unique: true, flag: 'chainLightning', classOnly: 'elementalist' },
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
    const onPick = () => {
      perk.apply();
      checkNewSynergies();
      $('levelup-overlay').classList.remove('active');
      inputLocked = false;
      updateUI();
      render();
    };
    btn.addEventListener('click', onPick);
    btn.addEventListener('touchend', (e) => { e.preventDefault(); onPick(); }, { passive: false });
    container.appendChild(btn);
  }

  $('levelup-overlay').classList.add('active');
}

// === STATUS EFFECTS ===
function addStatusEffect(entity, type, turns) {
  // Elementalist immunities
  if (entity === state?.player) {
    if (type === 'poison' && state.player.poisonImmune) { addMessage('🧪 Your elemental attunement neutralizes the poison!', 'good'); return; }
    if (type === 'burning' && state.player.fireImmune) { addMessage('🧪 Your elemental attunement absorbs the flames!', 'good'); return; }
  }
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

  // Dirge: damage all visible enemies each turn
  if (hasStatusEffect(state.player, 'dirge')) {
    const visible = state.entities.filter(e => e.type === 'enemy' && e.hp > 0 && !e.isAlly && state.visible[e.y * MAP_W + e.x]);
    for (const e of visible) {
      e.hp -= 1;
      if (e.hp <= 0) {
        addMessage(`${e.name} succumbs to the dirge!`, 'good');
        state.player.xp += e.xp;
        removeEntity(e);
        state.enemiesKilled++;
      }
    }
  }

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
      case 'wet':
        // Wet extinguishes burning
        if (hasStatusEffect(entity, 'burning')) {
          entity.statusEffects = entity.statusEffects.filter(s => s.type !== 'burning');
          if (isPlayer) addMessage('The water douses the flames!', 'good');
        }
        break;
      case 'burning':
        // Burning is suppressed by wet
        if (hasStatusEffect(entity, 'wet')) break;
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
      if (!isPlayer && eff.type === 'invisible') addMessage(`${entity.name} becomes visible again!`, '');
      if (isPlayer && eff.type === 'strength') addMessage('Your strength fades.', '');
      if (isPlayer && eff.type === 'blessed') addMessage('The sage\'s blessing fades.', '');
      if (isPlayer && eff.type === 'courage') addMessage('The Song of Courage fades.', '');
      if (isPlayer && eff.type === 'lullaby') addMessage('The Lullaby fades.', '');
      if (isPlayer && eff.type === 'dirge') addMessage('The Dirge of Pain fades.', '');
      if (isPlayer && eff.type === 'plenty') addMessage('The Song of Plenty fades.', '');
      if (isPlayer && eff.type === 'lanternLit') { addMessage('🔦 The lantern flickers out.', ''); computeFOV(); }
      if (isPlayer && eff.type === 'phasing') addMessage('You solidify again.', '');
      if (isPlayer && eff.type === 'wet') addMessage('You dry off.', '');
      if (isPlayer && (eff.type === 'waterwalk' || eff.type === 'walk_on_water')) addMessage('Your feet feel heavy again.', '');
      if (!isPlayer && eff.type === 'acid_soaked') addMessage(`${entity.name}'s acid coating dissolves.`, '');
    }
  }

  // Check death from status effects
  if (entity.hp <= 0 && isPlayer) {
    playerDeath('status effects', '☠️');
  } else if (entity.hp <= 0 && !isPlayer) {
    addMessage(`${entity.name} succumbs to their wounds!`, 'good');
    if (!entity.isAlly) {
      state.player.xp += entity.xp;
      state.score += entity.xp * 10;
      checkBadgesOnKill(entity);
      unlockCodexEntry('bestiary_' + entity.name.toLowerCase().replace(/\s+/g, '_'));
      while (state.player.xp >= state.player.xpToNext) {
        state.player.xp -= state.player.xpToNext;
        state.player.level++;
        state.player.xpToNext = 15 + state.player.level * 10;
        showLevelUp();
      }
    }
    removeEntity(entity);
    state.enemiesKilled++;
  }
}

function getEnemyIntent(enemy) {
  if (!state || !enemy || enemy.type !== 'enemy' || enemy.hp <= 0 || enemy.isAlly) return null;

  const player = state.player;
  const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);

  if (hasStatusEffect(enemy, 'frozen')) return { glyph: '✽', color: '#60c0ff' };
  if (enemy.confused > 0) return { glyph: '?', color: '#c090ff' };
  if (enemy.special === 'blind' && !player.movedLastTurn) return { glyph: '…', color: '#a0a0a0' };

  if (enemy.ai === 'boss') {
    if (dist === 1) return { glyph: '!', color: '#ff6060' };
    if (enemy.phase >= 3 && (enemy.aoeCooldown || 0) <= 0 && dist <= 4) return { glyph: '*', color: '#ff70ff' };
    if (enemy.phase >= 2 && enemy.teleportCooldown <= 0 && dist > 3) return { glyph: '⇄', color: '#c080ff' };
    if (enemy.summonCooldown <= 0) return { glyph: '+', color: '#ffb050' };
    if (dist > 1) return { glyph: '→', color: '#ffd060' };
    return null;
  }

  if (enemy.ai === 'ambush' && dist <= 1) return { glyph: '!', color: '#ff6060' };
  if (enemy.ai === 'ambush' && enemy.alertness < 2 && dist > 1) return { glyph: '…', color: '#8a8a8a' };
  if (enemy.ai === 'flee' && enemy.special === 'summon' && enemy.alertness >= 2 && enemy.summonCooldown <= 0) {
    return { glyph: '+', color: '#ffb050' };
  }
  if (enemy.ai === 'flee' && enemy.alertness >= 2) return { glyph: '↶', color: '#60d0ff' };
  if (enemy.ai === 'patrol' && enemy.alertness < 2) return { glyph: '→', color: '#8fb0ff' };
  if (enemy.ai === 'wander' && enemy.alertness < 2) return null;

  if (enemy.alertness >= 2) {
    if (dist === 1) return { glyph: '!', color: '#ff6060' };
    return { glyph: '→', color: '#ffd060' };
  }

  return null;
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

    // Lullaby: 30% chance enemies skip turn
    if (hasStatusEffect(state.player, 'lullaby') && Math.random() < 0.3) continue;

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
      // Stealth enemy reveal
      if (enemy.alertness < 2 && enemy.special === 'stealth') {
        addMessage(`A ${enemy.name} materializes from the shadows!`, 'damage');
      }
      // Rogue senses approaching enemies sooner
      else if (enemy.alertness < 2 && state.player.classId === 'rogue') {
        addMessage(`You sense a ${enemy.name} approaching!`, 'damage');
      }
      enemy.alertness = 2;
    } else if (enemy.alertness > 0 && dist > enemy.detect + 3) {
      enemy.alertness = Math.max(0, enemy.alertness - 1);
    }

    // Blind Stalker: only moves/chases when player moved last turn
    if (enemy.special === 'blind' && !state.player.movedLastTurn) {
      // Stay still — sense nothing
      continue;
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

  // Conjurer illusion: enemies within 3 tiles MUST target it; farther enemies still prefer it
  const illusions = state.entities.filter(e => e.type === 'illusion' && e.hp > 0);
  let target = state.player;
  if (illusions.length > 0) {
    const nearestIllusion = illusions.reduce((best, ill) => {
      const d = Math.abs(enemy.x - ill.x) + Math.abs(enemy.y - ill.y);
      return (!best || d < best.d) ? { ill, d } : best;
    }, null);
    if (nearestIllusion && nearestIllusion.d <= 3) {
      target = nearestIllusion.ill;
    } else {
      // Farther than 3: still prefer illusion over player (existing behavior)
      target = illusions[0];
    }
  }
  const tx = target.x;
  const ty = target.y;

  const px = state.player.x, py = state.player.y;
  const dist = Math.abs(enemy.x - tx) + Math.abs(enemy.y - ty);

  // Adjacent to target — attack it
  if (dist === 1) {
    if (target.type === 'illusion') {
      // Attack the illusion: deal damage to it, destroying it when hp runs out
      target.hp--;
      if (state.visible[target.y * MAP_W + target.x]) {
        addMessage(`${enemy.name} strikes the illusion!`, '');
      }
      if (target.hp <= 0) {
        removeEntity(target);
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

  // Orb-Weaver web spinner: every 2 turns spin webs on adjacent floor tiles
  if (enemy.special === 'web_spinner') {
    enemy.webSpinCooldown = (enemy.webSpinCooldown || 0) - 1;
    if (enemy.webSpinCooldown <= 0) {
      enemy.webSpinCooldown = 2;
      const WEB_RADIUS = 2;
      const DOOR_TYPES = new Set([T.DOOR_CLOSED, T.DOOR_OPEN, T.DOOR_ONEWAY, T.DOOR_SEALED, T.DOOR_LOCKED]);
      const candidates = [];
      for (let wy = enemy.y - WEB_RADIUS; wy <= enemy.y + WEB_RADIUS; wy++) {
        for (let wx = enemy.x - WEB_RADIUS; wx <= enemy.x + WEB_RADIUS; wx++) {
          if (wx < 0 || wx >= MAP_W || wy < 0 || wy >= MAP_H) continue;
          const tile = getTile(wx, wy);
          if (tile !== T.FLOOR && tile !== T.CORRIDOR) continue;
          // Skip tiles adjacent to any door
          const nearDoor = [[0,-1],[0,1],[-1,0],[1,0]].some(([ddx, ddy]) => DOOR_TYPES.has(getTile(wx + ddx, wy + ddy)));
          if (nearDoor) continue;
          // Count wall neighbors to score corner-preference
          const wallCount = [[0,-1],[0,1],[-1,0],[1,0]].filter(([ddx, ddy]) => getTile(wx + ddx, wy + ddy) === T.WALL).length;
          candidates.push({ wx, wy, wallCount });
        }
      }
      // Place webs, biased toward corners (more wall neighbors)
      for (const { wx, wy, wallCount } of candidates) {
        // Spiders prefer corners: skip open tiles 60% of the time unless they have 2+ wall neighbors
        if (wallCount < 2 && Math.random() < 0.60) continue;
        const existing = state.entities.find(e => e.type === 'hazard' && e.hazardType === 'web' && e.x === wx && e.y === wy);
        if (existing) {
          existing.turns = 20;
        } else {
          state.entities.push({ type: 'hazard', x: wx, y: wy, glyph: '🕸', name: 'Spider Web', hazardType: 'web', turns: 20 });
        }
      }
    }
  }

  const canSwim = enemy.special === 'aquatic';
  const step = findPath(enemy.x, enemy.y, tx, ty, enemy.special === 'phase', canSwim);
  if (step) {
    tryMoveEnemy(enemy, enemy.x + step.x, enemy.y + step.y);
  }

  // Aquatic bonus DEF when adjacent to water
  if (canSwim) {
    const adjWater = [[0,-1],[0,1],[-1,0],[1,0]].some(([dx, dy]) => getTile(enemy.x + dx, enemy.y + dy) === T.WATER || getTile(enemy.x, enemy.y) === T.WATER);
    enemy.aquaticDefBonus = adjWater ? 1 : 0;
  }
}

function patrolAI(enemy) {
  if (enemy.alertness >= 2) { chaseAI(enemy); return; }

  if (!enemy.patrolTarget || (enemy.x === enemy.patrolTarget.x && enemy.y === enemy.patrolTarget.y)) {
    // Pick new patrol target
    const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
    enemy.patrolTarget = { x: room.x + Math.floor(Math.random() * room.w), y: room.y + Math.floor(Math.random() * room.h) };
  }

  const canSwim = enemy.special === 'aquatic';
  const step = findPath(enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y, false, canSwim);
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
        if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !(nx === state.player.x && ny === state.player.y)) {
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
      if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !(nx === state.player.x && ny === state.player.y)) {
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

  // Build a hostile list and prioritize enemies threatening the player.
  const hostiles = [];
  for (const e of state.entities) {
    if (e.type !== 'enemy' || e.isAlly || e.hp <= 0) continue;
    const dAlly = Math.abs(e.x - ally.x) + Math.abs(e.y - ally.y);
    const dPlayer = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
    const threateningPlayer = dPlayer <= 3 || (e.alertness >= 2 && dPlayer <= 7);
    hostiles.push({ enemy: e, dAlly, dPlayer, threateningPlayer });
  }

  // No enemies: regroup tightly around the player.
  if (hostiles.length === 0) {
    if (distToPlayer > 2) {
      const step = findPath(ally.x, ally.y, p.x, p.y, false, false, 80);
      if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
    }
    return;
  }

  hostiles.sort((a, b) => {
    // Always attack adjacent enemies first.
    if (a.dAlly === 1 || b.dAlly === 1) return a.dAlly - b.dAlly;
    // Then prioritize enemies currently threatening the player.
    if (a.threateningPlayer !== b.threateningPlayer) return a.threateningPlayer ? -1 : 1;
    // Then prioritize the threat closest to the player, then closest to this ally.
    if (a.dPlayer !== b.dPlayer) return a.dPlayer - b.dPlayer;
    return a.dAlly - b.dAlly;
  });

  const targetInfo = hostiles[0];
  const target = targetInfo.enemy;

  // Priority 1: Attack adjacent enemy.
  if (targetInfo.dAlly === 1) {
    attackEntity(ally, target);
    return;
  }

  // Priority 2: Pursue aggressively when danger is nearby.
  const shouldPursue =
    targetInfo.threateningPlayer ||
    targetInfo.dPlayer <= 5 ||
    (targetInfo.dAlly <= 8 && distToPlayer <= 6);

  if (shouldPursue) {
    const step = findPath(ally.x, ally.y, target.x, target.y, false, false, 80);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
    return;
  }

  // Priority 3: Regroup near the player when no immediate threat.
  if (distToPlayer > 2) {
    const step = findPath(ally.x, ally.y, p.x, p.y, false, false, 80);
    if (step) tryMoveEnemy(ally, ally.x + step.x, ally.y + step.y);
    return;
  }
}

function tryMoveEnemy(enemy, nx, ny) {
  const phaseThrough = enemy.special === 'phase';
  const canSwim = enemy.special === 'aquatic';
  if (phaseThrough) {
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
  } else {
    // Aquatic enemies can move into water
    if (canSwim && getTile(nx, ny) === T.WATER) {
      // water is passable for aquatic enemies
    } else {
      // Enemies on floor 9+ (was 5+) can bash open closed doors while chasing
      if (getTile(nx, ny) === T.DOOR_CLOSED && enemy.alertness >= 2 && state.floor >= 9) {
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

  // Acid hazard: enemies that step in acid take damage and become acid-soaked
  const acidPool = state.entities.find(e => e.type === 'hazard' && e.hazardType === 'acid' && e.x === nx && e.y === ny);
  if (acidPool && !enemy.isAlly && enemy.hp > 0) {
    enemy.hp -= 1;
    addStatusEffect(enemy, 'acid_soaked', 2);
    addMessage(`🧪 ${enemy.name} sizzles in acid! (-1 HP)`, 'good');
    if (enemy.hp <= 0) killEnemy(enemy);
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
  const p = state.player;

  // Woozy effect: check adjacent tiles for enchanted walls
  if (!state.throwMode && !state.fortifyMode) {
     let nearEnchanted = false;
     for (let ey = -1; ey <= 1; ey++) {
        for (let ex = -1; ex <= 1; ex++) {
           if (getTile(state.player.x + ex, state.player.y + ey) === T.ENCHANTED_WALL) {
              nearEnchanted = true;
           }
        }
     }
     if (nearEnchanted && hasEnchantedWallImmunity()) {
        if (!getRoomAt(p.x, p.y)) {
          addMessage('The enchanted walls glow but seem to have no effect on you.', '');
        }
     } else if (nearEnchanted && Math.random() < 0.25) {
        addMessage("The enchanted walls distort your sense of direction!", "damage");
        if (dx !== 0) {
           dy = (Math.random() < 0.5 ? 1 : -1);
           dx = 0;
        } else if (dy !== 0) {
           dx = (Math.random() < 0.5 ? 1 : -1);
           dy = 0;
        }
     }
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

  syncPlayerWoozyStatus();

  let moveDx = dx, moveDy = dy;
  if (moveDx === 0 && moveDy === -1 && hasStatusEffect(p, 'woozy')) {
    const roll = Math.random();
    if (roll < 0.25) { moveDx = -1; moveDy = 0; }
    else if (roll < 0.50) { moveDx = 1; moveDy = 0; }
    else { moveDx = 0; moveDy = -1; }
  }

  const nx = p.x + moveDx, ny = p.y + moveDy;

  // === WALL TRAP RESOLUTION ===
  // If a bolt trap was primed on the previous turn, resolve it now.
  // Moving perpendicular to the trap axis dodges it; any other move gets hit.
  if (p.wallTrap) {
    const trap = p.wallTrap;
    p.wallTrap = null;
    const dodged = (trap.axis === 'x' && moveDx === 0 && moveDy !== 0) ||
                   (trap.axis === 'y' && moveDy === 0 && moveDx !== 0);
    if (dodged) {
      addMessage('You sidestep the bolt — it sparks off the wall!', 'good');
    } else {
      const dmg = Math.max(1, Math.min(8, 3 + Math.floor(state.floor / 3)) - p.defense);
      p.hp -= dmg;
      addMessage(`⚡ A bolt strikes you from the wall! (-${dmg} HP)`, 'damage');
      haptic(50);
      screenShake();
      animateEntityFlash(p.x, p.y, '#ff4040');
      updateUI();
      if (p.hp <= 0) { playerDeath('a wall trap', '⚡'); return; }
    }
  }

  // Webbed — skip movement
  if (hasStatusEffect(p, 'webbed')) {
    addMessage('You struggle free from the web!', '');
    endTurn();
    return;
  }

  // Web-Slowed — skip every other move
  if (hasStatusEffect(p, 'web_slowed')) {
    if (p.webSlowSkip) {
      p.webSlowSkip = false;
      addMessage('The webs cling to you, slowing your movement...', '');
      endTurn();
      return;
    }
    p.webSlowSkip = true;
  } else {
    p.webSlowSkip = false;
  }

  // Mound-Slow — entering a mound costs 2 turns; first move after entry is skipped
  if (p.moundSlowPending) {
    p.moundSlowPending = false;
    addMessage('The uneven ground slows you.', '');
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
    if (p.roundhouseKick && p.level >= 5) {
      const roundhouseTargets = [];
      const roundhouseDirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
      for (let i = 0; i < roundhouseDirs.length; i++) {
        const [ddx, ddy] = roundhouseDirs[i];
        const second = enemyAt(p.x + ddx, p.y + ddy);
        if (second && second !== enemy && second.hp > 0 && !second.isAlly) {
          roundhouseTargets.push({ enemy: second, idx: i });
        }
      }
      if (roundhouseTargets.length > 0) {
        roundhouseTargets.sort((a, b) => a.enemy.hp - b.enemy.hp || a.idx - b.idx);
        attackEntity(p, roundhouseTargets[0].enemy);
        addMessage('🦶 Roundhouse Kick!', 'good');
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

  // Check for one-way door — player moves through, door seals at the door frame behind them
  if (getTile(nx, ny) === T.DOOR_ONEWAY) {
    const dx = nx - state.player.x, dy = ny - state.player.y;
    const throughX = nx + dx, throughY = ny + dy;
    // Move through the door if the far side is walkable; otherwise stop at the door tile
    if (isWalkable(throughX, throughY)) {
      state.player.x = throughX;
      state.player.y = throughY;
    } else {
      state.player.x = nx;
      state.player.y = ny;
    }
    if (state.player.classId === 'rogue') {
      setTile(nx, ny, T.DOOR_OPEN);
      addMessage('You deftly pick the one-way lock.', 'good');
    } else {
      setTile(nx, ny, T.DOOR_SEALED);
      addMessage('The door slams shut behind you! Bash it 5 times to break through.', 'damage');
    }
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
      addMessage('🗝️ The bone key dissolves into the lock... ancient treasures lie within!', 'gold');
      Audio.keyUnlock();
      haptic(60);
      computeFOV();
    } else {
      addMessage('This door is locked. You need a key.', 'damage');
    }
    endTurn();
    return;
  }

  // Check walkable (phasing ghosts can walk through walls)
  let walkable = isWalkable(nx, ny);
  const t = getTile(nx, ny);
  const waterWalkPassable = t === T.WATER && (hasStatusEffect(p, 'waterwalk') || hasStatusEffect(p, 'walk_on_water'));

  if (t === T.WATER && (state.player.classId === 'monk' || waterWalkPassable)) {
    walkable = true;
  }

  // Enchanted walls handling
  if (t === T.ENCHANTED_WALL) {
    walkable = false;
  }

  if (!walkable && !hasStatusEffect(state.player, 'phasing')) {
    if (t === T.WATER) {
      addMessage('The water is too deep to enter.', '');
    } else if (t === T.STALAGMITE) {
      addMessage('The stalagmite blocks your path.', '');
    } else if (t === T.RUBBLE) {
      addMessage('The rubble is impassable.', '');
    } else if (t === T.CHASM) {
      addMessage('A vast chasm blocks your path.', '');
    } else if (t === T.WATERFALL) {
      addMessage('A roaring waterfall blocks your path.', '');
    } else {
      addMessage('You bump into a wall.', '');
    }
    endTurn();
    return;
  }

  const oldX = p.x, oldY = p.y;
  p.x = nx;
  p.y = ny;
  p.movedLastTurn = true;
  Audio.step();
  haptic(10);

  // === SPECIAL TERRAIN ENTRY EFFECTS ===

  // ICY PATH — slide one extra tile in the same direction (unless blocked)
  if (getTile(nx, ny) === T.ICY_PATH) {
    const slideX = nx + moveDx, slideY = ny + moveDy;
    if (isWalkable(slideX, slideY) && !enemyAt(slideX, slideY)) {
      p.x = slideX;
      p.y = slideY;
      Audio.step();
      addMessage('You slip on the ice!', '');
    }
  }

  // MOUND — set pending slow flag (costs 2 turns to enter)
  if (getTile(p.x, p.y) === T.MOUND && !p.moundSlowPending) {
    p.moundSlowPending = true;
  }

  // FIRE PATH — extinguish if player has frozen status; otherwise just damage in endTurn
  if (getTile(p.x, p.y) === T.FIRE_PATH && hasStatusEffect(p, 'frozen')) {
    setTile(p.x, p.y, T.FLOOR);
    addMessage('Your icy aura extinguishes the fire!', 'good');
  }

  // ENCHANTED WALL — when player moves within a room, teleport enchanted_wall to another wall tile in that room
  const nowRoom = getRoomAt(p.x, p.y);
  if (nowRoom) {
    const nowRoomIdx = state.rooms.indexOf(nowRoom);
    for (const ew of state.entities.filter(e => e.type === 'enchanted_wall' && e.roomIdx === nowRoomIdx)) {
      // Find a random wall tile in this room (different from current position)
      const wallTiles = [];
      for (let ry = nowRoom.y - 1; ry <= nowRoom.y + nowRoom.h; ry++) {
        for (let rx = nowRoom.x - 1; rx <= nowRoom.x + nowRoom.w; rx++) {
          if (getTile(rx, ry) === T.WALL && (rx !== ew.x || ry !== ew.y)) {
            wallTiles.push({ x: rx, y: ry });
          }
        }
      }
      if (wallTiles.length > 0) {
        const dest = wallTiles[Math.floor(Math.random() * wallTiles.length)];
        ew.x = dest.x;
        ew.y = dest.y;
      }
    }
  }

  // Escape Artist ice trap: leave a trap at old tile if enemies were adjacent (up to 3 active)
  if (p.iceTrapPassive) {
    const wasNearEnemy = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]].some(([ddx, ddy]) => {
      const e = enemyAt(oldX + ddx, oldY + ddy);
      return e && e.hp > 0 && !e.isAlly;
    });
    if (wasNearEnemy) {
      const iceTraps = state.entities.filter(e => e.type === 'hazard' && e.hazardType === 'ice');
      if (iceTraps.length >= 3) {
        removeEntity(iceTraps[0]);
      }
      state.entities.push({ type: 'hazard', x: oldX, y: oldY, glyph: '❄️', name: 'Ice Trap', hazardType: 'ice', turns: 8 });
      addMessage('❄️ Ice trap placed!', '');
    }
  }

  // === WALL TRAP: ROOM ENTRY CHECK ===
  // When entering a room from a corridor, there's a chance a hidden bolt trap fires next turn.
  // Floors 3+ only; each room can only prime once per visit (tracked by p.wallTrap being null).
  if (state.floor >= 3 && !p.wallTrap) {
    const wasInRoom = state.rooms.some(r =>
      oldX >= r.x && oldX < r.x + r.w && oldY >= r.y && oldY < r.y + r.h);
    const nowInRoom = state.rooms.some(r =>
      p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
    if (!wasInRoom && nowInRoom && Math.random() < 0.20) {
      p.wallTrap = { axis: Math.abs(moveDx) > 0 ? 'x' : 'y' };
      addMessage('⚠️ A section of wall slides open — a trap is primed!', 'damage');
      animateEntityFlash(p.x, p.y, '#ff8000');
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

  // Stepping Stone — one-time message per floor
  if (getTile(nx, ny) === T.STEPPING_STONE && !state.steppingStoneMessageShown) {
    state.steppingStoneMessageShown = true;
    addMessage('You balance on the wet stone.', '');
  }

  // Check for hazards
  const hazard = state.entities.find(e => e.type === 'hazard' && e.x === nx && e.y === ny);
  if (hazard && hazard.hazardType === 'fire') {
    if (state.player.fireImmune) {
      // Elementalist fire immunity
    } else if (hasStatusEffect(state.player, 'wet')) {
      // Wet status extinguishes fire hazard
      removeEntity(hazard);
      addMessage('Your wet body douses the fire!', 'good');
    } else {
      state.player.hp -= 1;
      addMessage('You step in fire! (-1 HP)', 'damage');
      if (state.player.hp <= 0) { playerDeath('fire', '🔥'); return; }
    }
  }
  if (hazard && hazard.hazardType === 'web') {
    const alreadySlowed = hasStatusEffect(state.player, 'web_slowed');
    applyStatusEffect(state.player, 'web_slowed', 3);
    if (!alreadySlowed) addMessage('🕸 You step into a spider web! You are slowed.', 'damage');
  }
  if (hazard && hazard.hazardType === 'acid' && !state.player.acidImmune) {
    state.player.hp -= 1;
    addStatusEffect(state.player, 'acid_soaked', 2);
    addMessage('You step in acid! (-1 HP)', 'damage');
    if (state.player.hp <= 0) { playerDeath('acid', '🧪'); return; }
  }

  // Check for NPC (friendly shade — cannot be attacked, gives lore)
  const npc = state.entities.find(e => e.type === 'npc' && e.x === nx && e.y === ny);
  if (npc) {
    if (!npc.spoken) {
      npc.spoken = true;
      addMessage(npc.lore, 'gold');
      if (npc.loreIdx !== undefined) unlockCodexEntry('lore_' + npc.loreIdx);
      // Conjurer inherits Sage insight from lore
      if (state.player.sageClass) {
        state.player.xp += 5;
        addMessage('+5 XP (conjurer insight)', 'good');
        while (state.player.xp >= state.player.xpToNext) {
          state.player.xp -= state.player.xpToNext;
          state.player.level++;
          state.player.xpToNext = 15 + state.player.level * 10;
          showLevelUp();
        }
      }
    } else {
      addMessage(`${npc.name} drifts silently, its message already given.`, '');
    }
    endTurn();
    return;
  }

  // Check for warning sign (readable every time)
  const sign = state.entities.find(e => e.type === 'sign' && e.x === nx && e.y === ny);
  if (sign) {
    addMessage(sign.message, 'damage');
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
  if (state.player.classId !== 'rogue') {
    addMessage('Only Rogues can close doors.', '');
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
  // Stack special arrows of the same type
  if (itemEntity.item.itemType === 'special_arrow') {
    const existing = state.player.inventory.find(i =>
      i.itemType === 'special_arrow' && i.arrowType === itemEntity.item.arrowType
    );
    if (existing) {
      existing.ammo += itemEntity.item.ammo;
      state.itemsFound++;
      addMessage(`+${itemEntity.item.ammo} ${itemEntity.item.name}. (${existing.ammo} total)`, 'good');
      Audio.pickup();
      removeEntity(itemEntity);
      return;
    }
  }
  // Stack potions and scrolls of the same type
  if (itemEntity.item.itemType === 'potion' || itemEntity.item.itemType === 'scroll') {
    const existing = state.player.inventory.find(i =>
      i.itemType === itemEntity.item.itemType &&
      i.effectId === itemEntity.item.effectId
    );
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      state.itemsFound++;
      addMessage(`You pick up ${itemEntity.item.name}. (×${existing.count})`, 'good');
      Audio.pickup();
      removeEntity(itemEntity);
      return;
    }
  }
  if (state.player.inventory.length >= MAX_INVENTORY) {
    addMessage(`Inventory full! Cannot pick up ${itemEntity.item.glyph} ${itemEntity.item.name}.`, 'damage');
    showPopupNotice('Inventory Full');
    return;
  }
  itemEntity.item.count = 1;
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
  if (it.itemType === 'key' && it.keyType === 'bone') {
    addMessage('🗝️ An ancient bone key... it hums faintly, drawn to something nearby.', 'gold');
  } else {
    addMessage(pickupMsg, 'good');
  }
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
  if (p.classId === 'monk' && isMonkRestrictedItem(item)) return;

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
  Audio.stopAmbient();
  Audio.descend();
  haptic(30);
  checkBadgesOnFloorChange();

  // Reset per-floor class abilities
  const cs = state.player.classState;
  cs.haggledThisFloor = false;
  cs.appraisedThisFloor = false;
  cs.floorKills = 0;
  cs.iceTraps = [];
  cs.fortifiedThisFloor = false;
  cs.illusionEntity = null;

  // Fade transition
  $('fade').classList.add('active');
  inputLocked = true;

  setTimeout(() => {
    try {
      activeAnimations.length = 0;
      generateFloor();
      // Place player at start of new floor
      if (state.floor < MAX_FLOOR) {
        const firstRoom = state.rooms && state.rooms[0];
        if (firstRoom) {
          state.player.x = firstRoom.x + Math.floor(firstRoom.w / 2);
          state.player.y = firstRoom.y + Math.floor(firstRoom.h / 2);
        }
      }
      const effects = Array.isArray(state.player.statusEffects) ? state.player.statusEffects : [];
      state.player.statusEffects = effects.filter(e => e && e.type !== 'woozy');
      addMessage(`You descend to floor ${state.floor}...`, '');
      if (state.floor === MAX_FLOOR) addMessage('You sense an overwhelming presence...', 'damage');
      computeFOV();
      // Render first so a UI error cannot leave the map visually blank
      render();
      updateUI();
      const newBiome = getBiomeKey(state.floor);
      Audio.startAmbient(newBiome);
      if (newBiome !== getBiomeKey(state.floor - 1)) {
        showFloorCard(state.floor, newBiome, () => { inputLocked = false; });
      } else {
        inputLocked = false;
      }
    } catch (err) {
      console.error('[Glyph Depths] Descend transition failed:', err);
      addMessage('The descent wavers, but you regain your footing.', 'damage');
      inputLocked = false;
    } finally {
      $('fade').classList.remove('active');
    }
  }, 400);
}

function useItem(item, index) {
  const p = state.player;

  switch (item.itemType) {
    case 'weapon':
      if (p.classId === 'monk') {
        addMessage('Monks refuse to wield weapons.', 'damage');
        return;
      }
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
      if (p.classId === 'monk') {
        addMessage('Monks do not wear armor.', 'damage');
        return;
      }
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
      else if (item.special === 'detection') addMessage('You sense hidden seams in the stone.', 'good');
      else if (item.special === 'lantern') addMessage('The lantern hums softly. Use Oil Flasks to fuel it.', 'good');
      else if (item.special === 'soul') addMessage('The amulet pulses with dark energy.', 'good');
      Audio.useItem();
      break;

    case 'potion':
      applyPotionEffect(item);
      if ((item.count || 1) > 1) { item.count--; } else { p.inventory.splice(index, 1); }
      if (!item.identified) {
        potionIdentified[item.effectId] = true;
        addMessage(`It was a ${item.trueName}!`, 'good');
        refreshIdentifiedItems();
      }
      updateUI();
      render();
      endTurn();
      return;

    case 'scroll':
      applyScrollEffect(item);
      if ((item.count || 1) > 1) { item.count--; } else { p.inventory.splice(index, 1); }
      if (!item.identified) {
        scrollIdentified[item.effectId] = true;
        addMessage(`It was a ${item.trueName}!`, 'good');
        refreshIdentifiedItems();
      }
      updateUI();
      render();
      endTurn();
      return;

    case 'ranged':
      if (p.classId === 'monk') {
        addMessage('Monks do not use ranged weapons.', 'damage');
        return;
      }
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
      updateUI();
      render();
      endTurn();
      return;
    }

    case 'oil': {
      const hasLantern = p.inventory.some(it => it.itemType === 'lantern');
      if (!hasLantern) {
        addMessage('You need a lantern to use oil flasks.', 'damage');
        return;
      }
      addStatusEffect(p, 'lanternLit', state.player.sageClass ? 80 : 40);
      addMessage('🔦 You light the lantern! (+3 FOV)', 'good');
      haptic(30);
      p.inventory.splice(index, 1);
      computeFOV();
      updateUI();
      render();
      endTurn();
      return;
    }

    case 'song': {
      // Need an instrument to play
      const hasInstrument = p.inventory.some(it => it.itemType === 'instrument');
      if (!hasInstrument) {
        addMessage('You need an instrument to play songs.', 'damage');
        updateUI();
        render();
        return;
      }
      if (!p.songMastery && Math.random() < 0.5) {
        addMessage('You fumble the melody. The song is wasted.', 'damage');
        p.inventory.splice(p.inventory.indexOf(item), 1);
        updateUI();
        endTurn();
        return;
      }
      addStatusEffect(p, item.effectType, item.turns);
      addMessage(`🎵 You play ${item.name}!`, 'good');
      haptic(30);
      Audio.gold();
      p.inventory.splice(p.inventory.indexOf(item), 1);
      updateUI();
      endTurn();
      return;
    }
  }

  updateUI();
  render();
}

function dropItem(index) {
  const item = state.player.inventory[index];
  const dropped = { ...item, count: 1 };
  if ((item.count || 1) > 1) {
    item.count--;
  } else {
    state.player.inventory.splice(index, 1);
  }
  state.entities.push(createItemEntity(dropped, state.player.x, state.player.y));
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
    case 'walk_on_water':
    case 'waterwalk':
      addStatusEffect(p, 'walk_on_water', 30);
      addMessage('You feel light enough to tread on water!', 'good');
      break;
    // Brewed potions (Alchemist's Mortar)
    case 'fortitude':
      p.maxHp += 5; p.hp += 5;
      addMessage('You feel permanently tougher! (+5 max HP)', 'good');
      break;
    case 'ghostwalk':
      addStatusEffect(p, 'invisibility', 5);
      addStatusEffect(p, 'phasing', 5);
      addMessage('You become a ghost! Invisible and phasing!', 'good');
      break;
    case 'elixir':
      p.maxHp += 3; p.hp = p.maxHp;
      addMessage('The elixir restores and strengthens you! (+3 max HP, full heal)', 'good');
      break;
    case 'potent_healing':
      p.hp = Math.min(p.maxHp, p.hp + 20);
      addMessage('Potent healing surges through you! (+20 HP)', 'good');
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
      // Identify all potions and scrolls in inventory, then update everything
      for (const item of state.player.inventory) {
        if (item.itemType === 'potion' && !item.identified) potionIdentified[item.effectId] = true;
        if (item.itemType === 'scroll' && !item.identified) scrollIdentified[item.effectId] = true;
      }
      refreshIdentifiedItems();
      addMessage('Your items shimmer with clarity!', 'good');
      break;
    case 'walk_on_water':
      addStatusEffect(state.player, 'walk_on_water', 45);
      addMessage('You feel light enough to tread on water!', 'good');
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
      let added = 0, dropped = 0;
      for (let i = 0; i < count; i++) {
        if (addFoodToInventory()) {
          added++;
        } else {
          // Inventory full — drop ration on nearest open floor tile
          const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
          let placed = false;
          for (const [ddx, ddy] of dirs) {
            const fx = state.player.x + ddx, fy = state.player.y + ddy;
            if (isWalkable(fx, fy) && !state.entities.find(e => e.type === 'item' && e.x === fx && e.y === fy)) {
              state.entities.push({ type: 'item', x: fx, y: fy, glyph: '🍖', item: { ...FOOD, stack: 1 } });
              dropped++;
              placed = true;
              break;
            }
          }
          if (!placed) dropped++; // no space at all — silent loss (extremely rare)
        }
      }
      if (added > 0 && dropped > 0) {
        addMessage(`${added} ration${added > 1 ? 's' : ''} in your pack; ${dropped} dropped nearby!`, 'good');
      } else if (added > 0) {
        addMessage(`${added} ration${added > 1 ? 's' : ''} materialize${added === 1 ? 's' : ''} in your pack!`, 'good');
      } else {
        addMessage(`Inventory full — ${dropped} ration${dropped > 1 ? 's' : ''} dropped nearby!`, 'good');
      }
      break;
    }
  }
}

// === SPECIALTY ITEM MECHANICS ===

// Alchemist's Mortar: brew 3 herbs into a random potion
function brewWithMortar(mortarIndex) {
  const p = state.player;
  const herbIndices = [];
  for (let i = 0; i < p.inventory.length; i++) {
    if (p.inventory[i].itemType === 'herb') herbIndices.push(i);
  }
  if (herbIndices.length < 3) {
    addMessage(`Need 3 herbs to brew (have ${herbIndices.length}).`, 'damage');
    return;
  }
  // Remove 3 herbs (from end to preserve indices)
  herbIndices.slice(0, 3).sort((a, b) => b - a).forEach(i => p.inventory.splice(i, 1));
  // Brew a random identified potion
  const randomPotion = potionNames[Math.floor(Math.random() * potionNames.length)];
  const brewed = makePotion(randomPotion);
  brewed.identified = true;
  brewed.name = brewed.trueName;
  potionIdentified[randomPotion.id] = true;
  p.inventory.push(brewed);
  addMessage(`You brew a ${brewed.name}!`, 'good');
  Audio.useItem();
}

// Soul Amulet: collect fragments on kill, spend to heal
function soulAmuletCollect() {
  if (state.player.equipped.ring?.special !== 'soul') return;
  state.player.soulFragments++;
  addMessage(`Soul fragment collected! (${state.player.soulFragments})`, 'good');
}

function soulAmuletSpend() {
  const p = state.player;
  if (p.equipped.ring?.special !== 'soul') { addMessage('Equip the Soul Amulet first!', 'damage'); return; }
  if (p.soulFragments < 5) { addMessage(`Need 5 soul fragments (have ${p.soulFragments}).`, 'damage'); return; }
  p.soulFragments -= 5;
  p.hp = Math.min(p.maxHp, p.hp + 10);
  addMessage('You channel soul energy! (+10 HP)', 'good');
  Audio.useItem();
}

// Lantern fuel tick — consume 1 fuel per turn when equipped
function tickLanternFuel() {
  const p = state.player;
  if (p.equipped.ring?.special === 'lantern' && p.lanternFuel > 0) {
    p.lanternFuel--;
    if (p.lanternFuel === 0) {
      addMessage('Your lantern sputters out!', 'damage');
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
    // High-cost options
    { text: 'Sacrifice 5 Max HP for +2 Attack', apply: () => { state.player.maxHp -= 5; state.player.hp = Math.min(state.player.hp, state.player.maxHp); state.player.attack += 2; }},
    { text: 'Sacrifice 10 Gold for +1 Defense', apply: () => { state.player.gold = Math.max(0, state.player.gold - 10); state.player.defense += 1; }},
    { text: 'Sanctify your soul — gain life-drain immunity', rare: true, apply: () => { state.player.drainImmune = true; addMessage('🛡️ Your soul is shielded from the hunger of wraiths.', 'good'); }, condition: () => !state.player.drainImmune && state.player.classId !== 'cleric' },
    { text: 'Sacrifice 3 Max HP to restore 30 hunger', apply: () => { state.player.maxHp -= 3; state.player.hp = Math.min(state.player.hp, state.player.maxHp); state.player.hunger = Math.min(100, state.player.hunger + 30); }},
    // Low-cost / helpful options
    { text: 'The shrine tends your wounds — restore 4 HP', apply: () => { state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4); addMessage('The shrine mends your wounds.', 'good'); }, condition: () => state.player.hp < state.player.maxHp },
    { text: 'The shrine eases your hunger — restore 25 hunger', apply: () => { state.player.hunger = Math.min(100, state.player.hunger + 25); addMessage('The shrine soothes your hunger.', 'good'); }, condition: () => state.player.hunger < 80 },
  ];
  // Filter to available options; rare options have a 70% chance to be skipped
  const sacrifices = allSacrifices.filter(s => {
    if (s.condition && !s.condition()) return false;
    if (s.rare && Math.random() < 0.70) return false;
    return true;
  });
  // Pick 3 random options from available, plus "leave"
  while (sacrifices.length > 3) sacrifices.splice(Math.floor(Math.random() * sacrifices.length), 1);
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

// === LOCAL PRICING ===
// Per-instance price inflation: each purchase of a specific item/service
// from a specific shop entity increases that item's price by 15%.
function getLocalPrice(entity, key, basePrice) {
  if (!entity._purchaseCounts) entity._purchaseCounts = {};
  const count = entity._purchaseCounts[key] || 0;
  return Math.ceil(basePrice * (1 + 0.15 * count));
}

function recordLocalPurchase(entity, key) {
  if (!entity._purchaseCounts) entity._purchaseCounts = {};
  entity._purchaseCounts[key] = (entity._purchaseCounts[key] || 0) + 1;
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
  if (discountEl) discountEl.style.display = 'none';
  const container = $('shop-items');
  container.innerHTML = '';

  let expandedDiv = null; // track which item card is currently expanded

  for (const shopItem of merchant.shopItems) {
    const div = document.createElement('div');
    div.className = 'shop-item';
    const it = shopItem.item;
    let statTag = '';
    if (it.itemType === 'weapon' && it.attack != null) statTag = ` <span style="color:var(--accent);font-size:11px;">[+${it.attack} ATK]</span>`;
    else if (it.itemType === 'ranged') statTag = ` <span style="color:#4a9;font-size:11px;">[${it.damage} DMG, ${it.range} rng]</span>`;
    else if (it.itemType === 'armor' && it.defense != null) statTag = ` <span style="color:#60c0ff;font-size:11px;">[+${it.defense} DEF]</span>`;
    else if (it.cursed && it.curseRevealed) statTag = ` <span style="color:#ff4040;font-size:11px;">[CURSED]</span>`;
    const tierTag = (it.tier >= 3 && it.special)
      ? ` <span style="color:#ffcc00;font-size:11px;">[Epic]</span>`
      : (it.tier === 3)
      ? ` <span style="color:#aa44ff;font-size:11px;">[Rare]</span>`
      : '';
    const effectivePrice = getLocalPrice(merchant, it.name, shopItem.price);
    const exclusiveTag = '';
    const collapsedHTML = `<span>${it.glyph} ${it.name}${statTag}${tierTag}${exclusiveTag}</span><span class="price">${effectivePrice}💰</span>`;
    div.innerHTML = collapsedHTML;

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
        } else if (shopItem.item.itemType === 'special_arrow') {
          const existing = state.player.inventory.find(i =>
            i.itemType === 'special_arrow' && i.arrowType === shopItem.item.arrowType
          );
          if (existing) {
            existing.ammo += shopItem.item.ammo;
            addMessage(`You buy ${shopItem.item.name}. (${existing.ammo} total)`, 'good');
          } else if (state.player.inventory.length >= MAX_INVENTORY) {
            const bought = { ...shopItem.item };
            state.entities.push({ type: 'item', x: state.player.x, y: state.player.y, glyph: bought.glyph, item: bought });
            addMessage(`Inventory full — ${bought.name} dropped at your feet.`, 'damage');
          } else {
            state.player.inventory.push({ ...shopItem.item });
            addMessage(`You buy ${shopItem.item.name}.`, 'good');
            if (settings.autoEquip) tryAutoEquip(state.player.inventory[state.player.inventory.length - 1]);
          }
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
        recordLocalPurchase(merchant, shopItem.item.name);
        $('merchant-gold').textContent = `Your gold: ${state.player.gold}`;
        div.style.opacity = '0.3';
        div.style.pointerEvents = 'none';
        expandedDiv = null;
        updateUI();
      } else {
        addMessage("You can't afford that.", 'damage');
        // Collapse back on failure
        div.innerHTML = collapsedHTML;
        div.style.flexDirection = '';
        div.style.alignItems = '';
        expandedDiv = null;
      }
    };

    const expandItem = () => {
      if (div.style.pointerEvents === 'none') return;
      // If already expanded, collapse it
      if (expandedDiv === div) {
        div.innerHTML = collapsedHTML;
        div.style.flexDirection = '';
        div.style.alignItems = '';
        expandedDiv = null;
        return;
      }
      // Collapse any previously expanded item
      if (expandedDiv) {
        expandedDiv.innerHTML = expandedDiv._collapsedHTML || '';
        expandedDiv.style.flexDirection = '';
        expandedDiv.style.alignItems = '';
        expandedDiv = null;
      }
      // Build item description
      let desc = '';
      if (it.desc) desc = it.desc;
      else if (it.itemType === 'weapon') desc = `Melee weapon. +${it.attack} ATK.`;
      else if (it.itemType === 'ranged') desc = `Ranged weapon. ${it.damage} DMG, range ${it.range}.`;
      else if (it.itemType === 'armor') desc = `Armor. +${it.defense} DEF.`;
      else if (it.itemType === 'food') desc = 'Restores 30 hunger.';
      else if (it.itemType === 'arrows') desc = `${it.count} arrows for your ranged weapon.`;
      else if (it.itemType === 'ring') desc = it.effect ? `Ring. ${it.effect}.` : 'A magical ring.';
      else if (it.itemType === 'potion') desc = it.identified ? (it.desc || 'A potion.') : 'Unidentified potion.';
      else if (it.itemType === 'scroll') desc = it.identified ? (it.desc || 'A scroll.') : 'Unidentified scroll.';

      const canAfford = state.player.gold >= effectivePrice;
      div._collapsedHTML = collapsedHTML;
      div.style.flexDirection = 'column';
      div.style.alignItems = 'stretch';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>${it.glyph} ${it.name}${statTag}${exclusiveTag}</span>
          <span class="price">${effectivePrice}💰</span>
        </div>
        ${desc ? `<div style="font-size:12px;color:var(--text-dim);margin:6px 0 8px;">${desc}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="save-action-btn" style="flex:1;min-height:44px;background:${canAfford ? 'var(--gold)' : 'var(--btn)'};color:${canAfford ? '#000' : 'var(--text-dim)'};border-color:${canAfford ? 'var(--gold)' : 'var(--panel-border)'};" id="_shop_buy_btn">Buy ${effectivePrice}💰</button>
          <button class="save-action-btn" style="flex:1;min-height:44px;" id="_shop_cancel_btn">Cancel</button>
        </div>`;

      const buyBtn = div.querySelector('#_shop_buy_btn');
      const cancelBtn = div.querySelector('#_shop_cancel_btn');
      const doBuy = () => { buyHandler(); };
      const doCancel = () => {
        div.innerHTML = collapsedHTML;
        div.style.flexDirection = '';
        div.style.alignItems = '';
        expandedDiv = null;
      };
      buyBtn.addEventListener('click', doBuy);
      buyBtn.addEventListener('touchend', (e) => { e.preventDefault(); doBuy(); }, { passive: false });
      cancelBtn.addEventListener('click', doCancel);
      cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); doCancel(); }, { passive: false });
      expandedDiv = div;
    };

    div.addEventListener('click', expandItem);
    div.addEventListener('touchend', (e) => { e.preventDefault(); expandItem(); }, { passive: false });
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
function tickEnchantedWalls() {
  const walls = [];
  const enchantedRooms = state.rooms.filter(r => r.isEnchanted);
  if (enchantedRooms.length === 0) return;

  for (const r of enchantedRooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (getTile(x, y) === T.ENCHANTED_WALL) {
          walls.push({ x, y, room: r });
        }
      }
    }
  }

  walls.sort(() => Math.random() - 0.5);

  for (const w of walls) {
    if (Math.random() < 0.25) { 
      const dirs = [{dx:1,dy:0}, {dx:-1,dy:0}, {dx:0,dy:1}, {dx:0,dy:-1}];
      const valid = dirs.filter(d => {
        const nx = w.x + d.dx;
        const ny = w.y + d.dy;
        if (nx <= w.room.x || nx >= w.room.x + w.room.w - 1 || ny <= w.room.y || ny >= w.room.y + w.room.h - 1) return false;
        if (getTile(nx, ny) !== T.FLOOR) return false;
        if (enemyAt(nx, ny)) return false;
        if (state.player.x === nx && state.player.y === ny) return false;
        // Don't step on dropped items
        if (itemsAt(nx, ny).length > 0) return false;
        return true;
      });

      if (valid.length > 0) {
        const move = valid[Math.floor(Math.random() * valid.length)];
        setTile(w.x, w.y, T.FLOOR);
        setTile(w.x + move.dx, w.y + move.dy, T.ENCHANTED_WALL);
      }
    }
  }
}

function endTurn() {
  if (state.gameOver || state.victory) return;
  tickEnchantedWalls();

  // Track player movement for Blind Stalker special
  // movedLastTurn is set to true in playerMove when the player actually moves
  // We reset it here after processEnemies uses it

  state.turnCount++;
  state.player.turnsSurvived++;
  if (state.player.hp > state.peakHp) state.peakHp = state.player.hp;

  // Hunger (Berserker drains 2x faster; Ring of Hunger halves drain)
  if (state.turnCount % HUNGER_TICK === 0) {
    const ringBonus = hasRingEffect('hunger') ? 0.5 : 1;
    const runeBonus = hasRune('hunger') ? 0.75 : 1;
    const classRate = state.player.hungerRate || 1;
    const plentyBonus = hasStatusEffect(state.player, 'plenty') ? 0.5 : 1;
    const diffMult = state.difficulty === 'easy' ? 0.75 : state.difficulty === 'hard' ? 1.25 : 1;
    // Early floors: hunger drains more slowly to ease new players into the mechanic
    const earlyFloorMult = state.floor <= 2 ? 0.5 : state.floor <= 4 ? 0.75 : 1;
    const rate = classRate * ringBonus * runeBonus * plentyBonus * diffMult * earlyFloorMult;
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
    if (state.floor <= 3) {
      // Grace period: warn but no HP damage on early floors so new players aren't killed by hunger before finding food
      addMessage('You are famished, but press on.', 'damage');
    } else {
      state.player.hp--;
      addMessage('You are starving! (-1 HP)', 'damage');
      if (state.player.hp <= 0) { playerDeath('starvation', '🍖'); return; }
    }
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
  if (state.player.aimedShotCooldown > 0) state.player.aimedShotCooldown--;
  if (state.player.acidBoltCooldown > 0) state.player.acidBoltCooldown--;
  if (state.player.illusionCooldown > 0) state.player.illusionCooldown--;
  if (state.player.arcaneDartCooldown > 0) state.player.arcaneDartCooldown--;
  if (state.player.weakenCooldown > 0) state.player.weakenCooldown--;
  if (state.player.meditateCooldown > 0) state.player.meditateCooldown--;
  if (state.player.vialOfSlimeCooldown > 0) state.player.vialOfSlimeCooldown--;
  if (state.player.thunderclapCooldown > 0) state.player.thunderclapCooldown--;

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

  // Lantern fuel tick
  tickLanternFuel();

  // === SPECIAL TERRAIN EFFECTS (per-turn) ===

  // FIRE PATH — 1 HP/turn while standing on it
  if (getTile(state.player.x, state.player.y) === T.FIRE_PATH) {
    if (hasStatusEffect(state.player, 'wet')) {
      // Wet extinguishes fire path tile
      setTile(state.player.x, state.player.y, T.FLOOR);
      addMessage('Your wet body douses the fire path!', 'good');
    } else {
      state.player.hp -= 1;
      addMessage('The fire scorches you! (-1 HP)', 'damage');
      if (state.player.hp <= 0) { playerDeath('fire path', '🔥'); return; }
    }
  }

  // WATERFALL SPRAY — apply wet status to player if on an adjacent corridor tile
  for (let wy = 0; wy < MAP_H; wy++) {
    for (let wx = 0; wx < MAP_W; wx++) {
      if (getTile(wx, wy) !== T.WATERFALL) continue;
      for (const [ddx, ddy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const tx = wx + ddx, ty = wy + ddy;
        if (getTile(tx, ty) !== T.CORRIDOR) continue;
        if (state.player.x === tx && state.player.y === ty) {
          addStatusEffect(state.player, 'wet', 2);
          // Wet amplifies frozen: if already frozen, extend duration
          const frozenEff = state.player.statusEffects?.find(s => s.type === 'frozen');
          if (frozenEff) frozenEff.turns = Math.min(frozenEff.turns + 1, 6);
          break;
        }
      }
    }
  }

  syncPlayerWoozyStatus();

  // Enemy turns
  processEnemies();
  // Reset movement tracking after enemies have processed
  state.player.movedLastTurn = false;
  if (state.gameOver) return;

  // Status effects
  processStatusEffects();
  if (state.gameOver) return;

  // Victory check (boss dead on final floor)
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
  return state.player.equipped?.ring?.special === effect;
}

function canDetectSecretWalls() {
  return state.player.classId === 'rogue' || hasRingEffect('detection');
}

function hasEnchantedWallImmunity() {
  return state.player.classId === 'rogue' || hasRingEffect('detection');
}

function getRoomAt(x, y) {
  return state.rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null;
}

function roomHasEnchantedWall(roomIdx) {
  return state.entities.some(e => e.type === 'enchanted_wall' && e.roomIdx === roomIdx);
}

function syncPlayerWoozyStatus() {
  const p = state.player;
  const room = getRoomAt(p.x, p.y);
  const roomIdx = room ? state.rooms.indexOf(room) : -1;
  const inWoozyRoom = roomIdx >= 0 && roomHasEnchantedWall(roomIdx);
  const effects = Array.isArray(p.statusEffects) ? p.statusEffects : (p.statusEffects = []);
  const woozy = effects.find(e => e.type === 'woozy');
  if (inWoozyRoom && hasEnchantedWallImmunity()) {
    if (woozy) p.statusEffects = effects.filter(e => e.type !== 'woozy');
    if (p.enchantedImmunityRoomIdx !== roomIdx) {
      addMessage('The enchanted walls glow but seem to have no effect on you.', '');
      p.enchantedImmunityRoomIdx = roomIdx;
    }
  } else if (inWoozyRoom) {
    if (!woozy) {
      addStatusEffect(p, 'woozy', 999);
      addMessage('You feel kind of woozy all of a sudden.', '');
    } else {
      woozy.turns = 999;
    }
  } else if (woozy) {
    p.statusEffects = effects.filter(e => e.type !== 'woozy');
    addMessage('You feel better.', 'good');
    p.enchantedImmunityRoomIdx = -1;
  } else {
    p.enchantedImmunityRoomIdx = -1;
  }
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

function animateDamageNumber(mapX, mapY, amount, isCrit, targetIsPlayer) {
  const p = state.player;
  const ts = tileSize;
  const camX = Math.max(0, Math.min(MAP_W - VIEW_COLS, p.x - Math.floor(VIEW_COLS / 2)));
  const camY = Math.max(0, Math.min(MAP_H - VIEW_ROWS, p.y - Math.floor(VIEW_ROWS / 2)));
  const color = targetIsPlayer ? '#ff4444' : (isCrit ? '#ffaa00' : '#ffffff');
  activeAnimations.push({
    type: 'dmgnum',
    text: String(amount),
    color,
    scale: isCrit ? 1.35 : 1.0,
    cx: (mapX - camX) * ts + ts / 2,
    cy: (mapY - camY) * ts + ts / 2,
    t: 0, dur: 600
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
      // Check if an enemy is at the target — if so, stop the projectile short
      let hasTarget = false;
      if (a.targetMapX != null && state) {
        hasTarget = state.entities.some(e => e.type === 'enemy' && e.x === a.targetMapX && e.y === a.targetMapY);
      }
      // If hitting a target, projectile stops at ~85% of the way (just before the enemy)
      const effectiveProgress = hasTarget ? Math.min(progress, 0.85) : progress;
      const x = a.sx + (a.ex - a.sx) * effectiveProgress;
      const y = a.sy + (a.ey - a.sy) * effectiveProgress;
      // Fade out projectile as it reaches target
      const fadeAlpha = hasTarget && progress > 0.7 ? Math.max(0, 1 - (progress - 0.7) / 0.3) : 1;
      ctx.globalAlpha = fadeAlpha;
      ctx.font = `${Math.floor(tileSize * 0.6)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.glyph, x, y);
      ctx.globalAlpha = 1.0;
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
    } else if (a.type === 'dmgnum') {
      const yDraw = a.cy - progress * tileSize * 1.5;
      const alpha = progress < 0.4 ? 1.0 : 1.0 - (progress - 0.4) / 0.6;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `bold ${Math.floor(tileSize * 0.55 * a.scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 1;
      ctx.fillStyle = a.color;
      ctx.fillText(a.text, a.cx, yDraw);
      ctx.shadowBlur = 0;
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
    } else if (val instanceof Map) {
      s[key] = { _map: true, data: Array.from(val.entries()) };
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

function normalizeLoadedStateObject(s) {
  if (!s || !s.player) return;
  normalizeLoadedPlayer(s.player);
  ensureMonkInstrument(s.player);
  if (!Array.isArray(s.entities)) s.entities = [];
  s.entities = s.entities.filter(e => {
    if (!e || !e.type) return false;
    if (e.beastmasterHound || e.charmedByBeastmaster) {
      e.type = 'enemy';
      e.isAlly = true;
      e.ai = 'ally';
      e.allyTurns = 99999;
    }
    return true;
  });
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
      else if (s[key] && s[key]._map) s[key] = new Map(s[key].data);
      else if (s[key] && s[key]._set) s[key] = new Set(s[key].data);
    }
    normalizeLoadedStateObject(s);
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
    // Safety net: if rubble blocks path to stairs, clear all rubble
    fixBlockedStairs();
    Audio.startAmbient(getBiomeKey(state.floor));
    ensureBeastmasterHound();
    computeFOV();
    render();
    updateUI();
    return true;
  } catch { return false; }
}

// Clear rubble if player cannot reach stairs — fixes saves where avalanche blocked the path
function fixBlockedStairs() {
  if (!state || !state.map || !state.player) return;
  let sx = -1, sy = -1;
  for (let i = 0; i < state.map.length; i++) {
    if (state.map[i] === T.STAIRS_DOWN) { sx = i % MAP_W; sy = Math.floor(i / MAP_W); break; }
  }
  if (sx < 0) return;
  if (!bfsReachable(state.player.x, state.player.y, sx, sy)) {
    let cleared = 0;
    for (let i = 0; i < state.map.length; i++) {
      if (state.map[i] === T.RUBBLE) { state.map[i] = T.FLOOR; cleared++; }
    }
    if (cleared > 0) addMessage('Rubble crumbles, revealing a passable path!', 'good');
  }
  // Second pass: if stairs are still unreachable (e.g. water bug), convert
  // water tiles around the stairs to bridges and move player to stairs
  if (!bfsReachable(state.player.x, state.player.y, sx, sy)) {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = sx + dx, ty = sy + dy;
          if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue;
          if (state.map[ty * MAP_W + tx] === T.WATER || state.map[ty * MAP_W + tx] === T.STEPPING_STONE) {
            state.map[ty * MAP_W + tx] = T.BRIDGE;
          }
        }
      }
      if (bfsReachable(state.player.x, state.player.y, sx, sy)) break;
    }
    // If still unreachable, teleport player directly to stairs
    if (!bfsReachable(state.player.x, state.player.y, sx, sy)) {
      state.player.x = sx;
      state.player.y = sy;
      addMessage('The water recedes — you find yourself at the stairs.', 'gold');
    } else {
      addMessage('The water parts, revealing a path.', 'gold');
    }
  }
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

    // Restore state, converting Uint8Array/Map/Set markers back
    const s = saveData.state;
    for (const key of Object.keys(s)) {
      if (s[key] && s[key]._uint8) {
        s[key] = new Uint8Array(s[key].data);
      } else if (s[key] && s[key]._map) {
        s[key] = new Map(s[key].data);
      } else if (s[key] && s[key]._set) {
        s[key] = new Set(s[key].data);
      }
    }
    normalizeLoadedStateObject(s);
    state = s;

    // Save migration: if save was made before Caverns biome (MAX_FLOOR was 20)
    // and floor >= 5, shift floor numbers up by 4 to match new 24-floor layout
    if (state._savedMaxFloor && state._savedMaxFloor < 24 && state.floor >= 5) {
      state.floor = Math.min(state.floor + 4, 24);
    }
    state._savedMaxFloor = MAX_FLOOR;

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
    Audio.startAmbient(getBiomeKey(state.floor));

    // Track which save slot was loaded (for auto-delete on death)
    state._loadedFromSlot = slot;

    // Safety net: if rubble blocks path to stairs, clear all rubble
    fixBlockedStairs();
    ensureBeastmasterHound();
    // Recompute FOV and render
    setupCanvas();
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
    const cls = getClassDef(p.classId);
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

function showSavesOverlay(fromTitle) {
  const overlay = $('saves-overlay');
  const inner = $('saves-overlay-inner');
  inner.innerHTML = '';

  // Title row with inline close button
  const titleRow = document.createElement('div');
  titleRow.className = 'saves-title-row';
  const titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-size:20px;font-weight:800;letter-spacing:0.08em;color:var(--gold);';
  titleEl.textContent = 'Saved Games';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'big-btn';
  closeBtn.style.cssText = 'padding:6px 16px;font-size:13px;min-width:0;margin:0;';
  closeBtn.textContent = 'Close';
  const closeFn = () => closeSavesOverlay();
  closeBtn.addEventListener('click', closeFn);
  closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); closeFn(); }, { passive: false });
  titleRow.appendChild(titleEl);
  titleRow.appendChild(closeBtn);
  inner.appendChild(titleRow);

  // Auth bar (Google sign-in status)
  const authBar = document.createElement('div');
  authBar.id = 'saves-auth-bar';
  inner.appendChild(authBar);

  // Current game save section (shown only when a run is in progress)
  const gameSection = document.createElement('div');
  gameSection.id = 'saves-game-section';
  inner.appendChild(gameSection);
  _renderSavesGameSection(gameSection);

  // Saves list -- local saves rendered immediately; cloud added async
  const listEl = document.createElement('div');
  listEl.id = 'saves-list';
  inner.appendChild(listEl);
  _renderSavesList(listEl, _getLocalSaves(), [], fromTitle, false);

  inputLocked = true;
  overlay.classList.add('active');

  // Load Firebase asynchronously, then populate auth bar and cloud saves
  if (isFirebaseConfigured()) {
    loadFirebaseSDK().then(() => initFirebase()).then(() => {
      _renderSavesAuthBar(authBar, listEl, fromTitle);
      if (firebaseUser) {
        _renderSavesList(listEl, _getLocalSaves(), null, fromTitle, true);
        cloudListSaves().then(cloudSaves => {
          _renderSavesList(listEl, _getLocalSaves(), cloudSaves, fromTitle, false);
        }).catch(err => {
          console.error('[Glyph Depths] cloudListSaves error (showSavesOverlay):', err);
          _renderSavesList(listEl, _getLocalSaves(), 'error', fromTitle, false);
        });
      }
    }).catch(err => {
      console.error('[Glyph Depths] Firebase init error:', err);
      _renderSavesAuthBar(authBar, listEl, fromTitle);
    });
  }
}

function closeSavesOverlay() {
  $('saves-overlay').classList.remove('active');
  inputLocked = false;
}

function _getLocalSaves() {
  const saves = [];
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    const info = getSaveSlotInfo(i);
    if (info) saves.push({ ...info, storage: 'local', slotKey: i });
  }
  return saves;
}

function _renderSavesAuthBar(barEl, listEl, fromTitle) {
  barEl.innerHTML = '';
  if (!isFirebaseConfigured()) return;

  const bar = document.createElement('div');
  bar.className = 'saves-auth-bar';

  if (firebaseUser) {
    const icon = document.createElement('span');
    icon.className = 'saves-auth-bar-icon';
    icon.textContent = '\u2601\uFE0F';
    const textDiv = document.createElement('div');
    textDiv.className = 'saves-auth-bar-text';
    textDiv.innerHTML = '<strong>' + (firebaseUser.displayName || firebaseUser.email) + '</strong>Cloud sync active';
    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'saves-auth-btn sign-out';
    signOutBtn.textContent = 'Sign Out';
    const fn = () => {
      cloudSignOut();
      barEl.innerHTML = '';
      _renderSavesAuthBar(barEl, listEl, fromTitle);
      _renderSavesList(listEl, _getLocalSaves(), [], fromTitle, false);
    };
    signOutBtn.addEventListener('click', fn);
    signOutBtn.addEventListener('touchend', (e) => { e.preventDefault(); fn(); }, { passive: false });
    bar.appendChild(icon);
    bar.appendChild(textDiv);
    bar.appendChild(signOutBtn);
  } else {
    const icon = document.createElement('span');
    icon.className = 'saves-auth-bar-icon';
    icon.textContent = '\uD83D\uDD11';
    const textDiv = document.createElement('div');
    textDiv.className = 'saves-auth-bar-text';
    textDiv.innerHTML = '<strong>Cloud Sync</strong>Sign in with Google to sync saves across devices';
    const signInBtn = document.createElement('button');
    signInBtn.className = 'saves-auth-btn';
    signInBtn.textContent = 'Sign In';
    const fn = () => {
      // iOS standalone: signInWithPopup is blocked and signInWithRedirect leaves the
      // webclip context. Instead, open the app in Safari (same origin = shared IndexedDB).
      // The user signs in there, then returns and taps the button again to reload, at
      // which point Firebase reads the auth state from IndexedDB.
      if (window.navigator.standalone === true) {
        if (signInBtn.dataset.step === 'waiting') {
          location.reload();
          return;
        }
        signInBtn.dataset.step = 'waiting';
        signInBtn.textContent = 'Tap here when done';
        window.open(location.href);
        return;
      }
      signInBtn.textContent = '...';
      signInBtn.disabled = true;
      cloudSignIn().then(() => {
        barEl.innerHTML = '';
        _renderSavesAuthBar(barEl, listEl, fromTitle);
        _renderSavesList(listEl, _getLocalSaves(), null, fromTitle, true);
        cloudListSaves().then(cloudSaves => {
          _renderSavesList(listEl, _getLocalSaves(), cloudSaves, fromTitle, false);
        }).catch(err => {
          console.error('[Glyph Depths] cloudListSaves error (after sign-in):', err);
          _renderSavesList(listEl, _getLocalSaves(), 'error', fromTitle, false);
        });
      }).catch(() => {
        barEl.innerHTML = '';
        const errBar = document.createElement('div');
        errBar.className = 'saves-auth-bar';
        errBar.style.borderColor = '#944';
        const errText = document.createElement('div');
        errText.className = 'saves-auth-bar-text';
        errText.style.color = '#f64';
        errText.textContent = 'Sign-in failed. Try again or use a different browser on iOS.';
        const retryBtn = document.createElement('button');
        retryBtn.className = 'saves-auth-btn';
        retryBtn.textContent = 'Retry';
        const retryFn = () => { barEl.innerHTML = ''; _renderSavesAuthBar(barEl, listEl, fromTitle); };
        retryBtn.addEventListener('click', retryFn);
        retryBtn.addEventListener('touchend', (e) => { e.preventDefault(); retryFn(); }, { passive: false });
        errBar.appendChild(errText);
        errBar.appendChild(retryBtn);
        barEl.appendChild(errBar);
      });
    };
    signInBtn.addEventListener('click', fn);
    signInBtn.addEventListener('touchend', (e) => { e.preventDefault(); fn(); }, { passive: false });
    bar.appendChild(icon);
    bar.appendChild(textDiv);
    bar.appendChild(signInBtn);
  }

  barEl.appendChild(bar);
}

function _renderSavesGameSection(sectionEl) {
  sectionEl.innerHTML = '';
  if (!state || state.gameOver || state.victory) return;

  const card = document.createElement('div');
  card.className = 'saves-current-game';

  const label = document.createElement('div');
  label.className = 'saves-current-game-label';
  label.textContent = 'Current Run';
  card.appendChild(label);

  const cls = CLASS_DEFS.find(c => c.id === state.player.classId);
  const charInfo = document.createElement('div');
  charInfo.style.cssText = 'font-size:12px;margin-bottom:10px;';
  charInfo.innerHTML =
    '<span style="color:var(--gold);font-weight:700;">'
    + (cls ? cls.icon + ' ' : '') + state.playerName + (state.playerEpithet ? ' ' + state.playerEpithet : '')
    + '</span> <span style="color:var(--text-dim);">'
    + (cls ? cls.name : '') + ' \u00B7 Floor ' + state.floor + ' \u00B7 Lv.' + state.player.level + ' \u00B7 ' + state.player.hp + '/' + state.player.maxHp + ' HP'
    + '</span>';
  card.appendChild(charInfo);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'saves-save-btn';
  saveBtn.textContent = '\uD83D\uDCBE Save Current Game';
  const saveFn = () => {
    saveBtn.textContent = 'Saving\u2026';
    saveBtn.disabled = true;
    _doSaveCurrentGame(saveBtn, sectionEl);
  };
  saveBtn.addEventListener('click', saveFn);
  saveBtn.addEventListener('touchend', (e) => { e.preventDefault(); saveFn(); }, { passive: false });
  card.appendChild(saveBtn);

  sectionEl.appendChild(card);
}

function _doSaveCurrentGame(saveBtn, sectionEl) {
  const curName = state.playerName || '';
  const curClass = state.player ? state.player.classId : '';

  // Find matching local slot (by previous load, then by name+class, then first empty, then slot 1)
  let localSlot = state._loadedFromSlot || null;
  if (!localSlot) {
    for (let j = 1; j <= SAVE_SLOTS; j++) {
      const si = getSaveSlotInfo(j);
      if (si && si.playerName === curName) {
        const cls = CLASS_DEFS.find(c => c.name === si.className);
        if (cls && cls.id === curClass) { localSlot = j; break; }
      }
    }
  }
  if (!localSlot) {
    for (let j = 1; j <= SAVE_SLOTS; j++) {
      if (!getSaveSlotInfo(j)) { localSlot = j; break; }
    }
  }
  if (!localSlot) localSlot = 1;

  const localOk = saveGameToSlot(localSlot);

  if (firebaseUser) {
    const safeKey = curName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    const cloudSlot = state._cloudLoadedSlot || ('slot_' + safeKey + '_' + curClass);
    cloudSaveGame(cloudSlot).then(() => {
      state._cloudLoadedSlot = cloudSlot;
      addMessage('Game saved locally & to cloud.', 'good');
      _renderSavesGameSection(sectionEl);
      const listEl = $('saves-list');
      if (listEl) {
        cloudListSaves().then(cloudSaves => {
          _renderSavesList(listEl, _getLocalSaves(), cloudSaves, false, false);
        }).catch(err => {
          console.error('[Glyph Depths] cloudListSaves error (after save):', err);
          _renderSavesList(listEl, _getLocalSaves(), 'error', false, false);
        });
      }
    }).catch(err => {
      if (localOk) addMessage('Saved locally. Cloud error: ' + (err.message || err), 'damage');
      _renderSavesGameSection(sectionEl);
    });
  } else {
    if (localOk) addMessage('Game saved to slot ' + localSlot + '.', 'good');
    _renderSavesGameSection(sectionEl);
    const listEl = $('saves-list');
    if (listEl) _renderSavesList(listEl, _getLocalSaves(), [], false, false);
  }
}

function _renderSavesList(listEl, localSaves, cloudSaves, fromTitle, loadingCloud) {
  listEl.innerHTML = '';

  // Merge local and cloud saves, sort by timestamp descending
  const allSaves = [];
  for (const s of (localSaves || [])) {
    allSaves.push({ ...s, storage: 'local' });
  }
  if (Array.isArray(cloudSaves)) {
    for (const s of cloudSaves) {
      const info = s.playerInfo || {};
      allSaves.push({
        storage: 'cloud',
        slotKey: s.slotName,
        playerName: info.name || 'Unknown',
        playerEpithet: info.epithet || '',
        className: info.className || '',
        classIcon: info.classIcon || '',
        floor: info.floor || '?',
        level: info.level || '?',
        hp: info.hp || '?',
        maxHp: info.maxHp || '?',
        timestamp: s.timestamp
      });
    }
  }

  allSaves.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });

  if (allSaves.length === 0 && !loadingCloud && cloudSaves !== 'error') {
    const empty = document.createElement('div');
    empty.className = 'saves-empty';
    empty.innerHTML = 'No saved games found.<br><span style="font-size:11px;opacity:0.7;">Start a game and save your progress to see it here.</span>';
    listEl.appendChild(empty);
    return;
  }

  if (allSaves.length > 0) {
    const secLabel = document.createElement('div');
    secLabel.className = 'saves-section-label';
    secLabel.textContent = 'Your Saves';
    listEl.appendChild(secLabel);
  }

  for (const save of allSaves) {
    const card = document.createElement('div');
    card.className = 'save-slot';
    const age = timeSince(save.timestamp);
    const badge = save.storage === 'cloud'
      ? '<span class="save-slot-badge cloud">\u2601 CLOUD</span>'
      : '<span class="save-slot-badge local">LOCAL</span>';
    card.innerHTML =
      '<div class="save-slot-header">'
      + '<span class="save-slot-name">' + (save.classIcon || '') + ' ' + save.playerName + (save.playerEpithet ? ' ' + save.playerEpithet : '') + badge + '</span>'
      + '<span class="save-slot-meta">' + (save.className || '') + '</span>'
      + '</div>'
      + '<div class="save-slot-details">'
      + 'Floor ' + save.floor + ' \u00B7 Lv.' + save.level + ' \u00B7 ' + save.hp + '/' + save.maxHp + ' HP'
      + '<span class="save-slot-time">' + age + '</span>'
      + '</div>';

    const btnRow = document.createElement('div');
    btnRow.className = 'save-slot-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'save-action-btn save-new';
    loadBtn.textContent = '\u25B6 Load';
    const loadFn = () => {
      if (save.storage === 'local') {
        if (loadGameFromSlot(save.slotKey)) {
          closeSavesOverlay();
          if (fromTitle) $('title-screen').classList.remove('active');
        } else {
          addMessage('Failed to load save.', 'damage');
        }
      } else {
        cloudLoadGame(save.slotKey).then(ok => {
          if (ok) {
            closeSavesOverlay();
            if (fromTitle) $('title-screen').classList.remove('active');
          }
        });
      }
    };
    loadBtn.addEventListener('click', loadFn);
    loadBtn.addEventListener('touchend', (e) => { e.preventDefault(); loadFn(); }, { passive: false });
    btnRow.appendChild(loadBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'save-action-btn save-delete';
    delBtn.textContent = '\uD83D\uDDD1';

    const capturedCloud = Array.isArray(cloudSaves) ? cloudSaves : [];
    const confirmDeleteFn = () => {
      // Replace btnRow with inline confirmation strip
      btnRow.innerHTML = '';
      const confirmLabel = document.createElement('span');
      confirmLabel.textContent = 'Delete?';
      confirmLabel.style.cssText = 'font-size:12px;color:var(--text-dim);align-self:center;flex:1';
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'save-action-btn save-delete';
      confirmBtn.textContent = 'Delete';
      confirmBtn.style.flex = '1';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'save-action-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.flex = '1';
      const doDelete = () => {
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        if (save.storage === 'local') {
          deleteSaveSlot(save.slotKey);
          _renderSavesList(listEl, _getLocalSaves(), capturedCloud, fromTitle, false);
        } else {
          cloudDeleteSave(save.slotKey).then(() => {
            cloudListSaves().then(newCloud => {
              _renderSavesList(listEl, _getLocalSaves(), newCloud, fromTitle, false);
            }).catch(err => {
              console.error('[Glyph Depths] cloudListSaves error (after delete):', err);
              _renderSavesList(listEl, _getLocalSaves(), [], fromTitle, false);
            });
          });
        }
      };
      const doCancel = () => {
        _renderSavesList(listEl, _getLocalSaves(), capturedCloud, fromTitle, false);
      };
      confirmBtn.addEventListener('click', doDelete);
      confirmBtn.addEventListener('touchend', (e) => { e.preventDefault(); doDelete(); }, { passive: false });
      cancelBtn.addEventListener('click', doCancel);
      cancelBtn.addEventListener('touchend', (e) => { e.preventDefault(); doCancel(); }, { passive: false });
      btnRow.appendChild(confirmLabel);
      btnRow.appendChild(confirmBtn);
      btnRow.appendChild(cancelBtn);
    };
    delBtn.addEventListener('click', confirmDeleteFn);
    delBtn.addEventListener('touchend', (e) => { e.preventDefault(); confirmDeleteFn(); }, { passive: false });
    btnRow.appendChild(delBtn);

    card.appendChild(btnRow);
    listEl.appendChild(card);
  }

  if (loadingCloud) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'saves-loading';
    loadingEl.textContent = '\u2601\uFE0F Loading cloud saves\u2026';
    listEl.appendChild(loadingEl);
  }

  if (cloudSaves === 'error') {
    const errEl = document.createElement('div');
    errEl.style.cssText = 'padding:10px 12px;margin:6px 0;background:rgba(200,60,60,0.15);border:1px solid #944;border-radius:6px;font-size:12px;color:#f88;';
    errEl.textContent = 'Could not load cloud saves. Check your connection and try again.';
    listEl.appendChild(errEl);
  }
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
    new Promise((_, reject) => setTimeout(() => {
      console.error('[Glyph Depths] Firestore operation timed out after ' + ((ms || 10000) / 1000) + 's');
      reject(new Error(
        'Cloud operation timed out. Check that Firestore is enabled in Firebase Console and security rules allow authenticated access.'
      ));
    }, ms || 10000))
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
      name: state.playerName || 'Unknown',
      epithet: state.playerEpithet || '',
      className: CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Berserker',
      classIcon: CLASS_DEFS.find(c => c.id === state.player.classId)?.icon || '?',
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
  // No .orderBy() here — that would require a composite Firestore index that may not exist.
  // Client-side sort in _renderSavesList() handles ordering instead.
  function attempt() {
    return firestoreTimeout(
      firebaseDb.collection('saves').where('uid', '==', firebaseUser.uid).get(),
      15000
    ).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  return attempt().catch(err => {
    console.error('[Glyph Depths] cloudListSaves failed, retrying:', err);
    return attempt();
  });
}

function cloudDeleteSave(slotName) {
  if (!firebaseUser || !firebaseDb) return Promise.reject('Not signed in');
  const docId = `${firebaseUser.uid}_${slotName}`;
  return firestoreTimeout(firebaseDb.collection('saves').doc(docId).delete()).then(() => {
    addMessage(`☁️ Cloud save deleted: ${slotName}`, '');
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
      if (tile === T.WATER && vis) {
        ctx.fillStyle = 'rgba(30, 110, 210, 0.30)';
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
        case T.ENCHANTED_WALL:
          tileGlyph = '▓';
          tileColor = vis ? '#c060ff' : '#4a1f62';
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
          tileGlyph = '·';
          tileColor = vis ? biome.floorVis : biome.floorDim;
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
          if (!cracked && vis && canDetectSecretWalls() && Math.random() < 0.30) {
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
        case T.TELEPORT: {
          // Ninja/Rogue/Escape Artist can sense hidden teleports, as can Ring of Detection
          const hasDetectRing = hasRingEffect('detection');
          if (state.player.teleportSight || hasDetectRing) {
            tileGlyph = '◊';
            tileColor = vis ? '#40e0d0' : '#1a6060';
          } else {
            // Invisible teleport — looks like normal floor until triggered
            tileGlyph = '·';
            tileColor = vis ? biome.floorVis : biome.floorDim;
          }
          break;
        }
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
        case T.WATER:
          tileGlyph = '≈';
          tileColor = vis ? (biome.waterVis || '#1a3050') : (biome.waterDim || '#0c1828');
          break;
        case T.BRIDGE:
          tileGlyph = '═';
          tileColor = vis ? '#8a6a3a' : '#4a3a1a';
          break;
        case T.STEPPING_STONE:
          tileGlyph = '◦';
          tileColor = vis ? '#6a8a8a' : '#3a4a4a';
          break;
        case T.STALAGMITE:
          tileGlyph = '▲';
          tileColor = vis ? '#5a6a70' : '#2a3238';
          break;
        case T.WATERFALL:
          tileGlyph = '≋';
          tileColor = vis ? '#a0d8ff' : '#304860';
          break;
        case T.MOUND:
          tileGlyph = '^';
          tileColor = vis ? '#8a6030' : '#3a2810';
          break;
        case T.ICY_PATH:
          tileGlyph = '·';
          tileColor = vis ? '#a0e8f8' : '#304858';
          break;
        case T.FIRE_PATH:
          tileGlyph = '▒';
          tileColor = vis ? '#e05010' : '#501808';
          break;
        case T.CHASM:
          tileGlyph = ' ';
          tileColor = '#000';
          // Draw a dark void background when visible
          if (vis) {
            ctx.fillStyle = 'rgba(5,0,15,0.85)';
            ctx.fillRect(vx * ts, vy * ts, ts, ts);
          }
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
    const moundRangeBonus = getTile(state.player.x, state.player.y) === T.MOUND ? 1 : 0;
    const maxRange = (throwItem?.itemType === 'aimed_shot' ? 15 : (throwItem?.range || 8)) + moundRangeBonus;
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

  // Pulsing outline on visible locked doors
  {
    let hasLockedDoor = false;
    for (let vy = 0; vy < VIEW_ROWS; vy++) {
      for (let vx = 0; vx < VIEW_COLS; vx++) {
        const mx = camX + vx, my = camY + vy;
        if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) continue;
        const idx = my * MAP_W + mx;
        if (state.map[idx] === T.DOOR_LOCKED && state.visible[idx]) {
          hasLockedDoor = true;
          const pulse = 0.20 + 0.15 * Math.sin(Date.now() / 350);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#ffc040';
          ctx.fillRect(vx * ts, vy * ts, ts, ts);
          ctx.globalAlpha = 1.0;
        }
      }
    }
    if (hasLockedDoor && !lockedDoorPulseActive) {
      lockedDoorPulseActive = true;
      requestAnimationFrame(function pulseDoor() {
        lockedDoorPulseActive = false;
        if (!state.gameOver) render();
      });
    } else if (!hasLockedDoor) {
      lockedDoorPulseActive = false;
    }
  }

  // Draw web hazards as a subtle floor overlay (before other entities so they appear underneath)
  ctx.save();
  ctx.font = `${Math.floor(ts * 0.75)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const e of state.entities) {
    if (e.type !== 'hazard' || e.hazardType !== 'web') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;
    // Fade slightly as turns run low
    ctx.globalAlpha = Math.min(0.55, 0.3 + (e.turns / 20) * 0.25);
    ctx.fillStyle = '#c8c0a0';
    ctx.fillText('░', sx, sy);
  }
  ctx.globalAlpha = 1.0;
  ctx.restore();

  // Draw items (only visible ones)
  for (const e of state.entities) {
    if (e.type !== 'item' && e.type !== 'hazard' && e.type !== 'ice_trap' && e.type !== 'illusion' && e.type !== 'wall_block') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;

    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    if (sx < -ts || sx > canvas.width + ts || sy < -ts || sy > canvas.height + ts) continue;

    // Skip web hazards — already drawn above
    if (e.type === 'hazard' && e.hazardType === 'web') continue;

    // Ice traps render in cyan
    if (e.type === 'ice_trap') {
      ctx.fillStyle = '#00ffff';
      ctx.font = `${Math.floor(ts * 0.6)}px serif`;
      ctx.fillText('❄️', sx, sy);
      continue;
    }

    // Illusion renders semi-transparent
    if (e.type === 'illusion') {
      ctx.globalAlpha = 0.5;
      ctx.font = `${Math.floor(ts * 0.7)}px serif`;
      ctx.fillText(e.glyph, sx, sy);
      ctx.globalAlpha = 1.0;
      continue;
    }

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

  // Draw warning signs (amber background, ⚠ glyph)
  for (const e of state.entities) {
    if (e.type !== 'sign') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const sx = (e.x - camX) * ts + ts / 2;
    const sy = (e.y - camY) * ts + ts / 2;
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#c08000';
    ctx.fillRect((e.x - camX) * ts + 1, (e.y - camY) * ts + 1, ts - 2, ts - 2);
    ctx.globalAlpha = 1.0;
    ctx.font = `${Math.floor(ts * 0.65)}px serif`;
    ctx.fillText('⚠', sx, sy);
  }

  // Draw enchanted walls (pulsing purple ▓ on wall tiles)
  for (const e of state.entities) {
    if (e.type !== 'enchanted_wall') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.explored[idx]) continue; // show if explored (wall tile)
    const vx = e.x - camX, vy = e.y - camY;
    if (vx < 0 || vx >= VIEW_COLS || vy < 0 || vy >= VIEW_ROWS) continue;
    const sx = vx * ts + ts / 2;
    const sy = vy * ts + ts / 2;
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#5010a0';
    ctx.fillRect(vx * ts, vy * ts, ts, ts);
    ctx.globalAlpha = 1.0;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = '#c060ff';
    ctx.fillText('▓', sx, sy);
    // Continuous redraw for pulse
    requestAnimationFrame(() => { if (!state.gameOver && !state.victory) render(); });
  }

  // Draw bridge entities (═ glyph on chasm tiles)
  for (const e of state.entities) {
    if (e.type !== 'bridge') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.visible[idx]) continue;
    const vx = e.x - camX, vy = e.y - camY;
    if (vx < 0 || vx >= VIEW_COLS || vy < 0 || vy >= VIEW_ROWS) continue;
    const sx = vx * ts + ts / 2;
    const sy = vy * ts + ts / 2;
    // Crack effect as HP decreases
    const hpFrac = e.hp / e.maxHp;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = hpFrac > 0.66 ? '#c8a060' : hpFrac > 0.33 ? '#a07030' : '#804010';
    ctx.fillText('═', sx, sy);
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

    // Potion of Invisibility thrown on enemy
    if (hasStatusEffect(e, 'invisible')) continue;

    // Stealth enemies are invisible until within 3 tiles (or hostile)
    if (e.special === 'stealth' && e.alertness < 2) {
      const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      if (dist > 3) continue; // completely invisible at distance
    }

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

    if (settings.showIntents) {
      const intent = getEnemyIntent(e);
      if (intent) {
        const iconSize = Math.max(10, Math.floor(ts * 0.30));
        const iconX = (e.x - camX) * ts + ts * 0.79;
        const iconY = (e.y - camY) * ts + ts * 0.24;
        const bubbleR = Math.max(6, Math.floor(ts * 0.17));
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.arc(iconX, iconY, bubbleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `bold ${iconSize}px monospace`;
        ctx.fillStyle = intent.color;
        ctx.fillText(intent.glyph, iconX, iconY);
      }
    }

    // Green ally indicator ring
    if (e.isAlly) {
      ctx.strokeStyle = '#40e040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, ts * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP bar for damaged enemies
    if (e.hp < e.maxHp) {
      const barW = ts - 4;
      const barH = 2;
      const barX = (e.x - camX) * ts + 2;
      const barY = (e.y - camY) * ts;
      ctx.fillStyle = e.isAlly ? '#206020' : '#c04040';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#40c040';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
    }

    // Intent indicator: ? for suspicious, ! for hostile
    if (!e.isAlly && e.alertness > 0) {
      const intentTxt = e.alertness === 1 ? '?' : '!';
      const intentColor = e.alertness === 1 ? '#ffffaa' : '#ff4444';
      ctx.fillStyle = intentColor;
      ctx.font = `bold ${Math.floor(ts * 0.4)}px sans-serif`;
      ctx.fillText(intentTxt, sx + ts * 0.3, sy - ts * 0.3);
    }
  }

  // Draw player — always on top of items/enemies/NPCs/stairs
  const playerSX = (p.x - camX) * ts + ts / 2;
  const playerSY = (p.y - camY) * ts + ts / 2;
  // Clear any overlapping entity glyphs by painting the tile background before the player glyph
  ctx.fillStyle = biome.bg;
  ctx.fillRect((p.x - camX) * ts, (p.y - camY) * ts, ts, ts);
  // Redraw the tile underneath the player (so the floor/stairs/etc. are still visible around the player)
  const playerTile = getTile(p.x, p.y);
  let playerTileGlyph, playerTileColor;
  switch (playerTile) {
    case T.STAIRS_DOWN: playerTileGlyph = '▼'; playerTileColor = '#80ff80'; break;
    case T.STAIRS_UP:   playerTileGlyph = '·'; playerTileColor = biome.floorVis; break;
    case T.DOOR_OPEN:   playerTileGlyph = '\\'; playerTileColor = '#c0a060'; break;
    case T.FLOOR:       playerTileGlyph = '·'; playerTileColor = biome.floorVis; break;
    case T.CORRIDOR:    playerTileGlyph = '·'; playerTileColor = biome.corrVis; break;
    default:            playerTileGlyph = '·'; playerTileColor = biome.floorVis; break;
  }
  ctx.globalAlpha = 1.0;
  ctx.font = `${Math.floor(ts * 0.7)}px monospace`;
  ctx.fillStyle = playerTileColor;
  ctx.fillText(playerTileGlyph, playerSX, playerSY);
  if (hasStatusEffect(p, 'invisibility')) {
    ctx.globalAlpha = 0.4;
  }
  const playerClassDef = getClassDef(p.classId);
  const playerClassImg = playerClassDef && playerClassDef.img && classImageCache[playerClassDef.img];
  if (playerClassImg && playerClassImg.complete && playerClassImg.naturalWidth > 0) {
    const imgSize = Math.floor(ts * 0.92);
    ctx.drawImage(playerClassImg, playerSX - imgSize / 2, playerSY - imgSize / 2, imgSize, imgSize);
  } else {
    ctx.font = `${Math.floor(ts * 0.75)}px serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.glyph, playerSX, playerSY);
  }
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
      arrowEl.textContent = `➶ ${p.arrows}`;
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
    closeDoorBtn.style.display = p.classId === 'rogue' ? '' : 'none';
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
    if (state.throwMode || state.fortifyMode) {
      spRow.style.display = '';
      setBtn('❌ CANCEL TARGETING', true, '#ff4444');
      setBar(100, '#ff4444');
    } else if (cls === 'berserker') {
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
      const weakenMax = 8;
      if (p.divineHealUsed && p.weakenCooldown > 0) {
        setBtn(`✝ WEAKEN ${p.weakenCooldown}t`, false);
        setBar(((weakenMax - p.weakenCooldown) / weakenMax) * 100, '#90b050');
      } else {
        setBtn('✝ CLERIC SPELLS', true, '#f0e060');
        if (p.weakenCooldown > 0) {
          setBar(((weakenMax - p.weakenCooldown) / weakenMax) * 100, '#90b050');
        } else {
          setBar(100, '#f0e060');
        }
      }
    } else if (cls === 'darkwizard') {
      spRow.style.display = '';
      if (p.acidBoltCooldown > 0) {
        setBtn(`☣️ BOLT ${p.acidBoltCooldown}t`, false);
        setBar(((7 - p.acidBoltCooldown) / 7) * 100, '#44cc44');
      } else {
        setBtn('☣️ ACID BOLT', true, '#44cc44');
        setBar(100, '#44cc44');
      }
    } else if (cls === 'escapeartist') {
      spRow.style.display = '';
      const maxEscape = getMasteryBonuses(cls).extraEscape ? 2 : 1;
      const usedEscape = Math.max(p.escapeRouteUsesFloor || 0, p.stairsTeleportFloorUsed ? 1 : 0);
      if (usedEscape >= maxEscape) {
        setBtn('💨 ESCAPE ✓ (next floor)', false);
        setBar(0, 'var(--text-dim)');
      } else {
        setBtn('💨 ESCAPE', true, '#80ffff');
        setBar(((maxEscape - usedEscape) / maxEscape) * 100, '#80ffff');
      }
    } else if (cls === 'conjurer') {
      spRow.style.display = '';
      const maxCD = getMasteryBonuses(cls).fastIllusion ? 6 : 8;
      if (p.illusionCooldown <= 0 && p.arcaneDartCooldown <= 0) {
        setBtn('✨ SPELLS', true, '#cc44ff');
        setBar(100, '#cc44ff');
      } else if (p.illusionCooldown <= 0 || p.arcaneDartCooldown <= 0) {
        setBtn(`✨ SPELLS ${Math.max(p.illusionCooldown, p.arcaneDartCooldown)}t`, true, '#cc44ff');
        setBar(100, '#cc44ff');
      } else {
        setBtn(`✨ SPELLS ${Math.min(p.illusionCooldown, p.arcaneDartCooldown)}t`, false, '#cc44ff');
        setBar(((maxCD - p.illusionCooldown) / maxCD) * 100, '#cc44ff');
      }
    } else if (cls === 'monk') {
      spRow.style.display = '';
      if (p.meditateCooldown > 0) {
        setBtn(`🧘 MEDITATE ${p.meditateCooldown}t`, false, '#60c0a0');
        setBar(((20 - p.meditateCooldown) / 20) * 100, '#60c0a0');
      } else {
        setBtn('🧘 MEDITATE', true, '#60c0a0');
        setBar(100, '#60c0a0');
      }
    } else if (cls === 'elementalist') {
      spRow.style.display = '';
      const vialMax = getMasteryBonuses(cls).fastVial ? 8 : 10;
      if (p.vialOfSlimeCooldown <= 0 && p.thunderclapCooldown <= 0) {
        setBtn('🧪 SPELLS', true, '#80ff00');
        setBar(100, '#80ff00');
      } else if (p.vialOfSlimeCooldown <= 0 || p.thunderclapCooldown <= 0) {
        setBtn(`🧪 SPELLS ${Math.max(p.vialOfSlimeCooldown, p.thunderclapCooldown)}t`, true, '#80ff00');
        setBar(100, '#80ff00');
      } else {
        setBtn(`🧪 SPELLS ${Math.min(p.vialOfSlimeCooldown, p.thunderclapCooldown)}t`, false, '#80ff00');
        setBar(((vialMax - p.vialOfSlimeCooldown) / vialMax) * 100, '#80ff00');
      }
    } else {
      spRow.style.display = '';
      setBtn('No special ability', false);
      setBar(0, 'var(--text-dim)');
    }
  }
}

function showItemDetailsMessage(item) {
  if (!item) return;
  let text = `${item.glyph} ${item.name}`;
  if (item.desc && item.desc !== '???') {
    text += ` — ${item.desc}`;
  } else if (item.itemType === 'ranged') {
    text += ` (${item.damage} DMG, ${item.range} range)`;
  } else if (item.attack) {
    text += ` (+${item.attack} ATK)`;
  } else if (item.defense) {
    text += ` (+${item.defense} DEF)`;
  }
  addMessage(text, 'gold');
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

  function showSlotInfo(item, el) {
    if (!item) return;
    let desc = '';
    if (item.desc && item.desc !== '???') desc = item.desc;
    else if (item.itemType === 'ranged') desc = `${item.damage || 0} DMG, ${item.range || 0} range`;
    else if (item.attack) desc = `+${item.attack} Attack`;
    else if (item.defense) desc = `+${item.defense} Defense`;
    else if (item.itemType === 'ring' && item.special) desc = `Ring effect: ${item.special}`;
    else desc = 'No additional details.';
    $('tip-name').textContent = `${item.glyph} ${item.name}`;
    $('tip-desc').textContent = desc;
    const tip = $('inspect-tip');
    const rect = el.getBoundingClientRect();
    const cx = Math.max(8, Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 208));
    const cy = Math.max(8, rect.top - 68);
    tip.style.left = `${cx}px`;
    tip.style.top = `${cy}px`;
    tip.classList.add('active');
    setTimeout(() => tip.classList.remove('active'), 2200);
    haptic(20);
  }

  // Helper: slot tap for menu, long-press for inspect tooltip
  function makeTappable(el, tapHandler, longPressHandler) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    let holdTimer = null;
    let sx = 0, sy = 0;
    let longPressFired = false;
    let suppressClick = false;
    el.addEventListener('click', (e) => {
      if (suppressClick) return;
      tapHandler(e);
    });
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      longPressFired = false;
      holdTimer = setTimeout(() => {
        holdTimer = null;
        longPressFired = true;
        suppressClick = true;
        if (longPressHandler) longPressHandler(e);
      }, 480);
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!holdTimer) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (longPressFired) {
        longPressFired = false;
        setTimeout(() => { suppressClick = false; }, 350);
        return;
      }
      suppressClick = true;
      tapHandler(e);
      setTimeout(() => { suppressClick = false; }, 350);
    }, { passive: false });
    el.addEventListener('touchcancel', () => {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      longPressFired = false;
    }, { passive: true });
  }

  for (const eq of equipped) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (eq.item ? ' equipped' : ' empty');
    if (eq.item?.cursed && eq.item?.curseRevealed) slot.style.boxShadow = '0 0 6px rgba(200,40,40,0.7), inset 0 0 6px rgba(200,40,40,0.2)';
    else if (eq.slot === 'ranged' && eq.item) slot.style.borderColor = '#4a9';
    // Ranged weapon slot: show arrow count overlay
    if (eq.slot === 'ranged' && eq.item) {
      const arrowStr = `${state.player.arrows}`;
      slot.style.position = 'relative';
      slot.innerHTML = `${eq.item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#4a9;font-weight:bold;">${arrowStr}</span>`;
    } else {
      slot.textContent = eq.item ? eq.item.glyph : eq.label;
    }
    if (eq.item) {
      makeTappable(
        slot,
        (e) => showEquippedMenu(eq, e),
        () => showSlotInfo(eq.item, slot)
      );
    }
    bar.appendChild(slot);
  }

  // Inventory items
  for (let i = 0; i < state.player.inventory.length; i++) {
    const item = state.player.inventory[i];
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    if (item.tier >= 3 && item.special) slot.style.borderColor = '#ffcc00';
    else if (item.tier === 3) slot.style.borderColor = '#aa44ff';
    else if (item.tier === 2) slot.style.borderColor = '#4488ff';
    if (item.itemType === 'thrown' || item.itemType === 'special_arrow') {
      const countLabel = item.ammo != null ? item.ammo : '';
      const isLoaded = item.itemType === 'special_arrow' && state.player.loadedSpecialArrow === item;
      const countColor = isLoaded ? '#ff8020' : '#60ffb0';
      slot.innerHTML = `${item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:${countColor};font-weight:bold;">${countLabel}</span>`;
      if (isLoaded) slot.style.boxShadow = '0 0 6px rgba(255,128,32,0.5)';
    } else if (item.itemType === 'food' && item.stack && item.stack > 1) {
      slot.innerHTML = `${item.glyph}<span style="position:absolute;bottom:1px;right:3px;font-size:8px;color:#f0c040;font-weight:bold;">×${item.stack}</span>`;
    } else if ((item.count || 1) > 1) {
      slot.textContent = item.glyph;
      const badge = document.createElement('span');
      badge.className = 'inv-count';
      badge.textContent = item.count;
      slot.appendChild(badge);
    } else {
      slot.textContent = item.glyph;
    }
    const idx = i;
    makeTappable(
      slot,
      (e) => showItemMenu(item, idx, e),
      () => showSlotInfo(item, slot)
    );
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
  const rarityTag = (item.tier >= 3 && item.special)
    ? ` <span style="color:#ffcc00;font-size:11px;">[Epic]</span>`
    : (item.tier === 3)
    ? ` <span style="color:#aa44ff;font-size:11px;">[Rare]</span>`
    : '';
  let nameText = `${item.glyph} ${item.name}`;
  if (item.desc && item.desc !== '???') {
    nameText += ` — ${item.desc}`;
  } else if (item.itemType === 'ranged') {
    nameText += ` (${item.damage} DMG, ${item.range} range)`;
  } else if (item.attack) {
    nameText += ` (+${item.attack} ATK)`;
  } else if (item.defense) {
    nameText += ` (+${item.defense} DEF)`;
  }
  nameDiv.innerHTML = nameText + rarityTag;
  menu.innerHTML = '';
  menu.appendChild(nameDiv);

  let actions = [];
  if (item.itemType === 'instrument') {
    actions = [
      { label: 'Info', fn: () => { addMessage(`${item.name}: ${item.desc}`, ''); closeItemMenu(); } },
      { label: 'Cancel', fn: () => closeItemMenu() }
    ];
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.textContent = act.label;
      btn.addEventListener('click', (e) => { e.stopPropagation(); act.fn(); });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); act.fn(); }, { passive: false });
      menu.appendChild(btn);
    }
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
    }, 100);
    return;
  }
  // Rogue/Ninja: throw equipped dagger or knife as a projectile (consumes weapon)
  if (state.player.classId === 'rogue' &&
      item.itemType === 'weapon' &&
      (item.name.includes('Dagger') || item.name.includes('Knife'))) {
    actions.push({ label: 'Throw', fn: () => {
      state.throwMode = true;
      state.throwItem = {
        item: { name: item.name, glyph: item.glyph, itemType: 'thrown', ammo: Infinity, damage: item.attack || 1, range: 5, meleeWeapon: true },
        index  // kept so we can remove on resolution or restore on cancel
      };
      addMessage(`${item.glyph} Choose a direction to throw! (sacrifices weapon)`, 'good');
      updateUI();
      render();
      closeItemMenu();
    }});
  }
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
  } else if (item.itemType === 'song') {
    actions.push({ label: 'Play', fn: () => { useItem(item, index); closeItemMenu(); }});
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

  // Soul Amulet: spend fragments
  if (item.special === 'soul') {
    const soulBtn = document.createElement('button');
    soulBtn.textContent = `Channel Souls (5 → +10 HP) [${state.player.soulFragments}]`;
    const soulFn = () => { soulAmuletSpend(); updateUI(); render(); closeItemMenu(); };
    soulBtn.addEventListener('click', (e) => { e.stopPropagation(); soulFn(); });
    soulBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); soulFn(); }, { passive: false });
    menu.appendChild(soulBtn);
  }

  // Lantern: show fuel status
  if (item.special === 'lantern') {
    const fuelDiv = document.createElement('div');
    fuelDiv.style.cssText = 'font-size:11px;color:var(--text-dim);padding:4px 0;';
    fuelDiv.textContent = `Fuel: ${state.player.lanternFuel} turns remaining`;
    menu.appendChild(fuelDiv);
  }

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
      // Saves overlay
      if ($('saves-overlay').classList.contains('active')) { closeSavesOverlay(); return; }
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

    if (!state) return;

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
  $('btn-stairs').addEventListener('touchend', (e) => { e.preventDefault(); Audio.resume(); playerDescend(); }, { passive: false });
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

    // Arrow key navigation for config pager (only when config overlay is visible)
    document.addEventListener('keydown', (e) => {
      if (!$('settings-overlay') || !$('settings-overlay').classList.contains('active')) return;
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) { goToPage(currentPage + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && currentPage > 0) { goToPage(currentPage - 1); e.preventDefault(); }
    });

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
    if (state.throwMode || state.fortifyMode) {
      state.throwMode = false;
      state.throwItem = null;
      if (state.fortifyMode) {
        state.fortifyMode = false;
        state.fortifyCandidates = null;
      }
      addMessage('Targeting cancelled.', '');
      updateUI();
      render();
      return;
    }
    if (state.player.classId === 'berserker') activateEnrage();
    else if (state.player.classId === 'ranger') activateAimedShot();
    else if (state.player.classId === 'cleric') activateClericMenu();
    else if (state.player.classId === 'darkwizard') activateAcidBolt();
    else if (state.player.classId === 'escapeartist') activateTeleportStairs();
    else if (state.player.classId === 'conjurer') activateConjurerMenu();
    else if (state.player.classId === 'elementalist') activateElementalistMenu();
    else if (state.player.classId === 'monk') activateMeditate();
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
    if (state?.throwMode && state.throwItem?.item?.itemType === 'aimed_shot') {
      if (spHoldTimer) { clearTimeout(spHoldTimer); spHoldTimer = null; }
      doSpecial();
      spLastTap = 0;
      return;
    }
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
      const tileNames = { [T.WALL]: 'Wall', [T.FLOOR]: 'Floor', [T.CORRIDOR]: 'Corridor', [T.STAIRS_DOWN]: 'Stairs Down', [T.STAIRS_UP]: 'Floor', [T.DOOR_CLOSED]: 'Closed Door', [T.DOOR_OPEN]: 'Open Door', [T.DOOR_ONEWAY]: 'One-Way Door', [T.DOOR_SEALED]: 'Sealed Passage', [T.SPECIAL]: 'Mysterious Glyph', [T.TELEPORT_VIS]: 'Teleport Glyph' };
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
  const closeDeathStatsFn = () => {
    $('death-full-stats').style.display = 'none';
    $('btn-death-stats').textContent = 'View Stats';
  };
  $('btn-close-death-stats').addEventListener('click', closeDeathStatsFn);
  $('btn-close-death-stats').addEventListener('touchend', (e) => { e.preventDefault(); closeDeathStatsFn(); }, { passive: false });
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

  const codexFromSettingsFn = () => { $('settings-overlay').classList.remove('active'); showCodexOverlay(); };
  $('btn-codex-from-settings').addEventListener('click', codexFromSettingsFn);
  $('btn-codex-from-settings').addEventListener('touchend', (e) => { e.preventDefault(); codexFromSettingsFn(); }, { passive: false });
  $('btn-close-codex').addEventListener('click', closeCodexOverlay);
  $('btn-close-codex').addEventListener('touchend', (e) => { e.preventDefault(); closeCodexOverlay(); }, { passive: false });
  document.querySelectorAll('.codex-tab').forEach(btn => {
    const handler = () => {
      codexActiveCat = btn.dataset.cat;
      setActiveCodexTab(codexActiveCat);
      renderCodexContent(codexActiveCat);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchend', (e) => { e.preventDefault(); handler(); }, { passive: false });
  });
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

  // Saved Games button in settings (replaces separate Save + Load buttons)
  const savesGameBtn = $('btn-saves-game');
  if (savesGameBtn) {
    const fn = () => { $('settings-overlay').classList.remove('active'); showSavesOverlay(false); };
    savesGameBtn.addEventListener('click', fn);
    savesGameBtn.addEventListener('touchend', (e) => { e.preventDefault(); fn(); }, { passive: false });
  }

  // Saved Games from title screen
  const savesFromTitle = $('btn-saves-from-title');
  if (savesFromTitle) {
    const fn = () => { Audio.resume(); showSavesOverlay(true); };
    savesFromTitle.addEventListener('click', fn);
    savesFromTitle.addEventListener('touchend', (e) => { e.preventDefault(); fn(); }, { passive: false });
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
        saveGhost();
        saveHighScore();
        showTitle();
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
    ? `${state.playerName} ${state.playerEpithet} ${CLASS_DEFS.find(c => c.id === state.player.classId)?.name || 'Berserker'}`
    : '—';
  $('game-version').textContent = `${GAME_VERSION} · Last updated ${LAST_UPDATED}`;

  $('char-stats').innerHTML = [
    statRow('Level', p ? p.level : noGame),
    statRow('XP', p ? `${p.xp}/${p.xpToNext}` : noGame),
    statRow('HP', p ? `${p.hp}/${p.maxHp}` : noGame),
    statRow('Hunger', p ? p.hunger : noGame),
    statRow('Attack', p ? `${getDisplayedPlayerAttack(p)}` : noGame),
    statRow('Defense', p ? `${getDisplayedPlayerDefense(p)}` : noGame),
  ].join('');

  // Class abilities & bonuses panel
  const classSection = $('class-abilities');
  if (classSection) {
    if (p) {
      classSection.style.display = '';
      const cls = CLASS_DEFS.find(c => c.id === p.classId);
      const abilities = [];
      switch (p.classId) {
        case 'berserker':
          abilities.push({ icon: '💢', name: 'Rage', desc: '+3 ATK when below 40% HP' });
          abilities.push({ icon: '⚡', name: 'Enrage', desc: `+5 ATK for 5 turns (1/floor)${p.enrageFloorUsed ? ' — USED' : ' — Ready'}` });
          abilities.push({ icon: '🍖', name: 'Ravenous', desc: '1.5× hunger drain rate' });
          break;
        case 'rogue':
          abilities.push({ icon: '👁', name: 'Evasion', desc: `${Math.round((p.dodgeBonus || 0) * 100)}% dodge chance` });
          abilities.push({ icon: '🗡️', name: 'Critical Strikes', desc: `${Math.round((p.critChance || 0) * 100)}% crit chance` });
          abilities.push({ icon: '🦶', name: 'Roundhouse Kick', desc: p.level >= 5 ? 'Melee hits also strike one extra adjacent foe' : 'Unlocks at level 5' });
          abilities.push({ icon: '💨', name: 'Stealth', desc: 'Lower enemy detection range' });
          break;
        case 'ranger':
          abilities.push({ icon: '👁', name: 'Eagle Eye', desc: `+${p.fovBonus || 2} FOV radius` });
          abilities.push({ icon: '🌿', name: 'Forager', desc: '50% chance for bonus ration each floor' });
          abilities.push({ icon: '🎯', name: 'Aimed Shot', desc: `2× bow damage (${p.aimedShotCooldown > 0 ? p.aimedShotCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🏹', name: 'Arrow Supply', desc: `${p.arrows} arrows remaining` });
          break;
        case 'cleric':
          abilities.push({ icon: '✝️', name: 'Holy Aura', desc: '+2 damage vs undead, life drain repelled' });
          abilities.push({ icon: '🛡️', name: 'Curse Immune', desc: 'Cannot be cursed' });
          abilities.push({ icon: '⚔️', name: 'Blunt Style', desc: 'Weapon attacks gain 1 less damage from gear' });
          abilities.push({ icon: '🌀', name: 'Weaken', desc: `Room debuff: -2 DEF, suppresses dodge/phase (${p.weakenCooldown > 0 ? p.weakenCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '💛', name: 'Divine Heal', desc: `40% HP heal + cure (1/floor)${p.divineHealUsed ? ' — USED' : ' — Ready'}` });
          break;
        case 'darkwizard':
          abilities.push({ icon: '✨', name: 'Arcane Affinity', desc: 'Scroll effects are doubled' });
          abilities.push({ icon: '💀', name: 'Necromancy', desc: `${Math.min(30, 8 + 2 * (p.level || 1))}% chance slain foes rise as allies` });
          abilities.push({ icon: '☣️', name: 'Acid Bolt', desc: `Ranged poison attack (${p.acidBoltCooldown > 0 ? p.acidBoltCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🏹', name: 'Arcane Frailty', desc: 'Weapons hit lightly; ranged weapons lose 2 damage' });
          break;
        case 'escapeartist':
          abilities.push({ icon: '❄️', name: 'Ice Traps', desc: 'Drop ice traps when retreating from enemies' });
          abilities.push({ icon: '💥', name: 'Ricochet', desc: 'Melee hits chain 50%/25% damage to nearby foes' });
          abilities.push({ icon: '👁', name: '20% Dodge', desc: 'Natural agility' });
          {
            const maxEscape = getMasteryBonuses('escapeartist').extraEscape ? 2 : 1;
            const usedEscape = Math.max(p.escapeRouteUsesFloor || 0, p.stairsTeleportFloorUsed ? 1 : 0);
            if (maxEscape === 1) {
              abilities.push({ icon: '💨', name: 'Escape Route', desc: `Teleport to adjacent room (1/floor — ${usedEscape >= 1 ? 'Used' : 'Ready'})` });
            } else {
              const left = Math.max(0, maxEscape - usedEscape);
              abilities.push({ icon: '💨', name: 'Escape Route', desc: `Teleport to adjacent room (${maxEscape}/floor, ${left} left)` });
            }
          }
          break;
        case 'conjurer':
          abilities.push({ icon: '📖', name: 'Omniscience', desc: 'All potions and scrolls start identified' });
          abilities.push({ icon: '✨', name: 'Arcane Dart', desc: `Low-damage ranged spell (${p.arcaneDartCooldown > 0 ? p.arcaneDartCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🎭', name: 'Illusory Double', desc: `Place a decoy (${p.illusionCooldown > 0 ? p.illusionCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🏹', name: 'Arcane Frailty', desc: 'Weapons hit lightly; ranged weapons lose 2 damage' });
          break;
        case 'monk':
          abilities.push({ icon: '🥋', name: 'Disciplined Body', desc: `ATK ${getDisplayedPlayerAttack(p)} and DEF ${getDisplayedPlayerDefense(p)} scale with level` });
          abilities.push({ icon: '🧘', name: 'Meditate', desc: `Cleanse + heal in an empty room (${p.meditateCooldown > 0 ? p.meditateCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '🌊', name: 'Water Walker', desc: 'Cross deep water without a potion' });
          abilities.push({ icon: '🎶', name: 'Song Mastery', desc: 'Can play song items reliably with an instrument' });
          break;
        case 'beastmaster':
          abilities.push({ icon: '🐺', name: 'Hound Companion', desc: 'A permanent hound spawns beside you each floor' });
          abilities.push({ icon: '♻️', name: 'Rapid Regeneration', desc: 'Heals 1 HP every 15 turns' });
          abilities.push({ icon: '🐾', name: 'Beast Charm', desc: '70% chance to win over Bats, Slimes, and Spiders on hit' });
          break;
        case 'elementalist':
          abilities.push({ icon: '🧪', name: 'Caustic Attunement', desc: 'Immune to poison, fire, and acid. Bump attacks acid-soak foes (-3 DEF, 3t)' });
          abilities.push({ icon: '🟢', name: 'Vial of Slime', desc: `3×3 acid pool, 5 turns (${p.vialOfSlimeCooldown > 0 ? p.vialOfSlimeCooldown + 't CD' : 'Ready'})` });
          abilities.push({ icon: '⚡', name: 'Thunderclap', desc: `AoE lightning, stuns acid-soaked foes (${p.thunderclapCooldown > 0 ? p.thunderclapCooldown + 't CD' : 'Ready'})` });
          break;
      }
      // Add unlocked class-specific perks
      const classPerkFlags = [
        { flag: 'undyingFury', icon: '💢', name: 'Undying Fury', desc: `Survive lethal hit 1/floor${p.undyingFuryUsed ? ' — USED' : ' — Ready'}` },
        { flag: 'shadowStep', icon: '💨', name: 'Shadow Step', desc: 'Invisible for 2 turns after a kill' },
        { flag: 'quickDraw', icon: '🎯', name: 'Quick Draw', desc: 'Aimed Shot cooldown 5 instead of 8' },
        { flag: 'sanctifiedGround', icon: '✝️', name: 'Sanctified Ground', desc: 'Heal 1 HP when waiting' },
        { flag: 'mirrorImage', icon: '🎭', name: 'Mirror Image', desc: 'Place 2 illusions at once' },
        { flag: 'doubleShot', icon: '🏹', name: 'Double Shot', desc: 'Fire 2 arrows in one turn' },
        { flag: 'necroticSurge', icon: '☣️', name: 'Necrotic Surge', desc: 'Acid bolt splashes poison nearby' },
        { flag: 'smokeScreen', icon: '💨', name: 'Smoke Screen', desc: 'Teleport leaves smoke at origin' },
        { flag: 'chainLightning', icon: '⚡', name: 'Chain Lightning', desc: 'Thunderclap chains to nearby enemies' },
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
    web_slowed:   { icon: '🕸', text: 'Web-Slowed',  color: '#a09040' },
    invisibility: { icon: '👁', text: 'Invisible',   color: '#6080ff' },
    strength:     { icon: '💪', text: 'Strengthened',color: '#ff8040' },
    frozen:       { icon: '❄️', text: 'Frozen',      color: '#40c0ff' },
    blessed:      { icon: '⚔️', text: 'Blessed',     color: '#ffe060' },
    courage:      { icon: '🎵', text: 'Courage',     color: '#ff8040' },
    lullaby:      { icon: '🎵', text: 'Lullaby',     color: '#6080ff' },
    dirge:        { icon: '🎵', text: 'Dirge',       color: '#ff4040' },
    plenty:       { icon: '🎵', text: 'Plenty',      color: '#60c040' },
    lanternLit:   { icon: '🔦', text: 'Lantern',     color: '#ffc040' },
    phasing:      { icon: '👻', text: 'Phasing',     color: '#a080ff' },
    wet:          { icon: '💧', text: 'Wet',         color: '#40a0ff' },
    mound_slow:   { icon: '^',  text: 'Mound-Slow',  color: '#8a6030' },
    walk_on_water:{ icon: '🌊', text: 'Water Walk',  color: '#40c0ff' },
    waterwalk:    { icon: '🌊', text: 'Water Walk',  color: '#40c0ff' },
    woozy:        { icon: '🌀', text: 'Woozy',       color: '#c080ff' },
    acid_soaked:  { icon: '🧪', text: 'Acid-Soaked', color: '#80ff00' },
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
    const cd = CLASS_DEFS[icon] || {};
    btn.innerHTML = `${icon}<div style="font-size:8px;margin-top:2px;color:var(--text-dim)">${cd.name || ''}</div>`;
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
  $('toggle-showIntents').classList.toggle('on', settings.showIntents);

  $('toggle-sound').onclick = () => {
    settings.sound = !settings.sound;
    Audio.setEnabled(settings.sound);
    Audio.setAmbientMuted(!settings.sound);
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

  $('toggle-showIntents').onclick = () => {
    settings.showIntents = !settings.showIntents;
    $('toggle-showIntents').classList.toggle('on', settings.showIntents);
    saveSettings();
    if (state) render();
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
      const pager = $('manual-pager');
      const track = $('manual-pager-track');
      if (query) {
        // Show all pages flattened when searching
        track.style.transform = 'translateX(0)';
        track.style.flexWrap = 'wrap';
        overlay.querySelectorAll('.manual-page').forEach(p => { p.style.minWidth = '100%'; });
        $('manual-dots').style.display = 'none';
      } else {
        // Restore pager
        track.style.flexWrap = '';
        $('manual-dots').style.display = 'flex';
        if (window._manualGoToPage) window._manualGoToPage(window._manualCurrentPage || 0);
      }
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

  // Set up pager if not already done
  if (!overlay._pagerWired) {
    overlay._pagerWired = true;
    const track = $('manual-pager-track');
    const dotsEl = $('manual-dots');
    const pages = track.querySelectorAll('.manual-page');
    const totalPages = pages.length;
    let currentPage = 0;
    const pageLabels = ['Lore', 'Classes', 'Perks', 'Mastery', 'Enemies'];

    function goToPage(idx) {
      currentPage = Math.max(0, Math.min(totalPages - 1, idx));
      window._manualCurrentPage = currentPage;
      track.style.transform = `translateX(-${currentPage * 100}%)`;
      dotsEl.querySelectorAll('.manual-dot').forEach((d, i) => d.classList.toggle('active', i === currentPage));
      overlay.scrollTop = 0;
    }
    window._manualGoToPage = goToPage;

    // Create dots
    dotsEl.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('span');
      dot.className = 'manual-dot' + (i === 0 ? ' active' : '');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--text-dim);cursor:pointer;transition:background 0.15s;';
      dot.addEventListener('click', () => goToPage(i));
      dotsEl.appendChild(dot);
    }

    // Style active dots
    const style = document.createElement('style');
    style.textContent = '.manual-dot.active{background:var(--gold) !important;}';
    document.head.appendChild(style);

    // Swipe support
    let sx = 0;
    const pager = $('manual-pager');
    pager.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    pager.addEventListener('touchend', (e) => {
      const diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0 && currentPage < totalPages - 1) goToPage(currentPage + 1);
        else if (diff < 0 && currentPage > 0) goToPage(currentPage - 1);
      }
    }, { passive: true });

    // Arrow key navigation
    document.addEventListener('keydown', (e) => {
      if (!$('manual-overlay') || !$('manual-overlay').classList.contains('active')) return;
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) { goToPage(currentPage + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && currentPage > 0) { goToPage(currentPage - 1); e.preventDefault(); }
    });

    goToPage(0);
  } else {
    // Reset to first page on reopen
    if (window._manualGoToPage) window._manualGoToPage(0);
  }
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
          case T.ENCHANTED_WALL: ctx.fillStyle = vis ? '#9a52d0' : '#4a1f62'; break;
          case T.DOOR_LOCKED: ctx.fillStyle = '#ffc040'; break;
          case T.SPECIAL: ctx.fillStyle = '#8060c0'; break;
          case T.WATER: ctx.fillStyle = vis ? (biome.waterVis || '#1a3050') : (biome.waterDim || '#0c1828'); break;
          case T.BRIDGE: ctx.fillStyle = vis ? '#8a6a3a' : '#4a3a1a'; break;
          case T.STEPPING_STONE: ctx.fillStyle = vis ? '#3a5a5a' : '#1a2a2a'; break;
          case T.STALAGMITE: ctx.fillStyle = vis ? biome.wallVis : biome.wallDim; break;
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
          ctx.fillStyle = vis ? biome.floorVis : biome.floorDim;
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
        case T.ENCHANTED_WALL:
          ctx.fillStyle = vis ? '#9a52d0' : '#4a1f62';
          break;
        case T.WALL_SECRET: {
          // Render as normal wall on minimap, unless detect ring is equipped
          const hasDetectRing = hasRingEffect('detection');
          ctx.fillStyle = (vis && (state.player.classId === 'rogue' || hasDetectRing)) ? '#505060' : (vis ? biome.wallVis : biome.wallDim);
          break;
        }
        case T.DOOR_LOCKED:
          ctx.fillStyle = '#c08030';
          break;
        case T.SPECIAL:
          ctx.fillStyle = '#8060c0';
          break;
        case T.TELEPORT: {
          // Ninja/Rogue/Escape Artist see hidden teleports on minimap
          const hasDetectRing = hasRingEffect('detection');
          if (state.player.teleportSight || hasDetectRing) {
            ctx.fillStyle = '#40e0d0';
          } else {
            continue;
          }
          break;
        }
        case T.TELEPORT_VIS:
          ctx.fillStyle = '#40e0d0';
          break;
        case T.RUBBLE:
          ctx.fillStyle = vis ? '#9a6535' : '#4a2e12';
          break;
        case T.WATER:
          ctx.fillStyle = vis ? (biome.waterVis || '#1a3050') : (biome.waterDim || '#0c1828');
          break;
        case T.BRIDGE:
          ctx.fillStyle = vis ? '#8a6a3a' : '#4a3a1a';
          break;
        case T.STEPPING_STONE:
          ctx.fillStyle = vis ? '#3a5a5a' : '#1a2a2a';
          break;
        case T.STALAGMITE:
          ctx.fillStyle = vis ? biome.wallVis : biome.wallDim;
          break;
        case T.WATERFALL:
          ctx.fillStyle = vis ? '#80c0f0' : '#203040';
          break;
        case T.MOUND:
          ctx.fillStyle = vis ? '#8a6030' : '#3a2810';
          break;
        case T.ICY_PATH:
          ctx.fillStyle = vis ? '#80d8f0' : '#203040';
          break;
        case T.FIRE_PATH:
          ctx.fillStyle = vis ? '#e05010' : '#501808';
          break;
        case T.CHASM:
          ctx.fillStyle = vis ? '#100820' : '#080410';
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
        if (tile === T.STAIRS_DOWN) {
          const explored = state.explored[y * MAP_W + x];
          if (!explored) {
            ctx.fillStyle = 'rgba(0,224,96,0.5)';
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
      const show = state.explored[idx] || (state.player.pathfinder && tile === T.STAIRS_DOWN);
      if (!show) continue;
      if (tile === T.STAIRS_DOWN) {
        ctx.fillStyle = '#003818';
        ctx.fillText('▼', x * scale + scale / 2, y * scale + scale / 2);
      }
    }
  }

  // Draw web hazards as dim tan overlay on minimap
  for (const e of state.entities) {
    if (e.type !== 'hazard' || e.hazardType !== 'web') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.explored[idx]) continue;
    ctx.fillStyle = state.visible[idx] ? 'rgba(200,192,128,0.5)' : 'rgba(120,115,70,0.3)';
    ctx.fillRect(e.x * scale, e.y * scale, scale, scale);
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
    // Stealth enemies hidden on minimap until close or hostile
    if (e.special === 'stealth' && e.alertness < 2) {
      const dist = Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y);
      if (dist > 3) continue;
    }
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

  // Draw warning signs as amber dots on minimap
  for (const e of state.entities) {
    if (e.type !== 'sign') continue;
    const idx = e.y * MAP_W + e.x;
    if (!state.explored[idx]) continue;
    ctx.fillStyle = '#c08000';
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

  // Legend strip — colorblind-accessible with distinct patterns per swatch
  const ly = MAP_H * scale + 4;
  const sw = 8; // swatch size (px)
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Helper: draw a colored swatch with a distinct overlay pattern
  // Patterns: 'downArrow', 'X', 'circle', 'dollar', 'diamond', 'star',
  //           'hStripes', 'arrow', 'hashLines', 'dots'
  function legendSwatch(x, y, color, pattern) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, sw, sw);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, sw - 1, sw - 1);
    var cx = x + sw / 2, cy = y + sw / 2;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    switch (pattern) {
      case 'downArrow': // ▼ Stairs
        ctx.beginPath();
        ctx.moveTo(cx, cy + 2);
        ctx.lineTo(cx - 2, cy - 1.5);
        ctx.lineTo(cx + 2, cy - 1.5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'X': // × Foe
        ctx.beginPath();
        ctx.moveTo(x + 1.5, y + 1.5);
        ctx.lineTo(x + sw - 1.5, y + sw - 1.5);
        ctx.moveTo(x + sw - 1.5, y + 1.5);
        ctx.lineTo(x + 1.5, y + sw - 1.5);
        ctx.stroke();
        break;
      case 'circle': // ○ NPC
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'dollar': // $ Shop
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 10px monospace';
        break;
      case 'diamond': // ◇ Item
        ctx.beginPath();
        ctx.moveTo(cx, y + 1);
        ctx.lineTo(x + sw - 1, cy);
        ctx.lineTo(cx, y + sw - 1);
        ctx.lineTo(x + 1, cy);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'star': // ✦ Sage
        ctx.beginPath();
        ctx.moveTo(cx, y + 1); ctx.lineTo(cx, y + sw - 1);
        ctx.moveTo(x + 1, cy); ctx.lineTo(x + sw - 1, cy);
        ctx.stroke();
        break;
      case 'hStripes': // ═ Door
        for (var i = 1; i < sw - 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(x + 1, y + i + 0.5);
          ctx.lineTo(x + sw - 1, y + i + 0.5);
          ctx.stroke();
        }
        break;
      case 'arrow': // → 1-Way
        ctx.beginPath();
        ctx.moveTo(x + 1.5, cy);
        ctx.lineTo(x + sw - 1.5, cy);
        ctx.moveTo(x + sw - 3, cy - 2);
        ctx.lineTo(x + sw - 1, cy);
        ctx.lineTo(x + sw - 3, cy + 2);
        ctx.stroke();
        break;
      case 'hashLines': // # Sealed
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + sw - 1, y + sw - 1);
        ctx.moveTo(x + sw / 2, y + 1); ctx.lineTo(x + sw - 1, y + sw / 2);
        ctx.moveTo(x + 1, y + sw / 2); ctx.lineTo(x + sw / 2, y + sw - 1);
        ctx.stroke();
        break;
      case 'dots': // ∷ Rubble
        ctx.fillRect(cx - 2, cy - 1, 1.5, 1.5);
        ctx.fillRect(cx + 1, cy - 1, 1.5, 1.5);
        ctx.fillRect(cx - 1, cy + 1, 1.5, 1.5);
        break;
    }
  }

  ctx.fillStyle = '#c8a840';
  ctx.fillText(`Floor ${state.floor} — ${biome.name}`, 4, ly);

  ctx.fillStyle = '#ffe840';
  ctx.fillText(`You: (${state.player.x}, ${state.player.y})`, 4, ly + 14);

  // Row 1: stairs
  const row3 = ly + 30;
  legendSwatch(4, row3, '#00e060', 'downArrow');
  ctx.fillStyle = '#aaa'; ctx.fillText('Stairs', 14, row3 - 1);

  // Row 2: entities
  const row4 = ly + 46;
  legendSwatch(4, row4, '#ff4040', 'X');
  ctx.fillStyle = '#aaa'; ctx.fillText('Foe', 14, row4 - 1);

  legendSwatch(48, row4, '#40e0ff', 'circle');
  ctx.fillStyle = '#aaa'; ctx.fillText('NPC', 58, row4 - 1);

  legendSwatch(94, row4, '#f0c040', 'dollar');
  ctx.fillStyle = '#aaa'; ctx.fillText('Shop', 104, row4 - 1);

  legendSwatch(144, row4, '#c0c040', 'diamond');
  ctx.fillStyle = '#aaa'; ctx.fillText('Item', 154, row4 - 1);

  // Row 3: doors + sage
  const row5 = ly + 62;
  legendSwatch(4, row5, '#8B6914', 'hStripes');
  ctx.fillStyle = '#aaa'; ctx.fillText('Door', 14, row5 - 1);

  legendSwatch(54, row5, '#c06030', 'arrow');
  ctx.fillStyle = '#aaa'; ctx.fillText('1-Way', 64, row5 - 1);

  legendSwatch(112, row5, '#6a2020', 'hashLines');
  ctx.fillStyle = '#aaa'; ctx.fillText('Sealed', 122, row5 - 1);

  legendSwatch(176, row5, '#a060ff', 'star');
  ctx.fillStyle = '#aaa'; ctx.fillText('Sage', 186, row5 - 1);

  // Row 4: terrain
  const row6 = ly + 78;
  legendSwatch(4, row6, '#9a6535', 'dots');
  ctx.fillStyle = '#aaa'; ctx.fillText('Rubble', 14, row6 - 1);
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

  let _closer = null;
  const cleanup = () => {
    if (_closer) {
      document.removeEventListener('click', _closer);
      document.removeEventListener('touchend', _closer);
      _closer = null;
    }
  };

  for (const { item, idx } of consumables) {
    const btn = document.createElement('button');
    let label = `${item.glyph} ${item.name}`;
    if (item.itemType === 'thrown') label += ` (${item.ammo})`;
    btn.textContent = label;
    const captureIdx = idx;
    const fn = () => { cleanup(); closeItemMenu(); useItem(item, captureIdx); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    menu.appendChild(btn);
  }

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', (e) => { e.stopPropagation(); cleanup(); closeItemMenu(); });
  cancel.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); cleanup(); closeItemMenu(); }, { passive: false });
  menu.appendChild(cancel);

  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  setTimeout(() => {
    _closer = (e) => { if (!$('item-menu').contains(e.target)) { cleanup(); closeItemMenu(); } };
    document.addEventListener('click', _closer, { once: true });
    document.addEventListener('touchend', _closer, { once: true });
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

  let _eqCloser = null;
  const eqCleanup = () => {
    if (_eqCloser) {
      document.removeEventListener('click', _eqCloser);
      document.removeEventListener('touchend', _eqCloser);
      _eqCloser = null;
    }
  };

  for (const { item, idx } of equippable) {
    const btn = document.createElement('button');
    let label = `${item.glyph} ${item.name}`;
    if (item.itemType === 'ranged') label += ` (${item.damage} DMG, ${item.range} rng)`;
    else if (item.attack) label += ` (+${item.attack} ATK)`;
    else if (item.defense) label += ` (+${item.defense} DEF)`;
    else if (item.special) label += ` (${item.special})`;
    btn.textContent = label;
    const captureIdx = idx;
    const fn = () => { eqCleanup(); closeItemMenu(); useItem(item, captureIdx); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    menu.appendChild(btn);
  }

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', (e) => { e.stopPropagation(); eqCleanup(); closeItemMenu(); });
  cancel.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); eqCleanup(); closeItemMenu(); }, { passive: false });
  menu.appendChild(cancel);

  menu.style.left = '50%';
  menu.style.transform = 'translateX(-50%)';
  menu.style.bottom = '180px';
  menu.style.top = 'auto';
  menu.classList.add('active');

  setTimeout(() => {
    _eqCloser = (e) => { if (!$('item-menu').contains(e.target)) { eqCleanup(); closeItemMenu(); } };
    document.addEventListener('click', _eqCloser, { once: true });
    document.addEventListener('touchend', _eqCloser, { once: true });
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
// === FLOOR TRANSITION CARD ===
const FLOOR_CARD_DATA = {
  sewers: {
    atmo: 'Water drips from stone that once knew sunlight. The drowned foundations of Erathis swallow every sound you make.'
  },
  crypt: {
    atmo: 'The air turns cold and motionless. These corridors stretch in directions the dead chose for themselves — and now for you.'
  },
  citadel: {
    atmo: 'Runed armor lines the walls in silent rows. The Citadel\'s knights have forgotten their names, but not their orders.'
  },
  abyss: {
    atmo: 'Reality thins at the edges down here. The darkness is not empty — it has been watching you descend from the very first step.'
  },
  sanctum: {
    atmo: 'Crystalline walls hum with concentrated glyph energy. Beautiful, intricate, and engineered to kill you slowly.'
  },
  boss: {
    atmo: 'Perfect silence. The Glyph King has waited an eternity for a worthy end. He does not look afraid.'
  }
};

function showFloorCard(floor, biomeKey, onDone) {
  const card = $('floor-card');
  const biome = getFloorBiome(floor);
  const data  = FLOOR_CARD_DATA[biomeKey] || FLOOR_CARD_DATA.sewers;

  $('floor-card-floor').textContent = 'Floor ' + floor;
  $('floor-card-name').textContent  = biome.name;
  $('floor-card-atmo').textContent  = data.atmo;

  const EXIT_MS   =  350;
  const SAFETY_MS = EXIT_MS + 400;
  // Minimum display time before tap is accepted (prevents accidental instant-dismiss)
  const MIN_MS = 600;

  card.classList.remove('fc-exit');
  card.classList.add('fc-enter');

  var dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    card.removeEventListener('click', onTap);
    card.removeEventListener('touchend', onTap);
    card.classList.remove('fc-enter');
    card.classList.add('fc-exit');

    var finished = false;
    var finish = function() {
      if (finished) return;
      finished = true;
      card.classList.remove('fc-exit');
      onDone();
    };
    card.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, SAFETY_MS);
  }

  function onTap(e) {
    if (e.type === 'touchend') e.preventDefault();
    dismiss();
  }

  // Accept tap after minimum display time
  setTimeout(function() {
    card.addEventListener('click', onTap);
    card.addEventListener('touchend', onTap, { passive: false });
  }, MIN_MS);
}

function getBiomeKey(floor) {
  if (floor >= 24) return 'boss';
  if (floor >= 21) return 'sanctum';
  if (floor >= 17) return 'abyss';
  if (floor >= 13) return 'citadel';
  if (floor >= 9)  return 'crypt';
  if (floor >= 5)  return 'caverns';
  return 'sewers';
}

function getFloorBiome(floor) {
  if (floor <= 4) return {
    name: 'The Sewers',
    wallVis: '#4a7a4a', wallDim: '#1e321e',
    floorVis: '#2e4e2e', floorDim: '#16221a',
    corrVis:  '#264020', corrDim:  '#121a10',
    bg: '#080f08'
  };
  if (floor <= 8) return {
    name: 'The Caverns',
    wallVis: '#3a5060', wallDim: '#182028',
    floorVis: '#2a3a48', floorDim: '#121c24',
    corrVis:  '#223040', corrDim:  '#0e161e',
    bg: '#060c12',
    waterVis: '#2878c0', waterDim: '#0e2a4a'
  };
  if (floor <= 12) return {
    name: 'The Crypt',
    wallVis: '#5a5a72', wallDim: '#282838',
    floorVis: '#40405a', floorDim: '#1e1e2c',
    corrVis:  '#38384e', corrDim:  '#181820',
    bg: '#0c0c14'
  };
  if (floor <= 16) return {
    name: 'The Citadel',
    wallVis: '#6a3a3a', wallDim: '#301818',
    floorVis: '#4a2424', floorDim: '#201010',
    corrVis:  '#3e1e1e', corrDim:  '#180c0c',
    bg: '#100606'
  };
  if (floor <= 20) return {
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
  if (hasStatusEffect(defender, 'weakened')) return 0;
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
    strength:     { icon: '💪', text: 'Str+',   cls: 'fx-strength' },
    blessed:      { icon: '⚔️', text: 'Blessed', cls: 'fx-strength' },
    courage:      { icon: '🎵', text: 'Courage', cls: 'fx-strength' },
    lullaby:      { icon: '🎵', text: 'Lullaby', cls: 'fx-invisibility' },
    dirge:        { icon: '🎵', text: 'Dirge',   cls: 'fx-burning' },
    plenty:       { icon: '🎵', text: 'Plenty',  cls: 'fx-strength' },
    lanternLit:   { icon: '🔦', text: 'Lantern', cls: 'fx-strength' },
    phasing:      { icon: '👻', text: 'Phase',   cls: 'fx-invisibility' },
    walk_on_water:{ icon: '🌊', text: 'Water',   cls: 'fx-invisibility' },
    waterwalk:    { icon: '🌊', text: 'Water',   cls: 'fx-invisibility' },
    woozy:        { icon: '🌀', text: 'Woozy',   cls: 'fx-poison' },
    acid_soaked:  { icon: '🧪', text: 'Acid',    cls: 'fx-poison' }
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

  if (p.arrows <= 0 && !p.loadedSpecialArrow) {
    addMessage('No arrows! Find or buy more.', 'damage');
    return;
  }

  let baseDmg = bow.damage + getPlayerRangedDamageBonus(p);
  if (p.classId === 'ranger') baseDmg += Math.floor(p.level / 3);
  baseDmg = Math.max(1, baseDmg);

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

  const ammoStr = `${p.arrows}`;
  const specialStr = p.loadedSpecialArrow ? ` [${p.loadedSpecialArrow.name}]` : '';
  addMessage(`🏹 ${bow.name}${specialStr} — choose direction! (${ammoStr} arrows)`, 'good');
  updateUI();
  render();
}

// === RANGED COMBAT — THROWING DAGGERS ===
function applyThrownPotion(item, potIndex, dx, dy) {
  const p = state.player;
  let x = p.x + dx, y = p.y + dy;
  let hit = null;
  for (let i = 0; i < item.range; i++) {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) break;
    if (!isTransparent(x, y)) break;
    const enemy = enemyAt(x, y);
    if (enemy && enemy.hp > 0) { hit = enemy; break; }
    x += dx; y += dy;
  }
  // Consume one potion from inventory
  const potItem = p.inventory[potIndex];
  if (potItem && potItem.itemType === 'potion') {
    potItem.count = (potItem.count || 1) - 1;
    if (potItem.count <= 0) p.inventory.splice(potIndex, 1);
  }
  if (hit) {
    addMessage(`The potion shatters on ${hit.name}!`, 'good');
    switch (item.effectId) {
      case 'healing':
        hit.hp = Math.min(hit.maxHp, hit.hp + 10);
        addMessage(`${hit.name} is healed! (+10 HP)`, 'damage');
        break;
      case 'strength':
        addStatusEffect(hit, 'strength', 30);
        addMessage(`${hit.name} grows stronger!`, 'damage');
        break;
      case 'invisibility':
        addStatusEffect(hit, 'invisible', 15);
        addMessage(`${hit.name} turns invisible!`, 'damage');
        break;
      case 'poison':
        addStatusEffect(hit, 'poison', 5);
        addMessage(`${hit.name} is poisoned!`, 'good');
        break;
      case 'teleport': {
        const pos = randomFloorTile();
        if (pos) { hit.x = pos.x; hit.y = pos.y; }
        addMessage(`${hit.name} is teleported away!`, 'good');
        break;
      }
      default:
        addMessage(`The potion splatters harmlessly on ${hit.name}.`, '');
        break;
    }
    Audio.hit();
    haptic(20);
  } else {
    addMessage('The potion shatters on the ground.', '');
  }
  updateUI();
  render();
  endTurn();
}

function throwProjectile(dx, dy, isSecondShot) {
  state.throwMode = false;
  const throwData = isSecondShot ? isSecondShot : state.throwItem;
  if (!isSecondShot) state.throwItem = null;
  if (!throwData) { endTurn(); return; }

  const { item, index: throwIndex } = throwData;
  if (item.itemType === 'thrown_potion') {
    applyThrownPotion(item, throwIndex, dx, dy);
    return;
  }
  const isAimedShot = item.itemType === 'aimed_shot';
  const isRangedShot = item.itemType === 'ranged_shot';
  const isAcidBolt = item.itemType === 'acid_bolt';
  const isArcaneDart = item.itemType === 'arcane_dart';
  const maxRange = isAimedShot ? 50 : (isRangedShot || isAcidBolt || isArcaneDart ? (item.range || 8) : 8);
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
        const shotLabel = isSecondShot ? '2nd arrow' : 'Arrow';
        addMessage(`🏹 ${shotLabel} hits ${target.name} for ${dmg}!`, 'good');
      } else if (isAcidBolt) {
        addMessage(`☣️ Acid Bolt hits ${target.name} for ${dmg}!`, 'good');
      } else if (isArcaneDart) {
        addMessage(`✨ Arcane Dart hits ${target.name} for ${dmg}!`, 'good');
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

  // Animation — delay endTurn until projectile animation finishes so enemies
  // don't move while the projectile is still visually in flight
  const projGlyph = isAcidBolt ? '☣️' : isArcaneDart ? '✨' : (isAimedShot || isRangedShot) ? '➤' : '🗡️';
  // Check if double shot will fire after this — if so, don't attach endTurn callback to this animation
  const willDoubleShot = isRangedShot && !isSecondShot && p.doubleShot && p.arrows > 0;
  const deferEndTurn = true; // always defer endTurn until animation completes
  animateProjectile(p.x, p.y, landX, landY, projGlyph, willDoubleShot ? null : () => { updateUI(); render(); endTurn(); });

  // Acid bolt: apply poison on hit, set cooldown
  if (isAcidBolt) {
    if (!hit) addMessage('The acid bolt splashes into the darkness.', '');
    else if (hitTarget && hitTarget.hp > 0) {
      addStatusEffect(hitTarget, 'poison', 5);
      addMessage(`☣️ ${hitTarget.name} is coated in acid! (poison)`, 'good');
    }
    // Necrotic Surge: splash poison to adjacent enemies on hit
    if (p.necroticSurge && hit && hitTarget) {
      for (let ax = landX - 1; ax <= landX + 1; ax++) {
        for (let ay = landY - 1; ay <= landY + 1; ay++) {
          if (ax === landX && ay === landY) continue;
          const adj = enemyAt(ax, ay);
          if (adj && adj.hp > 0 && !adj.isAlly) {
            addStatusEffect(adj, 'poison', 3);
            addMessage(`☣️ Necrotic Surge poisons ${adj.name}!`, 'good');
          }
        }
      }
    }
    state.player.acidBoltCooldown = 7;
  }

  if (isArcaneDart) {
    if (!hit) addMessage('The dart flickers into the dark.', '');
    state.player.arcaneDartCooldown = 5;
  }

  if (isAimedShot) {
    if (!hit) addMessage('Your arrow flies into the darkness.', '');
    p.aimedShotCooldown = p.quickDraw ? 5 : 8;
    if (p.equipped.ranged && !p.loadedSpecialArrow) {
      p.arrows--;
      if (p.arrows <= 0) addMessage('That was your last arrow!', 'damage');
      else addMessage(`${p.arrows} arrow${p.arrows === 1 ? '' : 's'} remaining.`, '');
    }
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

    p.arrows--;
    if (p.arrows <= 0) {
      addMessage('That was your last arrow!', 'damage');
    } else {
      addMessage(`${p.arrows} arrow${p.arrows === 1 ? '' : 's'} remaining.`, '');
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
  } else if (item.meleeWeapon) {
    // Thrown melee weapon (Rogue/Ninja) — remove from inventory now that throw resolved
    if (throwIndex >= 0 && throwIndex < p.inventory.length) p.inventory.splice(throwIndex, 1);
    if (!hit) addMessage(`Your ${item.name} clatters harmlessly away.`, '');
    else addMessage(`Your ${item.name} is destroyed in the throw!`, '');
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
    if (p.arrows <= 0) {
      addMessage('No arrows for second shot!', 'damage');
    } else {
      const secondThrow = { item: { ...item, loadedArrow: null }, index: -1 };
      throwProjectile(dx, dy, secondThrow);
      return;
    }
  }

  // If endTurn was deferred to animation callback, skip here
  if (!deferEndTurn) {
    updateUI();
    render();
    endTurn();
  }
}

const MINI_BOSS_SIGN_MESSAGES = {
  4:  '⚠ Something massive claims the deepest chamber. Crushed bones mark its path.',
  8:  '⚠ The ancient wyrm nests in the flooded dark. It cannot be drowned.',
  12: '⚠ The Lich has returned to its tomb. Death is a minor inconvenience to it.',
  16: '⚠ The demon\'s fire has scorched these stones for centuries. Do not face it unprepared.',
  20: '⚠ Beyond this point, the Void has taken form. It does not forget faces.',
  23: '⚠ The Glyph King awaits. His madness is absolute. Turn back — or finish this.',
};

// === MINI-BOSS SPAWNING ===
function spawnMiniBoss() {
  const template = MINI_BOSSES[state.floor];
  if (!template) return;

  const room = getFarthestRoom(state.player.x, state.player.y);
  const bossX = room.x + Math.floor(room.w / 2);
  const bossY = room.y + Math.floor(room.h / 2);

  const miniBoss = createEnemy(template, bossX, bossY);
  miniBoss.isMiniBoss = true;
  state.entities.push(miniBoss);
  addMessage(`⚠ A ${template.name} guards this floor!`, 'damage');

  // Place a warning sign in the room closest to the mini-boss room (but not the boss room itself)
  const msg = MINI_BOSS_SIGN_MESSAGES[state.floor];
  if (msg && state.rooms.length >= 2) {
    const sorted = state.rooms
      .filter(r => r !== room)
      .sort((a, b) => {
        const da = Math.abs((a.x + Math.floor(a.w / 2)) - bossX) + Math.abs((a.y + Math.floor(a.h / 2)) - bossY);
        const db = Math.abs((b.x + Math.floor(b.w / 2)) - bossX) + Math.abs((b.y + Math.floor(b.h / 2)) - bossY);
        return da - db;
      });
    const signRoom = sorted[0];
    if (signRoom) {
      const sx = signRoom.x + Math.floor(signRoom.w / 2);
      const sy = signRoom.y + Math.floor(signRoom.h / 2);
      if (getTile(sx, sy) === T.FLOOR) {
        state.entities.push({ type: 'sign', x: sx, y: sy, glyph: '⚠', message: msg });
      }
    }
  }
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

function activateClericMenu() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  const weakenReady = p.weakenCooldown <= 0;
  const healReady = !p.divineHealUsed;
  inputLocked = true;
  Audio.resume();
  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '⛪ CLERIC';
  $('levelup-label').textContent = 'Choose a rite:';
  const container = $('perk-choices');
  container.innerHTML = '';

  const weakenBtn = document.createElement('button');
  weakenBtn.className = 'perk-btn';
  weakenBtn.innerHTML = `<div class="perk-name">🌀 Weaken</div><div class="perk-desc">Debuff enemies in this room for 4 turns${weakenReady ? '' : ` (${p.weakenCooldown} turns)`}</div>`;
  if (!weakenReady) weakenBtn.style.opacity = '0.5';
  const weakenHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (weakenReady) activateWeaken();
    else addMessage(`Weaken recharging (${p.weakenCooldown} turns).`, '');
  };
  weakenBtn.addEventListener('click', weakenHandler);
  weakenBtn.addEventListener('touchend', (e) => { e.preventDefault(); weakenHandler(); }, { passive: false });
  container.appendChild(weakenBtn);

  const healBtn = document.createElement('button');
  healBtn.className = 'perk-btn';
  healBtn.innerHTML = `<div class="perk-name">💛 Divine Heal</div><div class="perk-desc">Restore 40% HP and cleanse poison/burning${healReady ? '' : ' (used this floor)'}</div>`;
  if (!healReady) healBtn.style.opacity = '0.5';
  const healHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (healReady) activateDivineHeal();
    else addMessage('Divine Heal already used this floor.', '');
  };
  healBtn.addEventListener('click', healHandler);
  healBtn.addEventListener('touchend', (e) => { e.preventDefault(); healHandler(); }, { passive: false });
  container.appendChild(healBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'perk-btn';
  cancelBtn.style.borderColor = 'var(--text-dim)';
  cancelBtn.innerHTML = '<div class="perk-name">❌ Cancel</div>';
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

function activateConjurerMenu() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  const illusionReady = p.illusionCooldown <= 0;
  const dartReady = p.arcaneDartCooldown <= 0;
  inputLocked = true;
  Audio.resume();
  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '🎭 CONJURER';
  $('levelup-label').textContent = 'Choose a spell:';
  const container = $('perk-choices');
  container.innerHTML = '';

  const dartBtn = document.createElement('button');
  dartBtn.className = 'perk-btn';
  dartBtn.innerHTML = `<div class="perk-name">✨ Arcane Dart</div><div class="perk-desc">Low-damage ranged spell${dartReady ? '' : ` (${p.arcaneDartCooldown} turns)`}</div>`;
  if (!dartReady) dartBtn.style.opacity = '0.5';
  const dartHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (dartReady) activateArcaneDart();
    else addMessage(`Arcane Dart recharging (${p.arcaneDartCooldown} turns).`, '');
  };
  dartBtn.addEventListener('click', dartHandler);
  dartBtn.addEventListener('touchend', (e) => { e.preventDefault(); dartHandler(); }, { passive: false });
  container.appendChild(dartBtn);

  const illusionBtn = document.createElement('button');
  illusionBtn.className = 'perk-btn';
  illusionBtn.innerHTML = `<div class="perk-name">🎭 Illusion</div><div class="perk-desc">Summon a decoy${illusionReady ? '' : ` (${p.illusionCooldown} turns)`}</div>`;
  if (!illusionReady) illusionBtn.style.opacity = '0.5';
  const illusionHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (illusionReady) activateIllusion();
    else addMessage(`Illusion not ready. (${p.illusionCooldown} turns)`, '');
  };
  illusionBtn.addEventListener('click', illusionHandler);
  illusionBtn.addEventListener('touchend', (e) => { e.preventDefault(); illusionHandler(); }, { passive: false });
  container.appendChild(illusionBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'perk-btn';
  cancelBtn.style.borderColor = 'var(--text-dim)';
  cancelBtn.innerHTML = '<div class="perk-name">❌ Cancel</div>';
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

function activateArcaneDart() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.arcaneDartCooldown > 0) {
    addMessage(`Arcane Dart recharging (${p.arcaneDartCooldown} turns).`, '');
    return;
  }
  state.throwMode = true;
  state.throwItem = {
    item: { name: 'Arcane Dart', damage: 2 + Math.floor(p.level / 4), ammo: Infinity, itemType: 'arcane_dart', range: 8 },
    index: -1
  };
  addMessage('✨ Arcane Dart — choose direction!', 'good');
  updateUI();
  render();
}

function activateMeditate() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.meditateCooldown > 0) {
    addMessage(`Meditate recharging (${p.meditateCooldown} turns).`, '');
    return;
  }
  if (p.hunger < 30) {
    addMessage('You are too hungry to concentrate.', 'damage');
    return;
  }
  const currentRoom = state.rooms.find(r => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (!currentRoom) {
    addMessage('You need a quiet room to meditate.', 'damage');
    return;
  }
  const hostileInRoom = state.entities.some(e =>
    e.type === 'enemy' && e.hp > 0 && !e.isAlly &&
    e.x >= currentRoom.x && e.x < currentRoom.x + currentRoom.w &&
    e.y >= currentRoom.y && e.y < currentRoom.y + currentRoom.h
  );
  if (hostileInRoom) {
    addMessage('You need a quiet room to meditate.', 'damage');
    return;
  }
  const beforeCount = p.statusEffects.length;
  const cleansed = new Set(['poison', 'burning', 'webbed', 'frozen', 'wet']);
  p.statusEffects = p.statusEffects.filter(e => !cleansed.has(e.type));
  const healAmount = Math.max(1, Math.floor(p.maxHp * 0.2));
  p.hp = Math.min(p.maxHp, p.hp + healAmount);
  p.meditateCooldown = 20;
  Audio.useItem();
  haptic(40);
  addMessage(beforeCount !== p.statusEffects.length ? `🧘 You meditate. (+${healAmount} HP, cleansed)` : `🧘 You meditate. (+${healAmount} HP)`, 'good');
  animateAoeBlast(p.x, p.y, 1.5, '#60c0a0');
  updateUI();
  endTurn();
}

function activateAimedShot() {
  if (inputLocked || state.gameOver || state.victory) return;
  if (state.player.aimedShotCooldown > 0) {
    addMessage(`Aimed Shot recharging (${state.player.aimedShotCooldown} turns).`, '');
    return;
  }
  if (state.player.equipped.ranged && state.player.arrows <= 0 && !state.player.loadedSpecialArrow) {
    addMessage('No arrows! Find or buy more.', 'damage');
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

function activateWeaken() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.weakenCooldown > 0) {
    addMessage(`Weaken recharging (${p.weakenCooldown} turns).`, '');
    return;
  }
  const room = getRoomAt(p.x, p.y);
  if (!room) {
    addMessage('You must stand in a room to cast Weaken.', '');
    return;
  }
  const hostiles = state.entities.filter(e =>
    e.type === 'enemy' && e.hp > 0 && !e.isAlly &&
    e.x >= room.x && e.x < room.x + room.w &&
    e.y >= room.y && e.y < room.y + room.h
  );
  if (hostiles.length === 0) {
    addMessage('No enemies in this room to weaken.', '');
    return;
  }
  Audio.resume();
  for (const enemy of hostiles) addStatusEffect(enemy, 'weakened', 4);
  p.weakenCooldown = 8;
  addMessage(`🌀 You cast Weaken! ${hostiles.length} foe${hostiles.length === 1 ? '' : 's'} falter.`, 'good');
  animateAoeBlast(p.x, p.y, 1.5, '#90b050');
  Audio.useItem();
  haptic(40);
  updateUI();
  endTurn();
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
  addMessage('☣️ Acid Bolt — choose direction!', 'good');
  updateUI();
  render();
}

// === ESCAPE ARTIST: TELEPORT TO ADJACENT ROOM ===
function activateTeleportStairs() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  const maxUses = getMasteryBonuses(p.classId).extraEscape ? 2 : 1;
  const used = Math.max(p.escapeRouteUsesFloor || 0, p.stairsTeleportFloorUsed ? 1 : 0);
  if (used >= maxUses) {
    addMessage('Escape Route already used this floor.', '');
    return;
  }
  const currentRoom = getRoomAt(p.x, p.y);
  if (!currentRoom) {
    addMessage('No escape route from here.', '');
    return;
  }
  const curIdx = state.rooms.indexOf(currentRoom);
  const adjacentRooms = state.rooms.filter((r, idx) => {
    if (idx === curIdx) return false;
    const dxGap = Math.max(0, Math.max(currentRoom.x - (r.x + r.w), r.x - (currentRoom.x + currentRoom.w)));
    const dyGap = Math.max(0, Math.max(currentRoom.y - (r.y + r.h), r.y - (currentRoom.y + currentRoom.h)));
    return (dxGap + dyGap) <= 6;
  });
  if (adjacentRooms.length === 0) {
    addMessage('No nearby chamber to escape to.', '');
    return;
  }

  const destinations = [];
  for (const room of adjacentRooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!isWalkable(x, y)) continue;
        if (enemyAt(x, y)) continue;
        const occupied = state.entities.some(e =>
          e.x === x && e.y === y &&
          ['merchant', 'npc', 'hazard', 'enchanted_wall', 'bridge', 'sign'].includes(e.type)
        );
        if (!occupied) destinations.push({ x, y });
      }
    }
  }
  if (destinations.length === 0) {
    addMessage('No safe escape tile found nearby.', '');
    return;
  }

  const oldX = p.x, oldY = p.y;
  const dest = destinations[Math.floor(Math.random() * destinations.length)];
  p.x = dest.x;
  p.y = dest.y;
  // Smoke Screen: leave a smoke hazard at the origin tile
  if (p.smokeScreen) {
    state.entities.push({ type: 'hazard', x: oldX, y: oldY, glyph: '💨', name: 'Smoke', hazardType: 'smoke', turns: 3 });
    addMessage('💨 A smoke cloud billows where you stood!', 'good');
  }
  p.escapeRouteUsesFloor = used + 1;
  p.stairsTeleportFloorUsed = true;
  addMessage('💨 You find an escape route to a nearby chamber!', 'good');
  Audio.gold();
  haptic(40);
  animateEntityFlash(dest.x, dest.y, '#80ffff');
  syncPlayerWoozyStatus();
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

// === ELEMENTALIST ABILITIES ===
function activateElementalistMenu() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  const vialReady = p.vialOfSlimeCooldown <= 0;
  const thunderReady = p.thunderclapCooldown <= 0;
  inputLocked = true;
  Audio.resume();
  const overlay = $('levelup-overlay');
  overlay.querySelector('h1').textContent = '🧪 ELEMENTALIST';
  $('levelup-label').textContent = 'Choose a spell:';
  const container = $('perk-choices');
  container.innerHTML = '';

  const vialBtn = document.createElement('button');
  vialBtn.className = 'perk-btn';
  vialBtn.innerHTML = `<div class="perk-name">🟢 Vial of Slime</div><div class="perk-desc">Create 3×3 acid pool${vialReady ? '' : ` (${p.vialOfSlimeCooldown} turns)`}</div>`;
  if (!vialReady) vialBtn.style.opacity = '0.5';
  const vialHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (vialReady) activateVialOfSlime();
    else addMessage(`Vial of Slime recharging (${p.vialOfSlimeCooldown} turns).`, '');
  };
  vialBtn.addEventListener('click', vialHandler);
  vialBtn.addEventListener('touchend', (e) => { e.preventDefault(); vialHandler(); }, { passive: false });
  container.appendChild(vialBtn);

  const thunderBtn = document.createElement('button');
  thunderBtn.className = 'perk-btn';
  thunderBtn.innerHTML = `<div class="perk-name">⚡ Thunderclap</div><div class="perk-desc">AoE lightning, stuns acid-soaked foes${thunderReady ? '' : ` (${p.thunderclapCooldown} turns)`}</div>`;
  if (!thunderReady) thunderBtn.style.opacity = '0.5';
  const thunderHandler = () => {
    overlay.querySelector('h1').textContent = '⬆️ LEVEL UP';
    overlay.classList.remove('active');
    inputLocked = false;
    if (thunderReady) activateThunderclap();
    else addMessage(`Thunderclap recharging (${p.thunderclapCooldown} turns).`, '');
  };
  thunderBtn.addEventListener('click', thunderHandler);
  thunderBtn.addEventListener('touchend', (e) => { e.preventDefault(); thunderHandler(); }, { passive: false });
  container.appendChild(thunderBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'perk-btn';
  cancelBtn.style.borderColor = 'var(--text-dim)';
  cancelBtn.innerHTML = '<div class="perk-name">❌ Cancel</div>';
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

function activateVialOfSlime() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.vialOfSlimeCooldown > 0) {
    addMessage(`Vial of Slime recharging (${p.vialOfSlimeCooldown} turns).`, '');
    return;
  }
  Audio.resume();
  haptic(40);
  const maxCD = getMasteryBonuses('elementalist').fastVial ? 8 : 10;
  let placed = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const ax = p.x + dx, ay = p.y + dy;
      if (ax < 0 || ax >= MAP_W || ay < 0 || ay >= MAP_H) continue;
      const tile = getTile(ax, ay);
      if (tile === T.WALL || tile === T.DOOR_SEALED) continue;
      // Don't stack acid on existing acid
      if (state.entities.some(e => e.type === 'hazard' && e.hazardType === 'acid' && e.x === ax && e.y === ay)) continue;
      state.entities.push({ type: 'hazard', hazardType: 'acid', x: ax, y: ay, glyph: '🟢', turns: 5 });
      placed++;
    }
  }
  p.vialOfSlimeCooldown = maxCD;
  addMessage(`🟢 You hurl a vial of slime! ${placed} acid tiles created.`, 'good');
  animateAoeBlast(p.x, p.y, 1.5, '#80ff00');
  Audio.useItem();
  updateUI();
  render();
  endTurn();
}

function activateThunderclap() {
  if (inputLocked || state.gameOver || state.victory) return;
  const p = state.player;
  if (p.thunderclapCooldown > 0) {
    addMessage(`Thunderclap recharging (${p.thunderclapCooldown} turns).`, '');
    return;
  }
  Audio.resume();
  haptic(50);
  const damage = 3 + Math.floor(state.floor / 4);
  let hitCount = 0;
  const hitEnemies = [];

  // Hit all enemies in 8 adjacent tiles
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const tx = p.x + dx, ty = p.y + dy;
      const enemies = state.entities.filter(e => e.type === 'enemy' && e.hp > 0 && !e.isAlly && e.x === tx && e.y === ty);
      for (const enemy of enemies) {
        enemy.hp -= damage;
        hitCount++;
        hitEnemies.push(enemy);
        // Stun acid-soaked enemies
        if (hasStatusEffect(enemy, 'acid_soaked')) {
          addStatusEffect(enemy, 'frozen', 1);
          addMessage(`⚡ ${enemy.name} is shocked and stunned! (-${damage})`, 'good');
        } else {
          addMessage(`⚡ ${enemy.name} is struck by lightning! (-${damage})`, 'good');
        }
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
  }

  // Chain Lightning perk: also hit enemies within 2 tiles of any hit target
  if (p.chainLightning && hitEnemies.length > 0) {
    const alreadyHit = new Set(hitEnemies);
    for (const hit of hitEnemies) {
      const nearby = state.entities.filter(e =>
        e.type === 'enemy' && e.hp > 0 && !e.isAlly && !alreadyHit.has(e) &&
        Math.abs(e.x - hit.x) <= 2 && Math.abs(e.y - hit.y) <= 2
      );
      for (const chain of nearby) {
        alreadyHit.add(chain);
        const chainDmg = Math.max(1, Math.floor(damage / 2));
        chain.hp -= chainDmg;
        hitCount++;
        if (hasStatusEffect(chain, 'acid_soaked')) {
          addStatusEffect(chain, 'frozen', 1);
          addMessage(`⚡ Lightning chains to ${chain.name}! Stunned! (-${chainDmg})`, 'good');
        } else {
          addMessage(`⚡ Lightning chains to ${chain.name}! (-${chainDmg})`, 'good');
        }
        if (chain.hp <= 0) killEnemy(chain);
      }
    }
  }

  if (hitCount === 0) {
    addMessage('⚡ Thunderclap crackles — but no enemies nearby!', '');
  }
  p.thunderclapCooldown = 8;
  animateAoeBlast(p.x, p.y, 1.5, '#ffff40');
  Audio.useItem();
  screenShake();
  updateUI();
  render();
  endTurn();
}

// === BOOT ===
document.addEventListener('DOMContentLoaded', boot);

// Handle bfcache page restoration (iOS PWA force-quit/reopen, Chrome back navigation).
// DOMContentLoaded does NOT re-fire after a bfcache restore — only pageshow does.
// Canvas content is NOT preserved in bfcache, so we must repaint after restoration.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return; // normal fresh load — boot() already handled it
  if (state && !state.gameOver && !state.victory) {
    // Mid-game restore: canvas is blank, repaint the dungeon
    setupCanvas();
    computeFOV();
    render();
    updateUI();
  } else if (!state) {
    // No game in progress (at title screen or never started): re-show title
    showTitle();
  }
});

})();
