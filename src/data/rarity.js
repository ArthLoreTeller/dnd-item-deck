export const RARITIES = {
  common: { label: 'Common', weight: 60, color: '#c5c7cb' },
  uncommon: { label: 'Uncommon', weight: 25, color: '#65d7a2' },
  rare: { label: 'Rare', weight: 10, color: '#77baff' },
  epic: { label: 'Epic', weight: 4, color: '#cb99ff' },
  legendary: { label: 'Legendary', weight: 1, color: '#ffd078' },
};
const defaults = { cleaver_001: 'epic', wand_001: 'legendary', protection_001: 'common', protection_002: 'uncommon', protection_003: 'rare', protection_005: 'epic', kunai_01: 'common', kunai_02: 'uncommon', kunai_03: 'rare', kunai_04: 'uncommon', kunai_05: 'rare' };
export function normalizeCard(card) {
  return { ...card, rarity: RARITIES[card.rarity] ? card.rarity : defaults[card.id] || 'common' };
}
export function chooseWeightedCard(deck, random = Math.random()) {
  if (!deck.length) return null;
  const total = deck.reduce((sum, card) => sum + RARITIES[normalizeCard(card).rarity].weight, 0);
  let target = Math.min(Math.max(random, 0), 1) * total;
  for (const card of deck) {
    target -= RARITIES[normalizeCard(card).rarity].weight;
    if (target < 0) return card;
  }
  return deck[deck.length - 1];
}
