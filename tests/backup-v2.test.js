import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile, validateEquipment } from '../src/data/player.js';
import { parseBackup, serializeBackup } from '../src/data/backup.js';
test('version three carries profile and unknown equipment weight with atomic validation', () => {
  const profile = { ...createPlayerProfile(), name: 'Aria' };
  const equipment = [validateEquipment({ id: 'rope', characterId: profile.id, name: 'Rope', quantity: 2, unitWeightLb: null, carried: true })];
  const text = serializeBackup({ profile, equipment, deck: [], inventory: [], discardedCustom: [], relicEquipmentCache: {} });
  const restored = parseBackup(text);
  assert.equal(JSON.parse(text).version, 3);
  assert.deepEqual(restored.profile, profile);
  assert.deepEqual(restored.equipment, equipment);
  const data = JSON.parse(text); data.equipment[0].unitWeightLb = -1;
  assert.throws(() => parseBackup(JSON.stringify(data)));
});

test('version two imports legacy spells and equipment without losing profile or relic data', () => {
  const profile = { ...createPlayerProfile(), name: 'Aria', notes: 'Keep my journal.', capacityOverrideLb: 177, capacityOverrideReason: 'Magic pack', size: 'Small', currency: { cp: 12, sp: 3, ep: 4, gp: 125, pp: 0 } };
  profile.abilities.str = 9;
  delete profile.sheet.learnedSpellIds;
  profile.sheet.spells = [{ name: 'magic missile', level: 1, prepared: true, concentration: false, notes: '' }, { name: 'My Ritual', level: 2, prepared: false, concentration: true, notes: 'custom' }];
  const card = { id: 'wand_001', name: 'Edited wand', type: 'progressive', stats: { hit: '+9' }, progress: { level1: 20, level2: 5 } };
  const entry = { id: 'relic:wand_001', characterId: profile.id, name: 'Edited wand', quantity: 1, unitWeightLb: null, carried: false, category: 'Relic', imageUrl: '', relicCardId: 'wand_001', source: null };
  const restored = parseBackup(JSON.stringify({ format: 'reliquary-backup', version: 2, deck: [], inventory: [card], profile, equipment: [entry], relicEquipmentCache: { wand_001: entry } }));
  assert.deepEqual(restored.profile.sheet.learnedSpellIds, ['magic-missile']);
  assert.deepEqual(restored.profile.sheet.spells, [profile.sheet.spells[1]]);
  for (const key of ['notes', 'currency', 'abilities', 'size', 'capacityOverrideLb', 'capacityOverrideReason']) assert.deepEqual(restored.profile[key], profile[key]);
  assert.deepEqual(restored.equipment[0], { ...entry, consumable: false });
  assert.deepEqual(restored.relicEquipmentCache.wand_001, { ...entry, consumable: false });
  assert.equal(restored.inventory[0].stats.hit, '+9');
  assert.deepEqual(restored.inventory[0].progress, { level1: 20, level2: 5 });
});

test('version three roundtrip retains learned IDs, custom spells, currency, capacity and relic cache', () => {
  const profile = { ...createPlayerProfile(), notes: 'Journal', capacityOverrideLb: 200, capacityOverrideReason: 'Boon', size: 'Large', currency: { cp: null, sp: 2, ep: 0, gp: 87, pp: 10 } };
  profile.abilities.str = 18;
  profile.sheet.learnedSpellIds = ['magic-missile', 'shield'];
  profile.sheet.spells = [{ name: 'Magic Missile', level: 1, prepared: false, concentration: false, notes: 'A custom variant added after migration.' }];
  const equipment = [validateEquipment({ id: 'potion', characterId: profile.id, name: 'Potion', quantity: 3, unitWeightLb: 0.5, carried: true, consumable: true })];
  const card = { id: 'wand_001', name: 'Recovered wand', type: 'progressive', stats: { hit: '+8' } };
  const cached = validateEquipment({ id: 'relic:wand_001', characterId: profile.id, name: 'Recovered wand', quantity: 1, unitWeightLb: null, carried: false, consumable: true, relicCardId: card.id });
  const text = serializeBackup({ profile, equipment, deck: [card], inventory: [], relicEquipmentCache: { [card.id]: cached } });
  assert.equal(JSON.parse(text).version, 3);
  const restored = parseBackup(text);
  assert.deepEqual(restored.profile, profile);
  assert.deepEqual(restored.equipment, equipment);
  assert.equal(restored.equipment[0].consumable, true);
  assert.deepEqual(restored.relicEquipmentCache, { [card.id]: cached });
  assert.equal(restored.deck[0].stats.hit, '+8');
});
test('version one backups leave player merge decisions to current state', () => {
  const restored = parseBackup(JSON.stringify({ format: 'reliquary-backup', version: 1, deck: [], inventory: [] }));
  assert.equal(restored.profile, undefined);
});
