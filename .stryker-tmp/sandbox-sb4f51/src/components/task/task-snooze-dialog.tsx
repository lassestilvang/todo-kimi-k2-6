// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Clock, Calendar as CalendarIcon, Sun, Moon, Coffee, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addHours, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types";

interface TaskSnoozeDialogProps {
  task: TaskWithRelations;
  onSnooze: (taskId: number, newDate: string, time?: string) => void;
  allTasks: TaskWithRelations[];
}

const SNOOZE_PRESETS = [
  { label: "Tomorrow", value: 1 },
  { label: "2 Days", value: 2 },
  { label: "3 Days", value: 3 },
  { label: "Next Week", value: 7 },
  { label: "2 Weeks", value: 14 },
];

export function TaskSnoozeDialog({ task, onSnooze, allTasks }: TaskSnoozeDialogProps) {
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Generate smart snooze suggestions based on task context
  const smartSuggestions = useMemo(() => {
    const suggestions: Array<{ label: string; date: string; time?: string; score: number; reason: string }> = [];
    const now = new Date();

    // Tomorrow suggestion (default)
    suggestions.push({
      label: "Tomorrow",
      date: format(addDays(now, 1), "yyyy-MM-dd"),
      time: undefined,
      score: 70,
      reason: "Standard snooze - fresh start tomorrow",
    });

    // Morning suggestion (9 AM) - high energy time
    const tomorrowMorning = addDays(now, 1);
    tomorrowMorning.setHours(9, 0, 0, 0);
    suggestions.push({
      label: "Tomorrow Morning",
      date: format(tomorrowMorning, "yyyy-MM-dd"),
      time: "09:00",
      score: 85,
      reason: "High energy time for focused work",
    });

    // Evening suggestion (after work hours)
    const tomorrowEvening = addDays(now, 1);
    tomorrowEvening.setHours(18, 0, 0, 0);
    suggestions.push({
      label: "Tomorrow Evening",
      date: format(tomorrowEvening, "yyyy-MM-dd"),
      time: "18:00",
      score: 65,
      reason: "Personal/administrative time",
    });

    // Based on task priority
    if (task.priority === "critical") {
      suggestions.push({
        label: "ASAP (in 2 hours)",
        date: format(addHours(now, 2), "yyyy-MM-dd"),
        time: format(addHours(now, 2), "HH:mm"),
        score: 95,
        reason: "Critical task - minimize delay",
      });
    }

    // Based on deadline proximity
    if (task.deadline) {
      const deadlineDate = parseISO(task.deadline);
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline <= 2) {
        suggestions.push({
          label: "Before Deadline",
          date: format(deadlineDate, "yyyy-MM-dd"),
          time: "12:00",
          score: 90,
          reason: `Completes before ${format(deadlineDate, "MMM d")} deadline`,
        });
      }
    }

    // Based on task load
    const tomorrowTasks = allTasks.filter(
      (t) => t.date === format(addDays(now, 1), "yyyy-MM-dd") && !t.completed
    );
    if (tomorrowTasks.length > 5) {
      suggestions.push({
        label: "Lighter Day (+2 days)",
        date: format(addDays(now, 2), "yyyy-MM-dd"),
        time: undefined,
        score: 75,
        reason: "Tomorrow is busy - find a lighter day",
      });
    }

    // Weekend suggestion for low-priority tasks
    if (task.priority === "low" || task.priority === "none") {
      const nextSaturday = addDays(now, (6 - now.getDay() + 7) % 7 || 7);
      suggestions.push({
        label: "This Weekend",
        date: format(nextSaturday, "yyyy-MM-dd"),
        time: "10:00",
        score: 60,
        reason: "Low priority - perfect for weekend catch-up",
      });
    }

    // Sort by score descending and limit to 5 suggestions
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [task, allTasks]);

  const handleSnooze = (date: string, time?: string) => {
    onSnooze(task.id, date, time);
  };

  const handleCustomDate = () => {
    if (customDate) {
      onSnooze(task.id, format(customDate, "yyyy-MM-dd"));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2" title="Snooze task">
          <Clock className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium text-sm">Snooze Task</span>
          </div>

          <div className="text-xs text-muted-foreground mb-1">
            AI suggests optimal times:
          </div>

          <div className="space-y-1">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors flex flex-col gap-1"
                onClick={() => handleSnooze(suggestion.date, suggestion.time)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {suggestion.label.includes("Morning") && <Sun className="h-3 w-3 text-amber-500" />}
                    {suggestion.label.includes("Evening") && <Moon className="h-3 w-3 text-blue-500" />}
                    {suggestion.label.includes("Weekend") && <Coffee className="h-3 w-3 text-green-500" />}
                    {suggestion.label.includes("ASAP") && <Clock className="h-3 w-3 text-red-500" />}
                    {!suggestion.label.includes("Morning") &&
                      !suggestion.label.includes("Evening") &&
                      !suggestion.label.includes("Weekend") &&
                      !suggestion.label.includes("ASAP") && <CalendarDays className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-medium text-sm">{suggestion.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round(suggestion.score)}%</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4">{suggestion.reason}</div>
              </button>
            ))}
          </div>

          <div className="border-t pt-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  Pick a specific date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={(date) => {
                    setCustomDate(date);
                    if (date) {
                      onSnooze(task.id, format(date, "yyyy-MM-dd"));
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook to add snooze functionality to tasks
export function useTaskSnooze() {
  const snoozeTask = async (taskId: number, newDate: string) => {
    const { updateTask } = await import("@/lib/actions/tasks");
    try {
      await updateTask(taskId, { date: newDate });
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  return { snoozeTask };
}