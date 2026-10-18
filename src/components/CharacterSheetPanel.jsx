import { useState } from 'react';
import { CONDITIONS } from '../data/character-sheet';
import { rollD20 } from '../dice/d20';

const number = value => value === '' ? null : Number(value);
const signed = value => `${value >= 0 ? '+' : ''}${value}`;

export function CharacterSheetPanel({ profile, onChange }) {
  const sheet = profile.sheet;
  const [rollResult, setRollResult] = useState('');
  const change = (key, value) => onChange({ ...sheet, [key]: value });
  const patch = (key, index, values) => change(key, sheet[key].map((entry, i) => i === index ? { ...entry, ...values } : entry));
  const remove = (key, index) => change(key, sheet[key].filter((_, i) => i !== index));
  const rollAttack = (name, bonus) => {
    if (bonus === null) { setRollResult(`Set ${name} bonus before rolling.`); return; }
    const die = rollD20();
    setRollResult(`${name}: ${die} ${signed(bonus)} = ${die + bonus}`);
  };

  return <>
    <section id="sheet-attacks" className="sheet-panel">
      <h3>Attacks</h3>
      {sheet.attacks.map((entry, index) => <div className="sheet-entry" key={index}>
        <label>Attack name<input value={entry.name} onChange={event => patch('attacks', index, { name: event.target.value })} /></label>
        <label>Attack bonus<input type="number" value={entry.bonus ?? ''} onChange={event => patch('attacks', index, { bonus: number(event.target.value) })} /></label>
        <label>Damage<input placeholder="1d8 + 3 slashing" value={entry.damage} onChange={event => patch('attacks', index, { damage: event.target.value })} /></label>
        <label>Range / properties / notes<input value={entry.notes} onChange={event => patch('attacks', index, { notes: event.target.value })} /></label>
        <button type="button" className="text-link" onClick={() => rollAttack(entry.name, entry.bonus)}>Roll attack</button>
        <button type="button" className="text-link" onClick={() => remove('attacks', index)}>Remove attack</button>
      </div>)}
      <button type="button" className="text-link" onClick={() => change('attacks', [...sheet.attacks, { name: 'New attack', bonus: null, damage: '', notes: '' }])}>+ Attack</button>
      {rollResult && <p role="status">{rollResult}</p>}
    </section>
    <section id="sheet-resources" className="sheet-panel">
      <h3>Resources & spell slots</h3>
      <p className="muted">Track spell slots and limited-use features. Recovery is editable; partial or special recovery should use Manual.</p>
      {sheet.resources.map((entry, index) => <div className="sheet-entry" key={index}>
        <label>Resource name<input value={entry.name} onChange={event => patch('resources', index, { name: event.target.value })} /></label>
        <label>Remaining<input type="number" min="0" max={entry.max} value={entry.current} onChange={event => patch('resources', index, { current: Number(event.target.value) })} /></label>
        <label>Maximum<input type="number" min="0" value={entry.max} onChange={event => patch('resources', index, { max: Number(event.target.value) })} /></label>
        <label>Refill on<select value={entry.recovery} onChange={event => patch('resources', index, { recovery: event.target.value })}><option value="manual">Manual</option><option value="short">Short or long rest</option><option value="long">Long rest</option></select></label>
        <button type="button" className="text-link" onClick={() => remove('resources', index)}>Remove resource</button>
      </div>)}
      <button type="button" className="text-link" onClick={() => change('resources', [...sheet.resources, { name: 'New resource', max: 1, current: 1, recovery: 'manual' }])}>+ Resource / spell slot pool</button>
    </section>
    <section id="sheet-conditions" className="sheet-panel">
      <h3>Conditions & death saves</h3>
      <div className="condition-list">{CONDITIONS.map(name => <label className="check-label" key={name}><input type="checkbox" checked={sheet.conditions.includes(name)} onChange={event => change('conditions', event.target.checked ? [...sheet.conditions, name] : sheet.conditions.filter(old => old !== name))} />{name}</label>)}</div>
      <div className="form-grid">
        <label>Exhaustion level<input type="number" min="0" max="6" value={sheet.exhaustion} onChange={event => change('exhaustion', Number(event.target.value))} /></label>
        {['successes', 'failures'].map(key => <label key={key}>Death save {key}<input type="number" min="0" max="3" value={sheet.deathSaves[key]} onChange={event => change('deathSaves', { ...sheet.deathSaves, [key]: Number(event.target.value) })} /></label>)}
      </div>
      <p className="muted">Condition effects, temporary ability reductions, and death-save outcomes require manual adjudication.</p>
    </section>
  </>;
}
