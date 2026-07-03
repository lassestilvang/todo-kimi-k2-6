"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { wsClient } from "@/lib/ws";
import type { TaskWithRelations } from "@/types";

interface PresenceUser {
  userId: number;
  userName: string;
  taskId?: number;
  lastSeen: string;
}

interface CollaborationContextType {
  connected: boolean;
  presence: PresenceUser[];
  activeTask: number | null;
  typingUsers: Set<number>;
  onTaskUpdate: (taskId: number, updates: Partial<TaskWithRelations>) => void;
  onTaskCreate: (task: TaskWithRelations) => void;
  onTaskDelete: (taskId: number) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function CollaborationProvider({
  children,
  userId,
  userName,
}: {
  children: React.ReactNode;
  userId: number;
  userName: string;
}) {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  // activeTask and typingUsers are placeholders for future real-time collaboration features
  const activeTask = null;
  const typingUsers = new Set<number>();
  const wsRef = useRef(wsClient);

  useEffect(() => {
    const wsUrl = process.env["NEXT_PUBLIC_WS_URL"] || "ws://localhost:3001";
    wsRef.current.connect(wsUrl);

    // Task update handler - placeholder for future real-time collaboration
    wsRef.current.subscribe("task_update", () => {});

    wsRef.current.subscribe("presence_change", (data) => {
      setPresence((prev) => {
        const filtered = prev.filter((p) => p.userId !== userId);
        return [...filtered, data];
      });
    });

    // Join presence
    wsRef.current.send({
      type: "presence_change",
      userId,
      userName,
    });

    setConnected(true);

    return () => {
      wsRef.current.disconnect();
    };
  }, [userId, userName]);

  const onTaskUpdate = (taskId: number, updates: Partial<TaskWithRelations>) => {
    wsRef.current.send({
      type: "task_update",
      taskId,
      data: updates,
    });
  };

  const onTaskCreate = (task: TaskWithRelations) => {
    wsRef.current.send({
      type: "task_created",
      taskId: task.id,
      data: task,
    });
  };

  const onTaskDelete = (taskId: number) => {
    wsRef.current.send({
      type: "task_deleted",
      taskId,
    });
  };

  return (
    <CollaborationContext.Provider
      value={{
        connected,
        presence,
        activeTask,
        typingUsers,
        onTaskUpdate,
        onTaskCreate,
        onTaskDelete,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error("useCollaboration must be used within CollaborationProvider");
  }
  return context;
}