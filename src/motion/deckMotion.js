export const FLIP_MS = 700;
export const LIFT_MS = 120;
export const CELEBRATE_MS = 480;
export const initialDeckMotion = { face: 'back', phase: 'idle', card: null, celebrate: false };
export function deckMotionReducer(state, action) {
  switch (action.type) {
    case 'reconcile-inventory': return state.card && state.phase !== 'returning' && !action.inventory.some(card => card.id === state.card.id) ? { ...state, face: 'back', phase: 'returning', celebrate: false } : state;
    case 'reveal': return { face: 'back', phase: 'lifting', card: action.card, celebrate: Boolean(action.celebrate) };
    case 'select': return { face: 'front', phase: 'revealing', card: action.card, celebrate: true };
    case 'flip': return state.phase === 'lifting' ? { ...state, face: 'front', phase: 'revealing' } : state;
    case 'discard': return state.card?.id === action.id ? { ...state, face: 'back', phase: 'returning', celebrate: false } : state;
    case 'return': return { ...state, face: 'back', phase: 'returning', celebrate: false };
    case 'settle': return state.phase === 'revealing' && state.celebrate
      ? { ...state, phase: 'celebrating' }
      : { ...state, phase: 'idle', card: state.face === 'back' ? null : state.card, celebrate: false };
    default: return state;
  }
}
