"use client";

import { useMemo } from "react";
import {
  Brain,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PieChart,
  Target,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { format, addDays, startOfWeek, parseISO, subDays } from "date-fns";
import type { TaskWithRelations } from "@/types";

interface PredictiveAnalyticsProps {
  tasks: TaskWithRelations[];
}

const PREDICTION_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function PredictiveAnalytics({ tasks }: PredictiveAnalyticsProps) {
  // Calculate completion predictions using historical data
  const predictions = useMemo(() => {
    const incompleteTasks = tasks.filter(t => !t.completed);

    return incompleteTasks.map(task => {
      // Simple prediction based on deadline proximity and priority
      const today = new Date();
      let confidence = 0.5;
      let predictedCompletion: Date | null = null;
      let reasoning = "";

      if (task.deadline) {
        const daysUntil = Math.ceil(
          (new Date(task.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil <= 0) {
          confidence = 0.9;
          predictedCompletion = new Date(task.deadline);
          reasoning = "Overdue - high confidence of immediate action";
        } else if (daysUntil <= 3) {
          confidence = 0.8 - (daysUntil * 0.05);
          predictedCompletion = new Date(task.deadline);
          reasoning = `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} - confident completion`;
        } else if (daysUntil <= 7) {
          confidence = 0.7 - (daysUntil * 0.02);
          predictedCompletion = addDays(today, Math.floor(daysUntil * 0.7));
          reasoning = "Due this week - moderate confidence";
        } else {
          confidence = 0.5 + (daysUntil / 20) * 0.4;
          predictedCompletion = addDays(today, Math.floor(daysUntil / 2));
          reasoning = "Long-term deadline - estimated completion";
        }
      } else if (task.date) {
        const taskDate = parseISO(task.date);
        const daysUntil = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil >= -2 && daysUntil <= 7) {
          confidence = 0.6 + (7 - Math.abs(daysUntil)) * 0.03;
          predictedCompletion = taskDate;
          reasoning = "Task scheduled soon";
        } else {
          confidence = 0.4;
          predictedCompletion = addDays(today, 3);
          reasoning = "Task scheduled in future";
        }
      } else {
        confidence = 0.3;
        predictedCompletion = addDays(today, 7);
        reasoning = "No deadline - estimated completion";
      }

      // Adjust for priority
      if (task.priority === "critical") confidence = Math.min(confidence + 0.15, 0.95);
      else if (task.priority === "high") confidence = Math.min(confidence + 0.1, 0.9);
      else if (task.priority === "low") confidence = Math.max(confidence - 0.15, 0.2);

      return {
        task: task.name,
        predictedCompletion: predictedCompletion?.toISOString() || null,
        confidence,
        reasoning,
        priority: task.priority,
      };
    });
  }, [tasks]);

  // Calculate capacity utilization
  const capacityUtilization = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today);

    const tasksThisWeek = tasks.filter(t => {
      if (t.completed) return false;
      const date = t.date ? parseISO(t.date) : null;
      const deadline = t.deadline ? new Date(t.deadline) : null;
      const taskDate = date || deadline;

      return taskDate && taskDate >= weekStart && taskDate <= addDays(weekStart, 7);
    });

    // Estimate hours per task (simple model)
    const estimateHours = (task: TaskWithRelations): number => {
      const baseHours: Record<string, number> = {
        low: 0.5,
        medium: 1,
        high: 2,
        critical: 3,
        none: 1,
      };
      return baseHours[task.priority] || 1;
    };

    const totalEstimatedHours = tasksThisWeek.reduce((sum, t) => sum + estimateHours(t), 0);
    const availableHours = 40; // Standard work week

    return {
      totalTasks: tasksThisWeek.length,
      estimatedHours: totalEstimatedHours,
      availableHours,
      utilization: (totalEstimatedHours / availableHours) * 100,
    };
  }, [tasks]);

  // Risk assessment
  const riskAssessment = useMemo(() => {
    const overdue = tasks.filter(t =>
      t.deadline &&
      new Date(t.deadline) < new Date() &&
      !t.completed
    );

    const upcomingDeadlines = tasks.filter(t => {
      if (t.completed || t.deadline) return false;
      const daysUntil = Math.ceil(
        (new Date(t.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil > 0 && daysUntil <= 3;
    });

    const highPriorityIncomplete = tasks.filter(
      t => !t.completed && (t.priority === "critical" || t.priority === "high")
    );

    return {
      overdueCount: overdue.length,
      upcomingCount: upcomingDeadlines.length,
      highPriorityCount: highPriorityIncomplete.length,
      riskLevel:
        overdue.length > 3
          ? "high"
          : overdue.length > 0 || highPriorityIncomplete.length > 5
          ? "medium"
          : "low",
    };
  }, [tasks]);

  // Completion trends
  const completionTrends = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTasks = tasks.filter(
        t =>
          t.completed &&
          t.completed_at &&
          format(parseISO(t.completed_at), "yyyy-MM-dd") === dateStr
      );
      return {
        day: format(date, "EEE"),
        count: dayTasks.length,
      };
    });

    return days;
  }, [tasks]);

  // Priority distribution for incomplete tasks
  const priorityDistribution = useMemo(() => {
    const incomplete = tasks.filter(t => !t.completed);
    const distribution = incomplete.reduce(
      (acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return [
      { name: "Critical", value: distribution.critical || 0, color: PREDICTION_COLORS[3] },
      { name: "High", value: distribution.high || 0, color: PREDICTION_COLORS[0] },
      { name: "Medium", value: distribution.medium || 0, color: PREDICTION_COLORS[1] },
      { name: "Low", value: distribution.low || 0, color: PREDICTION_COLORS[2] },
    ].filter(d => d.value > 0);
  }, [tasks]);

  // Get risk color
  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      default: return "text-green-600";
    }
  };

  // Get risk background
  const getRiskBg = (level: string) => {
    switch (level) {
      case "high": return "bg-red-500/10";
      case "medium": return "bg-yellow-500/10";
      default: return "bg-green-500/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Predictions & Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">
                  {riskAssessment.overdueCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Overdue Tasks</p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {riskAssessment.upcomingCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Due Soon</p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className={`flex items-center justify-center gap-2 mb-2 ${getRiskColor(riskAssessment.riskLevel)}`}>
                <TrendingUp className="h-5 w-5" />
                <span className="text-2xl font-bold capitalize">
                  {riskAssessment.riskLevel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Risk Level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Week Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-3xl font-bold">
                  {Math.round(capacityUtilization.utilization)}%
                </span>
                <span className="text-sm text-muted-foreground"> / 100%</span>
              </div>
              <div>
                <span className="text-sm">
                  {capacityUtilization.totalTasks} tasks •{' '}
                  {Math.round(capacityUtilization.estimatedHours)}h estimated
                </span>
              </div>
            </div>

            <Progress
              value={capacityUtilization.utilization}
              className="h-2"
            />

            <div className="text-xs text-muted-foreground">
              {capacityUtilization.utilization > 100
                ? "⚠️ Over allocated - consider deferring tasks"
                : capacityUtilization.utilization < 50
                ? "💡 Under allocated - time for new initiatives"
                : "✅ Optimal workload"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Task Completion Predictions
          </CardTitle>
          <CardDescription>
            AI-estimated completion dates for incomplete tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">All tasks complete! No predictions needed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {predictions
                .sort((a, b) => (a.predictedCompletion ? new Date(a.predictedCompletion).getTime() : Infinity) -
                  (b.predictedCompletion ? new Date(b.predictedCompletion).getTime() : Infinity))
                .map((pred, idx) => {
                  const task = tasks.find(t => t.name === pred.task);
                  if (!task) return null;

                  return (
                    <div key={idx} className="border rounded-lg p-3 hover:shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{pred.task}</h4>
                          <p className="text-xs text-muted-foreground">
                            {pred.reasoning}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={pred.priority === "critical" ? "default" :
                              pred.priority === "high" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {pred.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getRiskColor(pred.priority === "critical" || pred.priority === "high" ? "text-red-600" : "text-blue-600")}`}
                          >
                            Confidence: {Math.round(pred.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>

                      {pred.predictedCompletion && (
                        <div className="text-xs text-muted-foreground">
                          Predicted: {format(new Date(pred.predictedCompletion), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Daily Completion Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={completionTrends}>
                <XAxis dataKey="day" />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Incomplete Tasks by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPieChart>
                  <Pie
                    data={priorityDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                <span>No incomplete tasks</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {riskAssessment.overdueCount > 0 && (
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Action needed:</strong> {riskAssessment.overdueCount} task(s) are overdue.
                  Consider rescheduling or prioritizing these items.
                </p>
              </div>
            )}

            {capacityUtilization.utilization > 100 && (
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Your workload is over-allocated by{' '}
                  {Math.round(capacityUtilization.utilization - 100)}%.
                  Consider deferring some tasks to next week.
                </p>
              </div>
            )}

            {riskAssessment.upcomingCount > 0 && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Heads up:</strong> {riskAssessment.upcomingCount} task(s) have deadlines within 3 days.
                  Plan your time accordingly.
                </p>
              </div>
            )}

            {riskAssessment.overdueCount === 0 &&
              riskAssessment.upcomingCount === 0 &&
              capacityUtilization.utilization <= 100 && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎉 Great work! Your task pipeline is well-maintained.
                  </p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}