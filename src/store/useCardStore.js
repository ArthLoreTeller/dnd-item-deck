import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import rawDefaultCards from '../data/defaultCards.json' with { type: 'json' };
import { normalizeCard, chooseWeightedCard } from '../data/rarity.js';
import { parseBackup, serializeBackup } from '../data/backup.js';
import { createPlayerProfile, migratePlayerData, newId, relicEquipment, validateEquipment, validateProfile } from '../data/player.js';
import { mergeCharacterDraft } from '../data/character-import.js';
import { applyGuidelineWeights } from '../data/equipment-weights.js';
import { hasSheetData } from '../data/character-sheet.js';
const defaultCards = rawDefaultCards.map(normalizeCard);

function safeRestore(card, inventory) {
  return { ...card, isAttuned: Boolean(card.isAttuned) && inventory.filter(item => item.isAttuned).length < 3 };
}

function hasDeckEdits(card) {
  const original = defaultCards.find(item => item.id === card.id);
  if (!original) return true;
  const fields = ['name', 'type', 'stats', 'specs', 'weaponStats', 'images', 'itemImage', 'description', 'flavorText', 'attunementRules', 'abilities', 'level1Abilities', 'level2Abilities', 'level3Abilities'];
  return fields.some(key => JSON.stringify(card[key]) !== JSON.stringify(original[key])) || (card.currentLevel || 1) !== (original.currentLevel || 1) || (card.progress?.level1 || 0) !== (original.progress?.level1 || 0) || (card.progress?.level2 || 0) !== (original.progress?.level2 || 0);
}

export const useCardStore = create(
  persist(
    (rawSet, get) => {
      // Reconcile every card lifecycle change in the same persisted transaction.
      const set = update => rawSet(state => {
        const patch = typeof update === 'function' ? update(state) : update;
        if (!patch.inventory) return patch;
        const profile = patch.profile ?? state.profile;
        const cache = { ...state.relicEquipmentCache, ...patch.relicEquipmentCache };
        for (const entry of state.equipment) if (entry.relicCardId) cache[entry.relicCardId] = entry;
        const candidates = patch.equipment ?? state.equipment;
        const equipment = candidates.filter(entry => !entry.relicCardId);
        for (const card of patch.inventory) {
          const linked = candidates.find(entry => entry.relicCardId === String(card.id)) ?? cache[String(card.id)] ?? relicEquipment(card, profile.id);
          equipment.push({ ...linked, characterId: profile.id, name: card.name || 'Relic' });
        }
        return { ...patch, equipment, relicEquipmentCache: cache };
      });
      return ({
      profile: createPlayerProfile(),
      equipment: [],
      relicEquipmentCache: {},
      lastEquipmentRemoval: null,
      applyCharacterImport: (draft, selection) => set(state => ({ ...mergeCharacterDraft(state, draft, selection), toastMessage: 'Reviewed character import saved.' })),
      updateProfile: patch => set(state => ({ profile: validateProfile({ ...state.profile, ...patch }) })),
      addEquipment: value => {
        const entry = validateEquipment({ ...value, id: newId(), characterId: get().profile.id, relicCardId: null });
        set(state => ({ equipment: [...state.equipment, entry] }));
      },
      updateEquipment: (id, patch) => set(state => ({ equipment: state.equipment.map(entry => entry.id === id ? validateEquipment({ ...entry, ...patch, id: entry.id, characterId: entry.characterId, relicCardId: entry.relicCardId, source: entry.source }) : entry) })),
      removeEquipment: id => {
        const entry = get().equipment.find(item => item.id === id);
        if (!entry) return;
        if (entry.relicCardId) { get().discardCard(entry.relicCardId); return; }
        set(state => ({ equipment: state.equipment.filter(item => item.id !== id), lastEquipmentRemoval: entry }));
      },
      undoEquipmentRemoval: () => set(state => ({ equipment: state.lastEquipmentRemoval && !state.equipment.some(item => item.id === state.lastEquipmentRemoval.id) ? [...state.equipment, state.lastEquipmentRemoval] : state.equipment, lastEquipmentRemoval: null })),
      // Set basic state properties
      deck: defaultCards || [],
      inventory: [],
      activeCard: null,
      toastMessage: null,
      discardedCustom: [],
      lastDiscard: null,

      // Set general state update functions
      setActiveCard: (card) => set({ activeCard: card }),

      setToastMessage: (msg) => set({ toastMessage: msg }),
      clearToast: () => set({ toastMessage: null }),

      updateProgress: (id, level, value) => {
        const card = get().inventory.find(item => item.id === id);
        if (!card || card.type !== 'progressive' || ![1, 2].includes(level) || !Number.isFinite(value)) return;
        const max = card.maxProgress || 20;
        const progress = { level1: 0, level2: 0, ...card.progress, [`level${level}`]: Math.min(max, Math.max(0, Math.trunc(value))) };
        const currentLevel = progress.level1 >= max ? (progress.level2 >= max ? 3 : 2) : 1;
        get().updateCard(id, { progress, currentLevel });
      },

      // Add a new card to the inventory, ensuring no duplicates
      addToInventory: (newCard) => {
        newCard = normalizeCard(newCard);
        const { inventory } = get();
        if (inventory.some((c) => c.id === newCard.id)) {
          set({ toastMessage: `"${newCard.name}" is already in inventory!` });
          return;
        }

        set({
          inventory: [newCard, ...inventory],
          activeCard: newCard,
          toastMessage: `Added "${newCard.name}" to inventory!`,
        });
      },

      // Draw a random card from the deck and add it to the inventory
      drawRandomCard: () => {
        const { deck, inventory } = get();
        if (deck.length === 0) return;

        const drawnCard = chooseWeightedCard(deck);
        //Create a new deck array without the drawn card
        const updatedDeck = deck.filter((card) => card.id !== drawnCard.id);

        set({
          deck: updatedDeck,
          inventory: [drawnCard, ...inventory],
          activeCard: drawnCard,
        });
      },

      // Draw a specific card by its ID from the deck and add it to the inventory
      drawCardById: (cardId) => {
        const { deck, inventory } = get();
        const cardToDraw = deck.find((c) => c.id === cardId);
        if (!cardToDraw) return;

        set({
          deck: deck.filter((c) => c.id !== cardId),
          inventory: [cardToDraw, ...inventory],
          activeCard: cardToDraw,
        });
      },

      // Update a card's properties in the inventory and active card preview
      updateCard: (id, updates) => {
        const { inventory } = get();
        const currentCard = inventory.find((c) => c.id === id);

        // Attunement Rule: Limit to maximum 3 attuned items
        if (updates.isAttuned === true && currentCard && !currentCard.isAttuned) {
          const currentlyAttunedCount = inventory.filter((c) => c.isAttuned).length;
          if (currentlyAttunedCount >= 3) {
            set({ toastMessage: 'Attunement limit reached (3/3)! Unattune an item first.' });
            return;
          }
        }
        
        // Set the state with updated inventory and active card
        set((state) => {
          const updatedInventory = state.inventory.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          );

          const updatedActive =
            state.activeCard?.id === id
              ? { ...state.activeCard, ...updates }
              : state.activeCard;

          return {
            inventory: updatedInventory,
            activeCard: updatedActive,
          };
        });
      },

      // Custom cards go to recovery; built-in cards return to the deck.
      discardCard: (id) => {
        set((state) => {
          const cardToDiscard = state.inventory.find((c) => c.id === id);
          if (!cardToDiscard) return state;

          const isCustom = String(cardToDiscard.id).startsWith('custom-');

          // Remove card from current inventory
          const updatedInventory = state.inventory.filter((c) => c.id !== id);

          // Reset attunement before putting standard cards back into the deck
          const cleanDeckCard = { ...cardToDiscard, isAttuned: false };

          const updatedDeck = isCustom
            ? state.deck
            : [...state.deck, cleanDeckCard];

          // Switch active card preview to next available card
          const newActive =
            state.activeCard?.id === id
              ? updatedInventory[0] || null
              : state.activeCard;

          return {
            inventory: updatedInventory,
            deck: updatedDeck,
            activeCard: newActive,
            lastDiscard: cardToDiscard,
            discardedCustom: isCustom ? [cardToDiscard, ...state.discardedCustom.filter(card => card.id !== id)] : state.discardedCustom,
            toastMessage: isCustom
              ? `Moved "${cardToDiscard.name}" to recovery.`
              : `Returned "${cardToDiscard.name}" to the deck.`,
          };
        });
      },

      undoDiscard: () => {
        const { lastDiscard, inventory } = get();
        if (!lastDiscard) return;
        if (inventory.some(card => card.id === lastDiscard.id)) { set({ lastDiscard: null }); return; }
        const restored = safeRestore(lastDiscard, inventory);
        set(state => ({ inventory: [restored, ...state.inventory], deck: state.deck.filter(card => card.id !== restored.id), discardedCustom: state.discardedCustom.filter(card => card.id !== restored.id), activeCard: restored, lastDiscard: null, toastMessage: `Restored "${restored.name}"${lastDiscard.isAttuned && !restored.isAttuned ? ' unattuned (3 slots already in use)' : ''}.` }));
      },

      restoreCustomCard: (id) => {
        const { discardedCustom, inventory } = get();
        const card = discardedCustom.find(item => item.id === id);
        if (!card || inventory.some(item => item.id === id)) return;
        const restored = safeRestore(card, inventory);
        set(state => ({ inventory: [restored, ...state.inventory], activeCard: restored, discardedCustom: state.discardedCustom.filter(item => item.id !== id), lastDiscard: state.lastDiscard?.id === id ? null : state.lastDiscard, toastMessage: `Restored "${card.name}"${card.isAttuned && !restored.isAttuned ? ' unattuned (3 slots already in use)' : ''}.` }));
      },

      exportBackup: () => serializeBackup(get()),
      importBackup: (text) => {
        const backup = parseBackup(text);
        const state = get();
        const inventory = [...state.inventory];
        for (const card of backup.inventory) {
          if (!inventory.some(item => item.id === card.id)) {
            const recovered = state.discardedCustom.find(item => item.id === card.id);
            const inDeck = state.deck.find(item => item.id === card.id);
            const current = recovered || (inDeck && hasDeckEdits(inDeck) ? inDeck : null);
            inventory.push(safeRestore(current || card, inventory));
          }
        }
        const owned = new Set(inventory.map(card => card.id));
        const discardedCustom = state.discardedCustom.filter(card => !owned.has(card.id));
        for (const card of backup.discardedCustom) {
          if (!owned.has(card.id) && !discardedCustom.some(item => item.id === card.id)) discardedCustom.push(card);
        }
        const deck = [...state.deck];
        for (const card of backup.deck) {
          const index = deck.findIndex(item => item.id === card.id);
          if (index < 0) deck.push({ ...card, isAttuned: false });
          else if (!hasDeckEdits(deck[index])) deck[index] = { ...card, isAttuned: false };
        }
        const added = inventory.length - state.inventory.length;
        const player = {};
        if (backup.profile) {
          const merged = { ...state.profile };
          for (const [key, value] of Object.entries(backup.profile)) {
            if (['id', 'rulesVersion'].includes(key)) continue;
            if (['abilities', 'hp', 'currency'].includes(key)) merged[key] = Object.fromEntries(Object.keys(value).map(field => [field, state.profile[key][field] ?? value[field]]));
            else if (key === 'sheet' && !hasSheetData(state.profile.sheet)) merged[key] = value;
            else if (state.profile[key] === null || state.profile[key] === '' || (Array.isArray(state.profile[key]) && !state.profile[key].length)) merged[key] = value;
          }
          player.profile = validateProfile(merged);
          player.equipment = [...state.equipment];
          for (const entry of backup.equipment) if (!player.equipment.some(item => item.id === entry.id || (entry.relicCardId && item.relicCardId === entry.relicCardId))) {
            const current = entry.relicCardId ? state.relicEquipmentCache[entry.relicCardId] : null;
            player.equipment.push({ ...(current ?? entry), characterId: player.profile.id });
          }
          player.relicEquipmentCache = { ...backup.relicEquipmentCache, ...state.relicEquipmentCache };
        }
        set({ ...player, inventory, deck: deck.filter(card => !owned.has(card.id)), discardedCustom, lastDiscard: null, toastMessage: `Backup imported. ${added} ${added === 1 ? 'card' : 'cards'} added; your current edits were kept.` });
        return { added };
      },

      // Reset the deck to its default state, excluding cards currently in the inventory
      resetDeck: () => {
        const { inventory } = get();
        // Keep only custom cards in the inventory
        const customCards = inventory.filter((c) => String(c.id).startsWith('custom-'));

        set({
          deck: defaultCards || [],
          inventory: customCards,
          activeCard: customCards[0] || null,
          lastDiscard: null,
          toastMessage: 'All standard cards returned to the deck.',
        });
      },
    }); },
    {
      name: 'dnd-item-deck-storage', // LocalStorage Key
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted, version) => {
        const migrated = {
          ...persisted,
          ...migratePlayerData(persisted, { migrateSpells: version < 4 }),
          relicEquipmentCache: Object.fromEntries(Object.entries(persisted.relicEquipmentCache ?? {}).map(([id, entry]) => [id, validateEquipment(entry)])),
        };
        return version < 3 ? applyGuidelineWeights(migrated) : migrated;
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        ...migratePlayerData(persisted ?? current),
        deck: (persisted?.deck || current.deck).map(normalizeCard),
        inventory: (persisted?.inventory || []).map(normalizeCard),
        activeCard: persisted?.activeCard ? normalizeCard(persisted.activeCard) : null,
        discardedCustom: (persisted?.discardedCustom || []).map(normalizeCard),
      }),
      partialize: (state) => ({
        deck: state.deck,
        inventory: state.inventory,
        activeCard: state.activeCard,
        discardedCustom: state.discardedCustom,
        profile: state.profile,
        equipment: state.equipment,
        relicEquipmentCache: state.relicEquipmentCache,
      }),
    }
  )
);
