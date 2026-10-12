import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile, validateEquipment } from '../src/data/player.js';
import { parseBackup, serializeBackup } from '../src/data/backup.js';
test('version two carries profile and unknown equipment weight with atomic validation', () => {
  const profile = { ...createPlayerProfile(), name: 'Aria' };
  const equipment = [validateEquipment({ id: 'rope', characterId: profile.id, name: 'Rope', quantity: 2, unitWeightLb: null, carried: true })];
  const text = serializeBackup({ profile, equipment, deck: [], inventory: [], discardedCustom: [], relicEquipmentCache: {} });
  const restored = parseBackup(text);
  assert.equal(JSON.parse(text).version, 2);
  assert.deepEqual(restored.profile, profile);
  assert.deepEqual(restored.equipment, equipment);
  const data = JSON.parse(text); data.equipment[0].unitWeightLb = -1;
  assert.throws(() => parseBackup(JSON.stringify(data)));
});
test('version one backups leave player merge decisions to current state', () => {
  const restored = parseBackup(JSON.stringify({ format: 'reliquary-backup', version: 1, deck: [], inventory: [] }));
  assert.equal(restored.profile, undefined);
});
