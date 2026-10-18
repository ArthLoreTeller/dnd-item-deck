export function enhancementKindFor(previous, current) {
  return previous?.currentLevel !== current?.currentLevel ? 'progression' : 'attunement';
}
