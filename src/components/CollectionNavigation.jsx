import React, { useState } from 'react';
import { Menu, Layers, Backpack, UserRound, ListChecks, Sparkles, NotebookPen, Store, Settings } from 'lucide-react';

const shortcuts = [
  ['deck', 'Deck', Layers], ['inventory', 'Inventory', Backpack],
  ['character', 'Character', UserRound], ['skills', 'Skills', ListChecks],
  ['spells', 'Spells', Sparkles], ['notes', 'Notes', NotebookPen],
  ['shop', 'Shop', Store], ['settings', 'Settings', Settings],
];

export function CollectionNavigation({ page }) {
  const [open, setOpen] = useState(false);
  const close = event => {
    event.currentTarget.closest('nav').querySelector('.orbit-toggle')?.focus();
    setOpen(false);
  };
  return (
    <nav className={`collection-orbit ${open ? 'is-open' : ''}`} aria-label="Corner Menu"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          close(event);
        }
      }}>
      <div id="collection-shortcuts" className="orbit-shortcuts" inert={!open} aria-hidden={!open}>
        {shortcuts.map(([route, label, Icon]) => <a key={route} href={`#/${route}`}
          aria-current={page === route || (route === 'spells' && page === 'spell-tome') ? 'page' : undefined}
          aria-label={label} title={label} onClick={close}>
          <Icon size={20} aria-hidden="true" />
          <span className="corner-tooltip" aria-hidden="true">{label}</span>
        </a>)}
      </div>
      <button type="button" className="orbit-toggle" aria-label={open ? 'Close Corner Menu' : 'Open Corner Menu'}
        aria-expanded={open} aria-controls="collection-shortcuts" onClick={() => setOpen(value => !value)}>
        <Menu size={22} aria-hidden="true" />
      </button>
    </nav>
  );
}
