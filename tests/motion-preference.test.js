import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefersReducedMotion } from '../src/motion/preference.js';

test('explicit full animations override system reduced motion', () => {
  assert.equal(prefersReducedMotion('full'), false);
});
test('explicit reduced motion stays available', () => {
  assert.equal(prefersReducedMotion('reduced'), true);
});
