"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Priority, Recurring } from "@/types";

interface TaskBasicInfoProps {
  name: string;
  description: string;
  notes: string;
  priority: Priority;
  recurring: Recurring;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onNotesChange: (notes: string) => void;
  onPriorityChange: (priority: Priority) => void;
  onRecurringChange: (recurring: Recurring) => void;
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-red-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "low", label: "Low", color: "bg-blue-500" },
  { value: "none", label: "None", color: "bg-gray-400" },
];

const recurringOptions: { value: Recurring; label: string }[] = [
  { value: "none", label: "No recurrence" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "weekdays", label: "Every weekday" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "custom", label: "Custom..." },
];

export function TaskBasicInfo({
  name,
  description,
  notes,
  priority,
  recurring,
  onNameChange,
  onDescriptionChange,
  onNotesChange,
  onPriorityChange,
  onRecurringChange,
}: TaskBasicInfoProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Task Name</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="What needs to be done?"
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add details..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Markdown supported)</Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add notes..."
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value as Priority)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>
                <span className={p.color}>{p.label}</span>
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Recurring</Label>
          <select
            value={recurring}
            onChange={(e) => onRecurringChange(e.target.value as Recurring)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {recurringOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}