import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { rolldown } from 'rolldown';
import { useTheme } from '../src/theme/useTheme.js';
import { useSoundSettings } from '../src/audio/sound.js';

const inputs = { navigation: 'src/components/CollectionNavigation.jsx', app: 'src/App.jsx', settings: 'src/pages/SettingsPage.jsx' };
const stores = {
  '/theme/useTheme': ['useTheme', pathToFileURL(join(process.cwd(), 'src/theme/useTheme.js')).href],
  '/audio/sound': ['useSoundSettings', pathToFileURL(join(process.cwd(), 'src/audio/sound.js')).href],
};
const bundle = await rolldown({ input: inputs, plugins: [{ name: 'external-dependencies', resolveId(id) {
  for (const [suffix, [name]] of Object.entries(stores)) if (id.endsWith(suffix)) return `navigation-test-${name}`;
  if (id.endsWith('?url')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react|pdfjs-dist)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
  if (id.startsWith('file:')) return { id, external: true };
}, load(id) {
  for (const [name, url] of Object.values(stores)) if (id === `navigation-test-${name}`) return `export * from '${url}'; import { useStore } from 'zustand'; import { ${name} as store } from '${url}'; export const ${name} = Object.assign(selector => useStore({ ...store, getInitialState: store.getState }, selector), store);`;
} }] });
const output = await bundle.generate({ format: 'esm', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-navigation-render-'));
await Promise.all(output.output.map(file => writeFile(join(directory, file.fileName), file.code)));
let CollectionNavigation, SettingsPage, App;
try {
  ({ CollectionNavigation } = await import(pathToFileURL(join(directory, 'navigation.mjs')).href));
  ({ default: App } = await import(pathToFileURL(join(directory, 'app.mjs')).href));
  ({ SettingsPage } = await import(pathToFileURL(join(directory, 'settings.mjs')).href));
} finally { await rm(directory, { recursive: true }); }
const renderNavigation = page => renderToStaticMarkup(React.createElement(CollectionNavigation, { page }));

test('Corner Menu contains named icon-only links for every top-level page', () => {
  const html = renderNavigation('settings');
  for (const [route, label] of [['deck', 'Deck'], ['inventory', 'Inventory'], ['character', 'Character'], ['skills', 'Skills'], ['spells', 'Spells'], ['notes', 'Notes'], ['shop', 'Shop'], ['settings', 'Settings']]) {
    const link = html.match(new RegExp(`<a[^>]*href="#/${route}"[^>]*>[\\s\\S]*?</a>`))?.[0];
    assert.ok(link, `${label} link must render`);
    assert.ok(link.includes(`aria-label="${label}"`));
    assert.ok(link.includes(`title="${label}"`));
    assert.match(link, /<svg[^>]*aria-hidden="true"/);
    if (route === 'settings') assert.ok(link.includes('aria-current="page"'));
  }
  assert.doesNotMatch(html, /Enable sound|Mute sound|Read Details|Read details/);
});

test('Corner Menu starts collapsed and excludes contextual D20 actions', () => {
  for (const page of ['deck', 'inventory', 'character', 'skills', 'spells', 'spell-tome', 'notes', 'shop', 'settings']) {
    const html = renderNavigation(page);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /class="orbit-shortcuts"[^>]*inert=""[^>]*aria-hidden="true"/);
    assert.equal((html.match(/<button/g) || []).length, 1);
    assert.doesNotMatch(html, /Roll a D20/);
  }
});

test('Settings renders the persisted theme and sound preferences with labelled controls', () => {
  assert.equal(typeof SettingsPage, 'function', 'Settings page must be available');
  useTheme.setState({ theme: 'woody' });
  useSoundSettings.setState({ muted: true, volume: 0.35, reducedMotion: true });
  const html = renderToStaticMarkup(React.createElement(SettingsPage));
  assert.match(html, /<h2[^>]*>Settings<\/h2>/);
  assert.match(html, /<label[^>]*for="settings-theme"[^>]*>Theme<\/label>/);
  assert.match(html, /<option value="woody" selected="">Mahogany<\/option>/);
  for (const label of ['Midnight', 'Evergreen', 'Blossom', 'Parchment', 'Noir']) assert.ok(html.includes(`>${label}</option>`));
  assert.match(html, /id="settings-sound"[^>]*aria-checked="false"/);
  assert.match(html, /<label[^>]*for="settings-volume"[^>]*>Master SFX volume<\/label>/);
  assert.match(html, /id="settings-volume"[^>]*value="35"/);
  assert.match(html, />35%<\/output>/);
  assert.match(html, /id="settings-motion"[^>]*aria-checked="true"/);
});

test('Settings displays the exact approved SRD attribution with source and license links', () => {
  const html = renderToStaticMarkup(React.createElement(SettingsPage));
  const section = html.match(/<section[^>]*aria-label="SRD attribution"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(section, 'SRD attribution must be visible in the application');
  const text = section.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1].replaceAll('&quot;', '"');
  assert.equal(text, 'This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.');
  assert.match(section, /href="https:\/\/media\.dndbeyond\.com\/compendium-images\/srd\/5\.2\/SRD_CC_v5\.2\.1\.pdf"/);
  assert.match(section, /href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/legalcode"/);
});

test('unfinished companion routes render a focused page shell instead of an empty page', () => {
  const previousWindow = globalThis.window;
  try {
    for (const [route, label] of [['skills', 'Skills'], ['spells', 'Spells'], ['spell-tome', 'Spell Tome'], ['notes', 'Notes'], ['shop', 'Shop']]) {
      globalThis.window = { location: { hash: `#/${route}` } };
      const html = renderToStaticMarkup(React.createElement(App));
      assert.match(html, new RegExp(`<h2[^>]*>${label}</h2>`));
      assert.match(html, /<main/);
      assert.doesNotMatch(html, /Roll D20/);
    }
  } finally { globalThis.window = previousWindow; }
});

test('Deck retains its D20 action outside the Corner Menu', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { location: { hash: '#/deck' } };
    const html = renderToStaticMarkup(React.createElement(App));
    assert.match(html, /<button[^>]*aria-label="Roll D20"[^>]*>/);
    const nav = html.match(/<nav class="collection-orbit[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav);
    assert.doesNotMatch(nav, /Roll D20|Roll a D20/);
  } finally { globalThis.window = previousWindow; }
});
