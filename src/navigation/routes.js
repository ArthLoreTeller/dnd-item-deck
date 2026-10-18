export function resolvePageHash(hash) {
  const name = hash.replace(/^#\/?/, '').replace(/\/$/, '').replace(/^relic-/, '');
  return ['deck', 'inventory', 'character', 'skills', 'spells', 'spell-tome', 'notes', 'shop', 'settings'].includes(name) ? name : 'deck';
}
