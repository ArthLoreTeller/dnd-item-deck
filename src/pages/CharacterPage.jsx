import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { ABILITIES, COINS, SIZES } from '../data/player';
import { abilityModifier } from '../data/weight';
import { LoadSummary } from '../components/LoadSummary';
import { CharacterSheetPanel } from '../components/CharacterSheetPanel';
import { CharacterStatBlock } from '../components/CharacterStatBlock';
import { PortraitPicker } from '../components/PortraitPicker';
const numeric = value => value === '' ? null : Number(value);
export function CharacterPage({ onImport }) {
  const { profile, equipment, updateProfile } = useCardStore();
  const [draft, setDraft] = useState(profile), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(profile); }, [profile]);
  const change = (key, value) => { setDraft(old => ({ ...old, [key]: value })); setSaved(false); };
  const field = (key, label, type = 'text') => <label key={key}>{label}<input type={type} value={draft[key] ?? ''} onChange={e => change(key, type === 'number' ? numeric(e.target.value) : e.target.value)} /></label>;
  const save = event => { event.preventDefault(); try { updateProfile(draft); setError(''); setSaved(true); } catch (err) { setError(err.message); } };
  return <main className="player-page character-page"><div className="page-title-row"><div><p className="eyebrow">YOUR STORY, YOUR STATS</p><h2>Character</h2><p className="muted">2024 D&D · One adventurer, an entire collection.</p></div><button className="journal-button" onClick={onImport}>Import character PDF</button></div>
    <form className="player-form character-form" onSubmit={save}>
      <section id="sheet-identity" className="sheet-panel character-identity"><div className="portrait">{draft.portraitUrl ? <img src={draft.portraitUrl} alt="Character portrait" onError={e => { e.currentTarget.hidden = true; }} /> : <UserRound size={64} />}</div><div className="form-grid">{field('name', 'Character name')}{field('playerName', 'Player name')}{field('species', 'Species')}{field('background', 'Background')}<div className="full-width"><PortraitPicker showPreview={false} value={draft.portraitUrl} onChange={value=>change('portraitUrl',value)}/>{!draft.portraitUrl.startsWith('data:')&&field('portraitUrl', 'Portrait URL', 'url')}</div></div></section>
      <CharacterStatBlock profile={draft} onChange={change} />
      <section className="sheet-panel"><div className="page-title-row"><h3>Classes & levels</h3><button type="button" className="text-link" onClick={() => change('classes', [...draft.classes, { name: '', level: 1 }])}>+ Add class</button></div>{draft.classes.length === 0 && <p className="muted">Add a class when you’re ready.</p>}{draft.classes.map((entry, index) => <div className="class-row" key={index}><label>Class<input value={entry.name} onChange={e => change('classes', draft.classes.map((old, i) => i === index ? { ...old, name: e.target.value } : old))} /></label><label>Level<input type="number" min="1" max="20" value={entry.level ?? ''} onChange={e => change('classes', draft.classes.map((old, i) => i === index ? { ...old, level: numeric(e.target.value) } : old))} /></label><button type="button" className="journal-button" onClick={() => change('classes', draft.classes.filter((_, i) => i !== index))} aria-label={`Remove class ${index + 1}`}>Remove</button></div>)}</section>
      <section className="ability-grid">{ABILITIES.map(key => { const modifier = abilityModifier(draft.abilities[key]); return <label className="ability-box" key={key}><span>{key.toUpperCase()}</span><input aria-label={key.toUpperCase()} type="number" min="1" max="30" step="1" placeholder="—" value={draft.abilities[key] ?? ''} onChange={e => change('abilities', { ...draft.abilities, [key]: numeric(e.target.value) })} /><strong>{modifier === null ? '—' : `${modifier >= 0 ? '+' : ''}${modifier}`}</strong><small>modifier</small></label>; })}</section>
      <section className="sheet-panel"><h3>Carrying capacity</h3><div className="form-grid"><label>Creature size<select value={draft.size ?? ''} onChange={e => change('size', e.target.value || null)}><option value="">Choose size</option>{SIZES.map(size => <option key={size}>{size}</option>)}</select></label>{field('capacityOverrideLb', 'Capacity override (lb)', 'number')}{field('capacityOverrideReason', 'Override reason')}</div><p className="muted">Leave override blank to use Strength × creature-size capacity.</p></section>
      <CharacterSheetPanel profile={draft} onChange={(sheet,hp)=>{setDraft(old=>({...old,sheet,...(hp?{hp}:{})}));setSaved(false);}} />
      <LoadSummary profile={draft} equipment={equipment} />
      <section className="sheet-panel"><h3>Currency</h3><div className="currency-grid">{COINS.map(key => <label key={key}>{key.toUpperCase()}<input type="number" min="0" step="1" value={draft.currency[key] ?? ''} onChange={e => change('currency', { ...draft.currency, [key]: numeric(e.target.value) })} /></label>)}</div><p className="muted">Coins are excluded from equipment load.</p></section>
      {error && <p role="alert" className="form-error">{error}</p>}<div className="character-save"><button className="primary-magic-button" type="submit">Save character</button><span role="status">{saved ? 'Character saved in this browser.' : 'Save to keep your changes.'}</span></div>
    </form>
  </main>;
}
