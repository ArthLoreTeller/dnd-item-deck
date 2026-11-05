import { normalizeCatalogSpecs } from '../data/catalogSpecs.js';
import { normalizeCard } from '../data/rarity.js';
import catalog from '../data/defaultCards.json' with { type: 'json' };

export const CARD_STORAGE_KEY = 'dnd-item-deck-storage';
export const defaultCards = catalog.map(normalizeCard);
const catalogById = new Map(defaultCards.map(card => [card.id, card]));
const stringFields = ['name', 'type', 'icon', 'description', 'flavorText', 'itemImage', 'attunementRules'];
const textMaps = ['images', 'stats', 'specs', 'weaponStats'];
const abilityLists = ['abilities', 'level1Abilities', 'level2Abilities', 'level3Abilities'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string';
const isCount = value => Number.isSafeInteger(value) && value >= 0;
const isAbility = value => isRecord(value) && [value.title, value.description].every(v => v === undefined || isText(v));

export const UNREADABLE = 'This saved deck could not be read. Changes are paused to preserve the original save.';
export const RECOVERED = 'Some saved card data was invalid. The recovered cards are shown. Your next save will keep a backup of the original.';
export const WRITE_FAILED = 'Changes could not be saved. Check available browser storage and try again.';

// Repair individual fields so a damaged ability or stat cannot hide an otherwise usable card.
function readCard(value, markDamaged) {
  if (!isRecord(value) || !isText(value.id) || !value.id.trim()) {
    markDamaged();
    return null;
  }
  const card = { ...value };
  const fallback = catalogById.get(card.id);
  function check(field, valid) {
    if (card[field] === undefined || valid(card[field])) return;
    markDamaged();
    if (fallback?.[field] === undefined) delete card[field];
    else card[field] = fallback[field];
  }
  stringFields.forEach(field => check(field, isText));
  textMaps.forEach(field => check(field, entry => isRecord(entry) && Object.values(entry).every(isText)));
  check('progress', entry => isRecord(entry) && Object.values(entry).every(isCount));
  check('maxProgress', v => isCount(v) && v > 0 && v <= 100);
  check('currentLevel', v => isCount(v) && v >= 1 && v <= 3);
  check('isAttuned', v => typeof v === 'boolean');
  for (const field of abilityLists) {
    check(field, Array.isArray);
    if (card[field]?.some(ability => !isAbility(ability))) {
      markDamaged();
      card[field] = card[field].filter(isAbility);
    }
  }
  return normalizeCatalogSpecs(normalizeCard({ ...fallback, ...card }));
}

export function readDeck(raw) {
  if (raw === null) return { deck: defaultCards, inventory: [], activeCardId: null, damaged: false };
  const payload = JSON.parse(raw);
  if (!isRecord(payload) || (payload.version !== undefined && payload.version !== 0) || !isRecord(payload.state)) throw new Error(UNREADABLE);
  const state = payload.state;
  if (!Array.isArray(state.deck) && !Array.isArray(state.inventory)) throw new Error(UNREADABLE);
  let damaged = false;
  const markDamaged = () => { damaged = true; };
  const seen = new Set();
  function collection(rows) {
    if (!Array.isArray(rows)) {
      markDamaged();
      return [];
    }
    const cards = [];
    for (const value of rows) {
      const card = readCard(value, markDamaged);
      if (!card) continue;
      if (seen.has(card.id)) { markDamaged(); continue; }
      seen.add(card.id);
      cards.push(card);
    }
    return cards;
  }
  // An owned copy has the player's edits and wins if a damaged save also has it in the deck.
  const inventory = collection(state.inventory);
  const deck = collection(state.deck);
  return { deck, inventory, activeCardId: state.activeCard?.id, damaged };
}
