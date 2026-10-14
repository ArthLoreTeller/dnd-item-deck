import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { useDialogFocus } from '../hooks/useDialogFocus';
export function EquipmentEditor({ equipment, onClose }) {
  const ref = useRef(null);
  const [draft, setDraft] = useState({ consumable: false, ...(equipment ?? { name: '', quantity: 1, unitWeightLb: null, carried: true, category: 'Gear', imageUrl: '' }) });
  const [error, setError] = useState('');
  useDialogFocus(ref, true, onClose);
  const change = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const save = event => {
    event.preventDefault();
    try {
      const entry = { ...draft, quantity: Number(draft.quantity), unitWeightLb: draft.unitWeightLb === '' || draft.unitWeightLb === null ? null : Number(draft.unitWeightLb) };
      if (equipment) useCardStore.getState().updateEquipment(equipment.id, entry); else useCardStore.getState().addEquipment(entry);
      onClose();
    } catch (err) { setError(err.message); }
  };
  return <div className="player-overlay" ref={ref}><form className="player-dialog player-form" role="dialog" aria-modal="true" aria-labelledby="equipment-title" onSubmit={save}>
    <div className="page-title-row"><h2 id="equipment-title">{equipment ? 'Equipment details' : 'Pack an item'}</h2><button type="button" onClick={onClose} aria-label="Close equipment editor"><X /></button></div>
    <label>Name<input value={draft.name} disabled={Boolean(draft.relicCardId)} onChange={e => change('name', e.target.value)} maxLength={500} required /></label>
    <div className="form-grid"><label>Quantity<input type="number" min="1" max="999999" step="1" required disabled={Boolean(draft.relicCardId)} value={draft.quantity} onChange={e => change('quantity', e.target.value)} /></label><label>Unit weight (lb)<input type="number" min="0" step="any" placeholder="Unknown" value={draft.unitWeightLb ?? ''} onChange={e => change('unitWeightLb', e.target.value)} /></label></div>
    <label className="check-label"><input type="checkbox" checked={draft.carried} onChange={e => change('carried', e.target.checked)} /> Carried by your character</label>
    <label className="check-label"><input type="checkbox" checked={draft.consumable} onChange={e => change('consumable', e.target.checked)} /> Consumable</label>
    {!draft.relicCardId && <><label>Category<select value={draft.category} onChange={e => change('category', e.target.value)}>{['Gear', 'Weapon', 'Armor', 'Consumable', 'Treasure'].map(category => <option key={category}>{category}</option>)}</select></label><label>Artwork URL<input type="url" value={draft.imageUrl} onChange={e => change('imageUrl', e.target.value)} /></label></>}
    <p className="muted">Leave weight blank if unknown. Use 0 only for an item you know is weightless. Stored items are excluded from carried load.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="page-actions"><button className="primary-magic-button" type="submit">Save equipment</button>{equipment && <button type="button" className="journal-button" onClick={() => { useCardStore.getState().removeEquipment(equipment.id); onClose(); }}>Remove from inventory</button>}</div>
  </form></div>;
}
