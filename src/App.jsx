import { DeckPage } from './pages/DeckPage';
import { InventoryPage } from './pages/InventoryPage';
import { CharacterPage } from './pages/CharacterPage';
import { SkillsPage } from './pages/SkillsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CharacterImportDialog } from './components/CharacterImportDialog';
import { usePageRoute } from './navigation/usePageRoute';
import { createPortal } from "react-dom";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "./theme/useTheme";
import { THEMES } from "./theme/themes";
import { useDeckMotion } from "./motion/useDeckMotion";


import { playSound, useSoundSettings } from "./audio/sound";
import { Search, Dices } from "lucide-react";
import { useCardStore } from "./store/useCardStore";
import { DiceTray } from "./components/DiceTray";

import { ItemSearchModal } from "./components/ItemSearchModal";
import { CustomCardModal } from "./components/CustomCardModal";
import { ItemDetails } from "./components/ItemDetails";
import { InventoryTools } from "./components/InventoryTools";
import { CollectionNavigation } from "./components/CollectionNavigation";

const pendingPages = { spells: 'Spells', 'spell-tome': 'Spell Tome', notes: 'Notes', shop: 'Shop' };

export default function App() {
  const { motion, reveal, select, returnToDeck, reconcileInventory } = useDeckMotion();
  const isDrawn = motion.face === "front";
  const isRevealing = motion.phase !== "idle";
  const [diceOpen, setDiceOpen] = useState(false);
  const closeDice = useCallback(() => setDiceOpen(false), []);
  const theme = useTheme((state) => state.theme);
  const reducedMotion = useSoundSettings((state) => state.reducedMotion);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [reducedMotion]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const palette = THEMES[theme];
    for (const [key, value] of Object.entries(palette)) { if (key !== "label") document.documentElement.style.setProperty(`--env-${key}`, value); }
  }, [theme]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [detailsCardId, setDetailsCardId] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const { page, navigate } = usePageRoute();
  const [importOpen, setImportOpen] = useState(false);
  const activeCard = useCardStore((state) => state.activeCard);
  const inventory = useCardStore((state) => state.inventory);
  const deck = useCardStore((state) => state.deck);
  const drawRandomCard = useCardStore((state) => state.drawRandomCard);
  const discardCard = useCardStore((state) => state.discardCard);
  const setActiveCard = useCardStore((state) => state.setActiveCard);
  const resetDeck = useCardStore((state) => state.resetDeck);
  const toastMessage = useCardStore((state) => state.toastMessage);
  const clearToast = useCardStore((state) => state.clearToast);

  const lastDiscard = useCardStore((state) => state.lastDiscard);
  const undoDiscard = useCardStore((state) => state.undoDiscard);

  useEffect(() => {
    const cardBackImg = new Image();
    cardBackImg.src = "/assets/card-back.png";

  }, []);

  useEffect(() => {
    if (toastMessage) {
      if (lastDiscard) return;
      const t = setTimeout(clearToast, 6000);
      return () => clearTimeout(t);
    }
  }, [toastMessage, clearToast, lastDiscard]);

  const attunedCount = useMemo(
    () => inventory.filter((item) => item.isAttuned).length,
    [inventory],
  );

  const displayedCard = inventory.find(card => card.id === motion.card?.id) || motion.card;
  const detailsCard = inventory.find(card => card.id === detailsCardId);

  useEffect(() => {
    reconcileInventory(inventory);
    if (detailsCardId !== null && !inventory.some(card => card.id === detailsCardId)) setDetailsCardId(null);
  }, [inventory, motion.card, detailsCardId, reconcileInventory]);

  useEffect(() => {
    if (!activeCard && motion.face === "front") returnToDeck();
  }, [activeCard, motion.face, returnToDeck]);

  const handleDrawCard = () => {
    if (deck.length === 0 || isRevealing) return;
    playSound("draw");
    drawRandomCard();
    reveal(useCardStore.getState().activeCard);
  };

  const handleResetDeck = () => {
    if (!window.confirm('Reset all standard relics? They will return to the deck and their edits, attunement, and progression will reset. Custom cards and recovery are kept. Download a backup first if you want to preserve standard relic edits.')) return;
    playSound("reset");
    returnToDeck();
    resetDeck();

  };

  const handleContinue = () => {
    playSound("continue");
    returnToDeck();
  };


  const handleReturnToDeck = () => {
    playSound("discard");
    returnToDeck();
    if (displayedCard) discardCard(displayedCard.id);
  };

  const handleSelectInventoryItem = (card) => {
    if (isRevealing) return;
    setActiveCard(card);
    select(card);
  };

  return (
      <div onClickCapture={(event) => {
        if (event.target.closest("button, select, [role=button]") && !event.target.closest("[data-silent]")) playSound("click");
      }} className="reliquary min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 gap-6 relative">
        {diceOpen && <DiceTray onClose={closeDice} />}
        {detailsCard && <ItemDetails card={detailsCard} onClose={() => setDetailsCardId(null)} />}
        {importOpen && <CharacterImportDialog onClose={() => setImportOpen(false)} />}
        {toolsOpen && <InventoryTools onClose={() => setToolsOpen(false)} onRestored={card => { if (card) select(card); }} />}
        {toastMessage && createPortal(
          <div role="status" className="notification-toast toast-enter">
            <span>{toastMessage}</span>
            {lastDiscard && <button className="journal-button" onClick={() => { undoDiscard(); const restored = useCardStore.getState().activeCard; if (restored) select(restored); }}>Undo discard</button>}
            <button
              aria-label="Dismiss notification"
              onClick={clearToast}
              className="close-control font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>, document.body
        )}

        <header className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 mb-2">
          <div className="reliquary-heading">
            <div><p className="eyebrow">YOUR ADVENTURE, ENSHRINED · v1.2</p><h1>The Reliquary</h1><p className="heading-subtitle">Draw a relic. Discover its magic. Make it yours.</p></div>
          </div>
          {['deck', 'character'].includes(page) && <div className="contextual-actions"><button type="button" className="journal-button" aria-label="Roll D20" aria-haspopup="dialog" onClick={() => setDiceOpen(true)}><Dices size={18} aria-hidden="true" />Roll D20</button></div>}
          {page === 'deck' && <><button type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full bg-slate-800/80 hover:bg-slate-700/90 border-2 border-amber-500/50 hover:border-amber-400 text-slate-300 px-6 py-3.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center gap-3 cursor-pointer transition-all"
          >
            <Search className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="flex-1 text-left text-sm font-medium placeholder:text-slate-500">
              Find a relic in the deck…
            </span>
          </button>

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
                data-silent onClick={handleResetDeck}
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
                    data-silent onClick={handleResetDeck}
                    className="text-amber-500/80 hover:text-amber-300 underline cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span className="text-sm leading-none"></span> ↺ Reset Deck
                  </button>
                </div>
              </div>
            </div>
          </div>
          </>}
        </header>

        {page === 'deck' && <DeckPage {...{ motion, displayedCard, isDrawn, isRevealing, deck, inventory, handleDrawCard, handleReturnToDeck, handleContinue }} onInspect={handleSelectInventoryItem} onReadDetails={card => setDetailsCardId(card.id)} onDiscard={id => { playSound('discard'); discardCard(id); }} onOpenInventory={() => navigate('inventory')} />}
        {page === 'inventory' && <InventoryPage onInspect={card => setDetailsCardId(card.id)} onTools={() => setToolsOpen(true)} onCharacter={() => navigate('character')} onDeck={() => navigate('deck')} />}
        {page === 'character' && <CharacterPage onImport={() => setImportOpen(true)} />}
        {page === 'skills' && <SkillsPage />}
        {page === 'settings' && <SettingsPage />}
        {pendingPages[page] && <main className="player-page page-unavailable" aria-labelledby="pending-page-title"><div className="page-title-row"><div><p className="eyebrow">YOUR ADVENTURE COMPANION</p><h2 id="pending-page-title">{pendingPages[page]}</h2><p className="muted">This page is not available yet.</p></div></div><a className="journal-button" href="#/deck">Back to Deck</a></main>}

        <CollectionNavigation page={page} />

        <ItemSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onCardAdded={(card) => {
            setActiveCard(card);
            select(card);
          }}
        />

        <CustomCardModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          onCardAdded={(card) => select(card)}
        />
      </div>

  );
}
