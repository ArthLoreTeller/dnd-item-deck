import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCardStore } from "../store/useCardStore";
import { ArtworkViewer } from "./ArtworkViewer";
import { playSound } from "../audio/sound";
import { prefersReducedMotion } from '../motion/preference';
import { FLIP_MS } from '../motion/deckMotion';
import { RotateCcw, Unlink } from "lucide-react";

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
  return (
    <div
      className="card-stat-field absolute right-[20px] w-[30px] flex flex-col items-center"
      style={{ top: topPosition }}
    >
      <div className="h-[27px] w-full flex items-center justify-center px-0.5">
        <input
          type="text"
          aria-label={label}
          title={`${label}: ${stats?.[statKey] || '0'}`}
          value={stats?.[statKey] || ""}
          onChange={(e) =>
            updateCard(id, {
              stats: { ...(stats || {}), [statKey]: e.target.value },
            })
          }
          onClick={(e) => e.stopPropagation()}
          spellCheck="false"
          placeholder="0"
          className={`w-full bg-transparent text-center font-serif font-bold ${textClass} text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-900/40 rounded leading-tight`}
        />
      </div>
      <span className="font-serif text-[8px] font-bold text-amber-950 leading-none mt-1 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

// Main Card component
export function Card({ card, snapshot = false, initialFlipped = false }) {
  const updateCard = useCardStore((state) => state.updateCard);
  const updateProgress = useCardStore((state) => state.updateProgress);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [flipAnim, setFlipAnim] = useState("");
  const flipTimers = useRef([]);
  useEffect(() => {
    setFlipAnim("");
    return () => {
      flipTimers.current.forEach(clearTimeout);
      flipTimers.current = [];
    };
  }, [card?.id, card?.isAttuned]);
  const [popoverText, setPopoverText] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const closeArtwork = useCallback(() => setExpandedImage(null), []);

  const dragStartX = useRef(null);
  const previousCardRef = useRef(card);
  const [outgoingCard, setOutgoingCard] = useState(null);
  const preloadImage = card?.itemImage;
  const preloadImages = card?.images;
  useEffect(() => {
    if (snapshot) return;
    for (const src of new Set([preloadImage, ...Object.values(preloadImages || {})].filter(Boolean))) {
      const image = new Image();
      image.src = src;
      image.decode?.().catch(() => {});
    }
  }, [preloadImage, preloadImages, snapshot]);

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
    const reduced = prefersReducedMotion();
    const timer = setTimeout(() => { setOutgoingCard(null); setIsEnhancing(false); }, reduced ? 0 : 480);
    return () => clearTimeout(timer);
  }, [isAttuned, currentLevel, snapshot]);
  useEffect(() => { previousCardRef.current = card; });

  if (!card) return null;

  const activateText = event => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); }
  };

  const handleProgress = (levelIndex, val) => {
    updateProgress(id, levelIndex, val);
  };

  const handleFlip = () => {
    if (flipAnim || isEnhancing) return;
    if (prefersReducedMotion()) { setIsFlipped(previous => !previous); return; }
    setFlipAnim("out");
    flipTimers.current.push(setTimeout(() => {
      setIsFlipped((prev) => !prev);
      setFlipAnim("in");
    }, FLIP_MS / 2));
    flipTimers.current.push(setTimeout(() => {
      setFlipAnim("");
      flipTimers.current = [];
    }, FLIP_MS));
  };

  const handleToggleAttune = (e) => {
    e?.stopPropagation();
    if (!isAttunable || isEnhancing || flipAnim || snapshot) return;
    updateCard(id, { isAttuned: !isAttuned });
    const updated = useCardStore.getState().inventory.find((item) => item.id === id);
    if (updated?.isAttuned === !isAttuned) playSound(isAttuned ? "discard" : "attune");
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

  const renderUnattunedShelf1 = () => (
    <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
      className="overflow-y-auto no-scrollbar h-full cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
      onClick={() =>
        setPopoverText({ title: "Item Lore", text: flavorText || description })
      }
    >
      <p className="italic font-serif text-justify">
        {flavorText || description}
      </p>
    </div>
  );

  const renderUnattunedShelf2 = () => {
    if (isNormal) {
      return (
        <div className="overflow-y-auto no-scrollbar space-y-1 pb-2">
          {abilities?.map((abi, idx) => (
            <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
              key={`nml-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
              onClick={() =>
                setPopoverText({ title: abi.title, text: abi.description })
              }
            >
              <span className="font-bold font-serif">{abi.title}: </span>
              <span className="italic">{abi.description}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
        className="overflow-y-auto no-scrollbar space-y-1 h-full cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
        onClick={() => {
          let statsContent = `Attunement: ${attunementRules || "None"}`;
          if (weaponStats) {
            statsContent += `\nWeapon Stat: ${
              weaponStats.weaponStat || ""
            }\nAttack Bonus: ${weaponStats.attackBonus || ""}\nDamage Bonus: ${
              weaponStats.damageBonus || ""
            }\nSave DC: ${weaponStats.saveDc || ""}`;
          }
          setPopoverText({
            title: "Attunement Criteria & Stats",
            text: statsContent,
          });
        }}
      >
        <p>
          <span className="font-bold">Attunement:</span> {attunementRules}
        </p>
        {weaponStats && (
          <>
            <p>
              <span className="font-bold">Weapon Stat:</span>{" "}
              {weaponStats.weaponStat}
            </p>
            <p>
              <span className="font-bold">Attack Bonus:</span>{" "}
              {weaponStats.attackBonus}
            </p>
            <p>
              <span className="font-bold">Damage Bonus:</span>{" "}
              {weaponStats.damageBonus}
            </p>
            <p>
              <span className="font-bold">Save DC:</span> {weaponStats.saveDc}
            </p>
          </>
        )}
      </div>
    );
  };

  const renderAttunedShelf1 = () => {
    if (isProgressive) {
      return (
        <div className={`flex flex-col h-full ${getFadeClass("delay-200")}`}>
          <div className="overflow-y-auto no-scrollbar h-full">
            {level1Abilities?.map((abi, idx) => (
              <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
                key={`l1-${idx}`}
                className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
                onClick={() =>
                  setPopoverText({ title: abi.title, text: abi.description })
                }
              >
                <span className="font-bold font-serif">{abi.title}: </span>
                <span className="italic">{abi.description}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (isStandard) {
      return (
        <div
          className={`overflow-y-auto no-scrollbar flex flex-col h-full ${getFadeClass(
            "delay-200"
          )}`}
        >
          {abilities?.slice(0, 2).map((abi, idx) => (
            <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
              key={`std1-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
              onClick={() =>
                setPopoverText({ title: abi.title, text: abi.description })
              }
            >
              <span className="font-bold font-serif">{abi.title}: </span>
              <span className="italic">{abi.description}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderAttunedShelf2 = () => {
    if (isProgressive) {
      return (
        <div className={`flex flex-col h-full ${getFadeClass("delay-300")}`}>
          <div className="overflow-y-auto no-scrollbar h-full">
            {currentLevel >= 2 &&
              level2Abilities?.map((abi, idx) => (
                <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
                  key={`l2-${idx}`}
                  className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
                  onClick={() =>
                    setPopoverText({ title: abi.title, text: abi.description })
                  }
                >
                  <span className="font-bold font-serif">{abi.title}: </span>
                  <span className="italic">{abi.description}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    if (isStandard) {
      return (
        <div
          className={`overflow-y-auto no-scrollbar flex flex-col h-full ${getFadeClass(
            "delay-300"
          )}`}
        >
          {abilities?.slice(2, 4).map((abi, idx) => (
            <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
              key={`std2-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
              onClick={() =>
                setPopoverText({ title: abi.title, text: abi.description })
              }
            >
              <span className="font-bold font-serif">{abi.title}: </span>
              <span className="italic">{abi.description}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderAttunedShelf3 = () => {
    if (isProgressive) {
      return (
        <div className={`flex flex-col h-full ${getFadeClass("delay-400")}`}>
          <div className="overflow-y-auto no-scrollbar h-full">
            {currentLevel >= 3 &&
              level3Abilities?.map((abi, idx) => (
                <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
                  key={`l3-${idx}`}
                  className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
                  onClick={() =>
                    setPopoverText({ title: abi.title, text: abi.description })
                  }
                >
                  <span className="font-bold font-serif">{abi.title}: </span>
                  <span className="italic">{abi.description}</span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    if (isStandard) {
      return (
        <div
          className={`overflow-y-auto no-scrollbar flex flex-col h-full ${getFadeClass(
            "delay-400"
          )}`}
        >
          {abilities?.slice(4).map((abi, idx) => (
            <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
              key={`std3-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors"
              onClick={() =>
                setPopoverText({ title: abi.title, text: abi.description })
              }
            >
              <span className="font-bold font-serif">{abi.title}: </span>
              <span className="italic">{abi.description}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const artworkSrc = getArtworkSrc();

  return (
    <div className="item-surface relative flex flex-col items-center gap-4 w-full h-full">
      {/* OUTER WRAPPER: Handles drop-shadow transition and maintains a strict 100% scale */}
      <div
        className={`attunement-current ${isEnhancing ? "attunement-incoming" : ""} relative w-full h-full scale-100 ${
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
            '--card-half-turn': `${FLIP_MS / 2}ms`,
          }}
        >
          <style>
            {`
              @keyframes flip-out {
                0% { transform: rotateY(0deg); }
                100% { transform: rotateY(90deg); }
              }
              .animate-flip-out { will-change: transform; animation: flip-out var(--card-half-turn) cubic-bezier(.42,0,1,1) forwards; }
              
              @keyframes flip-in {
                0% { transform: rotateY(-90deg); }
                100% { transform: rotateY(0deg); }
              }
              .animate-flip-in { will-change: transform; animation: flip-in var(--card-half-turn) cubic-bezier(0,0,.58,1) forwards; }

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
            {artworkSrc ? (
              <button
                type="button"
                aria-label={`Inspect artwork for ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedImage(artworkSrc);
                }}
                title="Click to expand artwork"
                className={`w-[190px] h-[190px] mt-1 flex items-center justify-center relative transition-transform duration-300 ${
                  isAttunable && displayAttuned
                    ? "cursor-pointer hover:scale-105 active:scale-95 group"
                    : "cursor-pointer hover:scale-105"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-amber-400/20 blur-xl rounded-full transition-all duration-500 ${
                    isAttunable && displayAttuned
                      ? "opacity-100 group-hover:bg-amber-400/50 group-hover:blur-2xl"
                      : "opacity-0"
                  }`}
                />
                <img
                  src={artworkSrc}
                  alt={name}
                  className="max-w-full max-h-full object-contain drop-shadow-md relative z-10 pointer-events-none"
                />
              </button>
            ) : (
              <div
                onClick={
                  isAttunable && displayAttuned ? handleToggleAttune : undefined
                }
                title={isAttunable && displayAttuned ? "Click to Unattune" : ""}
                className={`text-[11px] leading-snug text-amber-950 pt-2 px-6 w-full text-justify overflow-y-auto no-scrollbar max-h-[160px] ${getFadeClass(
                  "delay-100"
                )} ${
                  isAttunable && displayAttuned
                    ? "cursor-pointer hover:text-amber-700"
                    : ""
                }`}
              >
                <p>{description || flavorText}</p>
              </div>
            )}
            {isAttunable && displayAttuned && specs && (
              <div role="button" tabIndex={snapshot ? -1 : 0} onKeyDown={activateText}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverText({
                    title: "Item Specifications",
                    text: `Type: ${specs.type || ""}\nAttunement: ${
                      specs.attunement || ""
                    }\nProperties: ${specs.properties || ""}\nRanges: ${
                      specs.ranges || ""
                    }\nDamage: ${specs.damage || ""}\nDamage Type: ${
                      specs.damageType || ""
                    }`,
                  });
                }}
                className={`absolute bottom-[-15px] left-[10px] w-[140px] text-[5px] leading-tight text-amber-950 text-left cursor-pointer hover:bg-amber-900/10 rounded px-1 py-0.5 transition-colors z-20 ${getFadeClass(
                  "delay-200"
                )}`}
              >
                <p className="italic">{specs.type}</p>
                <p className="italic">{specs.attunement}</p>
                <p>
                  <span className="font-bold">Properties:</span>{" "}
                  {specs.properties}
                </p>
                <p>
                  <span className="font-bold">Ranges:</span> {specs.ranges}
                </p>
                <p>
                  <span className="font-bold">Damage:</span> {specs.damage}
                </p>
                <p>
                  <span className="font-bold">Damage Type:</span>{" "}
                  {specs.damageType}
                </p>
              </div>
            )}
          </div>

          {isAttunable && displayAttuned && (
            <div className={`${getFadeClass("delay-100")}`}>
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Hit"
                statKey="hit"
                topPosition="94px"
              />
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Damage"
                statKey="damage"
                topPosition="142px"
              />
              <StatInput
                id={id}
                stats={stats}
                updateCard={updateCard}
                label="Save DC"
                statKey="saveDc"
                topPosition="188px"
              />
            </div>
          )}

          {isAttunable && displayAttuned ? (
            <>
              <div
                className={`card-shelf card-shelf-1 ${isProgressive ? 'card-shelf-with-progress' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAttunedShelf1()}
              </div>
              <div
                className={`card-shelf card-shelf-2 ${isProgressive ? 'card-shelf-with-progress' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAttunedShelf2()}
              </div>
              <div
                className="card-shelf card-shelf-3"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {renderAttunedShelf3()}
              </div>
            </>
          ) : (
            <>
              <div className="card-shelf card-lore-shelf">
                {renderUnattunedShelf1()}
              </div>
              <div className="card-shelf card-rules-shelf">
                {renderUnattunedShelf2()}
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
            <button type="button" data-silent
              aria-label={isAttuned ? "Unattune item" : "Attune item"}
              title={isAttuned ? "Unattune item" : "Attune item"}
              aria-pressed={isAttuned}
              disabled={snapshot || isEnhancing || Boolean(flipAnim)}
              onClick={handleToggleAttune}
              className={`attune-control card-attune-control ${isAttuned ? 'card-attune-icon' : ''} ${isEnhancing ? 'card-attune-transform' : ''}`}>
              {isAttuned ? <Unlink size={15} aria-hidden="true" /> : <span>Attune</span>}
            </button>
          )}

          {popoverText && (
            <div
              className="absolute inset-0 z-[100] flex items-center justify-center p-4"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverText(null);
              }}
            >
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none [-webkit-mask-image:radial-gradient(circle_at_center,black_65%,transparent_100%)] [mask-image:radial-gradient(circle_at_center,black_65%,transparent_100%)]" />
              <div
                className="relative bg-[#e8d5b7] p-4 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] w-full max-h-full overflow-y-auto border-2 border-[#AA7826]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-3 border-b border-[#AA7826]/30 pb-2">
                  <strong className="font-serif text-amber-950 font-bold">
                    {popoverText.title}
                  </strong>
                  <button
                    aria-label="Close expanded card text"
                    onClick={() => setPopoverText(null)}
                    className="text-amber-950 font-bold hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
                <p className="italic text-[12px] text-amber-950 text-justify whitespace-pre-wrap">
                  {popoverText.text}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {!snapshot && outgoingCard && <div className="attunement-outgoing" inert aria-hidden="true"><Card card={outgoingCard.card} snapshot initialFlipped={outgoingCard.flipped} /></div>}
      {!snapshot && isEnhancing && <div className="attunement-aura" aria-hidden="true" />}
      {expandedImage && <ArtworkViewer src={expandedImage} card={card} onClose={closeArtwork} />}
    </div>
  );
}
