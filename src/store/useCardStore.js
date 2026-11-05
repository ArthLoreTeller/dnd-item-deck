import { withDatabaseLock } from './storageLock.js';
import { create } from 'zustand';
import { normalizeCard, chooseWeightedCard } from '../data/rarity.js';
import { CARD_STORAGE_KEY, defaultCards, readDeck, UNREADABLE, RECOVERED, WRITE_FAILED } from './cardStorage.js';

const isCustom = card => card.id.startsWith('custom-');
const isBrowser = typeof window !== 'undefined';

export function createCardStore({ storage = () => globalThis.localStorage, locks = isBrowser ? globalThis.navigator?.locks : null, events = isBrowser ? window : null } = {}) {
  let lastRaw;
  let damaged = false;
  const store = create((set, get) => {
    function load() {
      let raw;
      try {
        raw = storage().getItem(CARD_STORAGE_KEY);
      } catch {
        set({ storageNotice: WRITE_FAILED });
        return false;
      }
      if (raw === lastRaw) return true;
      try {
        const saved = readDeck(raw);
        const selectionId = get().activeCard?.id ?? saved.activeCardId;
        set({
          deck: saved.deck, inventory: saved.inventory,
          activeCard: saved.inventory.find(card => card.id === selectionId) ?? null,
          storageNotice: saved.damaged ? RECOVERED : null,
        });
        lastRaw = raw;
        damaged = saved.damaged;
        return true;
      } catch {
        set({ storageNotice: UNREADABLE });
        return false;
      }
    }

    // Web Locks serializes the complete read/apply/write operation across tabs.
    // Never publish an in-memory success until localStorage accepts the new snapshot.
    async function change(apply) {
      function commit() {
        if (!load()) return null;
        const result = apply(get());
        if (!result) return null;
        const { state, value } = result;
        const saved = JSON.stringify({ state: { deck: state.deck ?? get().deck, inventory: state.inventory ?? get().inventory }, version: 0 });
        const disk = storage();
        if (damaged) {
          disk.setItem(CARD_STORAGE_KEY + '-recovery-' + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''), lastRaw);
        }
        disk.setItem(CARD_STORAGE_KEY, saved);
        const notice = damaged ? 'Recovered deck saved. A backup of the original is in browser storage.' : null;
        lastRaw = saved;
        damaged = false;
        set({ ...state, storageNotice: notice });
        return value;
      }
      try {
        if (locks) return await locks.request(CARD_STORAGE_KEY, commit);
        if (!isBrowser) return commit();
        if (globalThis.indexedDB) return await withDatabaseLock(globalThis.indexedDB, commit);
        set({ storageNotice: 'Browser storage coordination is unavailable. Enable browser storage or open the app over HTTPS to save safely.' });
      } catch {
        set({ storageNotice: WRITE_FAILED });
      }
      return null;
    }

    function draw(choose) {
      return change(({ deck, inventory }) => {
        const card = choose(deck);
        if (!card) return null;
        return { value: card, state: { deck: deck.filter(item => item.id !== card.id), inventory: [card, ...inventory], activeCard: card } };
      });
    }

    return {
      deck: [], inventory: [], activeCard: null, toastMessage: null, storageNotice: null,
      reload: load,
      setActiveCard: card => set({ activeCard: get().inventory.find(item => item.id === card?.id) ?? null }),
      clearToast: () => set({ toastMessage: null }),
      addToInventory: newCard => change(({ inventory, deck }) => {
        const card = normalizeCard(newCard);
        if ([...inventory, ...deck].some(item => item.id === card.id)) {
          set({ toastMessage: 'This card already exists. Try creating it again.' });
          return null;
        }
        return { value: card, state: { inventory: [card, ...inventory], activeCard: card, toastMessage: `Added "${card.name}" to inventory!` } };
      }),
      drawRandomCard: () => draw(deck => chooseWeightedCard(deck)),
      drawCardById: id => draw(deck => deck.find(card => card.id === id)),
      updateCard: (id, updates) => change(({ inventory, activeCard }) => {
        const current = inventory.find(card => card.id === id);
        if (!current) return null;
        if (updates.isAttuned && !current.isAttuned && inventory.filter(card => card.isAttuned).length >= 3) {
          set({ toastMessage: 'Attunement limit reached (3/3)! Unattune an item first.' });
          return null;
        }
        const updated = { ...current, ...updates };
        for (const field of ['stats', 'progress']) {
          if (updates[field]) updated[field] = { ...current[field], ...updates[field] };
        }
        if (updates.progress && current.type === 'progressive') {
          const threshold = current.maxProgress || 20;
          updated.currentLevel = updated.progress.level1 >= threshold
            ? (updated.progress.level2 >= threshold ? 3 : 2) : 1;
        }
        return { value: true, state: {
          inventory: inventory.map(card => card.id === id ? updated : card),
          activeCard: activeCard?.id === id ? updated : activeCard,
        } };
      }),
      discardCard: id => change(({ deck, inventory, activeCard }) => {
        const card = inventory.find(item => item.id === id);
        if (!card) return null;
        const remaining = inventory.filter(item => item.id !== id);
        return { value: true, state: {
          inventory: remaining, deck: isCustom(card) ? deck : [...deck, { ...card, isAttuned: false }],
          activeCard: activeCard?.id === id ? remaining[0] ?? null : activeCard,
          toastMessage: isCustom(card) ? `Permanently deleted custom card "${card.name}".` : `Returned "${card.name}" to the deck.`,
        } };
      }),
      resetDeck: () => change(({ inventory }) => {
        const kept = inventory.filter(isCustom);
        return { value: true, state: { deck: defaultCards, inventory: kept, activeCard: kept[0] ?? null, toastMessage: 'All standard cards returned to the deck.' } };
      }),
    };
  });
  store.getState().reload();
  events?.addEventListener('storage', event => {
    if (event.key === CARD_STORAGE_KEY || event.key === null) store.getState().reload();
  });
  return store;
}

export const useCardStore = createCardStore();
