import { useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { equipmentDetails, filterEquipment, SRD_EQUIPMENT } from '../data/srd/equipment';
import { COINS } from '../data/player';
import { pounds } from '../data/units';
import { LoadSummary } from '../components/LoadSummary';

const categories = [...new Set(SRD_EQUIPMENT.map(item => item.category))].sort();
const numeric = value => value === '' ? null : Number(value);
const price = copper => copper >= 100 ? `${copper / 100} gp` : copper >= 10 && copper % 10 === 0 ? `${copper / 10} sp` : `${copper} cp`;

export function ShopPage() {
  const profile = useCardStore(state => state.profile);
  const equipment = useCardStore(state => state.equipment);
  const updateProfile = useCardStore(state => state.updateProfile);
  const purchaseItem = useCardStore(state => state.purchaseItem);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [coinEdits, setCoinEdits] = useState({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const draft = { currency: { ...profile.currency, ...coinEdits } };
  const currencyEdited = Object.keys(coinEdits).length > 0;
  const items = filterEquipment({ query, category }).sort((a, b) => a.name.localeCompare(b.name));
  const change = (_key, value) => { setCoinEdits(value); setError(''); setStatus(''); };
  const saveCurrency = event => {
    event.preventDefault();
    try { updateProfile({ currency: draft.currency }); setCoinEdits({}); setError(''); setStatus('Currency saved in this browser.'); }
    catch (err) { setError(err.message); setStatus(''); }
  };
  const buy = item => {
    const result = purchaseItem(item.id);
    setError(result.ok ? '' : result.error);
    setStatus(result.ok ? `Purchased 1 ${item.name}. Added to your inventory.` : '');
  };

  return <main className="player-page shop-page" aria-labelledby="shop-title">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S SUPPLIES</p><h2 id="shop-title">Shop</h2><p className="muted">2024 D&D · Mundane SRD 5.2.1 equipment. Purchases pay automatically from saved currency.</p></div><a className="journal-button" href="#/inventory">Inventory</a></div>
    <form className="player-form shop-wallet" onSubmit={saveCurrency}>
      <section className="sheet-panel"><h3>Currency</h3><div className="currency-grid">{COINS.map(key => <label key={key}>{key.toUpperCase()}<input type="number" min="0" step="1" value={draft.currency[key] ?? ''} onChange={e => change('currency', { ...draft.currency, [key]: numeric(e.target.value) })} /></label>)}</div><p className="muted">Coins are excluded from equipment load.</p></section>
      <button className="journal-button" type="submit">Save currency</button>
      {currencyEdited && <p className="muted">Save currency before buying.</p>}
    </form>
    <LoadSummary profile={profile} equipment={equipment} />
    <div className="shop-feedback" aria-live="polite">{error && <p role="alert" className="form-error">{error}</p>}{status && <p role="status">{status}</p>}</div>
    <div className="player-form shop-filters">
      <label>Search<input type="search" aria-label="Search shop" placeholder="Equipment name" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Category<select aria-label="Equipment category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="muted shop-result-count" role="status">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
    {items.length === 0 ? <p className="muted">No equipment matches your search and category.</p> : <ul className="shop-list" aria-label="Shop equipment">
      {items.map(item => {
        const expanded = expandedItemId === item.id;
        const detailsId = `shop-details-${item.id}`;
        return <li className={`shop-row${expanded ? ' is-expanded' : ''}`} key={item.id}>
        <div className="shop-item"><h3>{item.name}</h3><p className="muted">{item.category}</p></div>
        <div className="shop-facts"><span aria-label={`${item.name} price`}>{price(item.priceCp)}</span><span className="muted">{item.weightLb === null ? 'Weight unknown' : `${pounds(item.weightLb)} lb`}</span></div>
        <div className="shop-actions"><button type="button" className="shop-details-button" aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'View'} details for ${item.name}`} onClick={() => setExpandedItemId(expanded ? null : item.id)}>{expanded ? 'Hide details' : 'View details'}</button><button type="button" className="journal-button" aria-label={`Buy ${item.name}`} disabled={currencyEdited} onClick={() => buy(item)}>Buy</button></div>
        {expanded && <div className="shop-details" id={detailsId}><dl>{equipmentDetails(item).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="muted">Common mundane equipment · 2024 rules</p></div>}
      </li>})}
    </ul>}
  </main>;
}
