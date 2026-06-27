"use client";

import { useState } from "react";
import { Share2, Copy, Check, UserPlus, Shield, ShieldOff, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/types";

// Extended type that includes user info
interface ShareWithUser {
  id: number;
  task_id: number;
  user_id: number;
  permission: "view" | "edit";
  share_token?: string;
  created_at: string;
  user?: { id: number; email: string; name: string | null };
}

interface ShareDialogProps {
  task: TaskWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shares?: any[];
  onShare?: (email: string, permission: "view" | "edit") => void;
  onRemoveShare?: (userId: number) => void;
}

export function ShareDialog({ task, open, onOpenChange, shares = [], onShare, onRemoveShare }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}/share/${task.id}`; // Use task ID as token for now

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  const handleShare = async () => {
    if (!email.trim() || !onShare) return;

    setIsSharing(true);
    try {
      await onShare(email, permission);
      toast.success(`Task shared with ${email}`);
      setEmail("");
    } catch {
      toast.error("Failed to share task");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (userId: number) => {
    if (!onRemoveShare) return;
    try {
      await onRemoveShare(userId);
      toast.success("Share removed");
    } catch {
      toast.error("Failed to remove share");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Task</DialogTitle>
          <DialogDescription>
            Share "{task.name}" with other users. They will receive access based on the permission level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share Link */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                placeholder="Generate share link"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Invite by Email */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                disabled={isSharing || !email.trim()}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Permission Level */}
          <div className="space-y-2">
            <Label>Permission</Label>
            <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "edit")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>Can view</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-green-500" />
                    <span>Can edit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shared Users */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label>Shared with</Label>
              <div className="space-y-2">
                {(shares as any).map((share: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{share.user?.name || share.user?.email || "Public share"}</p>
                        <p className="text-xs text-muted-foreground">{share.user?.email || "Public link"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={share.permission === "edit" ? "default" : "secondary"}>
                        {share.permission}
                      </Badge>
                      {onRemoveShare && share.user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveShare(share.user.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}