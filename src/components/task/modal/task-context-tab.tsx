"use client";

import { useState } from "react";
import { Brain, Clock, MapPin, Smile, Battery, Coffee, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskWithRelations, HabitContext } from "@/types";

interface TaskContextTabProps {
  task: TaskWithRelations;
  contexts?: HabitContext[];
  onContextUpdate?: (context: HabitContext) => void;
}

const contextTypes = [
  {
    value: "time_of_day",
    label: "Time of Day",
    icon: Clock,
    options: [
      { value: "morning", label: "Morning (6am-12pm)" },
      { value: "afternoon", label: "Afternoon (12pm-6pm)" },
      { value: "evening", label: "Evening (6pm-10pm)" },
      { value: "night", label: "Night (10pm-6am)" },
    ],
  },
  {
    value: "location",
    label: "Location",
    icon: MapPin,
    options: [
      { value: "home", label: "Home Office" },
      { value: "work", label: "Work Office" },
      { value: "cafe", label: "Coffee Shop" },
      { value: "gym", label: "Gym" },
      { value: "library", label: "Library" },
    ],
  },
  {
    value: "mood",
    label: "Mood",
    icon: Smile,
    options: [
      { value: "energetic", label: "Energetic" },
      { value: "focused", label: "Focused" },
      { value: "tired", label: "Tired" },
      { value: "stressed", label: "Stressed" },
    ],
  },
  {
    value: "energy_level",
    label: "Energy Level",
    icon: Battery,
    options: [
      { value: "5", label: "High Energy" },
      { value: "4", label: "Above Average" },
      { value: "3", label: "Neutral" },
      { value: "2", label: "Below Average" },
      { value: "1", label: "Low Energy" },
    ],
  },
];

export function TaskContextTab({ task, contexts = [], onContextUpdate }: TaskContextTabProps) {
  const [selectedContextType, setSelectedContextType] = useState<string>("time_of_day");
  const [selectedContextValue, setSelectedContextValue] = useState<string | null>(null);
  const [success, setSuccess] = useState(true);

  const currentContext = contexts.find(c => c.context_type === selectedContextType);

  const handleRecordContext = async () => {
    if (!selectedContextValue) return;

    try {
      const response = await fetch("/api/habit-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          user_id: 1,
          context_type: selectedContextType,
          context_value: selectedContextValue,
          success,
        }),
      });

      if (response.ok) {
        const newContext = await response.json();
        onContextUpdate?.(newContext);
      }
    } catch (error) {
      console.error("Failed to record context:", error);
    }
  };

  const getContextStats = (contextType: string) => {
    const context = contexts.find(c => c.context_type === contextType);
    return context ? { frequency: context.frequency, successRate: context.success_rate } : null;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <Brain className="h-4 w-4" />
        Context Tracker
      </h3>
      <p className="text-sm text-muted-foreground">
        Track when you're most productive for this task type.
      </p>

      <div className="space-y-3">
        <Select value={selectedContextType} onValueChange={(v) => setSelectedContextType(v as string)}>
          <SelectTrigger>
            <SelectValue placeholder="Select context type" />
          </SelectTrigger>
          <SelectContent>
            {contextTypes.map((type) => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <Icon className="h-4 w-4 mr-2" />
                  {type.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {contextTypes.find(t => t.value === selectedContextType)?.label || "Context"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {contextTypes.find(t => t.value === selectedContextType)?.options.map((option) => (
              <Button
                key={option.value}
                variant={selectedContextValue === option.value ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedContextValue(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Was this successful?</label>
          <div className="flex gap-2">
            <Button
              variant={success ? "default" : "outline"}
              size="sm"
              onClick={() => setSuccess(true)}
            >
              ✅ Yes
            </Button>
            <Button
              variant={!success ? "default" : "outline"}
              size="sm"
              onClick={() => setSuccess(false)}
            >
              ❌ No
            </Button>
          </div>
        </div>

        <Button onClick={handleRecordContext} disabled={!selectedContextValue}>
          Record Context
        </Button>
      </div>

      {/* Existing Context Stats */}
      {contexts.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Your Patterns</h4>
          {contexts.map((context) => {
            const type = contextTypes.find(t => t.value === context.context_type);
            if (!type) return null;
            const Icon = type.icon;
            const stats = getContextStats(context.context_type);
            return (
              <div key={context.context_type} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3 w-3" />
                  <span className="text-xs">{type.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {stats?.frequency || 0} recordings
                  </Badge>
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor: ((stats?.successRate || 0) > 70 ? "#de3030" : (stats?.successRate || 0) > 50 ? "#f59e0b" : "#e11d48"),
                      color: "white",
                    }}
                  >
                    {Math.round(stats?.successRate || 0)}% success
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}