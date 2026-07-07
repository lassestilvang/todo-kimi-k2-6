 
"use client";

import { useState } from "react";
import { Move, Tag, Trash2, TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BulkActionsMenuProps {
  selectedTasks: number[];
  onAction: () => void;
  onRefresh: () => void;
}

export function BulkActionsMenu({ selectedTasks, onAction, onRefresh }: BulkActionsMenuProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [isLabeling, setIsLabeling] = useState(false);
  const [listIdInput, setListIdInput] = useState("");
  const [labelIdInput, setLabelIdInput] = useState("");

  const handleMove = async () => {
    if (!listIdInput) return;
    const listId = parseInt(listIdInput);
    if (isNaN(listId)) {
      toast.error("Please enter a valid list ID");
      return;
    }
    try {
      const { bulkUpdateTasks } = await import("@/lib/actions/tasks");
      await bulkUpdateTasks(selectedTasks, { list_id: listId });
      toast.success(`Moved ${selectedTasks.length} task(s)`);
      onAction();
      onRefresh();
    } catch {
      toast.error("Failed to move tasks");
    } finally {
      setIsMoving(false);
      setListIdInput("");
    }
  };

  const handleLabel = async () => {
    if (!labelIdInput) return;
    const labelIds = labelIdInput
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));
    if (labelIds.length === 0) {
      toast.error("Please enter valid label IDs");
      return;
    }
    try {
      const { bulkUpdateTasks } = await import("@/lib/actions/tasks");
      await bulkUpdateTasks(selectedTasks, { label_ids: labelIds });
      toast.success(`Labeled ${selectedTasks.length} task(s)`);
      onAction();
      onRefresh();
    } catch {
      toast.error("Failed to label tasks");
    } finally {
      setIsLabeling(false);
      setLabelIdInput("");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.length} task(s)?`)) return;
    try {
      const { bulkDeleteTasks, getTasksByIds } = await import("@/lib/actions/tasks");
      // Store tasks for potential undo
      const tasksToDelete = await getTasksByIds(selectedTasks);
      await bulkDeleteTasks(selectedTasks);
      toast.success(`Deleted ${selectedTasks.length} task(s)`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const { createTask } = await import("@/lib/actions/tasks");
              // Recreate all tasks
              for (const task of tasksToDelete) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const restoreData: any = {
                  name: task.name,
                  priority: task.priority,
                };
                if (task.description) restoreData.description = task.description;
                if (task.notes) restoreData.notes = task.notes;
                if (task.list_id) restoreData.list_id = task.list_id;
                if (task.date) restoreData.date = task.date;
                if (task.deadline) restoreData.deadline = task.deadline;
                if (task.recurring) restoreData.recurring = task.recurring;
                if (task.recurring_config) restoreData.recurring_config = task.recurring_config;
                // Recreate subtasks
                if (task.subtasks?.length) {
                  restoreData.subtasks = task.subtasks.map((s) => s.name);
                }
                await createTask(restoreData);
              }
              onRefresh();
              toast.success("Tasks restored");
            } catch {
              toast.error("Failed to restore tasks");
            }
          },
        },
      });
      onAction();
      onRefresh();
    } catch {
      toast.error("Failed to delete tasks");
    }
  };

  const handlePriorityChange = async (priority: "critical" | "high" | "medium" | "low") => {
    try {
      const { bulkUpdateTasks } = await import("@/lib/actions/tasks");
      await bulkUpdateTasks(selectedTasks, { priority });
      toast.success(`Updated priority on ${selectedTasks.length} task(s)`);
      onAction();
      onRefresh();
    } catch {
      toast.error("Failed to update priority");
    }
  };

  if (isMoving) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="List ID"
          value={listIdInput}
          onChange={(e) => setListIdInput(e.target.value)}
          className="w-20"
        />
        <Button size="sm" onClick={handleMove}>
          Move
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsMoving(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  if (isLabeling) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Label IDs (1,2,3)"
          value={labelIdInput}
          onChange={(e) => setLabelIdInput(e.target.value)}
          className="w-32"
        />
        <Button size="sm" onClick={handleLabel}>
          Label
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsLabeling(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          Actions
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setIsMoving(true)}>
          <Move className="h-3.5 w-3.5 mr-2" />
          Move
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsLabeling(true)}>
          <Tag className="h-3.5 w-3.5 mr-2" />
          Add Labels
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePriorityChange("critical")}>
          <TrendingUp className="h-3.5 w-3.5 mr-2 text-red-500" />
          Set Critical
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePriorityChange("high")}>
          <TrendingUp className="h-3.5 w-3.5 mr-2 text-orange-500" />
          Set High
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>
          <TrendingUp className="h-3.5 w-3.5 mr-2 text-amber-500" />
          Set Medium
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePriorityChange("low")}>
          <TrendingUp className="h-3.5 w-3.5 mr-2 text-blue-500" />
          Set Low
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-500">
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}