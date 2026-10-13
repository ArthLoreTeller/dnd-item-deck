import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePageHash } from '../src/navigation/routes.js';
test('dedicated routes support old bookmarks and unknown fallbacks', () => {
  for (const hash of ['#/inventory', '#relic-inventory', '#/inventory/']) assert.equal(resolvePageHash(hash), 'inventory');
  assert.equal(resolvePageHash('#/character'), 'character');
  for (const hash of ['', '#relic-deck', '#/deck', '#oops']) assert.equal(resolvePageHash(hash), 'deck');
});

test('all approved companion pages resolve from direct and legacy bookmarks', () => {
  for (const page of ['deck', 'inventory', 'character', 'skills', 'spells', 'spell-tome', 'notes', 'shop', 'settings']) {
    for (const hash of [`#/${page}`, `#/${page}/`, `#relic-${page}`]) assert.equal(resolvePageHash(hash), page, hash);
  }
  for (const hash of ['#/unknown', '#/settings/extra', '#/spell-tomes']) assert.equal(resolvePageHash(hash), 'deck');
});
