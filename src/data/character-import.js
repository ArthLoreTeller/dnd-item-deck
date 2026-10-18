import { validateProfile, validateEquipment } from './player.js';
export const PROFILE_IMPORT_FIELDS = ['portraitUrl', 'sheet', 'name', 'playerName', 'species', 'background', 'classes', 'abilities', 'hp', 'ac', 'speed', 'size', 'currency', 'notes'];
export function validateImportDraft(draft) {
  if (!draft || !Array.isArray(draft.equipment) || draft.equipment.length > 5000 || !Array.isArray(draft.warnings) || !draft.provenance?.characterId) throw new Error('Invalid character import draft.');
  const profile = validateProfile(draft.profile);
  const equipment = draft.equipment.map(validateEquipment);
  const ids = new Set();
  for (const entry of equipment) {
    if (entry.relicCardId || ids.has(entry.id) || entry.source?.characterId !== draft.provenance.characterId) throw new Error('Invalid or duplicate imported equipment.');
    ids.add(entry.id);
  }
  return { ...draft, profile, equipment };
}
export function mergeCharacterDraft(state, draft, selection) {
  const clean = validateImportDraft(draft);
  if (!Array.isArray(selection.profileFields) || !Array.isArray(selection.equipmentIds) || selection.profileFields.some(key => !PROFILE_IMPORT_FIELDS.includes(key)) || selection.equipmentIds.some(id => !clean.equipment.some(entry => entry.id === id))) throw new Error('Invalid import selection.');
  const patch = Object.fromEntries(selection.profileFields.map(key => [key, clean.profile[key]]));
  const profile = validateProfile({ ...state.profile, ...patch, source: clean.profile.source });
  let equipment = [...state.equipment];
  const selected = clean.equipment.filter(entry => selection.equipmentIds.includes(entry.id));
  if (selection.replaceSourceEquipment) equipment = equipment.filter(entry => entry.relicCardId || entry.source?.characterId !== clean.provenance.characterId || selected.some(item => item.id === entry.id));
  for (const entry of selected) {
    const index = equipment.findIndex(item => item.id === entry.id);
    if (index >= 0 && equipment[index].relicCardId) throw new Error('Imported equipment cannot replace a relic.');
    const updated = { ...entry, characterId: profile.id };
    if (index < 0) equipment.push(updated); else equipment[index] = updated;
  }
  return { profile, equipment };
}
