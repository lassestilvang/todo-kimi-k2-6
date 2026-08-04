"use client";

import { useMemo } from "react";
import {
  Calendar,
  Target,
  Flame,
  Award,
  UserCheck,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, BarChart as ReBarChart, Bar, CartesianGrid, AreaChart, Area } from "recharts";
import { format, subDays, startOfWeek, subWeeks, parseISO, getWeek } from "date-fns";
import type { TaskWithRelations } from "@/types";

interface ProductivityDashboardEnhancedProps {
  tasks: TaskWithRelations[];
  goals?: Array<{
    id: number;
    name: string;
    current_count: number;
    target_count: number;
    period: string;
  }>;
  teamVelocity?: number;
}

export function ProductivityDashboardEnhanced({ tasks, goals, teamVelocity }: ProductivityDashboardEnhancedProps) {
  // Enhanced streak calculation with heatmap data
  const streakData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 60 }, (_, i) => {
      const date = subDays(today, 59 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTasks = tasks.filter(
        (t) => t.completed && t.completed_at && format(parseISO(t.completed_at), "yyyy-MM-dd") === dateStr
      );
      return {
        date: dateStr,
        displayDate: format(date, "MMM d"),
        count: dayTasks.length,
        completed: dayTasks.length > 0,
        week: getWeek(date),
        year: date.getFullYear(),
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

    // Calculate longest streak
    let longestStreak = 0;
    let currentStreakCount = 0;
    for (const day of days) {
      if (day.completed) {
        currentStreakCount++;
        longestStreak = Math.max(longestStreak, currentStreakCount);
      } else {
        currentStreakCount = 0;
      }
    }

    return { days, currentStreak, longestStreak };
  }, [tasks]);

  // Completion rate trend over time
  const completionTrend = useMemo(() => {
    const lastMonth = tasks.filter(
      (t) => t.completed && t.completed_at && new Date(t.completed_at) >= subWeeks(new Date(), 4)
    );

    const weekData = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = subWeeks(new Date(), i);
      const weekEnd = subWeeks(weekStart, -1);
      const weekCompleted = tasks.filter(
        (t) => t.completed && t.completed_at && new Date(t.completed_at) >= weekStart && new Date(t.completed_at) <= weekEnd
      ).length;
      const weekTotal = tasks.filter(
        (t) => t.completed_at && new Date(t.completed_at) >= weekStart && new Date(t.completed_at) <= weekEnd
      ).length;

      weekData.push({
        week: format(weekStart, "MMM d"),
        completed: weekCompleted,
        total: weekTotal,
        rate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
      });
    }

    return weekData;
  }, [tasks]);

  // Priority distribution with visual chart data
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

  // Goal progress tracking
  const activeGoals = goals || [];
  const goalProgress = useMemo(() => {
    return activeGoals.map(goal => ({
      ...goal,
      progress: goal.target_count > 0 ? Math.round((goal.current_count / goal.target_count) * 100) : 0,
      remaining: Math.max(0, goal.target_count - goal.current_count),
      isCompleted: goal.current_count >= goal.target_count,
    }));
  }, [activeGoals]);

  // Weekly goal
  const weeklyGoal = 25;
  const completedThisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    return tasks.filter(
      (t) => t.completed && t.completed_at && new Date(t.completed_at) >= weekStart
    ).length;
  }, [tasks]);

  const globalGoalProgress = Math.min((completedThisWeek / weeklyGoal) * 100, 100);

  // Heatmap for daily activity
  const heatmapData = useMemo(() => {
    const heatmap: Record<string, number> = {};
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = format(subDays(today, i), "yyyy-MM-dd");
      const count = tasks.filter(
        (t) => t.completed && t.completed_at && t.completed_at.startsWith(date)
      ).length;
      heatmap[date] = count;
    }

    return heatmap;
  }, [tasks]);

  // Completion rate by day of week
  const dayOfWeekStats = useMemo(() => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayStats = dayNames.map((day, index) => {
      const dayTasks = tasks.filter(t => t.completed && t.completed_at);
      const dayCompletions = dayTasks.filter(t => {
        const taskDate = new Date(t.completed_at!);
        return taskDate.getDay() === (index + 1) || (index === 0 && taskDate.getDay() === 1);
      });
      return { day, count: dayCompletions.length };
    });

    return dayStats;
  }, [tasks]);

  // Productivity insights
  const insights = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total > 0 ? (completed / total) * 100 : 0;

    const insights = [];

    // Completion insight
    if (rate < 30) {
      insights.push("Your completion rate is below 30%. Try breaking large tasks into smaller steps.");
    } else if (rate < 60) {
      insights.push("Keep going! With consistent effort, you can reach 80% completion.");
    } else if (rate >= 80) {
      insights.push("Excellent! Your completion rate is outstanding.");
    }

    // Overdue insight
    const now = new Date();
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && !t.completed);
    if (overdue.length > 0) {
      insights.push(`${overdue.length} task(s) are overdue. Focus on these first.`);
    }

    // Pattern insight
    const highPriUncompleted = tasks.filter(t => t.priority === "high" && !t.completed);
    if (highPriUncompleted.length > 3) {
      insights.push(`You have ${highPriUncompleted.length} high-priority tasks pending. Consider re-prioritizing.`);
    }

    return insights;
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header Stats with Enhanced Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Completion Rate" value={`${Math.round((tasks.filter((t) => t.completed).length / Math.max(tasks.length, 1)) * 100)}%`} icon={CheckCircle2} />
        <StatCard title="Current Streak" value={streakData.currentStreak.toString()} icon={Flame} />
        <StatCard title="Longest Streak" value={streakData.longestStreak.toString()} icon="star" iconComponent={() => <Award className="h-4 w-4" />} />
        <StatCard title="Total Tasks" value={tasks.length.toString()} icon={Target} />
        <StatCard title="Completed" value={tasks.filter((t) => t.completed).length.toString()} icon={CheckCircle2} />
        <StatCard title="Overdue" value={tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !t.completed).length.toString()} icon={AlertCircle} />
      </div>

      {/* Weekly Goal Progress */}
      {goalProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goalProgress.map(goal => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{goal.name}</span>
                      {goal.isCompleted && <Badge className="ml-2" variant="default">Done</Badge>}
                    </div>
                    <span>{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Weekly Goal Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{completedThisWeek} of {weeklyGoal} tasks</span>
              <span>{Math.round(globalGoalProgress)}%</span>
            </div>
            <Progress value={globalGoalProgress} className="h-2" />
            {teamVelocity && (
              <p className="text-xs text-muted-foreground mt-2">
                Team velocity: {teamVelocity} tasks/sprint
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Streak Calendar with Heatmap Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            30-Day Productivity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {streakData.days.map((day, i) => {
              const heatLevel = day.count;
              let bgColor = "bg-gray-100";
              if (heatLevel >= 5) bgColor = "bg-green-500";
              else if (heatLevel >= 3) bgColor = "bg-green-300";
              else if (heatLevel >= 1) bgColor = "bg-green-100";

              return (
                <div
                  key={i}
                  className={`${bgColor} h-8 rounded-sm flex items-center justify-center text-xs font-medium`}
                  title={`${format(new Date(day.date), "MMM d")}: ${day.count} task(s) completed`}
                >
                  {format(new Date(day.date), "d")}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded" title="0"></div>
              <div className="w-3 h-3 bg-green-100 rounded" title="1-2"></div>
              <div className="w-3 h-3 bg-green-300 rounded" title="3-4"></div>
              <div className="w-3 h-3 bg-green-500 rounded" title="5+"></div>
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekly Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <ReTooltip formatter={(value: number) => [`${value}%`, "Rate"]} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <ReBarChart data={priorityDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ReTooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Day of Week Productivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Productivity by Day of Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center">
            {dayOfWeekStats.map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-xs text-muted-foreground">{stat.day}</div>
                <div className="h-8 w-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Productivity Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm p-3 bg-muted/30 rounded-lg">
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <AchievementBadge
              title="First Task"
              achieved={tasks.length >= 1}
              icon="✓"
            />
            <AchievementBadge
              title="7-Day Streak"
              achieved={streakData.currentStreak >= 7}
              icon="🔥"
            />
            <AchievementBadge
              title="10 Tasks/Week"
              achieved={completedThisWeek >= 10}
              icon="🎯"
            />
            <AchievementBadge
              title="90% Completion"
              achieved={tasks.length > 0 && (tasks.filter((t) => t.completed).length / tasks.length) >= 0.9}
              icon="🏆"
            />
            <AchievementBadge
              title="No Overdue Tasks"
              achieved={tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !t.completed).length === 0}
              icon="⏱️"
            />
            <AchievementBadge
              title="Team Player"
              achieved={tasks.filter((t) => t.assignee_id && !t.completed).length > 0}
              icon="👥"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconComponent?: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, icon: Icon, iconComponent }: StatCardProps) {
  const renderIcon = () => {
    if (Icon) return <Icon className="h-4 w-4" />;
    if (iconComponent) return <iconComponent className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            {renderIcon()}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Achievement Badge Component
interface AchievementBadgeProps {
  title: string;
  achieved: boolean;
  icon: string;
}

function AchievementBadge({ title, achieved, icon }: AchievementBadgeProps) {
  return (
    <div
      className={`p-3 rounded-lg border text-center transition-all ${
        achieved
          ? "border-primary bg-primary/10"
          : "border-muted bg-muted/30 opacity-50"
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-medium">{title}</div>
    </div>
  );
}

// Day of Week Stats helper
const dayOfWeekStats = [
  { day: "Mon", count: 0 },
  { day: "Tue", count: 0 },
  { day: "Wed", count: 0 },
  { day: "Thu", count: 0 },
  { day: "Fri", count: 0 },
  { day: "Sat", count: 0 },
  { day: "Sun", count: 0 },
];