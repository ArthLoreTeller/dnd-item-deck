import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import defaultCards from '../data/defaultCards.json';

export const useCardStore = create(
  persist(
    (set, get) => ({
      // Set basic state properties
      deck: defaultCards || [],
      inventory: [],
      activeCard: null,
      toastMessage: null,

      // Set general state update functions
      setActiveCard: (card) => set({ activeCard: card }),

      setToastMessage: (msg) => set({ toastMessage: msg }),
      clearToast: () => set({ toastMessage: null }),

      // Check if an item can be attuned without exceeding the 3-attunement limit
      canAttune: (id) => {
        const { inventory } = get();
        const card = inventory.find((c) => c.id === id);
        if (!card) return false;
        if (card.isAttuned) return true;
        const currentlyAttunedCount = inventory.filter((c) => c.isAttuned).length;
        return currentlyAttunedCount < 3;
      },

      // Add a new card to the inventory, ensuring no duplicates
      addToInventory: (newCard) => {
        const { inventory } = get();
        if (inventory.some((c) => c.id === newCard.id)) {
          set({ toastMessage: `"${newCard.name}" is already in inventory!` });
          return;
        }

        set({
          inventory: [newCard, ...inventory],
          activeCard: newCard,
        });
      },

      // Draw a random card from the deck and add it to the inventory
      drawRandomCard: () => {
        const { deck, inventory } = get();
        if (deck.length === 0) return;

        const randomIndex = Math.floor(Math.random() * deck.length);
        const drawnCard = deck[randomIndex];
        const updatedDeck = deck.filter((_, i) => i !== randomIndex);

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

        // Rule 1: Progressive item reset on unattune
        let finalUpdates = { ...updates };
        if (updates.isAttuned === false && currentCard?.type === 'progressive') {
          finalUpdates = {
            ...finalUpdates,
            progress: { level1: 0, level2: 0 },
            currentLevel: 1,
          };
        }
        
        // Set the state with updated inventory and active card
        set((state) => {
          const updatedInventory = state.inventory.map((card) =>
            card.id === id ? { ...card, ...finalUpdates } : card
          );

          const updatedActive =
            state.activeCard?.id === id
              ? { ...state.activeCard, ...finalUpdates }
              : state.activeCard;

          return {
            inventory: updatedInventory,
            activeCard: updatedActive,
          };
        });
      },

      // Discard a card from the inventory.
      // Rule 1: Progressive items reset all progress on discard.
      // Custom cards are deleted, standard cards return to the deck cleanly.
      discardCard: (id) => {
        set((state) => {
          const cardToDiscard = state.inventory.find((c) => c.id === id);
          if (!cardToDiscard) return state;

          const isCustom = String(cardToDiscard.id).startsWith('custom-');

          // Remove card from current inventory
          const updatedInventory = state.inventory.filter((c) => c.id !== id);

          // Reset attunement and progressive leveling before putting back into the deck
          const cleanDeckCard = {
            ...cardToDiscard,
            isAttuned: false,
            ...(cardToDiscard.type === 'progressive'
              ? { progress: { level1: 0, level2: 0 }, currentLevel: 1 }
              : {}),
          };

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
          };
        });
      },

      // Reset the deck to default state, wiping all progress on standard items
      resetDeck: () => {
        const { inventory } = get();
        // Keep only custom cards in the inventory
        const customCards = inventory.filter((c) => String(c.id).startsWith('custom-'));

        // Reset default cards to pristine state
        const pristineDeck = (defaultCards || []).map((card) => ({
          ...card,
          isAttuned: false,
          ...(card.type === 'progressive'
            ? { progress: { level1: 0, level2: 0 }, currentLevel: 1 }
            : {}),
        }));

        set({
          deck: pristineDeck,
          inventory: customCards,
          activeCard: customCards[0] || null,
        });
      },
    }),
    {
      name: 'dnd-item-deck-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        deck: state.deck,
        inventory: state.inventory,
        activeCard: state.activeCard,
      }),
      migrate: (persistedState) => {
        // Safe migration for existing local storage states
        if (!persistedState) return persistedState;
        return {
          ...persistedState,
          deck: persistedState.deck || defaultCards || [],
          inventory: persistedState.inventory || [],
        };
      },
    }
  )
);