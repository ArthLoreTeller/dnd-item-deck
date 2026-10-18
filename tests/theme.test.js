import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, normalizeTheme } from '../src/theme/themes.js';
test('unknown saved modes fall back to Midnight', () => { assert.equal(normalizeTheme('old-mode'), 'midnight'); assert.equal(normalizeTheme(null), 'midnight'); });
test('all six environment modes survive normalization', () => { for (const name of ['midnight', 'evergreen', 'love', 'woody', 'warm', 'optic']) assert.equal(normalizeTheme(name), name); });

test('legacy theme keys display the approved names', () => {
  for (const [key, label] of Object.entries({ love: 'Blossom', woody: 'Mahogany', warm: 'Parchment', optic: 'Noir' })) {
    assert.equal(normalizeTheme(key), key);
    assert.equal(THEMES[key].label, label);
  }
});

test('Mahogany select tokens offer readable text on their background', () => {
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
    const linear = rgb.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const foreground = THEMES.woody['select-text'];
  const background = THEMES.woody['select-background'];
  assert.match(foreground ?? '', /^#[0-9a-f]{6}$/i);
  assert.match(background ?? '', /^#[0-9a-f]{6}$/i);
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5);
});

test('saved legacy theme keys hydrate without changing the selected theme', async () => {
  const storage = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } };
  try {
    const { useTheme } = await import('../src/theme/useTheme.js');
    for (const key of ['love', 'woody', 'warm', 'optic']) {
      storage.set('dnd-item-theme', JSON.stringify({ state: { theme: key }, version: 0 }));
      await useTheme.persist.rehydrate();
      assert.equal(useTheme.getState().theme, key);
    }
    useTheme.getState().setTheme('unknown');
    assert.equal(useTheme.getState().theme, 'midnight');
  } finally {
    globalThis.window = previousWindow;
  }
});
