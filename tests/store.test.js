import { test } from 'node:test';
import assert from 'node:assert/strict';
const saved = new Map();
globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
const { useCardStore: store } = await import('../src/store/useCardStore.js');

test('draw removes exactly the selected weighted card and keeps previous inventory', (t) => {
  t.mock.method(Math, 'random', () => 0.9);
  store.setState({ deck: [{ id: 'a', rarity: 'common' }, { id: 'b', rarity: 'legendary' }], inventory: [{ id: 'owned' }] });
  store.getState().drawRandomCard();
  assert.equal(store.getState().activeCard.id, 'a');
  assert.deepEqual(store.getState().deck.map(c => c.id), ['b']);
  assert.deepEqual(store.getState().inventory.map(c => c.id), ['a', 'owned']);
});
test('reset restores defaults, clears built-in edits, and preserves custom cards', () => {
  store.setState({ deck: [], inventory: [{ id: 'cleaver_001', isAttuned: true }, { id: 'custom-kept', rarity: 'rare', stats: { hit: '+7' } }] });
  store.getState().resetDeck();
  assert.equal(store.getState().deck.length, 11);
  assert.equal(store.getState().deck.find(c => c.id === 'cleaver_001').isAttuned, false);
  assert.deepEqual(store.getState().inventory.map(c => c.id), ['custom-kept']);
  assert.equal(store.getState().inventory[0].stats.hit, '+7');
});
test('rehydrating legacy storage preserves empty decks and edited stats', async () => {
  localStorage.setItem('dnd-item-deck-storage', JSON.stringify({ state: { deck: [], inventory: [{ id: 'wand_001', currentLevel: 3, stats: { hit: '+9' } }], activeCard: { id: 'wand_001', stats: { hit: '+9' } } }, version: 0 }));
  await store.persist.rehydrate();
  assert.equal(store.getState().deck.length, 0);
  assert.equal(store.getState().inventory[0].rarity, 'legendary');
  assert.equal(store.getState().inventory[0].stats.hit, '+9');
  assert.equal(store.getState().activeCard.rarity, 'legendary');
});
test('discard returns built-in cards unattuned and deletes custom cards without enlarging deck', () => {
  store.setState({ deck: [], inventory: [{ id: 'base', isAttuned: true }, { id: 'custom-delete' }], activeCard: { id: 'base' } });
  store.getState().discardCard('base');
  assert.equal(store.getState().deck[0].isAttuned, false);
  store.getState().discardCard('custom-delete');
  assert.equal(store.getState().deck.length, 1);
  assert.equal(store.getState().inventory.length, 0);
  assert.equal(store.getState().activeCard, null);
});
test('fourth attuned item is refused', () => {
  store.setState({ inventory: [1, 2, 3].map(id => ({ id, isAttuned: true })).concat({ id: 4, isAttuned: false }) });
  store.getState().updateCard(4, { isAttuned: true });
  assert.equal(store.getState().inventory[3].isAttuned, false);
});
