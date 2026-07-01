/**
 * WebSocket Server for Real-time Collaboration
 * Handles task updates, comments, presence tracking, and cursor positions
 */

import { WebSocketServer } from "ws";
import type { TaskWithRelations, User } from "@/types";

interface CollaborationEvent {
  type: "task_updated" | "task_created" | "task_deleted" | "comment_added" | "user_joined" | "user_left" | "cursor_position" | "typing_start" | "typing_stop";
  taskId?: number;
  task?: Partial<TaskWithRelations>;
  userId?: number;
  userName?: string;
  cursor?: { line: number; column: number };
  timestamp: Date;
}

interface ClientData {
  userId: number;
  userName: string;
  taskId?: number;
  cursor?: { line: number; column: number };
}

const PORT = parseInt(process.env.WS_PORT || "3001");
const clients = new Map<any, ClientData>();

export function createWebSocketServer() {
  const wss = new WebSocketServer({ port: PORT });

  console.log(`WebSocket server started on port ${PORT}`);

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(data, wss, ws);
      } catch (error) {
        console.error("Invalid message received:", error);
      }
    });

    ws.on("close", () => {
      const clientData = clients.get(ws);
      if (clientData) {
        console.log(`Client disconnected: ${clientData.userName}`);
        broadcastPresence(clientData.userId, clientData.userName, false, wss);
        clients.delete(ws);
      }
    });
  });

  return wss;
}

function handleMessage(data: CollaborationEvent, wss: WebSocketServer, ws: any) {
  switch (data.type) {
    case "user_joined":
      clients.set(ws, { userId: data.userId!, userName: data.userName! });
      broadcastPresence(data.userId!, data.userName!, true, wss);
      break;
    case "cursor_position":
      const clientData = clients.get(ws);
      if (clientData) {
        clientData.cursor = data.cursor;
        broadcastCursorPosition(clientData.userId, clientData.taskId, data.cursor, wss);
      }
      break;
    case "typing_start":
    case "typing_stop":
      broadcastTyping(data.userId!, data.taskId, data.type === "typing_start", wss);
      break;
    default:
      broadcastMessage(data, wss);
  }
}

// Helper function to send generic messages
function broadcastMessage(data: CollaborationEvent, wss: WebSocketServer) {
  const message = JSON.stringify({ type: data.type, payload: data });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to send task updates
export function broadcastTaskUpdate(task: TaskWithRelations, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: "task_updated",
    taskId: task.id,
    task: task,
    timestamp: new Date(),
  };

  const message = JSON.stringify({ type: "task_updated", payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to send task creation events
export function broadcastTaskCreated(task: TaskWithRelations, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: "task_created",
    taskId: task.id,
    task: task,
    timestamp: new Date(),
  };

  const message = JSON.stringify({ type: "task_created", payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to send task deletion events
export function broadcastTaskDeleted(taskId: number, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: "task_deleted",
    taskId: taskId,
    timestamp: new Date(),
  };

  const message = JSON.stringify({ type: "task_deleted", payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to broadcast presence
function broadcastPresence(userId: number, userName: string, joined: boolean, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: joined ? "user_joined" : "user_left",
    userId,
    userName,
    timestamp: new Date(),
  };
  const message = JSON.stringify({ type: event.type, payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to broadcast cursor positions
function broadcastCursorPosition(userId: number, taskId: number | undefined, cursor: { line: number; column: number } | undefined, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: "cursor_position",
    userId,
    taskId,
    cursor,
    timestamp: new Date(),
  };
  const message = JSON.stringify({ type: "cursor_position", payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Helper function to broadcast typing indicators
function broadcastTyping(userId: number, taskId: number | undefined, typing: boolean, wss: WebSocketServer) {
  const event: CollaborationEvent = {
    type: typing ? "typing_start" : "typing_stop",
    userId,
    taskId,
    timestamp: new Date(),
  };
  const message = JSON.stringify({ type: event.type, payload: event });
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Start server if this file is run directly
if (require.main === module) {
  createWebSocketServer();
}