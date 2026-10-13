import records from './equipment.json' with { type: 'json' };

const ids = new Set();
const categories = new Set(['Weapons', 'Armor', 'Tools', 'Adventuring Gear', 'Ammunition', 'Spellcasting Focuses', 'Mounts and Vehicles']);
if (!Array.isArray(records) || records.length === 0) throw new Error('Invalid SRD equipment catalog.');
for (const item of records) {
  if (!item || ['id', 'name', 'category'].some(key => typeof item[key] !== 'string' || !item[key].trim()) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id) || !categories.has(item.category) || !Number.isSafeInteger(item.priceCp) || item.priceCp < 0 ||
      (item.weightLb !== null && (!Number.isFinite(item.weightLb) || item.weightLb < 0)) || item.rarity !== 'Common' || typeof item.consumable !== 'boolean') {
    throw new Error(`Invalid SRD equipment record: ${item?.id ?? 'unknown'}.`);
  }
  ids.add(item.id);
}

export const SRD_EQUIPMENT = Object.freeze(records.map(item => Object.freeze(item)));
const normalize = value => String(value ?? '').trim().toLowerCase();
export function filterEquipment({ query = '', category = '' } = {}) {
  const search = normalize(query), group = normalize(category);
  return SRD_EQUIPMENT.filter(item => (!group || normalize(item.category) === group) && normalize(item.name).includes(search));
}
