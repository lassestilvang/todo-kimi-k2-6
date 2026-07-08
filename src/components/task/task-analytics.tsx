"use client";

import { useMemo, useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, isAfter } from "date-fns";
import { BarChart3, TrendingUp, Clock, Target, PieChart, Activity, Award, Calendar, List, Tag, CheckSquare, Flame, Lightbulb, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, LineChart, Line } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types";

interface TaskAnalyticsProps {
  tasks: TaskWithRelations[];
  completedTasks?: TaskWithRelations[];
}

export function TaskAnalytics({ tasks, completedTasks }: TaskAnalyticsProps) {
  const { insights: aiInsights, isFetching: isFetchingInsights, refetch: refetchInsights } = useAIInsights(tasks, completedTasks || []);
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

  // Calculate productivity score (0-100)
  const productivityScore = useMemo(() => {
    const completionScore = completionRate;
    const priorityScore = 100 - (tasks.filter(t => t.priority === "critical" && !t.completed).length * 10);
    const timeScore = Math.min(totalTimeTracked / 3600, 1) * 100; // Normalize to 1 hour
    return Math.round((completionScore + Math.max(0, priorityScore) + timeScore) / 3);
  }, [completionRate, tasks, totalTimeTracked]);

  // List distribution
  const listDistribution = useMemo(() => {
    const byList = tasks.reduce((acc, t) => {
      const listId = t.list_id || 0;
      acc[listId] = (acc[listId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    return Object.entries(byList).map(([id, count]) => ({ id: Number(id), count }));
  }, [tasks]);

  // Label usage
  const labelUsage = useMemo(() => {
    const labelCounts = tasks.reduce((acc, t) => {
      t.labels?.forEach(l => {
        acc[l.name] = (acc[l.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(labelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tasks]);

  const COLORS = ["#dc2626", "#ea580c", "#ca8a04", "#2563eb"];

  // Calculate streak (consecutive days with completed tasks)
  const streak = useMemo(() => {
    const completedByDay: Record<string, number> = {};
    completedTasks?.forEach((task) => {
      if (task.completed_at) {
        const day = format(new Date(task.completed_at), "yyyy-MM-dd");
        completedByDay[day] = (completedByDay[day] || 0) + 1;
      }
    });

    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const day = format(subDays(today, i), "yyyy-MM-dd");
      if (completedByDay[day] > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [completedTasks]);

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
      <div className="grid gap-3 md:grid-cols-6 mb-4">
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
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{productivityScore}</div>
          <p className="text-xs text-muted-foreground">Productivity Score</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold flex items-center justify-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" />
            {streak}
          </div>
          <p className="text-xs text-muted-foreground">Day Streak</p>
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

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4 pt-4 border-t">
        {/* List Distribution */}
        {listDistribution.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <List className="h-3.5 w-3.5" />
              Tasks by List
            </h4>
            <div className="space-y-1">
              {listDistribution.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.id ? "List " + item.id : "Unassigned"}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Label Usage */}
        {labelUsage.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Popular Labels
            </h4>
            <div className="space-y-1">
              {labelUsage.map((item) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Upcoming Deadlines
          </h4>
          <div className="space-y-1">
            {tasks
              .filter(t => !t.completed && t.deadline)
              .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""))
              .slice(0, 3)
              .map((task) => (
                <div key={task.id} className="text-sm">
                  <span className="font-medium">{task.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {task.deadline && format(parseISO(task.deadline), "MMM d")}
                  </div>
                </div>
              ))}
            {!tasks.some(t => !t.completed && t.deadline) && (
              <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
            )}
          </div>
        </div>
      </div>

      {/* Focus Time Analysis */}
      <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t">
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Focus Time Analysis
          </h4>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Time</span>
                <div className="font-bold">{Math.round(totalTimeTracked / 60)}m</div>
              </div>
              <div>
                <span className="text-muted-foreground">Avg/Task</span>
                <div className="font-bold">
                  {tasks.length > 0 ? Math.round(totalTimeTracked / tasks.length / 60) : 0}m
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Best Day</span>
                <div className="font-bold">
                  {chartData.reduce((max, d) => d.count > max.count ? d : max, { date: "", count: 0 }).date || "N/A"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Focus Score</span>
                <div className="font-bold">{productivityScore}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Habit Streak */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            Habit Tracker
          </h4>
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-orange-500">{streak}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {streak > 0 ? `${streak} day${streak > 1 ? "s" : ""} streak!` : "Start your streak today"}
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i < streak ? "bg-orange-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Heatmap */}
      <div className="mt-4 pt-4 border-t">
        <ProductivityHeatmap tasks={tasks} completedTasks={completedTasks || []} />
      </div>

      {/* AI-Powered Insights */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            AI Insights
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchInsights && refetchInsights()}
            disabled={isFetchingInsights}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetchingInsights && "animate-spin")} />
          </Button>
        </div>
        <div className="space-y-2">
          {aiInsights.tips.map((tip, i) => (
            <div key={`tip-${i}`} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">{tip}</p>
            </div>
          ))}
          {aiInsights.suggestions.map((suggestion, i) => (
            <div key={`sug-${i}`} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">{suggestion}</p>
            </div>
          ))}
          {aiInsights.trends.map((trend, i) => (
            <div key={`trend-${i}`} className="p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">{trend}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI Insights hook
function useAIInsights(tasks: TaskWithRelations[], completedTasks: TaskWithRelations[]) {
  const [insights, setInsights] = useState<{
    tips: string[];
    suggestions: string[];
    trends: string[];
  }>({ tips: [], suggestions: [], trends: [] });
  const [isFetching, setIsFetching] = useState(false);

  const fetchInsights = async () => {
    setIsFetching(true);
    try {
      const result = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insights",
          input: {
            tasks: tasks.map(t => ({
              name: t.name,
              completed: t.completed,
              priority: t.priority,
              date: t.date,
              deadline: t.deadline,
            })),
          },
        }),
      });
      const data = await result.json();
      setInsights({
        tips: data.tips || [],
        suggestions: data.suggestions || [],
        trends: data.trends || [],
      });
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      fetchInsights();
    }
  }, [tasks.length]);

  return { insights, isFetching, refetch: fetchInsights };
}

// Productivity Heatmap Component
function ProductivityHeatmap({ tasks, completedTasks }: { tasks: TaskWithRelations[], completedTasks: TaskWithRelations[] }) {
  const heatmapData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, "yyyy-MM-dd");
    });

    const completionByDay: Record<string, number> = {};
    completedTasks.forEach(task => {
      if (task.completed_at) {
        const day = format(new Date(task.completed_at), "yyyy-MM-dd");
        completionByDay[day] = (completionByDay[day] || 0) + 1;
      }
    });

    return last30Days.map(date => ({
      date,
      count: completionByDay[date] || 0,
    }));
  }, [tasks, completedTasks]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    if (count === 1) return "bg-green-200";
    if (count <= 3) return "bg-green-400";
    return "bg-green-600";
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Productivity Heatmap (Last 30 Days)</h4>
      <div className="grid grid-cols-10 gap-1">
        {heatmapData.map((day) => (
          <div
            key={day.date}
            className={cn("h-6 rounded-sm", getColor(day.count))}
            title={`${day.date}: ${day.count} completed`}
          />
        ))}
      </div>
    </div>
  );
}