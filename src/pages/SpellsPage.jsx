import { BookOpen } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { groupLearnedSpells, spellcastingStats } from '../data/spellbook';
import { ABILITIES } from '../data/player';

const signed = value => value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`;

// Native details keeps the same rules text available to keyboard, touch and pointer users.
export function SpellRow({ spell, action }) {
  const level = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  return <li className="spell-row">
    <details className="spell-details">
      <summary>{spell.name} ({level})</summary>
      <div className="spell-rules">
        {spell.custom ? <>
          <p className="muted">Custom spell{spell.prepared ? ' · Prepared' : ''}{spell.concentration ? ' · Concentration' : ''}</p>
          <p>{spell.notes || 'No custom notes.'}</p>
        </> : <>
          <p className="muted">{spell.school}{spell.concentration ? ' · Concentration' : ''}{spell.ritual ? ' · Ritual' : ''}</p>
          <dl className="spell-facts">
            {['castingTime', 'range', 'components', 'duration'].map((field, index) => <div key={field}><dt>{['Casting Time', 'Range', 'Components', 'Duration'][index]}</dt><dd>{spell[field]}</dd></div>)}
          </dl>
          <p>{spell.description}</p>
        </>}
      </div>
    </details>
    {action}
  </li>;
}

export function SpellsPage() {
  const profile = useCardStore(state => state.profile);
  const forgetSpell = useCardStore(state => state.forgetSpell);
  const updateProfile = useCardStore(state => state.updateProfile);
  const stats = spellcastingStats(profile);
  const groups = groupLearnedSpells(profile);
  return <main className="player-page spells-page" aria-labelledby="spells-title">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S SPELLBOOK</p><h2 id="spells-title">Spells</h2><p className="muted">Your known spells · 2024 D&D · SRD 5.2.1. Expand a spell to read its rules.</p></div></div>
    <div className="spellcasting-stats">
      <div><span>Modifier</span><output aria-label="Modifier">{signed(stats.modifier)}</output></div>
      <div><span>Spell Attack</span><output aria-label="Spell Attack">{signed(stats.attackBonus)}</output></div>
      <div><span>Save DC</span><output aria-label="Save DC">{stats.saveDC ?? '—'}</output></div>
    </div>
    <div className="player-form spellcasting-choice"><label>Spellcasting ability<select aria-label="Spellcasting ability" value={profile.sheet.spellcastingAbility ?? ''} onChange={event => updateProfile({ sheet: { ...profile.sheet, spellcastingAbility: event.target.value || null } })}>
      <option value="">Unknown</option>{ABILITIES.map(ability => <option key={ability} value={ability}>{ability.toUpperCase()}</option>)}
    </select></label></div>
    <p className="muted spell-stats-note">Ability scores and proficiency come from Character. A dash means those details are still unknown.</p>
    <div className="spell-tome-navigation"><a className="spell-tome-link" href="#/spell-tome" aria-label="Open Spell Tome"><BookOpen size={30} aria-hidden="true" /><span>Spell Tome</span></a></div>
    {groups.length === 0 && <p className="muted">No spells learned yet. Open the Spell Tome to learn your first spell.</p>}
    {groups.map(group => <section className="spell-group" key={group.level} aria-labelledby={`spell-level-${group.level}`}>
      <h3 id={`spell-level-${group.level}`}>{group.label}</h3>
      <ul className="spell-list">
        {group.spells.map(spell => <SpellRow key={spell.id} spell={spell} action={!spell.custom && <button type="button" className="journal-button spell-action" aria-label={`Forget ${spell.name}`} onClick={() => forgetSpell(spell.id)}>Forget</button>} />)}
      </ul>
    </section>)}
  </main>;
}
