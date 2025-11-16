import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import CategoryCard from './CategoryCard';

/**
 * SortableCategoryItem - Individual draggable category
 */
function SortableCategoryItem({ category, isSelected, onClick, onEdit, onDelete, onEditCustomFields }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

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
      
      {/* Category Card with left padding for drag handle */}
      <div className="pl-6">
        <CategoryCard
          category={category}
          isSelected={isSelected}
          onClick={onClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditCustomFields={onEditCustomFields}
        />
      </div>
    </div>
  );
}

/**
 * SortableCategoriesList - Draggable categories list
 * 
 * @param {array} categories - Array of categories
 * @param {number} selectedCategoryId - ID of selected category
 * @param {function} onCategoryClick - Callback(category) when clicked
 * @param {function} onEdit - Callback(category) to edit
 * @param {function} onDelete - Callback(id, name) to delete
 * @param {function} onEditCustomFields - Callback(category) to edit custom fields
 * @param {function} onReorder - Callback(newCategories) when order changes
 */
export default function SortableCategoriesList({ 
  categories, 
  selectedCategoryId,
  onCategoryClick, 
  onEdit, 
  onDelete, 
  onEditCustomFields,
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
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      onReorder(newCategories);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categories.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {categories.map((category) => (
            <SortableCategoryItem
              key={category.id}
              category={category}
              isSelected={selectedCategoryId === category.id}
              onClick={() => onCategoryClick(category)}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditCustomFields={onEditCustomFields}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
