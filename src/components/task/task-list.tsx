"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Flag,
  Repeat,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TaskWithRelations, List } from "@/types";
import { updateTask, deleteTask, toggleSubtask } from "@/lib/actions/tasks";

interface TaskListProps {
  tasks: TaskWithRelations[];
  lists: List[];
  viewTitle: string;
  onRefresh: () => void;
  onEditTask: (task: TaskWithRelations) => void;
}

const priorityConfig = {
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
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

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
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">{viewTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {visibleTasks.filter((t) => !t.completed).length} tasks remaining
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
                const isOverdue =
                  task.date &&
                  !task.completed &&
                  isPast(parseISO(task.date + "T23:59:59")) &&
                  !isToday(parseISO(task.date));
                const isExpanded = expandedTasks.has(task.id);
                const pConfig = priorityConfig[task.priority];

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "group rounded-lg border bg-card transition-all hover:shadow-sm",
                      task.completed && "opacity-60",
                      isOverdue && "border-red-300 dark:border-red-800"
                    )}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className="mt-0.5 shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>

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
                          {isOverdue && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] h-5"
                            >
                              Overdue
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

                          {task.priority !== "none" && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                pConfig.bg,
                                pConfig.color
                              )}
                            >
                              <Flag className="h-2.5 w-2.5 mr-0.5" />
                              {pConfig.label}
                            </span>
                          )}

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
                            >
                              <span>{label.icon}</span>
                              {label.name}
                            </span>
                          ))}

                          {task.subtasks.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(task.id)}
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

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEditTask(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
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
                                  onCheckedChange={() =>
                                    handleToggleSubtask(subtask.id)
                                  }
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
    </div>
  );
}
