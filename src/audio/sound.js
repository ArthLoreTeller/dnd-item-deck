import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SFX_ASSETS, isReadySfxPath } from './assets.js';

function clampVolume(value) {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 1;
}

export const useSoundSettings = create(persist((set) => ({
  muted: false,
  volume: 1,
  reducedMotion: false,
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
  setVolume: (value) => set({ volume: clampVolume(value) }),
  setReducedMotion: (value) => set({ reducedMotion: Boolean(value) }),
}), {
  name: 'dnd-item-sound-settings',
  partialize: ({ muted, volume, reducedMotion }) => ({ muted, volume, reducedMotion }),
  merge: (saved, current) => ({
    ...current,
    muted: typeof saved?.muted === 'boolean' ? saved.muted : current.muted,
    volume: clampVolume(saved?.volume ?? current.volume),
    reducedMotion: typeof saved?.reducedMotion === 'boolean' ? saved.reducedMotion : current.reducedMotion,
  }),
}));

export function playSound(kind = 'click', rarity = 'common') {
  const { muted, volume } = useSoundSettings.getState();
  const path = kind === 'reveal' ? SFX_ASSETS.reveal[rarity] : SFX_ASSETS[kind];
  if (muted || volume === 0 || !isReadySfxPath(path)) return;
  try {
    if (typeof globalThis.Audio !== 'function') return;
    const audio = new globalThis.Audio(path);
    audio.volume = volume;
    return Promise.resolve(audio.play()).catch(() => {});
  } catch { /* Audio support must never prevent a card action. */ }
}
