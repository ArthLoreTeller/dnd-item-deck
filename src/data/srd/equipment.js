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

const WEAPONS = {
  club: ['1d4 Bludgeoning', 'Light', 'Slow', 'Simple Melee'],
  dagger: ['1d4 Piercing', 'Finesse, Light, Thrown (Range 20/60)', 'Nick', 'Simple Melee'],
  greatclub: ['1d8 Bludgeoning', 'Two-Handed', 'Push', 'Simple Melee'],
  handaxe: ['1d6 Slashing', 'Light, Thrown (Range 20/60)', 'Vex', 'Simple Melee'],
  javelin: ['1d6 Piercing', 'Thrown (Range 30/120)', 'Slow', 'Simple Melee'],
  'light-hammer': ['1d4 Bludgeoning', 'Light, Thrown (Range 20/60)', 'Nick', 'Simple Melee'],
  mace: ['1d6 Bludgeoning', 'None', 'Sap', 'Simple Melee'],
  quarterstaff: ['1d6 Bludgeoning', 'Versatile (1d8)', 'Topple', 'Simple Melee'],
  sickle: ['1d4 Slashing', 'Light', 'Nick', 'Simple Melee'],
  spear: ['1d6 Piercing', 'Thrown (Range 20/60), Versatile (1d8)', 'Sap', 'Simple Melee'],
  dart: ['1d4 Piercing', 'Finesse, Thrown (Range 20/60)', 'Vex', 'Simple Ranged'],
  'light-crossbow': ['1d8 Piercing', 'Ammunition (Range 80/320; Bolt), Loading, Two-Handed', 'Slow', 'Simple Ranged'],
  shortbow: ['1d6 Piercing', 'Ammunition (Range 80/320; Arrow), Two-Handed', 'Vex', 'Simple Ranged'],
  sling: ['1d4 Bludgeoning', 'Ammunition (Range 30/120; Bullet)', 'Slow', 'Simple Ranged'],
  battleaxe: ['1d8 Slashing', 'Versatile (1d10)', 'Topple', 'Martial Melee'],
  flail: ['1d8 Bludgeoning', 'None', 'Sap', 'Martial Melee'],
  glaive: ['1d10 Slashing', 'Heavy, Reach, Two-Handed', 'Graze', 'Martial Melee'],
  greataxe: ['1d12 Slashing', 'Heavy, Two-Handed', 'Cleave', 'Martial Melee'],
  greatsword: ['2d6 Slashing', 'Heavy, Two-Handed', 'Graze', 'Martial Melee'],
  halberd: ['1d10 Slashing', 'Heavy, Reach, Two-Handed', 'Cleave', 'Martial Melee'],
  lance: ['1d10 Piercing', 'Heavy, Reach, Two-Handed (unless mounted)', 'Topple', 'Martial Melee'],
  longsword: ['1d8 Slashing', 'Versatile (1d10)', 'Sap', 'Martial Melee'],
  maul: ['2d6 Bludgeoning', 'Heavy, Two-Handed', 'Topple', 'Martial Melee'],
  morningstar: ['1d8 Piercing', 'None', 'Sap', 'Martial Melee'],
  pike: ['1d10 Piercing', 'Heavy, Reach, Two-Handed', 'Push', 'Martial Melee'],
  rapier: ['1d8 Piercing', 'Finesse', 'Vex', 'Martial Melee'],
  scimitar: ['1d6 Slashing', 'Finesse, Light', 'Nick', 'Martial Melee'],
  shortsword: ['1d6 Piercing', 'Finesse, Light', 'Vex', 'Martial Melee'],
  trident: ['1d8 Piercing', 'Thrown (Range 20/60), Versatile (1d10)', 'Topple', 'Martial Melee'],
  warhammer: ['1d8 Bludgeoning', 'Versatile (1d10)', 'Push', 'Martial Melee'],
  'war-pick': ['1d8 Piercing', 'Versatile (1d10)', 'Sap', 'Martial Melee'],
  whip: ['1d4 Slashing', 'Finesse, Reach', 'Slow', 'Martial Melee'],
  blowgun: ['1 Piercing', 'Ammunition (Range 25/100; Needle), Loading', 'Vex', 'Martial Ranged'],
  'hand-crossbow': ['1d6 Piercing', 'Ammunition (Range 30/120; Bolt), Light, Loading', 'Vex', 'Martial Ranged'],
  'heavy-crossbow': ['1d10 Piercing', 'Ammunition (Range 100/400; Bolt), Heavy, Loading, Two-Handed', 'Push', 'Martial Ranged'],
  longbow: ['1d8 Piercing', 'Ammunition (Range 150/600; Arrow), Heavy, Two-Handed', 'Slow', 'Martial Ranged'],
  musket: ['1d12 Piercing', 'Ammunition (Range 40/120; Bullet), Loading, Two-Handed', 'Slow', 'Martial Ranged'],
  pistol: ['1d10 Piercing', 'Ammunition (Range 30/90; Bullet), Loading', 'Vex', 'Martial Ranged'],
};

const ARMOR = {
  'padded-armor': ['11 + Dex modifier', 'Light Armor', 'None', 'Disadvantage'],
  'leather-armor': ['11 + Dex modifier', 'Light Armor', 'None', 'Normal'],
  'studded-leather-armor': ['12 + Dex modifier', 'Light Armor', 'None', 'Normal'],
  'hide-armor': ['12 + Dex modifier (max 2)', 'Medium Armor', 'None', 'Normal'],
  'chain-shirt': ['13 + Dex modifier (max 2)', 'Medium Armor', 'None', 'Normal'],
  'scale-mail': ['14 + Dex modifier (max 2)', 'Medium Armor', 'None', 'Disadvantage'],
  breastplate: ['14 + Dex modifier (max 2)', 'Medium Armor', 'None', 'Normal'],
  'half-plate-armor': ['15 + Dex modifier (max 2)', 'Medium Armor', 'None', 'Disadvantage'],
  'ring-mail': ['14', 'Heavy Armor', 'None', 'Disadvantage'],
  'chain-mail': ['16', 'Heavy Armor', '13', 'Disadvantage'],
  'splint-armor': ['17', 'Heavy Armor', '15', 'Disadvantage'],
  'plate-armor': ['18', 'Heavy Armor', '15', 'Disadvantage'],
  shield: ['+2', 'Shield', 'None', 'Normal'],
};

export function equipmentDetails(item) {
  const weapon = WEAPONS[item?.id];
  if (weapon) return [['Damage', weapon[0]], ['Properties', weapon[1]], ['Mastery', weapon[2]], ['Weapon type', weapon[3]]];
  const armor = ARMOR[item?.id];
  if (armor) return [['Armor Class', armor[0]], ['Armor type', armor[1]], ['Strength', armor[2]], ['Stealth', armor[3]]];
  return [['Category', item?.category || 'Not specified'], ['Use', item?.consumable ? 'Consumable' : 'Reusable']];
}

const normalize = value => String(value ?? '').trim().toLowerCase();
export function filterEquipment({ query = '', category = '' } = {}) {
  const search = normalize(query), group = normalize(category);
  return SRD_EQUIPMENT.filter(item => (!group || normalize(item.category) === group) && normalize(item.name).includes(search));
}
