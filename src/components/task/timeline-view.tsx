"use client";

import { useMemo } from "react";
import { ChevronRight, Clock, Calendar, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { TaskWithRelations } from "@/types";

interface TimelineViewProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

interface TimelineTask {
  id: number;
  name: string;
  start: Date;
  end: Date;
  duration: number;
  priority: string;
  hasDependencies: boolean;
  blockers: number;
  blockedBy: number;
}

export function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  const timelineTasks = useMemo(() => {
    const datedTasks = tasks.filter((t) => t.date || t.deadline);

    return datedTasks.map((task) => {
      const start = task.date ? parseISO(task.date) : new Date();
      const end = task.deadline ? parseISO(task.deadline) : start;
      const duration = Math.max(1, Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      ));

      return {
        id: task.id,
        name: task.name,
        start,
        end,
        duration,
        priority: task.priority,
        hasDependencies: (task.blockers?.length || 0) > 0 || (task.blocked_by?.length || 0) > 0,
        blockers: task.blockers?.length || 0,
        blockedBy: task.blocked_by?.length || 0,
      };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tasks]);

  const dateRange = useMemo(() => {
    if (timelineTasks.length === 0) {
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

    const dates = timelineTasks.flatMap((t) => [t.start, t.end]);
    const minDate = startOfWeek(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const maxDate = endOfWeek(new Date(Math.max(...dates.map((d) => d.getTime()))));

    return {
      start: minDate,
      end: maxDate,
      days: eachDayOfInterval({ start: minDate, end: maxDate }),
    };
  }, [timelineTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
      case "high": return "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20";
      case "medium": return "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20";
      case "low": return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
      default: return "border-l-gray-500 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getDependencyIcon = (task: TimelineTask) => {
    if (task.blockers > 0) return "depends-on";
    if (task.blockedBy > 0) return "blocking";
    return null;
  };

  const timelinePosition = (date: Date) => {
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return ((date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays;
  };

  const timelineWidth = (task: TimelineTask) => {
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return (task.duration / totalDays) * 100;
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-medium">Timeline View</h3>
        <p className="text-sm text-muted-foreground">
          Visual timeline showing task dates and dependencies
        </p>
      </div>

      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 rotate-45 text-purple-500" />
            <span>Has Dependencies</span>
          </div>
        </div>

        {/* Timeline Header */}
        <div className="border-b pb-2">
          <div className="flex items-center text-xs text-muted-foreground mb-2">
            <span className="w-48">Task</span>
            <div className="flex-1 flex justify-between">
              {dateRange.days.slice(0, 7).map((day, i) => (
                <span key={i} className="text-center">
                  {format(day, "EEE\nMM/dd")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Tasks */}
        <div className="space-y-2">
          {timelineTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No tasks with dates to display</p>
            </div>
          ) : (
            timelineTasks.map((task) => {
              const left = timelinePosition(task.start) * 100;
              const width = timelineWidth(task);
              const depType = getDependencyIcon(task);

              return (
                <div key={task.id} className="flex items-start gap-3">
                  <div className="w-48 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{task.name}</span>
                      {depType && (
                        <Badge variant="outline" className="text-xs">
                          {depType === "depends-on" ? "⤵" : "⤴"}
                        </Badge>
                      )}
                    </div>
                    {task.blockers > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Blocked by {task.blockers} task(s)
                      </span>
                    )}
                  </div>

                  <div className="flex-1 relative">
                    {/* Timeline track */}
                    <div className="h-6 rounded overflow-hidden border-l-2 transition-all hover:shadow-md cursor-pointer"
                      style={{
                        borderLeftColor: task.priority === "critical" ? "#ef4444" :
                          task.priority === "high" ? "#f97316" :
                          task.priority === "medium" ? "#eab308" :
                          task.priority === "low" ? "#3b82f6" : "#9ca3af",
                      }}
                      onClick={() => onTaskClick({
                        ...tasks.find(t => t.id === task.id)!,
                        id: task.id,
                        name: task.name,
                        description: tasks.find(t => t.id === task.id)?.description,
                        list_id: tasks.find(t => t.id === task.id)?.list_id,
                        date: task.start.toISOString().split("T")[0],
                        deadline: task.end.toISOString().split("T")[0],
                        priority: task.priority as any,
                        recurring: "none",
                        completed: false,
                        created_at: "",
                        updated_at: "",
                        sort_order: 0,
                        archived: false,
                        labels: [],
                        subtasks: [],
                        reminders: [],
                        logs: [],
                        comments: [],
                        attachments: [],
                        blockers: [],
                        blocked_by: [],
                        time_entries: [],
                        recurring_exceptions: [],
                      })}
                    >
                      <div
                        className="h-full bg-card border-r border-border/50 relative"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 2)}%`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        <div className="absolute top-0.5 right-1 text-xs text-muted-foreground">
                          {task.duration}d
                        </div>
                      </div>
                      <div
                        className="absolute top-0.5 right-1 text-xs text-muted-foreground bg-background/80 px-1 rounded"
                        style={{ left: `${left + width - 20}px` }}
                      >
                        <span className="hidden sm:inline">
                          {format(task.start, "MMM d")} - {format(task.end, "MMM d")}
                        </span>
                        <span className="sm:hidden">
                          {format(task.start, "MM/dd")} - {format(task.end, "MM/dd")}
                        </span>
                      </div>
                    </div>

                    {/* Dependency arrows */}
                    {(task.blockers > 0 || task.blockedBy > 0) && (
                      <div className="absolute -top-2 -right-2 bg-primary text-xs text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                        {task.blockers > 0 ? "↓" : "↑"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>{timelineTasks.length} tasks on timeline</span>
              <span>Critical: {timelineTasks.filter(t => t.priority === "critical").length}</span>
              <span>With dependencies: {timelineTasks.filter(t => t.hasDependencies).length}</span>
            </div>
            <div>
              Duration:{" "}
              <Badge variant="secondary">
                {Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}