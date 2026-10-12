import { useState } from 'react';
import { Backpack, Sword, Shield, FlaskConical, Gem, Search } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { RarityBadge } from '../components/RarityBadge';
import { EquipmentEditor } from '../components/EquipmentEditor';
import { LoadSummary } from '../components/LoadSummary';
import { pounds } from '../data/units';
import { RARITIES } from '../data/rarity';
function artwork(card) {
  if (card?.isAttuned) return card.images?.[`level${card.currentLevel}`] || card.images?.attuned || card.images?.base || card.itemImage;
  return card?.images?.base || card?.itemImage;
}
export function InventoryPage({ onInspect, onTools, onCharacter, onDeck }) {
  const { equipment, inventory, profile, lastDiscard, undoDiscard, lastEquipmentRemoval, undoEquipmentRemoval } = useCardStore();
  const [query, setQuery] = useState(''), [sort, setSort] = useState('name'), [carried, setCarried] = useState(false), [attuned, setAttuned] = useState(false), [editing, setEditing] = useState(undefined);
  const entries = equipment.map(entry => ({ ...entry, card: inventory.find(card => String(card.id) === entry.relicCardId) })).filter(entry => (entry.card?.name || entry.name).toLowerCase().includes(query.toLowerCase()) && (!carried || entry.carried) && (!attuned || entry.card?.isAttuned));
  entries.sort((a, b) => sort === 'weight' ? (b.unitWeightLb === null ? -1 : b.quantity * b.unitWeightLb) - (a.unitWeightLb === null ? -1 : a.quantity * a.unitWeightLb) : sort === 'rarity' ? Object.keys(RARITIES).indexOf(b.card?.rarity) - Object.keys(RARITIES).indexOf(a.card?.rarity) : (a.card?.name || a.name).localeCompare(b.card?.name || b.name));
  return <main className="player-page" id="relic-inventory">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S PACK</p><h2>Inventory <span className="count-label">{equipment.length}</span></h2><p className="muted">Relics, provisions, and the things worth carrying.</p></div><div className="page-actions"><button className="primary-magic-button" onClick={() => setEditing(null)}>+ Add equipment</button><button className="journal-button" onClick={onTools}>Backup & recovery</button></div></div>
    <LoadSummary profile={profile} equipment={equipment} />
    <button className="text-link" onClick={onCharacter}>Manage character & capacity →</button>
    <div className="inventory-toolbar player-form"><label className="search-field"><Search size={18} /><input aria-label="Search equipment" placeholder="Search your pack…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Sort equipment" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="rarity">Rarity</option><option value="weight">Heaviest first</option></select><label className="check-label"><input type="checkbox" checked={carried} onChange={e => setCarried(e.target.checked)} />Carried</label><label className="check-label"><input type="checkbox" checked={attuned} onChange={e => setAttuned(e.target.checked)} />Attuned</label></div>
    <div className="page-actions">{lastDiscard && <button className="journal-button" onClick={undoDiscard}>Undo relic discard</button>}{lastEquipmentRemoval && <button className="journal-button" onClick={undoEquipmentRemoval}>Restore {lastEquipmentRemoval.name}</button>}</div>
    {entries.length ? <div className="equipment-grid">{entries.map(entry => {
      const src = entry.card ? artwork(entry.card) : entry.imageUrl;
      const Icon = ({ Weapon: Sword, Armor: Shield, Consumable: FlaskConical, Treasure: Gem })[entry.category] || Backpack;
      return <article className="equipment-tile" key={entry.id}>
        <button className="equipment-inspect" onClick={() => entry.card ? onInspect(entry.card) : setEditing(entry)} aria-label={`Inspect ${entry.card?.name || entry.name}`}><div className="equipment-art">{src ? <img src={src} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} /> : null}<Icon className="equipment-placeholder" size={52} aria-hidden="true" /></div><div className="equipment-title"><div className="inventory-meta">{entry.card ? <RarityBadge card={entry.card} /> : <span className="eyebrow">{entry.category}</span>}{entry.card?.isAttuned && <span>✦ Attuned</span>}</div><h3>{entry.card?.name || entry.name}</h3></div></button>
        <div className="equipment-foot"><span>×{entry.quantity} · {entry.unitWeightLb === null ? 'Weight unknown' : `${pounds(entry.unitWeightLb)} lb each`}</span><span>{entry.carried ? 'Carried' : 'Stored'}</span><button className="text-link" onClick={() => setEditing(entry)} aria-label={`Edit ${entry.name} weight and quantity`}>Edit equipment</button></div>
      </article>;
    })}</div> : <div className="empty-pack"><Backpack size={44} /><h3>{equipment.length ? 'No matching equipment' : 'Your next adventure starts here'}</h3><p>Add your provisions, import a character, or draw your first relic.</p><button className="journal-button" onClick={onDeck}>Visit the deck</button></div>}
    {editing !== undefined && <EquipmentEditor equipment={editing} onClose={() => setEditing(undefined)} />}
  </main>;
}
