import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SRD_SKILLS } from '../src/data/srd/skills.js';
import { SRD_SPELLS, spellById, findSpellByName, filterSpells } from '../src/data/srd/spells.js';
import { SRD_EQUIPMENT, equipmentDetails, filterEquipment } from '../src/data/srd/equipment.js';
import { SRD_ATTRIBUTION, SRD_VERSION, SRD_SOURCE_URL } from '../src/data/srd/license.js';

test('skills expose all 18 alphabetically ordered skills with abilities and descriptions', () => {
  assert.deepEqual(SRD_SKILLS.map(skill => skill.name), ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']);
  for (const skill of SRD_SKILLS) {
    assert.ok(['str', 'dex', 'int', 'wis', 'cha'].includes(skill.ability));
    assert.ok(skill.description.trim());
  }
});

test('local spell tome contains all 339 unique SRD spells across levels zero through nine', () => {
  assert.equal(SRD_SPELLS.length, 339);
  assert.equal(new Set(SRD_SPELLS.map(spell => spell.id)).size, 339);
  assert.deepEqual([...new Set(SRD_SPELLS.map(spell => spell.level))].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const spell of SRD_SPELLS) {
    for (const key of ['id', 'name', 'school', 'castingTime', 'range', 'components', 'duration', 'description']) assert.ok(typeof spell[key] === 'string' && spell[key].trim(), `${spell.name}: ${key}`);
    assert.equal(typeof spell.concentration, 'boolean');
    assert.equal(typeof spell.ritual, 'boolean');
  }
});

test('spell lookup and filtering normalize case and whitespace and combine level with query', () => {
  assert.equal(findSpellByName('  fIrEbAlL ').id, 'fireball');
  assert.equal(spellById('fireball').level, 3);
  assert.equal(spellById(' FIREBALL ').level, 3);
  assert.equal(spellById('not-a-spell'), undefined);
  assert.equal(findSpellByName('not a spell'), undefined);
  assert.deepEqual(filterSpells({ query: ' FIREBALL ', level: 3 }).map(spell => spell.id), ['fireball']);
  assert.deepEqual(filterSpells({ query: 'fireball', level: 0 }), []);
  assert.ok(filterSpells({ level: 0 }).length > 0);
  assert.equal(filterSpells().length, 339);
});

test('2024 spell text preserves revised healing, ritual, concentration, scaling and tables', () => {
  assert.match(spellById('cure-wounds').description, /2d8/);
  assert.match(spellById('cure-wounds').description, /Using a Higher-Level Spell Slot/);
  assert.equal(spellById('alarm').ritual, true);
  assert.equal(spellById('bless').concentration, true);
  assert.equal(spellById('fire-bolt').level, 0);
  assert.match(spellById('fire-bolt').description, /Cantrip Upgrade/);
  assert.match(spellById('teleport').description, /Mishap/);
  assert.match(spellById('telekinesis').description, /such as manipulating a simple tool,$/);
});

test('prismatic rules display plain text while preserving saving throw and spell references', () => {
  for (const id of ['prismatic-spray', 'prismatic-wall']) {
    const description = spellById(id).description;
    assert.doesNotMatch(description, /\*/);
    assert.match(description, /Failed Save: 12d6 Fire damage\. Successful Save: Half as much damage\./);
    assert.match(description, /Greater Restoration spell/);
  }
  assert.match(spellById('prismatic-wall').description, /Additional Effects: This layer is destroyed by Dispel Magic\./);
});

test('mundane equipment has unique IDs, integer copper prices and known or unknown weights', () => {
  assert.ok(SRD_EQUIPMENT.length >= 150);
  assert.equal(new Set(SRD_EQUIPMENT.map(item => item.id)).size, SRD_EQUIPMENT.length);
  for (const item of SRD_EQUIPMENT) {
    assert.ok(item.id && item.name && item.category);
    assert.ok(Number.isSafeInteger(item.priceCp) && item.priceCp >= 0, item.name);
    assert.ok(item.weightLb === null || (Number.isFinite(item.weightLb) && item.weightLb >= 0), item.name);
    assert.equal(item.rarity, 'Common');
    assert.equal(typeof item.consumable, 'boolean');
  }
  assert.equal(SRD_EQUIPMENT.find(item => item.id === 'backpack').priceCp, 200);
  assert.equal(SRD_EQUIPMENT.find(item => item.id === 'backpack').weightLb, 5);
  assert.equal(SRD_EQUIPMENT.find(item => item.id === 'rations').consumable, true);
  assert.equal(SRD_EQUIPMENT.find(item => item.id === 'torch').priceCp, 1);
});

test('equipment filters search and category case-insensitively together', () => {
  assert.deepEqual(filterEquipment({ query: ' BACKPACK ', category: ' ADVENTURING GEAR ' }).map(item => item.id), ['backpack']);
  assert.deepEqual(filterEquipment({ query: 'backpack', category: 'weapons' }), []);
  assert.equal(filterEquipment().length, SRD_EQUIPMENT.length);
});

test('shop equipment details expose weapon, armor, and general item rules', () => {
  const byId = id => SRD_EQUIPMENT.find(item => item.id === id);
  assert.deepEqual(equipmentDetails(byId('longsword')), [
    ['Damage', '1d8 Slashing'],
    ['Properties', 'Versatile (1d10)'],
    ['Mastery', 'Sap'],
    ['Weapon type', 'Martial Melee'],
  ]);
  assert.deepEqual(equipmentDetails(byId('plate-armor')), [
    ['Armor Class', '18'],
    ['Armor type', 'Heavy Armor'],
    ['Strength', '15'],
    ['Stealth', 'Disadvantage'],
  ]);
  assert.deepEqual(equipmentDetails(byId('torch')), [
    ['Category', 'Adventuring Gear'],
    ['Use', 'Consumable'],
  ]);
  for (const item of SRD_EQUIPMENT) assert.ok(equipmentDetails(item).length > 0, `${item.name} needs details`);
});

test('catalog expands the source gaming sets and barding and retains food purchase prices', () => {
  const byId = id => SRD_EQUIPMENT.find(item => item.id === id);
  assert.equal(byId('dice').priceCp, 10);
  assert.equal(byId('dragonchess').priceCp, 100);
  assert.equal(byId('playing-cards').priceCp, 50);
  assert.equal(byId('three-dragon-ante').priceCp, 100);
  assert.equal(byId('plate-armor-barding').priceCp, 600000);
  assert.equal(byId('plate-armor-barding').weightLb, 130);
  assert.equal(byId('bread-loaf').priceCp, 2);
  assert.equal(byId('bread-loaf').weightLb, null);
  assert.equal(byId('bread-loaf').consumable, true);
});

test('SRD exports the exact official attribution and versioned PDF source', () => {
  assert.equal(SRD_VERSION, '5.2.1');
  assert.equal(SRD_SOURCE_URL, 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf');
  assert.equal(SRD_ATTRIBUTION, 'This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.');
});

async function importWithRecords(moduleName, records) {
  const source = await readFile(new URL(`../src/data/srd/${moduleName}.js`, import.meta.url), 'utf8');
  const substituted = source.replace(/^import .* from '\.\/.*\.json' with \{ type: 'json' \};/m, `const records = ${JSON.stringify(records)};`);
  return import(`data:text/javascript;base64,${Buffer.from(substituted).toString('base64')}`);
}

test('spell module rejects malformed fields and duplicate IDs at initialization', async () => {
  for (const change of [{ level: 10 }, { ritual: 'yes' }, { concentration: null }, { description: '' }, { school: 'invalid' }]) {
    const records = SRD_SPELLS.map(spell => ({ ...spell }));
    Object.assign(records[0], change);
    await assert.rejects(importWithRecords('spells', records), /Invalid SRD spell/);
  }
  const duplicate = SRD_SPELLS.map(spell => ({ ...spell }));
  duplicate[1].id = duplicate[0].id;
  await assert.rejects(importWithRecords('spells', duplicate), /Invalid SRD spell/);
});

test('equipment module rejects malformed prices, weights and consumable metadata', async () => {
  for (const change of [{ priceCp: -1 }, { priceCp: 0.5 }, { weightLb: -1 }, { consumable: 'yes' }, { name: '' }, { rarity: 'Legendary' }]) {
    const records = SRD_EQUIPMENT.map(item => ({ ...item }));
    Object.assign(records[0], change);
    await assert.rejects(importWithRecords('equipment', records), /Invalid SRD equipment/);
  }
  const duplicate = SRD_EQUIPMENT.map(item => ({ ...item }));
  duplicate[1].id = duplicate[0].id;
  await assert.rejects(importWithRecords('equipment', duplicate), /Invalid SRD equipment/);
});
