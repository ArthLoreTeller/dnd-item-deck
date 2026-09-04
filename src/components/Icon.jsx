import React from "react";
import { Star, Sword, Wand2, Shield, Pyramid, SquareText, Sparkles, Scroll, FlaskConical, CircleDot } from "lucide-react";

export const getLucideIcon = (item) => {
  const rawIcon = item?.icon?.trim() || "";
  const iconString = rawIcon.toLowerCase();
  const itemName = item?.name?.toLowerCase() || "";

  // Check if raw icon is an emoji or custom symbol (e.g. 💠, ⚔️, 🛡️, 💍, ✨)
  const isEmojiOrSymbol = /\p{Extended_Pictographic}/u.test(rawIcon);
  if (isEmojiOrSymbol) {
    return <span className="text-sm leading-none select-none" role="img" aria-label={item?.name || "icon"}>{rawIcon}</span>;
  }
  
  if (iconString === "kunai" || itemName.includes("kunai") || iconString === "dagger") {
    let colorClass = "text-slate-300";
    if (itemName.includes("aquamarine")) colorClass = "text-cyan-400";
    if (itemName.includes("obsidian")) colorClass = "text-purple-400";
    if (itemName.includes("malachite")) colorClass = "text-emerald-400";
    if (itemName.includes("ferruginous")) colorClass = "text-orange-400";
    return <Pyramid className={`w-4 h-4 ${colorClass}`} />;
  }

  switch (iconString) {
    case "sword":
    case "weapon":
    case "melee":
      return <Sword className="w-4 h-4 text-slate-300" />;
    case "wand":
    case "staff":
    case "magic":
      return <Wand2 className="w-4 h-4 text-blue-400" />;
    case "buff":
    case "rune":
      return <SquareText className="w-4 h-4 text-amber-400" />;
    case "shield":
    case "armor":
      return <Shield className="w-4 h-4 text-amber-300" />;
    case "scroll":
    case "spell":
      return <Scroll className="w-4 h-4 text-amber-200" />;
    case "potion":
    case "flask":
      return <FlaskConical className="w-4 h-4 text-emerald-400" />;
    case "ring":
    case "trinket":
      return <CircleDot className="w-4 h-4 text-cyan-300" />;
    case "gem":
    case "artifact":
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    default:
      return <Star className="w-4 h-4 text-slate-400" />;
  }
};