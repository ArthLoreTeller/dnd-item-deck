import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGuidelineWeights } from '../src/data/equipment-weights.js';
import { relicEquipment, migratePlayerData } from '../src/data/player.js';

test('known wand and dagger relics receive equipment-table defaults', () => {
  for (const id of ['wand_001', 'cleaver_001', 'kunai_01', 'kunai_02', 'kunai_03', 'kunai_04', 'kunai_05']) {
    assert.equal(relicEquipment({ id, name: 'Relic' }, 'character').unitWeightLb, 1);
  }
  assert.equal(relicEquipment({ id: 'protection_001' }, 'character').unitWeightLb, null);
});

test('one-time migration fills known missing weights but preserves edits and unknown items', () => {
  const equipment = [
    { relicCardId: 'wand_001', unitWeightLb: null },
    { relicCardId: 'kunai_01', unitWeightLb: 0 },
    { relicCardId: 'cleaver_001', unitWeightLb: 7 },
    { relicCardId: 'protection_001', unitWeightLb: null },
    { relicCardId: null, unitWeightLb: null },
  ];
  const input = { equipment, relicEquipmentCache: { wand_001: equipment[0] } };
  const result = applyGuidelineWeights(input);
  assert.deepEqual(result.equipment.map(item => item.unitWeightLb), [1, 0, 7, null, null]);
  assert.equal(result.relicEquipmentCache.wand_001.unitWeightLb, 1);
  assert.equal(input.equipment[0].unitWeightLb, null);
});

test('ordinary hydration retains an explicitly cleared default weight', () => {
  const card = { id: 'wand_001', name: 'Wand' };
  const initial = migratePlayerData({ inventory: [card] });
  initial.equipment[0].unitWeightLb = null;
  assert.equal(migratePlayerData({ ...initial, inventory: [card] }).equipment[0].unitWeightLb, null);
});
