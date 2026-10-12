import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme } from '../src/theme/themes.js';
test('unknown saved modes fall back to Midnight', () => { assert.equal(normalizeTheme('old-mode'), 'midnight'); assert.equal(normalizeTheme(null), 'midnight'); });
test('all six environment modes survive normalization', () => { for (const name of ['midnight', 'evergreen', 'love', 'woody', 'warm', 'optic']) assert.equal(normalizeTheme(name), name); });
