import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseWeightedCard, normalizeCard } from '../src/data/rarity.js';

test('rarity weights determine selection rather than uniform index', () => {
  const deck = [{ id: 'common', rarity: 'common' }, { id: 'legendary', rarity: 'legendary' }];
  assert.equal(chooseWeightedCard(deck, 0.9).id, 'common');
  assert.equal(chooseWeightedCard(deck, 0.999).id, 'legendary');
});
test('empty decks return no card and exhausted rarities do not prevent draws', () => {
  assert.equal(chooseWeightedCard([], 0.5), null);
  assert.equal(chooseWeightedCard([{ id: 'only', rarity: 'epic' }], 0.5).id, 'only');
});
test('old saves gain rarity without losing player edits', () => {
  const old = { id: 'wand_001', stats: { hit: '+9' }, currentLevel: 3 };
  assert.equal(normalizeCard(old).rarity, 'legendary');
  assert.deepEqual(normalizeCard(old).stats, old.stats);
  assert.equal(normalizeCard({ id: 'custom-old' }).rarity, 'common');
});
test('invalid rarity falls back safely', () => {
  assert.equal(normalizeCard({ id: 'unknown', rarity: 'bogus' }).rarity, 'common');
});
