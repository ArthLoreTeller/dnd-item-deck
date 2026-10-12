import { useCallback, useEffect, useReducer } from 'react';
import { playSound } from '../audio/sound';
import { prefersReducedMotion } from './preference';
import { deckMotionReducer, initialDeckMotion, FLIP_MS, LIFT_MS, CELEBRATE_MS } from './deckMotion';

export function useDeckMotion() {
  const [motion, dispatch] = useReducer(deckMotionReducer, initialDeckMotion);
  useEffect(() => {
    if (motion.phase === 'idle') return;
    const reduced = prefersReducedMotion();
    const delay = reduced ? 0 : motion.phase === 'lifting' ? LIFT_MS : motion.phase === 'celebrating' ? CELEBRATE_MS : FLIP_MS;
    const timer = setTimeout(() => {
      if (motion.phase === 'lifting') dispatch({ type: 'flip' });
      else {
        if (motion.phase === 'revealing' && motion.celebrate) playSound('reveal', motion.card?.rarity);
        dispatch({ type: 'settle' });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [motion]);
  const returnToDeck = useCallback(() => dispatch({ type: 'return' }), []);
  const reconcileInventory = useCallback(inventory => dispatch({ type: 'reconcile-inventory', inventory }), []);
  return { motion, reveal: (card) => dispatch({ type: 'reveal', card, celebrate: true }), select: (card) => dispatch({ type: 'select', card }), returnToDeck, reconcileInventory, discard: (id) => dispatch({ type: 'discard', id }) };
}
