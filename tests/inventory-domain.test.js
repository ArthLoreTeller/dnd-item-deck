import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStack, groupInventory, inventoryStackKey } from '../src/data/inventory.js';

const equipment = (id, patch = {}) => ({ id, name: 'Potion', quantity: 1, consumable: true, relicCardId: null, ...patch });
const relic = (id, patch = {}) => equipment(`relic:${id}`, { relicCardId: id, ...patch });

test('only common and uncommon items may stack', () => {
  for (const rarity of ['common', 'Common', 'uncommon', 'Uncommon']) assert.equal(canStack({ rarity }), true);
  for (const rarity of ['rare', 'epic', 'legendary', 'unknown']) assert.equal(canStack({ rarity }), false);
  assert.equal(canStack(equipment('gear')), true);
});

test('stack keys normalize trimmed names and rarity without collisions', () => {
  assert.equal(inventoryStackKey({ name: ' Potion ', rarity: 'Common' }), inventoryStackKey({ name: 'pOtIoN', rarity: 'common' }));
  assert.notEqual(inventoryStackKey({ name: 'Potion', rarity: 'common' }), inventoryStackKey({ name: 'Potion', rarity: 'uncommon' }));
  assert.notEqual(inventoryStackKey({ name: 'a|b', rarity: 'common' }), inventoryStackKey({ name: 'a', rarity: 'b|common' }));
});

test('ordinary equipment groups quantities without modifying source records', () => {
  const first = equipment('a', { name: ' Potion ', quantity: 2 });
  const second = equipment('b', { name: 'POTION', quantity: 3 });
  const input = [first, second];
  const groups = groupInventory(input, []);
  assert.equal(groups.length, 1);
  const [{ key, ...group }] = groups;
  assert.equal(typeof key, 'string');
  assert.deepEqual(group, { name: 'Potion', rarity: 'common', quantity: 5, entries: [first, second], stacked: true, consumable: true });
  assert.equal(groups[0].entries[0], first);
  assert.deepEqual(input.map(entry => entry.quantity), [2, 3]);
  assert.deepEqual(groupInventory([], []), []);
});

test('same-name relics stack only with matching rarity and card state', () => {
  const entries = ['a', 'b', 'c'].map(id => relic(id));
  const cards = [
    { id: 'a', name: ' Potion ', rarity: 'common', isAttuned: false, stats: { hit: '+1', damage: '1d4' } },
    { id: 'b', name: 'POTION', rarity: 'common', stats: { damage: '1d4', hit: '+1' }, isAttuned: false },
    { id: 'c', name: 'Potion', rarity: 'uncommon', isAttuned: false, stats: { hit: '+1', damage: '1d4' } },
  ];
  const groups = groupInventory(entries, cards);
  assert.deepEqual(groups.map(group => [group.rarity, group.quantity, group.entries.map(entry => entry.id)]), [
    ['common', 2, ['relic:a', 'relic:b']], ['uncommon', 1, ['relic:c']],
  ]);
  assert.equal(entries.length, 3);
  assert.equal(cards.length, 3);
});

test('attunement progression and card-specific edits split relic groups', () => {
  const base = { name: 'Potion', rarity: 'uncommon', isAttuned: false, currentLevel: 1, progress: { level1: 0, level2: 0 }, stats: { hit: '+1' } };
  const cards = [
    { id: 'a', ...base },
    { id: 'b', ...base, isAttuned: true },
    { id: 'c', ...base, currentLevel: 2 },
    { id: 'd', ...base, progress: { level1: 1, level2: 0 } },
    { id: 'e', ...base, stats: { hit: '+2' } },
  ];
  const groups = groupInventory(cards.map(card => relic(card.id)), cards);
  assert.equal(groups.length, 5);
  assert.equal(new Set(groups.map(group => group.key)).size, 5);
  assert.ok(groups.every(group => group.quantity === 1 && !group.stacked));
});

test('higher-rarity duplicates remain separate and keys stay stable', () => {
  for (const rarity of ['rare', 'epic', 'legendary']) {
    const entries = [relic('a'), relic('b')];
    const cards = ['a', 'b'].map(id => ({ id, name: 'Potion', rarity }));
    const groups = groupInventory(entries, cards);
    assert.equal(groups.length, 2);
    assert.ok(groups.every(group => !group.stacked));
    assert.notEqual(groups[0].key, groups[1].key);
    assert.equal(groups[0].key, groupInventory(entries.slice(0, 1), cards)[0].key);
  }
});

test('consumables do not share a group with non-consumables or unresolved relics', () => {
  const groups = groupInventory([equipment('a'), equipment('b', { consumable: false }), relic('missing')], []);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(group => group.consumable), [true, false, true]);
});
