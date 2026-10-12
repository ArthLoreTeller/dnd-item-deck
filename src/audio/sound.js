import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSoundSettings = create(persist((set) => ({
  muted: false,
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
}), { name: 'dnd-item-sound-settings' }));

let context;
// Small synthesized chimes keep the app self-contained and work offline.
export function playSound(kind = 'click', rarity = 'common') {
  if (useSoundSettings.getState().muted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context ||= new AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => {});
    const tones = kind === 'dice' ? [160, 220, 180, 260, 200, 320] : kind === 'draw' ? [261.63, 392, 523.25, 783.99]
      : kind === 'reveal' ? ({ common: [392, 523], uncommon: [440, 659], rare: [523, 784, 1047], epic: [523, 659, 784, 1047], legendary: [523, 659, 784, 1047, 1568] }[rarity] || [392, 523])
      : kind === 'continue' ? [659, 523] : kind === 'reset' ? [523, 392, 261.63] : kind === 'discard' ? [330, 220] : kind === 'attune' ? [440, 554, 659] : [880, 1108];
    const now = context.currentTime;
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * (kind === 'click' ? 0.025 : 0.075);
      const duration = kind === 'click' ? 0.09 : 0.4;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === 'click' ? 0.025 : 0.05, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Audio support must never prevent a card action. */ }
}
