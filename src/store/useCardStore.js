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
          toastMessage: `Added "${newCard.name}" to inventory!`,
        });
      },

      // Draw a random card from the deck and add it to the inventory
      drawRandomCard: () => {
        const { deck, inventory } = get();
        if (deck.length === 0) return;

        const randomIndex = Math.floor(Math.random() * deck.length);
        const drawnCard = deck[randomIndex];
        //Create a new deck array without the drawn card
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

      // Discard a card from the inventory. Custom cards (id starting with "custom-") are deleted permanently, while standard cards are returned to the deck.
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
            toastMessage: isCustom
              ? `Permanently deleted custom card "${cardToDiscard.name}".`
              : `Returned "${cardToDiscard.name}" to the deck.`,
          };
        });
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
          toastMessage: 'All standard cards returned to the deck.',
        });
      },
    }),
    {
      name: 'dnd-item-deck-storage', // LocalStorage Key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        deck: state.deck,
        inventory: state.inventory,
        activeCard: state.activeCard,
      }),
    }
  )
);