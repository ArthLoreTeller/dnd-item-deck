import React, { useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { Card } from './Card';

export default function MainDeck() {
  const { deck = [], drawRandomCard, activeCard, setActiveCard, discardCard } = useCardStore();
  const [isDrawn, setIsDrawn] = useState(false);

  const deckCount = deck.length;
  const visibleLayers = Math.min(deckCount, 8);

  const handleDraw = () => {
    if (deckCount === 0) return;
    drawRandomCard();
    setIsDrawn(true);
  };

  const handleReturnToDeck = () => {
    if (activeCard) {
      discardCard(activeCard.id);
    }
    setIsDrawn(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-6 select-none">
      {/* 3D Perspective Flip Container */}
      <div
        className="relative w-80 h-[520px]"
        style={{ perspective: '1200px' }}
      >
        <div
          className="w-full h-full relative transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isDrawn && activeCard ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* --- FRONT: 3D Layered Physical Deck Stack --- */}
          <div
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            <div
              onClick={handleDraw}
              className={`relative w-[280px] h-[440px] cursor-pointer transition-transform duration-300 group ${
                deckCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
              }`}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Stack Depth Layers */}
              {Array.from({ length: visibleLayers }).map((_, index) => (
                <div
                  key={index}
                  className="absolute inset-0 rounded-2xl border border-[#8B5A2B]/60 bg-[#3a2010] shadow-md pointer-events-none transition-transform"
                  style={{
                    transform: `translate3d(-${(index + 1) * 2.5}px, ${(index + 1) * 2.5}px, -${(index + 1) * 5}px)`,
                    zIndex: -index,
                  }}
                />
              ))}

              {/* Top Card Face */}
              <div
                className="w-full h-full rounded-2xl border-2 border-[#AA7826] shadow-2xl bg-center bg-no-repeat bg-[length:100%_100%] flex items-center justify-center relative z-10 transition-shadow duration-300 group-hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                style={{ backgroundImage: "url('/assets/card-back.png')" }}
              >
                {deckCount > 0 ? (
                  <span className="bg-slate-950/80 text-amber-200 font-serif text-sm font-bold px-4 py-2 rounded-xl border border-amber-500/40 backdrop-blur-xs">
                    Draw Loot Card ({deckCount})
                  </span>
                ) : (
                  <span className="bg-slate-950/80 text-amber-400 font-serif text-sm font-bold px-4 py-2 rounded-xl border border-amber-500/50">
                    Deck Empty
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* --- BACK: Full Interactive Card View --- */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {activeCard ? (
              <Card card={activeCard} onResetDeck={handleReturnToDeck} />
            ) : (
              <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 p-4 text-center">
                Select an item from inventory or draw a card
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flip Toggle Button */}
      {isDrawn && (
        <button
          onClick={() => setIsDrawn(false)}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          Flip Back to Deck View
        </button>
      )}
    </div>
  );
}