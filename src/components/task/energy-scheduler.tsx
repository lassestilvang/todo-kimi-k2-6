"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Zap,
  Clock,
  TrendingUp,
  Brain,
  Timer,
  Settings,
  BarChart2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface EnergyEntry {
  id: number;
  date: string;
  time_of_day: "morning" | "afternoon" | "evening";
  energy_level: number; // 1-10
  task_type?: string;
  notes?: string;
}

interface EnergySuggestion {
  task_name: string;
  suggested_time: string;
  reasoning: string;
  confidence: number;
}

interface EnergySchedulerProps {
  tasks?: Array<{
    id: number;
    name: string;
    priority: string;
    estimated_duration?: number;
    date?: string;
  }>;
}

const taskTypeEnergyMap: Record<string, { morning: number[]; afternoon: number[]; evening: number[] }> = {
  "creative": { morning: [9, 10], afternoon: [14, 15, 16], evening: [19, 20] },
  "analytical": { morning: [10, 11], afternoon: [13, 14, 15], evening: [18, 19] },
  "collaborative": { morning: [10, 11, 12], afternoon: [14, 15], evening: [] },
  "administrative": { morning: [8, 9, 10], afternoon: [13, 14, 15], evening: [17, 18] },
  "physical": { morning: [7, 8, 9], afternoon: [], evening: [18, 19] },
  "learning": { morning: [8, 9, 10], afternoon: [15, 16, 17], evening: [20, 21] },
};

export function EnergyScheduler({ tasks = [] }: EnergySchedulerProps) {
  const [energyData, setEnergyData] = useState<EnergyEntry[]>([]);
  const [showingSuggestions, setShowingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<EnergySuggestion[]>([]);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [energyPattern, setEnergyPattern] = useState("morning-peak");

  // Load energy data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("energy_scheduler_data");
    if (saved) {
      setEnergyData(JSON.parse(saved));
    }
  }, []);

  // Save energy data
  useEffect(() => {
    localStorage.setItem("energy_scheduler_data", JSON.stringify(energyData));
  }, [energyData]);

  // Calculate average energy by time of day
  const averageEnergy = useMemo(() => {
    if (energyData.length === 0) return null;

    const byTime: Record<string, number[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    energyData.forEach(entry => {
      byTime[entry.time_of_day].push(entry.energy_level);
    });

    return {
      morning: byTime.morning.reduce((a, b) => a + b, 0) / (byTime.morning.length || 1),
      afternoon: byTime.afternoon.reduce((a, b) => a + b, 0) / (byTime.afternoon.length || 1),
      evening: byTime.evening.reduce((a, b) => a + b, 0) / (byTime.evening.length || 1),
    };
  }, [energyData]);

  // Generate scheduling suggestions
  const generateSuggestions = async () => {
    if (tasks.length === 0) {
      toast.info("Add some tasks to get scheduling suggestions");
      return;
    }

    const newSuggestions: EnergySuggestion[] = [];
    const today = new Date().toISOString().split("T")[0];

    tasks.forEach(task => {
      if (!task.date || task.date === today) {
        let suggestedTime = "09:00";
        let reasoning = "Default morning slot";
        let confidence = 0.5;

        // Consider priority
        const priorityWeight = {
          critical: 0.9,
          high: 0.8,
          medium: 0.6,
          low: 0.4,
          none: 0.5,
        }[task.priority as keyof typeof priorityWeight] || 0.5;

        // Consider energy data
        if (averageEnergy) {
          const peakTime = Object.entries(averageEnergy).reduce(
            (max, entry) => entry[1] > max.value ? { time: entry[0] as keyof typeof averageEnergy, value: entry[1] } : max,
            { time: "morning", value: 0 }
          );

          if (peakTime.time === "morning") {
            suggestedTime = "09:00";
            reasoning = "Your energy peaks in the morning";
            confidence = 0.8;
          } else if (peakTime.time === "afternoon") {
            suggestedTime = "14:00";
            reasoning = "Your energy is highest in the afternoon";
            confidence = 0.8;
          } else {
            suggestedTime = "19:00";
            reasoning = "Your energy peaks in the evening";
            confidence = 0.8;
          }
        }

        // Adjust for duration
        const duration = task.estimated_duration || 30;
        if (duration > 60) {
          reasoning += ` (${duration}m task)`;
          confidence *= 0.9;
        }

        newSuggestions.push({
          task_name: task.name,
          suggested_time: suggestedTime,
          reasoning,
          confidence: Math.min(0.95, priorityWeight * confidence),
        });
      }
    });

    setSuggestions(newSuggestions);
    setShowingSuggestions(true);
  };

  const addEnergyEntry = () => {
    const today = new Date().toISOString().split("T")[0];
    const newEntry: EnergyEntry = {
      id: Date.now(),
      date: today,
      time_of_day: "morning",
      energy_level: 5,
      task_type: "general",
      notes: "",
    };
    setEnergyData(prev => [...prev, newEntry]);
    toast.success("Energy entry added");
  };

  const flowProtection = useMemo(() => {
    // Calculate how much time is "protected" for focused work
    const peakHours = averageEnergy ? Object.entries(averageEnergy).filter(e => e[1] >= 7).length : 0;
    const protectedPercentage = (peakHours / 3) * 100;

    return {
      isProtected: protectedPercentage > 50,
      percentage: protectedPercentage,
      reason: protectedPercentage > 50 ? "Your energy peaks align with focused work hours" : "Consider adjusting your energy tracking to identify peak focus times",
    };
  }, [averageEnergy]);

  return (
    <div className="space-y-4">
      {/* Energy Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Energy Scheduler
          </CardTitle>
          <CardDescription>
            Optimize task timing based on your energy patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Energy Profile */}
            <div>
              <h4 className="font-medium mb-3">Your Energy Profile</h4>
              <div className="grid grid-cols-3 gap-4">
                {["morning", "afternoon", "evening"].map(time => (
                  <div key={time} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      {time.charAt(0).toUpperCase() + time.slice(1)}
                    </div>
                    <div className="flex items-center justify-center mb-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded-full ${
                            averageEnergy && averageEnergy[time as keyof typeof averageEnergy] >= i + 1
                              ? 'bg-yellow-400'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs">
                      {averageEnergy ? Math.round(averageEnergy[time as keyof typeof averageEnergy]) : "--"}/10
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flow Protection */}
            <Card className={`border-${flowProtection.isProtected ? 'green-500' : 'amber-500'}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Brain className={`h-5 w-5 ${flowProtection.isProtected ? 'text-green-500' : 'text-amber-500'}`} />
                  <div>
                    <h5 className="font-medium">
                      {flowProtection.isProtected ? "Protected Focus Time" : "Focus Time Opportunity"}
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {flowProtection.reason}
                    </p>
                    <div className="mt-2">
                      <Progress value={flowProtection.percentage} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Energy Tracking */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Quick Energy Check</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addEnergyEntry}>
                  Add Energy Entry
                </Button>
                <Button onClick={generateSuggestions} disabled={tasks.length === 0}>
                  Get Schedule Suggestions
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {showingSuggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Smart Scheduling Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium">{suggestion.task_name}</h5>
                      <div className="text-sm text-muted-foreground">
                        Suggested: {suggestion.suggested_time}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {suggestion.reasoning}
                      </div>
                    </div>
                    <Badge className={
                      suggestion.confidence > 0.8 ? "default" :
                      suggestion.confidence > 0.5 ? "secondary" : "outline"
                    }>
                      {Math.round(suggestion.confidence * 100)}% match
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Energy Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log Your Energy</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); addEnergyEntry(); }}>
            <div className="space-y-4">
              <div>
                <Label>Time of Day</Label>
                <Select defaultValue="morning" onValueChange={v => {
                  const latest = energyData[energyData.length - 1];
                  if (latest) {
                    setEnergyData(prev => prev.map(e => e.id === latest.id ? { ...e, time_of_day: v as any } : e));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 6pm)</SelectItem>
                    <SelectItem value="evening">Evening (6pm - 10pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block mb-2">
                  Energy Level: {energyData.length > 0 ? energyData[energyData.length - 1]?.energy_level || 5 : 5}/10
                </Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  defaultValue={[5]}
                  onValueChange={v => {
                    const latest = energyData[energyData.length - 1];
                    if (latest) {
                      setEnergyData(prev => prev.map(e => e.id === latest.id ? { ...e, energy_level: v[0] } : e));
                    }
                  }}
                />
              </div>

              <Button type="submit">Update Energy Log</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}