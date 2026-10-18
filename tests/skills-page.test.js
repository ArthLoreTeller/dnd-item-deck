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
import { SRD_SKILLS } from '../src/data/srd/skills.js';
import { changeSkill } from '../src/data/skill-profile.js';
import { createSkillDescriptions } from '../src/data/skill-descriptions.js';

const memoryStorage = new Map();
globalThis.localStorage = { getItem: key => memoryStorage.get(key) ?? null, setItem: (key, value) => memoryStorage.set(key, value), removeItem: key => memoryStorage.delete(key) };
const { useCardStore } = await import('../src/store/useCardStore.js');
const storeUrl = pathToFileURL(join(process.cwd(), 'src/store/useCardStore.js')).href;
const bundle = await rolldown({ input: 'src/pages/SkillsPage.jsx', plugins: [{ name: 'skills-test-dependencies', resolveId(id) {
  if (id.endsWith('/store/useCardStore')) return 'skills-test-store';
  if (id.startsWith('file:')) return { id, external: true };
  if (/^(react(?:-dom)?|zustand)(\/|$)/.test(id)) return { id: import.meta.resolve(id), external: true };
}, load(id) {
  if (id === 'skills-test-store') return `import { useStore } from 'zustand'; import { useCardStore as store } from '${storeUrl}'; export const useCardStore = selector => useStore({ ...store, getInitialState: store.getState }, selector);`;
} }] });
const output = await bundle.generate({ format: 'esm' });
await bundle.close();
const directory = await mkdtemp(join(tmpdir(), 'reliquary-skills-render-'));
const modulePath = join(directory, 'skills.mjs');
await writeFile(modulePath, output.output[0].code);
let SkillsPage;
try { ({ SkillsPage } = await import(pathToFileURL(modulePath).href)); } finally { await rm(directory, { recursive: true }); }
const renderSkills = profile => {
  useCardStore.setState({ profile });
  return renderToStaticMarkup(React.createElement(SkillsPage));
};

// Catches dropped skills, incorrect ability labels, and lost bonus signs.
test('Skills renders all 18 SRD skills in order with ability and signed bonus, without rolls', () => {
  const profile = createPlayerProfile();
  profile.classes = [{ name: 'Rogue', level: 5 }];
  profile.abilities = { str: 8, dex: 16, con: 10, int: 10, wis: 12, cha: 10 };
  for (const entry of Object.values(profile.sheet.skills)) entry.proficiency = 0;
  profile.sheet.skills.Acrobatics.proficiency = 2;
  profile.sheet.skills['Animal Handling'].proficiency = .5;
  profile.sheet.skills.Arcana.override = -4;
  const html = renderSkills(profile);
  assert.equal((html.match(/class="skill-row"/g) ?? []).length, 18);
  let previous = -1;
  for (const skill of SRD_SKILLS) {
    const position = html.indexOf(`${skill.name} (${skill.ability.toUpperCase()})`);
    assert.ok(position > previous, `${skill.name} follows SRD order`);
    previous = position;
  }
  for (const [name, bonus] of [['Acrobatics', '+9'], ['Animal Handling', '+2'], ['Arcana', '-4'], ['Athletics', '-1'], ['History', '+0']]) {
    assert.match(html, new RegExp(`aria-label="${name} bonus"[^>]*>${bonus.replace('+', '\\+')}<`));
  }
  assert.doesNotMatch(html, /Roll|skill-card/);
});

// Catches descriptions reduced to hover-only titles or unlabelled editors.
test('every skill has a focusable, tap-capable description trigger and labelled compact editors', () => {
  const html = renderSkills(createPlayerProfile());
  for (const skill of SRD_SKILLS) {
    assert.match(html, new RegExp(`<button[^>]*aria-describedby="skill-description-${skill.id}"[^>]*aria-expanded="false"`));
    assert.match(html, new RegExp(`id="skill-description-${skill.id}"[^>]*role="tooltip"`));
    assert.ok(html.includes(skill.description.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')));
    assert.match(html, new RegExp(`aria-label="${skill.name} proficiency"`));
    assert.match(html, new RegExp(`aria-label="${skill.name} bonus override"`));
  }
  assert.equal((html.match(/aria-label="[^"]+ bonus"[^>]*>—</g) ?? []).length, 18);
  for (const choice of ['Unknown', 'None', 'Half', 'Proficient', 'Expertise']) assert.ok(html.includes(`>${choice}</option>`));
  assert.match(html, />Save skills</);
});

// Catches replacement of the full sheet/profile and destructive input coercion.
test('skill edits preserve hidden character data and persist through the existing profile store', () => {
  const original = createPlayerProfile();
  original.notes = 'A secret map';
  original.sheet.features = 'Cunning Action';
  original.sheet.languages = 'Common, Elvish';
  original.sheet.learnedSpellIds = ['light'];
  original.hp = { current: 12, max: 20, temp: 3 };
  let draft = changeSkill(original, 'Stealth', { proficiency: 2 });
  draft = changeSkill(draft, 'Stealth', { override: -2 });
  assert.deepEqual(original.sheet.skills.Stealth, { proficiency: null, override: null });
  useCardStore.setState({ profile: original });
  useCardStore.getState().updateProfile(draft);
  const persisted = useCardStore.getState().profile;
  assert.deepEqual(persisted.sheet.skills.Stealth, { proficiency: 2, override: -2 });
  assert.equal(persisted.notes, 'A secret map');
  assert.equal(persisted.sheet.features, 'Cunning Action');
  assert.equal(persisted.sheet.languages, 'Common, Elvish');
  assert.deepEqual(persisted.sheet.learnedSpellIds, ['light']);
  assert.deepEqual(persisted.hp, { current: 12, max: 20, temp: 3 });
  assert.deepEqual(JSON.parse(memoryStorage.get('dnd-item-deck-storage')).state.profile.sheet.skills.Stealth, { proficiency: 2, override: -2 });
  draft = changeSkill(draft, 'Stealth', { proficiency: 0, override: null });
  useCardStore.getState().updateProfile(draft);
  assert.deepEqual(useCardStore.getState().profile.sheet.skills.Stealth, { proficiency: 0, override: null });
  assert.throws(() => useCardStore.getState().updateProfile(changeSkill(draft, 'Stealth', { override: 101 })), /Invalid character-sheet number/);
});

// Catches immediate hover dismissal while crossing from a trigger to its tooltip.
test('hover descriptions survive the trigger gap and dismiss after leaving the combined region', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let visible = null;
  const descriptions = createSkillDescriptions(value => { visible = value; });
  descriptions.enter('acrobatics');
  assert.equal(visible, 'acrobatics');
  descriptions.leave(); // Pointer leaves the trigger into the uncovered gap.
  context.mock.timers.tick(50);
  assert.equal(visible, 'acrobatics');
  descriptions.enter('acrobatics'); // Pointer reaches the tooltip before dismissal.
  context.mock.timers.tick(500);
  assert.equal(visible, 'acrobatics');
  descriptions.leave(); // Pointer now leaves the trigger and tooltip region.
  context.mock.timers.tick(500);
  assert.equal(visible, null);
  descriptions.dispose();
});

test('focus and tap descriptions retain Escape, blur, toggle, and pending timer semantics', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let visible = null;
  const descriptions = createSkillDescriptions(value => { visible = value; });
  descriptions.focus('acrobatics');
  descriptions.enter('acrobatics');
  descriptions.leave();
  context.mock.timers.tick(500);
  assert.equal(visible, 'acrobatics', 'focus retains the description when the pointer leaves');
  descriptions.dismiss(); // Escape keeps DOM focus but dismisses the description.
  assert.equal(visible, null);
  descriptions.toggle('arcana');
  descriptions.leave();
  context.mock.timers.tick(500);
  assert.equal(visible, 'arcana', 'a tapped description stays pinned');
  descriptions.toggle('arcana');
  assert.equal(visible, null, 'a second tap closes the description');
  descriptions.focus('history');
  descriptions.leave();
  descriptions.blur();
  assert.equal(visible, null);
  descriptions.focus('insight');
  context.mock.timers.tick(500);
  assert.equal(visible, 'insight', 'an old hover dismissal cannot close a newly focused description');
  descriptions.enter('medicine');
  descriptions.leave();
  descriptions.dispose();
  context.mock.timers.tick(500);
  assert.equal(visible, 'insight', 'unmount cancels pending callbacks');
});
