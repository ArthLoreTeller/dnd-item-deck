import React, { useState, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor 
} from '@dnd-kit/core';
import { useCardStore } from './store/useCardStore';
import { Card } from './components/Card';
import { ItemSearchModal } from './components/ItemSearchModal';
import { CustomCardModal } from './components/CustomCardModal';

// Draggable Inventory Item
function DraggableInventoryCard({ item, isActive, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const isAttunable = item.type !== 'normal';

  const style = {
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(item)}
      className={`p-3 rounded-lg border bg-slate-800 text-left transition-all cursor-grab active:cursor-grabbing select-none ${
        isActive
          ? 'border-amber-400 ring-1 ring-amber-400 bg-slate-700/80'
          : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="font-semibold text-amber-200 text-sm truncate">
        {item.name}
      </div>

      {(isAttunable || item.type === 'progressive') && (
        <div className="text-xs text-slate-400 flex justify-between items-center mt-1">
          <span>
            {isAttunable ? (item.isAttuned ? '✦ Attuned' : '✧ Unattuned') : ''}
          </span>
          {item.type === 'progressive' && (
            <span className="text-amber-400 font-mono text-[11px]">
              Lv. {item.currentLevel || 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Droppable Trash Target
function TrashZone({ activeCardItem }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-zone',
  });

  const isCustom = activeCardItem?.id
    ? String(activeCardItem.id).startsWith('custom-')
    : false;
  
  let labelText = 'Drag inventory card here to discard';
  if (isOver) {
    labelText = isCustom 
      ? 'Permanently delete this custom card' 
      : 'Discard card back to deck';
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-full p-4 border-2 border-dashed rounded-lg text-center transition-all duration-200 text-sm flex items-center justify-center gap-2 font-medium ${
        isOver
          ? isCustom
            ? 'border-red-500 bg-red-950/70 text-red-200 scale-[1.02] shadow-[0_0_15px_rgba(239,68,68,0.4)]'
            : 'border-amber-500 bg-amber-950/70 text-amber-200 scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
          : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
      }`}
    >
      <span>⃠</span>
      <span>{labelText}</span>
    </div>
  );
}

export default function App() {
  const [isDrawn, setIsDrawn] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [activeDragId, setActiveDragId] = useState(null);
  
  // Modal Visibility States
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Store Selectors
  const activeCard = useCardStore((state) => state.activeCard);
  const inventory = useCardStore((state) => state.inventory) || [];
  const deck = useCardStore((state) => state.deck) || [];
  const drawRandomCard = useCardStore((state) => state.drawRandomCard);
  const discardCard = useCardStore((state) => state.discardCard);
  const setActiveCard = useCardStore((state) => state.setActiveCard);
  const resetDeck = useCardStore((state) => state.resetDeck);
  const toastMessage = useCardStore((state) => state.toastMessage);
  const clearToast = useCardStore((state) => state.clearToast);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(clearToast, 2500);
      return () => clearTimeout(t);
    }
  }, [toastMessage, clearToast]);

  const draggedCard = useMemo(
    () => inventory.find((item) => item.id === activeDragId) || null,
    [inventory, activeDragId]
  );

  const attunedCount = useMemo(
    () => inventory.filter((item) => item.isAttuned).length,
    [inventory]
  );

  const sortedInventory = useMemo(() => {
    const items = [...inventory];
    const sortByName = (a, b) => (a.name || '').localeCompare(b.name || '');
    switch (sortBy) {
      case 'alphabet':
        return items.sort(sortByName);
      case 'type':
        return items.sort((a, b) => 
          (a.type || '').localeCompare(b.type || '') || sortByName(a, b)
        );
      case 'level':
      case 'level-desc':
        return items.sort((a, b) => 
          ((b.currentLevel || 1) - (a.currentLevel || 1)) || sortByName(a, b)
        );
      case 'level-asc':
        return items.sort((a, b) => 
          ((a.currentLevel || 1) - (b.currentLevel || 1)) || sortByName(a, b)
        );
      case 'recent':
      default:
        return items;
    }
  }, [inventory, sortBy]);

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && over.id === 'trash-zone') {
      discardCard(active.id);
    }
    setActiveDragId(null);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleDrawCard = () => {
    if (deck.length === 0) return;
    drawRandomCard();
    setIsDrawn(true);
  };

  const handleReturnToDeck = () => {
    if (activeCard) {
      discardCard(activeCard.id);
    }
    setIsDrawn(false);
  };

  const handleSelectInventoryItem = (card) => {
    setActiveCard(card);
    setIsDrawn(true);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 gap-6 relative">
        
        {/* Toast Warning Banner */}
        {toastMessage && (
          <div className="fixed top-15 z-50 bg-amber-950 border-2 border-amber-500 text-amber-200 px-5 py-2.5 rounded-xl shadow-2xl animate-[bounce_0.75s_1_forwards] text-sm font-semibold flex items-center gap-2">
            <span>{toastMessage}</span>
            <button onClick={clearToast} className="text-amber-400 hover:text-white font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* Header */}
        <header className="text-center flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold tracking-wide text-amber-200 font-serif">
            D&D Item Deck
          </h1>

          {/* Attunement Tracker & Action HUD */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-full shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Attunement:</span>
              <div className="flex gap-1 items-center">
                {[1, 2, 3].map((slot) => (
                  <span
                    key={slot}
                    className={`text-sm transition-transform ${
                      slot <= attunedCount ? 'scale-110 text-amber-400' : 'opacity-30 text-slate-500'
                    }`}
                  >
                    ✦
                  </span>
                ))}
              </div>
              <span className={`font-mono font-bold ml-1 ${attunedCount >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                ({attunedCount}/3)
              </span>
            </div>

            <span className="text-slate-600">|</span>

            <span>
              Deck: <strong className="text-amber-400 font-semibold">{deck.length}</strong>
            </span>

            <span className="text-slate-600">|</span>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>🔎︎</span> Search Deck
            </button>

            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>✦</span> Custom Card
            </button>

            <span className="text-slate-600">|</span>

            <button
              onClick={resetDeck}
              className="text-amber-500/80 hover:text-amber-300 underline cursor-pointer text-[11px]"
            >
              Reset Deck
            </button>
          </div>
        </header>

        {/* Main Application Layout */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-2">
          
          {/* --- LEFT: CARD DECK & VIEWER --- */}
          <div className="md:col-span-7 flex flex-col items-center gap-4">
            <div className="relative w-80 h-[500px] [perspective:1000px]">
              <div
                className={`w-full h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] relative ${
                  isDrawn ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                {/* Deck Stack */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                  <div
                    onClick={handleDrawCard}
                    className={`relative w-full h-full cursor-pointer group transition-transform duration-200 ${
                      deck.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                    }`}
                  >
                    <div
                      className="absolute inset-0 drop-shadow-2xl bg-center bg-no-repeat bg-[length:100%_100%] text-amber-950 transition-all duration-300 select-none group-hover:-translate-y-1 group-hover:drop-shadow-[0_25px_25px_rgba(245,158,11,0.25)] flex items-center justify-center"
                      style={{ backgroundImage: "url('/assets/card-back.png')" }}
                    >
                      {deck.length === 0 && (
                        <span className="bg-slate-950/80 text-amber-200 px-3 py-1 rounded border border-amber-500/50 text-sm font-semibold">
                          Deck Empty
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Card Front */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="w-full h-full">
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
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className={`text-xs text-slate-400 transition-opacity duration-300 ${isDrawn ? 'opacity-0' : 'opacity-100'}`}>
                Tap the deck to draw an item card
              </p>
              {isDrawn && (
                <button
                  onClick={() => setIsDrawn(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Flip Back to Deck View
                </button>
              )}
            </div>
          </div>

          {/* --- RIGHT: INVENTORY & DISCARD --- */}
          <div className="md:col-span-5 flex flex-col gap-4 bg-slate-800/40 border border-slate-800 p-5 rounded-2xl">
            <div className="flex justify-between items-center border-b border-slate-700/60 pb-3 gap-2">
              <h2 className="text-lg font-bold text-amber-200 font-serif">
                Inventory ({inventory.length})
              </h2>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-amber-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="recent">Recent</option>
                  <option value="alphabet">Alphabet (A-Z)</option>
                  <option value="type">Type</option>
                  <option value="level-desc">Level (High-Low)</option>
                  <option value="level-asc">Level (Low-High)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
              {sortedInventory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm italic">
                  Your inventory is empty. Tap the deck to draw or create a custom card!
                </div>
              ) : (
                sortedInventory.map((item) => (
                  <DraggableInventoryCard
                    key={item.id}
                    item={item}
                    isActive={activeCard?.id === item.id}
                    onSelect={handleSelectInventoryItem}
                  />
                ))
              )}
            </div>

            <div className="mt-2 pt-3 border-t border-slate-700/60">
              <TrashZone activeCardItem={draggedCard} />
            </div>
          </div>

        </div>

        {/* Search Modal */}
        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onCardAdded={(card) => {
            setActiveCard(card);
            setIsDrawn(true);
          }}
        />

        {/* Custom Card Creator Modal */}
        <CustomCardModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
        />

        
      </div>
    </DndContext>
  );
}