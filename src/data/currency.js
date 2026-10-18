import { inventoryStackKey } from './inventory.js';
import { validateEquipment, validateProfile } from './player.js';

const COIN_VALUES = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };

export function walletValueCp(currency) {
  let total = 0;
  for (const [coin, value] of Object.entries(COIN_VALUES)) {
    const count = currency[coin] ?? 0;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Coin amounts must be nonnegative whole numbers.');
    total += count * value;
    if (!Number.isSafeInteger(total)) throw new Error('Wallet value is too large.');
  }
  return total;
}

export function normalizeWallet(totalCp) {
  if (!Number.isSafeInteger(totalCp) || totalCp < 0) throw new Error('Wallet value must be a nonnegative whole number of copper pieces.');
  const currency = {};
  for (const [coin, value] of Object.entries(COIN_VALUES)) {
    currency[coin] = Math.floor(totalCp / value);
    totalCp %= value;
  }
  return currency;
}

function purchaseId(catalogId, equipment) {
  const ids = new Set(equipment.map(entry => entry.id));
  const base = `shop:${catalogId}`;
  let id = base;
  for (let suffix = 2; ids.has(id); suffix++) id = `${base}:${suffix}`;
  return id;
}

export function purchaseEquipment({ profile, equipment, catalogItem, quantity = 1 }) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999999) throw new Error('Quantity must be a whole number from 1 to 999999.');
  if (!catalogItem || typeof catalogItem.id !== 'string' || !catalogItem.id || !Number.isSafeInteger(catalogItem.priceCp) || catalogItem.priceCp < 0) throw new Error('Invalid catalog item.');
  const costCp = catalogItem.priceCp * quantity;
  if (!Number.isSafeInteger(costCp)) throw new Error('Purchase cost is too large.');
  const fundsCp = walletValueCp(profile.currency);
  if (costCp > fundsCp) throw new Error('Insufficient funds.');
  const currency = normalizeWallet(fundsCp - costCp);
  validateProfile({ ...profile, currency });
  const match = equipment.find(entry => !entry.relicCardId && entry.characterId === profile.id &&
    inventoryStackKey(entry) === inventoryStackKey(catalogItem) &&
    entry.category === catalogItem.category && entry.unitWeightLb === catalogItem.weightLb &&
    entry.carried === true && entry.consumable === catalogItem.consumable);
  let purchased;
  if (match) {
    validateEquipment({ ...match, quantity: match.quantity + quantity });
    purchased = { ...match, quantity: match.quantity + quantity };
  } else {
    purchased = validateEquipment({
      id: purchaseId(catalogItem.id, equipment), characterId: profile.id, name: catalogItem.name,
      quantity, unitWeightLb: catalogItem.weightLb, carried: true,
      consumable: catalogItem.consumable, category: catalogItem.category,
      imageUrl: '', relicCardId: null, source: null,
    });
  }
  return {
    profile: { ...profile, currency },
    equipment: match ? equipment.map(entry => entry === match ? purchased : entry) : [...equipment, purchased],
  };
}
