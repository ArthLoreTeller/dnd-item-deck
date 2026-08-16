import React, { useState, useMemo } from 'react';
import { useCardStore } from '../store/useCardStore';

export function ItemSearchModal({ isOpen, onClose, onCardAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const deck = useCardStore((state) => state.deck) || [];
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔎︎</span>
            <h3 className="font-serif font-bold text-amber-200 text-lg">
              Search & Add Item
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-semibold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <input
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
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
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
                <div className="flex flex-col min-w-0 pr-3">
                  <span className="font-semibold text-amber-100 text-sm truncate">
                    {item.name}
                  </span>
                  <div className="mt-0.5 text-[11px] text-slate-400 capitalize">
                    {item.type || 'Standard'}
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={() => handleSelectCard(item)}
                  className="shrink-0 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  + Add to Bag
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="text-right border-t border-slate-800/80 pt-2 text-[11px] text-slate-500">
          Showing {searchResults.length} of {deck.length} remaining cards
        </div>
      </div>
    </div>
  );
}