/**
 * Collaboration utilities for task management
 * Supports real-time updates, mentions, and task assignments
 */

import type { TaskWithRelations, User } from "../types";

export interface CollaborationEvent {
  type: "task_updated" | "task_created" | "task_deleted" | "comment_added" | "user_joined" | "user_left";
  taskId?: number;
  task?: Partial<TaskWithRelations>;
  userId?: number;
  userName?: string;
  timestamp: Date;
}

export interface Mention {
  userId: number;
  userName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse mentions from text
 * Returns array of mentions and cleaned text
 */
export function parseMentions(text: string): { mentions: Mention[]; cleanedText: string } {
  const mentionRegex = /@(\w+)/g;
  const mentions: Mention[] = [];

  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const userName = match[1];
    const originalIndex = match.index;

    mentions.push({
      userId: 0, // Would be resolved from user lookup
      userName,
      startIndex: originalIndex,
      endIndex: originalIndex + userName.length + 1,
    });
  }

  // Remove @ mentions from cleaned text
  const cleanedText = text.replace(mentionRegex, "").replace(/\s+/g, " ").trim();

  return { mentions, cleanedText };
}

/**
 * Generate a shareable link for a task with 7-day expiration
 */
export function generateTaskShareLink(taskId: number, baseUrl: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = Buffer.from(`task:${taskId}:${expiresAt}`).toString("base64");
  return `${baseUrl}/share/${token}`;
}

/**
 * Generate a shareable link for a list with 7-day expiration
 */
export function generateListShareLink(listId: number, baseUrl: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = Buffer.from(`list:${listId}:${expiresAt}`).toString("base64");
  return `${baseUrl}/share/${token}`;
}

/**
 * Validate a share token and return the entity info
 */
export function validateShareToken(token: string): {
  entityType: "task" | "list";
  entityId: number;
  expiresAt: number;
} | null {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [entityType, entityIdStr, expiresAtStr] = decoded.split(":");
    const entityId = parseInt(entityIdStr, 10);
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(entityId) || isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null; // Token expired

    if (entityType !== "task" && entityType !== "list") return null;

    return { entityType, entityId, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure random token for public shares
 */
export function generateSecureShareToken(): string {
  return require("crypto").randomBytes(32).toString("hex");
}

/**
 * Task assignment helper
 */
export interface TaskAssignment {
  taskId: number;
  assigneeId: number;
  assigneeName: string;
  assignedAt: Date;
  dueDate?: string;
}

/**
 * Permission levels for task sharing
 */
export type PermissionLevel = "view" | "edit" | "admin";

export interface TaskShare {
  taskId: number;
  userId: number;
  permission: PermissionLevel;
  sharedBy: number;
  sharedAt: Date;
}

/**
 * Check if a user can perform an action on a task
 * Note: In demo mode without authentication, returns true for view actions
 */
import { getDb } from "@/lib/db";

export function canPerformAction(
  user: User | null,
  task: TaskWithRelations,
  action: "view" | "edit" | "delete" = "view"
): boolean {
  if (!user) {
    // In demo mode, allow view access for unauthenticated users
    return action === "view";
  }

  // Owner can always do everything
  if (task.created_by === user.id) return true;

  // Check task_shares table for explicit permission
  try {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT permission FROM task_shares WHERE task_id = ? AND user_id = ?"
      )
      .get(task.id, user.id) as { permission: string } | undefined;

    if (row) {
      const perm = row.permission as PermissionLevel;
      if (action === "view" && (perm === "view" || perm === "edit" || perm === "admin")) {
        return true;
      }
      if (action === "edit" && (perm === "edit" || perm === "admin")) {
        return true;
      }
      if (action === "delete" && perm === "admin") {
        return true;
      }
    }
  } catch {
    // Database not available (browser environment) - allow access
    return true;
  }

  // In demo mode, allow all authenticated users to view tasks
  // In production, this would return false without explicit permission
  if (action === "view") return true;

  // No explicit permission found
  return false;
}

/**
 * Group tasks by assignee
 */
export function groupTasksByAssignee(tasks: TaskWithRelations[]): Record<number, TaskWithRelations[]> {
  return tasks.reduce((acc, task) => {
    const assigneeId = task.assignee_id || 0;
    if (!acc[assigneeId]) {
      acc[assigneeId] = [];
    }
    acc[assigneeId].push(task);
    return acc;
  }, {} as Record<number, TaskWithRelations[]>);
}

/**
 * Get pending assignments for a user
 */
export function getPendingAssignments(
  tasks: TaskWithRelations[],
  userId: number
): TaskWithRelations[] {
  return tasks.filter(
    (t) =>
      t.assignee_id === userId &&
      !t.completed &&
      t.deadline &&
      new Date(t.deadline) >= new Date()
  );
}