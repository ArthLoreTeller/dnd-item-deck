import { ABILITIES, COINS, createPlayerProfile, SIZES, validateEquipment, validateProfile } from '../data/player.js';
function hash(text) { let value = 2166136261; for (const char of text) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); } return (value >>> 0).toString(16); }
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function normalizePdfFields(fields, { fingerprint = '', text = '' } = {}) {
  const mapped = new Map(Object.entries(fields).map(([key, value]) => [normalize(key), Array.isArray(value) ? value.join(' ') : String(value ?? '').trim()]));
  const get = (...keys) => keys.map(key => mapped.get(normalize(key))).find(value => value) ?? '';
  if (!get('CharacterName', 'CharacterName2', 'Character Name', 'Name') && !ABILITIES.some(key => get(key))) throw new Error('This PDF layout is not supported or has no character data. Use a text-based exported character sheet or enter your character manually.');
  const profile = createPlayerProfile(), warnings = ['Review every extracted value. PDF layouts vary; missing values remain blank.', 'Equipment quantities and weights need review. The PDF equipment list does not provide structured weight data.'];
  profile.name = get('CharacterName', 'CharacterName2', 'Character Name', 'Name');
  profile.playerName = get('PlayerName', 'Player Name');
  profile.species = get('Species', 'Race'); profile.background = get('Background');
  const readNumber = (raw, label, min = 0, max = 999999, integer = true) => {
    if (!raw) return null;
    const value = /^\d+(?:\.\d+)?(?:\s*(?:ft\.?|feet|lb\.?|lbs))?$/i.test(raw) ? Number.parseFloat(raw) : NaN;
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) { warnings.push(`${label}: unsupported value “${raw.slice(0, 80)}”; enter it manually.`); return null; }
    return value;
  };
  for (const key of ABILITIES) profile.abilities[key] = readNumber(get(key, `${key}score`, `${key}abilityscore`), key.toUpperCase(), 1, 30);
  profile.ac = readNumber(get('AC', 'ArmorClass'), 'Armor class'); profile.speed = readNumber(get('Speed'), 'Speed');
  profile.hp = { current: readNumber(get('HPCurrent', 'CurrentHP', 'CurrentHitPoints'), 'Current HP'), max: readNumber(get('HPMax', 'MaxHP', 'HitPointMaximum'), 'Maximum HP'), temp: readNumber(get('HPTemp', 'TempHP', 'TemporaryHitPoints'), 'Temporary HP') };
  for (const key of COINS) profile.currency[key] = readNumber(get(key), key.toUpperCase(), 0, 999999999);
  const rawSize = get('Size'); profile.size = SIZES.find(size => size.toLowerCase() === rawSize.toLowerCase()) ?? null;
  const classes = get('ClassLevel', 'Class & Level', 'Class and Level');
  if (classes) {
    const entries = classes.split(/\s*(?:\/|,|;)\s*/).map(part => part.match(/^(.+?)\s+(\d+)$/));
    if (entries.every(Boolean)) {
      const candidate = entries.map(match => ({ name: match[1], level: Number(match[2]) }));
      if (candidate.every(entry => entry.level >= 1 && entry.level <= 20) && candidate.reduce((sum, entry) => sum + entry.level, 0) <= 20) profile.classes = candidate;
      else warnings.push('Class levels are outside the supported 1–20 total. Enter them manually.');
    } else warnings.push(`Could not parse class and level: “${classes.slice(0, 100)}”.`);
  }
  profile.notes = get('Notes', 'Backstory', 'CharacterBackstory').slice(0, 20000);
  const identity = profile.name || profile.playerName ? `${profile.name.toLowerCase()}|${profile.playerName.toLowerCase()}` : fingerprint;
  const characterId = `pdf:${hash(identity)}:${hash([...identity].reverse().join(''))}`;
  profile.source = { kind: 'pdf', characterId };
  const lines = get('Equipment', 'EquipmentList', 'Equipment1').split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 500);
  const equipment = lines.map((name, index) => validateEquipment({ id: `pdf-item:${characterId}:${hash(name)}:${lines.slice(0, index).filter(line => line === name).length}`, characterId: profile.id, name: name.slice(0, 500), quantity: 1, unitWeightLb: null, carried: true, source: { kind: 'pdf', characterId, itemId: `${hash(name)}:${index}` } }));
  if (!profile.abilities.str || !profile.size) warnings.push('Set Strength and creature size before calculating capacity.');
  if (!equipment.length) warnings.push('No supported equipment list was found; existing items will be retained.');
  if (!Object.keys(fields).length && text) warnings.push('Extracted from labeled text; confirm the layout was interpreted correctly.');
  return { profile: validateProfile(profile), equipment, warnings, provenance: { kind: 'pdf', characterId, fingerprint, verifiedSourceSample: false } };
}
export function fieldsFromLabeledText(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(Character\s*Name|Player\s*Name|Class\s*(?:&|and)?\s*Level|Species|Race|Background|STR|DEX|CON|INT|WIS|CHA|AC|Speed|HPMax|HPCurrent|HPTemp|Size|CP|SP|EP|GP|PP)\s*:\s*(.+)$/i);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}
