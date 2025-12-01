import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2 } from 'lucide-react';

/**
 * SortableFieldItem - Individual draggable field
 */
function SortableFieldItem({ field, index, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:border-gray-600 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-500 hover:text-gray-600 dark:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Field Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-white">{field.label}</h4>
            <code className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">
              {field.key}
            </code>
            <span className="text-xs text-gray-500">{field.type}</span>
            {field.required && (
              <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                Pflicht
              </span>
            )}
          </div>
          
          {field.help && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{field.help}</p>
          )}

          {/* Type-specific info */}
          <div className="flex gap-3 text-xs text-gray-500 mt-2">
            {field.unit && <span>Einheit: {field.unit}</span>}
            {field.min !== undefined && <span>Min: {field.min}</span>}
            {field.max !== undefined && <span>Max: {field.max}</span>}
            {field.maxLength && <span>Max. Länge: {field.maxLength}</span>}
            {field.options && field.options.length > 0 && (
              <span>{field.options.length} Optionen</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(index)}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * SortableFieldsList - Draggable list container
 * 
 * @param {array} fields - Array of field definitions
 * @param {function} onReorder - Callback(newFields) when order changes
 * @param {function} onEdit - Callback(index) to edit field
 * @param {function} onDelete - Callback(index) to delete field
 */
export default function SortableFieldsList({ fields, onReorder, onEdit, onDelete }) {
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
      const oldIndex = fields.findIndex(f => f.key === active.id);
      const newIndex = fields.findIndex(f => f.key === over.id);
      
      const newFields = arrayMove(fields, oldIndex, newIndex);
      onReorder(newFields);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map(f => f.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {fields.map((field, index) => (
            <SortableFieldItem
              key={field.key}
              field={field}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
