import React, { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { Search } from "lucide-react";
import { useCardStore } from "./store/useCardStore";
import { Card } from "./components/Card";
import { ItemSearchModal } from "./components/ItemSearchModal";
import { CustomCardModal } from "./components/CustomCardModal";
import { getLucideIcon } from "./components/Icon"; // Assumes you created this file

// Draggable Inventory Item
function DraggableInventoryCard({
  item,
  isActive,
  onSelect,
  onDiscard,
  disabled,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: disabled,
    });

  const isAttunable = item.type !== "normal";
  const itemIcon = getLucideIcon(item);

  const style = {
    touchAction: disabled ? "auto" : "none",
    WebkitTouchCallout: "none",
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
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
      className={`p-3 rounded-lg border bg-slate-800 text-left transition-all select-none group flex flex-col gap-1 ${
        disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        isActive
          ? "border-amber-400 ring-1 ring-amber-400 bg-slate-700/80"
          : "border-slate-700 hover:border-slate-500"
      }`}
    >
      <div className="flex justify-between items-center w-full">
        <div className="font-semibold text-amber-200 text-sm truncate flex items-center gap-2">
          <span className="shrink-0 flex items-center justify-center">
            {itemIcon}
          </span>
          <span className="truncate">{item.name}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDiscard(item.id);
          }}
          className="text-slate-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          ✕
        </button>
      </div>

      {(isAttunable || item.type === "progressive") && (
        <div className="text-xs text-slate-400 flex justify-between items-center">
          <span>
            {isAttunable ? (item.isAttuned ? "✦ Attuned" : "✧ Unattuned") : ""}
          </span>
          {item.type === "progressive" && (
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
    id: "trash-zone",
  });

  const isCustom = activeCardItem?.id
    ? String(activeCardItem.id).startsWith("custom-")
    : false;

  let labelText = "Drag inventory card here to discard";
  if (isOver) {
    labelText = isCustom
      ? "Permanently delete this custom card"
      : "Discard card back to deck";
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-full p-4 border-2 border-dashed rounded-lg text-center transition-all duration-200 text-sm flex items-center justify-center gap-2 font-medium ${
        isOver
          ? isCustom
            ? "border-red-500 bg-red-950/70 text-red-200 scale-[1.02] shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            : "border-amber-500 bg-amber-950/70 text-amber-200 scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.4)]"
          : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
      }`}
    >
      <span>⃠</span>
      <span>{labelText}</span>
    </div>
  );
}

export default function App() {
  const [isDrawn, setIsDrawn] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [activeDragId, setActiveDragId] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const activeCard = useCardStore((state) => state.activeCard);
  const inventory = useCardStore((state) => state.inventory) || [];
  const deck = useCardStore((state) => state.deck) || [];
  const drawRandomCard = useCardStore((state) => state.drawRandomCard);
  const discardCard = useCardStore((state) => state.discardCard);
  const setActiveCard = useCardStore((state) => state.setActiveCard);
  const resetDeck = useCardStore((state) => state.resetDeck);
  const toastMessage = useCardStore((state) => state.toastMessage);
  const clearToast = useCardStore((state) => state.clearToast);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
  );

  useEffect(() => {
    const cardBackImg = new Image();
    cardBackImg.src = "/assets/card-back.png";

    deck.forEach((card) => {
      if (card?.image) {
        const img = new Image();
        img.src = card.image;
      }
    });
  }, [deck]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(clearToast, 2500);
      return () => clearTimeout(t);
    }
  }, [toastMessage, clearToast]);

  const draggedCard = useMemo(
    () => inventory.find((item) => item.id === activeDragId) || null,
    [inventory, activeDragId],
  );

  const attunedCount = useMemo(
    () => inventory.filter((item) => item.isAttuned).length,
    [inventory],
  );

  const sortedInventory = useMemo(() => {
    const items = [...inventory];
    const sortByName = (a, b) => (a.name || "").localeCompare(b.name || "");

    const typePriority = {
      progressive: 1,
      standard: 2,
      normal: 3,
    };

    switch (sortBy) {
      case "alphabet":
        return items.sort(sortByName);
      case "type":
        return items.sort((a, b) => {
          const weightA = typePriority[a.type?.toLowerCase()] || 99;
          const weightB = typePriority[b.type?.toLowerCase()] || 99;
          return weightA - weightB || sortByName(a, b);
        });
      case "level":
      case "level-desc":
        return items.sort(
          (a, b) =>
            (b.currentLevel || 1) - (a.currentLevel || 1) || sortByName(a, b),
        );
      case "level-asc":
        return items.sort(
          (a, b) =>
            (a.currentLevel || 1) - (b.currentLevel || 1) || sortByName(a, b),
        );
      case "recent":
      default:
        return items;
    }
  }, [inventory, sortBy]);

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && over.id === "trash-zone") {
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
        {toastMessage && (
          <div className="fixed top-16 z-50 bg-amber-950 border-2 border-amber-500 text-amber-200 px-5 py-2.5 rounded-xl shadow-2xl animate-[bounce_0.75s_1_forwards] text-sm font-semibold flex items-center gap-2">
            <span>{toastMessage}</span>
            <button
              onClick={clearToast}
              className="text-amber-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <header className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4 mb-2">
          <div
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full bg-slate-800/80 hover:bg-slate-700/90 border-2 border-amber-500/50 hover:border-amber-400 text-slate-300 px-6 py-3.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center gap-3 cursor-pointer transition-all"
          >
            <Search className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="flex-1 text-left text-sm font-medium placeholder:text-slate-500">
              Search for an item, spell, or card...
            </span>
          </div>

          <div className="w-full">
            <div className="hidden md:flex flex-wrap items-center justify-center gap-3 text-xs bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-full shadow-inner mx-auto w-fit">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">Attunement:</span>
                <div className="flex gap-1 items-center">
                  {[1, 2, 3].map((slot) => (
                    <span
                      key={slot}
                      className={`text-sm transition-transform ${slot <= attunedCount ? "scale-110 text-amber-400" : "opacity-30 text-slate-500"}`}
                    >
                      ✦
                    </span>
                  ))}
                </div>
                <span
                  className={`font-mono font-bold ml-1 ${attunedCount >= 3 ? "text-amber-400" : "text-slate-300"}`}
                >
                  ({attunedCount}/3)
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span>
                Deck:{" "}
                <strong className="text-amber-400 font-semibold">
                  {deck.length}
                </strong>
              </span>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer flex items-center gap-1"
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

            <div className="flex md:hidden w-full bg-slate-800/80 border border-slate-700 rounded-xl shadow-inner overflow-hidden flex-col">
              <div className="flex items-center border-b border-slate-700 divide-x divide-slate-700">
                <div className="flex-1 py-3 px-2 flex items-center justify-center gap-1.5">
                  <span className="text-slate-300 font-medium text-xs">
                    Attunement:
                  </span>
                  <div className="flex gap-0.5 items-center">
                    {[1, 2, 3].map((slot) => (
                      <span
                        key={slot}
                        className={`text-sm transition-transform ${slot <= attunedCount ? "scale-110 text-amber-400" : "opacity-30 text-slate-500"}`}
                      >
                        ✦
                      </span>
                    ))}
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ml-0.5 ${attunedCount >= 3 ? "text-amber-400" : "text-slate-400"}`}
                  >
                    ({attunedCount}/3)
                  </span>
                </div>

                <div className="flex-1 py-3 px-2 flex items-center justify-center gap-2 text-xs">
                  <span className="text-slate-300">Deck Count:</span>
                  <strong className="text-amber-400 font-bold text-sm">
                    {deck.length}
                  </strong>
                </div>
              </div>

              <div className="flex items-center divide-x divide-slate-700">
                <div className="flex-1 py-2 px-2 flex items-center justify-center">
                  <button
                    onClick={() => setIsCustomModalOpen(true)}
                    className="w-full max-w-[150px] border border-amber-500/50 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="text-sm leading-none">✦</span> Custom Card
                  </button>
                </div>

                <div className="flex-1 py-2 px-2 flex items-center justify-center">
                  <button
                    onClick={resetDeck}
                    className="text-amber-500/80 hover:text-amber-300 underline cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span className="text-sm leading-none"></span> ↺ Reset Deck
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-2">
          <div className="md:col-span-7 flex flex-col items-center gap-4">
            <div className="relative w-80 h-[500px] perspective-deck select-none">
              <div
                className={`w-full h-full transition-transform duration-300 ease-out card-preserve-3d relative ${
                  isDrawn ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <div className="absolute inset-0 w-full h-full card-face-front">
                  <div
                    onClick={handleDrawCard}
                    className={`relative w-full h-full cursor-pointer group transition-transform duration-200 ${
                      deck.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : "active:scale-95"
                    }`}
                  >
                    <div
                      className="absolute inset-0 drop-shadow-2xl bg-center bg-no-repeat bg-[length:100%_100%] text-amber-950 transition-all duration-300 select-none group-hover:-translate-y-1 group-hover:drop-shadow-[0_25px_25px_rgba(245,158,11,0.25)] flex items-center justify-center"
                      style={{
                        backgroundImage: "url('/assets/card-back.png')",
                      }}
                    >
                      {deck.length === 0 && (
                        <span className="bg-slate-950/80 text-amber-200 px-3 py-1 rounded border border-amber-500/50 text-sm font-semibold">
                          Deck Empty
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 w-full h-full card-face-back">
                  <div className="w-full h-full">
                    {activeCard ? (
                      <Card
                        card={activeCard}
                        onResetDeck={handleReturnToDeck}
                      />
                    ) : (
                      <div className="w-full h-full border border-slate-700 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 p-4 text-center">
                        Select an item from inventory or draw a card
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 w-full max-w-[280px] transition-all duration-300 ${isDrawn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute"}`}
            >
              {isDrawn && (
                <div className="bg-slate-800/90 border border-slate-700 p-2 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2 backdrop-blur-sm">
                  <button
                    onClick={handleReturnToDeck}
                    className="flex-1 px-3 py-2.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 hover:border-red-500/60 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer shadow-inner active:scale-95 flex justify-center gap-1.5"
                  >
                    Discard
                  </button>

                  <button
                    onClick={() => setIsDrawn(false)}
                    className="flex-1 px-3 py-2.5 bg-slate-900 hover:bg-slate-950 text-amber-400 border border-amber-500/30 hover:border-amber-400/60 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer shadow-inner active:scale-95 flex justify-center gap-1.5"
                  >
                    CONTINUE
                  </button>
                </div>
              )}
            </div>
          </div>

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

            <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
              {sortedInventory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm italic">
                  Your inventory is empty. Tap the deck to draw or create a
                  custom card!
                </div>
              ) : (
                sortedInventory.map((item) => (
                  <DraggableInventoryCard
                    key={item.id}
                    item={item}
                    isActive={activeCard?.id === item.id}
                    onSelect={handleSelectInventoryItem}
                    onDiscard={discardCard}
                    disabled={isMobile}
                  />
                ))
              )}
            </div>

            <div className="hidden md:block mt-2 pt-3 border-t border-slate-700/60">
              <TrashZone activeCardItem={draggedCard} />
            </div>
          </div>
        </div>

        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onCardAdded={(card) => {
            setActiveCard(card);
            setIsDrawn(true);
          }}
        />

        <CustomCardModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
        />
      </div>
    </DndContext>
  );
}