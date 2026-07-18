"use client";

import { useState, useEffect } from "react";
import { Coffee, Clock, MapPin, Smile, Battery, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

interface HabitContext {
  id: number;
  task_id: number;
  user_id: number;
  context_type: "time_of_day" | "location" | "mood" | "energy_level" | "external_trigger";
  context_value: string;
  frequency: number;
  success_rate: number;
  created_at: string;
}

interface HabitContextTrackerProps {
  taskId?: number;
  context?: HabitContext | null;
  onContextUpdate?: (context: HabitContext) => void;
}

const timeOfDayOptions = [
  { value: "morning", label: "Morning (6am-12pm)", icon: Coffee },
  { value: "afternoon", label: "Afternoon (12pm-6pm)", icon: Clock },
  { value: "evening", label: "Evening (6pm-10pm)", icon: Coffee },
  { value: "night", label: "Night (10pm-6am)", icon: Moon },
];

const locationOptions = [
  { value: "home", label: "Home Office", icon: MapPin },
  { value: "work", label: "Work Office", icon: MapPin },
  { value: "cafe", label: "Coffee Shop", icon: MapPin },
  { value: "gym", label: "Gym", icon: MapPin },
  { value: "library", label: "Library", icon: MapPin },
];

const moodOptions = [
  { value: "energetic", label: "Energetic", icon: Brain },
  { value: "focused", label: "Focused", icon: Brain },
  { value: "tired", label: "Tired", icon: Battery },
  { value: "stressed", label: "Stressed", icon: Battery },
];

const energyLevelOptions = [
  { value: "5", label: "High Energy", icon: Battery },
  { value: "4", label: "Above Average", icon: Battery },
  { value: "3", label: "Neutral", icon: Battery },
  { value: "2", label: "Below Average", icon: Battery },
  { value: "1", label: "Low Energy", icon: Battery },
];

export function HabitContextTracker({ taskId, context, onContextUpdate }: HabitContextTrackerProps) {
  const [selectedContextType, setSelectedContextType] = useState<HabitContext["context_type"]>("time_of_day");
  const [selectedContextValue, setSelectedContextValue] = useState<string>("");
  const [success, setSuccess] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (context) {
      setSelectedContextType(context.context_type);
      setSelectedContextValue(context.context_value);
      setSuccess(context.success_rate > 50);
    }
  }, [context]);

  const handleRecordContext = async () => {
    if (!taskId || !selectedContextValue) return;

    setIsRecording(true);

    try {
      const response = await fetch("/api/habit-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          user_id: 1,
          context_type: selectedContextType,
          context_value: selectedContextValue,
          success,
        }),
      });

      if (response.ok) {
        const newContext = await response.json();
        onContextUpdate?.(newContext);
        toast.success("Context recorded successfully");
      }
    } catch (error) {
      toast.error("Failed to record context");
      console.error(error);
    } finally {
      setIsRecording(false);
    }
  };

  const getContextOptions = () => {
    switch (selectedContextType) {
      case "time_of_day": return timeOfDayOptions;
      case "location": return locationOptions;
      case "mood": return moodOptions;
      case "energy_level": return energyLevelOptions;
      default: return [];
    }
  };

  const selectedOption = getContextOptions().find(o => o.value === selectedContextValue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Habit Context Tracker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track when you're most productive for different task types
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label>Context Type</Label>
            <Select value={selectedContextType} onValueChange={setSelectedContextType as any}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time_of_day">Time of Day</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="mood">Mood</SelectItem>
                <SelectItem value="energy_level">Energy Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              {selectedContextType === "energy_level" ? "Energy Level" :
               selectedContextType === "time_of_day" ? "Best Time" :
               selectedContextType === "location" ? "Location" :
               selectedContextType === "mood" ? "Mood" : "Context Value"}
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {getContextOptions().map((option) => {
                const Icon = option.icon;
                const isSelected = selectedContextValue === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => setSelectedContextValue(option.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Was this context successful?</Label>
            <div className="flex gap-2 mt-2">
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
        </div>

        <Button
          onClick={handleRecordContext}
          disabled={isRecording || !selectedContextValue}
          className="w-full"
        >
          {isRecording ? "Recording..." : "Record Context"}
        </Button>

        {/* Success Rate Indicator */}
        {context && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Success Rate</span>
              <Badge>{Math.round(context.success_rate)}%</Badge>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${context.success_rate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {context.frequency} recordings • Best at {selectedOption?.label || "selecting..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}