import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { rolldown } from 'rolldown';
import { createPlayerProfile } from '../src/data/player.js';
import { parseBackup } from '../src/data/backup.js';
import { SRD_EQUIPMENT } from '../src/data/srd/equipment.js';

const saved = new Map();
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
const { useCardStore: store } = await import('../src/store/useCardStore.js');
const storeUrl = pathToFileURL(join(process.cwd(), 'src/store/useCardStore.js')).href;
const bundle = await rolldown({ input: 'src/components/EquipmentEditor.jsx', plugins: [{ name: 'equipment-editor-test-dependencies', resolveId(id, importer) {
  if (id.endsWith('/store/useCardStore')) return 'equipment-editor-test-store';
  if (id.endsWith('/hooks/useDialogFocus')) return 'equipment-editor-test-focus';
  if (id === 'react' && importer?.endsWith('EquipmentEditor.jsx')) return 'equipment-editor-test-hooks';
  if (id.startsWith('file:')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'equipment-editor-test-store') return `export { useCardStore } from '${storeUrl}';`;
  // Adapt only local hooks and DOM focus: events use the real store, validation,
  // persistence and consume actions. There is no DOM runtime in this project.
  if (id === 'equipment-editor-test-focus') return 'export const useDialogFocus = () => {};';
  if (id === 'equipment-editor-test-hooks') return `const state = []; let cursor = 0; globalThis.equipmentEditorTestHooks = { reset: () => { state.length = 0; cursor = 0; }, begin: () => { cursor = 0; } }; export function useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } export const useRef = () => ({ current: null });`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-equipment-editor-'));
let EquipmentEditor;
try {
  const modulePath = join(directory, 'editor.mjs');
  await writeFile(modulePath, output.output[0].code);
  ({ EquipmentEditor } = await import(pathToFileURL(modulePath).href));
} finally { await rm(directory, { recursive: true }); }

function elements(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}
function editor(equipment = null) {
  globalThis.equipmentEditorTestHooks.reset();
  const tree = () => { globalThis.equipmentEditorTestHooks.begin(); return EquipmentEditor({ equipment, onClose() {} }); };
  const input = label => elements(elements(tree()).find(node => node.type === 'label' && React.Children.toArray(node.props.children).some(child => typeof child === 'string' && child.trim() === label))).find(node => ['input', 'select'].includes(node.type));
  return { tree, input, save: () => elements(tree()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) };
}
function fixture() {
  store.setState({ profile: createPlayerProfile(), equipment: [], inventory: [], deck: [], discardedCustom: [], relicEquipmentCache: {}, lastConsumption: null });
}

test('every purchased SRD category renders as the selected equipment option', () => {
  for (const category of new Set(SRD_EQUIPMENT.map(item => item.category))) {
    fixture();
    store.getState().updateProfile({ currency: { ...store.getState().profile.currency, gp: 1000000 } });
    const item = SRD_EQUIPMENT.find(entry => entry.category === category);
    assert.equal(store.getState().purchaseItem(item.id).ok, true);
    const edit = editor(store.getState().equipment[0]);
    assert.equal(edit.input('Category').props.value, category);
    assert.ok(renderToStaticMarkup(edit.tree()).includes(`<option selected="">${category}</option>`), `${category} must be visibly selected`);
  }
});

test('purchased category survives unrelated edits and can be changed through the selector', async () => {
  fixture();
  store.getState().updateProfile({ currency: { ...store.getState().profile.currency, gp: 10 } });
  assert.equal(store.getState().purchaseItem('backpack').ok, true);
  const edit = editor(store.getState().equipment[0]);
  assert.match(renderToStaticMarkup(edit.tree()), /<option selected="">Adventuring Gear<\/option>/);
  edit.input('Name').props.onChange({ target: { value: 'Travel backpack' } });
  edit.save();
  assert.equal(store.getState().equipment[0].category, 'Adventuring Gear');
  edit.input('Category').props.onChange({ target: { value: 'Treasure' } });
  assert.match(renderToStaticMarkup(edit.tree()), /<option selected="">Treasure<\/option>/);
  edit.save();
  await store.persist.rehydrate();
  assert.equal(store.getState().equipment[0].category, 'Treasure');
  assert.equal(store.getState().equipment[0].name, 'Travel backpack');
});

test('existing custom categories stay visibly selected alongside the original choices', () => {
  fixture();
  store.getState().addEquipment({ name: 'Survey kit', quantity: 1, unitWeightLb: null, carried: true, category: 'Expedition Supplies', imageUrl: '' });
  const edit = editor(store.getState().equipment[0]);
  const html = renderToStaticMarkup(edit.tree());
  assert.match(html, /<option selected="">Expedition Supplies<\/option>/);
  for (const category of ['Gear', 'Weapon', 'Armor', 'Consumable', 'Treasure']) assert.ok(html.includes(`>${category}</option>`));
  edit.save();
  assert.equal(store.getState().equipment[0].category, 'Expedition Supplies');
  edit.input('Category').props.onChange({ target: { value: 'x'.repeat(501) } });
  edit.save();
  assert.match(renderToStaticMarkup(edit.tree()), /role="alert"/);
  assert.equal(store.getState().equipment[0].category, 'Expedition Supplies');
});

test('custom equipment can be marked consumable in the editor, persisted, edited and consumed', async () => {
  fixture();
  const create = editor();
  assert.ok(create.input('Consumable'), 'The editor needs a labeled Consumable checkbox');
  assert.equal(create.input('Consumable').props.type, 'checkbox');
  assert.equal(create.input('Consumable').props.checked, false);
  create.input('Name').props.onChange({ target: { value: 'Homemade tonic' } });
  create.input('Quantity').props.onChange({ target: { value: '2' } });
  create.input('Consumable').props.onChange({ target: { checked: true } });
  assert.match(renderToStaticMarkup(create.tree()), /<label[^>]*><input type="checkbox"[^>]*checked=""[^>]*\/> Consumable<\/label>/);
  create.save();
  const original = store.getState().equipment[0];
  assert.equal(original.consumable, true);
  assert.equal(original.category, 'Gear');
  await store.persist.rehydrate();
  const edit = editor(store.getState().equipment[0]);
  assert.equal(edit.input('Consumable').props.checked, true);
  edit.input('Name').props.onChange({ target: { value: 'Renamed tonic' } });
  edit.save();
  assert.equal(store.getState().equipment[0].consumable, true);
  assert.equal(parseBackup(store.getState().exportBackup()).equipment[0].consumable, true);
  store.getState().consumeEquipment(original.id);
  assert.equal(store.getState().equipment[0].quantity, 1);
  assert.equal(store.getState().equipment[0].name, 'Renamed tonic');
});

test('consumable category does not opt custom equipment into consumption and editing can clear the flag', () => {
  fixture();
  const create = editor();
  create.input('Name').props.onChange({ target: { value: 'Display potion' } });
  create.input('Category').props.onChange({ target: { value: 'Consumable' } });
  create.save();
  const entry = store.getState().equipment[0];
  assert.equal(entry.consumable, false);
  const edit = editor({ ...entry, consumable: true });
  assert.ok(edit.input('Consumable'), 'Editing needs the same explicit Consumable choice');
  edit.input('Consumable').props.onChange({ target: { checked: false } });
  edit.save();
  store.getState().consumeEquipment(entry.id);
  assert.equal(store.getState().equipment[0].quantity, 1);
  assert.equal(store.getState().equipment[0].consumable, false);
  assert.equal(store.getState().lastConsumption, null);
});

test('linked relic equipment can be marked consumable without editing its unique identity', () => {
  fixture();
  store.getState().addToInventory({ id: 'custom-editor-potion', name: 'Relic tonic', type: 'standard' });
  const entry = store.getState().equipment[0];
  const edit = editor(entry);
  assert.ok(edit.input('Consumable'), 'Linked relics need the explicit Consumable choice');
  assert.equal(edit.input('Quantity').props.disabled, true);
  edit.input('Consumable').props.onChange({ target: { checked: true } });
  edit.save();
  store.getState().consumeEquipment(entry.id);
  assert.deepEqual(store.getState().inventory, []);
  assert.deepEqual(store.getState().equipment, []);
});
