import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckMotionReducer, initialDeckMotion } from '../src/motion/deckMotion.js';

test('a draw starts behind the deck and settles on the revealed card', () => {
  const card = { id: 'a' };
  const lifting = deckMotionReducer(initialDeckMotion, { type: 'reveal', card, celebrate: true });
  assert.equal(lifting.face, 'back');
  assert.equal(lifting.phase, 'lifting');
  const flipping = deckMotionReducer(lifting, { type: 'flip' });
  assert.equal(flipping.face, 'front');
  assert.equal(deckMotionReducer(flipping, { type: 'settle' }).card.id, 'a');
});
test('continue retains outgoing artwork until the reverse flip finishes', () => {
  const front = { face: 'front', phase: 'idle', card: { id: 'kept' }, celebrate: true };
  const returning = deckMotionReducer(front, { type: 'return' });
  assert.equal(returning.face, 'back');
  assert.equal(returning.card.id, 'kept');
  assert.equal(returning.celebrate, false);
  const settled = deckMotionReducer(returning, { type: 'settle' });
  assert.equal(settled.card, null);
  assert.equal(settled.phase, 'idle');
});
test('reset cancels an in-flight reveal and stale flip cannot reopen it', () => {
  const lifting = deckMotionReducer(initialDeckMotion, { type: 'reveal', card: { id: 'a' }, celebrate: true });
  const returning = deckMotionReducer(lifting, { type: 'return' });
  assert.equal(deckMotionReducer(returning, { type: 'flip' }).face, 'back');
});
test('inventory selection reveals with rarity celebration', () => {
  const selected = deckMotionReducer(initialDeckMotion, { type: 'select', card: { id: 'owned' } });
  assert.equal(selected.face, 'front');
  assert.equal(selected.celebrate, true);
});

test('rarity celebration starts only after flipping and finishes once', () => {
  const lifting = deckMotionReducer(initialDeckMotion, { type: 'reveal', card: { id: 'a' }, celebrate: true });
  const flipping = deckMotionReducer(lifting, { type: 'flip' });
  assert.equal(flipping.phase, 'revealing');
  const stable = deckMotionReducer(flipping, { type: 'settle' });
  assert.equal(stable.phase, 'celebrating');
  assert.equal(stable.face, 'front');
  assert.equal(stable.celebrate, true);
  const finished = deckMotionReducer(stable, { type: 'settle' });
  assert.equal(finished.phase, 'idle');
  assert.equal(finished.celebrate, false);
});

test('discarding the displayed inventory item starts a return instead of showing stale item actions', () => {
  const front = { face: 'front', phase: 'idle', card: { id: 'a' }, celebrate: false };
  const discarded = deckMotionReducer(front, { type: 'discard', id: 'a' });
  assert.equal(discarded.face, 'back');
  assert.equal(discarded.phase, 'returning');
  assert.equal(discarded.card.id, 'a');
  assert.equal(deckMotionReducer(discarded, { type: 'settle' }).card, null);
});
test('discarding a different inventory item does not disturb the inspected item', () => {
  const front = { face: 'front', phase: 'idle', card: { id: 'a' }, celebrate: false };
  assert.deepEqual(deckMotionReducer(front, { type: 'discard', id: 'b' }), front);
});

test('inventory reconciliation closes removed inspection even when another relic remains', () => {
  const front = { face: 'front', phase: 'idle', card: { id: 'a' }, celebrate: false };
  const reconciled = deckMotionReducer(front, { type: 'reconcile-inventory', inventory: [{ id: 'b' }] });
  assert.equal(reconciled.face, 'back');
  assert.equal(reconciled.phase, 'returning');
  assert.equal(deckMotionReducer(reconciled, { type: 'settle' }).card, null);
  assert.deepEqual(deckMotionReducer(front, { type: 'reconcile-inventory', inventory: [{ id: 'a' }, { id: 'b' }] }), front);
});
