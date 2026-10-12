// 2024 Basic Rules equipment tables: Wand 1 lb; Dagger 1 lb.
// These homebrew weapon cards explicitly use dagger mechanics.
// https://www.dndbeyond.com/sources/dnd/br-2024/equipment/
const RELIC_WEIGHTS = Object.freeze({
  wand_001: 1,
  cleaver_001: 1,
  kunai_01: 1,
  kunai_02: 1,
  kunai_03: 1,
  kunai_04: 1,
  kunai_05: 1,
});

export function guidelineWeightLb(cardId) {
  return RELIC_WEIGHTS[cardId] ?? null;
}

// Run once when upgrading saved data, so clearing a weight later stays valid.
export function applyGuidelineWeights(state) {
  const fill = entry => entry.unitWeightLb == null && guidelineWeightLb(entry.relicCardId) !== null
    ? { ...entry, unitWeightLb: guidelineWeightLb(entry.relicCardId) }
    : entry;
  return {
    ...state,
    equipment: (state.equipment ?? []).map(fill),
    relicEquipmentCache: Object.fromEntries(Object.entries(state.relicEquipmentCache ?? {}).map(([id, entry]) => [id, fill(entry)])),
  };
}
