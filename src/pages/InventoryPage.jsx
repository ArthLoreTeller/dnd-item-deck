import { useState } from 'react';
import { Backpack, Sword, Shield, FlaskConical, Gem, Search, BookOpen, Pencil } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { RarityBadge } from '../components/RarityBadge';
import { EquipmentEditor } from '../components/EquipmentEditor';
import { LoadSummary } from '../components/LoadSummary';
import { pounds } from '../data/units';
import { RARITIES } from '../data/rarity';
import { groupInventory } from '../data/inventory';
function artwork(card) {
  if (card?.isAttuned) return card.images?.[`level${card.currentLevel}`] || card.images?.attuned || card.images?.base || card.itemImage;
  return card?.images?.base || card?.itemImage;
}
export function InventoryPage({ onInspect, onTools, onCharacter, onDeck }) {
  const { equipment, inventory, profile, lastDiscard, undoDiscard, lastEquipmentRemoval, undoEquipmentRemoval, lastConsumption, consumeEquipment, undoConsume } = useCardStore();
  const [query, setQuery] = useState(''), [sort, setSort] = useState('name'), [carried, setCarried] = useState(false), [attuned, setAttuned] = useState(false), [editing, setEditing] = useState(undefined);
  const cardsById = new Map(inventory.map(card => [String(card.id), card]));
  const filtered = equipment.filter(entry => (cardsById.get(entry.relicCardId)?.name || entry.name).toLowerCase().includes(query.toLowerCase()) && (!carried || entry.carried) && (!attuned || cardsById.get(entry.relicCardId)?.isAttuned));
  const groups = groupInventory(filtered, inventory);
  const totalWeight = group => group.entries.some(entry => entry.unitWeightLb === null) ? -1 : group.entries.reduce((total, entry) => total + entry.quantity * entry.unitWeightLb, 0);
  groups.sort((a, b) => sort === 'weight' ? totalWeight(b) - totalWeight(a) : sort === 'rarity' ? Object.keys(RARITIES).indexOf(b.rarity) - Object.keys(RARITIES).indexOf(a.rarity) : a.name.localeCompare(b.name));
  return <main className="player-page" id="relic-inventory">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S PACK</p><h2>Inventory <span className="count-label">{equipment.length}</span></h2><p className="muted">Relics, provisions, and the things worth carrying.</p></div><div className="page-actions"><button className="primary-magic-button" onClick={() => setEditing(null)}>+ Add equipment</button><button className="journal-button" onClick={onTools}>Backup & recovery</button></div></div>
    <LoadSummary profile={profile} equipment={equipment} />
    <button className="text-link" onClick={onCharacter}>Manage character & capacity →</button>
    <div className="inventory-toolbar player-form"><label className="search-field"><Search size={18} /><input aria-label="Search equipment" placeholder="Search your pack…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Sort equipment" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="rarity">Rarity</option><option value="weight">Heaviest first</option></select><label className="check-label"><input type="checkbox" checked={carried} onChange={e => setCarried(e.target.checked)} />Carried</label><label className="check-label"><input type="checkbox" checked={attuned} onChange={e => setAttuned(e.target.checked)} />Attuned</label></div>
    <div className="page-actions inventory-recovery">{lastConsumption && <button className="journal-button" onClick={undoConsume}>Undo consume {lastConsumption.entry.name}</button>}{lastDiscard && <button className="journal-button" onClick={undoDiscard}>Undo relic discard</button>}{lastEquipmentRemoval && <button className="journal-button" onClick={undoEquipmentRemoval}>Restore {lastEquipmentRemoval.name}</button>}</div>
    {groups.length ? <div className="equipment-list" role="list" aria-label="Equipment">{groups.map(group => {
      const entry = group.entries[0], card = cardsById.get(entry.relicCardId);
      const src = card ? artwork(card) : entry.imageUrl;
      const Icon = ({ Weapon: Sword, Armor: Shield, Consumable: FlaskConical, Treasure: Gem })[entry.category] || Backpack;
      const weights = new Set(group.entries.map(item => item.unitWeightLb));
      const weightLabel = weights.size > 1 ? 'Mixed unit weights' : entry.unitWeightLb === null ? 'Weight unknown' : `${pounds(entry.unitWeightLb)} lb each`;
      const locations = new Set(group.entries.map(item => item.carried));
      return <article className="equipment-row" role="listitem" key={group.key}>
        <div className="equipment-thumbnail" aria-hidden="true">{src ? <img src={src} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} /> : null}<Icon className="equipment-placeholder" size={24} /></div>
        <div className="equipment-info"><div className="equipment-name-line"><h3>{group.name}</h3><span className="equipment-quantity" aria-label={`Quantity: ${group.quantity}`}>×{group.quantity}</span></div><div className="inventory-meta"><RarityBadge card={{ rarity: group.rarity }} /><span>{entry.category}</span>{card?.isAttuned && <span>✦ Attuned</span>}<span>{weightLabel}</span><span>{locations.size > 1 ? 'Carried / stored' : entry.carried ? 'Carried' : 'Stored'}</span></div></div>
        <div className="equipment-row-actions">
          {group.consumable && <button type="button" className="equipment-consume" aria-label={`Consume one ${group.name}`} onClick={() => consumeEquipment(entry.id)}>Consume</button>}
          <button type="button" className="equipment-icon-action" aria-label={`Edit ${group.name} weight and quantity`} aria-haspopup="dialog" onClick={() => setEditing(entry)}><Pencil size={17} aria-hidden="true" /><span className="action-tooltip" aria-hidden="true">Edit equipment</span></button>
          <button type="button" className="equipment-icon-action" aria-label={`Read details for ${group.name}`} aria-haspopup="dialog" onClick={() => card ? onInspect(card) : setEditing(entry)}><BookOpen size={18} aria-hidden="true" /><span className="action-tooltip" aria-hidden="true">Read details</span></button>
        </div>
      </article>;
    })}</div> : <div className="empty-pack"><Backpack size={44} /><h3>{equipment.length ? 'No matching equipment' : 'Your next adventure starts here'}</h3><p>Add your provisions, import a character, or draw your first relic.</p><button className="journal-button" onClick={onDeck}>Visit the deck</button></div>}
    {editing !== undefined && <EquipmentEditor equipment={editing} onClose={() => setEditing(undefined)} />}
  </main>;
}
