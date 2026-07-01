"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Flame, Calendar, TrendingUp, Award, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, subDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import type { Task, HabitStreak, HabitCompletion } from "@/types";

interface HabitTrackerProps {
  tasks: Task[];
  onTaskComplete?: (taskId: number) => void;
  className?: string;
}

interface HabitWithStreak extends Task {
  streak: HabitStreak | null;
  completions: HabitCompletion[];
}

// Calculate streak from completions
function calculateStreak(completions: HabitCompletion[], days: Date[]): number {
  let streak = 0;
  const completionMap = new Map(
    completions.map(c => [c.date, c])
  );

  // Start from the most recent day and count backwards
  for (let i = days.length - 1; i >= 0; i--) {
    const dateStr = format(days[i], "yyyy-MM-dd");
    if (completionMap.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Get streak level for badge styling
function getStreakLevel(streak: number): { level: string; color: string; nextThreshold: number } {
  if (streak >= 100) return { level: "Legendary", color: "bg-yellow-500", nextThreshold: 150 };
  if (streak >= 50) return { level: "Master", color: "bg-yellow-500", nextThreshold: 100 };
  if (streak >= 30) return { level: "Expert", color: "bg-orange-500", nextThreshold: 50 };
  if (streak >= 20) return { level: "Pro", color: "bg-red-500", nextThreshold: 30 };
  if (streak >= 10) return { level: "Strong", color: "bg-pink-500", nextThreshold: 20 };
  if (streak >= 5) return { level: "Building", color: "bg-purple-500", nextThreshold: 10 };
  if (streak >= 1) return { level: "Starter", color: "bg-blue-500", nextThreshold: 5 };
  return { level: "Beginner", color: "bg-gray-500", nextThreshold: 1 };
}

export function HabitTracker({ tasks, onTaskComplete, className }: HabitTrackerProps) {
  const [streaks, setStreaks] = useState<Record<number, HabitStreak>>({});
  const [completions, setCompletions] = useState<Record<number, HabitCompletion[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter tasks that are habits (recurring tasks)
  const habitTasks = useMemo(() => {
    return tasks.filter(t => t.recurring !== 'none' && !t.completed);
  }, [tasks]);

  // Fetch habit data
  const fetchHabitData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [streaksRes, completionsRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/habit-completions")
      ]);

      if (streaksRes.ok) {
        const streaksData = await streaksRes.json();
        const streaksMap: Record<number, HabitStreak> = {};
        streaksData.forEach((s: HabitStreak) => {
          streaksMap[s.task_id] = s;
        });
        setStreaks(streaksMap);
      }

      if (completionsRes.ok) {
        const completionsData = await completionsRes.json();
        const completionsMap: Record<number, HabitCompletion[]> = {};
        completionsData.forEach((c: HabitCompletion) => {
          if (!completionsMap[c.task_id]) {
            completionsMap[c.task_id] = [];
          }
          completionsMap[c.task_id].push(c);
        });
        setCompletions(completionsMap);
      }
    } catch (error) {
      console.error("Failed to fetch habit data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabitData();
  }, [fetchHabitData]);

  const habitsWithStreak = useMemo((): HabitWithStreak[] => {
    return habitTasks.map(task => {
      const streak = streaks[task.id] || null;
      const taskCompletions = completions[task.id] || [];
      return {
        ...task,
        streak,
        completions: taskCompletions,
      };
    });
  }, [habitTasks, streaks, completions]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalStreakDays = Object.values(streaks).reduce((sum, s) => sum + s.streak_count, 0);
    const longestStreak = Object.keys(streaks).length > 0
      ? Math.max(...Object.values(streaks).map(s => s.streak_count))
      : 0;
    const activeHabits = habitsWithStreak.length;
    const today = format(new Date(), "yyyy-MM-dd");
    const completedToday = habitsWithStreak.filter(h =>
      h.completions.some(c => c.date === today)
    ).length;

    return { totalStreakDays, longestStreak, activeHabits, completedToday };
  }, [streaks, habitsWithStreak]);

  const handleToggleCompletion = useCallback(async (taskId: number, date: string) => {
    try {
      const res = await fetch("/api/habit-completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, date }),
      });

      if (res.ok) {
        await fetchHabitData();
      }
    } catch (error) {
      console.error("Failed to toggle completion:", error);
    }
  }, [fetchHabitData]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const renderHabitCalendar = (habit: HabitWithStreak) => {
    const completionsMap = new Map(habit.completions.map(c => [c.date, true]));
    const today = new Date();

    return (
      <Card key={habit.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{habit.name}</CardTitle>
            <div className="flex items-center gap-2">
              {habit.streak && habit.streak.streak_count > 0 && (
                <>
                  <Badge
                    className={cn("text-white", getStreakLevel(habit.streak.streak_count).color)}
                  >
                    <Flame className="h-3 w-3 mr-1" />
                    {habit.streak.streak_count}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {getStreakLevel(habit.streak.streak_count).level}
                  </span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center py-1">{day}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Actual days */}
              {calendarDays.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isCompleted = completionsMap.get(dateStr);
                const isCurrentToday = isToday(day);

                return (
                  <button
                    key={dateStr}
                    className={cn(
                      "aspect-square rounded-md border flex items-center justify-center text-xs transition-colors relative group",
                      isCompleted
                        ? "bg-green-500 text-white border-green-500"
                        : isCurrentToday
                        ? "border-dashed border-muted-foreground"
                        : "border-muted hover:bg-muted/50"
                    )}
                    onClick={() => handleToggleCompletion(habit.id, dateStr)}
                    title={format(day, "MMM d, yyyy")}
                  >
                    {day.getDate()}
                    {isCurrentToday && !isCompleted && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-muted-foreground rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habitsWithStreak.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6 text-center">
          <Award className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">
            No recurring habits found. Start a recurring task to track your streak!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{summaryStats.totalStreakDays}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Streak Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{summaryStats.longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{summaryStats.activeHabits}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active Habits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{summaryStats.completedToday}</span>
            </div>
            <p className="text-xs text-muted-foreground">Done Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {habitsWithStreak.map(renderHabitCalendar)}
      </div>
    </div>
  );
}