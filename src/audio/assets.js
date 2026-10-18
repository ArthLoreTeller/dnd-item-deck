// Replace these waiting markers with supplied asset paths when the new SFX arrive.
export const SFX_ASSETS = {
  click: 'WAITING_FOR_NEW_SFX',
  dice: 'WAITING_FOR_NEW_SFX',
  draw: 'WAITING_FOR_NEW_SFX',
  continue: 'WAITING_FOR_NEW_SFX',
  reset: 'WAITING_FOR_NEW_SFX',
  discard: 'WAITING_FOR_NEW_SFX',
  attune: 'WAITING_FOR_NEW_SFX',
  reveal: {
    common: 'WAITING_FOR_NEW_SFX',
    uncommon: 'WAITING_FOR_NEW_SFX',
    rare: 'WAITING_FOR_NEW_SFX',
    epic: 'WAITING_FOR_NEW_SFX',
    legendary: 'WAITING_FOR_NEW_SFX',
  },
};

export function isReadySfxPath(path) {
  return typeof path === 'string' && path.trim() !== '' && path.trim() !== 'WAITING_FOR_NEW_SFX';
}
