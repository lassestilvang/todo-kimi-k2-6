"use client";

import { Calendar, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TaskScheduleProps {
  date: string;
  deadline: string;
  estimate: string;
  actualTime: string;
  onDateChange: (date: string) => void;
  onDeadlineChange: (deadline: string) => void;
  onEstimateChange: (estimate: string) => void;
  onActualTimeChange: (actualTime: string) => void;
}

export function TaskSchedule({
  date,
  deadline,
  estimate,
  actualTime,
  onDateChange,
  onDeadlineChange,
  onEstimateChange,
  onActualTimeChange,
}: TaskScheduleProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Deadline
          </Label>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => onDeadlineChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estimate (HH:mm)</Label>
          <Input
            type="time"
            value={estimate}
            onChange={(e) => onEstimateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Actual Time (HH:mm)</Label>
          <Input
            type="time"
            value={actualTime}
            onChange={(e) => onActualTimeChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}