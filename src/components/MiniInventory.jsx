import { useState } from 'react';
import { Backpack } from 'lucide-react';
import { RarityBadge } from './RarityBadge';

export function MiniInventory({ inventory, activeId, disabled, onInspect, onDiscard, onOpenInventory }) {
  const [sort, setSort] = useState('recent');
  const items = [...inventory];
  if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'level') items.sort((a, b) => (b.currentLevel || 1) - (a.currentLevel || 1));
  return <section className="inventory-panel mini-inventory" aria-labelledby="mini-inventory-title">
    <div className="mini-inventory-heading">
      <h2 id="mini-inventory-title"><Backpack size={19} aria-hidden="true" /> Inventory ({inventory.length})</h2>
      <select aria-label="Sort mini inventory" value={sort} onChange={event => setSort(event.target.value)}>
        <option value="recent">Recent</option><option value="name">Name A–Z</option><option value="level">Level</option>
      </select>
    </div>
    <div className="mini-inventory-list">
      {items.length ? items.map(item => <div key={item.id} role="group" aria-label={`Inventory card: ${item.name}`} className={`mini-inventory-item ${activeId === item.id ? 'is-active' : ''}`}>
        <button className="mini-inventory-select" disabled={disabled} aria-label={`Inspect ${item.name}`} onClick={() => onInspect(item)}>
          <span className="mini-inventory-name">{item.name}</span>
          <span className="inventory-meta"><RarityBadge card={item} />{item.type !== 'normal' && <span className="inventory-attunement">{item.isAttuned ? '✦ Attuned' : '✧ Unattuned'}</span>}{item.type === 'progressive' && <span className="inventory-level">Lv. {item.currentLevel || 1}</span>}</span>
        </button>
        <button className="close-control" disabled={disabled} aria-label={`Discard ${item.name}`} onClick={() => onDiscard(item.id)}>✕</button>
      </div>) : <p className="mini-inventory-empty">Draw a relic to start your collection.</p>}
    </div>
    <button className="text-link" onClick={onOpenInventory}>Open full inventory →</button>
  </section>;
}
