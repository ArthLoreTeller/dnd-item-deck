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

const memoryStorage = new Map();
globalThis.localStorage = { getItem: key => memoryStorage.get(key) ?? null, setItem: (key, value) => memoryStorage.set(key, value), removeItem: key => memoryStorage.delete(key) };
const { useCardStore } = await import('../src/store/useCardStore.js');
const storeUrl = pathToFileURL(join(process.cwd(), 'src/store/useCardStore.js')).href;
const bundle = await rolldown({ input: 'src/pages/ShopPage.jsx', plugins: [{ name: 'shop-test-dependencies', resolveId(id, importer) {
  if (id.endsWith('/store/useCardStore')) return 'shop-test-store';
  if (id === 'react' && importer?.endsWith('ShopPage.jsx')) return 'shop-test-hooks';
  if (id.startsWith('file:')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'shop-test-store') return `import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => selector(store.getState());`;
  // Only local hook state is adapted. Events use real store/domain actions.
  // Server rendering cannot dispatch hooks; the project has no DOM test runtime.
  if (id === 'shop-test-hooks') return `const state = []; let cursor = 0; globalThis.shopPageTestHooks = { reset: () => { state.length = 0; cursor = 0; }, begin: () => { cursor = 0; } }; export function useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } export const useEffect = () => {};`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-shop-render-'));
const modulePath = join(directory, 'shop.mjs');
let ShopPage;
try {
  await writeFile(modulePath, output.output[0].code);
  ({ ShopPage } = await import(pathToFileURL(modulePath).href));
} finally { await rm(directory, { recursive: true }); }
function elements(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}
function fixture(currency = { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 }) {
  globalThis.shopPageTestHooks.reset();
  const profile = createPlayerProfile();
  profile.currency = currency;
  profile.abilities.str = 10;
  profile.size = 'Medium';
  useCardStore.setState({ profile, equipment: [], inventory: [], toastMessage: null });
  return profile;
}
function tree() { globalThis.shopPageTestHooks.begin(); return ShopPage(); }
const html = () => renderToStaticMarkup(tree());
const find = (type, label) => elements(tree()).find(element => element.type === type && element.props['aria-label'] === label);

// Catches missing controls, catalog facts and accidental Currency/load changes.
test('Shop exposes equipment controls, price, weight, Buy and existing Currency labels', () => {
  fixture();
  const markup = html();
  assert.match(markup, /aria-label="Search shop"/);
  assert.match(markup, /aria-label="Equipment category"/);
  assert.match(markup, /aria-label="Buy Torch"/);
  assert.match(markup, /1 cp/);
  assert.match(markup, /1 lb/);
  assert.match(markup, /Weight unknown/);
  assert.match(markup, /CARRIED LOAD/);
  assert.match(markup, /<h3>Currency<\/h3><div class="currency-grid">/);
  for (const label of ['CP', 'SP', 'EP', 'GP', 'PP']) assert.match(markup, new RegExp(`<label>${label}<input type="number" min="0" step="1"`));
  assert.match(markup, /Coins are excluded from equipment load\./);
});

test('Shop expands accessible equipment details without hiding purchase controls', () => {
  fixture();
  const details = find('button', 'View details for Longsword');
  assert.equal(details.props['aria-expanded'], false);
  assert.doesNotMatch(html(), /1d8 Slashing/);
  details.props.onClick();
  const markup = html();
  assert.match(markup, /aria-label="Hide details for Longsword"/);
  assert.match(markup, /1d8 Slashing/);
  assert.match(markup, /Versatile \(1d10\)/);
  assert.match(markup, /Sap/);
  assert.match(markup, /aria-label="Buy Longsword"/);
});

// Catches search/category handlers that do not affect the rendered catalog.
test('Shop search and category combine and have a clear empty result', () => {
  fixture();
  find('input', 'Search shop').props.onChange({ target: { value: ' torch ' } });
  assert.match(html(), /aria-label="Buy Torch"/);
  assert.doesNotMatch(html(), /aria-label="Buy Dagger"/);
  find('select', 'Equipment category').props.onChange({ target: { value: 'Weapons' } });
  assert.match(html(), /No equipment matches/);
  assert.doesNotMatch(html(), /aria-label="Buy Torch"/);
  find('input', 'Search shop').props.onChange({ target: { value: 'dagger' } });
  assert.match(html(), /aria-label="Buy Dagger"/);
});

// Catches buying without funds, loss of feedback, or partial transactions.
test('Shop reports insufficient funds without changing wallet or inventory', () => {
  const profile = fixture({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  find('button', 'Buy Torch').props.onClick();
  assert.match(html(), /role="alert"[^>]*>Insufficient funds\./);
  assert.deepEqual(useCardStore.getState().profile.currency, profile.currency);
  assert.deepEqual(useCardStore.getState().equipment, []);
});

// Catches detached Buy actions, missing payment, duplicates and load not refreshing.
test('Shop purchases pay automatically, persist and merge ordinary equipment in inventory', () => {
  fixture();
  find('button', 'Buy Torch').props.onClick();
  find('button', 'Buy Torch').props.onClick();
  const saved = useCardStore.getState();
  assert.equal(saved.equipment.length, 1);
  assert.equal(saved.equipment[0].name, 'Torch');
  assert.equal(saved.equipment[0].quantity, 2);
  assert.equal(saved.equipment[0].unitWeightLb, 1);
  assert.equal(saved.equipment[0].carried, true);
  assert.deepEqual(saved.profile.currency, { pp: 0, gp: 0, ep: 1, sp: 4, cp: 8 });
  assert.match(html(), /Purchased 1 Torch/);
  assert.match(html(), /class="load-number">2 <small>\/ 150 lb/);
  const persisted = JSON.parse(memoryStorage.get('dnd-item-deck-storage')).state;
  assert.equal(persisted.equipment[0].quantity, 2);
  assert.deepEqual(persisted.profile.currency, saved.profile.currency);
});

// Catches Currency save replacing other profile fields or discarding purchases.
test('Shop saves editable Currency through the store and keeps carried items', () => {
  fixture();
  find('button', 'Buy Torch').props.onClick();
  const currency = elements(tree()).find(element => element.props.className === 'currency-grid');
  const gpInput = elements(currency).filter(element => element.type === 'input')[3];
  gpInput.props.onChange({ target: { value: '3' } });
  assert.equal(find('button', 'Buy Torch').props.disabled, true);
  assert.match(html(), /Save currency before buying/);
  const form = elements(tree()).find(element => element.type === 'form');
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(useCardStore.getState().profile.currency.gp, 3);
  assert.equal(useCardStore.getState().equipment[0].quantity, 1);
  assert.match(html(), /Currency saved/);
  assert.equal(find('button', 'Buy Torch').props.disabled, false);
});

// Catches invalid Currency overwrites and errors that remain after a valid purchase.
test('Shop validates Currency and clears insufficient-funds feedback after funding a purchase', () => {
  const profile = fixture({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  find('button', 'Buy Torch').props.onClick();
  assert.match(html(), /Insufficient funds/);
  const changeGold = value => {
    const currency = elements(tree()).find(element => element.props.className === 'currency-grid');
    elements(currency).filter(element => element.type === 'input')[3].props.onChange({ target: { value } });
    elements(tree()).find(element => element.type === 'form').props.onSubmit({ preventDefault() {} });
  };
  changeGold('-1');
  assert.match(html(), /role="alert"/);
  assert.deepEqual(useCardStore.getState().profile.currency, profile.currency);
  changeGold('1');
  find('button', 'Buy Torch').props.onClick();
  assert.doesNotMatch(html(), /role="alert"|Insufficient funds/);
  assert.equal(useCardStore.getState().equipment[0].quantity, 1);
});
