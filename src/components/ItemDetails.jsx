import { useRef } from 'react';
import { BookOpen, X, Minus, Plus } from 'lucide-react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useCardStore } from '../store/useCardStore';
import { RarityBadge } from './RarityBadge';

const specLabels = { type: 'Category', attunement: 'Attunement', properties: 'Properties', ranges: 'Range', damage: 'Base damage', damageType: 'Damage type' };
const ruleLabels = { weaponStat: 'Weapon stat', attackBonus: 'Attack bonus', damageBonus: 'Damage bonus', saveDc: 'Save DC' };

function Facts({ values, labels }) {
  const entries = Object.entries(labels).filter(([key]) => values?.[key]);
  return entries.length ? <dl className="detail-facts">{entries.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{values[key]}</dd></div>)}</dl> : null;
}

export function ItemDetails({ card, onClose }) {
  const overlayRef = useRef(null);
  useDialogFocus(overlayRef, true, onClose);
  const updateCard = useCardStore(state => state.updateCard);
  const updateProgress = useCardStore(state => state.updateProgress);
  const isAttunable = card.type !== 'normal';
  const max = card.maxProgress || 20;
  const groups = card.type === 'progressive'
    ? [1, 2, 3].map(level => ({ title: `Level ${level} abilities`, abilities: card[`level${level}Abilities`], locked: !card.isAttuned || (card.currentLevel || 1) < level }))
    : [{ title: 'Abilities', abilities: card.abilities, locked: isAttunable && !card.isAttuned }];
  return (
    <div ref={overlayRef} className="reading-overlay" onClick={onClose}>
      <section className="reading-dialog item-details" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={event => event.stopPropagation()}>
        <header className="reading-header"><div><p className="eyebrow"><BookOpen size={14} aria-hidden="true" /> RELIC JOURNAL</p><h2 id="detail-title">{card.name}</h2><RarityBadge card={card} /></div><button data-initial-focus className="close-control" aria-label="Close item details" onClick={onClose}><X size={20} /></button></header>
        <div className="reading-body">
          {(card.flavorText || card.description) && <section><h3>Lore</h3><p className="detail-lore">{card.flavorText || card.description}</p></section>}
          <section><h3>Specifications</h3><Facts values={card.specs} labels={specLabels} /></section>
          {isAttunable && <section><div className="detail-section-heading"><h3>Attunement</h3><button className="journal-button" aria-pressed={Boolean(card.isAttuned)} onClick={() => updateCard(card.id, { isAttuned: !card.isAttuned })}>{card.isAttuned ? 'Unattune' : 'Attune'}</button></div><p>{card.attunementRules || 'No additional attunement criteria.'}</p><Facts values={card.weaponStats} labels={ruleLabels} /><div className="detail-stats">{[['hit', 'Hit'], ['damage', 'Damage'], ['saveDc', 'Save DC']].map(([key, label]) => <label key={key} htmlFor={`detail-${key}`}>{label}<input id={`detail-${key}`} type="text" value={card.stats?.[key] ?? ''} onChange={event => updateCard(card.id, { stats: { ...card.stats, [key]: event.target.value } })} /></label>)}</div></section>}
          {groups.filter(group => group.abilities?.length).map(group => <section key={group.title}><div className="detail-section-heading"><h3>{group.title}</h3>{group.locked && <span className="detail-locked">{card.isAttuned ? 'Requires progression' : 'Requires attunement'}</span>}</div>{group.abilities.map((ability, index) => <article className="detail-ability" key={index}><h4>{ability.title}</h4><p>{ability.description}</p></article>)}</section>)}
          {card.type === 'progressive' && <section><h3>Progression · Level {card.currentLevel || 1}</h3><p>Complete {max} steps to unlock each next level. Abilities require attunement.</p>{[1, 2].map(level => { const value = card.progress?.[`level${level}`] || 0; const locked = !card.isAttuned || (level === 2 && (card.progress?.level1 || 0) < max); return <div className="detail-progress" key={level}><label htmlFor={`progress-${level}`}>Toward level {level + 1}</label><div><button disabled={locked || value === 0} className="journal-button" aria-label={`Decrease level ${level} progress`} onClick={() => updateProgress(card.id, level, value - 1)}><Minus size={16} /></button><input id={`progress-${level}`} type="number" min="0" max={max} disabled={locked} value={value} onChange={event => updateProgress(card.id, level, event.target.valueAsNumber)} /><span>/ {max}</span><button disabled={locked || value === max} className="journal-button" aria-label={`Increase level ${level} progress`} onClick={() => updateProgress(card.id, level, value + 1)}><Plus size={16} /></button></div>{locked && <small>{!card.isAttuned ? 'Attune this relic to record progress.' : 'Complete the previous level first.'}</small>}</div>; })}</section>}
        </div>
        <footer className="reading-footer"><p>Changes are saved in this browser.</p><button className="journal-button journal-primary" onClick={onClose}>Done reading</button></footer>
      </section>
    </div>
  );
}
