import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { useCardStore } from "../store/useCardStore";
import { ArtworkViewer } from "./ArtworkViewer";
import { playSound } from "../audio/sound";
import { RotateCcw } from "lucide-react";

// StatInput component for rendering individual stat input fields
function StatInput({
  id,
  stats,
  updateCard,
  label,
  statKey,
  topPosition,
  textClass = "text-[12px]",
}) {
  const [draft, setDraft] = useState(null);
  const [failed, setFailed] = useState(false);
  const revision = useRef(0);

  const save = async (value) => {
    const request = ++revision.current;
    setDraft(value);
    setFailed(false);
    const saved = await updateCard(id, { stats: { [statKey]: value } });
    if (request !== revision.current) return;
    if (saved) setDraft(null);
    else setFailed(true);
  };

  return (
    <div
      className="absolute right-[20px] w-[30px] flex flex-col items-center"
      style={{ top: topPosition }}
    >
      <div className="h-[25px] w-full flex items-center justify-center px-0.5">
        <input
          type="text"
          aria-label={label}
          value={draft ?? stats?.[statKey] ?? ""}
          onChange={(event) => save(event.target.value)}
          aria-invalid={failed || undefined}
          onClick={(e) => e.stopPropagation()}
          spellCheck="false"
          placeholder="0"
          className={`w-full bg-transparent text-center font-serif font-bold ${textClass} text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-900/40 rounded leading-tight`}
        />
      </div>
      <span className="font-serif text-[8px] font-bold text-amber-950 leading-none mt-1 whitespace-nowrap">
        {label}
      </span>
      {failed && (
        <button type="button" onClick={() => save(draft)} aria-label={`Retry saving ${label}`}
          className="rounded bg-amber-100 px-1 text-[10px] font-bold text-red-900">
          Retry
        </button>
      )}
    </div>
  );
}

function TextDetail({ title, text, onClose }) {
  const overlay = useRef(null);
  const titleId = useId();
  useDialogFocus(overlay, true, onClose);
  return createPortal(
    <div ref={overlay} className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border-2 border-[#AA7826] bg-[#e8d5b7] p-5 text-amber-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#AA7826] pb-2">
          <h2 id={titleId} className="font-serif text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Close item details" onClick={onClose} className="p-2">✕</button>
        </div>
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{text}</p>
      </section>
    </div>, document.body,
  );
}

// Keying this component by URL resets loading and failure when the card changes art.
function CardArtwork({ src, card, attuned, fallback }) {
  const [status, setStatus] = useState("loading");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (status === "failed") return fallback;
  return (
    <>
      <button type="button" disabled={status !== "ready"} aria-label={`Inspect artwork for ${card.name}`}
        aria-haspopup="dialog" onClick={() => setOpen(true)}
        className="group relative mt-1 flex h-[190px] w-[190px] items-center justify-center enabled:cursor-pointer enabled:hover:scale-105 transition-transform">
        {attuned && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl group-hover:bg-amber-400/50" />}
        <img src={src} alt={card.name} referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")} onError={() => setStatus("failed")}
          className="relative z-10 max-h-full max-w-full object-contain drop-shadow-md" />
      </button>
      {open && <ArtworkViewer src={src} card={card} onClose={close} onError={() => setStatus("failed")} />}
    </>
  );
}

// Main Card component
export function Card({ card, snapshot = false, initialFlipped = false }) {
  const updateCard = useCardStore((state) => state.updateCard);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [flipAnim, setFlipAnim] = useState("");
  const [popoverText, setPopoverText] = useState(null);

  const flipTimers = useRef([]);
  useEffect(() => () => flipTimers.current.forEach(clearTimeout), []);
  const dragStartX = useRef(null);
  const previousCardRef = useRef(card);
  const [outgoingCard, setOutgoingCard] = useState(null);

  const {
    id,
    type = "standard",
    isAttuned = false,
    progress,
    maxProgress = 20,
    currentLevel = 1,
    name,
    description,
    flavorText,
    itemImage,
    images,
    specs,
    stats,
    abilities,
    level1Abilities,
    level2Abilities,
    level3Abilities,
    attunementRules,
    weaponStats,
  } = card || {};

  const isNormal = type === "normal";
  const isProgressive = type === "progressive";
  const isStandard = type === "standard";
  const isAttunable = !isNormal;

  const displayAttuned = isAttuned && !isFlipped;

  const bgImage =
    isAttunable && displayAttuned
      ? "/assets/attune-base.png"
      : "/assets/card-front.png";

  const currentCardRef = useRef(card);
  const flippedRef = useRef(isFlipped);
  currentCardRef.current = card;
  flippedRef.current = isFlipped;
  useEffect(() => {
    const card = currentCardRef.current;
    const previous = previousCardRef.current;
    previousCardRef.current = card;
    if (snapshot || !previous || !card) return;
    if (previous.isAttuned === card.isAttuned && previous.currentLevel === card.currentLevel) return;
    setOutgoingCard({ card: previous, flipped: flippedRef.current });
    setIsFlipped(false);
    setIsEnhancing(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => { setOutgoingCard(null); setIsEnhancing(false); }, reduced ? 0 : 650);
    return () => clearTimeout(timer);
  }, [isAttuned, currentLevel, snapshot]);
  useEffect(() => { previousCardRef.current = card; });

  if (!card) return null;

  const handleProgress = (levelIndex, val) => {
    updateCard(id, { progress: { [`level${levelIndex}`]: val } });
  };

  const handleFlip = () => {
    if (flipAnim || isEnhancing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsFlipped((previous) => !previous);
      return;
    }
    setFlipAnim("out");
    flipTimers.current = [setTimeout(() => {
      setIsFlipped((prev) => !prev);
      setFlipAnim("in");
    }, 250), setTimeout(() => {
      setFlipAnim("");
    }, 500)];
  };

  const handleToggleAttune = async (event) => {
    event.stopPropagation();
    if (!isAttunable || isEnhancing || flipAnim || snapshot) return;
    const saved = await updateCard(id, { isAttuned: !isAttuned });
    if (saved) playSound(isAttuned ? "discard" : "attune");
  };

  const getArtworkSrc = () => {
    let src = images?.base || itemImage;
    if (isAttunable && displayAttuned) {
      if (isProgressive) {
        if (currentLevel >= 3 && images?.level3) return images.level3;
        if (currentLevel >= 2 && images?.level2) return images.level2;
      }
      return images?.attuned || src;
    }
    return src;
  };

  const getFadeClass = () => "transition-opacity opacity-100 duration-300";

  const renderCheckboxes = (levelIndex, currentVal, customPosition) => (
    <div
      className={`absolute ${customPosition} flex justify-end z-10 origin-bottom-right`}
    >
      <div className="flex border-y border-1 border-l border-[#AA7826] bg-[#CCAE78] shadow-sm">
        {Array.from({ length: maxProgress }).map((_, i) => {
          const isNextTarget = i === currentVal;
          return (
            <button
              type="button"
              aria-label={`Level ${levelIndex} progress ${i + 1} of ${maxProgress}`}
              aria-pressed={i < currentVal}
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                handleProgress(levelIndex, i + 1 === currentVal ? i : i + 1);
              }}
              className={`w-[7px] min-w-[7px] h-[7px] border-r border-[#AA7826] cursor-pointer transition-colors ${
                i < currentVal
                  ? "bg-gradient-to-b from-[#3a1d07] to-[#8f5126]"
                  : "bg-transparent hover:bg-[#AA7826]/30"
              } ${isNextTarget ? "animate-inner-burn" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );

  const lore = flavorText || description;
  const abilitiesByShelf = isProgressive
    ? [level1Abilities, currentLevel >= 2 && level2Abilities, currentLevel >= 3 && level3Abilities]
    : isStandard ? [abilities?.slice(0, 2), abilities?.slice(2, 4), abilities?.slice(4)] : [];

  const renderAbilities = (list, reserveControlSpace = false) => list && (
    <div className={`min-h-0 overflow-y-auto no-scrollbar ${reserveControlSpace ? "pb-[35px]" : "pb-2"}`}>
      {list.map((ability, index) => (
        <button type="button" key={index} aria-haspopup="dialog"
          onClick={() => setPopoverText({ title: ability.title || "Item ability", text: ability.description })}
          className="mb-1 block w-full rounded px-1 text-left hover:bg-amber-900/10">
          {ability.title && <span className="font-serif font-bold">{ability.title}: </span>}
          <span className="italic">{ability.description}</span>
        </button>
      ))}
    </div>
  );

  const specRows = [
    ["Type", specs?.type], ["Attunement", !isNormal && specs?.attunement],
    ["Properties", specs?.properties], ["Ranges", specs?.ranges],
    ["Damage", specs?.damage], ["Damage Type", specs?.damageType],
  ].filter(([, value]) => value);
  const ruleRows = [
    ["Attunement", attunementRules], ["Weapon Stat", weaponStats?.weaponStat],
    ["Attack Bonus", weaponStats?.attackBonus], ["Damage Bonus", weaponStats?.damageBonus],
    ["Save DC", weaponStats?.saveDc],
  ].filter(([, value]) => value);

  const detailButton = (title, rows, className) => rows.length > 0 && (
    <button type="button" aria-label={`Read ${title}`} aria-haspopup="dialog" className={className}
      onClick={() => setPopoverText({ title, text: rows.map(([label, value]) => `${label}: ${value}`).join("\n") })}>
      {rows.map(([label, value]) => (
        <span key={label} className="block"><strong>{label}: </strong>{value}</span>
      ))}
    </button>
  );
  const artFallback = (description || flavorText) && (
    <p className="max-h-[160px] w-full overflow-y-auto px-6 pt-2 text-justify text-[11px] leading-snug">{description || flavorText}</p>
  );

  const artworkSrc = getArtworkSrc();

  return (
    <div className="item-surface relative flex flex-col items-center gap-4 w-full h-full">
      {/* OUTER WRAPPER: Handles drop-shadow transition and maintains a strict 100% scale */}
      <div
        className={`attunement-current ${isEnhancing ? "attunement-incoming" : ""} relative w-full h-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] scale-100 ${
          isAttunable && isAttuned
            ? "drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]"
            : "drop-shadow-2xl"
        }`}
        style={{ perspective: "1200px" }}
      >
        {/* INNER WRAPPER: Handles Background and Flip animations perfectly sized to the parent */}
        <div
          onTouchStart={(e) => {
            dragStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (dragStartX.current === null) return;
            const deltaX = e.changedTouches[0].clientX - dragStartX.current;
            if (isAttuned && Math.abs(deltaX) > 45) handleFlip();
            dragStartX.current = null;
          }}
          onMouseDown={(e) => {
            dragStartX.current = e.clientX;
          }}
          onMouseUp={(e) => {
            if (dragStartX.current === null) return;
            const deltaX = e.clientX - dragStartX.current;
            if (isAttuned && Math.abs(deltaX) > 45) handleFlip();
            dragStartX.current = null;
          }}
          onMouseLeave={() => {
            dragStartX.current = null;
          }}
          className={`relative w-full h-full bg-[length:100%_100%] bg-no-repeat bg-center text-amber-950 select-none ${
            isAttunable && isAttuned ? "cursor-grab active:cursor-grabbing" : ""
          } ${
            flipAnim === "out"
              ? "animate-flip-out"
              : flipAnim === "in"
              ? "animate-flip-in"
              : ""
          }`}
          style={{
            backgroundImage: `url('${bgImage}')`,
            transformStyle: "preserve-3d",
          }}
        >
          <style>
            {`
              @keyframes flip-out {
                0% { transform: rotateY(0deg); opacity: 1; filter: brightness(1); }
                100% { transform: rotateY(90deg); opacity: 0.5; filter: brightness(0.5); }
              }
              .animate-flip-out { animation: flip-out 0.25s ease-in forwards; }
              
              @keyframes flip-in {
                0% { transform: rotateY(-90deg); opacity: 0.5; filter: brightness(0.5); }
                100% { transform: rotateY(0deg); opacity: 1; filter: brightness(1); }
              }
              .animate-flip-in { animation: flip-in 0.25s ease-out forwards; }

              @keyframes hieroglyph-etch {
                0% { clip-path: inset(0 100% 0 0); filter: drop-shadow(0 0 12px #fbbf24) brightness(2); color: #fef08a; transform: scale(1.1); }
                40% { clip-path: inset(0 0 0 0); filter: drop-shadow(0 0 15px #f59e0b) brightness(1.5); color: #f59e0b; transform: scale(1.1); }
                100% { clip-path: inset(0 0 0 0); filter: drop-shadow(0 0 0px transparent) brightness(1); color: rgb(69 26 3 / 0.4); transform: scale(1); }
              }
              .animate-hieroglyph { animation: hieroglyph-etch 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

              @keyframes unlink-glow-burn {
                0% { color: rgb(69 26 3); filter: drop-shadow(0 0 0px transparent); transform: scale(1); opacity: 1; }
                40% { color: #fef08a; filter: drop-shadow(0 0 12px #fbbf24) brightness(1.5); transform: scale(1.2); opacity: 1; }
                100% { color: #ea580c; filter: drop-shadow(0 0 20px #ea580c) brightness(2); transform: scale(0); opacity: 0; }
              }
              .animate-unlink-burn { animation: unlink-glow-burn 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes button-consume {
                0% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
              }
              .animate-button-consume { animation: button-consume 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; transform-origin: center; }

              @keyframes inner-burn {
                0% { background-color:rgb(252, 192, 108); box-shadow: inset 0 0 3px #eab308; }
                30% { background-color:#fef08a; box-shadow: inset 0 0 2px #d97706; }
                100% { background-color: transparent; box-shadow: inset 0 0 0px transparent; }
              }
              .animate-inner-burn { animation: inner-burn 2.5s cubic-bezier(0.25, 1, 0.5, 1); }
            `}
          </style>


          {isAttunable && isAttuned && (
            <div className="absolute top-[25px] left-[20px] z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlip();
                }}
                title={isFlipped ? "View Attuned Stats" : "View Base Stats"}
                className="relative p-1.5 rounded-full cursor-pointer flex items-center justify-center group transition-all duration-300 ease-out hover:text-amber-500 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:scale-110 text-amber-950/40"
              >
                <div className="absolute inset-0 rounded-full border border-amber-400/0 group-hover:border-amber-400/60 group-hover:scale-[1.5] group-hover:opacity-0 transition-all duration-500 ease-out pointer-events-none" />
                <RotateCcw
                  className={`w-4 h-4 relative z-10 transition-transform duration-500 ${
                    isFlipped ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          )}


          <div
            className={`absolute top-[25px] inset-x-0 mx-auto w-[220px] h-[38px] flex items-center justify-center text-center px-2 ${getFadeClass(
              "delay-100"
            )}`}
          >
            <h2 className="font-serif text-[12px] font-bold tracking-wide text-amber-950 leading-tight">
              {name || "Item Name"}
            </h2>
          </div>

          <div className="absolute top-[50px] inset-x-0 mx-auto w-full h-[175px] flex flex-col items-center justify-start pt-1 transition-all duration-500">
            {artworkSrc
              ? <CardArtwork key={artworkSrc} src={artworkSrc} card={card} attuned={displayAttuned} fallback={artFallback} />
              : artFallback}
            {(isNormal || displayAttuned) && detailButton("Item Specifications", specRows,
              "absolute bottom-[-15px] left-[10px] z-20 w-[140px] rounded px-1 py-0.5 text-left text-[6px] leading-tight hover:bg-amber-900/10")}
          </div>

          {isAttunable && displayAttuned && (
            <div className={`${getFadeClass("delay-100")}`}>
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Hit"
                statKey="hit"
                topPosition="91px"
              />
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Damage"
                statKey="damage"
                topPosition="139px"
                textClass="text-[6px]"
              />
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Save DC"
                statKey="saveDc"
                topPosition="185px"
              />
            </div>
          )}

          {isAttunable && displayAttuned ? (
            <>
              <div
                className="absolute top-[245px] left-[8px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAbilities(abilitiesByShelf[0])}
              </div>
              <div
                className="absolute top-[325px] left-[8px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAbilities(abilitiesByShelf[1])}
              </div>
              <div
                className="absolute top-[406px] left-[8px] right-[22px] h-[60px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAbilities(abilitiesByShelf[2], true)}
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-[248px] left-[10px] right-[22px] h-[72px] flex flex-col text-[8px] leading-snug text-amber-950 pr-1">
                {lore && (
                  <button type="button" aria-label="Read Item Lore" aria-haspopup="dialog"
                    className="overflow-y-auto no-scrollbar rounded px-1 pb-2 text-justify font-serif italic leading-tight hover:bg-amber-900/10"
                    onClick={() => setPopoverText({ title: "Item Lore", text: lore })}>
                    {lore}
                  </button>
                )}
              </div>
              <div className="absolute top-[350px] left-[12px] right-[22px] h-[110px] flex flex-col text-[7px] leading-snug text-amber-950 pr-1">
                {isNormal ? renderAbilities(abilities) : detailButton("Attunement Criteria & Stats", ruleRows,
                  "overflow-y-auto no-scrollbar rounded px-1 pb-[35px] text-left hover:bg-amber-900/10")}
              </div>
            </>
          )}

          {isAttunable && displayAttuned && isProgressive && (
            <div className={`${getFadeClass("delay-200")}`}>
              {level2Abilities &&
                renderCheckboxes(
                  1,
                  progress?.level1 || 0,
                  "top-[304px] right-[7.5px]"
                )}
              {currentLevel >= 2 &&
                level3Abilities &&
                renderCheckboxes(
                  2,
                  progress?.level2 || 0,
                  "top-[385px] right-[7.5px]"
                )}
            </div>
          )}

          {isAttunable && (
            <div className="absolute bottom-[30px] right-[14px] z-20">
              <button data-silent disabled={isEnhancing || Boolean(flipAnim)} onClick={handleToggleAttune}
                title={isAttuned ? "Unattune Item" : "Attune Item"}
                className="attune-control px-3 py-1.5 rounded border border-[#AA7826] bg-[#e8d5b7] text-amber-950 font-bold text-[9px] uppercase tracking-wide cursor-pointer disabled:cursor-wait">
                {isAttuned ? "Unattune" : "Attune"}
              </button>
            </div>
          )}

          {popoverText && <TextDetail {...popoverText} onClose={() => setPopoverText(null)} />}
        </div>
      </div>
      {!snapshot && outgoingCard && <div className="attunement-outgoing" inert aria-hidden="true"><Card card={outgoingCard.card} snapshot initialFlipped={outgoingCard.flipped} /></div>}
      {!snapshot && isEnhancing && <div className="attunement-aura" aria-hidden="true" />}
    </div>
  );
}
