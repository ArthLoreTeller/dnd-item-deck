import { useEffect, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useCardStore } from '../store/useCardStore';
import { PROFILE_IMPORT_FIELDS, validateImportDraft } from '../data/character-import';
import { SIZES } from '../data/player';
import { MAX_PDF_BYTES, parseCharacterPdf } from '../import/pdf';
const labels = { name: 'Character name', playerName: 'Player name', species: 'Species', background: 'Background', classes: 'Classes & levels', abilities: 'Ability scores', hp: 'Hit points', ac: 'Armor class', speed: 'Speed (ft)', size: 'Creature size', currency: 'Currency', notes: 'Notes' };
const meaningful = value => value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.values(value).some(meaningful) : true);
const summary = value => value === null || value === '' ? 'Blank' : typeof value === 'object' ? JSON.stringify(value).slice(0, 150) : String(value).slice(0, 150);
const numeric = value => value === '' ? null : Number(value);
export function CharacterImportDialog({ onClose }) {
  const ref = useRef(null), operation = useRef(null), generation = useRef(0);
  const [draft, setDraft] = useState(null), [selection, setSelection] = useState({ profileFields: [], equipmentIds: [], replaceSourceEquipment: false }), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const current = useCardStore(state => state.profile), currentEquipment = useCardStore(state => state.equipment);
  useDialogFocus(ref, true, onClose);
  useEffect(() => () => { generation.current++; operation.current?.abort(); }, []);
  const choose = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    operation.current?.abort(); const controller = new AbortController(); operation.current = controller;
    const run = ++generation.current; setBusy(true); setError(''); setDraft(null);
    try {
      if (file.size > MAX_PDF_BYTES) throw new Error('Choose a PDF smaller than 10 MB.');
      if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose an exported character-sheet PDF.');
      const buffer = await file.arrayBuffer();
      if (run !== generation.current) return;
      const parsed = validateImportDraft(await parseCharacterPdf(buffer, { signal: controller.signal }));
      if (run !== generation.current) return;
      setDraft(parsed);
      setSelection({ profileFields: PROFILE_IMPORT_FIELDS.filter(key => meaningful(parsed.profile[key]) && !meaningful(current[key])), equipmentIds: parsed.equipment.filter(entry => !currentEquipment.some(item => item.id === entry.id)).map(entry => entry.id), replaceSourceEquipment: false });
    } catch (err) { if (run === generation.current && !controller.signal.aborted) setError(err.message); }
    finally { if (run === generation.current) setBusy(false); }
  };
  const toggle = (key, value, checked) => setSelection(old => ({ ...old, [key]: checked ? [...old[key], value] : old[key].filter(item => item !== value) }));
  const update = (key, value) => setDraft(old => ({ ...old, profile: { ...old.profile, [key]: value } }));
  const updateItem = (id, key, value) => setDraft(old => ({ ...old, equipment: old.equipment.map(entry => entry.id === id ? { ...entry, [key]: value } : entry) }));
  let validation = '';
  if (draft) { try { validateImportDraft(draft); } catch (err) { validation = err.message; } }
  const confirm = () => { try { useCardStore.getState().applyCharacterImport(draft, selection); onClose(); } catch (err) { setError(err.message); } };
  return <div ref={ref} className="player-overlay"><section className="player-dialog player-form import-dialog" role="dialog" aria-modal="true" aria-labelledby="character-import-title">
    <div className="page-title-row"><h2 id="character-import-title">Import character PDF</h2><button onClick={onClose} aria-label="Close character import"><X /></button></div>
    <p className="muted">Export your character sheet from D&D Beyond, then choose the PDF. It is processed on this device. Review and select what to save.</p>
    <label className="pdf-picker"><FileUp size={24} /><span>Choose character-sheet PDF</span><input type="file" accept=".pdf,application/pdf" onChange={choose} disabled={busy} /></label>
    <p className="muted">Text-based forms and supported labeled text · Up to 10 MB and 30 pages. Scanned sheets require manual entry.</p>
    {busy && <p role="status">Reading character sheet…</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {draft && <><div className="import-warnings"><h3>Review before saving</h3><ul>{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>
      <p className="muted">Checked fields replace current values. Existing filled fields and equipment edits start unchecked.</p>
      {PROFILE_IMPORT_FIELDS.map(key => <div className="import-field" key={key}><label className="check-label"><input type="checkbox" checked={selection.profileFields.includes(key)} onChange={e => toggle('profileFields', key, e.target.checked)} />Save {labels[key]}</label><small className="muted">Current: {summary(current[key])}</small>
        {['abilities', 'hp', 'currency'].includes(key) ? <div className="form-grid">{Object.entries(draft.profile[key]).map(([field, value]) => <label key={field}>{field.toUpperCase()}<input aria-label={`Imported ${key} ${field}`} type="number" value={value ?? ''} onChange={e => update(key, { ...draft.profile[key], [field]: numeric(e.target.value) })} /></label>)}</div> : key === 'classes' ? <><div>{draft.profile.classes.map((entry, index) => <div className="form-grid" key={index}><label>Class<input value={entry.name} onChange={e => update(key, draft.profile.classes.map((old, i) => i === index ? { ...old, name: e.target.value } : old))} /></label><label>Level<input type="number" value={entry.level ?? ''} onChange={e => update(key, draft.profile.classes.map((old, i) => i === index ? { ...old, level: numeric(e.target.value) } : old))} /></label></div>)}</div><button className="text-link" onClick={() => update(key, [...draft.profile.classes, { name: '', level: 1 }])}>+ Add class</button></> : key === 'size' ? <select aria-label="Imported creature size" value={draft.profile.size ?? ''} onChange={e => update(key, e.target.value || null)}><option value="">Unknown</option>{SIZES.map(size => <option key={size}>{size}</option>)}</select> : key === 'notes' ? <textarea aria-label="Imported notes" value={draft.profile.notes} onChange={e => update(key, e.target.value)} /> : <input aria-label={`Imported ${labels[key]}`} type={['ac', 'speed'].includes(key) ? 'number' : 'text'} value={draft.profile[key] ?? ''} onChange={e => update(key, ['ac', 'speed'].includes(key) ? numeric(e.target.value) : e.target.value)} />}
      </div>)}
      <h3>Equipment · {draft.equipment.length}</h3>{draft.equipment.map(entry => <div className="import-field" key={entry.id}><label className="check-label"><input type="checkbox" checked={selection.equipmentIds.includes(entry.id)} onChange={e => toggle('equipmentIds', entry.id, e.target.checked)} />Save {entry.name}{currentEquipment.some(item => item.id === entry.id) ? ' · replaces existing entry' : ''}</label><div className="form-grid"><label>Quantity<input type="number" min="1" value={entry.quantity ?? ''} onChange={e => updateItem(entry.id, 'quantity', numeric(e.target.value))} /></label><label>Unit weight (lb)<input type="number" min="0" step="any" placeholder="Unknown" value={entry.unitWeightLb ?? ''} onChange={e => updateItem(entry.id, 'unitWeightLb', numeric(e.target.value))} /></label></div><label className="check-label"><input type="checkbox" checked={entry.carried} onChange={e => updateItem(entry.id, 'carried', e.target.checked)} />Carried</label></div>)}
      <label className="check-label"><input type="checkbox" checked={selection.replaceSourceEquipment} onChange={e => setSelection(old => ({ ...old, replaceSourceEquipment: e.target.checked }))} />Replace this PDF character’s previous ordinary equipment with the checked entries</label><p className="muted">This can remove previously imported entries. Relics and unrelated equipment are retained. Keep unchecked to merge.</p>
      {validation && <p role="alert" className="form-error">{validation}</p>}
      <div className="import-confirm"><button className="primary-magic-button" disabled={Boolean(validation) || (!selection.profileFields.length && !selection.equipmentIds.length && !selection.replaceSourceEquipment)} onClick={confirm}>Save reviewed import</button><button className="journal-button" onClick={onClose}>Cancel</button></div>
    </>}
  </section></div>;
}
