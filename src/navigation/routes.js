export function resolvePageHash(hash) {
  const name = hash.replace(/^#\/?/, '').replace(/\/$/, '').replace(/^relic-/, '');
  return ['inventory', 'character'].includes(name) ? name : 'deck';
}
