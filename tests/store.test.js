import { test } from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../src/data/defaultCards.json' with { type: 'json' };
import { createPlayerProfile } from '../src/data/player.js';
const saved = new Map();
globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
const { useCardStore: store } = await import('../src/store/useCardStore.js');

test('consume decrements one unit and Undo restores the exact equipment snapshot', () => {
  store.setState({ equipment: [], inventory: [], relicEquipmentCache: {}, lastConsumption: null });
  store.getState().addEquipment({ name: 'Potion', quantity: 3, unitWeightLb: 0.5, carried: true, consumable: true, category: 'Supplies', imageUrl: '/potion.png', source: null });
  const original = structuredClone(store.getState().equipment[0]);
  const profile = store.getState().profile;
  const inventory = store.getState().inventory;
  store.getState().consumeEquipment(original.id);
  assert.deepEqual(store.getState().equipment[0], { ...original, quantity: 2 });
  assert.equal(store.getState().profile, profile);
  assert.equal(store.getState().inventory, inventory);
  assert.equal(store.getState().lastConsumption.entry.id, original.id);
  store.getState().updateEquipment(original.id, { name: 'Edited later', unitWeightLb: 7 });
  store.getState().undoConsume();
  assert.deepEqual(store.getState().equipment, [original]);
  assert.equal(store.getState().lastConsumption, null);
  store.getState().undoConsume();
  assert.deepEqual(store.getState().equipment, [original]);
});

test('consume quantity one removes equipment and Undo restores its original position', () => {
  store.setState({ equipment: [], inventory: [], relicEquipmentCache: {}, lastConsumption: null });
  for (const name of ['Rope', 'Potion', 'Torch']) store.getState().addEquipment({ name, quantity: 1, unitWeightLb: null, carried: false, consumable: name === 'Potion' });
  const original = structuredClone(store.getState().equipment);
  store.getState().consumeEquipment(original[1].id);
  assert.deepEqual(store.getState().equipment, [original[0], original[2]]);
  store.getState().undoConsume();
  assert.deepEqual(store.getState().equipment, original);
});

test('invalid or non-consumable targets leave domain state and pending Undo unchanged', () => {
  store.setState({ equipment: [], inventory: [], relicEquipmentCache: {}, lastConsumption: null });
  store.getState().addEquipment({ name: 'Potion', quantity: 2, unitWeightLb: 1, carried: true, consumable: true });
  store.getState().addEquipment({ name: 'Rope', quantity: 1, unitWeightLb: 10, carried: true });
  store.getState().consumeEquipment(store.getState().equipment[0].id);
  const before = store.getState();
  for (const id of ['missing', undefined, before.equipment[1].id]) {
    store.getState().consumeEquipment(id);
    const after = store.getState();
    for (const key of ['equipment', 'inventory', 'profile', 'lastConsumption', 'deck', 'discardedCustom', 'relicEquipmentCache']) assert.equal(after[key], before[key]);
    assert.equal(typeof after.toastMessage, 'string');
    assert.ok(after.toastMessage.length < 100);
  }
});

test('only the latest consumption can be undone', () => {
  store.setState({ equipment: [], inventory: [], relicEquipmentCache: {}, lastConsumption: null });
  for (const name of ['Potion', 'Ration']) store.getState().addEquipment({ name, quantity: 3, unitWeightLb: 1, carried: true, consumable: true });
  const [potion, ration] = store.getState().equipment;
  store.getState().consumeEquipment(potion.id);
  store.getState().consumeEquipment(ration.id);
  store.getState().undoConsume();
  assert.deepEqual(store.getState().equipment.map(entry => entry.quantity), [2, 3]);
});

test('consuming a linked relic removes ownership atomically and Undo restores exact records', () => {
  for (const id of ['base-consumable', 'custom-consumable']) {
    const card = { id, name: 'Relic potion', rarity: 'common', isAttuned: true, progress: { level1: 2, level2: 0 }, stats: { hit: '+9' } };
    const sibling = { id: 'sibling', name: 'Keep me', rarity: 'rare' };
    store.setState({ deck: [], inventory: [], equipment: [], relicEquipmentCache: {}, discardedCustom: [], lastConsumption: null, lastDiscard: null, activeCard: null });
    store.getState().addToInventory(sibling);
    store.getState().addToInventory(card);
    const entry = store.getState().equipment.find(item => item.relicCardId === id);
    store.getState().updateEquipment(entry.id, { consumable: true, carried: false, unitWeightLb: 0.5 });
    const original = structuredClone({ equipment: store.getState().equipment, inventory: store.getState().inventory, activeCard: store.getState().activeCard });
    store.getState().consumeEquipment(entry.id);
    assert.deepEqual(store.getState().inventory.map(item => item.id), ['sibling']);
    assert.deepEqual(store.getState().equipment.map(item => item.relicCardId), ['sibling']);
    assert.equal(store.getState().activeCard.id, 'sibling');
    assert.deepEqual(store.getState().deck, []);
    assert.deepEqual(store.getState().discardedCustom, []);
    assert.equal(store.getState().lastDiscard, null);
    store.getState().undoConsume();
    assert.deepEqual(store.getState().equipment, original.equipment);
    assert.deepEqual(store.getState().inventory, original.inventory);
    assert.deepEqual(store.getState().activeCard, original.activeCard);
  }
});

test('version three storage upgrades spells and consumables once without changing player or relic edits', async () => {
  const profile = { ...createPlayerProfile(), name: 'Legacy hero', notes: 'Old journal', currency: { cp: 12, sp: 2, ep: null, gp: 100, pp: 0 }, capacityOverrideLb: 150, capacityOverrideReason: 'Pack' };
  delete profile.sheet.learnedSpellIds;
  profile.sheet.spells = [{ name: 'MAGIC-MISSILE', level: 1, prepared: true, concentration: false, notes: '' }, { name: 'Custom Ward', level: 2, prepared: true, concentration: true, notes: 'Keep' }];
  const card = { ...defaults[0], stats: { hit: '+9' } };
  const entry = { id: `relic:${card.id}`, characterId: profile.id, name: card.name, quantity: 1, unitWeightLb: null, carried: false, category: 'Relic', imageUrl: '', relicCardId: card.id, source: null };
  localStorage.setItem('dnd-item-deck-storage', JSON.stringify({ version: 3, state: { profile, equipment: [entry], relicEquipmentCache: { [card.id]: entry }, inventory: [card], deck: [], discardedCustom: [] } }));
  await store.persist.rehydrate();
  const state = store.getState();
  assert.deepEqual(state.profile.sheet.learnedSpellIds, ['magic-missile']);
  assert.deepEqual(state.profile.sheet.spells, [profile.sheet.spells[1]]);
  for (const key of ['name', 'notes', 'currency', 'capacityOverrideLb', 'capacityOverrideReason']) assert.deepEqual(state.profile[key], profile[key]);
  assert.deepEqual(state.equipment[0], { ...entry, consumable: false });
  assert.deepEqual(state.relicEquipmentCache[card.id], { ...entry, consumable: false });
  assert.equal(state.inventory[0].stats.hit, '+9');
  assert.equal(JSON.parse(localStorage.getItem('dnd-item-deck-storage')).version, 4);
  store.getState().updateProfile({ sheet: { ...state.profile.sheet, learnedSpellIds: [] } });
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().profile.sheet.learnedSpellIds, []);
});

test('backup import respects an existing learned spell selection and persists consumables', () => {
  const profile = createPlayerProfile();
  profile.sheet.learnedSpellIds = ['shield'];
  store.setState({ profile, inventory: [], deck: [], equipment: [], discardedCustom: [], relicEquipmentCache: {} });
  const imported = createPlayerProfile();
  imported.sheet.learnedSpellIds = ['magic-missile'];
  store.getState().importBackup(JSON.stringify({ format: 'reliquary-backup', version: 3, profile: imported, equipment: [{ id: 'potion', characterId: imported.id, name: 'Potion', quantity: 2, unitWeightLb: 0.5, carried: true, consumable: true }], inventory: [], deck: [] }));
  assert.deepEqual(store.getState().profile.sheet.learnedSpellIds, ['shield']);
  assert.equal(store.getState().equipment[0].consumable, true);
});

test('linked equipment survives discard, reload, redraw and reset', async () => {
  store.setState({ deck: [defaults[0]], inventory: [], equipment: [], relicEquipmentCache: {} });
  store.getState().drawCardById(defaults[0].id);
  const entry = store.getState().equipment[0];
  assert.equal(entry.relicCardId, defaults[0].id);
  store.getState().updateEquipment(entry.id, { unitWeightLb: 4, carried: false });
  store.getState().discardCard(defaults[0].id);
  assert.equal(store.getState().equipment.length, 0);
  await store.persist.rehydrate();
  store.getState().drawCardById(defaults[0].id);
  assert.equal(store.getState().equipment[0].unitWeightLb, 4);
  assert.equal(store.getState().equipment[0].carried, false);
  store.getState().addEquipment({ name: 'Rope', quantity: 2, unitWeightLb: 10, carried: true });
  store.getState().resetDeck();
  assert.deepEqual(store.getState().equipment.map(e => e.name), ['Rope']);
  const rope = store.getState().equipment[0];
  store.getState().removeEquipment(rope.id);
  store.getState().undoEquipmentRemoval();
  assert.equal(store.getState().equipment[0].quantity, 2);
});

test('old backups preserve player data; new backups fill missing values and equipment', () => {
  const originalProfile = store.getState().profile;
  store.setState({ inventory: [], deck: [], equipment: [], discardedCustom: [], relicEquipmentCache: {} });
  store.getState().updateProfile({ name: 'Manual hero', abilities: { ...originalProfile.abilities, str: 12 } });
  store.getState().addEquipment({ name: 'Rope', quantity: 1, unitWeightLb: null, carried: true });
  const backup = store.getState().exportBackup();
  const profile = store.getState().profile;
  const equipment = store.getState().equipment;
  store.getState().importBackup(JSON.stringify({ format: 'reliquary-backup', version: 1, deck: [], inventory: [] }));
  assert.deepEqual(store.getState().profile, profile);
  assert.deepEqual(store.getState().equipment, equipment);
  store.setState({ profile: { ...originalProfile, name: '', abilities: { ...originalProfile.abilities, str: null } }, equipment: [] });
  store.getState().importBackup(backup);
  assert.equal(store.getState().profile.name, 'Manual hero');
  assert.equal(store.getState().profile.abilities.str, 12);
  assert.equal(store.getState().equipment[0].unitWeightLb, null);
  store.getState().importBackup(backup);
  assert.equal(store.getState().equipment.length, 1);
});

test('importing an older backup cannot overwrite current dormant relic weight edits', () => {
  store.setState({ inventory: [], deck: [defaults[0]], equipment: [], discardedCustom: [], relicEquipmentCache: {} });
  store.getState().drawCardById(defaults[0].id);
  const id = store.getState().equipment[0].id;
  store.getState().updateEquipment(id, { unitWeightLb: 2, carried: true });
  const oldBackup = store.getState().exportBackup();
  store.getState().updateEquipment(id, { unitWeightLb: 7, carried: false });
  store.getState().discardCard(defaults[0].id);
  store.getState().importBackup(oldBackup);
  assert.equal(store.getState().equipment[0].unitWeightLb, 7);
  assert.equal(store.getState().equipment[0].carried, false);
});

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
