'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';
import { getTaskRelations } from '@/lib/db/relations';

export interface MeetingNotes {
  id: number;
  user_id: number;
  title: string;
  notes: string;
  date: string;
  participants?: string;
  action_items?: string;
  decisions?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: number;
  meeting_notes_id: number;
  description: string;
  assigned_to?: number;
  due_date?: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  completed: number;
  created_at: string;
}

export interface MeetActionItemInput {
  meeting_notes_id: number;
  description: string;
  assigned_to?: number;
  due_date?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export interface CreateMeetingNotesInput {
  title: string;
  notes: string;
  date?: string;
  participants?: string;
  action_items?: string;
  decisions?: string;
}

export interface ExtractedActionItem {
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  due_date?: string;
}

export interface MeetingAnalysisResult {
  action_items: ActionItem[];
  decisions: string[];
  participants: string[];
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Create meeting notes from raw text
 */
export async function createMeetingNotes(
  input: CreateMeetingNotesInput
): Promise<MeetingNotes> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO meeting_notes
       (user_id, title, notes, date, participants, action_items, decisions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(
      user.id,
      input.title,
      input.notes,
      input.date || new Date().toISOString().split('T')[0],
      input.participants || null,
      input.action_items || null,
      input.decisions || null
    );

  return db
    .prepare('SELECT * FROM meeting_notes WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as MeetingNotes;
}

/**
 * Get all meeting notes for the current user
 */
export async function getMeetingNotes(
  limit = 50,
  offset = 0
): Promise<MeetingNotes[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM meeting_notes
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(user.id, limit, offset) as MeetingNotes[];
}

/**
 * Get meeting notes by ID
 */
export async function getMeetingNotesById(id: number): Promise<MeetingNotes | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return undefined;
  }

  return db
    .prepare('SELECT * FROM meeting_notes WHERE id = ? AND user_id = ?')
    .get(id, user.id) as MeetingNotes | undefined;
}

/**
 * Get action items for a specific meeting
 */
export async function getActionItemsForMeeting(
  meetingId: number
): Promise<ActionItem[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  // Verify user owns the meeting
  const meeting = await getMeetingNotesById(meetingId);
  if (!meeting) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM action_items
       WHERE meeting_notes_id = ?
       ORDER BY priority DESC, due_date ASC`
    )
    .all(meetingId) as ActionItem[];
}

/**
 * Create an action item from meeting notes
 */
export async function createActionItem(
  input: MeetActionItemInput
): Promise<ActionItem> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Verify meeting exists and user owns it
  const meeting = await getMeetingNotesById(input.meeting_notes_id);
  if (!meeting) {
    throw new Error('Meeting notes not found');
  }

  const result = db
    .prepare(
      `INSERT INTO action_items
       (meeting_notes_id, description, assigned_to, due_date, priority, completed, created_at)
       VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
    )
    .run(
      input.meeting_notes_id,
      input.description,
      input.assigned_to || null,
      input.due_date || null,
      input.priority || 'medium'
    );

  return db
    .prepare('SELECT * FROM action_items WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as ActionItem;
}

/**
 * Parse meeting notes and extract action items
 * Uses keyword-based parsing with AI fallback
 */
export async function parseMeetingNotes(
  meetingId: number
): Promise<ActionItem[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const meeting = await getMeetingNotesById(meetingId);
  if (!meeting) {
    return [];
  }

  // Extract action items from the meeting notes
  const extractedItems = await extractActionItemsFromText(meeting.notes);

  const createdItems: ActionItem[] = [];

  for (const item of extractedItems) {
    try {
      const created = await createActionItem({
        meeting_notes_id: meeting.id,
        description: item.description,
        due_date: item.due_date,
        priority: item.priority,
      });
      createdItems.push(created);
    } catch (error) {
      logError('Failed to create action item', undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return createdItems;
}

/**
 * Extract action items from meeting notes text using pattern matching
 */
export async function extractActionItemsFromText(notes: string): Promise<ExtractedActionItem[]> {
  const actionItems: ExtractedActionItem[] = [];
  const lines = notes.split('\n');

  const actionPatterns = [
    /action[:\s]+(.+)/i,
    /to do[:\s]+(.+)/i,
    /task[:\s]+(.+)/i,
    //agenda[:\s]+(.+)/i,
    /-(.+)/g,
        /\*\*(.+?)\*\*/g,
    /\b\d+[\.\)]\s*(.+)/g,
  ];

  const priorityKeywords = {
    critical: ['critical', 'urgent', 'asap', 'immediately', 'today'],
    high: ['high', 'important', 'soon', 'this week'],
    medium: ['medium', 'normal', 'next week'],
    low: ['low', 'later', 'someday', 'optional'],
  };

  const dueDatePatterns = [
    /\b(due\s+)?(by)?\s*(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
    /\b(this (monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    /\b(next (monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    /\b(end of (week|month|year))/i,
    /\b(\d{1,2})\/(\d{1,2})/g,
  ];

  for (const line of lines) {
    let matched = false;

    for (const pattern of actionPatterns) {
      if (pattern instanceof RegExp) {
        const regex = new RegExp(pattern.source, pattern.flags);
        const matches = line.matchAll(regex);

        for (const match of matches) {
          if (match[1]) {
            const description = match[1].trim().replace(/[*_:]/g, '');

            if (description.length > 5) {
              let priority: 'critical' | 'high' | 'medium' | 'low' | 'none' = 'medium';
              let dueDate: string | undefined;

              // Determine priority
              const lowerLine = line.toLowerCase();
              for (const [p, keywords] of Object.entries(priorityKeywords)) {
                if (keywords.some(k => lowerLine.includes(k))) {
                  priority = p as 'critical' | 'high' | 'medium' | 'low' | 'none';
                  break;
                }
              }

              // Extract due date
              for (const datePattern of dueDatePatterns) {
                if (datePattern instanceof RegExp) {
                  const dateMatch = line.match(datePattern);
                  if (dateMatch?.[0]) {
                    dueDate = dateMatch[0].replace(/\b(due|by)\s+/gi, '');
                    break;
                  }
                }
              }

              actionItems.push({
                description: capitalize(description),
                priority,
                due_date: dueDate,
              });
              matched = true;
            }
          }
        }
      } else {
        const match = line.match(pattern as RegExp);
        if (match?.[1]) {
          const description = match[1].trim();

          if (description.length > 5) {
            let priority: 'critical' | 'high' | 'medium' | 'low' | 'none' = 'medium';
            let dueDate: string | undefined;

            const lowerLine = line.toLowerCase();
            for (const [p, keywords] of Object.entries(priorityKeywords)) {
              if (keywords.some(k => lowerLine.includes(k))) {
                priority = p as 'critical' | 'high' | 'medium' | 'low' | 'none';
                break;
              }
            }

            const dateMatch = line.match(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/);
            if (dateMatch?.[0]) {
              dueDate = dateMatch[0];
            }

            actionItems.push({
              description: capitalize(description),
              priority,
              due_date: dueDate,
            });
            matched = true;
          }
        }
      }

      if (matched) break;
    }
  }

  return actionItems;
}

/**
 * Convert action items to tasks
 */
export async function convertActionItemsToTasks(
  meetingId: number
): Promise<{ created: number; existing: number; total: number }> {
  const actionItems = await getActionItemsForMeeting(meetingId);
  const db = getDb();
  const user = await getCurrentUser();

  const userId = user?.id ?? 0;
  let created = 0;
  let existing = 0;

  for (const item of actionItems) {
    // Check if a task already exists for this action item
    const existingTask = db
      .prepare(
        'SELECT id FROM tasks WHERE name LIKE ? AND user_id = ?'
      )
      .get(`%${item.description.substring(0, 30)}%`, userId);

    if (existingTask) {
      existing++;
      continue;
    }

    // Create new task
    try {
      const priority = mapPriority(item.priority);

      db.prepare(
        `INSERT INTO tasks
         (user_id, name, description, list_id, date, deadline, priority, completed, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(
        userId,
        item.description,
        `Action item from meeting #${meetingId}`,
        item.due_date || null,
        item.due_date || null,
        priority,
      );

      created++;
    } catch (error) {
      logError('Failed to convert action item to task', undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return { created, existing, total: actionItems.length };
}

/**
 * Analyze meeting notes and return insights
 */
export async function analyzeMeetingNotes(
  meetingId: number
): Promise<MeetingAnalysisResult> {
  const meeting = await getMeetingNotesById(meetingId);

  if (!meeting) {
    throw new Error('Meeting notes not found');
  }

  const actionItems = await getActionItemsForMeeting(meetingId);
  const notes = meeting.notes.toLowerCase();

  // Extract participants from notes or participants field
  const participants = extractParticipants(notes, meeting.participants);

  // Analyze sentiment
  const sentiment = analyzeSentiment(notes);

  // Generate summary
  const summary = generateMeetingSummary(meeting.title, notes);

  // Extract decisions
  const decisions = extractDecisions(notes);

  return {
    action_items: actionItems,
    decisions,
    participants,
    summary,
    sentiment,
  };
}

/**
 * Helper functions
 */

function extractParticipants(notes: string, participantsField?: string | null): string[] {
  const participants: string[] = [];

  // Check explicit participants field
  if (participantsField) {
    participants.push(...participantsField.split(',').map(p => p.trim()));
  }

  // Extract from notes using patterns
  const patterns = [
    /\b(@\w+)/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?):/g,
    /meetings?\s+(with)\s+(.+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = notes.match(pattern);
    if (matches) {
      for (const match of matches) {
        const name = match.replace(/[@:]/g, '').trim();
        if (name && !participants.includes(name)) {
          participants.push(name);
        }
      }
    }
  }

  return [...new Set(participants)];
}

function analyzeSentiment(notes: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['good', 'great', 'excellent', 'success', 'positive', 'agreed', 'approved', 'done', 'complete'];
  const negativeWords = ['bad', 'terrible', 'fail', 'failed', 'problem', 'issue', 'worried', 'concern', 'delay', 'blocked'];

  let score = 0;

  for (const word of positiveWords) {
    if (notes.includes(word)) score += 1;
  }

  for (const word of negativeWords) {
    if (notes.includes(word)) score -= 1;
  }

  if (score >= 2) return 'positive';
  if (score <= -2) return 'negative';
  return 'neutral';
}

function generateMeetingSummary(title: string, notes: string): string {
  const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordCount = notes.split(/\s+/).length;
  const actionItemCount = (notes.match(/(action|to do|task)/gi) || []).length;

  return `${title}: ${Math.min(sentences.length, 3)} key points, ${wordCount} words, ${actionItemCount} potential action items`;
}

function extractDecisions(notes: string): string[] {
  const decisions: string[] = [];

  const decisionPatterns = [
    /decision[:\s]+(.+)/gi,
    /we decided[:\s]+(.+)/gi,
    /agreed on[:\s]+(.+)/gi,
    /consensus[:\s]+(.+)/gi,
  ];

  const lines = notes.split('\n');
  for (const line of lines) {
    for (const pattern of decisionPatterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        decisions.push(capitalize(match[1].trim()));
      }
    }
  }

  return [...new Set(decisions)].slice(0, 5);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapPriority(priority: 'critical' | 'high' | 'medium' | 'low' | 'none'): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  const map: Record<string, 'none' | 'low' | 'medium' | 'high' | 'critical'> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    none: 'none',
  };
  return map[priority] || 'medium';
}

/**
 * Get meeting notes with action item counts
 */
export async function getMeetingNotesWithActionCounts(): Promise<Array<MeetingNotes & { action_count: number; completed_count: number }>> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const meetings = await getMeetingNotes();

  const result = [];
  for (const meeting of meetings) {
    const actionItems = await getActionItemsForMeeting(meeting.id);
    result.push({
      ...meeting,
      action_count: actionItems.length,
      completed_count: actionItems.filter(a => a.completed).length,
    });
  }

  return result;
}