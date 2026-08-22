/**
 * WebSocket Server for Real-time Collaboration
 * Handles real-time updates for task collaboration
 */

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getDb } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';

// Connection management
interface ClientInfo {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  taskId?: number;
  subscribedChannels: Set<string>;
  lastPing: number;
}

// Extended WebSocket with custom properties
interface ExtendedWebSocket extends WebSocket {
  clientId?: string;
  taskId?: number;
  userId: number;
  userName: string;
  userEmail: string;
  subscribedChannels?: Set<string>;
}

class WSHub {
  private clients: Map<string, ExtendedWebSocket> = new Map();
  private channels: Map<string, Set<string>> = new Map();

  addClient(ws: ExtendedWebSocket, taskId?: number): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    ws.clientId = clientId;
    ws.taskId = taskId;
    ws.subscribedChannels = new Set();

    this.clients.set(clientId, ws);

    // Subscribe to task channel
    if (taskId) {
      this.subscribeToChannel(clientId, `task:${taskId}`);
      this.subscribeToChannel(clientId, 'global');
    }

    // Subscribe to user's workspace channels
    this.subscribeToChannel(clientId, `user:${ws.userId}`);
    this.subscribeToChannel(
      clientId,
      `workspace:${taskId ? Math.floor(Math.random() * 1000) : 1}`
    );

    // Update presence
    this.broadcastPresence(clientId, ws.userId, ws.userName, taskId, 'joined');

    return clientId;
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    client.subscribedChannels?.forEach(channel => {
      this.channels.get(channel)?.delete(clientId);
    });

    this.clients.delete(clientId);
    this.broadcastPresence(
      clientId,
      client.userId,
      client.userName,
      client.taskId,
      'left'
    );
  }

  subscribeToChannel(clientId: string, channel: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)?.add(clientId);
    // Also update client's subscribed channels
    const client = this.clients.get(clientId);
    if (client?.subscribedChannels) {
      client.subscribedChannels.add(channel);
    }
  }

  unsubscribeFromChannel(clientId: string, channel: string) {
    this.channels.get(channel)?.delete(clientId);
    const client = this.clients.get(clientId);
    client?.subscribedChannels?.delete(channel);
  }

  broadcastToChannel(
    channel: string,
    message: { type: string; [key: string]: unknown }
  ) {
    const clients = this.channels.get(channel);
    if (!clients) return;

    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    clients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client?.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  broadcastPresence(
    clientId: string,
    userId: number,
    userName: string,
    taskId?: number,
    action: 'joined' | 'left' | 'updated' = 'joined'
  ) {
    this.broadcastToChannel('global', {
      type: 'presence_change',
      event: action,
      userId,
      userName,
      taskId,
    });
  }

  pingClients() {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
        (client as any).lastPing = Date.now();
      }
    });
  }

  handleClientMessage(clientId: string, data: string) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);
      if (!client) return;

      switch (message.type) {
        case 'task_update':
          // Broadcast task update to all listening clients
          if (message.taskId) {
            this.broadcastToChannel(`task:${message.taskId}`, {
              type: 'task_update',
              taskId: message.taskId,
              ...message,
            });
          }
          break;

        case 'typing':
          if (message.taskId) {
            this.broadcastToChannel(`task:${message.taskId}`, {
              type: 'typing',
              userId: client.userId,
              userName: client.userName,
              taskId: message.taskId,
            });
          }
          break;

        case 'presence_update':
          this.broadcastPresence(
            clientId,
            client.userId,
            client.userName,
            client.taskId,
            'updated'
          );
          break;

        default:
          // Ignore unknown message types
          break;
      }
    } catch (error) {
      logError(
        'Failed to parse WebSocket message',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  getConnectionCount() {
    return this.clients.size;
  }
}

export const wsHub = new WSHub();

// Server instance (can be used in standalone server)
let server: ReturnType<typeof createServer> | null = null;

export function startWebSocketServer(port = 8080) {
  if (server) {
    logInfo('WebSocket server already running');
    return;
  }

  const httpServer = createServer();
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: ExtendedWebSocket, request?: any) => {
    const url = request?.url || '';
    const taskIdMatch = url.split('taskId=')[1]?.split('&')[0];
    const taskId = taskIdMatch ? parseInt(taskIdMatch, 10) : undefined;

    // Extract user info from request headers or query params
    const token = new URLSearchParams(
      url.includes('?') ? url.split('?')[1] : ''
    ).get('token');

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // In a real app, validate the token and get user info
    // For now, use placeholder values
    const clientId = wsHub.addClient(ws, taskId);
    (ws as any).userId = 1;
    (ws as any).userName = 'User';
    (ws as any).userEmail = 'user@example.com';

    ws.on('close', () => {
      wsHub.removeClient(clientId);
    });

    ws.on('message', (data: Buffer) => {
      wsHub.handleClientMessage(clientId, data.toString());
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    // Authenticate via token
    const url = request.url || '';
    const params = new URLSearchParams(
      url.includes('?') ? url.split('?')[1] : ''
    );
    const token = params.get('token');

    if (!token) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  });

  server = httpServer.listen(port, () => {
    logInfo(`WebSocket server listening on port ${port}`);
  });

  // Ping clients periodically
  setInterval(() => {
    wsHub.pingClients();
  }, 30000);

  return httpServer;
}

export function stopWebSocketServer() {
  if (server) {
    server.close(() => {
      logInfo('WebSocket server stopped');
    });
    server = null;
  }
}
