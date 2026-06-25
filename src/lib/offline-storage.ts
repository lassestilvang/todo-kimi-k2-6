/**
 * Offline storage utilities for task management
 * Allows tasks to be created/modified while offline and synced later
 */

import type { TaskWithRelations, CreateTaskInput } from "@/types";

const OFFLINE_TASKS_KEY = "taskflow_offline_tasks";
const SYNC_STATUS_KEY = "taskflow_sync_status";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OfflineTask {
  id: string;
  action: "create" | "update" | "delete";
  data: any;
  timestamp: number;
  synced: boolean;
}

/**
 * Save a pending task operation for later sync
 */
export function saveOfflineTask(action: "create" | "update" | "delete", data: CreateTaskInput | Partial<CreateTaskInput> | { id: number }): void {
  if (typeof window === "undefined") return;

  const offlineTasks: OfflineTask[] = JSON.parse(localStorage.getItem(OFFLINE_TASKS_KEY) || "[]");
  const newTask: OfflineTask = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    data,
    timestamp: Date.now(),
    synced: false,
  };

  offlineTasks.push(newTask);
  localStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
}

/**
 * Get all pending offline tasks
 */
export function getOfflineTasks(): OfflineTask[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(OFFLINE_TASKS_KEY) || "[]");
}

/**
 * Mark an offline task as synced
 */
export function markTaskAsSynced(taskId: string): void {
  if (typeof window === "undefined") return;

  const offlineTasks: OfflineTask[] = JSON.parse(localStorage.getItem(OFFLINE_TASKS_KEY) || "[]");
  const index = offlineTasks.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    offlineTasks[index].synced = true;
    localStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
  }
}

/**
 * Remove a synced task from offline storage
 */
export function removeOfflineTask(taskId: string): void {
  if (typeof window === "undefined") return;

  const offlineTasks: OfflineTask[] = JSON.parse(localStorage.getItem(OFFLINE_TASKS_KEY) || "[]");
  const filtered = offlineTasks.filter((t) => t.id !== taskId);
  localStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
}

/**
 * Get pending (unsynced) tasks
 */
export function getPendingOfflineTasks(): OfflineTask[] {
  const offlineTasks = getOfflineTasks();
  return offlineTasks.filter((t) => !t.synced);
}

/**
 * Clear all synced tasks from offline storage
 */
export function clearSyncedTasks(): void {
  if (typeof window === "undefined") return;

  const offlineTasks: OfflineTask[] = JSON.parse(localStorage.getItem(OFFLINE_TASKS_KEY) || "[]");
  const filtered = offlineTasks.filter((t) => !t.synced);
  localStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
}

/**
 * Sync pending offline tasks with the server
 */
export async function syncOfflineTasks(): Promise<{ success: number; failed: number }> {
  const pendingTasks = getPendingOfflineTasks();
  let success = 0;
  let failed = 0;

  for (const task of pendingTasks) {
    try {
      if (task.action === "create") {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task.data),
        });
        if (response.ok) {
          markTaskAsSynced(task.id);
          success++;
        } else {
          failed++;
        }
      } else if (task.action === "update") {
        const { id, ...updates } = task.data as { id: number };
        const response = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (response.ok) {
          markTaskAsSynced(task.id);
          success++;
        } else {
          failed++;
        }
      } else if (task.action === "delete") {
        const { id } = task.data as { id: number };
        const response = await fetch(`/api/tasks/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          markTaskAsSynced(task.id);
          success++;
        } else {
          failed++;
        }
      }
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Check if there are pending offline tasks
 */
export function hasPendingOfflineTasks(): boolean {
  return getPendingOfflineTasks().length > 0;
}