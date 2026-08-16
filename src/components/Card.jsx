import React, { useState, useEffect, useRef } from 'react';
import { useCardStore } from '../store/useCardStore';

// StatInput component for rendering individual stat input fields
function StatInput({ id, stats, updateCard, label, statKey, topPosition, textClass = 'text-[12px]' }) {
  return (
    <div className="absolute right-[20px] w-[30px] flex flex-col items-center" style={{ top: topPosition }}>
      <div className="h-[25px] w-full flex items-center justify-center px-0.5">
        <input
          type="text"
          value={stats?.[statKey] || ''}
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
export function Card({ card, onResetDeck }) {
  const updateCard = useCardStore((state) => state.updateCard);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const {
    id,
    type = 'standard',
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

  const isNormal = type === 'normal';
  const isProgressive = type === 'progressive';
  const isStandard = type === 'standard';
  const isAttunable = !isNormal;

  const bgImage =
    isAttunable && isAttuned ? '/assets/attune-base.png' : '/assets/card-front.png';

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

  if (!card) return null;

  const handleProgress = (levelIndex, val) => {
    const currentProgress = progress || { level1: 0, level2: 0 };
    const newProgress = { ...currentProgress, [`level${levelIndex}`]: val };

    let newLevel = 1;
    if (newProgress.level1 >= 20) newLevel = 2;
    if (newProgress.level1 >= 20 && newProgress.level2 >= 20) newLevel = 3;

    updateCard(id, { progress: newProgress, currentLevel: newLevel });
  };

  const handleToggleAttune = (e) => {
    if (e) e.stopPropagation();
    if (!isAttunable) return;
    updateCard(id, { isAttuned: !isAttuned });
  };

  const getArtworkSrc = () => {
    let src = images?.base || itemImage;
    if (isAttunable && isAttuned) {
      if (isProgressive) {
        if (currentLevel >= 3 && images?.level3) return images.level3;
        if (currentLevel >= 2 && images?.level2) return images.level2;
      }
      return images?.attuned || src;
    }
    return src;
  };

  const getFadeClass = (delayClass = '') => {
    return `transition-opacity ${
      isEnhancing
        ? 'opacity-0 duration-75 pointer-events-none'
        : `opacity-100 duration-500 ${delayClass}`
    }`;
  };

  const renderCheckboxes = (levelIndex, currentVal, customPosition) => (
    <div className={`absolute ${customPosition} flex justify-end z-10 origin-bottom-right`}>
      <div className="flex border-y border-1 border-l border-[#AA7826] bg-[#CCAE78] shadow-sm">
        {Array.from({ length: maxProgress }).map((_, i) => (
          <div
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleProgress(levelIndex, i + 1 === currentVal ? i : i + 1);
            }}
            className={`w-[7px] min-w-[7px] h-[7px] border-r border-[#AA7826] cursor-pointer transition-colors ${
              i < currentVal ? 'bg-gradient-to-b from-[#3a1d07] to-[#8f5126]' : 'bg-transparent hover:bg-[#AA7826]/30'
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderUnattunedShelf1 = () => (
    <div className="overflow-y-auto no-scrollbar pb-2">
      <p className="italic font-serif leading-tight text-justify">{flavorText || description}</p>
    </div>
  );

  const renderUnattunedShelf2 = () => {
    if (isNormal) {
      return (
        <div className="overflow-y-auto no-scrollbar space-y-1 pb-2">
          {abilities?.map((abi, idx) => (
            <div key={`nml-${idx}`} className="mb-1">
              <span className="font-bold font-serif">{abi.title}: </span>
              <span className="italic">{abi.description}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-y-auto no-scrollbar space-y-1 pb-[35px]">
        <p><span className="font-bold">Attunement:</span> {attunementRules}</p>
        {weaponStats && (
          <>
            <p><span className="font-bold">Weapon Stat:</span> {weaponStats.weaponStat}</p>
            <p><span className="font-bold">Attack Bonus:</span> {weaponStats.attackBonus}</p>
            <p><span className="font-bold">Damage Bonus:</span> {weaponStats.damageBonus}</p>
            <p><span className="font-bold">Save DC:</span> {weaponStats.saveDc}</p>
          </>
        )}
      </div>
    );
  };

  const renderAttunedShelf1 = () => {
    if (isProgressive) {
      return (
        <div className={`flex flex-col h-full ${getFadeClass('delay-200')}`}>
          <div className="overflow-y-auto no-scrollbar pb-3">
            {level1Abilities?.map((abi, idx) => (
              <div key={`l1-${idx}`} className="mb-1">
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
        <div className={`overflow-y-auto no-scrollbar flex flex-col h-full ${getFadeClass('delay-200')}`}>
          {abilities?.slice(0, 2).map((abi, idx) => (
            <div key={`std1-${idx}`} className="mb-1">
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
        <div className={`flex flex-col h-full ${getFadeClass('delay-300')}`}>
          <div className="overflow-y-auto no-scrollbar pb-3">
            {currentLevel >= 2 && level2Abilities?.map((abi, idx) => (
              <div key={`l2-${idx}`} className="mb-1">
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
        <div className={`overflow-y-auto no-scrollbar flex flex-col h-full ${getFadeClass('delay-300')}`}>
          {abilities?.slice(2, 4).map((abi, idx) => (
            <div key={`std2-${idx}`} className="mb-1">
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
        <div className={`flex flex-col h-full ${getFadeClass('delay-400')}`}>
          <div className="overflow-y-auto no-scrollbar pb-[35px]">
            {currentLevel >= 3 && level3Abilities?.map((abi, idx) => (
              <div key={`l3-${idx}`} className="mb-1">
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
        <div className={`overflow-y-auto no-scrollbar flex flex-col h-full pb-[35px] ${getFadeClass('delay-400')}`}>
          {abilities?.slice(4).map((abi, idx) => (
            <div key={`std3-${idx}`} className="mb-1">
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
    <div className="flex flex-col items-center gap-4 w-full h-full">
      <div
        className={`relative w-full h-full bg-[length:100%_100%] bg-no-repeat bg-center text-amber-950 select-none transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isAttunable && isAttuned
            ? 'drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-[1.02]'
            : 'drop-shadow-2xl scale-100'
        }`}
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        {/* Flash Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-amber-200 via-white to-amber-100 mix-blend-overlay rounded-2xl pointer-events-none transition-all duration-500 ease-out z-50 ${
            isEnhancing ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
          }`}
        />

        {/* Title Banner */}
        <div className={`absolute top-[22px] inset-x-0 mx-auto w-[220px] h-[38px] flex items-center justify-center text-center px-2 ${getFadeClass('delay-100')}`}>
          <h2 className="font-serif text-[12px] font-bold tracking-wide text-amber-950 leading-tight">
            {name || 'Item Name'}
          </h2>
        </div>

        {/* Artwork Area */}
        <div className="absolute top-[50px] inset-x-0 mx-auto w-full h-[175px] flex flex-col items-center justify-start pt-1 transition-all duration-500">
          {artworkSrc ? (
            <div
              onClick={isAttunable && isAttuned ? handleToggleAttune : undefined}
              title={isAttunable && isAttuned ? 'Click to Unattune' : ''}
              className={`w-[174px] h-[174px] mt-1 flex items-center justify-center relative transition-transform duration-300 ${
                isAttunable && isAttuned ? 'cursor-pointer hover:scale-105 active:scale-95 group' : ''
              }`}
            >
              <div
                className={`absolute inset-0 bg-amber-400/20 blur-xl rounded-full transition-all duration-500 ${
                  isAttunable && isAttuned ? 'opacity-100 group-hover:bg-amber-400/50 group-hover:blur-2xl' : 'opacity-0'
                }`}
              />
              <img
                src={artworkSrc}
                alt={name}
                className="max-w-full max-h-full object-contain drop-shadow-md relative z-10 pointer-events-none"
              />
            </div>
          ) : (
            <div
              onClick={isAttunable && isAttuned ? handleToggleAttune : undefined}
              title={isAttunable && isAttuned ? 'Click to Unattune' : ''}
              className={`text-[11px] leading-snug text-amber-950 pt-2 px-6 w-full text-justify overflow-y-auto no-scrollbar max-h-[160px] ${getFadeClass('delay-100')} ${
                isAttunable && isAttuned ? 'cursor-pointer hover:text-amber-700' : ''
              }`}
            >
              <p>{description || flavorText}</p>
            </div>
          )}

          {/* Weapon Specs */}
          {isAttunable && isAttuned && specs && (
            <div className={`absolute bottom-[0px] left-[22px] w-[140px] text-[5px] leading-tight text-amber-950 text-left ${getFadeClass('delay-200')}`}>
              <p className="italic">{specs.type}</p>
              <p className="italic">{specs.attunement}</p>
              <p><span className="font-bold">Properties:</span> {specs.properties}</p>
              <p><span className="font-bold">Ranges:</span> {specs.ranges}</p>
              <p><span className="font-bold">Damage:</span> {specs.damage}</p>
              <p><span className="font-bold">Damage Type:</span> {specs.damageType}</p>
            </div>
          )}
        </div>

        {/* Stat Inputs: Only rendered when attuned */}
        {isAttunable && isAttuned && (
          <div className={`${getFadeClass('delay-100')}`}>
            <StatInput id={id} stats={stats} updateCard={updateCard} label="Hit" statKey="hit" topPosition="85px" />
            <StatInput id={id} stats={stats} updateCard={updateCard} label="Damage" statKey="damage" topPosition="130px" textClass="text-[6px]" />
            <StatInput id={id} stats={stats} updateCard={updateCard} label="Save DC" statKey="saveDc" topPosition="173px" />
          </div>
        )}

        {/* Shelves */}
        {isAttunable && isAttuned ? (
          <>
            <div className="absolute top-[230px] left-[22px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
              {renderAttunedShelf1()}
            </div>
            <div className="absolute top-[305px] left-[22px] right-[22px] h-[62px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
              {renderAttunedShelf2()}
            </div>
            <div className="absolute top-[382px] left-[22px] right-[22px] h-[60px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
              {renderAttunedShelf3()}
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-[235px] left-[22px] right-[22px] h-[72px] flex flex-col text-[7.5px] leading-snug text-amber-950 pr-1">
              {renderUnattunedShelf1()}
            </div>
            <div className="absolute top-[325px] left-[22px] right-[22px] h-[110px] flex flex-col text-[7px] leading-snug text-amber-950 pr-1">
              {renderUnattunedShelf2()}
            </div>
          </>
        )}

        {/* Progress Checkboxes */}
        {isAttunable && isAttuned && isProgressive && (
          <div className={`${getFadeClass('delay-200')}`}>
            {level2Abilities && renderCheckboxes(1, progress?.level1 || 0, 'top-[284px] right-[7.5px]')}
            {currentLevel >= 2 && level3Abilities && renderCheckboxes(2, progress?.level2 || 0, 'top-[359.5px] right-[7.5px]')}
          </div>
        )}

        {/* Attune Button */}
        {isAttunable && !isAttuned && (
          <div className="absolute bottom-[30px] right-[14px] z-20">
            <button
              onClick={handleToggleAttune}
              className="group relative overflow-hidden px-3 py-1.5 rounded border-[1px] border-[rgb(170,120,38)] bg-[#e8d5b7] hover:bg-[rgb(170,120,38)] hover:border-[rgb(170,120,38)] font-bold text-[8px] tracking-wider uppercase shadow-sm hover:shadow-[0_0_15px_rgba(170,120,38,0.7)] transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-amber-100/80 to-transparent skew-x-[-25deg] group-hover:translate-x-[250%] transition-transform duration-700 ease-in-out pointer-events-none" />
              <span className="relative z-10 transition-colors duration-300 text-amber-950 group-hover:text-[#e8d5b7]">
                Attune
              </span>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onResetDeck();
        }}
        className="text-xs text-amber-300/80 hover:text-amber-200 underline transition-colors whitespace-nowrap cursor-pointer"
      >
        Return Card to Deck
      </button>
    </div>
  );
}