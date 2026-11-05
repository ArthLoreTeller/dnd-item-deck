// Only replace the exact descriptions shipped by the original catalogue.
const oldTalismans = new Set(["protection_001", "protection_002", "protection_003", "protection_005"]);

export function normalizeCatalogSpecs(card) {
  const { id, specs } = card;
  if (!specs) return card;
  const changes = {};
  if (id === "wand_001" && specs.type === "Wand, rare") changes.type = "Wand";
  if (oldTalismans.has(id)) {
    if (specs.type === "Talisman, common") changes.type = "Talisman";
    if (specs.attunement === "requires attunement") changes.attunement = "None";
  }
  return Object.keys(changes).length ? { ...card, specs: { ...specs, ...changes } } : card;
}
