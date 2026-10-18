import { characterStats } from '../data/character-sheet';

const numeric = value => value === '' ? null : Number(value);
const signed = value => value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`;

export function CharacterStatBlock({ profile, onChange }) {
  const stats = characterStats(profile);
  const hpInput = (key, label) => <input aria-label={label} type="number" min="0" step="1" placeholder="—" value={profile.hp[key] ?? ''} onChange={event => onChange('hp', { ...profile.hp, [key]: numeric(event.target.value) })} />;
  const override = (key, label, value, min, max) => <label className="character-stat"><span>{label}</span><input aria-label={`${label} override`} type="number" step="1" min={min} max={max} placeholder={signed(value)} value={profile.sheet[key] ?? ''} onChange={event => onChange('sheet', { ...profile.sheet, [key]: numeric(event.target.value) })} /></label>;
  const field = (key, label, value) => <label className="character-stat"><span>{label}</span><input aria-label={label} type="number" min="0" step="1" placeholder="—" value={value ?? ''} onChange={event => onChange(key, numeric(event.target.value))} /></label>;
  return <section className="character-stat-block" aria-label="Combat stats">
    <div className="character-stat-row character-stat-row-health">
      <div className="character-stat"><span>HP/Max</span><div className="character-hp-pair">{hpInput('current', 'Current HP')}<span aria-hidden="true">/</span>{hpInput('max', 'Maximum HP')}</div></div>
      <label className="character-stat"><span>Temp HP</span>{hpInput('temp', 'Temp HP')}</label>
      <div className="character-stat"><span>Hit Die</span><output aria-label="Hit Die">{stats.hitDie}</output></div>
    </div>
    <div className="character-stat-row character-stat-row-combat">
      {override('proficiencyBonusOverride', 'Prof Bonus', stats.proficiencyBonus, 0, 20)}
      {field('speed', 'Speed ft', stats.speed)}
      {override('initiativeOverride', 'Initiative', stats.initiative, -100, 100)}
      {field('ac', 'AC', stats.ac)}
    </div>
  </section>;
}
