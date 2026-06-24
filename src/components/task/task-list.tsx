"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Flag,
  Repeat,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  CheckSquare,
  Square,
  Move,
  Tag,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskPreview } from "@/components/task/task-preview";
import type { TaskWithRelations, List, SortField, SortDirection } from "@/types";
import { updateTask, deleteTask, toggleSubtask, bulkDeleteTasks } from "@/lib/actions/tasks";
import { toast } from "sonner";

interface TaskListProps {
  tasks: TaskWithRelations[];
  lists: List[];
  viewTitle: string;
  onRefresh: () => void;
  onEditTask: (task: TaskWithRelations) => void;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
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
  viewTitle,
  onRefresh,
  onEditTask,
  sortBy = "date",
  sortDirection = "asc",
  onSort,
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [previewTask, setPreviewTask] = useState<TaskWithRelations | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

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

  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await deleteTask(taskId);
    onRefresh();
  };

  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !t.completed);

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
            </Button>
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed" className="text-sm">
              Show completed
            </Label>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // TODO: Implement move bulk action
                    toast.info("Move functionality coming soon");
                  }}
                >
                  <Move className="h-3.5 w-3.5 mr-1" />
                  Move
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // TODO: Implement label bulk action
                    toast.info("Label functionality coming soon");
                  }}
                >
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  Label
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`Delete ${selectedTasks.size} task(s)?`)) return;
                    try {
                      await bulkDeleteTasks(Array.from(selectedTasks));
                      setSelectedTasks(new Set());
                      onRefresh();
                      toast.success(`Deleted ${selectedTasks.size} task(s)`);
                    } catch {
                      toast.error("Failed to delete tasks");
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
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
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {visibleTasks.map((task) => {
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
                          handleDelete(task.id);
                        }}
                        aria-label={`Delete "${task.name}"`}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && task.subtasks.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pl-12 space-y-1">
                            {task.subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={subtask.completed}
                                  onCheckedChange={() => handleToggleSubtask(subtask.id)}
                                />
                                <span
                                  className={cn(
                                    subtask.completed &&
                                      "line-through text-muted-foreground"
                                  )}
                                >
                                  {subtask.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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