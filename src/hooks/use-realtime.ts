import { useState, useEffect, useRef, useCallback } from "react";

/**
 * WebSocket connection types
 */
interface RealtimeEvent {
  type: string;
  taskId?: number;
  userId?: number;
  userName?: string;
  [key: string]: unknown;
}

interface UseRealtimeReturn {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribeToTask: (taskId: number) => void;
  unsubscribeFromTask: (taskId: number) => void;
  lastEvent: RealtimeEvent | null;
}

/**
 * React hook for WebSocket real-time collaboration
 *
 * @param token - Authentication token for WebSocket connection
 * @returns Real-time utilities and connection state
 */
export function useRealtime(token?: string): UseRealtimeReturn {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const connect = useCallback(() => {
    if (!token) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/realtime?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          setLastEvent(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setTimeout(() => {
            connect();
          }, reconnectDelay * reconnectAttemptsRef.current);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const subscribeToTask = useCallback((taskId: number) => {
    if (connected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        taskId
      }));
    }
  }, [connected]);

  const unsubscribeFromTask = useCallback((taskId: number) => {
    if (connected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        taskId
      }));
    }
  }, [connected]);

  // Auto-connect when token is available
  useEffect(() => {
    if (token && !connected) {
      connect();
    }
    return () => disconnect();
  }, [token, connected, connect, disconnect]);

  return {
    connected,
    connect,
    disconnect,
    subscribeToTask,
    unsubscribeFromTask,
    lastEvent,
  };
}