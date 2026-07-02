"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, BarChart3, PieChart, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  calculateWorkloads,
  categorizeWorkload,
  calculateBalanceScore,
  type UserWorkload,
  type WorkloadSuggestion,
} from "@/lib/ai/workload";
import type { Task, User } from "@/types";

interface WorkloadDashboardProps {
  tasks: Task[];
  users: User[];
  suggestions?: WorkloadSuggestion[];
  className?: string;
}

interface ExtendedUserWorkload extends UserWorkload {
  balanceScore: number;
  completionRate: number;
}

// Simple bar chart component for workload visualization
function WorkloadBarChart({ data }: { data: { name: string; score: number; average: number }[] }) {
  const maxScore = Math.max(...data.map(d => Math.max(d.score, d.average)), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{item.name}</span>
            <span className="text-muted-foreground">{item.score.toFixed(1)}</span>
          </div>
          <div className="relative h-6 w-full rounded bg-muted">
            <div
              className="absolute top-0 left-0 h-full rounded bg-primary transition-all"
              style={{ width: `${(item.score / maxScore) * 100}%` }}
            />
            <div
              className="absolute top-0 left-0 h-full border-l-2 border-destructive"
              style={{ left: `${(item.average / maxScore) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Workload distribution pie chart (simplified as text)
function WorkloadDistribution({ data }: { data: { category: string; count: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.category} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", item.color)} />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm">{item.category}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </div>
            <span className="text-xs font-medium">{percentage.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function WorkloadDashboard({ tasks, users, suggestions = [], className }: WorkloadDashboardProps) {
  const [workloads, setWorkloads] = useState<ExtendedUserWorkload[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate workloads
  const calculatedWorkloads = useMemo(() => {
    // Get assigned users with their tasks
    const assignedUsers = users.filter(u => u.id);
    const userTaskCounts: Record<number, number> = {};
    const userCompletedCounts: Record<number, number> = {};
    const userOverdueCounts: Record<number, number> = {};
    const userHighPriorityCounts: Record<number, number> = {};
    const userEstimatedTimes: Record<number, number> = {};

    tasks.forEach(task => {
      if (task.assignee_id) {
        userTaskCounts[task.assignee_id] = (userTaskCounts[task.assignee_id] || 0) + 1;
        if (task.completed) {
          userCompletedCounts[task.assignee_id] = (userCompletedCounts[task.assignee_id] || 0) + 1;
        }
        if (task.deadline && new Date(task.deadline) < new Date() && !task.completed) {
          userOverdueCounts[task.assignee_id] = (userOverdueCounts[task.assignee_id] || 0) + 1;
        }
        if (task.priority === 'critical' || task.priority === 'high') {
          userHighPriorityCounts[task.assignee_id] = (userHighPriorityCounts[task.assignee_id] || 0) + 1;
        }
        if (task.estimate) {
          const hours = parseFloat(task.estimate.replace(':', '.')) || 0;
          userEstimatedTimes[task.assignee_id] = (userEstimatedTimes[task.assignee_id] || 0) + hours;
        }
      }
    });

    // Build workload objects
    const baseWorkloads: UserWorkload[] = users.map(user => ({
      userId: user.id,
      userName: user.name || user.email.split('@')[0],
      email: user.email,
      totalTasks: userTaskCounts[user.id] || 0,
      completedTasks: userCompletedCounts[user.id] || 0,
      overdueTasks: userOverdueCounts[user.id] || 0,
      highPriorityTasks: userHighPriorityCounts[user.id] || 0,
      totalEstimatedTime: userEstimatedTimes[user.id] || 0,
      avgEstimatedTime: 0,
      workloadScore: 0,
      completionRate: 0,
      balanceCategory: 'balanced',
    }));

    // Calculate scores
    const workloadMap = calculateWorkloads(baseWorkloads);
    const avgScore = Array.from(workloadMap.values()).reduce((a, b) => a + b, 0) / (workloadMap.size || 1);

    return baseWorkloads.map(w => {
      const score = workloadMap.get(w.userId) || 0;
      return {
        ...w,
        workloadScore: score,
        completionRate: w.totalTasks > 0 ? (w.completedTasks / w.totalTasks) * 100 : 100,
        balanceCategory: categorizeWorkload(score, avgScore),
        balanceScore: calculateBalanceScore(w, avgScore),
      };
    });
  }, [tasks, users]);

  useEffect(() => {
    setWorkloads(calculatedWorkloads);
    setIsLoading(false);
  }, [calculatedWorkloads]);

  const chartData = useMemo(() => {
    return workloads.map(w => ({
      name: w.userName.split(' ')[0] || w.userName,
      score: w.workloadScore,
      average: workloads.reduce((sum, w) => sum + w.workloadScore, 0) / (workloads.length || 1),
    }));
  }, [workloads]);

  const distributionData = useMemo(() => {
    const categories = {
      overloaded: workloads.filter(w => w.balanceCategory === 'overloaded'),
      balanced: workloads.filter(w => w.balanceCategory === 'balanced'),
      underloaded: workloads.filter(w => w.balanceCategory === 'underloaded'),
    };

    return [
      { category: "Overloaded", count: categories.overloaded.length, color: "bg-red-500" },
      { category: "Balanced", count: categories.balanced.length, color: "bg-green-500" },
      { category: "Underloaded", count: categories.underloaded.length, color: "bg-blue-500" },
    ];
  }, [workloads]);

  const highPriorityTasks = useMemo(() => {
    return tasks.filter(t => (t.priority === 'critical' || t.priority === 'high') && !t.completed);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !t.completed);
  }, [tasks]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{users.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">{overdueTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Overdue Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{highPriorityTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">
                {workloads.reduce((sum, w) => sum + w.completedTasks, 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Workload Distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkloadDistribution data={distributionData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkloadBarChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Individual Workloads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Workload Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workloads.map((w) => {
              const category = w.balanceCategory;
              const categoryStyles = {
                overloaded: "border-red-200 bg-red-50",
                balanced: "border-green-200 bg-green-50",
                underloaded: "border-blue-200 bg-blue-50",
              };

              return (
                <div
                  key={w.userId}
                  className={cn(
                    "p-3 rounded-lg border",
                    categoryStyles[category]
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.userName}</span>
                      <Badge
                        className={cn(
                          category === "overloaded" && "bg-red-500",
                          category === "balanced" && "bg-green-500",
                          category === "underloaded" && "bg-blue-500"
                        )}
                      >
                        {category}
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-bold">{w.workloadScore.toFixed(1)}</span>
                      <span className="text-muted-foreground"> / 100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tasks</span>
                      <p className="font-medium">{w.totalTasks}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completion</span>
                      <p className="font-medium">{w.completionRate.toFixed(0)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Overdue</span>
                      <p className={cn(
                        "font-medium",
                        w.overdueTasks > 0 && "text-red-500"
                      )}>
                        {w.overdueTasks}
                      </p>
                    </div>
                  </div>

                  <Progress value={w.balanceScore} className="mt-3 h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.slice(0, 5).map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{s.taskName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                    </div>
                    <Badge variant="outline">
                      {Math.round(s.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}