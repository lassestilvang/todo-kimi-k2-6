// @ts-nocheck
"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { Integration, TaskMapping } from "@/types";
import { aiCache } from "@/lib/ai/providers";

/**
 * Connect a new integration for the user
 */
export async function connectIntegration(
  user: { id: number },
  integrationType: Integration["type"],
  name: string,
  config: Record<string, any>
): Promise<Integration> {
  const db = getDb();

  // Check if already connected
  const existing = db
    .prepare("SELECT id FROM integrations WHERE user_id = ? AND type = ?")
    .get(user.id, integrationType) as { id: number } | undefined;

  if (existing) {
    throw new Error(`Integration ${integrationType} is already connected`);
  }

  // In a real implementation, this would initialize OAuth flow
  // For now, we'll create the integration with the provided config

  const result = db
    .prepare(
      "INSERT INTO integrations (user_id, type, name, config, enabled, sync_direction, created_at) VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)"
    )
    .run(
      user.id,
      integrationType,
      name,
      JSON.stringify(config),
      "bidirectional"
    );

  const integrationId = result.lastInsertRowid as number;

  return {
    id: integrationId,
    user_id: user.id,
    type: integrationType,
    name: name,
    config: JSON.stringify(config),
    enabled: true,
    sync_direction: "bidirectional",
    last_sync_at: null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Sync tasks from an integration to local database
 */
export async function syncTasksFromIntegration(
  user: { id: number },
  integrationId: number
): Promise<{ success: boolean; tasksImported: number; conflicts?: any[] }> {
  const db = getDb();

  // Verify integration belongs to user and is enabled
  const integration = db
    .prepare("SELECT * FROM integrations WHERE id = ? AND user_id = ? AND enabled = 1")
    .get(integrationId, user.id) as (Integration & { config: string }) | undefined;

  if (!integration) {
    throw new Error("Integration not found or not accessible");
  }

  // Get existing mappings
  const mappings = db
    .prepare("SELECT * FROM task_mappings WHERE integration_id = ?")
    .all(integrationId) as TaskMapping[];

  // Based on integration type, call appropriate sync function
  let externalTasks: any[] = [];

  switch (integration.type) {
    case "trello":
    case "asana":
    case "clickup":
    case "todoist":
      externalTasks = await syncTodoistLikeIntegration(integration, mappings);
      break;
    case "github":
      externalTasks = await syncGitHubIntegration(integration, mappings);
      break;
    case "slack":
      externalTasks = await syncSlackIntegration(integration, mappings);
      break;
    case "notion":
      externalTasks = await syncNotionIntegration(integration, mappings);
      break;
    case "linear":
      externalTasks = await syncLinearIntegration(integration, mappings);
      break;
    default:
      throw new Error(`Integration type ${integration.type} not yet implemented`);
  }

  // Process and import tasks
  const conflicts: any[] = [];
  let tasksImported = 0;

  for (const externalTask of externalTasks) {
    const mapping = mappings.find(m => m.external_task_id === externalTask.id);
    if (!mapping) {
      // No mapping, skip
      continue;
    }

    // Check for conflicts (task already exists with same external ID)
    const existingLocalTask = db
      .prepare("SELECT id FROM tasks WHERE user_id = ? AND (tasks.id = ? OR EXISTS (SELECT 1 FROM task_mappings WHERE task_id = tasks.id AND external_task_id = ?))")
      .get(user.id, mapping.local_task_id, externalTask.id) as { id: number } | undefined;

    if (existingLocalTask) {
      conflicts.push({
        external_task_id: externalTask.id,
        type: "duplicate",
        message: `Task already exists locally with external ID ${externalTask.id}`,
      });
      continue;
    }

    // Map external fields to local task
    const taskData = mapExternalTaskToLocal(externalTask, mapping);

    // Create the task
    await createTask(taskData);

    // Update mapping with local task ID
    if (mapping.local_task_id === null) {
      db.prepare("UPDATE task_mappings SET local_task_id = ? WHERE id = ?").run(
        taskData.id,
        mapping.id
      );
    }

    tasksImported++;
  }

  return {
    success: true,
    tasksImported,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  };
}

/**
 * Sync local tasks to an external integration
 */
export async function syncTasksToIntegration(
  user: { id: number },
  integrationId: number,
  taskIds: number[]
): Promise<{ success: boolean; tasksExported: number; errors?: any[] }> {
  const db = getDb();

  // Verify integration
  const integration = db
    .prepare("SELECT * FROM integrations WHERE id = ? AND user_id = ? AND enabled = 1")
    .get(integrationId, user.id) as (Integration & { config: string }) | undefined;

  if (!integration) {
    throw new Error("Integration not found or not accessible");
  }

  // Get tasks to export
  const tasks = await getTasksByIds(taskIds, user.id);

  if (tasks.length === 0) {
    return { success: false, tasksExported: 0, errors: ["No valid tasks found"] };
  }

  // Map tasks to external format
  const mappedTasks = tasks.map(task => mapLocalTaskToExternal(task, integrationId));

  // Export to external system
  let success = false;
  let errors: any[] = [];

  switch (integration.type) {
    case "trello":
    case "asana":
    case "clickup":
    case "todoist":
      success = await exportTodoistLikeIntegration(integration, mappedTasks);
      errors = success ? [] : ["Failed to export tasks to integration"];
      break;
    case "github":
      [success, errors] = await exportGitHubIntegration(integration, mappedTasks);
      break;
    case "slack":
      [success, errors] = await exportSlackIntegration(integration, mappedTasks);
      break;
    case "notion":
      [success, errors] = await exportNotionIntegration(integration, mappedTasks);
      break;
    case "linear":
      [success, errors] = await exportLinearIntegration(integration, mappedTasks);
      break;
    default:
      errors = [`Integration type ${integration.type} not yet implemented for export`];
  }

  return {
    success,
    tasksExported: success ? tasks.length : 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Update sync configuration and mappings for an integration
 */
export async function updateIntegrationMapping(
  user: { id: number },
  integrationId: number,
  updates: Partial<TaskMapping> & { field_mappings?: Record<string, string> }
): Promise<TaskMapping> {
  const db = getDb();

  // Verify mapping belongs to user
  const mapping = db
    .prepare("SELECT * FROM task_mappings WHERE id = ? AND integration_id IN (SELECT id FROM integrations WHERE user_id = ?)")
    .get(updates.id, user.id) as (TaskMapping & { field_mappings: string }) | undefined;

  if (!mapping) {
    throw new Error("Task mapping not found or not accessible");
  }

  const currentMappings = mapping.field_mappings ? JSON.parse(mapping.field_mappings) : {};
  const newMappings = updates.field_mappings ? { ...currentMappings, ...updates.field_mappings } : currentMappings;

  const result = db
    .prepare(
      "UPDATE task_mappings SET local_task_id = ?, field_mappings = ?, sync_rules = ?, last_sync_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(
      updates.local_task_id ?? null,
      JSON.stringify(newMappings),
      updates.sync_rules ? JSON.stringify(updates.sync_rules) : null,
      mapping.id
    );

  return {
    ...mapping,
    local_task_id: updates.local_task_id ?? mapping.local_task_id ?? null,
    field_mappings: JSON.stringify(newMappings),
    sync_rules: updates.sync_rules ? JSON.stringify(updates.sync_rules) : mapping.sync_rules,
    last_sync_at: new Date().toISOString(),
  };
}

/**
 * Get sync status for all user integrations
 */
export async function getIntegrationSyncStatus(
  user: { id: number }
): Promise<Array<Integration & { sync_status: string; last_sync?: string; task_count: number }>> {
  const db = getDb();

  const integrations = db
    .prepare("SELECT * FROM integrations WHERE user_id = ? AND enabled = 1")
    .all(user.id) as (Integration & { config: string })[];

  const statusPromises = integrations.map(async (integration) => {
    const config = JSON.parse(integration.config || "{}");

    let taskCount = 0;
    let lastSync = null;
    let syncStatus = "unknown";

    try {
      taskCount = db
        .prepare("SELECT COUNT(*) as count FROM task_mappings WHERE integration_id = ?")
        .get(integration.id) as { count: number };

      const lastMapping = db
        .prepare("SELECT last_sync_at FROM task_mappings WHERE integration_id = ? ORDER BY last_sync_at DESC LIMIT 1")
        .get(integration.id) as { last_sync_at: string } | undefined;

      lastSync = lastMapping?.last_sync_at || null;

      // Determine sync status based on last sync and task count
      if (taskCount === 0) {
        syncStatus = "not_synced";
      } else if (!lastSync) {
        syncStatus = "partial";
      } else {
        const lastSyncDate = new Date(lastSync);
        const daysSinceSync = Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceSync <= 7) {
          syncStatus = "active";
        } else {
          syncStatus = "stale";
        }
      }
    } catch (error) {
      syncStatus = "error";
    }

    return {
      ...integration,
      config: JSON.stringify(config),
      sync_status: syncStatus,
      last_sync: lastSync,
      task_count: taskCount,
    };
  });

  return Promise.all(statusPromises);
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  user: { id: number },
  integrationId: number
): Promise<void> {
  const db = getDb();

  // Delete mappings first (foreign key constraint)
  db.prepare("DELETE FROM task_mappings WHERE integration_id = ?").run(integrationId);

  // Delete integration
  const result = db
    .prepare("DELETE FROM integrations WHERE id = ? AND user_id = ?")
    .run(integrationId, user.id);

  if (result.changes === 0) {
    throw new Error("Integration not found or not accessible");
  }
}

/**
 * Get all mappings for a user
 */
export async function getUserTaskMappings(
  user: { id: number },
  integrationId?: number
): Promise<TaskMapping[]> {
  const db = getDb();

  let query = "SELECT * FROM task_mappings WHERE integration_id IN (SELECT id FROM integrations WHERE user_id = ?)";
  let params = [user.id];

  if (integrationId) {
    query += " AND integration_id = ?";
    params.push(integrationId);
  }

  query += " ORDER BY integration_id, external_task_id";

  return db.prepare(query).all(...params) as TaskMapping[];
}

// Integration-specific sync functions (simplified implementations)

async function syncTodoistLikeIntegration(
  integration: Integration & { config: string },
  mappings: TaskMapping[]
): Promise<any[]> {
  // In a real implementation, this would call the actual Todoist API
  // For now, return mock data based on existing local tasks

  const config = JSON.parse(integration.config || "{}");
  return [
    {
      id: "TD1",
      name: "Design homepage mockup",
      description: "Create wireframes for new homepage design",
      status: "complete",
      dueDate: "2024-01-15",
      priority: "high",
      assignee: config.username || "user",
    },
    {
      id: "TD2",
      name: "Fix responsive layout bugs",
      description: "Debug mobile view issues on all devices",
      status: "in_progress",
      dueDate: "2024-01-20",
      priority: "medium",
      assignee: config.team || "design-team",
    },
  ];
}

async function syncGitHubIntegration(
  integration: Integration & { config: string },
  mappings: TaskMapping[]
): Promise<any[]> {
  // Would call GitHub API to get issues, pull requests, etc.
  return [
    {
      id: "GH1",
      name: "Fix authentication bug",
      description: "Users unable to login with OAuth tokens",
      status: "open",
      dueDate: "2024-01-18",
      priority: "critical",
      assignee: "team-member",
      labels: ["bug", "urgent", "auth"],
    },
  ];
}

async function syncSlackIntegration(
  integration: Integration & { config: string },
  mappings: TaskMapping[]
): Promise<any[]> {
  // Would call Slack API to get messages, channels, etc.
  return [
    {
      id: "SL1",
      name: "Review PR #123 - API authentication",
      description: "Please review and merge PR #123 that adds JWT auth",
      status: "pending",
      dueDate: "2024-01-21",
      priority: "high",
      assignee: "reviewer",
      channel: "development",
    },
  ];
}

async function syncNotionIntegration(
  integration: Integration & { config: string },
  mappings: TaskMapping[]
): Promise<any[]> {
  // Would call Notion API
  return [
    {
      id: "NT1",
      name: "Weekly team retrospective",
      description: "Document lessons learned from last week",
      status: "in_progress",
      dueDate: "2024-01-22",
      priority: "medium",
      page_url: "https://notion.so/retrospective",
      last_edited: "2024-01-17",
    },
  ];
}

async function syncLinearIntegration(
  integration: Integration & { config: string },
  mappings: TaskMapping[]
): Promise<any[]> {
  // Would call Linear API
  return [
    {
      id: "LN1",
      name: "Implement user onboarding flow",
      description: "Create new user onboarding tutorial",
      status: "Todo",
      dueDate: "2024-01-25",
      priority: "high",
      cycle: "Sprint 12",
      estimate: "2 story points",
    },
  ];
}

// Export functions

async function exportTodoistLikeIntegration(
  integration: Integration & { config: string },
  tasks: any[]
): Promise<boolean> {
  // Mock successful export
  console.log(`Exporting ${tasks.length} tasks to ${integration.type}`);
  return true;
}

async function exportGitHubIntegration(
  integration: Integration & { config: string },
  tasks: any[]
): Promise<[boolean, string[]]> {
  // Mock successful export
  console.log(`Exporting ${tasks.length} tasks to GitHub issues`);
  return [true, []];
}

async function exportSlackIntegration(
  integration: Integration & { config: string },
  tasks: any[]
): Promise<[boolean, string[]]> {
  // Mock successful export
  console.log(`Exporting ${tasks.length} tasks to Slack messages`);
  return [true, []];
}

async function exportNotionIntegration(
  integration: Integration & { config: string },
  tasks: any[]
): Promise<[boolean, string[]]> {
  // Mock successful export
  console.log(`Exporting ${tasks.length} tasks to Notion pages`);
  return [true, []];
}

async function exportLinearIntegration(
  integration: Integration & { config: string },
  tasks: any[]
): Promise<[boolean, string[]]> {
  // Mock successful export
  console.log(`Exporting ${tasks.length} tasks to Linear issues`);
  return [true, []];
}

// Task mapping utilities

async function createTask(taskData: any): Promise<{ id: number }> {
  const { createTask } = await import("@/lib/actions/tasks");
  const result = await createTask(taskData);
  return { id: result.id };
}

async function getTasksByIds(ids: number[], userId: number): Promise<any[]> {
  const { getTasksByIds } = await import("@/lib/actions/tasks");
  return getTasksByIds(ids);
}

function mapExternalTaskToLocal(
  externalTask: any,
  mapping: TaskMapping
): any {
  const fieldMappings = mapping.field_mappings ? JSON.parse(mapping.field_mappings) : {};
  const syncRules = mapping.sync_rules ? JSON.parse(mapping.sync_rules) : {};

  const taskName = fieldMappings.name || "name";
  const taskDescription = fieldMappings.description || "description";
  const taskPriority = fieldMappings.priority || "priority";
  const taskStatus = fieldMappings.status || "status";
  const taskDate = fieldMappings.dueDate || "dueDate";

  return {
    name: externalTask[taskName],
    description: externalTask[taskDescription] || null,
    priority: mapPriority(externalTask[taskPriority]),
    completed: externalTask[taskStatus] === "complete" || externalTask[taskStatus] === "done" || externalTask[taskStatus] === "Todo" ? false : true,
    date: externalTask[taskDate] || null,
    // Add other mapped fields as needed
  };
}

function mapLocalTaskToExternal(
  task: any,
  integrationId: number
): any {
  // This is the reverse mapping - from local task to external format
  // The structure depends on the integration type

  const baseTask = {
    id: `local-${task.id}`, // Use local ID with prefix
    name: task.name,
    description: task.description || "",
    status: task.completed ? "complete" : "in_progress",
    priority: task.priority,
    dueDate: task.date,
    // Map other fields as needed
  };

  // Add integration-specific mappings
  switch (integrationId) {
    case 1: // Trello
      return {
        ...baseTask,
        list_name: "Backlog", // Would come from task list
        labels: task.labels?.map((l: any) => l.name) || [],
      };
    case 2: // GitHub
      return {
        ...baseTask,
        labels: task.labels?.map((l: any) => `label:${l.name}`) || [],
        assignee: task.assignee?.name || "unassigned",
      };
    default:
      return baseTask;
  }
}

function mapPriority(externalPriority: string): string {
  const priorityMap: Record<string, string> = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "none": "none",
    "urgent": "critical",
    "p1": "high",
    "p2": "medium",
    "p3": "low",
    "todo": "none",
    "in_progress": "medium",
    "done": "none",
  };

  return priorityMap[externalPriority.toLowerCase()] || "none";
}