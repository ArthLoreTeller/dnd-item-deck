import React from "react";
import { Star, Sword, Wand2, Shield, Pyramid, SquareText } from "lucide-react";

export const getLucideIcon = (item) => {
  const iconString = item?.icon?.toLowerCase() || "";
  const itemName = item?.name?.toLowerCase() || "";
  
  if (iconString === "kunai" || itemName.includes("kunai")) {
    let colorClass = "text-slate-300";
    if (itemName.includes("aquamarine")) colorClass = "text-cyan-400";
    if (itemName.includes("obsidian")) colorClass = "text-purple-800";
    if (itemName.includes("malachite")) colorClass = "text-emerald-500";
    if (itemName.includes("ferruginous")) colorClass = "text-orange-500";
    return <Pyramid className={`w-4 h-4 ${colorClass}`} />;
  }

  switch (iconString) {
    case "sword": return <Sword className="w-4 h-4 text-slate-300" />;
    case "wand": return <Wand2 className="w-4 h-4 text-blue-400" />;
    case "buff": return <SquareText className="w-4 h-4 text-yellow-400" />;
    case "shield": return <Shield className="w-4 h-4 text-yellow-400" />;
    default: return <Star className="w-4 h-4 text-slate-400" />;
  }
};