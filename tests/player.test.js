import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile, validateProfile, validateEquipment, migratePlayerData, newId } from '../src/data/player.js';
import * as sheets from '../src/data/character-sheet.js';
import { findSpellByName, SRD_SPELLS } from '../src/data/srd/spells.js';

test('legacy spell migration maps case and punctuation variants and keeps custom spell records', () => {
  const custom = { name: 'Moonlit Door', level: 2, prepared: true, concentration: true, notes: 'Homebrew: keep these notes.' };
  const spell = name => ({ name, level: 1, prepared: false, concentration: false, notes: '' });
  const sheet = { ...sheets.emptySheet(), learnedSpellIds: ['shield', 'shield'], spells: [spell('Magic Missile'), spell('magic missile'), spell('  MAGIC-MISSILE! '), spell('Hunter’s Mark'), custom] };
  const migrated = sheets.migrateLearnedSpells(sheet, findSpellByName);
  assert.deepEqual(migrated.learnedSpellIds, ['shield', 'magic-missile', 'hunters-mark']);
  assert.deepEqual(migrated.spells, [custom]);
  assert.equal(sheet.spells.length, 5);
  assert.deepEqual(sheets.migrateLearnedSpells(migrated, findSpellByName), migrated);
});

test('learned spell validation deduplicates IDs and rejects malformed lists', () => {
  const profile = createPlayerProfile();
  assert.deepEqual(profile.sheet.learnedSpellIds, []);
  const sheet = { ...profile.sheet, learnedSpellIds: ['magic-missile', 'magic-missile', 'shield'] };
  assert.deepEqual(validateProfile({ ...profile, sheet }).sheet.learnedSpellIds, ['magic-missile', 'shield']);
  assert.equal(sheets.hasSheetData({ ...sheets.emptySheet(), learnedSpellIds: ['shield'] }), true);
  for (const learnedSpellIds of ['shield', [null], [''], ['x'.repeat(501)], Array(501).fill('shield')]) {
    assert.throws(() => validateProfile({ ...profile, sheet: { ...profile.sheet, learnedSpellIds } }));
  }
});

test('learned spells can retain the complete SRD catalog', () => {
  const profile = createPlayerProfile();
  profile.sheet.learnedSpellIds = SRD_SPELLS.map(spell => spell.id);
  assert.equal(validateProfile(profile).sheet.learnedSpellIds.length, 339);
});

test('profile validation resolves learned references before deduplication and rejects noncatalog IDs', () => {
  const profile = createPlayerProfile();
  profile.sheet.learnedSpellIds = ['FIREBALL', 'fireball', ' Shield '];
  assert.deepEqual(validateProfile(profile).sheet.learnedSpellIds, ['fireball', 'shield']);
  profile.sheet.learnedSpellIds = ['moonlit-door'];
  assert.throws(() => validateProfile(profile), /Unsupported learned spell ID.*moonlit-door.*SRD Spell Tome/i);
});

test('legacy player migration preserves homebrew spells with canonical learned IDs', () => {
  const profile = createPlayerProfile();
  profile.sheet.learnedSpellIds = ['FIREBALL', 'fireball'];
  const custom = { name: 'Moonlit Door', level: 2, prepared: true, concentration: true, notes: 'Keep these notes.' };
  profile.sheet.spells = [{ name: 'Fireball', level: 3, prepared: false, concentration: false, notes: '' }, custom];
  const migrated = migratePlayerData({ profile, inventory: [] }, { migrateSpells: true });
  assert.deepEqual(migrated.profile.sheet.learnedSpellIds, ['fireball']);
  assert.deepEqual(migrated.profile.sheet.spells, [custom]);
});

test('equipment defaults legacy consumable to false and validates explicit choices', () => {
  const equipment = { id: 'potion', characterId: 'hero', name: 'Potion', quantity: 2, carried: true, unitWeightLb: 0.5 };
  assert.equal(validateEquipment(equipment).consumable, false);
  assert.equal(validateEquipment({ ...equipment, consumable: true }).consumable, true);
  for (const consumable of [null, 'false', 0]) assert.throws(() => validateEquipment({ ...equipment, consumable }));
  const migrated = migratePlayerData({ inventory: [{ id: 'wand', name: 'Wand' }] });
  assert.equal(migrated.equipment[0].consumable, false);
});

test('player migration maps old spells once and retains dormant sheet fields', () => {
  const profile = createPlayerProfile();
  delete profile.sheet.learnedSpellIds;
  profile.sheet.spells = [{ name: 'Magic Missile', level: 1, prepared: true, concentration: false, notes: '' }];
  profile.sheet.hitDice = [{ name: 'Wizard', die: 6, max: 3, current: 1 }];
  profile.sheet.resources = [{ name: 'Slots', max: 3, current: 1, recovery: 'long' }];
  profile.sheet.savingThrows.wis = { proficient: true, override: 5 };
  const migrated = migratePlayerData({ profile, inventory: [] });
  assert.deepEqual(migrated.profile.sheet.learnedSpellIds, ['magic-missile']);
  assert.deepEqual(migrated.profile.sheet.spells, []);
  for (const field of ['hitDice', 'resources', 'savingThrows']) assert.deepEqual(migrated.profile.sheet[field], profile.sheet[field]);
  const current = { ...migrated.profile, sheet: { ...migrated.profile.sheet, learnedSpellIds: [], spells: profile.sheet.spells } };
  assert.deepEqual(migratePlayerData({ profile: current, inventory: [] }).profile.sheet, current.sheet);
});
test('IDs also work on HTTP LAN pages without randomUUID', () => {
  const original = globalThis.crypto.randomUUID;
  try { globalThis.crypto.randomUUID = undefined; assert.notEqual(newId(), newId()); }
  finally { globalThis.crypto.randomUUID = original; }
});
test('legacy migration links each owned relic once without changing cards', () => {
  const inventory = [{ id: 'wand', name: 'Edited wand', stats: { hit: '+9' } }];
  const result = migratePlayerData({ inventory });
  assert.equal(result.equipment.length, 1);
  assert.equal(result.equipment[0].relicCardId, 'wand');
  assert.equal(result.equipment[0].unitWeightLb, null);
  assert.equal(result.equipment[0].quantity, 1);
  assert.equal(inventory[0].stats.hit, '+9');
  assert.deepEqual(migratePlayerData({ ...result, inventory }), result);
});
test('player and equipment validation reject invalid numbers and oversized strings', () => {
  const profile = createPlayerProfile();
  for (const value of [0, 31, NaN, Infinity]) assert.throws(() => validateProfile({ ...profile, abilities: { ...profile.abilities, str: value } }));
  assert.throws(() => validateProfile({ ...profile, classes: [{ name: 'Wizard', level: 21 }] }));
  assert.throws(() => validateProfile({ ...profile, name: 'x'.repeat(501) }));
  const equipment = { id: 'e', characterId: profile.id, name: 'Rope', quantity: 1, unitWeightLb: null, carried: true };
  for (const quantity of [0, 1.5, Infinity, 1000000]) assert.throws(() => validateEquipment({ ...equipment, quantity }));
  for (const unitWeightLb of [-1, NaN, Infinity, '']) assert.throws(() => validateEquipment({ ...equipment, unitWeightLb }));
  assert.equal(validateEquipment({ ...equipment, unitWeightLb: 0 }).unitWeightLb, 0);
});
test('migration repairs duplicate and dangling links and retains ordinary equipment', () => {
  const first = migratePlayerData({ inventory: [{ id: 'a', name: 'A' }] });
  const ordinary = validateEquipment({ id: 'rope', characterId: first.profile.id, name: 'Rope', quantity: 1, carried: true, unitWeightLb: 10 });
  const result = migratePlayerData({ ...first, inventory: [{ id: 'a', name: 'A' }], equipment: [first.equipment[0], first.equipment[0], { ...first.equipment[0], id: 'bad', relicCardId: 'gone' }, ordinary] });
  assert.equal(result.equipment.length, 2);
});
