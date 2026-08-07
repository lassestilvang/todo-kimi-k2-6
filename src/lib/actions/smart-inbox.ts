"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { CreateTaskInput, Task } from "@/types";

export type InboxSourceType = "calendar" | "email" | "slack" | "github" | "manual" | "integration";

export interface InboxSource {
  id: number;
  user_id: number;
  source_type: InboxSourceType;
  external_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: "critical" | "high" | "medium" | "low" | "none";
  confidence: number;
  priority_score?: number;
  status: "pending" | "processing" | "converted" | "dismissed";
  predicted_priority?: "critical" | "high" | "medium" | "low" | "none";
  predicted_due_date?: string;
  suggested_labels?: string; // JSON string in database
  ai_reasoning?: string;
  metadata: string; // JSON string with additional data
  created_at: string;
  updated_at: string;
}

export interface SmartInboxItem {
  id: number;
  source: InboxSource;
  task?: Partial<Task>;
  matches: string[];
  priority_score: number;
  ai_suggestion?: string;
  predicted_priority?: "critical" | "high" | "medium" | "low" | "none";
  predicted_due_date?: string;
  suggested_labels?: string; // JSON string in database
  ai_reasoning?: string;
}

export interface SmartInboxResponse {
  items: SmartInboxItem[];
  total_count: number;
  pending_count: number;
  converted_count: number;
}

// Source type display names
const SOURCE_NAMES: Record<InboxSourceType, string> = {
  calendar: "Calendar",
  email: "Email",
  slack: "Slack",
  github: "GitHub",
  manual: "Manual",
  integration: "Integration",
};

// Import utility functions from the utils file
import { calculatePriorityScore, calculateDaysUntil } from '../smart-inbox-utils';

// Re-export for backwards compatibility
export { calculatePriorityScore, calculateDaysUntil };

// Get smart inbox for current user
export async function getSmartInbox(options?: {
  limit?: number;
  status?: string;
  sourceType?: InboxSourceType;
}): Promise<SmartInboxResponse> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return { items: [], total_count: 0, pending_count: 0, converted_count: 0 };
  }

  const limit = options?.limit || 50;
  let whereClause = "WHERE user_id = ?";
  const params: any[] = [user.id];

  if (options?.status) {
    whereClause += " AND status = ?";
    params.push(options.status);
  }

  if (options?.sourceType) {
    whereClause += " AND source_type = ?";
    params.push(options.sourceType);
  }

  const sources = await db.prepare(`
    SELECT * FROM smart_inbox_sources
    ${whereClause}
    ORDER BY priority_score DESC, created_at DESC
    LIMIT ?
  `).all(...params, limit) as InboxSource[];

  // Count by status
  const counts = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM smart_inbox_sources
    WHERE user_id = ?
    GROUP BY status
  `).all(user.id) as { status: string; count: number }[];

  const pending_count = counts.find(c => c.status === "pending")?.count ?? 0;
  const converted_count = counts.find(c => c.status === "converted")?.count ?? 0;

  const items: SmartInboxItem[] = sources.map(source => ({
    id: source.id,
    source: {
      id: source.id,
      user_id: source.user_id,
      source_type: source.source_type,
      external_id: source.external_id,
      title: source.title,
      description: source.description,
      due_date: source.due_date,
      priority: source.priority,
      confidence: source.confidence,
      priority_score: source.priority_score,
      status: source.status,
      predicted_priority: source.predicted_priority,
      predicted_due_date: source.predicted_due_date,
      suggested_labels: source.suggested_labels,
      ai_reasoning: source.ai_reasoning,
      metadata: source.metadata,
      created_at: source.created_at,
      updated_at: source.updated_at,
    },
    matches: [],
    priority_score: source.priority_score ?? 0,
    predicted_priority: source.predicted_priority,
    predicted_due_date: source.predicted_due_date,
    suggested_labels: source.suggested_labels,
    ai_reasoning: source.ai_reasoning,
  }));

  return {
    items,
    total_count: counts.reduce((sum, c) => sum + c.count, 0),
    pending_count,
    converted_count,
  };
}

// Add or update a source item
export async function upsertInboxSource(data: {
  user_id?: number;
  source_type: InboxSourceType;
  external_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: "critical" | "high" | "medium" | "low" | "none";
  confidence?: number;
  metadata?: Record<string, any>;
}): Promise<InboxSource> {
  const db = getDb();

  // Get user ID if not provided
  let userId = data.user_id;
  if (!userId) {
    const user = await getCurrentUser();
    userId = user?.id || 0;
  }

  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Check if source already exists
  const existing = db.prepare(`
    SELECT id FROM smart_inbox_sources
    WHERE user_id = ? AND source_type = ? AND external_id = ?
  `).get(userId, data.source_type, data.external_id) as { id: number } | undefined;

  const metadata = data.metadata ? JSON.stringify(data.metadata) : null;
  const priority = data.priority || "medium";
  const confidence = data.confidence ?? Math.min(100, (data.priority === "critical" ? 95 : data.priority === "high" ? 85 : 50));

  if (existing) {
    // Update existing
    const result = await db.prepare(`
      UPDATE smart_inbox_sources
      SET title = ?, description = ?, due_date = ?, priority = ?, confidence = ?, metadata = ?, status = 'pending'
      WHERE id = ?
    `).run(
      data.title,
      data.description || null,
      data.due_date || null,
      priority,
      confidence,
      metadata,
      existing.id
    );

    return db.prepare("SELECT * FROM smart_inbox_sources WHERE id = ?").get(existing.id) as InboxSource;
  }

  // Insert new
  const result = await db.prepare(`
    INSERT INTO smart_inbox_sources
    (user_id, source_type, external_id, title, description, due_date, priority, confidence, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    data.source_type,
    data.external_id,
    data.title,
    data.description || null,
    data.due_date || null,
    priority,
    confidence,
    metadata
  );

  return db.prepare("SELECT * FROM smart_inbox_sources WHERE id = last_insert_rowid()").get() as InboxSource;
}

// Convert inbox source to a task
export async function convertSourceToTask(sourceId: number): Promise<Task> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  // Get the source
  const source = await db.prepare(`
    SELECT * FROM smart_inbox_sources WHERE id = ? AND user_id = ?
  `).get(sourceId, user.id) as InboxSource | undefined;

  if (!source) {
    throw new Error("Source not found");
  }

  // Create task from source
  const taskData: CreateTaskInput = {
    name: source.title,
    description: source.description,
    deadline: source.due_date,
    priority: source.priority,
  };

  // Get the createTask action
  const { createTask } = await import("./tasks");
  const task = await createTask(taskData);

  // Mark source as converted
  await db.prepare(`
    UPDATE smart_inbox_sources SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(sourceId);

  return task;
}

// Bulk convert sources to tasks
export async function bulkConvertSourcesToTasks(sourceIds: number[]): Promise<{
  created: number;
  failed: number;
  errors: string[];
}> {
  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of sourceIds) {
    try {
      await convertSourceToTask(id);
      created++;
    } catch (error) {
      failed++;
      errors.push(`Failed to convert source ${id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { created, failed, errors };
}

// Dismiss a source
export async function dismissSource(sourceId: number): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  await db.prepare(`
    UPDATE smart_inbox_sources SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
  `).run(sourceId, user.id);
}

// Get or create default inbox list
export async function getInboxList(): Promise<number> {
  const db = getDb();

  // Check if inbox list exists
  const inbox = await db.prepare("SELECT id FROM lists WHERE is_inbox = 1 LIMIT 1").get() as { id: number } | undefined;

  if (inbox) {
    return inbox.id;
  }

  // Create default inbox
  const result = await db.prepare(`
    INSERT INTO lists (name, emoji, color, is_inbox, created_at)
    VALUES ('Inbox', '📥', '#6366f1', 1, CURRENT_TIMESTAMP)
  `).run();

  return result.lastInsertRowid as unknown as number;
}

// Delete a source
export async function deleteInboxSource(sourceId: number): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  await db.prepare(`DELETE FROM smart_inbox_sources WHERE id = ? AND user_id = ?`).run(sourceId, user.id);
}

// Sync all sources to unified inbox
export async function syncAllSourcesToInbox(): Promise<{ total: number; converted: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("User not authenticated");
  }

  // Get pending sources
  const pending = await db.prepare(`
    SELECT * FROM smart_inbox_sources
    WHERE user_id = ? AND status = 'pending'
    ORDER BY priority_score DESC
  `).all(user.id) as InboxSource[];

  let converted = 0;

  // Convert each source to a task
  for (const source of pending) {
    try {
      await convertSourceToTask(source.id);
      converted++;
    } catch (error) {
      console.error(`Failed to convert source ${source.id}:`, error);
    }
  }

  return { total: pending.length, converted };
}

// Get inbox summary
export async function getInboxSummary(): Promise<{
  total: number;
  pending: number;
  bySourceType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return { total: 0, pending: 0, bySourceType: {}, byPriority: {} };
  }

  const result = await db.prepare(`
    SELECT
      source_type,
      priority,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
    FROM smart_inbox_sources
    WHERE user_id = ?
    GROUP BY source_type, priority
  `).all(user.id) as { source_type: InboxSourceType; priority: string; count: number; pending_count: number }[];

  const bySourceType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let total = 0;
  let pending = 0;

  for (const row of result) {
    bySourceType[row.source_type] = (bySourceType[row.source_type] || 0) + row.count;
    byPriority[row.priority] = (byPriority[row.priority] || 0) + row.count;
    total += row.count;
    pending += row.pending_count;
  }

  return { total, pending, bySourceType, byPriority };
}