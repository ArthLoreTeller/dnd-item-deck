import { test } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.window = { localStorage: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
} };
const sound = await import('../src/audio/sound.js');

test('replacement sounds remain explicitly waiting and skip playback', async () => {
  const { SFX_ASSETS, isReadySfxPath } = await import('../src/audio/assets.js');
  let audioCount = 0;
  globalThis.Audio = class { constructor() { audioCount++; } };
  const { useSoundSettings, playSound } = sound;
  useSoundSettings.setState({ muted: false, volume: 1 });
  for (const kind of ['click', 'dice', 'draw', 'continue', 'reset', 'discard', 'attune']) {
    assert.equal(SFX_ASSETS[kind], 'WAITING_FOR_NEW_SFX');
    await playSound(kind);
  }
  for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
    assert.equal(SFX_ASSETS.reveal[rarity], 'WAITING_FOR_NEW_SFX');
    await playSound('reveal', rarity);
  }
  for (const path of [undefined, null, '', '   ', 'WAITING_FOR_NEW_SFX', ' WAITING_FOR_NEW_SFX ']) assert.equal(isReadySfxPath(path), false);
  assert.equal(isReadySfxPath('/audio/click.ogg'), true);
  await playSound('unknown');
  assert.equal(audioCount, 0);
  delete globalThis.Audio;
});

test('settings clamp volume and persist only preferences', () => {
  const { useSoundSettings } = sound;
  const state = useSoundSettings.getState();
  assert.equal(state.reducedMotion, false);
  assert.equal(typeof state.setVolume, 'function');
  for (const [input, expected] of [[-1, 0], [2, 1], [0.35, 0.35], ['0.6', 0.6], [NaN, 1], [Infinity, 1]]) {
    state.setVolume(input);
    assert.equal(useSoundSettings.getState().volume, expected);
  }
  state.setReducedMotion(true);
  assert.equal(useSoundSettings.getState().reducedMotion, true);
  const before = useSoundSettings.getState().muted;
  state.toggleMuted();
  assert.equal(useSoundSettings.getState().muted, !before);
  assert.deepEqual(JSON.parse(storage.get('dnd-item-sound-settings')).state, { muted: !before, volume: 1, reducedMotion: true });
});

test('legacy muted preferences survive hydration with safe new defaults and live actions', async () => {
  const { useSoundSettings } = sound;
  useSoundSettings.setState({ muted: false, volume: 1, reducedMotion: false });
  storage.set('dnd-item-sound-settings', JSON.stringify({ state: { muted: true, toggleMuted: 'obsolete' }, version: 0 }));
  await useSoundSettings.persist.rehydrate();
  const state = useSoundSettings.getState();
  assert.equal(state.muted, true);
  assert.equal(state.volume, 1);
  assert.equal(state.reducedMotion, false);
  assert.equal(typeof state.toggleMuted, 'function');
  state.toggleMuted();
  assert.equal(useSoundSettings.getState().muted, false);
  storage.set('dnd-item-sound-settings', JSON.stringify({ state: { muted: false, volume: 8, reducedMotion: 'invalid' }, version: 0 }));
  await useSoundSettings.persist.rehydrate();
  assert.equal(useSoundSettings.getState().volume, 1);
  assert.equal(useSoundSettings.getState().reducedMotion, false);
});

test('ready assets receive volume while rejected and throwing playback stays silent', async () => {
  const { SFX_ASSETS } = await import('../src/audio/assets.js');
  const { useSoundSettings, playSound } = sound;
  const previous = SFX_ASSETS.click;
  const previousReveal = SFX_ASSETS.reveal.rare;
  const played = [];
  try {
    SFX_ASSETS.click = '/audio/missing.ogg';
    SFX_ASSETS.reveal.rare = '/audio/rare.ogg';
    useSoundSettings.setState({ muted: false, volume: 0.4 });
    globalThis.Audio = class {
      constructor(path) { this.path = path; }
      play() { played.push({ path: this.path, volume: this.volume }); return Promise.reject(new Error('missing audio')); }
    };
    await assert.doesNotReject(Promise.resolve(playSound('click')));
    await assert.doesNotReject(Promise.resolve(playSound('reveal', 'rare')));
    assert.deepEqual(played, [{ path: '/audio/missing.ogg', volume: 0.4 }, { path: '/audio/rare.ogg', volume: 0.4 }]);
    globalThis.Audio = class { constructor() { throw new Error('audio unavailable'); } };
    assert.doesNotThrow(() => playSound('click'));
    globalThis.Audio = class { play() { throw new Error('play unavailable'); } };
    assert.doesNotThrow(() => playSound('click'));
  } finally {
    SFX_ASSETS.click = previous;
    SFX_ASSETS.reveal.rare = previousReveal;
    delete globalThis.Audio;
  }
});

test('muted and zero-volume settings skip ready sounds', async () => {
  const { SFX_ASSETS } = await import('../src/audio/assets.js');
  const { useSoundSettings, playSound } = sound;
  const previous = SFX_ASSETS.click;
  let audioCount = 0;
  globalThis.Audio = class { constructor() { audioCount++; } play() {} };
  try {
    SFX_ASSETS.click = '/audio/click.ogg';
    useSoundSettings.setState({ muted: true, volume: 1 });
    await playSound('click');
    useSoundSettings.setState({ muted: false, volume: 0 });
    await playSound('click');
    assert.equal(audioCount, 0);
  } finally {
    SFX_ASSETS.click = previous;
    delete globalThis.Audio;
  }
});
