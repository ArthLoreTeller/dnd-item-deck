import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoad, abilityModifier } from '../src/data/weight.js';
const profile = { abilities: { str: 10 }, size: 'Medium', capacityOverrideLb: null };
const item = { quantity: 3, unitWeightLb: 2, carried: true };
test('2024 capacity table, quantities and stored items', () => {
  for (const [size, capacity] of Object.entries({ Tiny: 75, Small: 150, Medium: 150, Large: 300, Huge: 600, Gargantuan: 1200 })) {
    const load = calculateLoad({ ...profile, size }, [item, { ...item, carried: false }]);
    assert.equal(load.capacityLb, capacity);
    assert.equal(load.dragLiftPushLb, capacity * 2);
    assert.equal(load.knownWeightLb, 6);
  }
});
test('unknown, zero, exact limits and overrides remain distinct', () => {
  assert.equal(calculateLoad(profile, [{ ...item, unitWeightLb: null }]).status, 'incomplete');
  assert.equal(calculateLoad(profile, [{ ...item, unitWeightLb: 0 }]).unknownCount, 0);
  assert.equal(calculateLoad(profile, [{ ...item, unitWeightLb: 50 }]).status, 'within');
  assert.equal(calculateLoad(profile, [{ ...item, unitWeightLb: 51 }]).status, 'over');
  assert.equal(calculateLoad({ ...profile, size: null }, []).status, 'capacity-unknown');
  assert.equal(calculateLoad({ ...profile, abilities: { str: null } }, []).capacityLb, null);
  assert.equal(calculateLoad({ ...profile, capacityOverrideLb: 99 }, []).capacityLb, 99);
  assert.equal(abilityModifier(null), null);
  assert.equal(abilityModifier(9), -1);
});
