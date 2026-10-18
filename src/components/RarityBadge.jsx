import { RARITIES, normalizeCard } from '../data/rarity';
export function RarityBadge({ card }) {
  const rarity = RARITIES[normalizeCard(card).rarity];
  return <span className="rarity-badge" data-rarity={normalizeCard(card).rarity} style={{ '--rarity-color': rarity.color }}>✦ {rarity.label}</span>;
}
