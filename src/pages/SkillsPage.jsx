import { useEffect, useState } from 'react';
import { useCardStore } from '../store/useCardStore';
import { checkBonus } from '../data/character-sheet';
import { SRD_SKILLS } from '../data/srd/skills';
import { changeSkill } from '../data/skill-profile';
import { createSkillDescriptions } from '../data/skill-descriptions';

const numeric = value => value === '' ? null : Number(value);
const signed = value => value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`;

export function SkillsPage() {
  const profile = useCardStore(state => state.profile);
  const updateProfile = useCardStore(state => state.updateProfile);
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [visibleDescription, setVisibleDescription] = useState(null);
  const [descriptions] = useState(() => createSkillDescriptions(setVisibleDescription));
  useEffect(() => { setDraft(profile); }, [profile]);
  useEffect(() => () => descriptions.dispose(), [descriptions]);
  const change = (name, patch) => { setDraft(old => changeSkill(old, name, patch)); setSaved(false); };
  const save = event => {
    event.preventDefault();
    try { updateProfile(draft); setError(''); setSaved(true); }
    catch (err) { setError(err.message); setSaved(false); }
  };

  return <main className="player-page skills-page" aria-labelledby="skills-title">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S REPERTOIRE</p><h2 id="skills-title">Skills</h2><p className="muted">2024 D&D · SRD 5.2.1. Focus, hover, or tap a skill for its description.</p></div></div>
    <form className="player-form skills-form" onSubmit={save}>
      <ul className="skill-list" aria-label="Character skills">
        {SRD_SKILLS.map(skill => {
          const entry = draft.sheet.skills[skill.name];
          const bonus = checkBonus(draft, skill.ability, entry.proficiency, entry.override);
          const described = visibleDescription === skill.id;
          return <li className="skill-row" key={skill.id}>
            <div className="skill-summary" onMouseEnter={() => descriptions.enter(skill.id)} onMouseLeave={descriptions.leave}>
              <button type="button" className="skill-description-trigger" aria-describedby={`skill-description-${skill.id}`} aria-expanded={described}
                onFocus={() => descriptions.focus(skill.id)} onBlur={descriptions.blur}
                onClick={() => descriptions.toggle(skill.id)}
                onKeyDown={event => { if (event.key === 'Escape') descriptions.dismiss(); }}>
                {skill.name} ({skill.ability.toUpperCase()})
              </button>
              <p id={`skill-description-${skill.id}`} role="tooltip" className="skill-tooltip" hidden={!described}>{skill.description}</p>
            </div>
            <output className="skill-bonus" aria-label={`${skill.name} bonus`}>{signed(bonus)}</output>
            <label className="skill-proficiency">Proficiency<select aria-label={`${skill.name} proficiency`} value={entry.proficiency ?? ''} onChange={event => change(skill.name, { proficiency: numeric(event.target.value) })}>
              <option value="">Unknown</option><option value="0">None</option><option value="0.5">Half</option><option value="1">Proficient</option><option value="2">Expertise</option>
            </select></label>
            <label className="skill-override">Override<input aria-label={`${skill.name} bonus override`} type="number" min="-100" max="100" step="1" placeholder="Auto" value={entry.override ?? ''} onChange={event => change(skill.name, { override: numeric(event.target.value) })} /></label>
          </li>;
        })}
      </ul>
      <p className="muted skills-note">A dash means character details or proficiency are still unknown. Override sets the final bonus; leave it blank to calculate from your character.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="skills-save"><button className="primary-magic-button" type="submit">Save skills</button><span role="status">{saved ? 'Skills saved in this browser.' : 'Save to keep your changes.'}</span></div>
    </form>
  </main>;
}
