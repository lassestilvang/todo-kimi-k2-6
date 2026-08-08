"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  TrendingUp,
  Calculator,
  Activity,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, BarChart as ReBarChart, Bar } from "recharts";
import { format, subWeeks, startOfWeek, parseISO } from "date-fns";
import { toast } from "sonner";

interface TeamVelocityDashboardProps {
  workspaceId?: number;
  teamMembers?: Array<{ id: number; name: string; email: string; taskCount: number }>;
}

interface SprintData {
  id: number;
  name: string;
  period_start: string;
  period_end: string;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  burn_rate: number;
}

interface VelocityReport {
  sprints: SprintData[];
  velocity: number;
  predictedVelocity: number;
  capacity: number;
  burndown: Array<{ day: string; remaining: number; ideal: number }>;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  taskCount: number;
  completionRate?: number;
}

export function TeamVelocityDashboard({ workspaceId, teamMembers: initialMembers }: TeamVelocityDashboardProps) {
  const [report, setReport] = useState<VelocityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter" | "year">("month");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialMembers || []);

  useEffect(() => {
    fetchTeamVelocityReport();
  }, [timeframe, workspaceId]);

  const fetchTeamVelocityReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (workspaceId) params.set("workspaceId", workspaceId.toString());

      const response = await fetch(`/api/team-velocity?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      } else {
        throw new Error("Failed to fetch report");
      }
    } catch (error) {
      toast.error("Failed to load team velocity data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate team health score
  const teamHealth = useMemo(() => {
    if (!report) return 0;

    const avgCompletion = report.sprints.reduce((sum, s) => sum + s.completion_rate, 0) / report.sprints.length;
    const velocityConsistency = report.velocity > 0 ? (report.predictedVelocity / report.velocity) : 0;

    return Math.min(100, Math.round(avgCompletion * 0.7 + Math.min(100, velocityConsistency * 30)));
  }, [report]);

  // Calculate individual member stats
  const memberStats = useMemo(() => {
    if (!report) return [];

    return report.sprints.map((sprint, index) => ({
      name: sprint.name,
      planned: sprint.planned_points,
      completed: sprint.completed_points,
      avgBurndown: sprint.burn_rate,
    }));
  }, [report]);

  // Get the last 6 sprints for visualization
  const recentSprints = report?.sprints.slice(-6) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-40 bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Velocity</h2>
          <p className="text-muted-foreground">
            Track team performance and predict future capacity
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{report?.sprints.length || 0} sprint(s) analyzed</Badge>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Current Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.velocity || 0}</p>
            <p className="text-xs text-muted-foreground">tasks/sprint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Predicted Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{report?.predictedVelocity || 0}</p>
            <p className="text-xs text-muted-foreground">tasks/sprint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Team Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report?.capacity || 0}</p>
            <p className="text-xs text-muted-foreground">hours available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Team Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={teamHealth >= 80 ? "default" : teamHealth >= 60 ? "secondary" : "destructive"}
                className="text-lg"
              >
                {teamHealth}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {teamHealth >= 80 ? "Team is performing well" : teamHealth >= 60 ? "Team is on track" : "Attention needed"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Velocity vs Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Velocity Trends</CardTitle>
          <CardDescription>
            Current velocity: {report?.velocity || 0} | Predicted: {report?.predictedVelocity || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSprints.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentSprints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ReTooltip />
                <Line
                  type="monotone"
                  dataKey="completed_points"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Completed Points"
                />
                <Line
                  type="monotone"
                  dataKey="planned_points"
                  stroke="hsl(var(--muted))"
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Planned Points"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No sprint data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sprint Details */}
      {report?.sprints && report.sprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sprints</CardTitle>
            <CardDescription>Detailed sprint performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.sprints.slice(-5).map((sprint, idx) => (
                <div
                  key={sprint.id}
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{sprint.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(sprint.period_start), "MMM d")} -{" "}
                        {format(parseISO(sprint.period_end), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={sprint.completion_rate >= 80 ? "default" : sprint.completion_rate >= 70 ? "secondary" : "outline"}>
                        {sprint.completion_rate}% completion
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{sprint.planned_points}</p>
                      <p className="text-xs text-muted-foreground">Planned</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{sprint.completed_points}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sprint.burn_rate}</p>
                      <p className="text-xs text-muted-foreground">Burn Rate</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Efficiency</span>
                      <span>{sprint.completion_rate}%</span>
                    </div>
                    <Progress value={sprint.completion_rate} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacity Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Capacity Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Next Sprint Prediction</h4>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-2xl font-bold mb-2">{report?.predictedVelocity || 0}</p>
                <p className="text-muted-foreground">Predicted tasks for next sprint</p>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Capacity Utilization</span>
                    <span>{report && report.velocity ? Math.min(100, Math.round((report.velocity / report.capacity) * 100)) : 0}%</span>
                  </div>
                  <Progress value={report && report.velocity ? Math.min(100, (report.velocity / report.capacity) * 100) : 0} className="h-2" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Recommendations</h4>
              <div className="space-y-3">
                {report && (
                  <>
                    {report.predictedVelocity > report.velocity && (
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-sm text-green-800">
                          🎯 Velocity is increasing! Consider adding more capacity
                        </p>
                      </div>
                    )}
                    {report.velocity < report.predictedVelocity * 0.8 && (
                      <div className="p-3 bg-amber-500/10 rounded-lg">
                        <p className="text-sm text-amber-800">
                          ⚠️ Velocity below prediction. Review sprint planning.
                        </p>
                      </div>
                    )}
                    {report.velocity > report.capacity * 0.9 && (
                      <div className="p-3 bg-red-500/10 rounded-lg">
                        <p className="text-sm text-red-800">
                          ⚠️ Team is over capacity. Consider reducing sprint commitment.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={fetchTeamVelocityReport}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint Report
        </Button>
      </div>
    </div>
  );
}