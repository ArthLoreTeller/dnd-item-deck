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
    return <Pyramid data-item-icon={itemName.includes("aquamarine") ? "aquamarine" : itemName.includes("obsidian") ? "obsidian" : itemName.includes("malachite") ? "malachite" : itemName.includes("ferruginous") ? "ferruginous" : "weapon"} className={`w-4 h-4 ${colorClass}`} />;
  }

  switch (iconString) {
    case "sword": return <Sword data-item-icon="weapon" className="w-4 h-4 text-slate-300" />;
    case "wand": return <Wand2 data-item-icon="wand" className="w-4 h-4 text-blue-400" />;
    case "buff": return <SquareText data-item-icon="talisman" className="w-4 h-4 text-yellow-400" />;
    case "shield": return <Shield data-item-icon="talisman" className="w-4 h-4 text-yellow-400" />;
    default: return <Star data-item-icon="generic" className="w-4 h-4 text-slate-400" />;
  }
};