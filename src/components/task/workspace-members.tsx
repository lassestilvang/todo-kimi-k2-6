"use client";

import { useState, useEffect } from "react";
import { Users, User, Shield, ShieldCheck, Crown, UserPlus, X, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WorkspaceMember {
  id: number;
  user_id: number;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
  user?: {
    id: number;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface WorkspaceMemberProps {
  workspaceId: number;
  currentUserId: number;
  members: WorkspaceMember[];
  onMembersChange?: (members: WorkspaceMember[]) => void;
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  admin: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  member: "bg-green-500/10 text-green-700 dark:text-green-300",
  viewer: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <Users className="h-3 w-3" />,
  viewer: <User className="h-3 w-3" />,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function WorkspaceMembers({
  workspaceId,
  currentUserId,
  members,
  onMembersChange,
}: WorkspaceMemberProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "member" | "viewer">("member");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const isOwner = (member: WorkspaceMember) => member.role === "owner";
  const currentUser = members.find((m) => m.user_id === currentUserId);
  const canManageRoles = currentUser?.role === "owner" || currentUser?.role === "admin";

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
        }),
      });

      if (response.ok) {
        const updatedMember = await response.json();
        const updatedMembers = [...members, updatedMember];
        onMembersChange?.(updatedMembers);
        toast.success("Member added successfully");
        setShowAddDialog(false);
        setNewMemberEmail("");
        setNewMemberRole("member");
      } else {
        throw new Error("Failed to add member");
      }
    } catch (error) {
      toast.error("Failed to add member");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const updatedMembers = members.filter((m) => m.id !== member.id);
        onMembersChange?.(updatedMembers);
        toast.success("Member removed");
      } else {
        throw new Error("Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
      console.error(error);
    }
  };

  const handleRoleChange = async (member: WorkspaceMember, newRole: string) => {
    if (!canManageRoles) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const updatedMember = await response.json();
        const updatedMembers = members.map((m) =>
          m.id === member.id ? updatedMember : m
        );
        onMembersChange?.(updatedMembers);
        toast.success("Role updated");
      } else {
        throw new Error("Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
      console.error(error);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/workspace/${workspaceId}/invite`;
    navigator.clipboard.writeText(link);
    setCopiedId(workspaceId);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Invite link copied to clipboard");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length > 1
      ? parts[0][0] + parts[1][0]
      : name[0].toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Workspace Members</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={copyInviteLink}>
              {copiedId === workspaceId ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="member@example.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newMemberRole}
                      onValueChange={(value) => setNewMemberRole(value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canManageRoles && (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                          </>
                        )}
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddMember} disabled={isLoading || !newMemberEmail.trim()}>
                    {isLoading ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members yet. Invite someone to join!
            </p>
          ) : (
            members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatar_url || ""} />
                      <AvatarFallback>
                        {getInitials(member.user?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.user?.name || "Unknown User"}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrentUser && canManageRoles && (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member, value)}
                        >
                          <SelectTrigger className="h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {isOwner(member) ? (
                              <SelectItem value="owner" disabled>
                                <ShieldCheck className="h-3 w-3 mr-2" />
                                Owner
                              </SelectItem>
                            ) : (
                              <SelectItem value="owner">
                                <Crown className="h-3 w-3 mr-2" />
                                Owner
                              </SelectItem>
                            )}
                            {!isOwner(member) && canManageRoles && (
                              <>
                                <SelectItem value="admin">
                                  <Shield className="h-3 w-3 mr-2" />
                                  Admin
                                </SelectItem>
                                <SelectItem value="member">
                                  <Users className="h-3 w-3 mr-2" />
                                  Member
                                </SelectItem>
                                <SelectItem value="viewer">
                                  <User className="h-3 w-3 mr-2" />
                                  Viewer
                                </SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {!isCurrentUser && !canManageRoles && (
                      <Badge className={roleColors[member.role]}>
                        {roleIcons[member.role]}
                        <span className="ml-1">{roleLabels[member.role]}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}