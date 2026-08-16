import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { useCardStore } from '../store/useCardStore';
import { DraggableCard } from './DraggableCard';
import { DroppableTrash } from './DroppableTrash';
import Card from './Card';

export default function InventoryGrid() {
  const { inventory, removeFromInventory } = useCardStore();

  // Handles what happens when a drag gesture ends
  const handleDragEnd = (event) => {
    const { active, over } = event;

    // If card was dropped over 'trash-zone', remove it from inventory
    if (over && over.id === 'trash-zone') {
      removeFromInventory(active.id);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Inventory Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
        {inventory.map((card) => (
          /* WRAPPER 1: Wrap each card instance */
          <DraggableCard key={card.id} id={card.id}>
            <Card cardData={card} />
          </DraggableCard>
        ))}
      </div>

      {/* WRAPPER 2: Drop target positioned at bottom left */}
      <DroppableTrash />
    </DndContext>
  );
}