import React, { useState } from 'react';
import { Settings, Layers, Backpack, BookOpen } from 'lucide-react';

export function CollectionNavigation({ canRead, onRead }) {
  const [open, setOpen] = useState(false);
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
          onClick={event => {
            event.currentTarget.closest('nav').querySelector('.orbit-toggle')?.focus();
            setOpen(false);
            onRead();
          }}><BookOpen size={20} aria-hidden="true" /></button>
      </div>
      <button type="button" className="orbit-toggle" aria-label={open ? 'Close collection shortcuts' : 'Open collection shortcuts'}
        aria-expanded={open} aria-controls="collection-shortcuts" onClick={() => setOpen(value => !value)}>
        <Settings size={22} aria-hidden="true" />
      </button>
    </nav>
  );
}
