"use client";

import { useState } from "react";
import { Target, Award, Plus, Minus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

interface GoalsTrackerProps {
  goals: Goal[];
  onAddGoal: (goal: CreateGoalInput & { user_id: number }) => void;
  onUpdateProgress: (id: number, increment: number) => void;
  onResetGoal: (id: number) => void;
}

interface CreateGoalInput {
  name: string;
  description?: string;
  target_count: number;
  target_unit: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
}

export function GoalsTracker({ goals, onAddGoal, onUpdateProgress, onResetGoal }: GoalsTrackerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGoal, setNewGoal] = useState<CreateGoalInput>({
    name: "",
    description: "",
    target_count: 10,
    target_unit: "tasks",
    period: "daily",
  });

  const handleCreateGoal = () => {
    if (!newGoal.name.trim()) return;
    onAddGoal({ ...newGoal, user_id: 1 }); // In real app, get from session
    setNewGoal({
      name: "",
      description: "",
      target_count: 10,
      target_unit: "tasks",
      period: "daily",
    });
    setIsCreating(false);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "yearly": return "Yearly";
      default: return period;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-1.5">
          <Target className="h-4 w-4" />
          Goals Tracker
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Create Goal Form */}
      {isCreating && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                placeholder="e.g., Complete 10 tasks"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Add details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  type="number"
                  min="1"
                  value={newGoal.target_count}
                  onChange={(e) => setNewGoal({ ...newGoal, target_count: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={newGoal.target_unit}
                  onValueChange={(v) => setNewGoal({ ...newGoal, target_unit: v as string })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="pomodoros">Pomodoros</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={newGoal.period}
                onValueChange={(v: any) => setNewGoal({ ...newGoal, period: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateGoal}>Create Goal</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Goals List */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No goals yet. Create your first goal to get started!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = goal.target_count > 0 ? Math.round((goal.current_count / goal.target_count) * 100) : 0;
            const isCompleted = goal.current_count >= goal.target_count;

            return (
              <Card key={goal.id} className={cn("p-4", isCompleted && "border-green-200")}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{goal.name}</h4>
                      <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                        {getPeriodLabel(goal.period)}
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{goal.current_count} / {goal.target_count} {getUnitLabel(goal.target_unit)}</span>
                      <span>•</span>
                      <span>{progress}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateProgress(goal.id, -1)}
                      disabled={goal.current_count <= 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateProgress(goal.id, 1)}
                      disabled={goal.current_count >= goal.target_count}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
              </div>

                <Progress value={progress} className="h-2 mt-3" />

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Award className="h-3 w-3" />
                        <span>Completed!</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onResetGoal(goal.id)}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}