import { useCardStore } from '../store/useCardStore';

export function NotesPage() {
  const profile = useCardStore(state => state.profile);
  const updateProfile = useCardStore(state => state.updateProfile);
  const changeSheet = (key, value) => updateProfile({ sheet: { ...profile.sheet, [key]: value } });

  return <main className="player-page notes-page" aria-labelledby="notes-title">
    <div className="page-title-row"><div><p className="eyebrow">THE ADVENTURER’S JOURNAL</p><h2 id="notes-title">Notes</h2><p className="muted">Features, proficiencies, and the story so far. Changes save in this browser.</p></div></div>
    <div className="player-form notes-editors">
      <section className="sheet-panel notes-repertoire" aria-label="Features and proficiencies">
        <label>Features<textarea rows="6" maxLength="20000" value={profile.sheet.features} onChange={event => changeSheet('features', event.target.value)} /></label>
        <label>Proficiencies &amp; languages<textarea rows="6" maxLength="20000" value={profile.sheet.languages} onChange={event => changeSheet('languages', event.target.value)} /></label>
      </section>
      <section className="sheet-panel"><label>Character notes<textarea rows="8" maxLength="20000" value={profile.notes} onChange={event => updateProfile({ notes: event.target.value })} /></label></section>
    </div>
  </main>;
}
