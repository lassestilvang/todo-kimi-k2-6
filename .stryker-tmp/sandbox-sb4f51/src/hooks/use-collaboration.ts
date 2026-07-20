// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TaskWithRelations } from "@/types";

interface CollaborationEvent {
  type: "task_updated" | "task_created" | "task_deleted" | "comment_added" | "user_joined" | "user_left" | "cursor_position" | "typing_start" | "typing_stop";
  taskId?: number;
  task?: Partial<TaskWithRelations>;
  userId?: number;
  userName?: string;
  cursor?: { line: number; column: number };
  timestamp: Date;
}

interface PresenceUser {
  userId: number;
  userName: string;
  joinedAt: Date;
}

interface UseCollaborationProps {
  taskId?: number;
  userId?: number;
  userName?: string;
  enabled?: boolean;
}

export function useCollaboration({
  taskId,
  userId,
  userName,
  enabled = true,
}: UseCollaborationProps = {}) {
  const [connected, setConnected] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [cursorPositions, setCursorPositions] = useState<Record<number, { line: number; column: number }>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
          setConnected(true);

          // Notify server we've joined
          wsRef.current?.send(JSON.stringify({
            type: "user_joined",
            userId,
            userName: userName || `User ${userId}`,
            taskId,
          }));
        };

        wsRef.current.onmessage = (event) => {
          const data: CollaborationEvent = JSON.parse(event.data);
          handleMessage(data);
        };

        wsRef.current.onclose = () => {
          console.log("WebSocket disconnected");
          setConnected(false);

          // Attempt to reconnect
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, userId, userName, taskId]);

  const handleMessage = useCallback((data: CollaborationEvent) => {
    switch (data.type) {
      case "user_joined":
        if (data.userId && data.userName) {
          setPresenceUsers(prev => [
            ...prev,
            { userId: data.userId, userName: data.userName, joinedAt: new Date() }
          ]);
        }
        break;

      case "user_left":
        if (data.userId) {
          setPresenceUsers(prev => prev.filter(u => u.userId !== data.userId));
          setCursorPositions(prev => {
            const { [data.userId]: _, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "cursor_position":
        if (data.userId && data.cursor && taskId) {
          setCursorPositions(prev => ({
            ...prev,
            [data.userId]: data.cursor!
          }));
        }
        break;

      case "typing_start":
        if (data.userId) {
          setTypingUsers(prev => new Set([...prev, data.userId!]));
        }
        break;

      case "typing_stop":
        if (data.userId) {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId!);
            return newSet;
          });
        }
        break;
    }
  }, [taskId]);

  const sendCursorPosition = useCallback((cursor: { line: number; column: number }) => {
    if (!connected || !taskId || !userId) return;

    wsRef.current?.send(JSON.stringify({
      type: "cursor_position",
      taskId,
      userId,
      cursor,
    }));
  }, [connected, taskId, userId]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!connected || !taskId) return;

    wsRef.current?.send(JSON.stringify({
      type: isTyping ? "typing_start" : "typing_stop",
      taskId,
      userId,
    }));
  }, [connected, taskId, userId]);

  return {
    connected,
    presenceUsers,
    typingUsers,
    cursorPositions,
    sendCursorPosition,
    sendTypingStatus,
  };
}

// Hook for subscribing to task updates
export function useTaskUpdates(taskId: number, onUpdate: (task: TaskWithRelations) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.taskId === taskId && data.type === "task_updated") {
        onUpdate(data.task);
      }
    };

    // In a real app, this would use the WebSocket connection
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [taskId, onUpdate]);
}