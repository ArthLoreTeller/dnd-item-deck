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
const bundle = await rolldown({ input: 'src/pages/CharacterPage.jsx', plugins: [{ name: 'character-test-dependencies', resolveId(id, importer) {
  if (id.endsWith('/store/useCardStore')) return 'character-test-store';
  if (id === 'react' && importer?.endsWith('CharacterPage.jsx')) return 'character-test-hooks';
  if (id === storeUrl) return { id, external: true };
  if (/^(react(?:-dom)?|zustand|lucide-react)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'character-test-store') return `import { useCardStore as store } from '${storeUrl}'; export const useCardStore = () => store.getState();`;
  // As in the Shop interaction tests, adapt only local hooks so real handlers
  // and store validation can run without a DOM runtime.
  if (id === 'character-test-hooks') return `const state = []; let cursor = 0; globalThis.characterPageTestHooks = { reset: () => { state.length = 0; cursor = 0; }, begin: () => { cursor = 0; } }; export function useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } export const useEffect = () => {};`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-character-render-'));
const modulePath = join(directory, 'character.mjs');
await writeFile(modulePath, output.output[0].code);
let CharacterPage;
try { ({ CharacterPage } = await import(pathToFileURL(modulePath).href)); } finally { await rm(directory, { recursive: true }); }
const renderCharacter = (profile = createPlayerProfile()) => {
  globalThis.characterPageTestHooks.reset();
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

function elements(node) {
  if (!React.isValidElement(node)) return [];
  if (typeof node.type === 'function' && node.type.name === 'CharacterStatBlock') return elements(node.type(node.props));
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}
function tree() { globalThis.characterPageTestHooks.begin(); return CharacterPage({}); }

test('Character stat handlers and Save retain hidden fields while committing HP and overrides', () => {
  const profile = createPlayerProfile();
  profile.notes = 'Remember the old road';
  profile.hp = { current: 8, max: 40, temp: 5 };
  profile.sheet.features = 'Action Surge';
  profile.sheet.languages = 'Common';
  profile.sheet.skills.Arcana = { proficiency: 2, override: 9 };
  profile.sheet.learnedSpells = ['fireball'];
  renderCharacter(profile);
  for (const [label, value] of [['Current HP', '12'], ['Prof Bonus override', '4'], ['Initiative override', '-2'], ['AC', '17']]) {
    const input = elements(tree()).find(element => element.type === 'input' && element.props['aria-label'] === label);
    assert.ok(input, label);
    input.props.onChange({ target: { value } });
  }
  elements(tree()).find(element => element.type === 'form').props.onSubmit({ preventDefault() {} });
  const saved = useCardStore.getState().profile;
  assert.deepEqual(saved.hp, { current: 12, max: 40, temp: 5 });
  assert.equal(saved.ac, 17);
  assert.equal(saved.sheet.proficiencyBonusOverride, 4);
  assert.equal(saved.sheet.initiativeOverride, -2);
  assert.equal(saved.notes, 'Remember the old road');
  assert.equal(saved.sheet.features, 'Action Surge');
  assert.equal(saved.sheet.languages, 'Common');
  assert.deepEqual(saved.sheet.skills.Arcana, { proficiency: 2, override: 9 });
  assert.deepEqual(saved.sheet.learnedSpells, ['fireball']);
  assert.match(renderToStaticMarkup(tree()), /Character saved in this browser\./);
});

test('invalid Character HP edit reports validation and leaves the saved profile intact', () => {
  const profile = createPlayerProfile();
  profile.hp = { current: 8, max: 40, temp: 5 };
  renderCharacter(profile);
  elements(tree()).find(element => element.type === 'input' && element.props['aria-label'] === 'Current HP').props.onChange({ target: { value: '-1' } });
  elements(tree()).find(element => element.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(useCardStore.getState().profile.hp, { current: 8, max: 40, temp: 5 });
  assert.match(renderToStaticMarkup(tree()), /role="alert"/);
  assert.doesNotMatch(renderToStaticMarkup(tree()), /Character saved in this browser\./);
});
