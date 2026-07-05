"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/types";

interface TaskCollaborateTabProps {
  task: TaskWithRelations;
}

export function TaskCollaborateTab({ task }: TaskCollaborateTabProps) {
  const handleGenerateShareLink = () => {
    const shareLink = `${window.location.origin}/share/${task.id}-${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied to clipboard!");
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-medium">Collaboration</h3>
      <p className="text-sm text-muted-foreground">
        Share this task with team members and collaborate in real-time.
      </p>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Share with Users</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter user email..."
                className="flex-1"
              />
              <Select
                value="view"
                onValueChange={() => {}}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm">Invite</Button>
            </div>

            <div className="space-y-2">
              <Label>Current Collaborators</Label>
              <div className="flex flex-wrap gap-2">
                {task.assignee && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span>{task.assignee.name || task.assignee.email}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGenerateShareLink}
          >
            Generate Share Link
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Anyone with this link can view the task
          </p>
        </div>
      </div>
    </div>
  );
}