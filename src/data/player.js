export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function newId(prefix = 'equipment') { return `${prefix}-${globalThis.crypto.randomUUID()}`; }
function string(value, label, max = 500) {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text, at most ${max} characters.`);
  return value;
}
function number(value, label, min = 0, max = 999999, integer = false) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}, or blank.`);
  return value;
}
export function safeImageUrl(value = '') {
  string(value, 'Image URL', 2000);
  if (!value) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { if (['https:', 'http:'].includes(new URL(value).protocol)) return value; } catch { /* validation below */ }
  throw new Error('Image URL must use HTTP or HTTPS.');
}
function source(value) {
  if (value == null) return null;
  if (!object(value)) throw new Error('Invalid source identity.');
  return Object.fromEntries(['kind', 'characterId', 'itemId'].filter(key => value[key] !== undefined).map(key => [key, string(value[key], `Source ${key}`)]));
}
export function createPlayerProfile() {
  return { id: newId('character'), rulesVersion: '2024', name: '', playerName: '', portraitUrl: '', species: '', background: '', classes: [], abilities: Object.fromEntries(ABILITIES.map(key => [key, null])), hp: { current: null, max: null, temp: null }, ac: null, speed: null, size: null, currency: Object.fromEntries(COINS.map(key => [key, null])), notes: '', capacityOverrideLb: null, capacityOverrideReason: '', source: null };
}
export function validateProfile(value) {
  if (!object(value) || value.rulesVersion !== '2024' || !object(value.abilities) || !object(value.hp) || !object(value.currency)) throw new Error('Invalid 2024 character profile.');
  const clean = { id: string(value.id, 'Character ID'), rulesVersion: '2024' };
  if (!clean.id) throw new Error('Character ID is required.');
  for (const key of ['name', 'playerName', 'species', 'background', 'capacityOverrideReason', 'notes']) clean[key] = string(value[key], key, key === 'notes' ? 20000 : 500);
  clean.portraitUrl = safeImageUrl(value.portraitUrl);
  if (!Array.isArray(value.classes) || value.classes.length > 20) throw new Error('Invalid classes.');
  clean.classes = value.classes.map(entry => ({ name: string(entry.name, 'Class'), level: number(entry.level, 'Class level', 1, 20, true) }));
  if (clean.classes.some(entry => entry.level === null || !entry.name.trim()) || clean.classes.reduce((total, entry) => total + entry.level, 0) > 20) throw new Error('Classes need names and levels totaling 20 or less.');
  clean.abilities = Object.fromEntries(ABILITIES.map(key => [key, number(value.abilities[key], key.toUpperCase(), 1, 30, true)]));
  clean.hp = Object.fromEntries(['current', 'max', 'temp'].map(key => [key, number(value.hp[key], `HP ${key}`, 0, 999999, true)]));
  for (const key of ['ac', 'speed', 'capacityOverrideLb']) clean[key] = number(value[key], key);
  if (value.size !== null && !SIZES.includes(value.size)) throw new Error('Choose a valid creature size.');
  clean.size = value.size;
  clean.currency = Object.fromEntries(COINS.map(key => [key, number(value.currency[key], key, 0, 999999999, true)]));
  clean.source = source(value.source);
  return clean;
}
export function validateEquipment(value) {
  if (!object(value)) throw new Error('Invalid equipment.');
  const clean = {};
  for (const key of ['id', 'characterId', 'name']) { clean[key] = string(value[key], key); if (!clean[key].trim()) throw new Error(`${key} is required.`); }
  clean.quantity = number(value.quantity, 'Quantity', 1, 999999, true);
  if (clean.quantity === null) throw new Error('Quantity is required.');
  clean.unitWeightLb = number(value.unitWeightLb, 'Unit weight', 0, 999999999);
  if (typeof value.carried !== 'boolean') throw new Error('Choose carried or stored.');
  clean.carried = value.carried;
  clean.category = string(value.category ?? 'Gear', 'Category');
  clean.imageUrl = safeImageUrl(value.imageUrl ?? '');
  clean.relicCardId = value.relicCardId == null ? null : string(value.relicCardId, 'Relic ID');
  if (clean.relicCardId && clean.quantity !== 1) throw new Error('Unique relics have quantity one.');
  clean.source = source(value.source);
  return clean;
}
export function relicEquipment(card, characterId) {
  return { id: `relic:${card.id}`, characterId, name: card.name || 'Relic', quantity: 1, unitWeightLb: null, carried: true, category: 'Relic', imageUrl: '', relicCardId: String(card.id), source: null };
}
export function migratePlayerData(savedState) {
  const profile = savedState.profile ? validateProfile(savedState.profile) : createPlayerProfile();
  const cards = savedState.inventory ?? [];
  const owned = new Set(cards.map(card => String(card.id)));
  const seen = new Set(), links = new Set();
  const equipment = (savedState.equipment ?? []).map(validateEquipment).filter(entry => {
    if (seen.has(entry.id) || (entry.relicCardId && (!owned.has(entry.relicCardId) || links.has(entry.relicCardId)))) return false;
    seen.add(entry.id); if (entry.relicCardId) links.add(entry.relicCardId);
    return true;
  }).map(entry => ({ ...entry, characterId: profile.id }));
  for (const card of cards) if (!links.has(String(card.id))) { equipment.push(relicEquipment(card, profile.id)); links.add(String(card.id)); }
  return { profile, equipment };
}
