import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeTheme } from './themes.js';
export const useTheme = create(persist((set) => ({
  theme: 'midnight',
  setTheme: (theme) => set({ theme: normalizeTheme(theme) }),
}), { name: 'dnd-item-theme', partialize: ({ theme }) => ({ theme }), merge: (saved, current) => ({ ...current, theme: normalizeTheme(saved?.theme) }) }));
