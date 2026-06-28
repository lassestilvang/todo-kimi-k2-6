"use client";

import { useMemo } from "react";
import { BarChart3, Clock, TrendingUp, CalendarDays, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { TaskWithRelations, TimeEntry } from "@/types";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface TimeReportProps {
  tasks: TaskWithRelations[];
  timeEntries: TimeEntry[];
  period?: "week" | "month" | "all";
}

export function TimeReport({ tasks, timeEntries, period = "week" }: TimeReportProps) {
  const filteredEntries = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      return timeEntries.filter(
        (e) => new Date(e.start_time) >= start && new Date(e.start_time) <= end
      );
    }
    if (period === "month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return timeEntries.filter(
        (e) => new Date(e.start_time) >= start && new Date(e.start_time) <= end
      );
    }
    return timeEntries;
  }, [timeEntries, period]);

  // Aggregate time by task
  const timeByTask = useMemo(() => {
    const taskMap = new Map<number, { name: string; totalSeconds: number }>();

    filteredEntries.forEach((entry) => {
      const task = tasks.find((t) => t.id === entry.task_id);
      if (task) {
        const existing = taskMap.get(entry.task_id) || { name: task.name, totalSeconds: 0 };
        existing.totalSeconds += entry.duration_seconds || 0;
        taskMap.set(entry.task_id, existing);
      }
    });

    return Array.from(taskMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      value: Math.round(data.totalSeconds / 60),
    }));
  }, [filteredEntries, tasks]);

  // Aggregate time by priority
  const timeByPriority = useMemo(() => {
    const priorityMap = new Map<string, number>();

    filteredEntries.forEach((entry) => {
      const task = tasks.find((t) => t.id === entry.task_id);
      if (task) {
        priorityMap.set(task.priority, (priorityMap.get(task.priority) || 0) + (entry.duration_seconds || 0));
      }
    });

    return Array.from(priorityMap.entries()).map(([priority, seconds]) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: Math.round(seconds / 60),
      color: {
        critical: "#ef4444",
        high: "#f97316",
        medium: "#eab308",
        low: "#3b82f6",
        none: "#6b7280",
      }[priority] || "#6b7280",
    }));
  }, [filteredEntries, tasks]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration_seconds || 0) / 60, 0);
    const totalEntries = filteredEntries.length;
    const uniqueTasks = new Set(filteredEntries.map((e) => e.task_id)).size;

    return {
      totalMinutes: Math.round(totalMinutes),
      totalEntries,
      uniqueTasks,
    };
  }, [filteredEntries]);

  const periodLabels = {
    week: "This Week",
    month: "This Month",
    all: "All Time",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Total Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.totalMinutes}m</p>
            <p className="text-xs text-muted-foreground">
              {totals.totalEntries} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.uniqueTasks}</p>
            <p className="text-xs text-muted-foreground">unique tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{periodLabels[period]}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "MMM d")} - {format(new Date(), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time by Task Chart */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Time by Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeByTask.slice(0, 5)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip formatter={(value) => `${value}m`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Time by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={timeByPriority}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={0}
                  endAngle={180}
                  startAngle={0}
                >
                  {timeByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}m`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Tasks List */}
      {timeByTask.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Tasks by Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeByTask.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{task.name}</span>
                  <span className="font-medium">{task.value}m</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}