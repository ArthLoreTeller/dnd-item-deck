import React, { useState } from 'react';
import { Menu, Layers, Backpack, BookOpen, Volume2, VolumeX } from 'lucide-react';

export function CollectionNavigation({ canRead, onRead, onDice, muted, onToggleSound }) {
  const [open, setOpen] = useState(false);
  const openDialog = (event, action) => {
    event.currentTarget.closest('nav').querySelector('.orbit-toggle')?.focus();
    setOpen(false);
    action();
  };
  return (
    <nav className={`collection-orbit ${open ? 'is-open' : ''}`} aria-label="Collection navigation"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setOpen(false);
          event.currentTarget.querySelector('.orbit-toggle')?.focus();
        }
      }}>
      <div id="collection-shortcuts" className="orbit-shortcuts" inert={!open} aria-hidden={!open}>
        <a href="#relic-deck" aria-label="Deck" title="Deck" onClick={() => setOpen(false)}><Layers size={20} aria-hidden="true" /></a>
        <a href="#relic-inventory" aria-label="Inventory" title="Inventory" onClick={() => setOpen(false)}><Backpack size={20} aria-hidden="true" /></a>
        <button type="button" aria-label="Read details" title={canRead ? 'Read details' : 'Select a relic to read details'} disabled={!canRead}
          onClick={event => openDialog(event, onRead)}><BookOpen size={20} aria-hidden="true" /></button>
        <button type="button" aria-label="Roll a D20" title="Roll a D20" aria-haspopup="dialog" onClick={event => openDialog(event, onDice)}>
          <svg width="20" height="22" viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M12 1 23 7v12l-11 6L1 19V7Z M12 1 6 9l-5-2 M12 1l6 8 5-2 M6 9l-5 10 11 6 11-6-5-10 M6 9h12l-6 11Z M1 19l11 1 11-1 M12 20v5"/><text x="12" y="15" fill="currentColor" stroke="none" textAnchor="middle" fontSize="6" fontWeight="bold">20</text></svg>
        </button>
        <button type="button" data-silent aria-label={muted ? 'Enable sound' : 'Mute sound'} title={muted ? 'Enable sound' : 'Mute sound'} aria-pressed={muted} onClick={onToggleSound}>
          {muted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        </button>
      </div>
      <button type="button" className="orbit-toggle" aria-label={open ? 'Close collection shortcuts' : 'Open collection shortcuts'}
        aria-expanded={open} aria-controls="collection-shortcuts" onClick={() => setOpen(value => !value)}>
        <Menu size={22} aria-hidden="true" />
      </button>
    </nav>
  );
}
