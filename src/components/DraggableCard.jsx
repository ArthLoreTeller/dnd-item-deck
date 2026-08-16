import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function DraggableCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  // Applies movement coordinates while dragging
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999, // Keeps dragged card on top of other elements
  } : undefined;

  // Renders the draggable card with applied styles and event listeners
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      {children}
    </div>
  );
}