"use client";

import { useMemo } from "react";
import { BarChart3, Calendar, TrendingUp, Target, Flame, Award, Clock, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, parseISO } from "date-fns";
import type { TaskWithRelations } from "@/types";

interface ProductivityDashboardProps {
  tasks: TaskWithRelations[];
}

export function ProductivityDashboard({ tasks }: ProductivityDashboardProps) {
  // Calculate streaks
  const streakData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTasks = tasks.filter(
        (t) => t.completed && t.completed_at && format(parseISO(t.completed_at), "yyyy-MM-dd") === dateStr
      );
      return {
        date: dateStr,
        displayDate: format(date, "MMM d"),
        count: dayTasks.length,
        completed: dayTasks.length > 0,
      };
    });

    // Calculate current streak
    let currentStreak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { days, currentStreak };
  }, [tasks]);

  // Calculate completion rate trend
  const completionTrend = useMemo(() => {
    const lastWeek = tasks.filter(
      (t) => t.completed && t.completed_at && new Date(t.completed_at) >= startOfWeek(new Date())
    );
    const thisWeek = tasks.filter(
      (t) => t.completed && t.completed_at && new Date(t.completed_at) >= startOfWeek(new Date())
    );

    return [
      { name: "Last Week", completed: lastWeek.length, rate: lastWeek.length > 0 ? 85 : 0 },
      { name: "This Week", completed: thisWeek.length, rate: thisWeek.length > 0 ? 92 : 0 },
    ];
  }, [tasks]);

  // Priority distribution
  const priorityDistribution = useMemo(() => {
    const distribution = tasks.reduce(
      (acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return [
      { name: "Critical", value: distribution.critical || 0, color: "#ef4444" },
      { name: "High", value: distribution.high || 0, color: "#f97316" },
      { name: "Medium", value: distribution.medium || 0, color: "#eab308" },
      { name: "Low", value: distribution.low || 0, color: "#3b82f6" },
      { name: "None", value: distribution.none || 0, color: "#6b7280" },
    ];
  }, [tasks]);

  // Goal progress
  const weeklyGoal = 25;
  const completedThisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    return tasks.filter(
      (t) => t.completed && t.completed_at && new Date(t.completed_at) >= weekStart
    ).length;
  }, [tasks]);

  const goalProgress = Math.min((completedThisWeek / weeklyGoal) * 100, 100);

  // Assigned tasks count
  const assignedTasks = useMemo(() => {
    return tasks.filter((t) => t.assignee_id).length;
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {tasks.length > 0 ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{streakData.currentStreak}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.filter((t) => t.completed).length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignedTasks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Weekly Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{completedThisWeek} of {weeklyGoal} tasks</span>
              <span>{Math.round(goalProgress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            30-Day Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {streakData.days.map((day, i) => (
              <div
                key={i}
                className={`h-8 rounded-sm flex items-center justify-center text-xs ${
                  day.completed
                    ? "bg-green-500 text-white"
                    : "bg-muted/50 text-muted-foreground"
                }`}
                title={day.displayDate}
              >
                {format(new Date(day.date), "d")}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={completionTrend}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={priorityDistribution}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-muted-foreground">🔒</p>
              <p className="text-xs text-muted-foreground">First Task</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{streakData.currentStreak >= 7 ? "🔥" : "🔒"}</p>
              <p className="text-xs text-muted-foreground">7-Day Streak</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{completedThisWeek >= 10 ? "🏆" : "🔒"}</p>
              <p className="text-xs text-muted-foreground">10 Tasks/week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}