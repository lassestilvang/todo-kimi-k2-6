"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Settings, Share2, Shield, Crown, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WorkspaceMembers } from "@/components/task/workspace-members";
import { toast } from "sonner";

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
}

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

interface WorkspacePageProps {
  params: { id: string };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter();
  const workspaceId = parseInt(params.id, 10);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<WorkspaceMember | null>(null);

  useEffect(() => {
    fetchWorkspace();
    fetchMembers();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        setCurrentUser(data.find((m: WorkspaceMember) => m.user_id === 1)); // Demo user
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberChange = (updatedMembers: WorkspaceMember[]) => {
    setMembers(updatedMembers);
    setCurrentUser(updatedMembers.find((m) => m.user_id === 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Workspace Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The workspace you're looking for doesn't exist or you don't have access.
        </p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    );
  }

  const isOwner = currentUser?.role === "owner";
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <h1 className="text-xl font-bold">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-sm text-muted-foreground">
                {workspace.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace Info */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Workspace Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{members.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(workspace.created_at).toLocaleDateString()}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Owner</span>
                  </div>
                )}
                {isAdmin && !isOwner && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Admin</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Member Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {members.filter(m => m.role === "owner").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Owners</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {members.filter(m => m.role === "admin").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {members.filter(m => m.role === "member").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {members.filter(m => m.role === "viewer").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Viewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members Section */}
        <div className="mt-8">
          <WorkspaceMembers
            workspaceId={workspaceId}
            currentUserId={1}
            members={members}
            onMembersChange={handleMemberChange}
          />
        </div>
      </div>
    </div>
  );
}