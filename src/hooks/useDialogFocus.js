import { useEffect, useRef } from 'react';

// Inert sibling branches rather than the root, so inline themed dialogs stay active.
export function useDialogFocus(ref, open, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const overlay = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const inertBranches = [];
    for (let branch = overlay; branch.parentElement && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch || sibling.tagName === 'SCRIPT') continue;
        inertBranches.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
    }
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(e => e.tabIndex >= 0 && e.getClientRects().length);
    (overlay.querySelector('[data-initial-focus]') || overlay.querySelector('input:not([type="file"])') || focusable()[0])?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      inertBranches.forEach(([element, original]) => { element.inert = original; });
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [ref, open]);
}
