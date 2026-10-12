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
