"use client";

import { Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Label as LabelType } from "@/types";
import { cn } from "@/lib/utils";

interface TaskLabelsProps {
  labels: LabelType[];
  selectedLabels: number[];
  onToggleLabel: (labelId: number) => void;
}

export function TaskLabels({ labels, selectedLabels, onToggleLabel }: TaskLabelsProps) {
  if (labels.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        Labels
      </Label>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => onToggleLabel(label.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all border",
              selectedLabels.includes(label.id)
                ? "border-transparent text-white"
                : "border-input bg-background hover:bg-muted"
            )}
            style={
              selectedLabels.includes(label.id)
                ? { backgroundColor: label.color }
                : undefined
            }
          >
            <span>{label.icon}</span>
            {label.name}
          </button>
        ))}
      </div>
    </div>
  );
}