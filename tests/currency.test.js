import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile } from '../src/data/player.js';
import { walletValueCp, normalizeWallet, purchaseEquipment } from '../src/data/currency.js';

const torch = { id: 'torch', name: 'Torch', category: 'Adventuring Gear', priceCp: 1, weightLb: 1, rarity: 'Common', consumable: true };
const zeroWallet = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

test('mixed denominations and blank coins convert to literal copper totals', () => {
  assert.equal(walletValueCp({ cp: 7, sp: 3, ep: 2, gp: 4, pp: 1 }), 1537);
  assert.equal(walletValueCp({ cp: null, sp: null, ep: null, gp: null, pp: null }), 0);
  assert.equal(walletValueCp({ gp: 2 }), 200);
});

test('remaining copper normalizes into descending PP GP EP SP CP change', () => {
  assert.deepEqual(normalizeWallet(2876), { cp: 6, sp: 2, ep: 1, gp: 8, pp: 2 });
  assert.deepEqual(normalizeWallet(49), { cp: 9, sp: 4, ep: 0, gp: 0, pp: 0 });
  assert.deepEqual(normalizeWallet(50), { cp: 0, sp: 0, ep: 1, gp: 0, pp: 0 });
  assert.deepEqual(normalizeWallet(100), { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 });
  assert.deepEqual(normalizeWallet(1000), { cp: 0, sp: 0, ep: 0, gp: 0, pp: 1 });
  assert.deepEqual(normalizeWallet(0), zeroWallet);
});

test('invalid coin values and noninteger copper totals cannot become spending money', () => {
  for (const value of [-1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => walletValueCp({ cp: value }));
    assert.throws(() => normalizeWallet(value));
  }
  assert.throws(() => walletValueCp({ pp: Number.MAX_SAFE_INTEGER }));
});

test('exact-funds purchase returns ordinary equipment without mutating its inputs', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, sp: 1, ep: 1 } };
  const equipment = [];
  const before = structuredClone({ profile, equipment, catalogItem: torch });
  const result = purchaseEquipment({ profile, equipment, catalogItem: torch, quantity: 60 });
  assert.deepEqual(result.profile, { ...profile, currency: zeroWallet });
  assert.equal(result.equipment.length, 1);
  assert.deepEqual(result.equipment[0], {
    id: result.equipment[0].id, characterId: profile.id, name: 'Torch', quantity: 60,
    unitWeightLb: 1, carried: true, consumable: true, category: 'Adventuring Gear',
    imageUrl: '', relicCardId: null, source: null,
  });
  assert.ok(result.equipment[0].id);
  assert.deepEqual({ profile, equipment, catalogItem: torch }, before);
});

test('one copper short and invalid quantities reject without touching input state', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, cp: 59 } };
  const equipment = [];
  const before = structuredClone({ profile, equipment });
  assert.throws(() => purchaseEquipment({ profile, equipment, catalogItem: torch, quantity: 60 }), /insufficient funds/i);
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '2', null, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => purchaseEquipment({ profile, equipment, catalogItem: torch, quantity }), /quantity/i);
  }
  assert.deepEqual({ profile, equipment }, before);
});

test('quantity multiplies the price and canonicalizes mixed-wallet change', () => {
  const profile = { ...createPlayerProfile(), currency: { cp: 7, sp: 3, ep: 2, gp: 4, pp: 1 } };
  const result = purchaseEquipment({ profile, equipment: [], catalogItem: { ...torch, priceCp: 20 }, quantity: 3 });
  assert.deepEqual(result.profile.currency, { cp: 7, sp: 2, ep: 1, gp: 4, pp: 1 });
  assert.equal(result.equipment[0].quantity, 3);
});

test('identical ordinary stacks merge while preserving metadata and input records', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, gp: 1 } };
  const entry = { id: 'owned-torch', characterId: profile.id, name: ' TORCH ', quantity: 2, unitWeightLb: 1, carried: true, consumable: true, category: 'Adventuring Gear', imageUrl: '/my-torch.png', relicCardId: null, source: { kind: 'manual', itemId: 'torch' } };
  const equipment = [entry];
  const result = purchaseEquipment({ profile, equipment, catalogItem: torch, quantity: 3 });
  assert.deepEqual(result.equipment, [{ ...entry, quantity: 5 }]);
  assert.equal(entry.quantity, 2);
  assert.equal(equipment[0], entry);
  assert.deepEqual(result.profile.currency, { cp: 7, sp: 4, ep: 1, gp: 0, pp: 0 });
});

test('relics and differently configured equipment stay separate from purchased goods', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, gp: 1 } };
  const base = { id: 'ordinary', characterId: profile.id, name: 'Torch', quantity: 1, unitWeightLb: 1, carried: true, consumable: true, category: 'Adventuring Gear', imageUrl: '', relicCardId: null, source: null };
  for (const patch of [{ relicCardId: 'relic' }, { carried: false }, { consumable: false }, { unitWeightLb: 7 }, { category: 'Custom' }, { characterId: 'other-character' }]) {
    const entry = { ...base, ...patch };
    const result = purchaseEquipment({ profile, equipment: [entry], catalogItem: torch, quantity: 2 });
    assert.equal(result.equipment.length, 2);
    assert.equal(result.equipment[0], entry);
    assert.equal(result.equipment[1].quantity, 2);
    assert.notEqual(result.equipment[1].id, entry.id);
  }
});

test('a purchase beyond the equipment quantity limit rejects before spending', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, gp: 1 } };
  const entry = { id: 'full-stack', characterId: profile.id, name: 'Torch', quantity: 999999, unitWeightLb: 1, carried: true, consumable: true, category: 'Adventuring Gear' };
  const before = structuredClone({ profile, equipment: [entry] });
  assert.throws(() => purchaseEquipment({ profile, equipment: [entry], catalogItem: torch, quantity: 1 }), /quantity/i);
  assert.deepEqual({ profile, equipment: [entry] }, before);
});

test('pure purchases allocate repeatable base IDs and the lowest unoccupied suffix', () => {
  const profile = { ...createPlayerProfile(), currency: { ...zeroWallet, gp: 1 } };
  const first = purchaseEquipment({ profile, equipment: [], catalogItem: torch, quantity: 1 });
  assert.equal(first.equipment[0].id, 'shop:torch');
  assert.deepEqual(purchaseEquipment({ profile, equipment: [], catalogItem: torch, quantity: 1 }), first);
  const occupied = [
    { ...first.equipment[0], unitWeightLb: 7 },
    { ...first.equipment[0], id: 'shop:torch:3', unitWeightLb: 9 },
  ];
  const second = purchaseEquipment({ profile, equipment: occupied, catalogItem: torch, quantity: 2 });
  assert.equal(second.equipment[2].id, 'shop:torch:2');
  assert.deepEqual(second.equipment.slice(0, 2), occupied);
  assert.deepEqual(purchaseEquipment({ profile, equipment: occupied, catalogItem: torch, quantity: 2 }), second);
});
