"use client";

import { useState } from "react";
import { Shield, UserMinus, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskShare } from "@/types";

interface TaskPermissionsProps {
  shares: TaskShare[];
  currentUserId?: number;
  onAddShare: (userId: number, email: string, permission: "view" | "edit") => void;
  onRemoveShare: (userId: number) => void;
  onPermissionChange: (userId: number, permission: "view" | "edit") => void;
}

export function TaskPermissions({ shares, currentUserId, onAddShare, onRemoveShare, onPermissionChange }: TaskPermissionsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<"view" | "edit">("view");

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    // In a real implementation, this would look up the user by email
    onAddShare(0, inviteEmail, invitePermission);
    setInviteEmail("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">People with access</h3>
        <div className="space-y-2">
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collaborators yet.</p>
          ) : (
            shares.map((share) => (
              <div key={share.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{share.user_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {share.permission === "edit" ? "Can edit" : "Can view"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentUserId !== share.user_id && (
                    <>
                      <Select
                        value={share.permission}
                        onValueChange={(v) => onPermissionChange(share.user_id, v as "view" | "edit")}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveShare(share.user_id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Invite people</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>Permission</Label>
              <Select value={invitePermission} onValueChange={(v) => v && setInvitePermission(v as "view" | "edit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleInvite} disabled={!inviteEmail.trim()} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Send Invite
          </Button>
        </div>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Permission Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div>
            <strong>View:</strong> Can see the task and comments, but cannot make changes.
          </div>
          <div>
            <strong>Edit:</strong> Can modify the task, add comments, and update progress.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}