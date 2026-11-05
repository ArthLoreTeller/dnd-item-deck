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
const bundle = await rolldown({ input: 'src/components/Card.jsx', plugins: [{ name: 'external-dependencies', resolveId(id) { if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true }; } }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-render-'));
const modulePath = join(directory, 'card.mjs');
await writeFile(modulePath, output.output[0].code);
let Card;
try { ({ Card } = await import(pathToFileURL(modulePath).href)); } finally { await rm(directory, { recursive: true }); }

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

test('normal items expose their own populated specifications and readable rules', () => {
  const kunai = defaultCards.find(card => card.id === 'kunai_01');
  const custom = { id: 'custom-rope', name: 'Climbing rope', type: 'normal', specs: { ranges: '50 feet' } };
  for (const card of [kunai, custom]) {
    const html = renderToStaticMarkup(React.createElement(Card, { card }));
    assert.match(html, /<button[^>]+aria-label="Read Item Specifications"[^>]+aria-haspopup="dialog"/);
    assert.ok(html.includes(card.specs.ranges));
    assert.doesNotMatch(html, /Unattune Item|title="Attune Item"/);
  }
  const html = renderToStaticMarkup(React.createElement(Card, { card: kunai }));
  assert.match(html, /<button[^>]+aria-label="Read Item Lore"/);
  assert.match(html, /<button[^>]+aria-haspopup="dialog"[^>]*><span[^>]*>Slash/);
});

test('missing and pending art cannot open inspection or change attunement', () => {
  const wand = defaultCards.find(card => card.id === 'wand_001');
  const render = (card) => renderToStaticMarkup(React.createElement(Card, { card }));
  const html = render({ ...wand, isAttuned: true });
  assert.doesNotMatch(html, /Wand, rare/);
  assert.match(html, /<button[^>]+disabled=""[^>]+aria-label="Inspect artwork/);
  assert.match(html, /referrerPolicy="no-referrer"/i);
  const noArt = render({ ...wand, images: {}, isAttuned: true });
  assert.doesNotMatch(noArt, /Inspect artwork|Click to Unattune/);
  assert.match(noArt, /title="Unattune Item"/);
});

test('repair only previously shipped catalogue descriptions in existing saves', async () => {
  const { normalizeCatalogSpecs } = await import('../src/data/catalogSpecs.js');
  const talisman = { id: 'protection_002', specs: { type: 'Talisman, common', damage: '+9', attunement: 'requires attunement' } };
  assert.deepEqual(normalizeCatalogSpecs(talisman).specs, { type: 'Talisman', damage: '+9', attunement: 'None' });
  const editedWand = { id: 'wand_001', specs: { type: 'Cursed wand' } };
  assert.equal(normalizeCatalogSpecs(editedWand), editedWand);
  assert.equal(normalizeCatalogSpecs({ id: 'wand_001', specs: { type: 'Wand, rare' } }).specs.type, 'Wand');
});
