import { useEffect, useState, useCallback } from "react";
import { wsClient, type WSMessage } from "@/lib/ws";

interface UseWebSocketOptions {
  taskId?: number;
  onMessage?: (message: WSMessage) => void;
}

export function useWebSocket({ taskId, onMessage }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<Map<number, { userName: string; lastSeen: string }>>(new Map());

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    wsClient.connect(wsUrl);

    // Subscribe to task updates
    const unsubscribeTaskUpdate = wsClient.subscribe("task_update", (data) => {
      onMessage?.({ type: "task_update", data, timestamp: new Date().toISOString() });
    });

    // Subscribe to presence changes
    const unsubscribePresence = wsClient.subscribe("presence_change", (data) => {
      setPresence((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { userName: data.userName, lastSeen: data.lastSeen });
        return next;
      });
    });

    setIsConnected(wsClient["ws"]?.readyState === WebSocket.OPEN);

    return () => {
      unsubscribeTaskUpdate();
      unsubscribePresence();
      wsClient.disconnect();
    };
  }, [onMessage]);

  const sendTaskUpdate = useCallback((taskId: number, data: any) => {
    wsClient.send({ type: "task_update", taskId, data });
  }, []);

  const sendPresence = useCallback((userId: number, userName: string) => {
    wsClient.send({ type: "presence_change", userId, userName });
  }, []);

  return { isConnected, presence, sendTaskUpdate, sendPresence };
}
