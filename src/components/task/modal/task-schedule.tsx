'use client';

import { Calendar, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TaskScheduleProps {
  task: {
    date: string | null;
    deadline: string | null;
    estimate: string | null;
    notes: string | null;
  };
  lists: { id: number; name: string; emoji: string; color: string }[];
}

export function TaskSchedule({ task }: TaskScheduleProps) {
  const date = task.date || '';
  const deadline = task.deadline || '';
  const estimate = task.estimate || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Date
          </Label>
          <Input type="date" value={date} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Deadline
          </Label>
          <Input type="datetime-local" value={deadline} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estimate (HH:mm)</Label>
          <Input type="time" value={estimate} />
        </div>
        <div className="space-y-2">
          <Label>Actual Time (HH:mm)</Label>
          <Input type="time" value="" />
        </div>
      </div>
    </div>
  );
}
