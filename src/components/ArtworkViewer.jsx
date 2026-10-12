import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { RARITIES, normalizeCard } from '../data/rarity';
import { RarityBadge } from './RarityBadge';
import { prefersReducedMotion } from '../motion/preference';

export function ArtworkViewer({ src, card, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const closeRef = useRef(null);
  const rarity = RARITIES[normalizeCard(card).rarity];
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = document.getElementById("root");
    const wasInert = root?.inert;
    if (root) root.inert = true;
    closeRef.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') setIsClosing(true);
      if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      window.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (!isClosing) return;
    const reduced = prefersReducedMotion();
    const timer = setTimeout(onClose, reduced ? 0 : 160);
    return () => clearTimeout(timer);
  }, [isClosing, onClose]);
  const move = (event) => {
    if (prefersReducedMotion()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({ x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)), y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)) });
  };
  return createPortal(
    <div className={`artwork-overlay ${isClosing ? "artwork-closing" : ""}`} onClick={() => setIsClosing(true)}>
      <section role="dialog" aria-modal="true" aria-labelledby="artwork-title" className="artwork-dialog" onClick={(event) => event.stopPropagation()} style={{ '--rarity-color': rarity.color }}>
        <button ref={closeRef} className="artwork-close close-control" onClick={() => setIsClosing(true)} aria-label="Close artwork"><X size={20} /></button>
        <div className="eyebrow">THE RELIQUARY · ITEM INSPECTION</div>
        <h2 id="artwork-title">{card.name}</h2>
        <RarityBadge card={card} />
        <div className="artwork-stage" onPointerMove={move} onPointerDown={(event) => { if (event.pointerType === 'touch') event.currentTarget.setPointerCapture(event.pointerId); move(event); }} onPointerLeave={() => setTilt({ x: 0, y: 0 })} onPointerUp={() => setTilt({ x: 0, y: 0 })} onPointerCancel={() => setTilt({ x: 0, y: 0 })}>
          <div className="artwork-depth" style={{ transform: `rotateX(${-tilt.y * 9}deg) rotateY(${tilt.x * 12}deg)`, '--light-x': `${50 + tilt.x * 35}%`, '--light-y': `${50 + tilt.y * 35}%` }}>
            <div className="artwork-runes" aria-hidden="true">✧ · ✦ · ✧</div>
            <div className="artwork-aura" />
            <img className="artwork-layer" src={src} alt={card.name} style={{ transform: `translate3d(${tilt.x * 15}px, ${tilt.y * 12}px, 65px)` }} />
            <div className="artwork-shine" />
            <div className="artwork-frame" />
          </div>
        </div>
        <p className="artwork-hint">Move your cursor or slide your finger to explore the enchantment.</p>
      </section>
    </div>, document.body,
  );
}
