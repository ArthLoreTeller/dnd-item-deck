import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile, validateProfile, validateEquipment, migratePlayerData } from '../src/data/player.js';
test('legacy migration links each owned relic once without changing cards', () => {
  const inventory = [{ id: 'wand', name: 'Edited wand', stats: { hit: '+9' } }];
  const result = migratePlayerData({ inventory });
  assert.equal(result.equipment.length, 1);
  assert.equal(result.equipment[0].relicCardId, 'wand');
  assert.equal(result.equipment[0].unitWeightLb, null);
  assert.equal(result.equipment[0].quantity, 1);
  assert.equal(inventory[0].stats.hit, '+9');
  assert.deepEqual(migratePlayerData({ ...result, inventory }), result);
});
test('player and equipment validation reject invalid numbers and oversized strings', () => {
  const profile = createPlayerProfile();
  for (const value of [0, 31, NaN, Infinity]) assert.throws(() => validateProfile({ ...profile, abilities: { ...profile.abilities, str: value } }));
  assert.throws(() => validateProfile({ ...profile, classes: [{ name: 'Wizard', level: 21 }] }));
  assert.throws(() => validateProfile({ ...profile, name: 'x'.repeat(501) }));
  const equipment = { id: 'e', characterId: profile.id, name: 'Rope', quantity: 1, unitWeightLb: null, carried: true };
  for (const quantity of [0, 1.5, Infinity, 1000000]) assert.throws(() => validateEquipment({ ...equipment, quantity }));
  for (const unitWeightLb of [-1, NaN, Infinity, '']) assert.throws(() => validateEquipment({ ...equipment, unitWeightLb }));
  assert.equal(validateEquipment({ ...equipment, unitWeightLb: 0 }).unitWeightLb, 0);
});
test('migration repairs duplicate and dangling links and retains ordinary equipment', () => {
  const first = migratePlayerData({ inventory: [{ id: 'a', name: 'A' }] });
  const ordinary = validateEquipment({ id: 'rope', characterId: first.profile.id, name: 'Rope', quantity: 1, carried: true, unitWeightLb: 10 });
  const result = migratePlayerData({ ...first, inventory: [{ id: 'a', name: 'A' }], equipment: [first.equipment[0], first.equipment[0], { ...first.equipment[0], id: 'bad', relicCardId: 'gone' }, ordinary] });
  assert.equal(result.equipment.length, 2);
});
