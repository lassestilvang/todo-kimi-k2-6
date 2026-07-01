"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, UserPlus } from "lucide-react";
import type { TaskWithRelations } from "@/types";

interface TaskCollaborationProps {
  task?: TaskWithRelations;
  onUpdate: (assignees: Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>) => void;
}

export function TaskCollaboration({ task, onUpdate }: TaskCollaborationProps) {
  const [assignees, setAssignees] = useState<Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>>(
    task?.assignee ? [{
      user_id: task.assignee.id,
      user_email: task.assignee.email,
      user_name: task.assignee.name,
      permission: "edit"
    }] : []
  );
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [newAssigneeEmail, setNewAssigneeEmail] = useState("");
  const [newAssigneePermission, setNewAssigneePermission] = useState<"view" | "edit">("view");

  const handleAddAssignee = () => {
    if (!newAssigneeEmail.trim()) return;

    // Mock user lookup - in real implementation, this would call an API
    const mockUser = {
      user_id: Math.floor(Math.random() * 10000),
      user_email: newAssigneeEmail,
      user_name: newAssigneeEmail.split('@')[0],
      permission: newAssigneePermission
    };

    setAssignees([...assignees, mockUser]);
    setNewAssigneeEmail("");
    onUpdate([...assignees, mockUser]);
  };

  const handleRemoveAssignee = (userId: number) => {
    const newAssignees = assignees.filter(a => a.user_id !== userId);
    setAssignees(newAssignees);
    onUpdate(newAssignees);
  };

  const handlePermissionChange = (userId: number, permission: "view" | "edit") => {
    const newAssignees = assignees.map(a =>
      a.user_id === userId ? { ...a, permission } : a
    );
    setAssignees(newAssignees);
    onUpdate(newAssignees);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Task Assignment</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Assign this task to team members. They will receive notifications about this task.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user email..."
              value={newAssigneeEmail}
              onChange={(e) => setNewAssigneeEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              value={newAssigneePermission}
              onValueChange={(v: "view" | "edit") => setNewAssigneePermission(v)}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleAddAssignee}
              disabled={!newAssigneeEmail.trim()}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Current Assignees</Label>
            <div className="flex flex-wrap gap-2">
              {assignees.map((assignee) => (
                <Badge
                  key={assignee.user_id}
                  variant="secondary"
                  className="flex items-center gap-1.5"
                >
                  <span className="font-medium">
                    {assignee.user_name || assignee.user_email}
                  </span>
                  <span className="text-xs opacity-60">
                    ({assignee.permission})
                  </span>
                  <button
                    onClick={() => handleRemoveAssignee(assignee.user_id)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {assignees.length === 0 && (
                <p className="text-sm text-muted-foreground">No assignees yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <h3 className="font-medium mb-2">Share Link</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Generate a shareable link for this task. Anyone with the link can view it.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const shareLink = `${window.location.origin}/share/task-${task?.id || 'new'}-${Math.random().toString(36).substr(2, 9)}`;
            navigator.clipboard.writeText(shareLink);
          }}
        >
          Generate Share Link
        </Button>
      </div>
    </div>
  );
}