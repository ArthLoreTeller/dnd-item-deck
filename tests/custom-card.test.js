import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abilityGroups, freshDraft, prepareCustomCard } from '../src/data/customCard.js';

test('a fresh named card only contains selected settings and authored content', () => {
  const first = freshDraft();
  first.name = '  Sunstone ';
  first.abilities[0].title = ' Spark ';
  first.itemImage = ' https://example.org/stone.png ';
  assert.deepEqual(prepareCustomCard(first).card, {
    name: 'Sunstone', rarity: 'common', type: 'standard',
    itemImage: 'https://example.org/stone.png', abilities: [{ title: 'Spark' }],
  });
  const second = freshDraft();
  second.name = 'Moonstone';
  assert.deepEqual(prepareCustomCard(second).card, { name: 'Moonstone', rarity: 'common', type: 'standard' });
});

test('general validation locates empty names and malformed URLs on any tab', () => {
  for (const name of ['', '  ']) assert.equal(prepareCustomCard({ ...freshDraft(), name }).error.field, 'name');
  for (const itemImage of ['broken', 'javascript:alert(1)']) {
    const { error } = prepareCustomCard({ ...freshDraft(), name: 'Rune', itemImage });
    assert.equal(error.tab, 'general');
    assert.equal(error.field, 'itemImage');
  }
});

test('all selected ability groups consistently require a title for a description', () => {
  for (const type of ['normal', 'standard', 'progressive']) {
    for (const group of abilityGroups(type)) {
      const draft = freshDraft();
      Object.assign(draft, { type, name: 'Rune' });
      draft[group][0].description = 'Glows at night';
      const { error } = prepareCustomCard(draft);
      assert.equal(error.tab, 'abilities');
      assert.equal(error.field, group + '-0');
    }
  }
});

test('switching card type excludes hidden abilities and attunement fields', () => {
  const draft = freshDraft();
  Object.assign(draft, { type: 'normal', name: 'Rune', attunementRules: 'Wizards only' });
  draft.level1Abilities[0].description = 'Hidden';
  draft.stats.hit = '+3';
  draft.specs.type = ' Stone ';
  assert.deepEqual(prepareCustomCard(draft).card, {
    name: 'Rune', rarity: 'common', type: 'normal', specs: { type: 'Stone' },
  });
  draft.type = 'progressive';
  draft.level1Abilities[0].title = 'Glow';
  draft.abilities[0].description = 'Hidden';
  assert.deepEqual(prepareCustomCard(draft).card.level1Abilities, [{ title: 'Glow', description: 'Hidden' }]);
});
