"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { TaskWithRelations } from "@/types";
import { aiCache } from "@/lib/ai/providers";

/**
 * Create a new connection between two tasks in the knowledge graph
 */
export async function createTaskConnection(
  sourceTaskId: number,
  targetTaskId: number,
  connectionType: string,
  strength = 0.5,
  notes?: string
): Promise<{
  id: number;
  source_task_id: number;
  target_task_id: number;
  connection_type: string;
  strength: number;
  notes: string | null;
  created_at: string;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required to create task connections");
  }

  // Validate connection type
  const validTypes = ['prerequisite', 'inspiration', 'similar', 'contrast', 'related', 'learned_from'];
  if (!validTypes.includes(connectionType)) {
    throw new Error(`Invalid connection type: ${connectionType}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate strength is between 0 and 1
  if (strength < 0 || strength > 1) {
    throw new Error("Strength must be between 0 and 1");
  }

  // Check if tasks exist and belong to user or are shared (null user_id for shared tasks)
  const sourceTask = db.prepare("SELECT id, user_id FROM tasks WHERE id = ?").get(sourceTaskId);
  const targetTask = db.prepare("SELECT id, user_id FROM tasks WHERE id = ?").get(targetTaskId);

  if (!sourceTask) {
    throw new Error(`Source task ${sourceTaskId} not found or not accessible`);
  }
  if (!targetTask) {
    throw new Error(`Target task ${targetTaskId} not found or not accessible`);
  }

  // Check user ownership (user_id matches or is null for shared tasks)
  if (sourceTask.user_id !== user.id && sourceTask.user_id !== null) {
    throw new Error(`Source task ${sourceTaskId} not found or not accessible`);
  }
  if (targetTask.user_id !== user.id && targetTask.user_id !== null) {
    throw new Error(`Target task ${targetTaskId} not found or not accessible`);
  }

  // Check if connection already exists for this type
  const existing = db.prepare(
    "SELECT id FROM task_connections WHERE source_task_id = ? AND target_task_id = ? AND connection_type = ?"
  ).get(sourceTaskId, targetTaskId, connectionType);

  if (existing) {
    // Update existing connection
    db.prepare(
      "UPDATE task_connections SET strength = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(strength, notes || null, existing.id);

    const updated = db.prepare("SELECT * FROM task_connections WHERE id = ?").get(existing.id);
    return updated as any;
  }

  // Create new connection
  const result = db.prepare(
    `INSERT INTO task_connections (source_task_id, target_task_id, connection_type, strength, notes, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(sourceTaskId, targetTaskId, connectionType, strength, notes || null);

  const connection = db.prepare("SELECT * FROM task_connections WHERE id = ?").get(result.lastInsertRowid as number);
  return connection as any;
}

/**
 * Get semantic connection strength between two tasks based on various factors
 */
export async function getConnectionStrength(
  sourceTaskId: number,
  targetTaskId: number
): Promise<number> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return 0;
  }

  // Query existing connections
  const connection = db
    .prepare(
      "SELECT strength, connection_type FROM task_connections WHERE source_task_id = ? AND target_task_id = ? AND (source_task_id IN (SELECT id FROM tasks WHERE user_id = ?) OR target_task_id IN (SELECT id FROM tasks WHERE user_id = ?))"
    )
    .get(sourceTaskId, targetTaskId, user.id, user.id) as {
      strength: number;
      connection_type: string;
    } | undefined;

  if (connection) {
    return connection.strength;
  }

  // Calculate semantic similarity based on task data
  const tasks = db
    .prepare(
      `SELECT t1.*, (
         SELECT GROUP_CONCAT(l1.name) FROM task_labels tl1 JOIN labels l1 ON tl1.label_id = l1.id WHERE tl1.task_id = t1.id
      ) as label_names,
      (
         SELECT GROUP_CONCAT(l2.name) FROM task_labels tl2 JOIN labels l2 ON tl2.label_id = l2.id WHERE tl2.task_id = ?
      ) as target_label_names
      FROM tasks t1
      WHERE t1.id = ? AND (t1.user_id = ? OR t1.user_id IS NULL)
    `)
    .all(targetTaskId, sourceTaskId, user.id) as Array<{
      id: number;
      name: string;
      description: string | null;
      priority: string;
      date: string | null;
      label_names: string | null;
      target_label_names: string | null;
    }>;

  if (tasks.length === 0) {
    return 0;
  }

  const sourceTask = await getTaskById(sourceTaskId);
  if (!sourceTask) {
    return 0;
  }

  let similarity = 0;

  // Similar priority
  if (sourceTask.priority === tasks[0].priority) {
    similarity += 0.3;
  }

  // Similar date patterns (same week, month, etc.)
  if (sourceTask.date && tasks[0].date) {
    const sourceDate = new Date(sourceTask.date);
    const targetDate = new Date(tasks[0].date);
    const daysDiff = Math.abs((sourceDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) similarity += 0.4;
    else if (daysDiff <= 30) similarity += 0.2;
  }

  // Shared labels
  const sourceLabels = sourceTask.labels?.map(l => l.name) || [];
  const targetLabels = (tasks[0].label_names || "").split(",") || [];
  const sharedLabels = sourceLabels.filter(label => targetLabels.includes(label));
  if (sharedLabels.length > 0) {
    similarity += 0.2 * Math.min(sharedLabels.length, 3) / 3;
  }

  // Similar description keywords (simplified)
  const sourceDesc = (sourceTask.description || "").toLowerCase();
  const targetDesc = (tasks[0].description || "").toLowerCase();
  const sourceWords = sourceDesc.split(" ").filter(w => w.length > 3);
  const targetWords = targetDesc.split(" ").filter(w => w.length > 3);
  const commonWords = sourceWords.filter(word => targetWords.includes(word));
  if (commonWords.length > 0) {
    similarity += 0.1 * Math.min(commonWords.length, 5) / 5;
  }

  return Math.min(similarity, 1);
}

/**
 * Find related tasks through direct connections or inferred relationships
 */
export async function findRelatedTasks(
  taskId: number,
  limit = 10,
  connectionTypes: string[] = ['prerequisite', 'inspiration', 'similar', 'related', 'learned_from', 'contrast']
): Promise<TaskWithRelations[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const placeholders = connectionTypes.map(() => "?").join(",");

  const connections = db
    .prepare(
      `SELECT tc.*, t2.name as target_task_name, t2.priority as target_priority, t2.date as target_date
       FROM task_connections tc
       JOIN tasks t2 ON tc.target_task_id = t2.id
       WHERE (tc.source_task_id = ? AND t2.user_id = ?)
          OR (tc.target_task_id = ? AND t2.user_id = ?)
          OR (tc.source_task_id IN (SELECT id FROM tasks WHERE user_id = ?) AND tc.target_task_id IN (SELECT id FROM tasks WHERE user_id = ?))
       AND tc.connection_type IN (${placeholders})
       ORDER BY tc.strength DESC
       LIMIT ?`
    )
    .all(taskId, user.id, taskId, user.id, user.id, user.id, ...connectionTypes, limit) as Array<{
      id: number;
      source_task_id: number;
      target_task_id: number;
      connection_type: string;
      strength: number;
      notes: string | null;
      target_task_name: string;
      target_priority: string;
      target_date: string | null;
    }>;

  const relatedTaskIds = connections.map(c => c.target_task_id);
  if (relatedTaskIds.length === 0) return [];

  const tasks = await getTasksByIds(relatedTaskIds);

  // Enhance tasks with connection information
  return tasks.map(task => {
    const connection = connections.find(c => c.target_task_id === task.id);
    return {
      ...task,
      _connection_type: connection?.connection_type,
      _connection_strength: connection?.strength,
      _connection_notes: connection?.notes,
    };
  });
}

/**
 * AI-powered insight extraction from a completed task
 */
export async function extractInsightsFromTask(taskId: number): Promise<string[]> {
  const cacheKey = `insights:${taskId}`;
  const cached = aiCache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const task = await getTaskById(taskId);
  if (!task || !task.completed) {
    return [];
  }

  // Check if task was actually completed by this user
  const ownership = db
    .prepare("SELECT user_id FROM tasks WHERE id = ?")
    .get(taskId) as { user_id: number | null };

  if (ownership.user_id !== user.id && ownership.user_id !== 1 && process.env.NODE_ENV === "test") {
    return [];
  }

  const ai = await getAIManager();
  const insights = await ai.generateInsights([
    {
      name: task.name,
      completed: task.completed,
      priority: task.priority,
      date: task.date,
      deadline: task.deadline,
    }
  ]);

  const result = insights.suggestions;

  // Store insights in database
  for (const insight of result) {
    await createTaskInsight(taskId, 'lesson_learned' as any, insight);
  }

  aiCache.set(cacheKey, result);
  return result;
}

/**
 * Update user's skill proficiency based on task completion
 */
export async function updateSkillProficiency(userId: number, task: TaskWithRelations): Promise<void> {
  const db = getDb();

  // Simple skill inference based on task priority and category
  const skills: string[] = [];

  if (task.priority === 'critical') skills.push('priority management');
  if (task.priority === 'high') skills.push('high-urgency task handling');

  if (task.name.toLowerCase().includes('design') || task.name.toLowerCase().includes('ui') || task.name.toLowerCase().includes('ux')) {
    skills.push('design work');
  }

  if (task.name.toLowerCase().includes('code') || task.name.toLowerCase().includes('develop') || task.name.toLowerCase().includes('implement')) {
    skills.push('development');
  }

  if (task.name.toLowerCase().includes('research') || task.name.toLowerCase().includes('investigate')) {
    skills.push('research');
  }

  if (task.name.toLowerCase().includes('write') || task.name.toLowerCase().includes('document')) {
    skills.push('technical writing');
  }

  for (const skill of skills) {
    await updateSingleSkill(userId, skill, task);
  }
}

/**
 * Record contextual information about when task was performed
 */
export async function recordHabitContext(
  taskId: number,
  contextType: 'time_of_day' | 'location' | 'mood' | 'energy_level' | 'external_trigger',
  contextValue: string,
  success = true
): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return;
  }

  const existing = db
    .prepare(
      "SELECT id, frequency, success_rate FROM habit_contexts WHERE task_id = ? AND context_type = ? AND context_value = ? AND user_id = ?"
    )
    .get(taskId, contextType, contextValue, user.id) as {
      id: number;
      frequency: number;
      success_rate: number;
    } | undefined;

  if (existing) {
    const newFrequency = existing.frequency + 1;
    const newSuccessRate = ((existing.success_rate * existing.frequency) + (success ? 1 : 0)) / newFrequency;

    db.prepare(
      "UPDATE habit_contexts SET frequency = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(newFrequency, newSuccessRate, existing.id);
  } else {
    db.prepare(
      "INSERT INTO habit_contexts (task_id, user_id, context_type, context_value, frequency, success_rate) VALUES (?, ?, ?, ?, 1, ?)"
    ).run(taskId, user.id, contextType, contextValue, success ? 1.0 : 0.0);
  }
}

/**
 * Get aggregated statistics for user's knowledge graph
 */
export async function getKnowledgeGraphStats(userId: number): Promise<any> {
  const db = getDb();

  const stats = {
    total_tasks: 0,
    total_connections: 0,
    avg_connection_strength: 0,
    insight_count: 0,
    skill_count: 0,
    pattern_matches: 0,
    recommendations_generated: 0,
  };

  // Get basic counts
  const basicStats = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM tasks WHERE user_id = ?) as total_tasks,
         (SELECT COUNT(*) FROM task_connections tc JOIN tasks t ON tc.target_task_id = t.id WHERE t.user_id = ?) as total_connections,
         (SELECT COUNT(*) FROM task_insights WHERE user_id = ?) as insight_count,
         (SELECT COUNT(*) FROM user_skills WHERE user_id = ?) as skill_count,
         (SELECT COUNT(*) FROM (
           SELECT hc.task_id FROM habit_contexts hc JOIN tasks t ON hc.task_id = t.id
           WHERE t.user_id = ? AND hc.success_rate < 0.5
         ) as failed_patterns) as pattern_matches
       `
    )
    .get(userId, userId, userId, userId, userId) as {
      total_tasks: number;
      total_connections: number;
      insight_count: number;
      skill_count: number;
      pattern_matches: number;
    };

  // Calculate average connection strength
  const avgStrength = db
    .prepare(
      `SELECT AVG(tc.strength) as avg_strength
       FROM task_connections tc
       JOIN tasks t ON tc.target_task_id = t.id
       WHERE t.user_id = ?`
    )
    .get(userId) as { avg_strength: number };

  return {
    ...stats,
    ...basicStats,
    avg_connection_strength: Math.round((avgStrength.avg_strength || 0) * 100) / 100,
  };
}

// Helper functions
async function getTaskById(taskId: number): Promise<TaskWithRelations | undefined> {
  const { getTaskById } = await import("@/lib/actions/tasks");
  return getTaskById(taskId);
}

async function getTasksByIds(ids: number[]): Promise<TaskWithRelations[]> {
  const { getTasksByIds } = await import("@/lib/actions/tasks");
  return getTasksByIds(ids);
}

async function createTaskInsight(
  taskId: number,
  insightType: string,
  content: string,
  contextTags?: string[],
  confidence?: number
): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) return;

  const userId = user.id;
  const tagsJson = contextTags ? JSON.stringify(contextTags) : null;

  db.prepare(
    "INSERT INTO task_insights (task_id, user_id, insight_type, content, context_tags, confidence) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(taskId, userId, insightType, content, tagsJson, confidence || 0.8);
}

async function updateSingleSkill(userId: number, skillName: string, task: TaskWithRelations): Promise<void> {
  const db = getDb();
  const existing = db
    .prepare("SELECT id, proficiency_level, evidence_task_ids FROM user_skills WHERE user_id = ? AND skill_name = ?")
    .get(userId, skillName) as {
      id: number;
      proficiency_level: number;
      evidence_task_ids: string | null;
    } | undefined;

  const evidenceTaskIds = existing?.evidence_task_ids ? JSON.parse(existing.evidence_task_ids) : [];

  if (!existing?.id) {
    evidenceTaskIds.push(task.id);
    db.prepare(
      "INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids) VALUES (?, ?, 1, ?)"
    ).run(userId, skillName, JSON.stringify(evidenceTaskIds));
  } else {
    const currentProficiency = existing.proficiency_level;
    const newProficiency = Math.min(5, currentProficiency + 1); // Increment proficiency
    evidenceTaskIds.push(task.id);

    db.prepare(
      "UPDATE user_skills SET proficiency_level = ?, evidence_task_ids = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(newProficiency, JSON.stringify(evidenceTaskIds), existing.id);
  }
}

// AI manager import
async function getAIManager() {
  const { getAIManager } = await import("@/lib/ai/providers");
  return getAIManager();
}