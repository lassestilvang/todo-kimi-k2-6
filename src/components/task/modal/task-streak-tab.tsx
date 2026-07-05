"use client";

import { toast } from "sonner";
import { Flame } from "lucide-react";
import type { TaskWithRelations } from "@/types";
import { StreakCalendar } from "@/components/task/streak-calendar";

interface TaskStreakTabProps {
  task: TaskWithRelations;
}

export function TaskStreakTab({ task }: TaskStreakTabProps) {
  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-medium">Habit Streak</h3>
      <p className="text-sm text-muted-foreground">
        Track your progress on this recurring task. Mark it complete each day to build your streak!
      </p>
      <StreakCalendar
        taskId={task.id}
        taskName={task.name}
        currentDate={task.date || ""}
        completedDates={task.completed ? [task.date || ""] : []}
        onDateToggle={async (date) => {
          // TODO: Implement habit tracking API integration
          toast.info("Habit tracking will be fully implemented with backend integration");
        }}
      />
    </div>
  );
}