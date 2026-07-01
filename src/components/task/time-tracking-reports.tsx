"use client";

import { useState } from "react";
import { Calendar, Download, BarChart3, Clock, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import type { TimeEntry, TaskWithRelations } from "@/types";

interface TimeTrackingReportsProps {
  tasks: TaskWithRelations[];
  timeEntries: TimeEntry[];
  onLoadData: () => Promise<{ tasks: TaskWithRelations[]; timeEntries: TimeEntry[] }>;
}

export function TimeTrackingReports({ tasks, timeEntries, onLoadData }: TimeTrackingReportsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week");
  const [isLoading, setIsLoading] = useState(false);

  // Calculate time by task
  const timeByTask = timeEntries.reduce((acc, entry) => {
    const task = tasks.find(t => t.id === entry.task_id);
    const taskName = task?.name || `Task #${entry.task_id}`;
    const existing = acc.find(item => item.name === taskName);
    if (existing) {
      existing.time += entry.duration_seconds || 0;
    } else {
      acc.push({ name: taskName, time: entry.duration_seconds || 0 });
    }
    return acc;
  }, [] as { name: string; time: number }[]);

  // Calculate daily totals
  const dailyTotals = timeEntries.reduce((acc, entry) => {
    const date = entry.created_at.split("T")[0];
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.time += entry.duration_seconds || 0;
    } else {
      acc.push({ date, time: entry.duration_seconds || 0 });
    }
    return acc;
  }, [] as { date: string; time: number }[]);

  // Calculate totals
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
  const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
  const averagePomodoros = Math.round((totalSeconds / 25 / 60) * 10) / 10;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Time Tracking Reports</h2>
          <p className="text-muted-foreground">Analyze your time spent on tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as "week" | "month" | "quarter")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Total Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalSeconds)}</div>
            <p className="text-xs text-muted-foreground">
              {timeEntries.length} time entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Top Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {timeByTask[0]?.name || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeByTask[0] ? formatTime(timeByTask[0].time) : "0h 0m"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Pomodoros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePomodoros}</div>
            <p className="text-xs text-muted-foreground">avg per task</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              of tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time by Task</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeByTask.slice(0, 5)}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [formatTime(value as number), "Time"]} />
                <Bar dataKey="time" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTotals.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [formatTime(value as number), "Time"]} />
                <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No time entries recorded</p>
          ) : (
            <div className="space-y-2">
              {timeEntries.slice(0, 10).map((entry) => {
                const task = tasks.find(t => t.id === entry.task_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {task?.name || `Task #${entry.task_id}`}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatTime(entry.duration_seconds || 0)}</div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}