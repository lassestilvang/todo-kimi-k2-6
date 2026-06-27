/**
 * WebSocket Server for Real-time Collaboration
 * Handles task updates, comments, and presence tracking
 */

import { WebSocketServer } from "ws";
import type { TaskWithRelations } from "@/types";

interface CollaborationEvent {
  type: "task_updated" | "task_created" | "task_deleted" | "comment_added" | "user_joined" | "user_left";
  taskId?: number;
  task?: Partial<TaskWithRelations>;
  userId?: number;
  userName?: string;
  timestamp: Date;
}

const PORT = parseInt(process.env.WS_PORT || "3001");

export function createWebSocketServer() {
  const wss = new WebSocketServer({ port: PORT });

  console.log(`WebSocket server started on port ${PORT}`);

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(data, wss);
      } catch (error) {
        console.error("Invalid message received:", error);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  return wss;
}

function handleMessage(data: CollaborationEvent, wss: WebSocketServer) {
  // Broadcast the event to all connected clients
  const message = JSON.stringify({
    type: data.type,
    payload: data,
    timestamp: Date.now(),
  });

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

// Start server if this file is run directly
if (require.main === module) {
  createWebSocketServer();
}