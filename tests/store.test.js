import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCardStore } from '../src/store/useCardStore.js';
import { CARD_STORAGE_KEY } from '../src/store/cardStorage.js';

function fixture(initial, options = {}) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  if (initial) storage.setItem(CARD_STORAGE_KEY, JSON.stringify({ state: initial, version: 0 }));
  const open = () => createCardStore({ storage: () => storage, ...options });
  return { store: open(), open, storage, values };
}

test('random draw moves exactly the weighted card and retains previous inventory', async t => {
  t.mock.method(Math, 'random', () => 0.9);
  const { store } = fixture({ deck: [{ id: 'a', rarity: 'common' }, { id: 'b', rarity: 'legendary' }], inventory: [{ id: 'owned' }] });
  assert.equal((await store.getState().drawRandomCard()).id, 'a');
  assert.deepEqual(store.getState().deck.map(c => c.id), ['b']);
  assert.deepEqual(store.getState().inventory.map(c => c.id), ['a', 'owned']);
});

test('reset restores defaults, clears built-in edits, and preserves custom cards', async () => {
  const { store } = fixture({ deck: [], inventory: [{ id: 'cleaver_001', isAttuned: true }, { id: 'custom-kept', rarity: 'rare', stats: { hit: '+7' } }] });
  assert.ok(await store.getState().resetDeck());
  assert.equal(store.getState().deck.length, 11);
  assert.equal(store.getState().deck.find(c => c.id === 'cleaver_001').isAttuned, false);
  assert.deepEqual(store.getState().inventory.map(c => c.id), ['custom-kept']);
  assert.equal(store.getState().inventory[0].stats.hit, '+7');
});

test('legacy saves preserve empty decks and edits, with selection resolved from inventory', () => {
  const { store } = fixture({ deck: [], inventory: [{ id: 'wand_001', currentLevel: 3, stats: { hit: '+9' } }], activeCard: { id: 'wand_001' } });
  assert.equal(store.getState().deck.length, 0);
  assert.equal(store.getState().inventory[0].rarity, 'legendary');
  assert.equal(store.getState().inventory[0].stats.hit, '+9');
  assert.equal(store.getState().activeCard, store.getState().inventory[0]);
});

test('discard returns standard cards unattuned and deletes custom cards without enlarging deck', async () => {
  const { store } = fixture({ deck: [], inventory: [{ id: 'base', isAttuned: true }, { id: 'custom-delete' }], activeCard: { id: 'base' } });
  await store.getState().discardCard('base');
  assert.equal(store.getState().deck[0].isAttuned, false);
  await store.getState().discardCard('custom-delete');
  assert.equal(store.getState().deck.length, 1);
  assert.equal(store.getState().inventory.length, 0);
  assert.equal(store.getState().activeCard, null);
});

test('fourth attuned item is refused', async () => {
  const { store } = fixture({ deck: [], inventory: ['1', '2', '3'].map(id => ({ id, isAttuned: true })).concat({ id: '4', isAttuned: false }) });
  assert.equal(await store.getState().updateCard('4', { isAttuned: true }), null);
  assert.equal(store.getState().inventory[3].isAttuned, false);
});

test('independent tabs serialize concurrent draws, keep custom cards and never save toast or selection', async () => {
  let queue = Promise.resolve();
  const locks = { request(_key, action) { queue = queue.then(action); return queue; } };
  const { store, open, storage } = fixture({ deck: [{ id: 'a' }], inventory: [] }, { locks });
  const second = open();
  const [custom, firstDraw, otherDraw] = await Promise.all([
    store.getState().addToInventory({ id: 'custom-kept', name: 'Kept' }),
    second.getState().drawCardById('a'), store.getState().drawCardById('a'),
  ]);
  assert.equal(custom.id, 'custom-kept');
  assert.equal(firstDraw.id, 'a');
  assert.equal(otherDraw, null);
  const raw = storage.getItem(CARD_STORAGE_KEY);
  store.getState().clearToast();
  store.getState().setActiveCard(custom);
  assert.equal(storage.getItem(CARD_STORAGE_KEY), raw);
  const saved = JSON.parse(raw).state;
  assert.deepEqual(Object.keys(saved).sort(), ['deck', 'inventory']);
  assert.deepEqual(saved.deck, []);
  assert.deepEqual(saved.inventory.map(row => row.id), ['a', 'custom-kept']);
});

test('unreadable and future saves remain untouched after ordinary actions', async () => {
  const { storage, open } = fixture();
  for (const raw of ['[broken', '{"state":{"deck":true}}', '{"state":{"deck":[],"inventory":[]},"version":99}']) {
    storage.setItem(CARD_STORAGE_KEY, raw);
    const store = open();
    assert.match(store.getState().storageNotice, /preserve/);
    assert.equal(await store.getState().resetDeck(), null);
    assert.equal(storage.getItem(CARD_STORAGE_KEY), raw);
  }
});

test('salvages valid records, ignores saved actions and preserves the exact original before writing', async () => {
  const { storage, store, values } = fixture({ deck: [null, { id: 'custom-one' }, { id: 'wand_001' }], inventory: [{ id: 'custom-one', name: 'One', abilities: [null, { title: 'Real' }] }], drawRandomCard: false });
  const raw = storage.getItem(CARD_STORAGE_KEY);
  assert.match(store.getState().storageNotice, /invalid/);
  assert.deepEqual(store.getState().inventory[0].abilities, [{ title: 'Real' }]);
  assert.deepEqual(store.getState().deck.map(card => card.id), ['wand_001']);
  assert.equal((await store.getState().drawRandomCard()).id, 'wand_001');
  assert.ok([...values].some(([key, value]) => key.startsWith(CARD_STORAGE_KEY + '-recovery-') && value === raw));
});

test('quota failure leaves disk and memory unchanged; retry saves a single card and its stat', async () => {
  const { storage, store } = fixture({ deck: [], inventory: [] });
  const raw = storage.getItem(CARD_STORAGE_KEY);
  const write = storage.setItem;
  const fail = () => { throw new DOMException('full', 'QuotaExceededError'); };
  storage.setItem = fail;
  const card = { id: 'custom-one', name: 'One', stats: { damage: '1d4' } };
  assert.equal(await store.getState().addToInventory(card), null);
  assert.match(store.getState().storageNotice, /could not be saved/);
  assert.equal(store.getState().toastMessage, null);
  assert.deepEqual(store.getState().inventory, []);
  assert.equal(storage.getItem(CARD_STORAGE_KEY), raw);
  storage.setItem = write;
  assert.ok(await store.getState().addToInventory(card));
  storage.setItem = fail;
  assert.equal(await store.getState().updateCard(card.id, { stats: { hit: '+2' } }), null);
  assert.deepEqual(store.getState().inventory[0].stats, { damage: '1d4' });
  storage.setItem = write;
  assert.ok(await store.getState().updateCard(card.id, { stats: { hit: '+2' } }));
  const saved = JSON.parse(storage.getItem(CARD_STORAGE_KEY)).state.inventory;
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].stats, { damage: '1d4', hit: '+2' });
});

test('an unavailable storage provider cannot claim a successful addition', async () => {
  const store = createCardStore({ storage() { throw new Error('denied'); } });
  assert.equal(await store.getState().addToInventory({ id: 'custom-one' }), null);
  assert.equal(store.getState().inventory.length, 0);
  assert.match(store.getState().storageNotice, /could not be saved/);
});

test('progress edits merge across tabs and respect the saved threshold', async () => {
  const { store, open } = fixture({ deck: [], inventory: [
    { id: 'custom-progress', type: 'progressive', maxProgress: 10, progress: { level1: 0, level2: 0 } },
  ] });
  const second = open();
  await store.getState().updateCard('custom-progress', { progress: { level1: 10 } });
  await second.getState().updateCard('custom-progress', { progress: { level2: 10 } });
  assert.equal(second.getState().inventory[0].currentLevel, 3);
  await store.getState().updateCard('custom-progress', { progress: { level1: 9 } });
  assert.equal(store.getState().inventory[0].currentLevel, 1);
  assert.equal(store.getState().inventory[0].progress.level2, 10);
});
