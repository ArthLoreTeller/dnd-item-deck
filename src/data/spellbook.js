import { abilityModifier } from './weight.js';
import { proficiencyBonus } from './character-sheet.js';
import { spellById } from './srd/spells.js';

export function spellcastingStats(profile) {
  const ability = profile.sheet.spellcastingAbility;
  const modifier = ability ? abilityModifier(profile.abilities[ability]) : null;
  const proficiency = proficiencyBonus(profile);
  const attackBonus = modifier === null || proficiency === null ? null : modifier + proficiency;
  return { modifier, attackBonus, saveDC: attackBonus === null ? null : 8 + attackBonus };
}

export function groupLearnedSpells(profile) {
  const spells = [...new Set(profile.sheet.learnedSpellIds)].map(spellById).filter(Boolean);
  const customSpells = profile.sheet.spells.map((spell, index) => ({ ...spell, id: `custom-spell:${index}`, custom: true }));
  const groups = new Map();
  for (const spell of [...spells, ...customSpells]) {
    if (!groups.has(spell.level)) groups.set(spell.level, []);
    groups.get(spell.level).push(spell);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([level, entries]) => ({
    level,
    label: level === 0 ? 'Cantrip' : `Level ${level}`,
    spells: entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })),
  }));
}
