"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Repeat,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  CheckSquare,
  Square,
  Filter,
  Paperclip,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label as UiLabel } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskPreview } from "@/components/task/task-preview";
import { BulkActionsMenu } from "@/components/task/bulk-actions-menu";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TaskWithRelations, List, SortField, SortDirection, Label, Priority } from "@/types";
import { updateTask, deleteTask, toggleSubtask, bulkDeleteTasks, bulkUpdateTasks } from "@/lib/actions";
import { toast } from "sonner";

interface TaskListProps {
  tasks: TaskWithRelations[];
  lists: List[];
  labels?: Label[];
  viewTitle: string;
  onRefresh: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  filterListId?: number | undefined;
  filterLabelIds?: number[];
  filterPriority?: Priority | undefined;
  onFilterList?: (listId: number | undefined) => void;
  onFilterLabel?: (labelId: number) => void;
  onFilterPriority?: (priority: Priority | undefined) => void;
  onClearFilters?: () => void;
}

const priorityConfig = {
  critical: { color: "text-red-600", bg: "bg-red-600/10", label: "Critical" },
  high: { color: "text-red-500", bg: "bg-red-500/10", label: "High" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Medium" },
  low: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Low" },
  none: { color: "text-muted-foreground", bg: "bg-muted", label: "" },
};

export function TaskList({
  tasks,
  lists,
  labels = [],
  viewTitle,
  onRefresh,
  onEditTask,
  sortBy = "date",
  sortDirection = "asc",
  onSort,
  filterListId,
  filterLabelIds = [],
  filterPriority,
  onFilterList,
  onFilterLabel,
  onFilterPriority,
  onClearFilters,
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [previewTask, setPreviewTask] = useState<TaskWithRelations | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Virtual scrolling for large task lists
  const parentRef = useRef<HTMLDivElement>(null);
  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !t.completed);

  const rowVirtualizer = useVirtualizer({
    count: visibleTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Approximate task item height
    overscan: 5,
  });

  const getSortIndicator = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />;
    return sortDirection === "asc"
      ? <ChevronDown className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5 rotate-180" />;
  };

  const renderSortButton = (field: SortField, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs font-normal"
      onClick={() => onSort?.(field)}
    >
      {label} {getSortIndicator(field)}
    </Button>
  );

  const toggleExpanded = (taskId: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleToggleComplete = async (task: TaskWithRelations) => {
    await updateTask(task.id, { completed: !task.completed });
    onRefresh();
  };

  const handleToggleSubtask = async (subtaskId: number) => {
    await toggleSubtask(subtaskId);
    onRefresh();
  };

  const handleDelete = async (task: TaskWithRelations) => {
    // Store task for potential undo
    const taskToDelete = { ...task };

    // Actually delete first
    try {
      await deleteTask(task.id);
      onRefresh();
    } catch {
      toast.error("Failed to delete task");
      return;
    }

    // Show toast with undo
    toast.success("Task deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            // Restore task by recreating (casting to avoid exactOptionalPropertyTypes issues)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const restoreData: any = {
              name: taskToDelete.name,
              priority: taskToDelete.priority,
            };
            if (taskToDelete.description) restoreData.description = taskToDelete.description;
            if (taskToDelete.notes) restoreData.notes = taskToDelete.notes;
            if (taskToDelete.list_id) restoreData.list_id = taskToDelete.list_id;
            if (taskToDelete.date) restoreData.date = taskToDelete.date;
            if (taskToDelete.deadline) restoreData.deadline = taskToDelete.deadline;
            if (taskToDelete.recurring_config) restoreData.recurring_config = taskToDelete.recurring_config;
            restoreData.recurring = taskToDelete.recurring;

            await (await import("@/lib/actions")).createTask(restoreData);
            onRefresh();
            toast.success("Task restored");
          } catch {
            toast.error("Failed to restore task");
          }
        },
      },
    });
  };

  // Separate pending and completed tasks for display
  const pendingTasks = visibleTasks.filter((t) => !t.completed);
  const completedVisibleTasks = visibleTasks.filter((t) => t.completed);

  const getListColor = (listId: number | null) => {
    const list = lists.find((l) => l.id === listId);
    return list?.color || "#6366f1";
  };

  const getListName = (listId: number | null) => {
    const list = lists.find((l) => l.id === listId);
    return list?.name || "Inbox";
  };

  const getListEmoji = (listId: number | null) => {
    const list = lists.find((l) => l.id === listId);
    return list?.emoji || "📥";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">{viewTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {visibleTasks.length} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSelectMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setSelectedTasks(new Set())}
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Select All
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size} selected
              </span>
            </>
          )}
          <div className="flex items-center gap-1">
            {renderSortButton("date", "Date")}
            {renderSortButton("priority", "Priority")}
            {renderSortButton("name", "Name")}
          </div>
          {/* Filter Popover */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                Filter
                <kbd className="ml-1 hidden sm:inline text-xs text-muted-foreground/60">⌘+f</kbd>
                {(filterListId || filterLabelIds.length > 0 || filterPriority) && (
                  <span className="ml-1 h-2 w-2 bg-primary rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div>
                  <UiLabel className="text-sm font-medium">List</UiLabel>
                  <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                    <button
                      className={cn(
                        "text-sm w-full text-left px-2 py-1 rounded hover:bg-muted",
                        !filterListId && "bg-muted"
                      )}
                      onClick={() => {
                        onFilterList?.(undefined);
                      }}
                    >
                      All Lists
                    </button>
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        className={cn(
                          "text-sm w-full text-left px-2 py-1 rounded hover:bg-muted flex items-center gap-2",
                          filterListId === list.id && "bg-muted"
                        )}
                        onClick={() => {
                          onFilterList?.(list.id);
                        }}
                      >
                        <span>{list.emoji}</span>
                        {list.name}
                      </button>
                    ))}
                  </div>
                </div>
                {labels.length > 0 && (
                  <div>
                    <UiLabel className="text-sm font-medium">Labels</UiLabel>
                    <div className="mt-1 flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {labels.map((label) => {
                        const isSelected = filterLabelIds.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            className={cn(
                              "text-xs px-2 py-1 rounded border flex items-center gap-1",
                              isSelected ? "ring-2 ring-primary" : "opacity-60"
                            )}
                            onClick={() => onFilterLabel?.(label.id)}
                          >
                            <span>{label.icon}</span>
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <UiLabel className="text-sm font-medium">Priority</UiLabel>
                  <div className="mt-1 space-y-1">
                    <button
                      className={cn(
                        "text-sm w-full text-left px-2 py-1 rounded hover:bg-muted",
                        !filterPriority && "bg-muted"
                      )}
                      onClick={() => onFilterPriority?.(undefined)}
                    >
                      All Priorities
                    </button>
                    {(["critical", "high", "medium", "low"] as const).map((p) => (
                      <button
                        key={p}
                        className={cn(
                          "text-sm w-full text-left px-2 py-1 rounded hover:bg-muted",
                          filterPriority === p && "bg-muted"
                        )}
                        onClick={() => onFilterPriority?.(p)}
                      >
                        {priorityConfig[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                {(filterListId || filterLabelIds.length > 0 || filterPriority) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      onClearFilters?.();
                      setIsFilterOpen(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <Button
              variant={isSelectMode ? "default" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setIsSelectMode(!isSelectMode)}
            >
              {isSelectMode ? (
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Square className="h-3.5 w-3.5 mr-1" />
              )}
              Select
              <kbd className="ml-1 text-xs text-muted-foreground/60 hidden sm:inline">S</kbd>
            </Button>
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <UiLabel htmlFor="show-completed" className="text-sm">
              Show completed
              <kbd className="ml-1 text-xs text-muted-foreground/60 hidden sm:inline">C</kbd>
            </UiLabel>
          </div>
        </div>
      </div>

      <ScrollArea ref={parentRef} className="flex-1 px-6 py-4">
        {/* Bulk Action Bar */}
        <AnimatePresence>
          {isSelectMode && selectedTasks.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 rounded-lg bg-primary/10 border p-3 flex items-center justify-between"
            >
              <span className="text-sm font-medium">
                {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <BulkActionsMenu
                  selectedTasks={Array.from(selectedTasks)}
                  onAction={() => setSelectedTasks(new Set())}
                  onRefresh={onRefresh}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">Create a new task to get started</p>
          </div>
        ) : (
          <div
            className="space-y-2"
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: "100%",
              overflow: "hidden",
            }}
          >
            <AnimatePresence mode="popLayout">
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const task = visibleTasks[virtualItem.index];
                const isExpanded = expandedTasks.has(task.id);
                const isSelected = selectedTasks.has(task.id);

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "group rounded-lg border bg-card transition-all hover:shadow-sm cursor-pointer",
                      task.completed && "opacity-60",
                      isSelected && "ring-2 ring-primary"
                    )}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => {
                      if (isSelectMode) {
                        setSelectedTasks((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.id)) {
                            next.delete(task.id);
                          } else {
                            next.add(task.id);
                          }
                          return next;
                        });
                      } else {
                        onEditTask(task);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelectMode) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPreviewTask(task);
                        setPreviewPosition({ x: rect.right, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => {
                      if (!isSelectMode) {
                        setPreviewTask(null);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex items-center gap-2">
                        {isSelectMode ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTasks((prev) => {
                                  const next = new Set(prev);
                                  next.add(task.id);
                                  return next;
                                });
                              } else {
                                setSelectedTasks((prev) => {
                                  const next = new Set(prev);
                                  next.delete(task.id);
                                  return next;
                                });
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleComplete(task)}
                            aria-label={`Mark "${task.name}" as ${task.completed ? 'incomplete' : 'complete'}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-medium",
                              task.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {task.name}
                          </span>
                          {task.priority !== "none" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5"
                              style={{ color: priorityConfig[task.priority].color }}
                            >
                              {priorityConfig[task.priority].label}
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 gap-1"
                            style={{
                              borderColor: getListColor(task.list_id) + "40",
                            }}
                          >
                            <span>{getListEmoji(task.list_id)}</span>
                            {getListName(task.list_id)}
                          </Badge>

                          {task.date && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Calendar className="h-2.5 w-2.5" />
                              {format(parseISO(task.date), "MMM d")}
                            </span>
                          )}

                          {task.deadline && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {format(parseISO(task.deadline), "HH:mm")}
                            </span>
                          )}

                          {task.recurring !== "none" && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Repeat className="h-2.5 w-2.5" />
                              {task.recurring}
                            </span>
                          )}

                          {task.labels.map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] text-white"
                              style={{ backgroundColor: label.color }}
                              aria-label={`Label: ${label.name}`}
                            >
                              <span>{label.icon}</span>
                              {label.name}
                            </span>
                          ))}

                          {task.attachments && task.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" aria-label={`${task.attachments.length} attachment(s)`}>
                              <Paperclip className="h-2.5 w-2.5" />
                              {task.attachments.length}
                            </span>
                          )}

                          {task.subtasks.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(task.id);
                              }}
                              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {task.subtasks.filter((s) => s.completed).length}/
                              {task.subtasks.length}
                            </button>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task);
                        }}
                        aria-label={`Delete "${task.name}"`}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      <TaskPreview
        task={previewTask}
        lists={lists}
        isVisible={previewTask !== null}
        x={previewPosition.x}
        y={previewPosition.y}
      />
    </div>
  );
}