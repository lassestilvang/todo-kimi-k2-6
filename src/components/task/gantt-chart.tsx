"use client";

import { useMemo } from "react";
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { BarChart3, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/types";

interface GanttChartProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  // Get date range for the chart
  const dateRange = useMemo(() => {
    const dates = tasks
      .filter((t) => t.date || t.deadline)
      .flatMap((t) => [
        t.date ? new Date(t.date) : null,
        t.deadline ? new Date(t.deadline) : null,
      ])
      .filter(Boolean) as Date[];

    if (dates.length === 0) {
      const today = new Date();
      return {
        start: startOfWeek(today),
        end: endOfWeek(addDays(today, 14)),
        days: eachDayOfInterval({
          start: startOfWeek(today),
          end: endOfWeek(addDays(today, 14)),
        }),
      };
    }

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Expand to include weekends
    const start = startOfWeek(minDate);
    const end = endOfWeek(maxDate);

    return {
      start,
      end,
      days: eachDayOfInterval({ start, end }),
    };
  }, [tasks]);

  // Prepare task data for Gantt chart
  const ganttTasks = useMemo(() => {
    return tasks
      .filter((t) => t.date && !t.completed)
      .map((task) => {
        const startDate = parseISO(task.date!);
        const endDate = task.deadline ? parseISO(task.deadline!) : startDate;
        const duration = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate position as percentage
        const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
        const startOffset = ((startDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
        const width = ((duration + 1) / totalDays) * 100;

        return {
          ...task,
          startDate,
          endDate,
          duration: Math.max(duration, 1),
          startOffset,
          width,
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [dateRange, tasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-medium">Gantt Chart</h3>
        <p className="text-sm text-muted-foreground">
          Project timeline view - drag to scroll horizontally
        </p>
      </div>

      <div className="space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Low</span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] space-y-2">
            {/* Header with dates */}
            <div className="flex items-center">
              <div className="w-48 text-xs text-muted-foreground">Task</div>
              <div className="flex-1 flex items-center justify-between text-xs text-muted-foreground">
                {dateRange.days.map((day, index) => (
                  <div
                    key={index}
                    className="text-center"
                    style={{ width: `${100 / dateRange.days.length}%` }}
                  >
                    <div className="font-medium">{format(day, "d")}</div>
                    <div className="opacity-60">{format(day, "EEE")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {ganttTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No tasks with dates to display</p>
                </div>
              ) : (
                ganttTasks.map((task) => (
                  <div key={task.id} className="flex items-center">
                    <div className="w-48 text-sm font-medium truncate pr-2">
                      {task.name}
                    </div>
                    <div className="flex-1 relative h-6">
                      <div
                        className={`h-6 rounded ${getPriorityColor(task.priority)} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                        style={{
                          marginLeft: `${task.startOffset}%`,
                          width: `${task.width}%`,
                          minWidth: "40px",
                        }}
                        onClick={() => onTaskClick(task)}
                        title={task.name}
                      >
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <Badge variant="secondary" className="text-[10px] px-1">
                            {task.duration}d
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}