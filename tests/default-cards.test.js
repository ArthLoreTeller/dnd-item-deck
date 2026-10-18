import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import defaultCards from '../src/data/defaultCards.json' with { type: 'json' };
import { guidelineWeightLb } from '../src/data/equipment-weights.js';
import { relicEquipment } from '../src/data/player.js';

const normalBatch = {
  bloodletter_pen_001: { name: 'Bloodletter Pen', rarity: 'uncommon', weight: 0.1 },
  gamblers_coin_001: { name: 'Gambler’s Coin', rarity: 'common', weight: 0.02 },
  gloves_thievery_001: { name: 'Gloves of Thievery', rarity: 'uncommon', weight: 0.1 },
  iron_hand_001: { name: 'Iron Hand', rarity: 'common', weight: 2 },
  nanboku_no_rensa_001: { name: 'Nanboku no Rensa', rarity: 'uncommon', weight: 4 },
  invictus_001: { name: 'Invictus', rarity: 'rare', weight: 2 },
  jade_heart_spear_001: { name: 'Jade Heart Spear', rarity: 'uncommon', weight: 3 },
  wooden_axe_001: { name: 'Wooden Axe', rarity: 'common', weight: 2 },
  potion_invisibility_001: { name: 'Potion of Invisibility', rarity: 'rare', weight: 0.5 },
  potion_poison_001: { name: 'Potion of Poison', rarity: 'common', weight: 0.5 },
};

test('the first normal-item batch has complete card identities, artwork, and weights', () => {
  for (const [id, expected] of Object.entries(normalBatch)) {
    const card = defaultCards.find(item => item.id === id);
    assert.ok(card, `${expected.name} is missing`);
    assert.equal(card.name, expected.name);
    assert.equal(card.type, 'normal');
    assert.equal(card.rarity, expected.rarity);
    assert.equal(card.isAttuned, false);
    assert.ok(card.flavorText?.trim());
    assert.ok(card.abilities?.length, `${expected.name} needs at least one rules entry`);
    assert.match(card.images.base, /^\/assets\/items\/(weapons|armor|consumables|wondrous)\//);
    assert.ok(existsSync(join('public', card.images.base)), `${expected.name} artwork is missing`);
    assert.equal(guidelineWeightLb(id), expected.weight);
  }
});

test('2024 weapon baselines are retained on the homebrew bow, spear, and axe', () => {
  const invictus = defaultCards.find(card => card.id === 'invictus_001');
  assert.equal(invictus.specs.damage, '1d8');
  assert.equal(invictus.specs.damageType, 'Piercing');
  assert.equal(invictus.specs.ranges, '150/600 ft.');
  assert.match(invictus.specs.properties, /Heavy/);
  assert.match(invictus.specs.properties, /Slow/);

  const spear = defaultCards.find(card => card.id === 'jade_heart_spear_001');
  assert.equal(spear.specs.damage, '1d6 (1d8 two-handed)');
  assert.equal(spear.specs.ranges, '20/60 ft.');
  assert.match(spear.specs.properties, /Sap/);

  const axe = defaultCards.find(card => card.id === 'wooden_axe_001');
  assert.equal(axe.specs.damage, '1d6');
  assert.equal(axe.specs.damageType, 'Slashing');
  assert.equal(axe.specs.ranges, '20/60 ft.');
  assert.match(axe.specs.properties, /Vex/);
});

test('potions and protection talismans become consumable linked equipment', () => {
  for (const id of ['protection_001', 'protection_002', 'protection_003', 'protection_005', 'potion_invisibility_001', 'potion_poison_001']) {
    const card = defaultCards.find(item => item.id === id);
    assert.equal(card.consumable, true);
    assert.equal(relicEquipment(card, 'character').consumable, true);
  }
});
