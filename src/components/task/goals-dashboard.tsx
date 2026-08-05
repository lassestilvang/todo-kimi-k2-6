"use client";

import { useState, useMemo } from "react";
import { Target, Award, BarChart3, Activity, ChevronRight, LayoutDashboard, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";
import { format } from "date-fns";

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
      {/* Tabs for switching views */}
      <Tabs defaultValue="cascade" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="cascade" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Goal Cascade
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals List
          </TabsTrigger>
        </TabsList>

        {/* Goal Cascade View */}
        <TabsContent value="cascade">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Goal Cascade</h2>
            <p className="text-muted-foreground mb-4">Hierarchical goal visualization with progress tracking</p>

            {goals.length > 0 ? (
              <div className="space-y-6">
                {/* Overall Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Progress</CardTitle>
                    <CardDescription>Your goals across all periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-2xl font-bold mb-2">{stats.avgProgress}%</p>
                      <p className="text-muted-foreground">
                        {stats.completed} of {stats.total} goals completed
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Goals List by Period */}
                {["daily", "weekly", "monthly", "yearly"].map((period) => {
                  const periodGoals = goals.filter(g => g.period === period);
                  if (periodGoals.length === 0) return null;

                  return (
                    <Card key={period}>
                      <CardHeader>
                        <CardTitle className="capitalize">{period} Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {periodGoals.map((goal) => {
                            const progress = goal.target_count > 0
                              ? Math.round((goal.current_count / goal.target_count) * 100)
                              : 0;
                            const isCompleted = goal.current_count >= goal.target_count;
                            const streakLevel = getStreakLevel(goal.streak_count);

                            return (
                              <div
                                key={goal.id}
                                className={cn(
                                  "border rounded-lg p-3 hover:shadow-sm transition-shadow",
                                  isCompleted && "border-green-200"
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">{goal.name}</h4>
                                    {goal.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {goal.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    variant={isCompleted ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {isCompleted ? "Done" : `${progress}%`}
                                  </Badge>
                                </div>

                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>{goal.current_count} / {goal.target_count} {goal.target_unit}</span>
                                    <span className={cn(
                                      streakLevel.color,
                                      "text-xs font-medium"
                                    )}>
                                      <Flame className="h-3 w-3 inline mr-1" />
                                      Streak: {goal.streak_count}
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                </div>

                                <div className="flex gap-1 mt-3">
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onResetGoal(goal.id)}
                                    className="h-7 px-2"
                                  >
                                    Reset
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No goals configured yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create goals in the goals view to see them here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Traditional Goals List View */}
        <TabsContent value="goals">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}