"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";

interface PresenceState {
  userId: number;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  status: "online" | "away" | "offline";
  currentTaskId?: number;
  lastSeen: string;
}

interface PresenceIndicatorProps {
  users: PresenceState[];
  currentUserId?: number;
}

export function PresenceIndicator({ users, currentUserId }: PresenceIndicatorProps) {
  const onlineUsers = users.filter((u) => u.status === "online");
  const awayUsers = users.filter((u) => u.status === "away");

  if (onlineUsers.length === 0 && awayUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 3).map((user) => (
          <div key={user.userId} className="relative">
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {(user.userName || user.userEmail).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border-2 border-background" />
          </div>
        ))}
        {onlineUsers.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
            +{onlineUsers.length - 3}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {onlineUsers.length} online{awayUsers.length > 0 && ` • ${awayUsers.length} away`}
      </span>
    </div>
  );
}

export function usePresence(userId: number): PresenceState | undefined {
  const [presence, setPresence] = useState<PresenceState | undefined>();

  useEffect(() => {
    // In a real implementation, this would connect to a WebSocket server
    // For now, we'll simulate presence
    const interval = setInterval(() => {
      setPresence({
        userId,
        userName: "Current User",
        userEmail: "user@example.com",
        avatarUrl: null,
        status: "online",
        lastSeen: new Date().toISOString(),
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  return presence;
}