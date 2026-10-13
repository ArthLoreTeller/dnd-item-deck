import React from 'react';
import { useTheme } from '../theme/useTheme';
import { THEMES } from '../theme/themes';
import { useSoundSettings } from '../audio/sound';

export function SettingsPage() {
  const theme = useTheme(state => state.theme);
  const setTheme = useTheme(state => state.setTheme);
  const { muted, volume, reducedMotion, toggleMuted, setVolume, setReducedMotion } = useSoundSettings();
  const volumePercent = Math.round(volume * 100);
  return <main className="player-page settings-page" aria-labelledby="settings-title">
    <div className="page-title-row"><div><p className="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="settings-title">Settings</h2><p className="muted">Preferences are saved in this browser.</p></div></div>
    <section className="sheet-panel settings-panel" aria-label="Appearance and playback">
      <div className="setting-row">
        <label htmlFor="settings-theme">Theme</label>
        <select id="settings-theme" value={theme} onChange={event => setTheme(event.target.value)}>
          {Object.entries(THEMES).map(([key, palette]) => <option key={key} value={key}>{palette.label}</option>)}
        </select>
      </div>
      <div className="setting-row">
        <label htmlFor="settings-sound">Sound</label>
        <button type="button" id="settings-sound" className="journal-button settings-switch" role="switch" aria-checked={!muted} data-silent onClick={toggleMuted}>{muted ? 'Disabled' : 'Enabled'}</button>
      </div>
      <div className="setting-row setting-volume">
        <label htmlFor="settings-volume">Master SFX volume</label>
        <div className="settings-volume-control"><input type="range" id="settings-volume" min="0" max="100" step="1" value={volumePercent} aria-valuetext={`${volumePercent}%`} data-silent onChange={event => setVolume(Number(event.target.value) / 100)} /><output htmlFor="settings-volume">{volumePercent}%</output></div>
      </div>
      <div className="setting-row">
        <label htmlFor="settings-motion">Reduced motion</label>
        <button type="button" id="settings-motion" className="journal-button settings-switch" role="switch" aria-checked={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>{reducedMotion ? 'Enabled' : 'Disabled'}</button>
      </div>
      <p className="muted settings-hint">Reduced motion softens card and menu animations. Sound effects play when their audio assets are available.</p>
    </section>
  </main>;
}
