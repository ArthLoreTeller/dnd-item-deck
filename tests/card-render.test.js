import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { rolldown } from 'rolldown';
import defaultCards from '../src/data/defaultCards.json' with { type: 'json' };
const bundle = await rolldown({ input: { card: 'src/components/Card.jsx', deck: 'src/pages/DeckPage.jsx', navigation: 'src/components/CollectionNavigation.jsx', miniInventory: 'src/components/MiniInventory.jsx' }, plugins: [{ name: 'external-dependencies', resolveId(id) { if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true }; } }] });
const output = await bundle.generate({ format: 'esm', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-render-'));
const modulePath = join(directory, 'card.mjs');
await Promise.all(output.output.map(file => writeFile(join(directory, file.fileName), file.code)));
let Card, DeckPage, CollectionNavigation, MiniInventory;
try {
  ({ Card } = await import(pathToFileURL(modulePath).href));
  ({ DeckPage } = await import(pathToFileURL(join(directory, 'deck.mjs')).href));
  ({ CollectionNavigation } = await import(pathToFileURL(join(directory, 'navigation.mjs')).href));
  ({ MiniInventory } = await import(pathToFileURL(join(directory, 'miniInventory.mjs')).href));
} finally { await rm(directory, { recursive: true }); }

test('attuned cards render editable stats without crashing', () => {
  for (const card of defaultCards.filter(card => card.type !== 'normal')) {
    const html = renderToStaticMarkup(React.createElement(Card, { card: { ...card, isAttuned: true } }));
    assert.ok(html.includes(card.name));
    assert.ok(html.includes('input'));
  }
});
test('normal and unattuned cards still render their artwork', () => {
  for (const card of defaultCards) {
    const html = renderToStaticMarkup(React.createElement(Card, { card }));
    assert.ok(html.includes('Inspect artwork for'));
  }
});
test('progressive cards expose named keyboard-operable progression buttons', () => {
  const card = defaultCards.find(card => card.type === 'progressive');
  const html = renderToStaticMarkup(React.createElement(Card, { card: { ...card, isAttuned: true } }));
  assert.match(html, /<button[^>]*aria-label="Level 1 progress 1 of 20"/);
  assert.match(html, /aria-pressed="false"/);
});

test('the visible deck card offers an accessible Read Details action', () => {
  const card = defaultCards[0];
  const html = renderToStaticMarkup(React.createElement(DeckPage, { motion: { phase: 'idle' }, displayedCard: card, isDrawn: true, isRevealing: false, deck: [], inventory: [] }));
  assert.ok(html.includes(`aria-label="Read details for ${card.name}"`));
  assert.match(html, /aria-haspopup="dialog"/);
});

test('card details action is unavailable while revealing or showing the deck back', () => {
  const card = defaultCards[0];
  const reveal = renderToStaticMarkup(React.createElement(DeckPage, { motion: { phase: 'revealing' }, displayedCard: card, isDrawn: true, isRevealing: true, deck: [], inventory: [] }));
  assert.match(reveal, /<button[^>]*aria-label="Read details for [^"]+"[^>]*disabled=""/);
  const back = renderToStaticMarkup(React.createElement(DeckPage, { motion: { phase: 'idle' }, displayedCard: card, isDrawn: false, isRevealing: false, deck: [], inventory: [] }));
  assert.doesNotMatch(back, /aria-label="Read details for/);
});

test('collection shortcuts no longer offer a detached Read Details action', () => {
  const html = renderToStaticMarkup(React.createElement(CollectionNavigation, { page: 'deck', canRead: true }));
  assert.doesNotMatch(html, /aria-label="Read details"/);
});

test('mini inventory anchors progressive level beneath the discard control', () => {
  const card = { id: 'progressive-1', name: 'Awakened Blade', type: 'progressive', rarity: 'rare', currentLevel: 2 };
  const html = renderToStaticMarkup(React.createElement(MiniInventory, {
    inventory: [card], activeId: null, disabled: false,
    onInspect() {}, onDiscard() {}, onOpenInventory() {},
  }));
  const row = html.match(/<div[^>]*class="mini-inventory-item[\s\S]*?<\/div>/)?.[0];
  assert.ok(row);
  const select = row.match(/<button[^>]*class="mini-inventory-select"[\s\S]*?<\/button>/)?.[0];
  assert.ok(select);
  assert.doesNotMatch(select, /inventory-level/);
  assert.match(row, /aria-label="Discard Awakened Blade"[\s\S]*class="inventory-level mini-inventory-level"[^>]*>Lv\. 2/);
});
