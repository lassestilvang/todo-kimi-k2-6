export interface WSMessage {
  type: "task_update" | "task_created" | "task_deleted" | "presence_change" | "typing";
  taskId?: number;
  userId?: number;
  userName?: string;
  data?: any;
  timestamp: string;
}

export interface PresenceUser {
  userId: number;
  userName: string;
  taskId?: number;
  lastSeen: string;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        const listeners = this.listeners.get(message.type);
        if (listeners) {
          listeners.forEach((callback) => callback(message.data));
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect(url);
        }, 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const callbacks = this.listeners.get(type)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }

  send(message: Omit<WSMessage, "timestamp">) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    }
  }
}

export const wsClient = new WebSocketClient();
