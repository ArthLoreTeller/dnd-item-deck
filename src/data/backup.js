import { normalizeCard } from './rarity.js';
import defaults from './defaultCards.json' with { type: 'json' };
import { migratePlayerData, validateEquipment, validateProfile } from './player.js';
import { migrateLearnedSpells } from './character-sheet.js';
import { findSpellByName } from './srd/spells.js';

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const builtinIds = new Set(defaults.map(card => card.id));
const lists = ['abilities', 'level1Abilities', 'level2Abilities', 'level3Abilities'];
const maps = ['stats', 'specs', 'weaponStats', 'images'];
const strings = ['name', 'type', 'rarity', 'icon', 'source', 'itemImage', 'description', 'flavorText', 'attunementRules'];

function validateCard(card) {
  const invalid = () => { throw new Error('This backup contains an invalid card. Your inventory has not changed.'); };
  if (!card || typeof card !== 'object' || Array.isArray(card) || typeof card.id !== 'string' || (!builtinIds.has(card.id) && !card.id.startsWith('custom-')) || typeof card.name !== 'string' || !card.name.trim() || !['normal', 'standard', 'progressive'].includes(card.type)) invalid();
  const clean = { id: card.id };
  for (const key of strings) {
    if (card[key] === undefined) continue;
    if (typeof card[key] !== 'string' || card[key].length > 100000) invalid();
    clean[key] = card[key];
  }
  if (card.isAttuned !== undefined && typeof card.isAttuned !== 'boolean') invalid();
  clean.isAttuned = card.type !== 'normal' && Boolean(card.isAttuned);
  for (const key of lists) {
    if (card[key] === undefined) continue;
    if (!Array.isArray(card[key]) || card[key].length > 100) invalid();
    clean[key] = card[key].map(ability => {
      if (!ability || typeof ability.title !== 'string' || typeof ability.description !== 'string') invalid();
      return { title: ability.title, description: ability.description };
    });
  }
  for (const key of maps) {
    if (card[key] === undefined) continue;
    if (!card[key] || typeof card[key] !== 'object' || Array.isArray(card[key]) || Object.values(card[key]).some(value => typeof value !== 'string')) invalid();
    clean[key] = Object.fromEntries(Object.entries(card[key]).filter(([name]) => !['__proto__', 'constructor', 'prototype'].includes(name)));
  }
  const max = card.maxProgress ?? 20;
  if (!Number.isInteger(max) || max < 1 || max > 100) invalid();
  clean.maxProgress = max;
  if (card.currentLevel !== undefined && (!Number.isInteger(card.currentLevel) || card.currentLevel < 1 || card.currentLevel > 3)) invalid();
  const progress = card.progress ?? { level1: card.currentLevel >= 2 ? max : 0, level2: card.currentLevel >= 3 ? max : 0 };
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) invalid();
  clean.progress = {};
  for (const key of ['level1', 'level2']) {
    const value = progress[key] ?? 0;
    if (!Number.isInteger(value) || value < 0 || value > max) invalid();
    clean.progress[key] = value;
  }
  clean.currentLevel = card.type === 'progressive' ? (clean.progress.level1 >= max ? (clean.progress.level2 >= max ? 3 : 2) : 1) : 1;
  return normalizeCard(clean);
}

export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Choose a JSON backup smaller than 5 MB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Your inventory has not changed.'); }
  if (data?.format !== 'reliquary-backup' || ![1, 2, 3].includes(data.version)) throw new Error('Choose a supported Reliquary inventory backup.');
  const result = {};
  const ids = new Set();
  for (const key of ['inventory', 'deck', 'discardedCustom']) {
    const cards = data[key] ?? (key === 'discardedCustom' ? [] : null);
    if (!Array.isArray(cards) || cards.length > 5000) throw new Error('This backup contains an invalid card list.');
    result[key] = cards.map(card => {
      const clean = validateCard(card);
      if (ids.has(clean.id) || (key === 'deck' && !builtinIds.has(clean.id)) || (key === 'discardedCustom' && !clean.id.startsWith('custom-'))) throw new Error('This backup contains duplicate or misplaced cards.');
      ids.add(clean.id);
      return clean;
    });
  }
  if (data.version >= 2) {
    result.profile = validateProfile(data.profile);
    if (data.version === 2) result.profile.sheet = migrateLearnedSpells(result.profile.sheet, findSpellByName);
    if (!Array.isArray(data.equipment) || data.equipment.length > 5000) throw new Error('Invalid equipment list.');
    result.equipment = data.equipment.map(validateEquipment);
    const equipmentIds = new Set(), links = new Set(), owned = new Set(result.inventory.map(card => card.id));
    for (const entry of result.equipment) {
      if (equipmentIds.has(entry.id) || entry.characterId !== result.profile.id || (entry.relicCardId && (!owned.has(entry.relicCardId) || links.has(entry.relicCardId)))) throw new Error('Duplicate or misplaced equipment.');
      equipmentIds.add(entry.id); if (entry.relicCardId) links.add(entry.relicCardId);
    }
    result.relicEquipmentCache = {};
    const cache = data.relicEquipmentCache ?? {};
    if (!cache || typeof cache !== 'object' || Array.isArray(cache) || Object.keys(cache).length > 5000) throw new Error('Invalid relic equipment recovery data.');
    for (const [id, value] of Object.entries(cache)) {
      const entry = validateEquipment(value);
      if (entry.relicCardId !== id || !ids.has(id) || ['__proto__', 'prototype', 'constructor'].includes(id)) throw new Error('Invalid relic equipment recovery link.');
      result.relicEquipmentCache[id] = entry;
    }
  }
  return result;
}

export function serializeBackup(state) {
  const player = migratePlayerData(state);
  const cardIds = new Set([...state.deck, ...state.inventory, ...(state.discardedCustom ?? [])].map(card => String(card.id)));
  const relicEquipmentCache = Object.fromEntries(Object.entries(state.relicEquipmentCache ?? {}).filter(([id]) => cardIds.has(id)).map(([id, entry]) => [id, validateEquipment(entry)]));
  return JSON.stringify({ format: 'reliquary-backup', version: 3, exportedAt: new Date().toISOString(), deck: state.deck, inventory: state.inventory, discardedCustom: state.discardedCustom ?? [], ...player, relicEquipmentCache }, null, 2);
}
