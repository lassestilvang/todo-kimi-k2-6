"use client";

import { useState } from "react";
import { Flame, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, subDays, isWithinInterval } from "date-fns";
import type { HabitStreak, HabitCompletion } from "@/types";

interface HabitTrackerProps {
  taskId: number;
  taskName: string;
  streak: HabitStreak | null;
  completions: HabitCompletion[];
  onToggleCompletion: (taskId: number, date: string) => void;
}

export function HabitTracker({
  taskId,
  taskName,
  streak,
  completions,
  onToggleCompletion,
}: HabitTrackerProps) {
  const [isToggling, setIsToggling] = useState(false);

  // Generate last 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, i);
    return format(date, "yyyy-MM-dd");
  });

  const completionsMap = new Map(completions.map((c) => [c.date, true]));

  const handleToggle = async (date: string) => {
    setIsToggling(true);
    try {
      await onToggleCompletion(taskId, date);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{taskName}</h3>
        {streak && streak.streak_count > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="font-bold">{streak.streak_count}</span>
          </div>
        )}
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Last 30 days</span>
        </div>

        <div className="grid grid-cols-10 gap-1">
          {days.map((date) => {
            const isCompleted = completionsMap.get(date);
            const isToday = date === format(today, "yyyy-MM-dd");

            return (
              <button
                key={date}
                className={cn(
                  "aspect-square rounded-md border flex items-center justify-center text-xs transition-colors",
                  isCompleted
                    ? "bg-green-500 text-white border-green-500"
                    : isToday
                    ? "border-dashed border-muted-foreground"
                    : "border-muted hover:bg-muted/50"
                )}
                onClick={() => handleToggle(date)}
                disabled={isToggling}
                title={date}
              >
                {isCompleted && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>Tip: Click on a day to mark it complete. Keep your streak going!</p>
      </div>
    </div>
  );
}