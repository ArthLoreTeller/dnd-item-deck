import { useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { filterSpells } from '../data/srd/spells';
import { SpellRow } from './SpellsPage';

export function SpellTomeResults({ query = '', level = null }) {
  const profile = useCardStore(state => state.profile);
  const learnSpell = useCardStore(state => state.learnSpell);
  const learned = new Set(profile.sheet.learnedSpellIds);
  const spells = filterSpells({ query, level }).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return <>
    <p className="muted spell-result-count" role="status">{spells.length} {spells.length === 1 ? 'spell' : 'spells'}</p>
    {spells.length === 0 ? <p className="muted">No spells match your search and level.</p> : <ul className="spell-list" aria-label="Spell Tome results">
      {spells.map(spell => <SpellRow key={spell.id} spell={spell} action={<button type="button" className="journal-button spell-action" aria-label={learned.has(spell.id) ? `${spell.name} learned` : `Learn ${spell.name}`} disabled={learned.has(spell.id)} onClick={() => learnSpell(spell.id)}>{learned.has(spell.id) ? 'Learned' : 'Learn'}</button>} />)}
    </ul>}
  </>;
}

export function SpellTomePage() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState(null);
  return <main className="player-page spell-tome-page" aria-labelledby="spell-tome-title">
    <div className="page-title-row"><div><p className="eyebrow">THE REFERENCE LIBRARY</p><h2 id="spell-tome-title">Spell Tome</h2><p className="muted">2024 D&D · All 339 spells from SRD 5.2.1.</p></div><a className="journal-button" href="#/spells">Known Spells</a></div>
    <div className="player-form spell-filters">
      <label>Search<input type="search" aria-label="Search spells" placeholder="Spell name" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Level<select aria-label="Spell level" value={level ?? ''} onChange={event => setLevel(event.target.value === '' ? null : Number(event.target.value))}>
        <option value="">All</option><option value="0">Cantrip</option>
        {Array.from({ length: 9 }, (_, index) => index + 1).map(value => <option key={value} value={value}>Level {value}</option>)}
      </select></label>
    </div>
    <SpellTomeResults query={query} level={level} />
  </main>;
}
