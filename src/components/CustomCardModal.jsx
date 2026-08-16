import React, { useState } from 'react';
import { useCardStore } from '../store/useCardStore';

export function CustomCardModal({ isOpen, onClose }) {
  const addToInventory = useCardStore((state) => state.addToInventory);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'abilities' | 'specs'

  const [formData, setFormData] = useState({
    name: '',
    type: 'standard',
    itemImage: '',
    flavorText: '',
    description: '',
    attunementRules: 'Requires Attunement by a Spellcaster',
    stats: {
      hit: '+0',
      damage: '1d8',
      saveDc: '14',
    },
    specs: {
      type: 'Weapon (Longsword)',
      attunement: 'Attunement Required',
      properties: 'Versatile',
      ranges: '5 ft.',
      damage: '1d8 Slashing',
      damageType: 'Slashing / Radiant',
    },
    abilities: [
      { title: 'Passive Aura', description: 'Emits dim light in a 10ft radius.' },
    ],
    level1Abilities: [
      { title: 'Awakened Strike', description: 'Deals an extra 1d4 radiant damage.' },
    ],
    level2Abilities: [
      { title: 'Radiant Flare', description: 'Blinds target on critical hits.' },
    ],
    level3Abilities: [
      { title: 'Solar Cataclysm', description: 'Unleashes a 30ft sunburst burst DC 16.' },
    ],
  });

  if (!isOpen) return null;

  const isNormal = formData.type === 'normal';

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (category, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
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

  // Prevent accidental submit when pressing Enter in text inputs
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newCard = {
      id: `custom-${Date.now()}`,
      name: formData.name.trim(),
      type: formData.type,
      itemImage: formData.itemImage.trim() || '',
      flavorText: formData.flavorText.trim(),
      description: formData.description.trim() || formData.flavorText.trim(),
      isAttuned: false,
      attunementRules: isNormal ? '' : formData.attunementRules,
      stats: isNormal ? { hit: '', damage: '', saveDc: '' } : formData.stats,
      specs: formData.specs,
      abilities: formData.abilities.filter((a) => a.title.trim() || a.description.trim()),
      level1Abilities: formData.level1Abilities.filter((a) => a.title.trim()),
      level2Abilities: formData.level2Abilities.filter((a) => a.title.trim()),
      level3Abilities: formData.level3Abilities.filter((a) => a.title.trim()),
      progress: { level1: 0, level2: 0 },
      currentLevel: 1,
      maxProgress: 20,
    };

    addToInventory(newCard);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-white animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-serif font-bold text-amber-200 text-lg">Create Custom Item Card</h3>
            <p className="text-[11px] text-slate-400">Configure item statistics, rules, and ability slots</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-semibold cursor-pointer">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2 text-xs">
          {['general', 'abilities', 'specs'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 capitalize font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col flex-1 overflow-hidden gap-4 text-xs">
          <div className="overflow-y-auto no-scrollbar pr-1 space-y-4 max-h-[420px]">
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Sunforged Scimitar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Card Type</label>
                    <select
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
                    <label className="text-slate-300 font-semibold mb-1 block">Artwork Image URL</label>
                    <input
                      type="url"
                      value={formData.itemImage}
                      onChange={(e) => handleInputChange('itemImage', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Stat Inputs: Hidden for Normal cards */}
                {!isNormal && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold mb-1 block">Hit Stat</label>
                      <input
                        type="text"
                        value={formData.stats.hit}
                        onChange={(e) => handleNestedChange('stats', 'hit', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold mb-1 block">Damage Stat</label>
                      <input
                        type="text"
                        value={formData.stats.damage}
                        onChange={(e) => handleNestedChange('stats', 'damage', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold mb-1 block">Save DC</label>
                      <input
                        type="text"
                        value={formData.stats.saveDc}
                        onChange={(e) => handleNestedChange('stats', 'saveDc', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-amber-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Flavor / Lore Text</label>
                  <textarea
                    rows={2}
                    value={formData.flavorText}
                    onChange={(e) => handleInputChange('flavorText', e.target.value)}
                    placeholder="Forged in the heart of the first sunrise..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 placeholder:text-slate-600 focus:border-amber-500 outline-none no-scrollbar"
                  />
                </div>

                {/* Attunement Rules: Hidden for Normal cards */}
                {!isNormal && (
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Attunement Rules</label>
                    <input
                      type="text"
                      value={formData.attunementRules}
                      onChange={(e) => handleInputChange('attunementRules', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100 focus:border-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ABILITIES */}
            {activeTab === 'abilities' && (
              <div className="space-y-4">
                {formData.type === 'progressive' ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-amber-200 font-semibold">Level 1 Abilities (Base Attuned)</label>
                        <button type="button" onClick={() => addAbilityRow('level1Abilities')} className="text-[11px] text-amber-400 underline">+ Add</button>
                      </div>
                      {formData.level1Abilities.map((ability, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Ability Title"
                              value={ability.title}
                              onChange={(e) => handleAbilityChange('level1Abilities', idx, 'title', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-100 text-xs"
                            />
                            <textarea
                              rows={2}
                              placeholder="Ability Description"
                              value={ability.description}
                              onChange={(e) => handleAbilityChange('level1Abilities', idx, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs no-scrollbar"
                            />
                          </div>
                          <button type="button" onClick={() => removeAbilityRow('level1Abilities', idx)} className="text-red-400 font-bold px-1.5 py-1">✕</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-amber-200 font-semibold">Level 2 Abilities (Progress 20+)</label>
                        <button type="button" onClick={() => addAbilityRow('level2Abilities')} className="text-[11px] text-amber-400 underline">+ Add</button>
                      </div>
                      {formData.level2Abilities.map((ability, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Ability Title"
                              value={ability.title}
                              onChange={(e) => handleAbilityChange('level2Abilities', idx, 'title', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-100 text-xs"
                            />
                            <textarea
                              rows={2}
                              placeholder="Ability Description"
                              value={ability.description}
                              onChange={(e) => handleAbilityChange('level2Abilities', idx, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs no-scrollbar"
                            />
                          </div>
                          <button type="button" onClick={() => removeAbilityRow('level2Abilities', idx)} className="text-red-400 font-bold px-1.5 py-1">✕</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-amber-200 font-semibold">Level 3 Abilities (Progress 40+)</label>
                        <button type="button" onClick={() => addAbilityRow('level3Abilities')} className="text-[11px] text-amber-400 underline">+ Add</button>
                      </div>
                      {formData.level3Abilities.map((ability, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Ability Title"
                              value={ability.title}
                              onChange={(e) => handleAbilityChange('level3Abilities', idx, 'title', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-100 text-xs"
                            />
                            <textarea
                              rows={2}
                              placeholder="Ability Description"
                              value={ability.description}
                              onChange={(e) => handleAbilityChange('level3Abilities', idx, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs no-scrollbar"
                            />
                          </div>
                          <button type="button" onClick={() => removeAbilityRow('level3Abilities', idx)} className="text-red-400 font-bold px-1.5 py-1">✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-amber-200 font-semibold">
                        {isNormal ? 'Item Abilities' : 'Card Abilities (Shelves 1 to 3)'}
                      </label>
                      <button type="button" onClick={() => addAbilityRow('abilities')} className="text-[11px] text-amber-400 underline">+ Add Ability</button>
                    </div>
                    {formData.abilities.map((ability, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            placeholder="Ability Title (e.g. Searing Light)"
                            value={ability.title}
                            onChange={(e) => handleAbilityChange('abilities', idx, 'title', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-100 text-xs"
                          />
                          <textarea
                            rows={2}
                            placeholder="Ability Description"
                            value={ability.description}
                            onChange={(e) => handleAbilityChange('abilities', idx, 'description', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs no-scrollbar"
                          />
                        </div>
                        <button type="button" onClick={() => removeAbilityRow('abilities', idx)} className="text-red-400 font-bold px-1.5 py-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SPECS */}
            {activeTab === 'specs' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Item Category</label>
                    <input
                      type="text"
                      value={formData.specs.type}
                      onChange={(e) => handleNestedChange('specs', 'type', e.target.value)}
                      placeholder="e.g. Weapon (Longsword)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Properties</label>
                    <input
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
                    <label className="text-slate-300 font-semibold mb-1 block">Ranges</label>
                    <input
                      type="text"
                      value={formData.specs.ranges}
                      onChange={(e) => handleNestedChange('specs', 'ranges', e.target.value)}
                      placeholder="e.g. 5 ft."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Base Damage</label>
                    <input
                      type="text"
                      value={formData.specs.damage}
                      onChange={(e) => handleNestedChange('specs', 'damage', e.target.value)}
                      placeholder="e.g. 1d8 / 1d10"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold mb-1 block">Damage Type</label>
                    <input
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
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">Ready to append to your inventory</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shadow cursor-pointer transition-all active:scale-95"
              >
                Create Card
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}