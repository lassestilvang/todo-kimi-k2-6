"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { List, Label as LabelType, Priority } from "@/types";

interface TaskSearchFiltersProps {
  lists: List[];
  labels: LabelType[];
  selectedListId: number | undefined;
  selectedLabelIds: number[];
  selectedPriority: Priority | undefined;
  onListChange: (listId: number | undefined) => void;
  onLabelChange: (labelId: number) => void;
  onPriorityChange: (priority: Priority | undefined) => void;
  onClear: () => void;
}

const priorityOptions: { value: Priority | "none"; label: string; color: string }[] = [
  { value: "none", label: "All Priorities", color: "" },
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-red-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "low", label: "Low", color: "bg-blue-500" },
];

export function TaskSearchFilters({
  lists,
  labels,
  selectedListId,
  selectedLabelIds,
  selectedPriority,
  onListChange,
  onLabelChange,
  onPriorityChange,
  onClear,
}: TaskSearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = [
    selectedListId !== undefined ? 1 : 0,
    selectedLabelIds.length,
    selectedPriority !== undefined && selectedPriority !== "none" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-1.5 h-5 min-w-5 text-[10px] px-1"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filters</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={onClear}
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>

            <div className="space-y-3">
              {/* List Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">List</Label>
                <select
                  className="w-full h-8 text-sm rounded-md border bg-background px-2"
                  value={selectedListId || "all"}
                  onChange={(e) => {
                    const value = e.target.value;
                    onListChange(value === "all" ? undefined : Number(value));
                  }}
                >
                  <option value="all">All Lists</option>
                  {lists.map((list) => (
                    <option key={list.id} value={String(list.id)}>
                      {list.emoji} {list.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <select
                  className="w-full h-8 text-sm rounded-md border bg-background px-2"
                  value={selectedPriority || "none"}
                  onChange={(e) => {
                    const value = e.target.value;
                    onPriorityChange(value === "none" ? undefined : value as Priority);
                  }}
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Labels Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">Labels</Label>
                <div className="max-h-48 overflow-y-auto">
                  {labels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No labels yet</p>
                  ) : (
                    <div className="space-y-1">
                      {labels.map((label) => {
                        const isSelected = selectedLabelIds.includes(label.id);
                        return (
                          <button
                            key={label.id}
                            className={`w-full flex items-center gap-2 text-xs rounded px-2 py-1.5 transition-colors ${
                              isSelected ? "bg-accent" : "hover:bg-muted"
                            }`}
                            onClick={() => onLabelChange(label.id)}
                          >
                            <span
                              className="w-4 h-4 rounded text-xs flex items-center justify-center text-white"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.icon}
                            </span>
                            <span className="flex-1 text-left truncate">
                              {label.name}
                            </span>
                            {isSelected && (
                              <span className="text-primary font-bold">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5">
          {selectedListId && (
            <Badge variant="secondary" className="text-xs h-5">
              List: {lists.find((l) => l.id === selectedListId)?.name}
            </Badge>
          )}
          {selectedLabelIds.map((id) => {
            const label = labels.find((l) => l.id === id);
            return label ? (
              <Badge
                key={id}
                variant="secondary"
                className="text-xs h-5"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </Badge>
            ) : null;
          })}
          {selectedPriority && selectedPriority !== "none" && (
            <Badge variant="secondary" className="text-xs h-5">
              {selectedPriority}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}