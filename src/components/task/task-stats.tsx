"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, TrendingUp, Calendar, AlertCircle, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TaskWithRelations, List } from "@/types";

interface TaskStatsProps {
  tasks: TaskWithRelations[];
  lists: List[];
  isLoading?: boolean;
  completedTasks?: TaskWithRelations[];
}

export function TaskStats({ tasks, lists, completedTasks }: TaskStatsProps) {
  const stats = useMemo(() => {
    const total = tasks.length + (completedTasks?.length || 0);
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks by priority (pending only)
    const criticalPriority = tasks.filter((t) => t.priority === "critical" && !t.completed).length;
    const highPriority = tasks.filter((t) => t.priority === "high" && !t.completed).length;
    const mediumPriority = tasks.filter((t) => t.priority === "medium" && !t.completed).length;
    const lowPriority = tasks.filter((t) => t.priority === "low" && !t.completed).length;

    // Tasks by list (pending)
    const tasksByList = lists.map((list) => ({
      ...list,
      count: tasks.filter((t) => t.list_id === list.id && !t.completed).length,
    }));

    // Overdue tasks
    const overdue = tasks.filter(
      (t) => !t.completed && t.date && new Date(t.date) < new Date() && new Date(t.date) < new Date(new Date().setHours(23, 59, 59, 999))
    ).length;

    // Due today
    const today = new Date().toISOString().split("T")[0];
    const dueToday = tasks.filter((t) => !t.completed && t.date === today).length;

    // Time tracking stats
    const totalTimeTracked = tasks.reduce((sum, t) => {
      if (!t.time_entries) return sum;
      return sum + t.time_entries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
    }, 0);

    // Average time per completed task
    const avgTimePerTask = completed > 0 ? Math.round(totalTimeTracked / completed / 60) : 0;

    // Week-over-week completion change
    const thisWeek = new Date();
    thisWeek.setHours(0, 0, 0, 0);
    const lastWeek = new Date(thisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = completedTasks?.filter(t => {
      if (!t.completed_at) return false;
      const d = new Date(t.completed_at);
      return d >= lastWeek && d < thisWeek;
    }).length || 0;

    return {
      total,
      completed,
      pending,
      completionRate,
      criticalPriority,
      highPriority,
      mediumPriority,
      lowPriority,
      tasksByList,
      overdue,
      dueToday,
      totalTimeTracked,
      avgTimePerTask,
      completedThisWeek,
    };
  }, [tasks, lists, completedTasks]);

  // "On this day" - tasks completed on this date in previous years
  const onThisDayTasks = useMemo(() => {
    if (!completedTasks) return [];
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();

    return completedTasks.filter((task) => {
      if (!task.completed_at) return false;
      const completedDate = new Date(task.completed_at);
      return completedDate.getMonth() === month && completedDate.getDate() === day;
    });
  }, [completedTasks]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="border-b px-6 py-3 bg-muted/30">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-8">
        {/* Completion Rate */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Completion Rate</CardTitle>
            <Target className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold">{stats.completionRate}%</div>
            <Progress className="mt-1 h-1.5" value={stats.completionRate} />
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold">{stats.pending}</div>
            <p className="text-[10px] text-muted-foreground">
              {stats.overdue > 0 && `${stats.overdue} overdue • `}
              {stats.dueToday > 0 && `${stats.dueToday} due today`}
            </p>
          </CardContent>
        </Card>

        {/* Critical Priority */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Critical</CardTitle>
            <AlertCircle className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold text-red-600">{stats.criticalPriority}</div>
          </CardContent>
        </Card>

        {/* High Priority */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">High</CardTitle>
            <AlertCircle className="h-3 w-3 text-red-500" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold text-red-500">{stats.highPriority}</div>
          </CardContent>
        </Card>

        {/* Due Today */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Due Today</CardTitle>
            <Calendar className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold">{stats.dueToday}</div>
          </CardContent>
        </Card>

        {/* Time Tracking */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Time Tracked</CardTitle>
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold">{Math.round(stats.totalTimeTracked / 60)}m</div>
            <p className="text-[10px] text-muted-foreground">
              {stats.avgTimePerTask > 0 ? `${stats.avgTimePerTask}m avg/task` : 'no time tracked'}
            </p>
          </CardContent>
        </Card>

        {/* Completed This Week */}
        <Card className="border-0 shadow-none bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">This Week</CardTitle>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-1">
            <div className="text-lg font-bold">{stats.completedThisWeek}</div>
            <p className="text-[10px] text-muted-foreground">completed</p>
          </CardContent>
        </Card>
      </div>

      {/* On this day - historical completions */}
      {onThisDayTasks.length > 0 && (
        <div className="px-6 py-3 bg-muted/20 border-t mt-3 rounded-b-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            On this day in history
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {onThisDayTasks.map((task) => (
              <span
                key={task.id}
                className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap"
                title={task.name}
              >
                {task.name.length > 20 ? task.name.substring(0, 20) + "..." : task.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}