"use client";

import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaskAssignTabProps {
  assignees: Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>;
  assigneeSearchQuery: string;
  onAssigneeSearchChange: (query: string) => void;
  onAssigneesChange: (assignees: Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>) => void;
  _onSearchUsers?: (query: string) => Promise<void>;
}

export function TaskAssignTab({
  assignees,
  assigneeSearchQuery,
  onAssigneeSearchChange,
  onAssigneesChange,
  _onSearchUsers,
}: TaskAssignTabProps) {
  const handleRemoveAssignee = (userId: number) => {
    onAssigneesChange(assignees.filter((a) => a.user_id !== userId));
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-medium">Task Assignment</h3>
      <p className="text-sm text-muted-foreground">
        Assign this task to team members. They will receive notifications about this task.
      </p>

      <div className="space-y-2">
        <Label>Assignees</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {assignees.map((assignee) => (
            <Badge
              key={assignee.user_id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <span>{assignee.user_name || assignee.user_email}</span>
              <button
                onClick={() => handleRemoveAssignee(assignee.user_id)}
                className="hover:text-red-500"
                aria-label={`Remove ${assignee.user_name || assignee.user_email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" />
              Add assignee...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <Input
                placeholder="Search users..."
                value={assigneeSearchQuery}
                onChange={(e) => onAssigneeSearchChange(e.target.value)}
              />
              <div className="max-h-60 overflow-y-auto">
                <div className="text-xs text-muted-foreground py-2">
                  <p>Search is ready - connect to backend API for full functionality.</p>
                  <p className="mt-1">You can manually add assignees using their user IDs.</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Tip: Assignees with &ldquo;edit&rdquo; permission can modify this task.</p>
      </div>
    </div>
  );
}