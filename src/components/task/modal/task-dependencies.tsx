"use client";

import { Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TaskWithRelations } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskDependenciesProps {
  allTasks: TaskWithRelations[];
  selectedBlocks: number[];
  onToggleBlocker: (taskId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TaskDependencies({
  allTasks,
  selectedBlocks,
  onToggleBlocker,
  searchQuery,
  onSearchChange,
}: TaskDependenciesProps) {
  const availableBlockingTasks = (allTasks || [])
    .filter((t) => !t.completed && t.id)
    .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Link className="h-3.5 w-3.5" />
        Blocked by
      </Label>
      <Popover>
        <PopoverTrigger>
          <Button
            variant="outline"
            className="w-full justify-start"
          >
            {selectedBlocks.length > 0
              ? `${selectedBlocks.length} task${selectedBlocks.length > 1 ? "s" : ""} blocking`
              : "Add blocking task"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto">
              {availableBlockingTasks.map((t) => (
                <button
                  key={t.id}
                  className={cn(
                    "w-full text-left text-sm rounded px-2 py-1.5 hover:bg-accent",
                    selectedBlocks.includes(t.id) && "bg-accent"
                  )}
                  onClick={() => onToggleBlocker(t.id)}
                >
                  <div className="font-medium truncate">{t.name}</div>
                  {t.date && (
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(t.date), "MMM d")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {selectedBlocks.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedBlocks.map((id) => {
            const blockedTask = allTasks?.find((t) => t.id === id);
            return blockedTask ? (
              <Badge key={id} variant="secondary">
                {blockedTask.name}
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}