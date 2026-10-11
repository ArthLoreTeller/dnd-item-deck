import React, { useState, useEffect, useRef } from "react";
import { useCardStore } from "../store/useCardStore";
import { Unlink, RotateCcw } from "lucide-react";

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
      className="absolute right-[20px] w-[30px] flex flex-col items-center no-flip-drag"
      style={{ top: topPosition }}
    >
      <div className="h-[25px] w-full flex items-center justify-center px-0.5">
        <input
          type="text"
          value={stats?.[statKey] || ""}
          onChange={(e) =>
            updateCard(id, {
              stats: { ...(stats || {}), [statKey]: e.target.value },
            })
          }
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          spellCheck="false"
          placeholder="0"
          className={`w-full bg-transparent text-center font-serif font-bold ${textClass} text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-900/40 rounded leading-tight`}
        />
      </div>
      <span className="font-serif text-[8px] font-bold text-amber-950 leading-none mt-1 whitespace-nowrap select-none">
        {label}
      </span>
    </div>
  );
}

// Main Card component
export function Card({ card }) {
  const updateCard = useCardStore((state) => state.updateCard);
  const canAttune = useCardStore((state) => state.canAttune);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isBurningButton, setIsBurningButton] = useState(false);
  const [isShakeButton, setIsShakeButton] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipState, setFlipState] = useState(""); // "" | "out" | "in"
  const [flipDir, setFlipDir] = useState(1); // 1 = right, -1 = left
  const [dragTilt, setDragTilt] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [popoverText, setPopoverText] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isPointerDownRef = useRef(false);

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
    effects,
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

  const burnOrigin = effects?.burnOrigin || (id === "wand_001" ? "center" : "bottom");

  const prevLevelRef = useRef(currentLevel);
  const prevAttunedRef = useRef(isAttuned);

  useEffect(() => {
    const justAttuned = isAttunable && isAttuned && !prevAttunedRef.current;
    const leveledUp = currentLevel > prevLevelRef.current;

    if (justAttuned || leveledUp) {
      setIsEnhancing(true);
      const timer = setTimeout(() => setIsEnhancing(false), 600);
      prevAttunedRef.current = isAttuned;
      prevLevelRef.current = currentLevel;
      return () => clearTimeout(timer);
    }

    prevAttunedRef.current = isAttuned;
    prevLevelRef.current = currentLevel;
  }, [isAttuned, currentLevel, isAttunable]);

  // Handle ESC key for popovers and expanded image modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setPopoverText(null);
        setExpandedImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!card) return null;

  const handleProgress = (levelIndex, val) => {
    const currentProgress = progress || { level1: 0, level2: 0 };
    const newProgress = { ...currentProgress, [`level${levelIndex}`]: val };

    let newLevel = 1;
    if (newProgress.level1 >= 20) newLevel = 2;
    if (newProgress.level1 >= 20 && newProgress.level2 >= 20) newLevel = 3;

    updateCard(id, { progress: newProgress, currentLevel: newLevel });
  };

  // Seamless 2-phase Front-to-Back flip animation
  const triggerFlip = (direction = 1) => {
    if (flipState || isEnhancing || isUnlinking) return;
    setDragTilt(0);
    setIsDragging(false);
    setFlipDir(direction);
    setFlipState("out");
    setTimeout(() => {
      setIsFlipped((prev) => !prev);
      setFlipState("in");
    }, 200);
    setTimeout(() => {
      setFlipState("");
    }, 400);
  };

  // Pointer drag gesture handlers (tactile 3D tilt & swipe flip)
  const handlePointerDown = (e) => {
    if (
      flipState ||
      e.target.closest("input") ||
      e.target.closest("button") ||
      e.target.closest("select") ||
      e.target.closest(".no-flip-drag")
    ) {
      return;
    }

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
    isPointerDownRef.current = true;
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current || flipState) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (!isDragging && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }

    if (isDragging) {
      // Direct tactile tilt up to ±30 degrees
      const tilt = (deltaX / 140) * 30;
      setDragTilt(Math.max(-30, Math.min(30, tilt)));
    }
  };

  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (isDragging) {
      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaTime = Date.now() - pointerStartRef.current.time;
      const velocity = Math.abs(deltaX) / (deltaTime || 1);

      // Trigger flip if dragged past 45px or swift swipe velocity
      if (Math.abs(deltaX) > 45 || velocity > 0.4) {
        triggerFlip(deltaX < 0 ? -1 : 1);
      } else {
        // Snap back to 0
        setDragTilt(0);
        setIsDragging(false);
      }
    }
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    setDragTilt(0);
    setIsDragging(false);
  };

  const handleToggleAttune = (e) => {
    e.stopPropagation();
    if (
      isEnhancing ||
      isBurningButton ||
      isUnlinking ||
      flipState ||
      isDragging
    )
      return;

    if (!isAttuned) {
      // Validate limit before starting burn animation
      if (!canAttune(id)) {
        setIsShakeButton(true);
        updateCard(id, { isAttuned: true }); // Store handles toast notification
        setTimeout(() => setIsShakeButton(false), 400);
        return;
      }

      setIsBurningButton(true);
      updateCard(id, { isAttuned: true });
      setTimeout(() => {
        setIsBurningButton(false);
      }, 700);
    } else {
      setIsUnlinking(true);
      setTimeout(() => {
        setIsFlipped(false);
        updateCard(id, { isAttuned: false });
        setIsUnlinking(false);
      }, 700);
    }
  };

  const getArtworkSrc = () => {
    if (!images) return itemImage || null;
    if (isProgressive && displayAttuned) {
      if (currentLevel === 3 && images.level3) return images.level3;
      if (currentLevel >= 2 && images.level2) return images.level2;
      return images.attuned || images.base || null;
    }
    if (displayAttuned && images.attuned) return images.attuned;
    return images.base || itemImage || null;
  };

  const getFadeClass = (delay = "delay-100") => {
    return `transition-opacity duration-300 ease-in-out ${
      isEnhancing ? "opacity-30" : "opacity-100"
    } ${delay}`;
  };

  const isInteracting = isDragging || !!flipState || isUnlinking || isBurningButton;

  const renderCheckboxes = (levelIndex, currentVal, customPosition) => (
    <div
      className={`absolute ${customPosition} flex justify-end z-10 origin-bottom-right no-flip-drag`}
    >
      <div className="flex border-y border-1 border-l border-[#AA7826] bg-[#CCAE78] shadow-sm">
        {Array.from({ length: maxProgress }).map((_, i) => {
          const isNextTarget = i === currentVal;
          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                handleProgress(levelIndex, i + 1 === currentVal ? i : i + 1);
              }}
              className={`w-[7px] min-w-[7px] h-[7px] border-r border-[#AA7826] cursor-pointer transition-colors ${
                i < currentVal
                  ? "bg-gradient-to-b from-[#3a1d07] to-[#8f5126]"
                  : "bg-transparent hover:bg-[#AA7826]/40"
              } ${isNextTarget ? "animate-inner-burn" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );

  const renderUnattunedShelf1 = () => (
    <div
      className="overflow-y-auto no-scrollbar pb-2 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors no-flip-drag"
      onClick={() =>
        setPopoverText({ title: "Item Lore", text: flavorText || description })
      }
    >
      <p className="italic font-serif leading-tight text-justify">
        {flavorText || description}
      </p>
    </div>
  );

  const renderUnattunedShelf2 = () => {
    if (isNormal) {
      return (
        <div className="overflow-y-auto no-scrollbar space-y-1 pb-2 no-flip-drag">
          {abilities?.map((abi, idx) => (
            <div
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
      <div
        className="overflow-y-auto no-scrollbar space-y-1 pb-[35px] cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors no-flip-drag"
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
          <div className="overflow-y-auto no-scrollbar pb-3 no-flip-drag">
            {level1Abilities?.map((abi, idx) => (
              <div
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
            <div
              key={`std1-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors no-flip-drag"
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
          <div className="overflow-y-auto no-scrollbar pb-3 no-flip-drag">
            {currentLevel >= 2 &&
              level2Abilities?.map((abi, idx) => (
                <div
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
            <div
              key={`std2-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors no-flip-drag"
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
          <div className="overflow-y-auto no-scrollbar pb-[35px] no-flip-drag">
            {currentLevel >= 3 &&
              level3Abilities?.map((abi, idx) => (
                <div
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
          className={`overflow-y-auto no-scrollbar flex flex-col h-full pb-[35px] ${getFadeClass(
            "delay-400"
          )}`}
        >
          {abilities?.slice(4).map((abi, idx) => (
            <div
              key={`std3-${idx}`}
              className="mb-1 cursor-pointer hover:bg-amber-900/10 rounded px-1 transition-colors no-flip-drag"
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

  // Dynamic burn origin styles and classes
  const burnOriginClass =
    burnOrigin === "center"
      ? "origin-center animate-button-consume-center"
      : burnOrigin === "top"
      ? "origin-top animate-button-consume-top"
      : burnOrigin === "left"
      ? "origin-left animate-button-consume-left"
      : burnOrigin === "right"
      ? "origin-right animate-button-consume-right"
      : "origin-bottom animate-button-consume-bottom";

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      {/* OUTER PERSPECTIVE WRAPPER */}
      <div
        className={`relative w-full h-full transition-shadow duration-700 ease-out scale-100 ${
          isAttunable && isAttuned
            ? "drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]"
            : "drop-shadow-2xl"
        }`}
        style={{ perspective: "1200px" }}
      >
        {/* INNER WRAPPER: Handles 3D gesture drag rotation & flip */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={`relative w-full h-full bg-[length:100%_100%] bg-no-repeat bg-center text-amber-950 select-none ${
            isDragging ? "cursor-grabbing" : isAttunable ? "cursor-grab" : ""
          } ${
            flipState === "out"
              ? flipDir > 0
                ? "animate-flip-out-right"
                : "animate-flip-out-left"
              : flipState === "in"
              ? flipDir > 0
                ? "animate-flip-in-right"
                : "animate-flip-in-left"
              : ""
          }`}
          style={{
            backgroundImage: `url('${bgImage}')`,
            transform:
              !flipState && isDragging
                ? `rotateY(${dragTilt}deg)`
                : !flipState && dragTilt !== 0
                ? `rotateY(${dragTilt}deg)`
                : undefined,
            transition: isDragging ? "none" : dragTilt !== 0 ? "transform 0.25s ease-out" : undefined,
            transformStyle: "preserve-3d",
            touchAction: "pan-y",
          }}
        >
          <style>
            {`
              @keyframes flip-out-right {
                0% { transform: rotateY(0deg); filter: brightness(1); }
                100% { transform: rotateY(90deg); filter: brightness(0.7); }
              }
              .animate-flip-out-right { animation: flip-out-right 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes flip-in-right {
                0% { transform: rotateY(-90deg); filter: brightness(0.7); }
                100% { transform: rotateY(0deg); filter: brightness(1); }
              }
              .animate-flip-in-right { animation: flip-in-right 0.2s cubic-bezier(0.2, 0, 0.4, 1) forwards; }

              @keyframes flip-out-left {
                0% { transform: rotateY(0deg); filter: brightness(1); }
                100% { transform: rotateY(-90deg); filter: brightness(0.7); }
              }
              .animate-flip-out-left { animation: flip-out-left 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes flip-in-left {
                0% { transform: rotateY(90deg); filter: brightness(0.7); }
                100% { transform: rotateY(0deg); filter: brightness(1); }
              }
              .animate-flip-in-left { animation: flip-in-left 0.2s cubic-bezier(0.2, 0, 0.4, 1) forwards; }

              @keyframes hieroglyph-etch {
                0% { clip-path: inset(0 100% 0 0); filter: drop-shadow(0 0 12px #fbbf24) brightness(2); color: #fef08a; transform: scale(1.1); }
                40% { clip-path: inset(0 0 0 0); filter: drop-shadow(0 0 15px #f59e0b) brightness(1.5); color: #f59e0b; transform: scale(1.1); }
                100% { clip-path: inset(0 0 0 0); filter: drop-shadow(0 0 0px transparent) brightness(1); color: rgb(69 26 3 / 0.7); transform: scale(1); }
              }
              .animate-hieroglyph { animation: hieroglyph-etch 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }

              @keyframes unlink-glow-burn {
                0% { color: rgb(69 26 3); filter: drop-shadow(0 0 0px transparent); transform: scale(1); opacity: 1; }
                40% { color: #fef08a; filter: drop-shadow(0 0 12px #fbbf24) brightness(1.5); transform: scale(1.2); opacity: 1; }
                100% { color: #ea580c; filter: drop-shadow(0 0 20px #ea580c) brightness(2); transform: scale(0); opacity: 0; }
              }
              .animate-unlink-burn { animation: unlink-glow-burn 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes button-consume-center {
                0% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
              }
              .animate-button-consume-center { animation: button-consume-center 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes button-consume-bottom {
                0% { transform: scaleY(1); opacity: 1; }
                100% { transform: scaleY(0); opacity: 0; }
              }
              .animate-button-consume-bottom { animation: button-consume-bottom 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

              @keyframes button-shake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-4px); }
                40%, 80% { transform: translateX(4px); }
              }
              .animate-button-shake { animation: button-shake 0.4s ease-in-out; }

              @keyframes inner-burn {
                0% { background-color: rgb(252, 192, 108); box-shadow: inset 0 0 3px #eab308; }
                30% { background-color: #fef08a; box-shadow: inset 0 0 2px #d97706; }
                100% { background-color: transparent; box-shadow: inset 0 0 0px transparent; }
              }
              .animate-inner-burn { animation: inner-burn 2.5s cubic-bezier(0.25, 1, 0.5, 1); }
            `}
          </style>

          {/* Golden enhance flash */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-amber-200 via-white to-amber-100 mix-blend-overlay rounded-2xl pointer-events-none transition-all duration-500 ease-out z-50 ${
              isEnhancing ? "opacity-100 scale-105" : "opacity-0 scale-100"
            }`}
          />

          {/* ITEM 4 & 5: Flip Icon */}
          {isAttunable && isAttuned && (
            <div className="absolute top-[22px] left-[18px] z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFlip(1);
                }}
                title={isFlipped ? "View Attuned Stats" : "View Base Stats"}
                className={`relative p-2 rounded-full cursor-pointer flex items-center justify-center group transition-all duration-300 ease-out text-amber-950/70 hover:text-amber-600 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:scale-110 active:scale-95 ${
                  isInteracting
                    ? "opacity-0 scale-75 pointer-events-none transition-all duration-300 ease-out"
                    : "animate-hieroglyph opacity-100 scale-100"
                }`}
              >
                <div className="absolute inset-0 rounded-full border border-amber-400/0 group-hover:border-amber-400/60 group-hover:scale-[1.4] group-hover:opacity-0 transition-all duration-500 ease-out pointer-events-none" />
                <RotateCcw
                  className={`w-5 h-5 relative z-10 transition-transform duration-500 ${
                    isFlipped ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {/* Unattune Button */}
          {isAttunable && isAttuned && (
            <div className="absolute top-[22px] right-[18px] z-30">
              <button
                onClick={handleToggleAttune}
                title="Unattune Item"
                className={`relative p-2 rounded-full cursor-pointer flex items-center justify-center group text-amber-950/70 ${
                  isUnlinking
                    ? "animate-unlink-burn pointer-events-none"
                    : isInteracting
                    ? "opacity-0 scale-75 pointer-events-none transition-all duration-300 ease-out"
                    : "animate-hieroglyph transition-all duration-300 ease-out hover:text-amber-600 hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:scale-110 active:scale-95"
                }`}
              >
                {!isUnlinking && (
                  <div className="absolute inset-0 rounded-full border border-amber-400/0 group-hover:border-amber-400/60 group-hover:scale-[1.4] group-hover:opacity-0 transition-all duration-500 ease-out pointer-events-none" />
                )}
                <Unlink className="w-5 h-5 relative z-10 transition-colors duration-300" />
              </button>
            </div>
          )}

          {/* Card Title */}
          <div
            className={`absolute top-[25px] inset-x-0 mx-auto w-[220px] h-[38px] flex items-center justify-center text-center px-2 pointer-events-none ${getFadeClass(
              "delay-100"
            )}`}
          >
            <h2 className="font-serif text-[12px] font-bold tracking-wide text-amber-950 leading-tight">
              {name || "Item Name"}
            </h2>
          </div>

          {/* ITEM 9: Layered Art Area */}
          <div className="absolute top-[50px] inset-x-0 mx-auto w-full h-[175px] flex flex-col items-center justify-start pt-1 transition-all duration-500">
            {artworkSrc ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedImage(artworkSrc);
                }}
                title="Click to inspect full card artwork"
                className={`w-[190px] h-[190px] mt-1 flex items-center justify-center relative transition-transform duration-300 cursor-pointer hover:scale-105 active:scale-95 group no-flip-drag`}
              >
                {/* Layer 1: Thematic Background Glow */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
                    effects?.theme === "underworld-fire" || id === "cleaver_001"
                      ? "bg-gradient-to-t from-orange-600/30 via-red-500/20 to-transparent blur-xl"
                      : effects?.theme === "phoenix-flame" || id === "wand_001"
                      ? "bg-gradient-to-r from-amber-400/30 via-yellow-300/20 to-orange-400/30 blur-2xl"
                      : isAttunable && displayAttuned
                      ? "bg-amber-400/25 blur-xl group-hover:bg-amber-400/40 group-hover:blur-2xl"
                      : "bg-amber-200/15 blur-md"
                  }`}
                />

                {/* Layer 2: Main Artwork Sprite */}
                <img
                  src={artworkSrc}
                  alt={name}
                  className="max-w-full max-h-full object-contain drop-shadow-md relative z-10 pointer-events-none"
                />

                {/* Layer 3: Foreground Thematic Embers (for Cleaver/flame items) */}
                {(effects?.theme === "underworld-fire" || id === "cleaver_001") && (
                  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-full">
                    <div className="absolute bottom-2 left-4 w-1.5 h-1.5 rounded-full bg-amber-400/70 blur-[0.5px] animate-[ping_2s_infinite]" />
                    <div className="absolute bottom-6 right-6 w-2 h-2 rounded-full bg-orange-500/60 blur-[1px] animate-[ping_1.5s_infinite]" />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`text-[11px] leading-snug text-amber-950 pt-2 px-6 w-full text-justify overflow-y-auto no-scrollbar max-h-[160px] no-flip-drag ${getFadeClass(
                  "delay-100"
                )}`}
              >
                <p>{description || flavorText}</p>
              </div>
            )}

            {isAttunable && displayAttuned && specs && (
              <div
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
                className={`absolute bottom-[-15px] left-[10px] w-[140px] text-[5px] leading-tight text-amber-950 text-left cursor-pointer hover:bg-amber-900/10 rounded px-1 py-0.5 transition-colors z-20 no-flip-drag ${getFadeClass(
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

          {/* Stat Inputs */}
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

          {/* Ability Shelves */}
          {isAttunable && displayAttuned ? (
            <>
              <div className="absolute top-[245px] left-[8px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
                {renderAttunedShelf1()}
              </div>
              <div className="absolute top-[325px] left-[8px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
                {renderAttunedShelf2()}
              </div>
              <div className="absolute top-[406px] left-[8px] right-[22px] h-[60px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
                {renderAttunedShelf3()}
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-[248px] left-[10px] right-[22px] h-[72px] flex flex-col text-[8px] leading-snug text-amber-950 pr-1">
                {renderUnattunedShelf1()}
              </div>
              <div className="absolute top-[350px] left-[12px] right-[22px] h-[110px] flex flex-col text-[7px] leading-snug text-amber-950 pr-1">
                {renderUnattunedShelf2()}
              </div>
            </>
          )}

          {/* Progressive Checkboxes */}
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

          {/* ITEM 6 & 7: Attune Button with Unified Animations & Configurable Burn Origin */}
          {isAttunable && (!isAttuned || isBurningButton) && (
            <div className="absolute bottom-[30px] right-[14px] z-20 flex items-center justify-center no-flip-drag">
              {isBurningButton && (
                <svg width="0" height="0" className="absolute">
                  <filter
                    id="button-noise"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.1"
                      numOctaves="3"
                      result="noise"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="noise"
                      scale="15"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>
                </svg>
              )}
              {isBurningButton && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                  <div
                    className={`absolute w-full h-full rounded bg-[#e8d5b7] ${burnOriginClass}`}
                    style={{
                      filter: "url(#button-noise)",
                      border: "2px solid #fef08a",
                      boxShadow:
                        "inset 0 0 10px 4px rgba(234, 88, 12, 0.8), 0 0 15px 5px rgba(245, 158, 11, 0.6)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-slate-900" />
                  </div>
                  <div className={`absolute w-full h-full flex items-center justify-center mix-blend-color-dodge opacity-90 ${burnOriginClass}`}>
                    <div className="absolute -top-2 -left-2 w-2 h-2 bg-amber-200 rounded-full blur-[1px] animate-[ping_0.3s_ease-out_infinite]" />
                    <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-orange-500 rounded-full blur-[2px] animate-[ping_0.5s_ease-out_infinite]" />
                  </div>
                </div>
              )}
              <button
                onClick={handleToggleAttune}
                className={`group relative overflow-hidden px-3 py-1.5 rounded border-[1px] border-[rgb(170,120,38)] bg-[#e8d5b7] hover:bg-[rgb(170,120,38)] hover:border-[rgb(170,120,38)] font-bold text-[8px] tracking-wider uppercase shadow-sm transition-all duration-300 transform cursor-pointer ${
                  isShakeButton ? "animate-button-shake border-red-500 text-red-900" : ""
                } ${
                  isBurningButton
                    ? "opacity-0 scale-0"
                    : "opacity-100 scale-100 hover:shadow-[0_0_15px_rgba(170,120,38,0.7)] hover:scale-105 active:scale-95"
                }`}
              >
                <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-amber-100/80 to-transparent skew-x-[-25deg] group-hover:translate-x-[250%] transition-transform duration-700 ease-in-out pointer-events-none" />
                <span className="relative z-10 transition-colors duration-300 text-amber-950 group-hover:text-[#e8d5b7]">
                  Attune
                </span>
              </button>
            </div>
          )}

          {/* Info Popover */}
          {popoverText && (
            <div
              className="absolute inset-0 z-[100] flex items-center justify-center p-4 no-flip-drag"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverText(null);
              }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none" />
              <div
                className="relative bg-[#e8d5b7] p-4 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] w-full max-h-full overflow-y-auto border-2 border-[#AA7826]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-3 border-b border-[#AA7826]/30 pb-2">
                  <strong className="font-serif text-amber-950 font-bold">
                    {popoverText.title}
                  </strong>
                  <button
                    onClick={() => setPopoverText(null)}
                    className="text-amber-950 font-bold hover:text-red-700 cursor-pointer p-1"
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

      {/* ITEM 8: Expanded Card / Photo Background Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 no-flip-drag"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[16/25] rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.45)] flex flex-col items-center justify-between p-6 bg-slate-950/95 text-amber-100 transition-all duration-300 scale-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: `url('${bgImage}')`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/60 border border-amber-500/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 transition-all cursor-pointer z-30"
              title="Close expanded view"
            >
              ✕
            </button>

            {/* Card Title */}
            <h3 className="font-serif font-bold text-amber-950 text-base text-center mt-2 px-8">
              {name}
            </h3>

            {/* Expanded Artwork */}
            <div className="flex-1 w-full flex items-center justify-center relative my-4">
              <img
                src={expandedImage}
                alt={name}
                className="max-w-full max-h-[250px] sm:max-h-[300px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
              />
            </div>

            {/* Caption / Lore */}
            <div className="w-full bg-amber-950/80 border border-amber-500/40 rounded-xl p-3 text-center backdrop-blur-xs">
              <p className="font-serif text-xs text-amber-200 italic line-clamp-3">
                {flavorText || description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
