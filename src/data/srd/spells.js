import records from './spells.json' with { type: 'json' };

const schools = new Set(['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']);
const ids = new Set();
if (!Array.isArray(records) || records.length !== 339) throw new Error('Invalid SRD spell catalog: expected 339 spells.');
for (const spell of records) {
  if (!spell || ['id', 'name', 'school', 'castingTime', 'range', 'components', 'duration', 'description'].some(key => typeof spell[key] !== 'string' || !spell[key].trim()) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spell.id) || ids.has(spell.id) || !Number.isInteger(spell.level) || spell.level < 0 || spell.level > 9 ||
      !schools.has(spell.school) || typeof spell.concentration !== 'boolean' || typeof spell.ritual !== 'boolean') {
    throw new Error(`Invalid SRD spell record: ${spell?.id ?? 'unknown'}.`);
  }
  ids.add(spell.id);
}

export const SRD_SPELLS = Object.freeze(records.map(spell => Object.freeze(spell)));
const byId = new Map(SRD_SPELLS.map(spell => [spell.id, spell]));
const normalize = value => String(value ?? '').trim().toLowerCase();
const byName = new Map(SRD_SPELLS.map(spell => [normalize(spell.name), spell]));

export function spellById(id) { return byId.get(normalize(id)); }
export function findSpellByName(name) { return byName.get(normalize(name)); }
export function filterSpells({ query = '', level = null } = {}) {
  const search = normalize(query);
  return SRD_SPELLS.filter(spell => (level === null || level === undefined || spell.level === Number(level)) && normalize(spell.name).includes(search));
}
