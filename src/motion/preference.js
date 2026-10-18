// Full effects are the app default; 'system' and 'reduced' remain supported.
export function prefersReducedMotion(mode = document.documentElement.dataset.motion) {
  return mode === 'reduced' || (mode !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
