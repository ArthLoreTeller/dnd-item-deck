import { test } from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../src/data/defaultCards.json' with { type: 'json' };
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

test('discard and undo preserve edits without duplicating a built-in card', () => {
  const card = { id: 'wand_001', name: 'The Crimson Wand', type: 'progressive', isAttuned: true, stats: { hit: '+9' } };
  store.setState({ deck: [], inventory: [card], activeCard: card, discardedCustom: [], lastDiscard: null });
  store.getState().discardCard(card.id);
  store.getState().undoDiscard();
  assert.equal(store.getState().deck.length, 0);
  assert.equal(store.getState().inventory[0].stats.hit, '+9');
  assert.equal(store.getState().inventory[0].isAttuned, true);
  store.getState().undoDiscard();
  assert.equal(store.getState().inventory.length, 1);
});

test('custom cards remain recoverable after reload and restore respects attunement limit', async () => {
  const custom = { id: 'custom-recover', name: 'Recover me', type: 'standard', isAttuned: true, stats: { hit: '+8' } };
  store.setState({ deck: [], inventory: [custom], activeCard: custom, discardedCustom: [], lastDiscard: null });
  store.getState().discardCard(custom.id);
  await store.persist.rehydrate();
  assert.equal(store.getState().discardedCustom[0].stats.hit, '+8');
  store.setState({ inventory: [1, 2, 3].map(id => ({ id, isAttuned: true })) });
  store.getState().restoreCustomCard(custom.id);
  assert.equal(store.getState().inventory[0].id, custom.id);
  assert.equal(store.getState().inventory[0].isAttuned, false);
  assert.equal(store.getState().discardedCustom.length, 0);
});

test('undo does not duplicate a card that has already been drawn again', () => {
  const card = { id: 'kunai_01', name: 'Kunai', type: 'normal' };
  store.setState({ deck: [], inventory: [card], discardedCustom: [], lastDiscard: null });
  store.getState().discardCard(card.id);
  store.getState().drawCardById(card.id);
  store.getState().undoDiscard();
  assert.equal(store.getState().inventory.length, 1);
  assert.equal(store.getState().deck.length, 0);
});

test('backup roundtrip preserves custom cards and merge keeps current edits', () => {
  const existing = { id: 'wand_001', name: 'The Crimson Wand', type: 'progressive', stats: { hit: '+9' } };
  const imported = { id: 'custom-import', name: 'Imported relic', type: 'normal', abilities: [{ title: 'Glow', description: 'A small light.' }] };
  store.setState({ deck: [], inventory: [existing, imported], discardedCustom: [], activeCard: existing });
  const backup = store.getState().exportBackup();
  store.setState({ inventory: [{ ...existing, stats: { hit: '+12' } }], discardedCustom: [] });
  const result = store.getState().importBackup(backup);
  assert.equal(result.added, 1);
  assert.equal(store.getState().inventory.find(c => c.id === existing.id).stats.hit, '+12');
  assert.equal(store.getState().inventory.find(c => c.id === imported.id).abilities[0].title, 'Glow');
  assert.equal(store.getState().deck.some(c => c.id === imported.id), false);
});

test('malformed imports do not mutate inventory or introduce invalid card shapes', () => {
  const original = [{ id: 'custom-safe', name: 'Keep me', type: 'normal' }];
  store.setState({ inventory: original, discardedCustom: [] });
  for (const payload of ['not json', '{"format":"reliquary-backup","version":99}', JSON.stringify({ format: 'reliquary-backup', version: 1, deck: [], inventory: [{ id: 'custom-bad', name: 'Bad', type: 'normal', abilities: 'broken' }], discardedCustom: [] })]) {
    assert.throws(() => store.getState().importBackup(payload));
    assert.deepEqual(store.getState().inventory, original);
  }
});

test('progress controls use the configured threshold and clamp invalid values', () => {
  const card = { id: 'custom-progress', name: 'Growing relic', type: 'progressive', maxProgress: 5, progress: { level1: 0, level2: 0 } };
  store.setState({ inventory: [card], activeCard: card });
  store.getState().updateProgress(card.id, 1, 5);
  assert.equal(store.getState().activeCard.currentLevel, 2);
  store.getState().updateProgress(card.id, 2, 999);
  assert.equal(store.getState().activeCard.progress.level2, 5);
  assert.equal(store.getState().activeCard.currentLevel, 3);
  store.getState().updateProgress(card.id, 1, -3);
  assert.equal(store.getState().activeCard.currentLevel, 1);
  store.getState().updateProgress(card.id, 1, NaN);
  assert.equal(store.getState().activeCard.progress.level1, 0);
});

test('import preserves legacy progression and rejects duplicate or misplaced IDs atomically', () => {
  const backup = { format: 'reliquary-backup', version: 1, deck: [], inventory: [{ id: 'wand_001', name: 'The Crimson Wand', type: 'progressive', currentLevel: 3 }], discardedCustom: [] };
  store.setState({ inventory: [], deck: [], discardedCustom: [] });
  store.getState().importBackup(JSON.stringify(backup));
  assert.equal(store.getState().inventory[0].currentLevel, 3);
  assert.deepEqual(store.getState().inventory[0].progress, { level1: 20, level2: 20 });
  const before = store.getState().inventory;
  assert.throws(() => store.getState().importBackup(JSON.stringify({ ...backup, inventory: [backup.inventory[0], backup.inventory[0]] })));
  assert.throws(() => store.getState().importBackup(JSON.stringify({ ...backup, inventory: [], deck: [{ id: 'custom-deck', name: 'Wrong place', type: 'normal' }] })));
  assert.deepEqual(store.getState().inventory, before);
});

test('import keeps current edits when cards move from deck or recovery into inventory', () => {
  const builtin = { id: 'wand_001', name: 'The Crimson Wand', type: 'progressive', stats: { hit: '+12' } };
  const custom = { id: 'custom-cross-collection', name: 'Current name', type: 'standard', stats: { damage: '5d8' } };
  const backup = { format: 'reliquary-backup', version: 1, deck: [], inventory: [{ ...builtin, stats: { hit: '+1' } }, { ...custom, name: 'Old name', stats: { damage: '1d8' } }], discardedCustom: [] };
  store.setState({ deck: [builtin], inventory: [], discardedCustom: [custom], activeCard: null });
  store.getState().importBackup(JSON.stringify(backup));
  assert.equal(store.getState().inventory.find(c => c.id === builtin.id).stats.hit, '+12');
  assert.equal(store.getState().inventory.find(c => c.id === custom.id).name, 'Current name');
  assert.equal(store.getState().inventory.find(c => c.id === custom.id).stats.damage, '5d8');
  assert.equal(store.getState().deck.length, 0);
  assert.equal(store.getState().discardedCustom.length, 0);
});

test('fresh device imports backed-up edits instead of preferring untouched default deck cards', () => {
  const wand = defaults.find(card => card.id === 'wand_001');
  const restored = { ...wand, isAttuned: true, stats: { ...wand.stats, hit: '+11' }, currentLevel: 3, progress: { level1: 20, level2: 20 } };
  const text = JSON.stringify({ format: 'reliquary-backup', version: 1, inventory: [restored], deck: defaults.filter(card => card.id !== wand.id), discardedCustom: [] });
  store.setState({ inventory: [], deck: defaults, discardedCustom: [], activeCard: null });
  store.getState().importBackup(text);
  store.getState().importBackup(text);
  assert.equal(store.getState().inventory.length, 1);
  assert.equal(store.getState().inventory[0].stats.hit, '+11');
  assert.equal(store.getState().inventory[0].currentLevel, 3);
  assert.equal(store.getState().inventory[0].isAttuned, true);
  assert.equal(store.getState().deck.length, defaults.length - 1);
});
