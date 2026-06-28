"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast } from "date-fns";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  taskId: number;
  taskName: string;
  currentDate: string;
  completedDates: string[];
  onDateToggle?: (date: string) => void;
}

export function StreakCalendar({
  taskId,
  taskName,
  currentDate: _currentDate,
  completedDates,
  onDateToggle,
}: StreakCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const streakCount = calculateStreak(completedDates);
  const days = getDaysInMonth(currentMonth);

  const handleDateClick = (date: Date) => {
    if (!onDateToggle) return;
    const dateStr = format(date, "yyyy-MM-dd");
    onDateToggle(dateStr);
  };

  const isCompleted = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return completedDates.includes(dateStr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Habit Streak</h3>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="font-bold text-lg">{streakCount}</span>
        </div>
      </div>

      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{format(currentMonth, "MMMM yyyy")}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-xs font-medium text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month start */}
          {Array.from({ length: days[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const completed = isCompleted(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isPast(day);

            return (
              <button
                key={day.toString()}
                className={cn(
                  "h-8 rounded-lg text-sm transition-all",
                  "hover:bg-accent",
                  completed && "bg-green-100 dark:bg-green-900/20",
                  isCurrentDay && "ring-2 ring-primary",
                  !isPastDay && !isCurrentDay && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => isPastDay && handleDateClick(day)}
                disabled={!isPastDay && !isCurrentDay}
              >
                <span className={cn("block text-center", completed && "font-bold")}>
                  {format(day, "d")}
                </span>
                {completed && (
                  <div className="w-1 h-1 bg-green-500 rounded-full mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Complete this task daily to build your streak!</p>
        <p>Current streak: <span className="font-medium text-orange-600">{streakCount} day{streakCount !== 1 ? "s" : ""}</span></p>
      </div>
    </div>
  );
}

function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const sortedDates = completedDates.sort().reverse();
  let streak = 0;

  // Check if the most recent completion is today or yesterday
  const lastCompleted = sortedDates[0];
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  if (lastCompleted !== today && lastCompleted !== yesterday) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let expectedDate = today;
  for (const date of sortedDates) {
    if (date === expectedDate || (streak === 0 && (date === today || date === yesterday))) {
      streak++;
      const nextDate = new Date(expectedDate);
      nextDate.setDate(nextDate.getDate() - 1);
      expectedDate = format(nextDate, "yyyy-MM-dd");
    } else if (date !== expectedDate) {
      break;
    }
  }

  return streak;
}

function getDaysInMonth(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return eachDayOfInterval({ start, end });
}