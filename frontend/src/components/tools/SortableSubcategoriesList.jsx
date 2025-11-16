import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import SubcategoryCard from './SubcategoryCard';

/**
 * SortableSubcategoryItem - Individual draggable subcategory
 */
function SortableSubcategoryItem({ subcategory, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: subcategory.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      {/* Subcategory Card with left padding for drag handle */}
      <div className="pl-6">
        <SubcategoryCard
          subcategory={subcategory}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

/**
 * SortableSubcategoriesList - Draggable subcategories list
 * 
 * @param {array} subcategories - Array of subcategories
 * @param {function} onEdit - Callback(subcategory) to edit
 * @param {function} onDelete - Callback(id, name) to delete
 * @param {function} onReorder - Callback(newSubcategories) when order changes
 */
export default function SortableSubcategoriesList({ 
  subcategories, 
  onEdit, 
  onDelete, 
  onReorder 
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = subcategories.findIndex(s => s.id === active.id);
      const newIndex = subcategories.findIndex(s => s.id === over.id);
      
      const newSubcategories = arrayMove(subcategories, oldIndex, newIndex);
      onReorder(newSubcategories);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={subcategories.map(s => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {subcategories.map((subcategory) => (
            <SortableSubcategoryItem
              key={subcategory.id}
              subcategory={subcategory}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
