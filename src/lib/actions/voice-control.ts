'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';

export interface VoiceCommand {
  id: number;
  user_id: number;
  command: string;
  transcribed_text: string | null;
  action_taken: string | null;
  success: number;
  created_at: string;
}

export interface ParsedVoiceIntent {
  action:
    | 'create_task'
    | 'complete_task'
    | 'delete_task'
    | 'set_priority'
    | 'set_date'
    | 'search'
    | 'navigate'
    | 'unknown';
  parameters: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface CreateVoiceCommandInput {
  command: string;
  transcribed_text?: string;
  action_taken?: string;
  success?: boolean;
}

/**
 * Parse voice input and detect intent
 */
export async function parseVoiceCommand(
  text: string
): Promise<ParsedVoiceIntent> {
  const normalized = text.toLowerCase().trim();

  // Create task patterns
  const createTaskPatterns = [
    /^(create|add|new|make)\s+(a\s+)?task\s+(.+)/i,
    /^(remind\s+me\s+to\s+|i\s+need\s+to\s+)(.+)/i,
    /^task\s*:\s*(.+)/i,
  ];

  for (const pattern of createTaskPatterns) {
    const match = text.match(pattern);
    if (match?.[match.length - 1]) {
      const description = match[match.length - 1].trim();
      const parsedDate = extractDate(description);
      const parsedPriority = extractPriority(description);

      return {
        action: 'create_task',
        parameters: {
          description,
          date: parsedDate,
          priority: parsedPriority,
        },
        confidence: 0.9,
        rawText: text,
      };
    }
  }

  // Complete task patterns
  const completeTaskPatterns = [
    /^(complete|finish|done|mark\s+complete)\s+(.+)/i,
    /^(i\s+)?(finished|completed|did)\s+(.+)/i,
  ];

  for (const pattern of completeTaskPatterns) {
    const match = text.match(pattern);
    if (match?.[match.length - 1]) {
      return {
        action: 'complete_task',
        parameters: {
          taskIdentifier: match[match.length - 1].trim(),
        },
        confidence: 0.85,
        rawText: text,
      };
    }
  }

  // Delete task patterns
  const deleteTaskPatterns = [
    /^(delete|remove|cancel)\s+(.+)/i,
  ];

  for (const pattern of deleteTaskPatterns) {
    const match = text.match(pattern);
    if (match?.[match.length - 1]) {
      return {
        action: 'delete_task',
        parameters: {
          taskIdentifier: match[match.length - 1].trim(),
        },
        confidence: 0.8,
        rawText: text,
      };
    }
  }

  // Set priority patterns
  const priorityPatterns = [
    /(set|change|update)\s+(.+)\s+(priority|to)\s+(critical|high|medium|low|none)/i,
    /mark\s+(.+)\s+as\s+(critical|high|medium|low|urgent|important)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        action: 'set_priority',
        parameters: {
          taskIdentifier: match[1]?.trim() || match[2]?.trim(),
          priority: match[match.length - 1]?.toLowerCase(),
        },
        confidence: 0.85,
        rawText: text,
      };
    }
  }

  // Set date patterns
  const setDatePatterns = [
    /(reschedule|move|set)\s+(.+)\s+(to|for)\s+(today|tomorrow|next\s+\w+|on\s+.+)/i,
    /(.+)\s+by\s+(.+)/i,
  ];

  for (const pattern of setDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        action: 'set_date',
        parameters: {
          taskIdentifier: match[1]?.trim() || match[2]?.trim(),
          date: match[match.length - 1]?.trim(),
        },
        confidence: 0.75,
        rawText: text,
      };
    }
  }

  // Search patterns
  if (normalized.startsWith('search ') || normalized.startsWith('find ') || normalized.startsWith('show ')) {
    return {
      action: 'search',
      parameters: {
        query: text.replace(/^(search|find|show)\s+/i, '').trim(),
      },
      confidence: 0.8,
      rawText: text,
    };
  }

  // Navigate patterns
  const navigatePatterns = [
    /(go to|open|show|navigate to)\s+(today|tomorrow|week|board|kanban|calendar|gantt|analytics|skills|career)/i,
  ];

  for (const pattern of navigatePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        action: 'navigate',
        parameters: {
          target: match[match.length - 1]?.toLowerCase(),
        },
        confidence: 0.9,
        rawText: text,
      };
    }
  }

  return {
    action: 'unknown',
    parameters: { text },
    confidence: 0.5,
    rawText: text,
  };
}

/**
 * Execute parsed voice intent
 */
export async function executeVoiceIntent(
  intent: ParsedVoiceIntent
): Promise<{ success: boolean; message: string; data?: unknown }> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return { success: false, message: 'Authentication required' };
  }

  try {
    switch (intent.action) {
      case 'create_task': {
        const { createTask } = await import('./tasks');
        const task = await createTask({
          name: intent.parameters.description as string,
          date: intent.parameters.date as string | undefined,
          priority: intent.parameters.priority as any,
        });

        return {
          success: true,
          message: `Created task: ${task.name}`,
          data: task,
        };
      }

      case 'complete_task': {
        const { completeTasks } = await import('./tasks');
        const identifier = intent.parameters.taskIdentifier as string;

        // Find task by name
        const db = getDb();
        const task = db
          .prepare(
            'SELECT id FROM tasks WHERE user_id = ? AND name LIKE ? LIMIT 1'
          )
          .get(user.id, `%${identifier}%`) as { id: number } | undefined;

        if (!task) {
          return { success: false, message: `Could not find task: ${identifier}` };
        }

        await completeTasks([task.id], user.id);
        return { success: true, message: `Completed task: ${identifier}` };
      }

      case 'delete_task': {
        const { deleteTask } = await import('./tasks');
        const identifier = intent.parameters.taskIdentifier as string;

        const db = getDb();
        const task = db
          .prepare(
            'SELECT id FROM tasks WHERE user_id = ? AND name LIKE ? LIMIT 1'
          )
          .get(user.id, `%${identifier}%`) as { id: number } | undefined;

        if (!task) {
          return { success: false, message: `Could not find task: ${identifier}` };
        }

        await deleteTask(task.id);
        return { success: true, message: `Deleted task: ${identifier}` };
      }

      case 'set_priority': {
        const { updateTask } = await import('./tasks');
        const identifier = intent.parameters.taskIdentifier as string;
        const priority = intent.parameters.priority as string;

        const db = getDb();
        const task = db
          .prepare(
            'SELECT id FROM tasks WHERE user_id = ? AND name LIKE ? LIMIT 1'
          )
          .get(user.id, `%${identifier}%`) as { id: number } | undefined;

        if (!task) {
          return { success: false, message: `Could not find task: ${identifier}` };
        }

        await updateTask(task.id, {
          priority: priority as any,
        });

        return { success: true, message: `Set ${identifier} to ${priority} priority` };
      }

      case 'search': {
        return {
          success: true,
          message: `Searching for: ${intent.parameters.query}`,
          data: { query: intent.parameters.query },
        };
      }

      case 'navigate': {
        return {
          success: true,
          message: `Navigating to: ${intent.parameters.target}`,
          data: { target: intent.parameters.target },
        };
      }

      default:
        return { success: false, message: 'Unknown command' };
    }
  } catch (error) {
    logError('Failed to execute voice intent', undefined, error instanceof Error ? error : new Error(String(error)));
    return { success: false, message: 'Failed to execute command' };
  }
}

/**
 * Log voice command
 */
export async function logVoiceCommand(input: CreateVoiceCommandInput): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) return;

  try {
    db.prepare(
      `INSERT INTO voice_commands
       (user_id, command, transcribed_text, action_taken, success, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      user.id,
      input.command,
      input.transcribed_text || null,
      input.action_taken || null,
      input.success ? 1 : 0
    );
  } catch (error) {
    logError('Failed to log voice command', undefined, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get voice command history
 */
export async function getVoiceCommandHistory(limit = 50): Promise<VoiceCommand[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM voice_commands
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(user.id, limit) as VoiceCommand[];
}

/**
 * Helper functions for parsing
 */

function extractDate(text: string): string | null {
  const today = new Date();
  const lowerText = text.toLowerCase();

  if (lowerText.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Next X
  const nextMatch = lowerText.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextMatch) {
    return getNextDayOfWeek(nextMatch[1]);
  }

  // Day name without "next"
  const dayMatch = lowerText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayMatch) {
    return getNextDayOfWeek(dayMatch[1]);
  }

  // Specific date like "December 15" or "15 December"
  const dateMatch = lowerText.match(/\b(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (dateMatch) {
    return parseSpecificDate(parseInt(dateMatch[1]), dateMatch[3]);
  }

  // Numeric date like "12/15" or "15-12"
  const numericMatch = lowerText.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (numericMatch) {
    return parseNumericDate(parseInt(numericMatch[1]), parseInt(numericMatch[2]));
  }

  return null;
}

function extractPriority(text: string): 'critical' | 'high' | 'medium' | 'low' | 'none' | null {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('asap')) {
    return 'critical';
  }
  if (lowerText.includes('important') || lowerText.includes('high')) {
    return 'high';
  }
  if (lowerText.includes('low') || lowerText.includes('whenever')) {
    return 'low';
  }

  return null;
}

function getNextDayOfWeek(day: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(day);
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntil);
  return targetDate.toISOString().split('T')[0];
}

function parseSpecificDate(day: number, month: string): string {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const today = new Date();
  const monthIndex = months[month.toLowerCase()];
  const year = monthIndex >= today.getMonth() ? today.getFullYear() : today.getFullYear() + 1;
  const date = new Date(year, monthIndex, day);
  return date.toISOString().split('T')[0];
}

function parseNumericDate(part1: number, part2: number): string {
  // Assume MM/DD format (US)
  const today = new Date();
  let date = new Date(today.getFullYear(), part1 - 1, part2);

  // If date is in the past, assume next year
  if (date < today) {
    date = new Date(today.getFullYear() + 1, part1 - 1, part2);
  }

  return date.toISOString().split('T')[0];
}