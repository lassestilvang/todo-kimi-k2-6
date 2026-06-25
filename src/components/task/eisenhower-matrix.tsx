"use client";

import { useMemo } from "react";
import { TaskWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Clock, CheckCircle2 } from "lucide-react";

interface EisenhowerMatrixProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
  onAddTask: (priority: "critical" | "high" | "medium" | "low") => void;
}

export function EisenhowerMatrix({ tasks, onTaskClick, onAddTask }: EisenhowerMatrixProps) {
  const quadrants = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    return [
      {
        title: "Urgent & Important",
        description: "Do it now",
        color: "bg-red-100 dark:bg-red-900/20",
        tasks: tasks.filter((t) => t.priority === "critical" && !t.completed),
      },
      {
        title: "Not Urgent & Important",
        description: "Schedule it",
        color: "bg-green-100 dark:bg-green-900/20",
        tasks: tasks.filter((t) => t.priority === "high" && !t.completed),
      },
      {
        title: "Urgent & Not Important",
        description: "Delegate it",
        color: "bg-yellow-100 dark:bg-yellow-900/20",
        tasks: tasks.filter((t) => t.priority === "medium" && !t.completed),
      },
      {
        title: "Not Urgent & Not Important",
        description: "Eliminate it",
        color: "bg-gray-100 dark:bg-gray-900/20",
        tasks: tasks.filter((t) => t.priority === "low" && !t.completed),
      },
    ];
  }, [tasks]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-medium">Eisenhower Matrix</h3>
        <p className="text-sm text-muted-foreground">
          Prioritize tasks based on urgency and importance
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {quadrants.map((quadrant, index) => (
          <div
            key={index}
            className={`rounded-lg p-3 ${quadrant.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{quadrant.title}</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6"
                onClick={() => onAddTask(
                  index === 0 ? "critical" :
                  index === 1 ? "high" :
                  index === 2 ? "medium" : "low"
                )}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {quadrant.description}
            </p>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {quadrant.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-2">
                  No tasks
                </p>
              ) : (
                quadrant.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="text-xs p-2 bg-background rounded cursor-pointer hover:opacity-80"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="font-medium truncate">{task.name}</div>
                    {task.deadline && (
                      <div className="text-muted-foreground mt-1">
                        {new Date(task.deadline) < new Date() ? (
                          <span className="text-red-500">Overdue</span>
                        ) : (
                          <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {quadrant.tasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{quadrant.tasks.length - 5} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}