"use client";

import { useState } from "react";
import { Share2, Copy, UserPlus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { User } from "@/types";

interface TaskSharingDialogProps {
  taskId: number;
  assignees: { user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }[];
  users: User[];
  onShare: (taskId: number, userId: number, permission: "view" | "edit") => void;
  onUnshare: (taskId: number, userId: number) => void;
  onGenerateShareLink: (taskId: number) => string;
}

export function TaskSharingDialog({
  taskId,
  assignees,
  users,
  onShare,
  onUnshare,
  onGenerateShareLink,
}: TaskSharingDialogProps) {
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!selectedUser) return;
    setIsSharing(true);
    try {
      await onShare(taskId, selectedUser, permission);
      setSelectedUser(null);
      toast.success("Task shared successfully");
    } catch (error) {
      toast.error("Failed to share task");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const shareLink = onGenerateShareLink(taskId);
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied to clipboard");
  };

  const shareLink = onGenerateShareLink(taskId);

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
          <DialogDescription>
            Share this task with other users or generate a shareable link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Assignees */}
          {assignees.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-2">People with access</Label>
              <div className="space-y-2">
                {assignees.map((assignee) => (
                  <div key={assignee.user_id} className="flex items-center justify-between">
                    <div className="text-sm">
                      {assignee.user_name || assignee.user_email}
                      <span className="text-muted-foreground text-xs ml-2">({assignee.permission})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnshare(taskId, assignee.user_id)}
                      className="text-destructive text-xs h-6"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share with User */}
          <div>
            <Label className="text-xs font-medium mb-2">Share with someone</Label>
            <div className="space-y-3">
              <Select value={selectedUser?.toString()} onValueChange={(v) => setSelectedUser(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => !assignees.some((a) => a.user_id === u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "edit")}>
                <SelectTrigger>
                  <SelectValue placeholder="Permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleShare} disabled={!selectedUser || isSharing} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                {isSharing ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <Label className="text-xs font-medium mb-2">Share link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                placeholder="Generate share link"
                className="flex-1 font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Anyone with this link can access the task.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}