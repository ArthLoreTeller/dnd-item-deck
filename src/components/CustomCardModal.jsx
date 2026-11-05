import { useDialogFocus } from "../hooks/useDialogFocus";
import { useEffect, useState, useRef } from 'react';
import { ABILITY_GROUPS, abilityGroups, freshDraft, prepareCustomCard } from '../data/customCard';
import { RARITIES } from '../data/rarity';
import { useCardStore } from '../store/useCardStore';

export function CustomCardModal({ isOpen, onClose, onCardAdded }) {
  return isOpen ? <CustomCardForm onClose={onClose} onCardAdded={onCardAdded} /> : null;
}

function CustomCardForm({ onClose, onCardAdded }) {
  const overlayRef = useRef(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const close = () => { if (!pending.current) onClose(); };
  useDialogFocus(overlayRef, true, close);
  const addToInventory = useCardStore((state) => state.addToInventory);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState(freshDraft);
  useEffect(() => {
    if (error?.field) overlayRef.current?.querySelector('[name="' + error.field + '"]')?.focus();
  }, [error]);

  const isNormal = formData.type === 'normal';

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (category, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const handleAbilityChange = (listKey, index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev[listKey]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [listKey]: updated };
    });
  };

  const addAbilityRow = (listKey) => {
    setFormData((prev) => ({
      ...prev,
      [listKey]: [...prev[listKey], { title: '', description: '' }],
    }));
  };

  const removeAbilityRow = (listKey, index) => {
    setFormData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const result = prepareCustomCard(formData);
    if (result.error) {
      setActiveTab(result.error.tab);
      setError(result.error);
      return;
    }
    pending.current = true;
    setSaving(true);
    setError(null);
    let saved;
    try {
      // getRandomValues is also available on local HTTP game tables.
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = 'custom-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      saved = await addToInventory({ ...result.card, id });
    } catch {
      // The draft stays mounted so a failed save can be retried.
    } finally {
      pending.current = false;
      setSaving(false);
    }
    if (!saved) {
      const reason = useCardStore.getState().storageNotice || 'Could not save this card to your inventory.';
      setError({ message: reason + ' Your draft is still here.' });
      return;
    }
    onCardAdded?.(saved);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="custom-card-title"
        className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-white animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 id="custom-card-title" className="font-serif font-bold text-amber-200 text-lg">Create Custom Item Card</h3>
            <p className="text-[11px] text-slate-400">Configure item statistics, rules, and ability slots</p>
          </div>
          <button aria-label="Close custom card" disabled={saving} onClick={close} className="close-control text-slate-400 hover:text-white text-sm font-semibold cursor-pointer">✕</button>
        </div>

        <div className="flex border-b border-slate-800 gap-2 text-xs">
          {['general', 'abilities', 'specs'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 capitalize font-semibold transition-colors border-b-2 ${
                activeTab === tab ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-4 text-xs">
          <fieldset disabled={saving} className="overflow-y-auto no-scrollbar pr-1 space-y-4 max-h-[420px]">
            {activeTab === 'general' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="card-item-name" className="text-slate-300 font-semibold mb-1 block">Item Name *</label>
                  <input id="card-item-name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Sunforged Scimitar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold mb-1 block" htmlFor="custom-rarity">Rarity</label>
                  <select id="custom-rarity" value={formData.rarity} onChange={(e) => handleInputChange("rarity", e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-amber-100 mb-3">
                    {Object.entries(RARITIES).map(([key, rarity]) => <option key={key} value={key}>{rarity.label}</option>)}
                  </select>
                  <label htmlFor="card-item-icon-emoji" className="text-slate-300 font-semibold mb-1 block">Item Icon (Emoji)</label>
                  <input id="card-item-icon-emoji"
                    type="text"
                    value={formData.icon}
                    onChange={(e) => handleInputChange('icon', e.target.value)}
                    placeholder="e.g., ⚔️"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="card-card-type" className="text-slate-300 font-semibold mb-1 block">Card Type</label>
                  <select id="card-card-type"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 focus:border-amber-500 outline-none"
                    >
                      <option value="standard">Standard (Attunable)</option>
                      <option value="progressive">Progressive (Attunable with Leveling)</option>
                      <option value="normal">Normal (Unattunable)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="card-artwork-image-url" className="text-slate-300 font-semibold mb-1 block">Artwork Image URL</label>
                  <input id="card-artwork-image-url"
                      name="itemImage"
                      type="url"
                      value={formData.itemImage}
                      onChange={(e) => handleInputChange('itemImage', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {!isNormal && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="card-hit-stat" className="text-slate-300 font-semibold mb-1 block">Hit Stat</label>
                  <input id="card-hit-stat"
                        type="text"
                        placeholder="e.g. +0"
                        value={formData.stats.hit}
                        onChange={(e) => handleNestedChange('stats', 'hit', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="card-damage-stat" className="text-slate-300 font-semibold mb-1 block">Damage Stat</label>
                  <input id="card-damage-stat"
                        type="text"
                        placeholder="e.g. 1d8"
                        value={formData.stats.damage}
                        onChange={(e) => handleNestedChange('stats', 'damage', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="card-save-dc" className="text-slate-300 font-semibold mb-1 block">Save DC</label>
                  <input id="card-save-dc"
                        type="text"
                        placeholder="e.g. 14"
                        value={formData.stats.saveDc}
                        onChange={(e) => handleNestedChange('stats', 'saveDc', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="card-flavor-lore-text" className="text-slate-300 font-semibold mb-1 block">Flavor / Lore Text</label>
                  <textarea id="card-flavor-lore-text"
                    rows={2}
                    value={formData.flavorText}
                    onChange={(e) => handleInputChange('flavorText', e.target.value)}
                    placeholder="Forged in the heart of the first sunrise..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none no-scrollbar"
                  />
                </div>

                {!isNormal && (
                  <div>
                    <label htmlFor="card-attunement-rules" className="text-slate-300 font-semibold mb-1 block">Attunement Rules</label>
                  <input id="card-attunement-rules"
                      type="text"
                      placeholder="e.g. Requires attunement by a spellcaster"
                      value={formData.attunementRules}
                      onChange={(e) => handleInputChange('attunementRules', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100 focus:border-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'abilities' && (
              <div className="space-y-4">
                {abilityGroups(formData.type).map(group => (
                  <div className="space-y-2" key={group}>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-200 font-semibold">{ABILITY_GROUPS[group]}</span>
                      <button type="button" onClick={() => addAbilityRow(group)} className="text-[11px] text-amber-400 underline">+ Add ability</button>
                    </div>
                    {formData[group].map((ability, index) => (
                      <div key={index} className="flex gap-2 items-start bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <div className="flex-1 space-y-1">
                          <input name={group + '-' + index} aria-label={ABILITY_GROUPS[group] + ' title ' + (index + 1)}
                            placeholder="Ability title (e.g. Searing Light)" value={ability.title}
                            onChange={(event) => handleAbilityChange(group, index, 'title', event.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-100 text-xs" />
                          <textarea rows={2} aria-label={ABILITY_GROUPS[group] + ' description ' + (index + 1)}
                            placeholder="Ability description (optional)" value={ability.description}
                            onChange={(event) => handleAbilityChange(group, index, 'description', event.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs no-scrollbar" />
                        </div>
                        <button type="button" aria-label={'Remove ' + ABILITY_GROUPS[group] + ' row ' + (index + 1)}
                          onClick={() => removeAbilityRow(group, index)} className="close-control text-red-400 font-bold px-1.5 py-1">✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="card-item-category" className="text-slate-300 font-semibold mb-1 block">Item Category</label>
                  <input id="card-item-category"
                      type="text"
                      value={formData.specs.type}
                      onChange={(e) => handleNestedChange('specs', 'type', e.target.value)}
                      placeholder="e.g. Weapon (Longsword)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="card-properties" className="text-slate-300 font-semibold mb-1 block">Properties</label>
                  <input id="card-properties"
                      type="text"
                      value={formData.specs.properties}
                      onChange={(e) => handleNestedChange('specs', 'properties', e.target.value)}
                      placeholder="e.g. Versatile, Finesse"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="card-ranges" className="text-slate-300 font-semibold mb-1 block">Ranges</label>
                  <input id="card-ranges"
                      type="text"
                      value={formData.specs.ranges}
                      onChange={(e) => handleNestedChange('specs', 'ranges', e.target.value)}
                      placeholder="e.g. 5 ft."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="card-base-damage" className="text-slate-300 font-semibold mb-1 block">Base Damage</label>
                  <input id="card-base-damage"
                      type="text"
                      value={formData.specs.damage}
                      onChange={(e) => handleNestedChange('specs', 'damage', e.target.value)}
                      placeholder="e.g. 1d8 / 1d10"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="card-damage-type" className="text-slate-300 font-semibold mb-1 block">Damage Type</label>
                  <input id="card-damage-type"
                      type="text"
                      value={formData.specs.damageType}
                      onChange={(e) => handleNestedChange('specs', 'damageType', e.target.value)}
                      placeholder="e.g. Radiant"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </fieldset>
          {error && <p role="alert" className="text-red-400">{error.message}</p>}

          <div className="flex justify-between items-center pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Ready to append to your inventory</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shadow cursor-pointer transition-all active:scale-95"
              >
                {saving ? 'Saving…' : 'Create Card'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}