"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Target, BarChart3, PieChart, Activity, Lightbulb, Brain, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Pie, Cell, LineChart, Line, ScatterChart, Scatter, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import type { TaskWithRelations } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TaskInvestmentPortfolioProps {
  tasks: TaskWithRelations[];
  completedTasks?: TaskWithRelations[];
}

interface TaskInvestmentScore {
  taskId: number;
  name: string;
  roi: number; // 0-100 score
  impact: number; // long-term value (0-100)
  effort: number; // estimated time/energy required (0-100)
  urgency: number; // time sensitivity (0-100)
  risk: number; // chance of complications (0-100)
  dependencies: number; // blocking impact (0-100)
  category: "high_investment" | "medium_investment" | "low_investment";
}

interface PortfolioStats {
  highROI: TaskInvestmentScore[];
  mediumROI: TaskInvestmentScore[];
  lowROI: TaskInvestmentScore[];
  diversificationScore: number;
  totalInvestmentValue: number;
}

export function TaskInvestmentPortfolio({ tasks, completedTasks = [] }: TaskInvestmentPortfolioProps) {
  const portfolio = useMemo(() => calculatePortfolio(tasks), [tasks]);

  // Calculate completion patterns for the chart
  const weeklyCompletionData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const dayStr = format(day, "yyyy-MM-dd");

      const dayTasks = tasks.filter(t => t.date === dayStr);
      const dayCompleted = completedTasks.filter(t =>
        t.completed_at && format(new Date(t.completed_at), "yyyy-MM-dd") === dayStr
      );

      return {
        day: format(day, "EEE"),
        tasks: dayTasks.length,
        completed: dayCompleted.length,
        rate: dayTasks.length > 0 ? Math.round((dayCompleted.length / dayTasks.length) * 100) : 0,
      };
    });
  }, [tasks, completedTasks]);

  // ROI distribution data
  const roiDistribution = useMemo(() => [
    { name: "High ROI", value: portfolio.highROI.length, color: "#22c55e" },
    { name: "Medium ROI", value: portfolio.mediumROI.length, color: "#f59e0b" },
    { name: "Low ROI", value: portfolio.lowROI.length, color: "#6b7280" },
  ], [portfolio]);

  // Top investment opportunities
  const topInvestments = portfolio.highROI.slice(0, 5);

  // Investment efficiency score
  const investmentEfficiency = portfolio.totalInvestmentValue / Math.max(tasks.length, 1);

  // Risk-Return scatter data for visualization
  const scatterData = useMemo(() => {
    const allInvestments: TaskInvestmentScore[] = [
      ...portfolio.highROI,
      ...portfolio.mediumROI,
      ...portfolio.lowROI,
    ];
    return allInvestments.map(inv => ({
      x: inv.risk,
      y: inv.roi,
      name: inv.name,
      taskId: inv.taskId,
      category: inv.category,
    }));
  }, [portfolio.highROI, portfolio.mediumROI, portfolio.lowROI]);

  // Category colors for scatter plot
  const categoryColors: Record<string, string> = {
    high_investment: "#22c55e",
    medium_investment: "#f59e0b",
    low_investment: "#6b7280",
  };

  // Portfolio health analysis
  const portfolioHealth = useMemo(() => {
    const totalTasks = tasks.length;
    const completedHighROI = completedTasks.filter(t =>
      portfolio.highROI.some(h => h.taskId === t.id)
    ).length;
    const highROICount = portfolio.highROI.length;

    const completionRate = highROICount > 0
      ? Math.round((completedHighROI / highROICount) * 100)
      : 0;

    let healthStatus: "excellent" | "good" | "needs_attention" | "critical";
    if (completionRate >= 80) healthStatus = "excellent";
    else if (completionRate >= 50) healthStatus = "good";
    else if (completionRate >= 25) healthStatus = "needs_attention";
    else healthStatus = "critical";

    return { completionRate, healthStatus, completedHighROI, highROICount };
  }, [tasks, completedTasks, portfolio.highROI]);

  const [showScatterChart, setShowScatterChart] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Task Investment Portfolio
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            ROI-based task prioritization and investment analysis
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Efficiency: {Math.round(investmentEfficiency * 100)}%
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              High ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{portfolio.highROI.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(portfolio.totalInvestmentValue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Diversification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(portfolio.diversificationScore)}%</p>
          </CardContent>
        </Card>

        {/* Portfolio Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {portfolioHealth.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioHealth.healthStatus === "excellent" && "Excellent progress!"}
              {portfolioHealth.healthStatus === "good" && "Good progress!"}
              {portfolioHealth.healthStatus === "needs_attention" && "Needs attention"}
              {portfolioHealth.healthStatus === "critical" && "Action needed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Weekly Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={weeklyCompletionData}>
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} hide />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
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
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <PieChart className="h-4 w-4" />
              Task Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={roiDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                >
                  {roiDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk-Return Scatter Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Brain className="h-4 w-4" />
            Risk-Return Analysis
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScatterChart(!showScatterChart)}
            >
              {showScatterChart ? "Hide" : "Show"} Details
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showScatterChart ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                Click to view detailed risk-return analysis
              </p>
              <Button variant="outline" onClick={() => setShowScatterChart(true)}>
                Show Risk-Return Chart
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Risk"
                  label={{ value: "Risk", angle: -90, position: "insideLeft" }}
                  domain={[0, 100]}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="ROI"
                  label={{ value: "ROI", angle: 0, position: "insideTop" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  formatter2={(value: number, name: string) => [value, name]}
                  content={(props) => (
                    <div className="bg-background border rounded p-2">
                      {props.payload && (
                        <>
                          <div className="font-medium">{props.payload.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Risk: {props.payload.x} | ROI: {props.payload.y}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                />
                <Scatter data={scatterData} shape="circle" />
                <ReferenceLine
                  X={50}
                  stroke="gray"
                  strokeDasharray="3 3"
                  label="Average Risk"
                />
                <ReferenceLine
                  Y={50}
                  stroke="gray"
                  strokeDasharray="3 3"
                  label="Average ROI"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Investment Opportunities */}
      {topInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Top Investment Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topInvestments.map((investment) => (
                <div key={investment.taskId} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{investment.name}</h4>
                    <Badge className="text-xs bg-green-100 text-green-700">
                      ROI: {Math.round(investment.roi)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Impact</span>
                      <div className="font-medium">{investment.impact}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effort</span>
                      <div className="font-medium">{investment.effort}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Urgency</span>
                      <div className="font-medium">{investment.urgency}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk</span>
                      <div className="font-medium">{investment.risk}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" />
            Portfolio Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* High ROI Tasks Insights */}
            {portfolio.highROI.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✅ {portfolio.highROI.length} high ROI task{portfolio.highROI.length > 1 ? 's' : ''} ready for investment
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Focus on these first - they offer the best return on effort invested.
                </p>
              </div>
            )}

            {/* Medium ROI Tasks Insights */}
            {portfolio.mediumROI.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  ⚖️ {portfolio.mediumROI.length} medium ROI tasks - balance your workload
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Good candidates for days when you have moderate capacity.
                </p>
              </div>
            )}

            {/* Low ROI Tasks Insights */}
            {portfolio.lowROI.length > tasks.length * 0.3 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  ⚠️ {portfolio.lowROI.length} low ROI tasks ({(portfolio.lowROI.length / tasks.length * 100).toFixed(0)}% of total)
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Consider delegating, batching, or archiving these tasks.
                </p>
              </div>
            )}

            {/* Portfolio Health Insights */}
            {portfolioHealth.healthStatus === "excellent" && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  📈 Portfolio Health: Excellent!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  You've completed {portfolioHealth.completedHighROI} of {portfolioHealth.highROICount} high ROI tasks.
                </p>
              </div>
            )}

            {portfolioHealth.healthStatus === "good" && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  📈 Portfolio Health: Good
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Keep building momentum on your high ROI tasks!
                </p>
              </div>
            )}

            {portfolioHealth.healthStatus === "needs_attention" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  📊 Portfolio Health: Needs Attention
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Only {portfolioHealth.completionRate}% of high ROI tasks completed. Focus on finishing these first.
                </p>
              </div>
            )}

            {portfolioHealth.healthStatus === "critical" && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Portfolio Health: Critical
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Action needed: Prioritize high ROI tasks to improve portfolio health.
                </p>
              </div>
            )}

            {/* Diversification Insights */}
            {portfolio.diversificationScore < 50 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  🎯 Diversification Opportunity
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Your portfolio is concentrated. Mix high-impact strategic work with routine tasks.
                </p>
              </div>
            )}

            {/* No High ROI Tasks */}
            {portfolio.highROI.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No high ROI tasks identified. Consider adding more strategic tasks.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Calculate investment scores for all tasks
function calculatePortfolio(tasks: TaskWithRelations[]): PortfolioStats {
  const investments: TaskInvestmentScore[] = tasks.map((task) => {
    // Impact score based on priority and deadline
    const priorityImpact = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
      none: 10,
    };
    const impact = priorityImpact[task.priority] || 50;

    // Effort estimate based on time tracking or default
    let effort = 50; // default medium
    if (task.time_entries && task.time_entries.length > 0) {
      const avgDuration = task.time_entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / task.time_entries.length / 60;
      // Normalize: 0 minutes = 100 effort, 120+ minutes = 20 effort
      effort = Math.max(20, Math.round(100 - Math.min(avgDuration, 120) * 0.67));
    } else if (task.estimate) {
      const estimateMinutes = parseInt(task.estimate) || 30;
      effort = Math.max(20, Math.round(100 - estimateMinutes * 0.5));
    }

    // Urgency based on deadline proximity
    let urgency = 50;
    if (task.deadline) {
      const deadlineDate = parseISO(task.deadline);
      const daysUntil = Math.max(0, Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      if (daysUntil === 0) urgency = 100;
      else if (daysUntil <= 1) urgency = 85;
      else if (daysUntil <= 3) urgency = 70;
      else if (daysUntil <= 7) urgency = 50;
      else if (daysUntil <= 14) urgency = 30;
      else urgency = 15;
    }

    // Risk based on complexity indicators
    let risk = 30;
    if (task.subtasks && task.subtasks.length > 3) risk += 20;
    if (task.blockers && task.blockers.length > 0) risk += 30;
    if (!task.description) risk += 10;
    risk = Math.min(100, risk);

    // Dependency impact
    const dependencies = (task.blockers?.length || 0) * 25;

    // Calculate ROI: (Impact + Urgency) / (Effort + Risk) * dependencies bonus
    let roi = Math.round(((impact + urgency) / Math.max(20, effort + risk + 10)) * 50);
    if (dependencies > 0) roi = Math.min(100, roi + dependencies);

    // Categorize
    let category: "high_investment" | "medium_investment" | "low_investment";
    if (roi >= 65) category = "high_investment";
    else if (roi >= 40) category = "medium_investment";
    else category = "low_investment";

    return {
      taskId: task.id,
      name: task.name,
      roi,
      impact,
      effort,
      urgency,
      risk,
      dependencies,
      category,
    };
  });

  // Sort by ROI descending
  investments.sort((a, b) => b.roi - a.roi);

  const highROI = investments.filter(i => i.category === "high_investment");
  const mediumROI = investments.filter(i => i.category === "medium_investment");
  const lowROI = investments.filter(i => i.category === "low_investment");

  // Calculate diversification score (spread across categories)
  const total = investments.length;
  const diversificationScore = total > 0
    ? 100 - Math.abs(highROI.length - mediumROI.length - lowROI.length) / total * 100
    : 100;

  // Total investment value
  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.roi, 0);

  return {
    highROI,
    mediumROI,
    lowROI,
    diversificationScore,
    totalInvestmentValue,
  };
}