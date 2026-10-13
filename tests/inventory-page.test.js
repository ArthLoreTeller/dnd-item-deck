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
import { useCardStore } from '../src/store/useCardStore.js';

const storeUrl = pathToFileURL(join(process.cwd(), 'src/store/useCardStore.js')).href;
const bundle = await rolldown({ input: 'src/pages/InventoryPage.jsx', plugins: [{ name: 'external-dependencies', resolveId(id) {
  if (id.endsWith('/store/useCardStore')) return 'inventory-test-store';
  if (id === storeUrl) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  // Use the real store and hook, with the fixture as the server snapshot.
  if (id === 'inventory-test-store') return `import { useStore } from 'zustand'; import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => useStore({ ...store, getInitialState: store.getState }, selector);`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-inventory-render-'));
const modulePath = join(directory, 'inventory.mjs');
await writeFile(modulePath, output.output[0].code);
let InventoryPage;
try { ({ InventoryPage } = await import(pathToFileURL(modulePath).href)); } finally { await rm(directory, { recursive: true }); }

const profile = createPlayerProfile();
const gear = (id, name, quantity, consumable = false) => ({ id, name, quantity, consumable, characterId: profile.id, unitWeightLb: 1, carried: true, category: 'Gear', imageUrl: '', relicCardId: null, source: null });
function renderInventory(equipment, inventory = [], lastConsumption = null) {
  useCardStore.setState({ profile, equipment, inventory, lastConsumption, lastDiscard: null, lastEquipmentRemoval: null });
  return renderToStaticMarkup(React.createElement(InventoryPage));
}

test('matching supplies render one inventory row with their grouped quantity', () => {
  const html = renderInventory([gear('p1', 'Potion', 2, true), gear('p2', 'Potion', 3, true)]);
  assert.equal((html.match(/aria-label="Read details for Potion"/g) || []).length, 1);
  assert.match(html, /aria-label="Quantity: 5"[^>]*>×5</);
  assert.match(html, /<button[^>]*aria-label="Consume one Potion"[^>]*>Consume</);
});

test('ordinary equipment exposes details and editing without a Consume action', () => {
  const html = renderInventory([gear('rope', 'Rope', 1)]);
  assert.match(html, /<button[^>]*aria-label="Read details for Rope"/);
  assert.match(html, /<button[^>]*aria-label="Edit Rope weight and quantity"/);
  assert.doesNotMatch(html, /Consume/);
  assert.match(html, /CARRIED LOAD/);
});

test('linked relic rows expose a named details button', () => {
  const card = { id: 'relic-1', name: 'Moon Blade', rarity: 'rare', type: 'normal' };
  const entry = { ...gear('equipment-1', 'Moon Blade', 1), relicCardId: card.id, category: 'Relic' };
  assert.match(renderInventory([entry], [card]), /<button[^>]*aria-label="Read details for Moon Blade"/);
});

test('inventory keeps named sorting choices and Undo after consumption', () => {
  const entry = gear('potion', 'Potion', 1, true);
  const html = renderInventory([], [], { entry, index: 0 });
  assert.match(html, /<option value="name"[^>]*>Name A–Z<\/option>/);
  assert.match(html, /<option value="rarity">Rarity<\/option>/);
  assert.match(html, /<option value="weight">Heaviest first<\/option>/);
  assert.match(html, /<button[^>]*>Undo consume Potion<\/button>/);
});
