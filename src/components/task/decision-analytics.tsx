"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  Brain,
  Lightbulb,
  FileText,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DecisionEntry {
  id: number;
  task_id?: number | null;
  task_name?: string;
  decision_type: "priority" | "approach" | "tool" | "timeline" | "allocation" | "cancellation";
  question: string;
  rationale: string;
  chosen_option_id?: number | null;
  outcome?: string | null;
  outcome_notes?: string | null;
  outcome_rating?: number | null;
  created_at: string;
  updated_at: string;
}

interface DecisionAnalyticsProps {
  taskId?: number;
}

const decisionTypes = [
  {
    value: "priority",
    label: "Priority Decision",
    icon: Brain,
    color: "border-red-200 bg-red-50 dark:bg-red-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
  {
    value: "approach",
    label: "Approach Decision",
    icon: Lightbulb,
    color: "border-blue-200 bg-blue-50 dark:bg-blue-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
  {
    value: "tool",
    label: "Tool Selection",
    icon: FileText,
    color: "border-green-200 bg-green-50 dark:bg-green-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
  {
    value: "timeline",
    label: "Timeline Decision",
    icon: Calendar,
    color: "border-amber-200 bg-amber-50 dark:bg-amber-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
  {
    value: "allocation",
    label: "Resource Allocation",
    icon: Users,
    color: "border-purple-200 bg-purple-50 dark:bg-purple-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
  {
    value: "cancellation",
    label: "Cancellation Decision",
    icon: AlertCircle,
    color: "border-gray-200 bg-gray-50 dark:bg-gray-900/20",
    ratingColor: (rating: number) => rating > 0.33 ? "text-green-500" : rating < -0.33 ? "text-red-500" : "text-amber-500"
  },
];

export function DecisionAnalytics({ taskId }: DecisionAnalyticsProps) {
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [metric, setMetric] = useState<"trend" | "rating" | "outcome" | "type">("trend");

  const loadDecisions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (taskId) params.set("task_id", String(taskId));

      const response = await fetch(`/api/decisions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDecisions(Array.isArray(data) ? data : data.decisions || []);
      }
    } catch (error) {
      console.error("Failed to load decisions:", error);
      toast.error("Failed to load decisions");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadDecisions();
  }, [timeRange, taskId, loadDecisions]);

  const filteredDecisions = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case "7d":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        cutoffDate.setDate(now.getDate() - 90);
        break;
    }

    return decisions.filter(d => new Date(d.created_at) >= cutoffDate);
  }, [decisions, timeRange]);

  const analytics = useMemo(() => {
    const total = filteredDecisions.length;
    const withOutcomes = filteredDecisions.filter(d => d.outcome);
    const rated = filteredDecisions.filter(d => d.outcome_rating !== null);

    const avgRating = rated.reduce((sum, d) => sum + (d.outcome_rating || 0), 0) / (rated.length || 1);

    // Calculate trend over time
    const decisionsByWeek = filteredDecisions.reduce((acc, d) => {
      const week = new Date(d.created_at).toISOString().slice(0, 10);
      acc[week] = (acc[week] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(decisionsByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Type distribution
    const typeWithOutcomes = (type: string) =>
      filteredDecisions.filter(d => d.decision_type === type && d.outcome).length;

    const typeDistribution = decisionTypes.map(type => {
      const typeDecisions = filteredDecisions.filter(d => d.decision_type === type.value);
      const typeRated = typeDecisions.filter(d => d.outcome_rating !== null);
      const avgRating = typeRated.reduce((sum, d) => sum + (d.outcome_rating || 0), 0) / (typeRated.length || 1);
      return {
        type: type.value,
        label: type.label,
        count: typeDecisions.length,
        avgRating,
        completionRate: typeDecisions.length > 0 ? (typeWithOutcomes(type.value) / typeDecisions.length) * 100 : 0,
        color: type.color,
        icon: type.icon,
        ratingColor: type.ratingColor,
      };
    });

    // Best and worst decisions
    const bestDecisions = [...rated]
      .sort((a, b) => (b.outcome_rating || 0) - (a.outcome_rating || 0))
      .slice(0, 3);

    const worstDecisions = [...rated]
      .sort((a, b) => (a.outcome_rating || 0) - (b.outcome_rating || 0))
      .slice(0, 3);

    return {
      total,
      completionRate: total > 0 ? (withOutcomes.length / total) * 100 : 0,
      avgRating,
      trendData,
      typeDistribution,
      bestDecisions,
      worstDecisions,
    };
  }, [filteredDecisions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex gap-4 items-center">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "7d" | "30d" | "90d" | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metric} onValueChange={(v) => setMetric(v as "trend" | "rating" | "outcome" | "type")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="View by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trend">Trend</SelectItem>
            <SelectItem value="rating">Ratings</SelectItem>
            <SelectItem value="outcome">Outcomes</SelectItem>
            <SelectItem value="type">By Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.total}</p>
            <p className="text-xs text-muted-foreground">
              {timeRange !== "all" ? `in ${timeRange}` : "all time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Outcome Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {Math.round(analytics.completionRate)}%
              </p>
              {analytics.completionRate > 70 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : analytics.completionRate > 40 ? (
                <div className="w-4 h-4 rounded-full bg-amber-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Decision Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${analytics.avgRating > 0.5 ? "text-green-500" : analytics.avgRating < -0.5 ? "text-red-500" : "text-amber-500"}`}>
                {analytics.avgRating.toFixed(2)}
              </p>
              <BarChart3 className={`h-4 w-4 ${analytics.avgRating > 0.5 ? "text-green-500" : analytics.avgRating < -0.5 ? "text-red-500" : "text-amber-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Type Distribution</CardTitle>
          <CardDescription>
            Breakdown by decision category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.typeDistribution.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.type} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline">{item.count} decisions</Badge>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-primary rounded-full transition-all"
                        style={{ width: `${item.count / analytics.total * 100 || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>Avg Rating: {item.avgRating.toFixed(2)}</span>
                      <span>{Math.round(item.completionRate)}% outcomes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Best/Worst Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">🏆 Best Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.bestDecisions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No rated decisions yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.bestDecisions.map((d, i) => (
                  <div key={d.id} className="p-3 rounded-lg border">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{d.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ThumbsUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">
                            Rating: {d.outcome_rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.worstDecisions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No poorly rated decisions</p>
            ) : (
              <div className="space-y-3">
                {analytics.worstDecisions.map((d, i) => (
                  <div key={d.id} className="p-3 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{d.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ThumbsDown className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-muted-foreground">
                            Rating: {d.outcome_rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <CardHeader>
          <CardTitle className="text-amber-800 dark:text-amber-200">
            🎯 Improvement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {analytics.avgRating < 0.33 && (
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Your decision outcomes could be better. Consider recording outcomes more consistently.</span>
              </li>
            )}
            {analytics.typeDistribution.some(t => t.avgRating < 0) && (
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Some decision types are underperforming. Review your approach to those decisions.</span>
              </li>
            )}
            {analytics.completionRate < 50 && (
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Record outcomes for more decisions to get better insights.</span>
              </li>
            )}
            {analytics.avgRating > 0.5 && analytics.completionRate > 70 && (
              <li className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Excellent decision-making! Keep tracking outcomes for continuous improvement.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}