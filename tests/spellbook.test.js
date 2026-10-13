import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile } from '../src/data/player.js';
import { spellcastingStats, groupLearnedSpells } from '../src/data/spellbook.js';
import { migrateLearnedSpells } from '../src/data/character-sheet.js';
import { findSpellByName } from '../src/data/srd/spells.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const { useCardStore } = await import('../src/store/useCardStore.js');

// Catches wrong proficiency scaling, missing ability, and treating unknowns as zero.
test('spellcasting stats use the selected ability and existing proficiency rules', () => {
  const profile = createPlayerProfile();
  profile.classes = [{ name: 'Wizard', level: 5 }];
  profile.sheet.spellcastingAbility = 'int';
  profile.abilities.int = 18;
  assert.deepEqual(spellcastingStats(profile), { modifier: 4, attackBonus: 7, saveDC: 15 });
  profile.sheet.proficiencyBonusOverride = 5;
  assert.deepEqual(spellcastingStats(profile), { modifier: 4, attackBonus: 9, saveDC: 17 });
  profile.abilities.int = 8;
  assert.deepEqual(spellcastingStats(profile), { modifier: -1, attackBonus: 4, saveDC: 12 });
  profile.sheet.spellcastingAbility = null;
  assert.deepEqual(spellcastingStats(profile), { modifier: null, attackBonus: null, saveDC: null });
  profile.sheet.spellcastingAbility = 'int';
  profile.classes = [];
  profile.sheet.proficiencyBonusOverride = null;
  assert.deepEqual(spellcastingStats(profile), { modifier: -1, attackBonus: null, saveDC: null });
});

// Catches lexicographic level sorting, input mutation, duplicate rows, and lost custom notes.
test('known spells group Cantrip then levels 1–9, alphabetically, retaining custom entries', () => {
  const profile = createPlayerProfile();
  profile.sheet.learnedSpellIds = ['wish', 'shield', 'light', 'fire-bolt', 'aid', 'fireball', 'banishment', 'cone-of-cold', 'disintegrate', 'teleport', 'maze', 'shield', 'unknown-legacy-id'];
  profile.sheet.spells = [{ name: 'Amber Ward', level: 1, notes: 'From my mentor', prepared: true, concentration: true }];
  const original = structuredClone(profile);
  const groups = groupLearnedSpells(profile);
  assert.deepEqual(groups.map(group => group.level), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(groups[0].label, 'Cantrip');
  assert.equal(groups[9].label, 'Level 9');
  assert.deepEqual(groups[0].spells.map(spell => spell.name), ['Fire Bolt', 'Light']);
  assert.deepEqual(groups[1].spells.map(spell => spell.name), ['Amber Ward', 'Shield']);
  assert.equal(groups[1].spells[0].notes, 'From my mentor');
  assert.equal(groups[1].spells[0].custom, true);
  assert.deepEqual(profile, original);
  assert.deepEqual(groupLearnedSpells(createPlayerProfile()), []);
});

// Catches duplicate learning, invalid catalog IDs, forgetting custom entries, and lost persistence.
test('learn and forget are idempotent, persist IDs, and preserve the rest of the profile', async () => {
  const profile = createPlayerProfile();
  profile.notes = 'Keep this journal';
  profile.sheet.spells = [{ name: 'Amber Ward', level: 1, notes: 'From my mentor', prepared: true, concentration: true }];
  useCardStore.setState({ profile });
  assert.throws(() => useCardStore.getState().learnSpell('missing'), /spell/i);
  assert.deepEqual(useCardStore.getState().profile, profile);
  useCardStore.getState().learnSpell('shield');
  useCardStore.getState().learnSpell('shield');
  useCardStore.getState().learnSpell('light');
  assert.deepEqual(useCardStore.getState().profile.sheet.learnedSpellIds, ['shield', 'light']);
  assert.deepEqual(JSON.parse(storage.get('dnd-item-deck-storage')).state.profile.sheet.learnedSpellIds, ['shield', 'light']);
  await useCardStore.persist.rehydrate();
  useCardStore.getState().forgetSpell('shield');
  useCardStore.getState().forgetSpell('shield');
  assert.deepEqual(useCardStore.getState().profile, { ...profile, sheet: { ...profile.sheet, learnedSpellIds: ['light'] } });
  assert.deepEqual(JSON.parse(storage.get('dnd-item-deck-storage')).state.profile.sheet.spells, profile.sheet.spells);
});

test('migrated spells still display SRD matches alongside unmatched custom spell notes', () => {
  const profile = createPlayerProfile();
  profile.sheet.spells = [
    { name: ' SHIELD ', level: 1, notes: '', prepared: true, concentration: false },
    { name: 'Amber Ward', level: 1, notes: 'Keep my custom rules', prepared: true, concentration: true },
  ];
  profile.sheet = migrateLearnedSpells(profile.sheet, findSpellByName);
  assert.deepEqual(groupLearnedSpells(profile)[0].spells.map(spell => spell.name), ['Amber Ward', 'Shield']);
  assert.equal(groupLearnedSpells(profile)[0].spells[0].notes, 'Keep my custom rules');
});
