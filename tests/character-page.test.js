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
const bundle = await rolldown({ input: 'src/pages/CharacterPage.jsx', plugins: [{ name: 'character-test-dependencies', resolveId(id) {
  if (id.endsWith('/store/useCardStore')) return 'character-test-store';
  if (id === storeUrl) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'character-test-store') return `import { useStore } from 'zustand'; import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => useStore({ ...store, getInitialState: store.getState }, selector);`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-character-render-'));
const modulePath = join(directory, 'character.mjs');
await writeFile(modulePath, output.output[0].code);
let CharacterPage;
try { ({ CharacterPage } = await import(pathToFileURL(modulePath).href)); } finally { await rm(directory, { recursive: true }); }
const renderCharacter = (profile = createPlayerProfile()) => {
  useCardStore.setState({ profile, equipment: [] });
  return renderToStaticMarkup(React.createElement(CharacterPage));
};

test('character profile puts identity before the two stat rows with accessible editors', () => {
  const profile = createPlayerProfile();
  profile.hp={current:8,max:40,temp:5};profile.classes=[{name:'Fighter',level:6}];profile.abilities.dex=14;
  profile.sheet.hitDice=[{name:'Fighter',die:10,max:6,current:2}];
  const html=renderCharacter(profile);
  assert.ok(html.indexOf('Character name') < html.indexOf('HP/Max'));
  assert.match(html, /aria-label="Combat stats"/);
  assert.match(html, /HP\/Max[\s\S]*Temp HP[\s\S]*Hit Die[\s\S]*Prof Bonus[\s\S]*Speed ft[\s\S]*Initiative[\s\S]*>AC</);
  for(const label of ['Current HP','Maximum HP','Temp HP','Prof Bonus override','Speed ft','Initiative override','AC']) assert.match(html,new RegExp(`aria-label="${label}"`));
  assert.match(html,/d10 · 2\/6/);
  assert.match(html,/aria-label="Prof Bonus override"[^>]*placeholder="\+3"/);
  assert.match(html,/aria-label="Initiative override"[^>]*placeholder="\+2"/);
});

test('compact profile removes navigation and retired panels while keeping working character sections', () => {
  const html=renderCharacter();
  assert.doesNotMatch(html,/Character sections|Check roll mode|Checks &amp; saving throws|Rest &amp; Hit Dice|Features &amp; proficiencies|Character notes|<h3>Skills<|<h3>Spells</i);
  for(const label of ['Classes &amp; levels','STR','DEX','Attacks','Resources &amp; spell slots','Conditions &amp; death saves','Currency','CARRIED LOAD','Save character']) assert.ok(html.includes(label),label);
  assert.match(html,/Coins are excluded from equipment load\./);
});

test('hidden notes and features survive editing the profile', () => {
  const profile=createPlayerProfile();profile.notes='Remember the old road';profile.sheet.features='Action Surge';profile.sheet.languages='Common';
  renderCharacter(profile);
  useCardStore.getState().updateProfile({...profile,name:'A new name'});
  assert.equal(useCardStore.getState().profile.notes,'Remember the old road');
  assert.equal(useCardStore.getState().profile.sheet.features,'Action Surge');
  assert.equal(useCardStore.getState().profile.sheet.languages,'Common');
});
