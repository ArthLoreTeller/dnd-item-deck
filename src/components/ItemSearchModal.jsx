import { useDialogFocus } from "../hooks/useDialogFocus";
import React, { useState, useMemo, useRef } from 'react';
import { RarityBadge } from './RarityBadge';
import { Search } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { getLucideIcon } from "../components/Icon";

export function ItemSearchModal({ isOpen, onClose, onCardAdded }) {
  const overlayRef = useRef(null);
  useDialogFocus(overlayRef, isOpen, onClose);
  const [searchTerm, setSearchTerm] = useState('');
  const deck = useCardStore((state) => state.deck);
  const drawCardById = useCardStore((state) => state.drawCardById);

  // Filter and sort cards alphabetically (A-Z)
  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    
    // Filter matching cards
    const filtered = !query
      ? [...deck]
      : deck.filter(
          (item) =>
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.type && item.type.toLowerCase().includes(query))
        );

    // Sort alphabetically by name
    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [deck, searchTerm]);

  if (!isOpen) return null;

  const handleSelectCard = (item) => {
    drawCardById(item.id);
    if (onCardAdded) onCardAdded(item);
    onClose();
  };

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        role="dialog" aria-modal="true" aria-labelledby="item-search-title"
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 max-h-[calc(100dvh-32px)] overflow-hidden flex flex-col gap-4 text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 id="item-search-title" className="font-serif font-bold text-amber-200 text-lg">
              Find a relic
            </h3>
          </div>
          <button 
            aria-label="Close relic search"
            onClick={onClose}
            className="close-control text-slate-400 hover:text-white text-sm font-semibold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <input
            aria-label="Search relics by name or type"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or type..."
            autoFocus
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-2 min-h-0 max-h-[320px] overflow-y-auto pr-1">
          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              {deck.length === 0 ? 'Deck is empty!' : 'No matching items found in the deck.'}
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500/50 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <span className="shrink-0 flex items-center justify-center">
                    {getLucideIcon(item)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-amber-100 text-sm truncate">
                      {item.name}
                    </span>
                    <div className="mt-0.5 text-[11px] text-slate-400 capitalize">
                      {item.type || 'Standard'} · <RarityBadge card={item} />
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={() => handleSelectCard(item)}
                  className="shrink-0 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  + Add to inventory
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="text-right border-t border-slate-800/80 pt-2 text-[11px] text-slate-500">
          {deck.length} cards left
        </div>
      </div>
    </div>
  );
}
