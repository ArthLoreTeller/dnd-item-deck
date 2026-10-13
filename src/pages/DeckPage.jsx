import { Card } from '../components/Card';
import { RARITIES, normalizeCard } from '../data/rarity';
import { MiniInventory } from '../components/MiniInventory';
import { BookOpen } from 'lucide-react';
export function DeckPage({ motion, displayedCard, isDrawn, isRevealing, deck, handleDrawCard, handleReturnToDeck, handleContinue, inventory, onInspect, onReadDetails, onDiscard, onOpenInventory }) { return (
        <div className="relic-layout w-full max-w-5xl grid grid-cols-1 gap-8 items-start mt-2">
          <div id="relic-deck" className="relic-stage  flex flex-col items-center gap-4">
            <div className="card-display"><div className="card-scale">
            <div className={`relative w-80 h-[500px] perspective-deck select-none ${motion.phase === "lifting" ? "deck-lift" : ""}`} style={{ "--rarity-color": displayedCard ? RARITIES[normalizeCard(displayedCard).rarity].color : "#ffd078" }}>
              {motion.phase === "celebrating" && motion.celebrate && <div className="rarity-draw-effect" aria-hidden="true" key={displayedCard?.id}><span>✦</span><span>✧</span><span>✦</span></div>}
              <div
                className={`w-full h-full deck-turn card-preserve-3d relative ${
                  isDrawn ? "[transform:rotateY(180deg)]" : ""
                }`}
              >
                <div inert={isDrawn || isRevealing} className="absolute inset-0 w-full h-full card-face-front">
                  <button type="button" aria-label="Draw a random relic" disabled={deck.length === 0 || isRevealing} data-silent
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
                  </button>
                </div>

                <div inert={!isDrawn || isRevealing} className="absolute inset-0 w-full h-full card-face-back">
                  <div className="w-full h-full">
                    {displayedCard ? (
                      <Card
                        key={displayedCard.id}
                        card={displayedCard}
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

            </div></div>
            <div className="deck-footer" inert={isRevealing}>
              {!isDrawn ? (
                <div className="draw-prompt">
                  <button data-silent className="primary-magic-button" disabled={!deck.length || isRevealing} onClick={handleDrawCard}>✦ {deck.length ? "Draw a relic" : "Deck empty"}</button>
                  <p>Rarity-weighted draws · {deck.length} relics remain</p>
                  <details className="draw-odds"><summary>How fate chooses</summary><p>Each remaining card carries a weight: Common 60 · Uncommon 25 · Rare 10 · Epic 4 · Legendary 1. Odds change as cards leave the deck. Search lets you choose directly.</p></details>
                </div>
              ) : (
                <div className="w-full">
                  <div className="deck-action-row flex items-center justify-between gap-2">
                    <button data-silent disabled={isRevealing} onClick={handleReturnToDeck} className="discard-action flex-1 px-3 py-2.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer">Discard</button>
                    <button data-silent disabled={isRevealing} onClick={handleContinue} className="continue-action flex-1 px-3 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer">Keep</button>
                    {displayedCard && <button type="button" className="card-details-action equipment-icon-action" aria-label={`Read details for ${displayedCard.name}`} aria-haspopup="dialog" disabled={isRevealing} onClick={() => onReadDetails(displayedCard)}><BookOpen size={20} aria-hidden="true" /><span className="action-tooltip" aria-hidden="true">Read details</span></button>}
                  </div>
                  <p className="inspection-tip text-center">Keep saves this relic in inventory and shows the deck.</p>
                </div>
              )}
            </div>
          </div>

          <MiniInventory inventory={inventory} activeId={isDrawn ? displayedCard?.id : null} disabled={isRevealing} onInspect={onInspect} onDiscard={onDiscard} onOpenInventory={onOpenInventory} />
        </div>
); }
