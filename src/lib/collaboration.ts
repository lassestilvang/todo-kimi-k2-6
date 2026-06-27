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
 * Generate a shareable link for a task
 */
export function generateTaskShareLink(taskId: number, baseUrl: string): string {
  const token = Buffer.from(`task:${taskId}:${Date.now()}`).toString("base64");
  return `${baseUrl}/share/${token}`;
}

/**
 * Generate a shareable link for a list
 */
export function generateListShareLink(listId: number, baseUrl: string): string {
  const token = Buffer.from(`list:${listId}:${Date.now()}`).toString("base64");
  return `${baseUrl}/share/${token}`;
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
 */
export function canPerformAction(
  user: User | null,
  task: TaskWithRelations
): boolean {
  if (!user) return false;

  // Owner can always do everything
  if (task.created_by === user.id) return true;

  // For now, return true for all actions (would check shares table in real implementation)
  return true;
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