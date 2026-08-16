import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// Trash Target Component
function TrashZone({acti}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'trash-zone' });
  
  return (
    <div 
      ref={setNodeRef}
      className={`fixed bottom-4 left-4 p-4 rounded-full border-2 ${
        isOver ? "bg-red-600 border-white scale-125" : "bg-[#3E2723] border-[#8B5A2B]"
      } transition-all`}
    >
    </div>
  );
}