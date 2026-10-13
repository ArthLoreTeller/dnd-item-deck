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
import { spellById } from '../src/data/srd/spells.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { useCardStore } = await import('../src/store/useCardStore.js');
const storeUrl = pathToFileURL(join(process.cwd(), 'src/store/useCardStore.js')).href;
const bundle = await rolldown({ input: ['src/pages/SpellsPage.jsx', 'src/pages/SpellTomePage.jsx'], plugins: [{ name: 'spell-test-dependencies', resolveId(id) {
  if (id.endsWith('/store/useCardStore')) return 'spell-test-store';
  if (id.startsWith('file:')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'spell-test-store') return `import { useStore } from 'zustand'; import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => useStore({ ...store, getInitialState: store.getState }, selector);`;
} }] });
const output = await bundle.generate({ format: 'esm', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-spells-render-'));
let SpellsPage, SpellTomePage, SpellTomeResults;
try {
  for (const file of output.output) await writeFile(join(directory, file.fileName), file.code);
  ({ SpellsPage } = await import(pathToFileURL(join(directory, 'SpellsPage.mjs')).href));
  ({ SpellTomePage, SpellTomeResults } = await import(pathToFileURL(join(directory, 'SpellTomePage.mjs')).href));
} finally { await rm(directory, { recursive: true }); }
const render = (Component, props = {}) => renderToStaticMarkup(React.createElement(Component, props));
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

// Catches missing derived stats, inaccessible navigation, and lost custom details.
test('Known Spells renders one stat row, centered tome navigation, ordered groups and details', () => {
  const profile = createPlayerProfile();
  profile.classes = [{ name: 'Wizard', level: 5 }];
  profile.abilities.int = 18;
  profile.sheet.spellcastingAbility = 'int';
  profile.sheet.learnedSpellIds = ['shield', 'light', 'fire-bolt'];
  profile.sheet.spells = [{ name: 'Amber Ward', level: 1, notes: 'Keep <my> notes', prepared: true, concentration: true }];
  useCardStore.setState({ profile });
  const html = render(SpellsPage);
  assert.match(html, /class="spellcasting-stats"/);
  assert.match(html, /<select[^>]*aria-label="Spellcasting ability"/);
  assert.match(html, /<option value="int" selected="">INT<\/option>/);
  for (const [name, value] of [['Modifier', '\\+4'], ['Spell Attack', '\\+7'], ['Save DC', '15']]) assert.match(html, new RegExp(`aria-label="${name}"[^>]*>${value}<`));
  assert.match(html, /class="spell-tome-link"[^>]*href="#\/spell-tome"[^>]*aria-label="Open Spell Tome"/);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.ok(html.indexOf('>Cantrip<') < html.indexOf('>Level 1<'));
  assert.ok(html.indexOf('Fire Bolt') < html.indexOf('Light'));
  assert.ok(html.indexOf('Amber Ward') < html.indexOf('Shield'));
  assert.match(html, /<details[^>]*>[\s\S]*<summary/);
  assert.ok(html.includes(escapeHtml(spellById('shield').description)));
  assert.match(html, /Keep &lt;my&gt; notes/);
  assert.match(html, /Custom spell/);
  assert.match(html, /aria-label="Forget Shield"/);
  assert.doesNotMatch(html, /Roll|Forget Amber Ward/);
});

test('blank profiles show unknown stats and an actionable empty learned spell list', () => {
  useCardStore.setState({ profile: createPlayerProfile() });
  const html = render(SpellsPage);
  assert.equal((html.match(/aria-label="(?:Modifier|Spell Attack|Save DC)"[^>]*>—</g) ?? []).length, 3);
  assert.match(html, /No spells learned yet/);
  assert.match(html, /href="#\/spell-tome"/);
  assert.match(html, /<option value="" selected="">Unknown<\/option>/);
});

// Catches incomplete catalog, missing filters, nonalphabetical rows and stale Learned state.
test('Spell Tome exposes all SRD spells, labelled filters and Learn/Learned controls', () => {
  useCardStore.setState({ profile: createPlayerProfile() });
  useCardStore.getState().learnSpell('light');
  const html = render(SpellTomePage);
  assert.equal((html.match(/class="spell-row"/g) ?? []).length, 339);
  assert.match(html, /<input[^>]*aria-label="Search spells"/);
  assert.match(html, /<select[^>]*aria-label="Spell level"/);
  for (const text of ['All', 'Cantrip', 'Level 1', 'Level 9']) assert.ok(html.includes(`>${text}</option>`));
  assert.match(html, /<button[^>]*aria-label="Light learned"[^>]*disabled=""[^>]*>Learned</);
  assert.match(html, /<button[^>]*aria-label="Learn Shield"[^>]*>Learn</);
  assert.ok(html.indexOf('Acid Arrow') < html.indexOf('Acid Splash'));
  assert.ok(html.includes(escapeHtml(spellById('light').description)));
  assert.match(html, /href="#\/spells"/);
});

// Catches filtering only by query or only by level, including Cantrip/0 coercion.
test('tome results combine case-insensitive search with level selection', () => {
  useCardStore.setState({ profile: createPlayerProfile() });
  const cantrips = render(SpellTomeResults, { query: '  LIGHT  ', level: 0 });
  assert.equal((cantrips.match(/class="spell-row"/g) ?? []).length, 2);
  assert.match(cantrips, /Dancing Lights \(Cantrip\)/);
  assert.match(cantrips, /Light \(Cantrip\)/);
  assert.doesNotMatch(cantrips, /Daylight/);
  const leveled = render(SpellTomeResults, { query: 'LIGHT', level: 3 });
  assert.match(leveled, /Daylight \(Level 3\)/);
  assert.doesNotMatch(leveled, />Light \(Cantrip\)/);
  assert.match(render(SpellTomeResults, { query: 'unknown spell', level: 9 }), /No spells match/);
});
