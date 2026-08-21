/**
 * Workflow Actions
 * No-code automation engine for task management
 */

'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// Trigger types
export type TriggerType =
  | 'manual'
  | 'cron'
  | 'schedule'
  | 'task_created'
  | 'task_completed'
  | 'due_date';

// Action types
export type ActionType =
  | 'create_task'
  | 'update_task'
  | 'send_notification'
  | 'log_message'
  | 'webhook';

// Workflow status
export type WorkflowStatus = 'active' | 'paused' | 'error';

// Workflow execution status
export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'skipped';

// Type for workflow creation data
export interface CreateWorkflowData {
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config?: Record<string, unknown>;
  action_type: ActionType;
  action_config?: Record<string, unknown>;
  condition_json?: Record<string, unknown>;
  enabled?: boolean;
}

// Get all workflows for a user
export async function getWorkflows(userId: number) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM workflows
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

// Get a single workflow
export async function getWorkflow(id: number, userId: number) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM workflows
    WHERE id = ? AND user_id = ?
  `);
  return stmt.get(id, userId);
}

// Create a new workflow
export async function createWorkflow(
  userId: number,
  data: {
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_config?: Record<string, unknown>;
    action_type: ActionType;
    action_config?: Record<string, unknown>;
    condition_json?: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  const db = getDb();

  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    throw new Error('Name is required');
  }

  const stmt = db.prepare(`
    INSERT INTO workflows (user_id, name, description, trigger_type, trigger_config, action_type, action_config, condition_json, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    userId,
    data.name,
    data.description || null,
    data.trigger_type,
    JSON.stringify(data.trigger_config || {}),
    data.action_type,
    JSON.stringify(data.action_config || {}),
    data.condition_json ? JSON.stringify(data.condition_json) : null
  );

  revalidatePath(`/workflows`);
  return { id: result.lastInsertRowid as number, ...data };
}

// Update a workflow
export async function updateWorkflow(
  userId: number,
  id: number,
  data: Partial<{
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_config?: Record<string, unknown>;
    action_type: ActionType;
    action_config?: Record<string, unknown>;
    condition_json?: Record<string, unknown>;
    enabled?: boolean;
  }>
) {
  const db = getDb();
  const workflow = await getWorkflow(id, userId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const updateStmt = db.prepare(`
    UPDATE workflows
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        trigger_type = COALESCE(?, trigger_type),
        trigger_config = COALESCE(?, trigger_config),
        action_type = COALESCE(?, action_type),
        action_config = COALESCE(?, action_config),
        condition_json = COALESCE(?, condition_json),
        enabled = COALESCE(?, enabled),
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  const updateData = data || {};
  updateStmt.run(
    updateData.name,
    updateData.description,
    updateData.trigger_type,
    updateData.trigger_config
      ? JSON.stringify(updateData.trigger_config)
      : null,
    updateData.action_type,
    updateData.action_config ? JSON.stringify(updateData.action_config) : null,
    updateData.condition_json
      ? JSON.stringify(updateData.condition_json)
      : null,
    updateData.enabled,
    id,
    userId
  );

  revalidatePath(`/workflows`);
  return { ...workflow, ...updateData };
}

// Delete a workflow
export async function deleteWorkflow(id: number, userId: number) {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM workflows
    WHERE id = ? AND user_id = ?
  `);

  const result = stmt.run(id, userId);
  revalidatePath(`/workflows`);
  return result.changes > 0;
}

// Toggle workflow enabled status
export async function toggleWorkflow(id: number, userId: number) {
  const db = getDb();
  const workflow = await getWorkflow(id, userId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const stmt = db.prepare(`
    UPDATE workflows
    SET enabled = NOT enabled, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(id, userId);
  revalidatePath(`/workflows`);
  return !workflow.enabled;
}

// Execute a workflow
export async function executeWorkflow(
  workflowId: number,
  inputData?: any,
  userId?: number
) {
  const db = getDb();
  const startTime = Date.now();

  // Get workflow
  const workflow = await getWorkflow(workflowId, userId!);
  if (!workflow || !workflow.enabled) {
    throw new Error('Workflow not found or disabled');
  }

  // Record execution start
  const execStmt = db.prepare(`
    INSERT INTO workflow_executions (workflow_id, triggered_at, status, input_data, created_at)
    VALUES (?, datetime('now'), 'running', ?, datetime('now'))
  `);

  const execResult = execStmt.run(
    workflowId,
    inputData ? JSON.stringify(inputData) : null
  );
  const executionId = execResult.lastInsertRowid as number;

  try {
    // Execute action
    const result = await executeAction(workflow, inputData);

    // Update execution with result
    const updateStmt = db.prepare(`
      UPDATE workflow_executions
      SET status = 'completed', result_data = ?, duration_ms = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(result), Date.now() - startTime, executionId);

    // Update workflow run count
    const countStmt = db.prepare(`
      UPDATE workflows
      SET run_count = run_count + 1, last_run_at = datetime('now')
      WHERE id = ?
    `);
    countStmt.run(workflowId);

    revalidatePath(`/workflows`);
    return { success: true, result, executionId };
  } catch (error) {
    // Record failure
    const failStmt = db.prepare(`
      UPDATE workflow_executions
      SET status = 'failed', error_message = ?, duration_ms = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    failStmt.run(
      error instanceof Error ? error.message : String(error),
      Date.now() - startTime,
      executionId
    );

    throw error;
  }
}

// Execute an action based on type
export async function executeAction(workflow: any, inputData?: any) {
  const db = getDb();
  const actionType = workflow.action_type as ActionType;
  const actionConfig = JSON.parse(workflow.action_config || '{}');

  switch (actionType) {
    case 'create_task':
      return await createTaskFromWorkflow(db, actionConfig, inputData);

    case 'update_task':
      return await updateTaskFromWorkflow(db, actionConfig, inputData);

    case 'send_notification':
      return await sendNotification(actionConfig, inputData);

    case 'log_message':
      return await logMessage(db, actionConfig, inputData);

    case 'webhook':
      return await callWebhook(actionConfig, inputData);

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

// Create task from workflow
async function createTaskFromWorkflow(
  db: ReturnType<typeof getDb>,
  config: any,
  inputData?: any
) {
  const name = config.task_name || inputData?.task_name || 'Workflow Task';
  const description = config.description || inputData?.description || '';
  const projectId = config.project_id || inputData?.project_id;
  const assigneeId = config.assignee_id || inputData?.assignee_id;
  const dueDate = config.due_date || inputData?.due_date;
  const priority = config.priority || inputData?.priority || 'medium';

  const stmt = db.prepare(`
    INSERT INTO tasks (name, description, list_id, date, deadline, priority, assignee_id, created_at, updated_at)
    VALUES (?, ?, COALESCE(?, 1), NULL, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const result = stmt.run(
    name,
    description,
    projectId,
    dueDate,
    priority,
    assigneeId
  );

  return {
    task_id: result.lastInsertRowid,
    name,
    status: 'created',
  };
}

// Update task from workflow
async function updateTaskFromWorkflow(
  db: ReturnType<typeof getDb>,
  config: any,
  inputData?: any
) {
  const taskId = config.task_id || inputData?.task_id;
  if (!taskId) {
    throw new Error('Task ID is required for update action');
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (config.completed !== undefined) {
    updates.push(
      "completed = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END"
    );
    values.push(config.completed);
  }

  if (config.name) {
    updates.push('name = ?');
    values.push(config.name);
  }

  if (config.priority) {
    updates.push('priority = ?');
    values.push(config.priority);
  }

  if (config.due_date) {
    updates.push('deadline = ?');
    values.push(config.due_date);
  }

  if (updates.length === 0) {
    return { status: 'no_updates' };
  }

  values.push(taskId);

  const stmt = db.prepare(`
    UPDATE tasks
    SET ${updates.join(', ')}, updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(...values);

  return {
    task_id: taskId,
    status: 'updated',
  };
}

// Send notification
async function sendNotification(config: any, inputData?: any) {
  // In a real implementation, this would integrate with email, push, or other notification services
  // For now, we return a mock response
  const message =
    config.message || inputData?.message || 'Workflow notification';
  const type = config.type || 'info';

  return {
    message,
    type,
    status: 'sent',
    timestamp: new Date().toISOString(),
  };
}

// Log message
async function logMessage(
  db: ReturnType<typeof getDb>,
  config: any,
  inputData?: any
) {
  const message = config.message || inputData?.message || 'Workflow execution';
  const level = config.level || 'info';

  const stmt = db.prepare(`
    INSERT INTO activity_logs (user_id, entity_type, entity_id, action, details, created_at)
    VALUES (?, 'workflow', ?, ?, ?, datetime('now'))
  `);

  stmt.run(1, 0, `workflow_${Date.now()}`, message, JSON.stringify({ level }));

  return {
    message,
    level,
    status: 'logged',
  };
}

// Call webhook
async function callWebhook(config: any, inputData?: any) {
  const url = config.url || inputData?.webhook_url;
  if (!url) {
    throw new Error('Webhook URL is required');
  }

  const method = config.method || 'POST';
  const headers = { 'Content-Type': 'application/json', ...config.headers };
  const body = JSON.stringify({
    ...config.body,
    ...inputData,
    timestamp: new Date().toISOString(),
  });

  // In a real implementation, this would make an HTTP request
  // For now, we simulate success
  return {
    url,
    method,
    status: 'called',
    response_code: 200,
  };
}

// Get workflow executions
export async function getWorkflowExecutions(
  workflowId: number,
  options?: { limit?: number; status?: ExecutionStatus }
) {
  const db = getDb();
  let query = `
    SELECT * FROM workflow_executions
    WHERE workflow_id = ?
  `;
  const params: any[] = [workflowId];

  if (options?.status) {
    query += ` AND status = ?`;
    params.push(options.status);
  }

  query += ` ORDER BY triggered_at DESC`;

  if (options?.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

// Check trigger conditions
export async function checkTriggers(
  triggerType: TriggerType,
  triggerConfig: any,
  userId: number
): Promise<boolean> {
  // This would evaluate trigger conditions
  // For cron/schedule triggers, this would be called by a cron job
  // For event-based triggers, this would be called when the event occurs

  switch (triggerType) {
    case 'manual':
      return true; // Manual triggers are always valid when called

    case 'task_created':
      // Would check if a new task was created
      return true;

    case 'task_completed':
      // Would check if a task was completed
      return true;

    case 'due_date':
      // Would check if any tasks are due
      return true;

    case 'cron':
    case 'schedule':
      // Would check cron schedule
      return true;

    default:
      return false;
  }
}

// Evaluate conditions
export async function evaluateConditions(
  conditions: any,
  context: any
): Promise<boolean> {
  if (!conditions) return true;

  // Simple condition evaluation
  // In a full implementation, this would support complex AND/OR logic

  if (typeof conditions === 'string') {
    try {
      conditions = JSON.parse(conditions);
    } catch {
      return true;
    }
  }

  // Example: check task priority
  if (conditions.task_priority) {
    if (!context.task_priority) return false;
    const priorityOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    if (
      priorityOrder[context.task_priority] <
      priorityOrder[conditions.task_priority]
    ) {
      return false;
    }
  }

  // Example: check task label
  if (conditions.task_label && context.task_labels) {
    if (!context.task_labels.includes(conditions.task_label)) {
      return false;
    }
  }

  // Example: check due date
  if (conditions.due_date_before && context.due_date) {
    if (new Date(context.due_date) > new Date(conditions.due_date_before)) {
      return false;
    }
  }

  return true;
}
