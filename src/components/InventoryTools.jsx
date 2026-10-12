import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, X } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useCardStore } from '../store/useCardStore';
import { MAX_BACKUP_BYTES, parseBackup } from '../data/backup';

export function InventoryTools({ onClose, onRestored }) {
  const overlayRef = useRef(null);
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const discarded = useCardStore(state => state.discardedCustom);
  const restore = useCardStore(state => state.restoreCustomCard);
  const exportBackup = useCardStore(state => state.exportBackup);
  const importBackup = useCardStore(state => state.importBackup);
  useDialogFocus(overlayRef, true, onClose);
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackup()], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reliquary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const choose = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setPending(null); setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a JSON backup smaller than 5 MB.');
      const text = await file.text();
      const data = parseBackup(text);
      setPending({ text, count: data.inventory.length, recovered: data.discardedCustom.length });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const confirmImport = () => {
    try { importBackup(pending.text); setPending(null); setError(''); } catch (err) { setError(err.message); }
  };
  return <div ref={overlayRef} className="reading-overlay" onClick={onClose}><section className="reading-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-tools-title" onClick={event => event.stopPropagation()}>
    <header className="reading-header"><div><p className="eyebrow">KEEP YOUR COLLECTION SAFE</p><h2 id="inventory-tools-title">Backup & recovery</h2></div><button data-initial-focus className="close-control" aria-label="Close backup and recovery" onClick={onClose}><X size={20} /></button></header>
    <div className="reading-body"><section><h3>Inventory backup</h3><p>Your collection is saved only in this browser on this device. Download a backup before clearing browser data or moving to another device. Artwork links are included; image files are not.</p><div className="backup-actions"><button className="journal-button journal-primary" onClick={download}><Download size={17} /> Download backup</button><button className="journal-button" disabled={busy} onClick={() => fileRef.current.click()}><Upload size={17} /> {busy ? 'Reading backup…' : 'Import backup'}</button><input ref={fileRef} className="sr-only" tabIndex={-1} aria-label="Choose inventory backup file" type="file" accept=".json,application/json" onChange={choose} /></div>
    {error && <p className="backup-error" role="alert">{error}</p>}
    {pending && <div className="backup-preview"><h4>Ready to merge</h4><p>This backup contains {pending.count} inventory cards and {pending.recovered} recoverable custom cards. Cards already here keep their current edits. New cards use available attunement slots.</p><div className="backup-actions"><button className="journal-button journal-primary" onClick={confirmImport}>Merge backup</button><button className="journal-button" onClick={() => setPending(null)}>Cancel import</button></div></div>}
    </section><section><h3>Recover custom cards <span>({discarded.length})</span></h3><p>Discarded custom cards stay here until you restore them. Standard cards return to the deck.</p>{discarded.length ? <ul className="recovery-list">{discarded.map(card => <li key={card.id}><span>{card.name}</span><button className="journal-button" aria-label={`Restore ${card.name}`} onClick={() => { restore(card.id); onRestored?.(useCardStore.getState().activeCard); }}><RotateCcw size={16} /> Restore</button></li>)}</ul> : <p className="detail-muted">No custom cards to recover.</p>}</section></div>
    <footer className="reading-footer"><p>Backups include the deck and recovery collection.</p><button className="journal-button" onClick={onClose}>Done</button></footer>
  </section></div>;
}
