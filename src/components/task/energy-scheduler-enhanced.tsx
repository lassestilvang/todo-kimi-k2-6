"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Brain,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/types";

interface EnergyPatterns {
  avgEnergy: number;
  peakTime: string;
  lowEnergyTimes: string[];
}

interface EnergySchedulerProps {
  tasks: TaskWithRelations[];
  onSchedule: (taskId: number, date: string) => void;
}

const timePeriods = [
  { id: "morning", label: "Morning (6am-12pm)", icon: "☀️" },
  { id: "afternoon", label: "Afternoon (12pm-5pm)", icon: "🌤️" },
  { id: "evening", label: "Evening (5pm-9pm)", icon: "🌆" },
  { id: "night", label: "Night (9pm-6am)", icon: "🌙" },
];

const taskDifficultyMap: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
  none: 0.25,
};

export function EnergySchedulerEnhanced({ tasks, onSchedule }: EnergySchedulerProps) {
  const [energyPatterns, setEnergyPatterns] = useState<EnergyPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<string>("");

  useEffect(() => {
    loadEnergyPatterns();
  }, []);

  const loadEnergyPatterns = async () => {
    try {
      const response = await fetch("/api/energy-patterns?days=14");
      if (response.ok) {
        const data = await response.json();
        const patterns: Record<string, { avg: number; count: number }> = data.timeOfDayStats || {};

        let peakTime = "morning";
        let peakEnergy = 0;

        Object.entries(patterns).forEach(([time, stats]) => {
          if ((stats as { avg: number; count: number }).avg > peakEnergy) {
            peakEnergy = (stats as { avg: number; count: number }).avg;
            peakTime = time;
          }
        });

        setEnergyPatterns({
          avgEnergy: peakEnergy,
          peakTime,
          lowEnergyTimes: ["evening", "night"],
        });
      }
    } catch (error) {
      console.error("Failed to load energy patterns:", error);
      // Provide defaults
      setEnergyPatterns({
        avgEnergy: 5,
        peakTime: "morning",
        lowEnergyTimes: ["evening", "night"],
      });
    } finally {
      setLoading(false);
    }
  };

  const getTaskRecommendations = useMemo(() => {
    if (!selectedTask || !energyPatterns) return null;

    const { peakTime, lowEnergyTimes } = energyPatterns;
    const difficulty = taskDifficultyMap[selectedTask.priority] || 1;

    let recommendedDate: string;

    // Simple recommendation logic
    if (selectedTask.deadline) {
      recommendedDate = selectedTask.deadline;
    } else if (peakTime === "morning" && difficulty <= 1.5) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      recommendedDate = today.toISOString().split("T")[0];
    } else if (lowEnergyTimes.includes("evening") && difficulty > 1.5) {
      const today = new Date();
      today.setDate(today.getDate() + 2);
      recommendedDate = today.toISOString().split("T")[0];
    } else {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      recommendedDate = today.toISOString().split("T")[0];
    }

    return {
      date: recommendedDate,
      reason: selectedTask.deadline
        ? "Based on your deadline"
        : difficulty <= 1.5
          ? "Schedule during peak morning energy"
          : "Schedule mid-week to allow focus time",
      confidence: Math.round((1 - Math.abs(difficulty - 1.5) * 0.3) * 100),
    };
  }, [selectedTask, energyPatterns]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => !t.completed && !t.date);

  return (
    <div className="space-y-6">
      {/* Energy Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Energy Profile
          </CardTitle>
          <CardDescription>Your optimal work schedule based on past performance</CardDescription>
        </CardHeader>
        <CardContent>
          {energyPatterns ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{'⭐'.repeat(Math.round(energyPatterns.avgEnergy))} </div>
                <p className="text-sm text-muted-foreground">Peak Energy Level</p>
              </div>

              <div className="text-center p-4">
                <Badge variant="secondary">{energyPatterns.peakTime}</Badge>
                <p className="text-sm text-muted-foreground mt-1">Peak Time</p>
              </div>

              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground">
                  Your best energy matches: {energyPatterns.lowEnergyTimes.join(", ")}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No energy patterns recorded yet</p>
              <p className="text-xs">Complete tasks to discover your energy rhythm</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Smart Scheduling Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>All tasks are scheduled or completed!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.slice(0, 5).map(task => {
                const difficulty = taskDifficultyMap[task.priority] || 1;
                const isHighDifficulty = difficulty > 1.5;

                return (
                  <div key={task.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{task.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge>{task.priority}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Difficulty: {difficulty.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <Select onValueChange={(date): void => {
                        if (!date) return;
                        onSchedule(task.id, String(date));
                        toast.success(`Scheduled "${task.name}"`);
                      }}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Schedule..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 7].map(days => {
                            const date = new Date();
                            date.setDate(date.getDate() + days);
                            return (
                              <SelectItem key={days} value={date.toISOString().split("T")[0]}>
                                {date.toLocaleDateString()}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Energy Matching Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Task-Energy Matching
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            {timePeriods.map(period => {
              const isPeak = period.id === energyPatterns?.peakTime;
              const isLow = energyPatterns?.lowEnergyTimes.includes(period.id);
              const taskCount = tasks.filter(t => !t.completed && t.priority === (isPeak ? "high" : "medium")).length;

              return (
                <div key={period.id} className={`p-3 rounded-lg border ${isPeak ? "border-purple-200 bg-purple-50/50" : isLow ? "border-gray-200 bg-gray-50/50" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{period.icon}</span>
                    <span className="font-medium text-xs">{period.label.split(" ")[0]}</span>
                  </div>
                  {isPeak && <TrendingUp className="h-3 w-3 text-purple-500 mx-auto" />}
                  <p className="text-muted-foreground mt-1">{taskCount} tasks</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}