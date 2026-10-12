import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePageHash } from '../src/navigation/routes.js';
test('dedicated routes support old bookmarks and unknown fallbacks', () => {
  for (const hash of ['#/inventory', '#relic-inventory', '#/inventory/']) assert.equal(resolvePageHash(hash), 'inventory');
  assert.equal(resolvePageHash('#/character'), 'character');
  for (const hash of ['', '#relic-deck', '#/deck', '#oops']) assert.equal(resolvePageHash(hash), 'deck');
});
