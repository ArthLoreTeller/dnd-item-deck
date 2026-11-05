export const ABILITY_GROUPS = {
  abilities: 'Item abilities',
  level1Abilities: 'Level 1 abilities',
  level2Abilities: 'Level 2 abilities',
  level3Abilities: 'Level 3 abilities',
};

export function abilityGroups(type) {
  return type === 'progressive' ? ['level1Abilities', 'level2Abilities', 'level3Abilities'] : ['abilities'];
}

export function freshDraft() {
  return {
    name: '', rarity: 'common', icon: '', type: 'standard', itemImage: '',
    flavorText: '', attunementRules: '',
    stats: { hit: '', damage: '', saveDc: '' },
    specs: { type: '', properties: '', ranges: '', damage: '', damageType: '' },
    ...Object.fromEntries(Object.keys(ABILITY_GROUPS).map(group => [group, [{ title: '', description: '' }]])),
  };
}

function populated(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
}

function validArtworkUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export function prepareCustomCard(draft) {
  const name = draft.name.trim();
  if (!name) return { error: { tab: 'general', field: 'name', message: 'Enter an item name.' } };
  const itemImage = draft.itemImage.trim();
  if (itemImage && !validArtworkUrl(itemImage)) {
    return { error: { tab: 'general', field: 'itemImage', message: 'Enter a full HTTP or HTTPS artwork URL.' } };
  }

  const card = { name, type: draft.type, rarity: draft.rarity, ...populated({ icon: draft.icon, itemImage, flavorText: draft.flavorText }) };
  const specs = populated(draft.specs);
  if (Object.keys(specs).length) card.specs = specs;
  if (draft.type !== 'normal') {
    const stats = populated(draft.stats);
    if (Object.keys(stats).length) card.stats = stats;
    if (draft.attunementRules.trim()) card.attunementRules = draft.attunementRules.trim();
  }
  for (const group of abilityGroups(draft.type)) {
    const rows = [];
    for (const [index, ability] of draft[group].entries()) {
      const row = populated(ability);
      if (!row.title && row.description) {
        return { error: { tab: 'abilities', field: group + '-' + index, message: 'Enter a title for ' + ABILITY_GROUPS[group].toLowerCase() + ' row ' + (index + 1) + '.' } };
      }
      if (row.title) rows.push(row);
    }
    if (rows.length) card[group] = rows;
  }
  return { card };
}
