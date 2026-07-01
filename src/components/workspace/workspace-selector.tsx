"use client";

import { useState } from "react";
import { ChevronDown, Plus, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Workspace } from "@/types";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace | null) => void;
  onCreateWorkspace: () => void;
}

export function WorkspaceSelector({ workspaces, currentWorkspace, onWorkspaceChange, onCreateWorkspace }: WorkspaceSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" className="justify-between w-48">
          <span className="truncate">
            {currentWorkspace ? currentWorkspace.name : "Select Workspace"}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem onClick={() => onWorkspaceChange(null)}>
          <span className="text-muted-foreground">Personal (No workspace)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id} onClick={() => onWorkspaceChange(ws)}>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{ws.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {ws.description || "No description"}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateWorkspace}>
          <Plus className="h-4 w-4 mr-2" />
          <span>New Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceInvite({ workspaceId }: { workspaceId: number }) {
  const [email, setEmail] = useState("");

  const handleInvite = async () => {
    if (!email) return;
    // In a real implementation, this would call the API
    console.log("Inviting", email, "to workspace", workspaceId);
    setEmail("");
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Invite Members</h4>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <Button size="sm" onClick={handleInvite} disabled={!email}>
          Invite
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Invited users will receive an email with instructions to join.
      </p>
    </div>
  );
}

export function WorkspacePermissions({ permission }: { permission: "view" | "edit" | "admin" | null }) {
  const permissionLabels = {
    view: "Viewer",
    edit: "Editor",
    admin: "Admin",
  };

  const permissionColors = {
    view: "bg-blue-100 text-blue-800",
    edit: "bg-green-100 text-green-800",
    admin: "bg-purple-100 text-purple-800",
  };

  if (!permission) {
    return <Badge variant="secondary">No Access</Badge>;
  }

  return (
    <Badge className={permissionColors[permission]}>
      <Shield className="h-3 w-3 mr-1" />
      {permissionLabels[permission]}
    </Badge>
  );
}