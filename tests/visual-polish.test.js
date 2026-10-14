import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const stylesheet = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const css = postcss.parse(stylesheet);

function declarations(selector) {
  const values = {};
  css.walkRules(rule => {
    if (rule.selector !== selector) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('Corner Menu icons share the toggle alignment axis', () => {
  const shortcuts = declarations('.orbit-shortcuts');
  const icons = declarations('.collection-orbit svg');
  assert.equal(shortcuts.left, '0');
  assert.equal(shortcuts.padding, '0');
  assert.equal(icons.display, 'block');
});

test('Settings attribution has a deliberate gap from the preferences panel', () => {
  assert.equal(declarations('.settings-attribution')['margin-top'], '16px');
});

test('mini inventory level is positioned beneath the discard control', () => {
  const level = declarations('.mini-inventory-level');
  assert.equal(level.position, 'absolute');
  assert.equal(level.right, '9px');
  assert.equal(level.top, '48px');
});

test('attunement uses a raised control and an opaque midpoint veil', () => {
  assert.equal(declarations('.card-attune-control').bottom, '34px');
  const aura = declarations('.attunement-aura');
  assert.match(aura.background, /radial-gradient/);
  assert.match(aura['backdrop-filter'], /blur/);
  assert.equal(aura['animation-duration'], '640ms');

  assert.match(stylesheet, /@keyframes attunement-out[\s\S]*blur\(2px\)[\s\S]*scale\(1\.035\)/);
  assert.match(stylesheet, /@keyframes attunement-in[\s\S]*blur\(3px\)[\s\S]*scale\(\.96\)/);
  assert.match(stylesheet, /@keyframes attunement-aura[\s\S]*4[456]%\s*\{\s*opacity:\s*1/);
});
