import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const stylesheet = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const css = postcss.parse(stylesheet);

function declarations(selector) {
  const values = {};
  css.walkRules(rule => {
    if (rule.selector !== selector || rule.parent.type === 'atrule') return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

function mediaDeclarations(query, selector) {
  const values = {};
  css.walkAtRules('media', media => {
    if (media.params !== query) return;
    media.walkRules(rule => {
      if (rule.selector !== selector) return;
      rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    });
  });
  return values;
}

test('Corner Menu icons share the toggle alignment axis', () => {
  const shortcuts = declarations('.orbit-shortcuts');
  const icons = declarations('.collection-orbit svg');
  assert.equal(shortcuts.left, '0');
  assert.equal(shortcuts.padding, '0');
  assert.equal(shortcuts['grid-template-columns'], '46px');
  assert.match(shortcuts['max-height'], /100dvh/);
  assert.equal(icons.display, 'block');
});

test('Corner Menu compacts and keeps hidden-scroll access on short screens', () => {
  const shortcuts = mediaDeclarations('(max-height: 700px)', '.orbit-shortcuts');
  const controls = mediaDeclarations('(max-height: 700px)', '.reliquary .collection-orbit :is(a,button)');
  assert.equal(shortcuts['grid-template-columns'], '40px');
  assert.equal(shortcuts.left, '-4px');
  assert.equal(shortcuts.gap, '4px');
  assert.equal(shortcuts.padding, '0 4px');
  assert.equal(shortcuts['overflow-y'], 'auto');
  assert.equal(shortcuts['scrollbar-width'], 'none');
  assert.equal(controls.width, '40px');
  assert.equal(controls.height, '40px');
  assert.equal(controls['min-height'], '40px');
  const focus = mediaDeclarations('(max-height: 700px)', '.collection-orbit :is(a,button):focus-visible');
  assert.equal(focus.outline, 'none');
  assert.match(focus['box-shadow'], /inset 0 0 0 3px/);
  const contentHeight = (9 * 40) + (3 * 1) + (11 * 4);
  assert.ok(contentHeight <= 480 - 66, 'all controls and dividers fit at 800×480');
});

test('progression upgrades use a compact rune-burn effect', () => {
  const aura = declarations('.progression-aura');
  assert.equal(aura.inset, '18%');
  assert.match(declarations('.progression-aura::before').background, /conic-gradient/);
  assert.match(declarations('.progression-aura::after').animation, /progression-rune-burn/);
  assert.match(stylesheet, /@keyframes progression-rune-burn/);
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

test('attunement uses a raised control and an edge-burn transition', () => {
  assert.equal(declarations('.card-attune-control').bottom, '34px');
  const aura = declarations('.attunement-aura');
  assert.equal(aura.background, 'transparent');
  assert.match(aura['backdrop-filter'], /blur/);
  assert.equal(aura['animation-duration'], '760ms');

  const fire = declarations('.attunement-aura::before');
  const embers = declarations('.attunement-aura::after');
  assert.match(fire.background, /conic-gradient/);
  assert.match(fire.animation, /attunement-fire-edge/);
  assert.match(embers.background, /radial-gradient/);
  assert.match(embers.animation, /attunement-embers/);

  assert.match(stylesheet, /@keyframes attunement-fire-edge/);
  assert.match(stylesheet, /@keyframes attunement-embers/);
  assert.match(stylesheet, /@keyframes attunement-aura[\s\S]*4[456]%\s*\{[^}]*background-color:\s*#[0-9a-f]{8}/i);
});
