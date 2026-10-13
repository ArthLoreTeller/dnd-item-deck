import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import { THEMES } from '../src/theme/themes.js';

test('Shop page Inventory focus ring contrasts with the page surface in every theme', async () => {
  const css = postcss.parse(await readFile(new URL('../src/index.css', import.meta.url), 'utf8'));
  let outline;
  // Apply the shared Shop focus declaration followed by the more specific
  // page-title link rule. The ring sits outside the button on the page surface.
  css.walkRules(rule => {
    if (rule.selector !== '.notes-page :is(textarea,button):focus-visible, .shop-page :is(input,select,button,a):focus-visible' &&
        rule.selector !== '.shop-page > .page-title-row > a:focus-visible') return;
    rule.walkDecls(declaration => {
      if (declaration.prop === 'outline') outline = declaration.value.split(' ').at(-1);
      if (declaration.prop === 'outline-color') outline = declaration.value;
    });
  });
  const luminance = hex => {
    const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  for (const theme of Object.values(THEMES)) {
    assert.ok(outline, 'Inventory must have a visible focus ring');
    const color = outline.replace(/var\(--env-([\w-]+)\)/, (_, key) => theme[key]);
    const levels = [luminance(color), luminance(theme.background)].sort((a, b) => b - a);
    const contrast = (levels[0] + .05) / (levels[1] + .05);
    assert.ok(contrast >= 3, `${theme.label} Inventory focus contrast ${contrast.toFixed(2)} must be at least 3:1`);
  }
});
