"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Clock, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskWithRelations, List, Priority } from "@/types";
import { updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";

interface KanbanBoardProps {
  tasks: TaskWithRelations[];
  lists: List[];
  onTaskClick: (task: TaskWithRelations) => void;
  onTaskCreate: (task: Partial<TaskWithRelations>) => void;
}

// Kanban columns based on task status and priority
const COLUMNS = [
  { id: "backlog", title: "Backlog", status: null, priority: null },
  { id: "todo", title: "To Do", status: "todo", priority: null },
  { id: "in-progress", title: "In Progress", status: "in-progress", priority: null },
  { id: "review", title: "Review", status: "review", priority: null },
  { id: "done", title: "Done", status: "done", priority: null },
];

// For now, we'll use priority-based columns as a simpler approach
const PRIORITY_COLUMNS = [
  { id: "critical", title: "🔴 Critical", priority: "critical", color: "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  { id: "high", title: "🟠 High", priority: "high", color: "bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  { id: "medium", title: "🟡 Medium", priority: "medium", color: "bg-yellow-100 dark:bg-yellow-100 border-yellow-200 dark:border-yellow-200" },
  { id: "low", title: "🟢 Low", priority: "low", color: "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  { id: "none", title: "⚪ All Others", priority: "none", color: "bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800" },
];

function SortableTask({
  task,
  onTaskClick,
}: {
  task: TaskWithRelations;
  onTaskClick: (task: TaskWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-lg border bg-card p-3 transition-all hover:shadow-sm cursor-pointer",
        task.completed && "opacity-60",
        isDragging && "shadow-lg"
      )}
      onClick={() => onTaskClick(task)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => {}}
              className="h-3 w-3"
            />
            <span className={cn(
              "font-medium text-sm line-clamp-1",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.name}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(task.date).toLocaleDateString()}
              </span>
            )}
            {task.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.labels.slice(0, 2).map((label) => (
                <span
                  key={label.id}
                  className="text-[10px] px-1 py-0.5 rounded text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
              {task.labels.length > 2 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{task.labels.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to move"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

export function KanbanBoard({ tasks, lists, onTaskClick, onTaskCreate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by priority
  const tasksByPriority = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};

    PRIORITY_COLUMNS.forEach((col) => {
      grouped[col.id] = tasks.filter(
        (t) => !t.completed && (col.priority === "none" ? true : t.priority === col.priority)
      );
    });

    return grouped;
  }, [tasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    // Find the tasks
    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask || !overTask) return;

    // Find the column for each task
    const activeColumn = PRIORITY_COLUMNS.find(
      (col) => col.priority === activeTask.priority || (activeTask.priority === "none" && col.id === "none")
    );
    const overColumn = PRIORITY_COLUMNS.find(
      (col) => col.priority === overTask.priority || (overTask.priority === "none" && col.id === "none")
    );

    // If dropping in a different column, update priority
    if (activeColumn?.id !== overColumn?.id && overColumn) {
      try {
        await updateTask(activeId, { priority: overColumn.priority as Priority });
        toast.success(`Moved to ${overColumn.title}`);
      } catch {
        toast.error("Failed to move task");
      }
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-medium">Kanban Board</h3>
        <p className="text-sm text-muted-foreground">
          Organize tasks by priority. Drag tasks to move them between columns.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 auto-rows-max">
          {PRIORITY_COLUMNS.map((column) => {
            const columnTasks = tasksByPriority[column.id];

            return (
              <SortableContext
                key={column.id}
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "rounded-lg border-2 border-dashed p-3 min-h-[200px]",
                    column.color
                  )}
                >
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    {column.title}
                    <span className="text-xs text-muted-foreground">
                      ({columnTasks.length})
                    </span>
                  </h4>

                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {columnTasks.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-xs">No tasks</p>
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <SortableTask
                            key={task.id}
                            task={task}
                            onTaskClick={onTaskClick}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}