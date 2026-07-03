"use client";

import { useState, useMemo } from "react";
import { Target, Award, BarChart3, Activity, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";
import { format } from "date-fns";

interface GoalsDashboardProps {
  goals: Goal[];
  onUpdateProgress: (id: number, increment: number) => void;
  onResetGoal: (id: number) => void;
}

export function GoalsDashboard({ goals, onUpdateProgress, onResetGoal }: GoalsDashboardProps) {
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Calculate statistics
  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(g => g.current_count >= g.target_count).length;
    const active = total - completed;
    const totalProgress = goals.reduce((sum, g) => {
      const progress = g.target_count > 0 ? (g.current_count / g.target_count) * 100 : 0;
      return sum + progress;
    }, 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return { total, completed, active, avgProgress };
  }, [goals]);

  // Filter goals by period
  const filteredGoals = useMemo(() => {
    if (periodFilter === "all") return goals;
    return goals.filter(g => g.period === periodFilter);
  }, [goals, periodFilter]);

  // Get period-specific goals
  const periodGoals = useMemo(() => {
    const daily = goals.filter(g => g.period === "daily");
    const weekly = goals.filter(g => g.period === "weekly");
    const monthly = goals.filter(g => g.period === "monthly");
    const yearly = goals.filter(g => g.period === "yearly");

    return { daily, weekly, monthly, yearly };
  }, [goals]);

  const getPeriodColor = (period: string) => {
    switch (period) {
      case "daily": return "bg-blue-500";
      case "weekly": return "bg-purple-500";
      case "monthly": return "bg-green-500";
      case "yearly": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case "tasks": return "Tasks";
      case "hours": return "Hours";
      case "pomodoros": return "Pomodoros";
      case "minutes": return "Minutes";
      default: return unit;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Goals & Habits</h2>
          <p className="text-muted-foreground">Track your productivity goals and build streaks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as string)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Goals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.active}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Avg Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{periodGoals.daily.length}</p>
              <p className="text-sm text-muted-foreground">Daily</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-500">{periodGoals.weekly.length}</p>
              <p className="text-sm text-muted-foreground">Weekly</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{periodGoals.monthly.length}</p>
              <p className="text-sm text-muted-foreground">Monthly</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{periodGoals.yearly.length}</p>
              <p className="text-sm text-muted-foreground">Yearly</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        <h3 className="font-medium">Your Goals</h3>

        {filteredGoals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No goals found for this period.</p>
            <Button variant="link" className="mt-2 p-0">
              Create your first goal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const progress = goal.target_count > 0 ? Math.round((goal.current_count / goal.target_count) * 100) : 0;
              const isCompleted = goal.current_count >= goal.target_count;

              return (
                <Card key={goal.id} className={cn("transition-shadow hover:shadow-md", isCompleted && "border-green-200")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{goal.name}</h4>
                          <div className="flex items-center gap-1">
                            <div className={cn("w-2 h-2 rounded-full", getPeriodColor(goal.period))} />
                            <span className="text-xs capitalize text-muted-foreground">{goal.period}</span>
                          </div>
                          {isCompleted && (
                            <Badge variant="default" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{goal.current_count} / {goal.target_count} {getUnitLabel(goal.target_unit)}</span>
                          <span>Streak: {goal.streak_count} days</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateProgress(goal.id, -1)}
                          disabled={goal.current_count <= 0}
                          className="h-7 w-7 p-0"
                        >
                          -
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateProgress(goal.id, 1)}
                          disabled={goal.current_count >= goal.target_count}
                          className="h-7 w-7 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>{Math.round(progress)}% complete</span>
                        {goal.last_updated && (
                          <span>Updated: {format(new Date(goal.last_updated), "MMM d")}</span>
                        )}
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => onResetGoal(goal.id)}>
                        Reset
                      </Button>
                      <Button variant="ghost" size="sm">
                        View Details
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}