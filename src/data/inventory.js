const normalizedName = item => (item.name ?? '').trim().toLowerCase();
const normalizedRarity = item => (item.rarity ?? 'common').trim().toLowerCase();

export function canStack(item) {
  return ['common', 'uncommon'].includes(normalizedRarity(item));
}

export function inventoryStackKey(item) {
  return JSON.stringify([normalizedName(item), normalizedRarity(item)]);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

// IDs identify owned records, while every other card field can distinguish
// attunement, progression, or a player-edited relic from an otherwise equal one.
function cardState(card) {
  return canonical(Object.fromEntries(Object.entries(card).filter(([key]) => !['id', 'name', 'rarity'].includes(key))));
}

export function groupInventory(equipment, cards) {
  const ownedCards = new Map(cards.map(card => [String(card.id), card]));
  const groups = new Map();
  for (const entry of equipment) {
    const card = entry.relicCardId ? ownedCards.get(String(entry.relicCardId)) : null;
    const item = card ?? entry;
    const stackable = canStack(item) && (!entry.relicCardId || Boolean(card));
    const consumable = entry.consumable === true;
    const key = JSON.stringify([inventoryStackKey(item), consumable, card ? cardState(card) : null, stackable ? null : entry.id]);
    let group = groups.get(key);
    if (!group) {
      group = { key, name: (item.name ?? '').trim(), rarity: normalizedRarity(item), quantity: 0, entries: [], stacked: false, consumable };
      groups.set(key, group);
    }
    group.quantity += entry.quantity;
    group.entries.push(entry);
    group.stacked = stackable && group.quantity > 1;
  }
  return [...groups.values()];
}
