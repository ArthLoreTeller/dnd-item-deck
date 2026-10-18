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
const bundle = await rolldown({ input: 'src/pages/NotesPage.jsx', plugins: [{ name: 'notes-test-store', resolveId(id) {
  if (id.endsWith('/store/useCardStore')) return 'notes-test-store';
  if (id.startsWith('file:')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  // Real store reads let us exercise native editor handlers without a DOM.
  if (id === 'notes-test-store') return `import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => selector(store.getState());`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-notes-render-'));
const modulePath = join(directory, 'notes.mjs');
let NotesPage;
try {
  await writeFile(modulePath, output.output[0].code);
  ({ NotesPage } = await import(pathToFileURL(modulePath).href));
} finally { await rm(directory, { recursive: true }); }
function elements(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}

// Catches lost imported content and inaccessible editors.
test('Notes renders existing features, proficiencies and character notes in labelled editors', () => {
  const profile = createPlayerProfile();
  profile.sheet.features = 'Action Surge';
  profile.sheet.languages = 'Common, Elvish; light armor';
  profile.notes = 'Remember <the> old road';
  useCardStore.setState({ profile });
  const html = renderToStaticMarkup(React.createElement(NotesPage));
  assert.match(html, /<h2[^>]*>Notes<\/h2>/);
  for (const label of ['Features', 'Proficiencies &amp; languages', 'Character notes']) assert.match(html, new RegExp(`<label[^>]*>${label}<textarea`));
  assert.match(html, /Action Surge<\/textarea>/);
  assert.match(html, /Common, Elvish; light armor<\/textarea>/);
  assert.match(html, /Remember &lt;the&gt; old road<\/textarea>/);
});

// Catches handlers writing wrong keys, dropping sheet data, or failing to persist.
test('Notes changes persist to existing keys and preserve other profile data', () => {
  const profile = createPlayerProfile();
  profile.name = 'Mira';
  profile.sheet.learnedSpellIds = ['light'];
  profile.hp = { current: 8, max: 20, temp: 2 };
  useCardStore.setState({ profile });
  for (const [index, text] of ['Second Wind', 'Common; shields', 'Find the missing scout'].entries()) {
    const editor = elements(NotesPage()).filter(element => element.type === 'textarea')[index];
    editor.props.onChange({ target: { value: text } });
  }
  const saved = useCardStore.getState().profile;
  assert.equal(saved.sheet.features, 'Second Wind');
  assert.equal(saved.sheet.languages, 'Common; shields');
  assert.equal(saved.notes, 'Find the missing scout');
  assert.equal(saved.name, 'Mira');
  assert.deepEqual(saved.sheet.learnedSpellIds, ['light']);
  assert.deepEqual(saved.hp, { current: 8, max: 20, temp: 2 });
  const persisted = JSON.parse(memoryStorage.get('dnd-item-deck-storage')).state.profile;
  assert.equal(persisted.sheet.features, 'Second Wind');
  assert.equal(persisted.sheet.languages, 'Common; shields');
  assert.equal(persisted.notes, 'Find the missing scout');
  elements(NotesPage()).filter(element => element.type === 'textarea')[0].props.onChange({ target: { value: '' } });
  assert.equal(useCardStore.getState().profile.sheet.features, '');
  assert.equal(useCardStore.getState().profile.notes, 'Find the missing scout');
});
