"use client";

import { useState } from "react";
import { Share2, Plus, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { TaskShare } from "@/types";

interface TaskShareManagerProps {
  taskId: number;
  shares: TaskShare[];
  onShareAdded: (share: TaskShare) => void;
  onShareRemoved: (shareId: number) => void;
}

export function TaskShareManager({ taskId, shares, onShareAdded, onShareRemoved }: TaskShareManagerProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [isPublic, setIsPublic] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleAddShare = async () => {
    if (!email.trim()) return;

    setIsSharing(true);
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, userEmail: email, permission }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      onShareAdded(data.share);
      setEmail("");
      toast.success(`Shared with ${email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share task");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: number) => {
    try {
      const response = await fetch(`/api/shares?shareId=${shareId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove share");
      }

      onShareRemoved(shareId);
      toast.success("Share removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove share");
    }
  };

  const handleCreatePublicShare = async () => {
    setIsSharing(true);
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, permission, isPublic: true }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      onShareAdded(data.share);
      toast.success("Public share link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create public share");
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Share with others</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={permission} onValueChange={(v) => setPermission(v as "view" | "edit")}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddShare}
              disabled={isSharing || !email.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreatePublicShare}
            disabled={isSharing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Create public share link
          </Button>
        </div>
      </div>

      {shares.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Current shares</Label>
          <div className="mt-2 space-y-2">
            {shares.map((share: any) => (
              <Card key={share.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {share.user?.email || "Public share"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {share.permission.toUpperCase()} access
                      {share.share_token && " • Public link"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {share.share_token && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyShareLink(share.share_token!)}
                      >
                        {copiedToken === share.share_token ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}