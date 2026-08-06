"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { Task, CreateTaskInput } from "@/types";
import { createTask } from "./tasks";
import { z } from "zod";
import { shouldExcludeEmail, parseEmailToTask } from "./email-parser-helpers";

// Schema for incoming email webhook
const EmailWebhookSchema = z.object({
  message_id: z.string(),
  subject: z.string(),
  sender: z.string(),
  recipients: z.array(z.string()).optional(),
  body: z.string(),
  html_body: z.string().optional(),
  received_at: z.string().datetime(),
  headers: z.record(z.string(), z.string()).optional(),
  label_ids: z.array(z.string()).optional(),
  thread_id: z.string().optional(),
  external_url: z.string().url().optional(),
});

// Schema for email processing options
const EmailProcessingOptionsSchema = z.object({
  auto_create: z.boolean().default(true),
  auto_label: z.boolean().default(false),
  auto_assign: z.boolean().default(false),
  default_list_id: z.number().optional(),
  keywords_to_task: z.array(z.string()).optional(),
  exclude_keywords: z.array(z.string()).optional(),
});

export interface EmailToTaskResult {
  success: boolean;
  task?: Task;
  skipped: boolean;
  reason?: string;
  confidence: number;
  parsed_fields?: {
    title: string;
    description: string;
    due_date?: string;
    priority?: "low" | "medium" | "high" | "critical";
    labels?: string[];
    assignee?: string;
  };
}

export interface EmailProcessingConfig {
  userId: number;
  autoCreate: boolean;
  autoLabel: boolean;
  autoAssign: boolean;
  defaultListId?: number;
  keywordsToTask: string[];
  excludeKeywords: string[];
  aiParser?: {
    enabled: boolean;
    model: "openai" | "claude" | "keyword-parser";
  };
}

/**
 * Process an incoming email and optionally create a task from it
 * This is the main entry point for email-to-task automation
 */
export async function processEmail(
  emailData: z.infer<typeof EmailWebhookSchema>,
  options?: z.infer<typeof EmailProcessingOptionsSchema>
): Promise<EmailToTaskResult> {
  // Validate email data
  const parsedEmail = EmailWebhookSchema.safeParse(emailData);
  if (!parsedEmail.success) {
    return {
      success: false,
      skipped: true,
      reason: "Invalid email data",
      confidence: 0,
    };
  }

  const email = parsedEmail.data;

  // Check if email should be excluded
  if (shouldExcludeEmail(email, options?.exclude_keywords)) {
    return {
      success: false,
      skipped: true,
      reason: "Email contains excluded keywords",
      confidence: 1,
    };
  }

  // Parse email to extract task information
  const parsed = parseEmailToTask(email, options);

  if (!parsed.success) {
    return {
      success: false,
      skipped: true,
      reason: parsed.reason || "Could not parse email to task",
      confidence: parsed.confidence || 0,
    };
  }

  // If auto_create is false, just return the parsed fields
  if (options?.auto_create === false) {
    return {
      success: true,
      skipped: false,
      confidence: parsed.confidence || 0.8,
      parsed_fields: parsed.parsed_fields,
    };
  }

  // Create the task
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        skipped: true,
        reason: "User not authenticated",
        confidence: 0,
      };
    }

    const task = await createTask({
      name: parsed.parsed_fields!.title,
      description: parsed.parsed_fields!.description,
      deadline: parsed.parsed_fields!.due_date,
      priority: parsed.parsed_fields!.priority,
      list_id: options?.default_list_id,
      label_ids: parsed.parsed_fields!.labels?.length
        ? await ensureLabelsExist(parsed.parsed_fields!.labels, user.id)
        : [],
    });

    return {
      success: true,
      skipped: false,
      task,
      confidence: parsed.confidence || 0.8,
      parsed_fields: parsed.parsed_fields,
    };
  } catch (error) {
    return {
      success: false,
      skipped: true,
      reason: error instanceof Error ? error.message : "Failed to create task",
      confidence: 0,
    };
  }
}

/**
 * Ensure labels exist in the database, creating them if necessary
 */
async function ensureLabelsExist(labelNames: string[], userId: number): Promise<number[]> {
  const db = getDb();

  const labelIds: number[] = [];
  for (const name of labelNames) {
    // Check if label exists
    const existing = db.prepare("SELECT id FROM labels WHERE name = ? AND user_id = ?").get(name, userId);
    if (existing) {
      labelIds.push(existing.id);
      continue;
    }

    // Create new label
    const result = db.prepare(
      "INSERT INTO labels (name, icon, color, user_id) VALUES (?, '🏷️', '#8b5cf6', ?)"
    ).run(name, userId);

    labelIds.push(result.lastInsertRowid as number);
  }

  return labelIds;
}

/**
 * Bulk process emails from an inbox
 */
export async function processEmailsBulk(
  emails: z.infer<typeof EmailWebhookSchema>[],
  options?: z.infer<typeof EmailProcessingOptionsSchema>
): Promise<{
  processed: number;
  created: number;
  skipped: number;
  results: EmailToTaskResult[];
}> {
  let created = 0;
  let skipped = 0;
  const results: EmailToTaskResult[] = [];

  for (const email of emails) {
    const result = await processEmail(email, options);
    results.push(result);

    if (result.skipped) {
      skipped++;
    } else if (result.success) {
      created++;
    }
  }

  return {
    processed: emails.length,
    created,
    skipped,
    results,
  };
}

/**
 * Sync emails from an email service (e.g., Gmail) to tasks
 */
export async function syncEmailsToTasks(
  fetchEmailsFn: (since?: Date) => Promise<z.infer<typeof EmailWebhookSchema>[]>,
  config: EmailProcessingConfig,
  since?: Date
): Promise<{
  processed: number;
  created: number;
  skipped: number;
}> {
  const emails = await fetchEmailsFn(since);

  const options: z.infer<typeof EmailProcessingOptionsSchema> = {
    auto_create: config.autoCreate,
    auto_label: config.autoLabel,
    auto_assign: config.autoAssign,
    default_list_id: config.defaultListId,
    keywords_to_task: config.keywordsToTask,
    exclude_keywords: config.excludeKeywords,
  };

  const result = await processEmailsBulk(emails, options);

  return {
    processed: result.processed,
    created: result.created,
    skipped: result.skipped,
  };
}

/**
 * Get all email integrations for a user
 */
export async function getEmailIntegrations(): Promise<Array<{
  id: number;
  user_id: number;
  provider: string;
  config: Record<string, unknown>;
  enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
}>> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) return [];

  return db.prepare(`
    SELECT ei.*, 'gmail' as provider
    FROM email_integrations ei
    WHERE ei.user_id = ?
  `).all(user.id) as Array<{
    id: number;
    user_id: number;
    provider: string;
    config: Record<string, unknown>;
    enabled: boolean;
    last_sync_at: string | null;
    created_at: string;
  }>;
}

/**
 * Enable or disable email-to-task integration
 */
export async function toggleEmailIntegration(
  integrationId: number,
  enabled: boolean
): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) throw new Error("Authentication required");

  const result = db.prepare("UPDATE email_integrations SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(enabled ? 1 : 0, integrationId, user.id);

  if (result.changes === 0) {
    throw new Error("Integration not found");
  }
}

/**
 * Manual sync - trigger email processing now
 */
export async function triggerEmailSync(): Promise<{
  processed: number;
  created: number;
  error?: string;
}> {
  // This would integrate with the Gmail connector or other email services
  // For now, return a placeholder
  return {
    processed: 0,
    created: 0,
    error: "Email sync requires configuration",
  };
}