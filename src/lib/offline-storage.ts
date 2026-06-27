/**
 * Offline storage utilities for task management
 * Allows tasks to be created/modified while offline and synced later
 */

import type { CreateTaskInput } from "../types";

const OFFLINE_TASKS_KEY = "taskflow_offline_tasks";
const SYNC_STATUS_KEY = "taskflow_sync_status";

export interface OfflineTask {
  id: string;
  action: "create" | "update" | "delete";
  data: CreateTaskInput | Partial<CreateTaskInput> | { id: number };
  timestamp: number;
  synced: boolean;
  retryCount?: number;
}

export interface SyncStatus {
  lastSync: number | null;
  pendingCount: number;
  isSyncing: boolean;
  error?: string;
}

/**
 * Get the localStorage object (handles SSR)
 */
function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  const ls = getLocalStorage();
  if (!ls) {
    return { lastSync: null, pendingCount: 0, isSyncing: false };
  }

  const statusStr = ls.getItem(SYNC_STATUS_KEY);
  const pendingCount = getPendingOfflineTasks().length;

  if (statusStr) {
    const status: SyncStatus = JSON.parse(statusStr);
    return { ...status, pendingCount };
  }

  return { lastSync: null, pendingCount, isSyncing: false };
}

/**
 * Save a pending task operation for later sync
 */
export function saveOfflineTask(action: "create" | "update" | "delete", data: CreateTaskInput | Partial<CreateTaskInput> | { id: number }): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const offlineTasks: OfflineTask[] = JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
  const newTask: OfflineTask = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    data,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0,
  };

  offlineTasks.push(newTask);
  ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
  updateSyncStatus(true);
}

/**
 * Get all pending offline tasks
 */
export function getOfflineTasks(): OfflineTask[] {
  const ls = getLocalStorage();
  if (!ls) return [];
  return JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
}

/**
 * Mark an offline task as synced
 */
export function markTaskAsSynced(taskId: string): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const offlineTasks: OfflineTask[] = JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
  const index = offlineTasks.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    offlineTasks[index].synced = true;
    ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
  }
}

/**
 * Remove a synced task from offline storage
 */
export function removeOfflineTask(taskId: string): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const offlineTasks: OfflineTask[] = JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
  const filtered = offlineTasks.filter((t) => t.id !== taskId);
  ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
}

/**
 * Increment retry count for a failed task
 */
function retryOfflineTask(taskId: string): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const offlineTasks: OfflineTask[] = JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
  const index = offlineTasks.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    offlineTasks[index].retryCount = (offlineTasks[index].retryCount || 0) + 1;
    ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
  }
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
  const ls = getLocalStorage();
  if (!ls) return;

  const offlineTasks: OfflineTask[] = JSON.parse(ls.getItem(OFFLINE_TASKS_KEY) || "[]");
  const filtered = offlineTasks.filter((t) => !t.synced);
  ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
}

/**
 * Sync pending offline tasks with the server
 */
export async function syncOfflineTasks(): Promise<{ success: number; failed: number }> {
  const pendingTasks = getPendingOfflineTasks();
  let success = 0;
  let failed = 0;

  updateSyncStatus(true);

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
          if ((task.retryCount || 0) < 3) {
            retryOfflineTask(task.id);
          }
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
          if ((task.retryCount || 0) < 3) {
            retryOfflineTask(task.id);
          }
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
          if ((task.retryCount || 0) < 3) {
            retryOfflineTask(task.id);
          }
        }
      }
    } catch {
      failed++;
      if ((task.retryCount || 0) < 3) {
        retryOfflineTask(task.id);
      }
    }
  }

  updateSyncStatus(false);
  return { success, failed };
}

/**
 * Update sync status
 */
function updateSyncStatus(isSyncing: boolean, error?: string): void {
  const ls = getLocalStorage();
  if (!ls) return;

  const status: SyncStatus = {
    lastSync: error ? null : Date.now(),
    pendingCount: getPendingOfflineTasks().length,
    isSyncing,
    error,
  };

  ls.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

/**
 * Check if there are pending offline tasks
 */
export function hasPendingOfflineTasks(): boolean {
  return getPendingOfflineTasks().length > 0;
}