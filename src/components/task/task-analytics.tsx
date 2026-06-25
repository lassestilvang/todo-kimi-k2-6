"use client";

import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { BarChart3, TrendingUp, Clock, Target, PieChart, Activity, Award, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TaskWithRelations } from "@/types";

interface TaskAnalyticsProps {
  tasks: TaskWithRelations[];
  completedTasks?: TaskWithRelations[];
}

export function TaskAnalytics({ tasks, completedTasks }: TaskAnalyticsProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      return {
        date: format(date, "EEE"),
        fullDate: format(date, "MMM d"),
        count: 0,
      };
    });

    // Count completions per day
    completedTasks?.forEach((task) => {
      if (!task.completed_at) return;
      const completedDate = new Date(task.completed_at);
      const dayIndex = last7Days.findIndex((d) => d.fullDate === format(completedDate, "MMM d"));
      if (dayIndex >= 0 && dayIndex < last7Days.length) {
        last7Days[dayIndex].count++;
      }
    });

    return last7Days;
  }, [completedTasks]);

  const priorityData = useMemo(() => {
    return [
      { name: "Critical", value: tasks.filter(t => t.priority === "critical" && !t.completed).length, color: "#dc2626" },
      { name: "High", value: tasks.filter(t => t.priority === "high" && !t.completed).length, color: "#ea580c" },
      { name: "Medium", value: tasks.filter(t => t.priority === "medium" && !t.completed).length, color: "#ca8a04" },
      { name: "Low", value: tasks.filter(t => t.priority === "low" && !t.completed).length, color: "#2563eb" },
    ];
  }, [tasks]);

  const totalTimeTracked = tasks.reduce((sum, t) => {
    if (!t.time_entries) return sum;
    return sum + t.time_entries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  }, 0);

  const totalTasks = tasks.length + (completedTasks?.length ?? 0);
  const completionRate = totalTasks > 0 ? ((completedTasks?.length ?? 0) / totalTasks) * 100 : 0;

  const COLORS = ["#dc2626", "#ea580c", "#ca8a04", "#2563eb"];

  // Weekly trend with completion rate
  const weeklyTrendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const week = subDays(now, 5 - i);
      const weekStart = startOfDay(week);
      const weekEnd = endOfDay(week);

      const weekTasks = tasks.filter(t => {
        const taskDate = t.date ? new Date(t.date) : null;
        return taskDate && isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
      });

      const completed = weekTasks.filter(t => t.completed).length;

      return {
        name: format(week, "MMM d"),
        completed: completed,
        total: weekTasks.length,
        rate: weekTasks.length > 0 ? Math.round((completed / weekTasks.length) * 100) : 0,
      };
    });
  }, [tasks]);

  // Productivity tips based on data
  const productivityTips = useMemo(() => {
    const tips: string[] = [];

    if (completionRate < 50) {
      tips.push("Focus on completing high-priority tasks first to improve your completion rate.");
    }

    const criticalCount = tasks.filter(t => t.priority === "critical" && !t.completed).length;
    if (criticalCount > 3) {
      tips.push(`You have ${criticalCount} critical tasks pending. Consider breaking them into smaller steps.`);
    }

    if (totalTimeTracked < 3600 && tasks.length > 10) {
      tips.push("Start tracking time on your tasks to improve productivity awareness.");
    }

    return tips;
  }, [completionRate, tasks, totalTimeTracked]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4" />
          Task Analytics
        </h3>
        <Badge variant="secondary">
          {Math.round(completionRate)}% completion
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{tasks.length}</div>
          <p className="text-xs text-muted-foreground">Active Tasks</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{completedTasks?.length ?? 0}</div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{Math.round(totalTimeTracked / 60)}m</div>
          <p className="text-xs text-muted-foreground">Time Tracked</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{tasks.filter(t => !t.completed && t.deadline).length}</div>
          <p className="text-xs text-muted-foreground">With Deadlines</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Completion Trend */}
        <div className="space-y-2 col-span-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Completion Trend (7d)
          </h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickSize={8} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Priority Distribution
          </h4>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Time Tracking */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Time Tracking
          </h4>
          <div className="bg-muted/30 rounded-lg p-4 text-center h-[150px] flex flex-col justify-center">
            <div className="text-3xl font-bold">
              {Math.round(totalTimeTracked / 60)}<span className="text-sm font-normal">m</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total time tracked</p>
          </div>
        </div>

        {/* Weekly Trend Line Chart */}
        <div className="space-y-2 col-span-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Weekly Completion Rate
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Productivity Tips */}
      {productivityTips.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Productivity Tips
          </h4>
          <div className="space-y-2">
            {productivityTips.map((tip, i) => (
              <div key={i} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Rate Progress */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-medium">Overall Completion</span>
          </div>
          <span className="text-2xl font-bold">{Math.round(completionRate)}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}