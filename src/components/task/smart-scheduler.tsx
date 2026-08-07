"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Brain,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";

interface Task {
  id: number;
  name: string;
  priority: "critical" | "high" | "medium" | "low" | "none";
  date?: string | null;
  deadline?: string | null;
  estimate?: string;
  completed: boolean;
}

interface BlockSuggestion {
  taskId: number;
  startTime: string;
  endTime: string;
  confidence: number;
  reasoning: string;
}

interface ScheduleAnalysis {
  optimalTimes: BlockSuggestion[];
  conflicts: Array<{
    task1Id: number;
    task2Id: number;
    reason: string;
  }>;
  availableSlots: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
  energyEfficiency: number;
}

interface EnergyLevel {
  time: string;
  level: 1 | 2 | 3 | 4 | 5;
  type: "morning_energy" | "afternoon_focus" | "creative_window" | "recovery_time";
}

interface ScheduleViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function SmartScheduler({ tasks, selectedDate, onDateChange }: ScheduleViewProps) {
  const [scheduleAnalysis, setScheduleAnalysis] = useState<ScheduleAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [energyProfile, setEnergyProfile] = useState<EnergyLevel[]>([]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const fetchSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return;

      const response = await fetch(`/api/scheduler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1,
          taskIds,
          date: dateStr,
          durationPreference: "balanced",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScheduleAnalysis(data.analysis);
        setEnergyProfile(data.energyProfile || []);
      }
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tasks, dateStr]);

  useEffect(() => {
    if (tasks.length > 0) {
      fetchSchedule();
    }
  }, [tasks, dateStr, fetchSchedule]);

  const getTimeBlockColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500/20 border-green-500";
    if (confidence >= 0.6) return "bg-blue-500/20 border-blue-500";
    if (confidence >= 0.4) return "bg-amber-500/20 border-amber-500";
    return "bg-red-500/20 border-red-500";
  };

  const getEnergyLevelColor = (level: number) => {
    const colors = ["bg-gray-200", "bg-blue-200", "bg-green-200", "bg-emerald-200", "bg-yellow-200"];
    return colors[level - 1] || "bg-gray-200";
  };

  const getActivityLevel = () => {
    if (scheduleAnalysis?.optimalTimes) {
      return Math.round(scheduleAnalysis.energyEfficiency);
    }
    return 0;
  };

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addDays(selectedDate, -1))}
          >
            ← Previous
          </Button>

          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{format(selectedDate, "MMMM d, yyyy")}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(addDays(selectedDate, 1))}
          >
            Next →
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSchedule}
          disabled={isLoading}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 mr-2",
              isLoading && "animate-spin"
            )}
          />
          Refresh
        </Button>
      </div>

      {/* Energy Efficiency Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Energy Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{getActivityLevel()}%</div>
          <Progress value={getActivityLevel()} className="mt-2" />
        </CardContent>
      </Card>

      {/* Time Block Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span>Smart Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Energy Level Timeline */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Your Energy Profile</h4>
            <div className="grid grid-cols-12 gap-1">
              {energyProfile.length > 0 ? (
                energyProfile.map((level, i) => (
                  <TooltipProvider key={i}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div
                          className={cn(
                            "h-8 rounded-md flex items-center justify-center text-xs font-medium",
                            getEnergyLevelColor(level.level)
                          )}
                        >
                          {level.level}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{level.time} - Level {level.level}</p>
                        <p className="text-xs text-muted-foreground">
                          {level.type.replace("_", " ")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
              ) : (
                <div className="col-span-12 text-center py-4 text-muted-foreground">
                  Loading energy profile...
                </div>
              )}
            </div>
          </div>

          {/* Time Blocks */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium mb-3">Scheduling Suggestions</h4>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analyzing your tasks...</p>
              </div>
            ) : scheduleAnalysis?.optimalTimes.length ? (
              <div className="grid gap-3">
                {scheduleAnalysis.optimalTimes
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((block) => {
                    const task = taskMap.get(block.taskId);
                    return (
                      <motion.div
                        key={block.taskId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <Card
                          className={cn(
                            "border-2 transition-all duration-200",
                            getTimeBlockColor(block.confidence)
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={task?.priority === "critical" ? "destructive" :
                                      task?.priority === "high" ? "default" :
                                      task?.priority === "medium" ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {task?.priority}
                                  </Badge>
                                  <span className="font-medium">{task?.name || "Unknown Task"}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {block.reasoning}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{block.startTime} - {block.endTime}</span>
                                  <span>{block.confidence * 100}% confidence</span>
                                </div>
                              </div>

                              <Button size="sm" variant="ghost">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks to schedule or insufficient data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Available Time Slots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {scheduleAnalysis?.availableSlots.map((slot, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <div
                  className={cn(
                    "border rounded-lg p-3 text-center",
                    "hover:shadow-md transition-shadow",
                    "cursor-pointer"
                  )}
                >
                  <div className="font-medium">{slot.startTime}</div>
                  <div className="text-sm text-muted-foreground">
                    {slot.endTime}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {slot.durationMinutes}m
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Section */}
      {scheduleAnalysis?.conflicts && scheduleAnalysis.conflicts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Conflicts Detected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 mb-3">
              Some tasks have scheduling conflicts. Consider adjusting their times.
            </p>
            <div className="space-y-2">
              {scheduleAnalysis.conflicts.map((conflict, i) => (
                <div key={i} className="bg-white/50 rounded-lg p-3">
                  <p className="text-sm">
                    <span className="font-medium">Task overlap</span> between scheduled tasks
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}