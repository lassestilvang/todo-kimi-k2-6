import { NextRequest } from 'next/server';
import { parseNaturalLanguageTask } from '@/lib/ai';
import {
  applyMiddleware,
  errorResponse,
  jsonResponse,
} from '@/lib/api-middleware';
import { getDb } from '@/lib/db';

interface InboxSource {
  id: number;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  due_date?: string;
  confidence?: number;
}

interface TriageUpdate {
  id: number;
  predicted_priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  predicted_due_date?: string;
  suggested_labels?: string[];
  suggested_list?: string;
  ai_reasoning?: string;
}

function calculatePriorityScore(priority: string, dueDate?: string): number {
  const priorityScores: Record<string, number> = {
    critical: 100,
    high: 80,
    medium: 50,
    low: 20,
    none: 0,
  };

  let score = priorityScores[priority] || 50;

  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 0) score += 30;
    else if (diffDays <= 1) score += 20;
    else if (diffDays <= 3) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

export async function POST(req: NextRequest) {
  const middlewareResult = await applyMiddleware(req, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  if (!middlewareResult.auth?.isAuthenticated) {
    return errorResponse('Unauthorized', 401);
  }

  const userId = middlewareResult.auth.userId;
  if (!userId) {
    return errorResponse('User not found', 404);
  }

  try {
    const body = await req.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return errorResponse('Invalid itemIds', 400);
    }

    const dbInstance = getDb();

    // Fetch items to triage
    const items = dbInstance
      .prepare(
        `SELECT * FROM smart_inbox_sources
         WHERE id IN (${itemIds.map(() => '?').join(',')})
         AND user_id = ?
         AND status = 'pending'`
      )
      .all(...itemIds, userId) as InboxSource[];

    if (items.length === 0) {
      return jsonResponse({ updates: [] }, 200, middlewareResult.headers);
    }

    const updates: TriageUpdate[] = [];

    // Process each item with AI
    for (const item of items) {
      const text =
        item.title + (item.description ? ` ${item.description}` : '');

      let aiResult;
      try {
        aiResult = await parseNaturalLanguageTask(text);
      } catch (error) {
        console.error('AI parsing failed, using fallback:', error);
        aiResult = {
          name: item.title,
          priority: item.priority as
            'critical' | 'high' | 'medium' | 'low' | 'none',
          due_date: item.due_date,
          confidence: item.confidence || 50,
          labels: [],
          matches: [],
        };
      }

      if (!aiResult) continue;

      const update: TriageUpdate = {
        id: item.id,
        predicted_priority: aiResult.priority || item.priority,
        predicted_due_date: aiResult.due_date || item.due_date,
        suggested_labels: aiResult.labels || [],
        ai_reasoning: `AI analysis detected: ${aiResult.priority || 'normal priority'} task with ${aiResult.due_date ? `due ${aiResult.due_date}` : 'no immediate deadline'}`,
      };

      updates.push(update);

      // Update the item with AI insights
      dbInstance
        .prepare(
          `
        UPDATE smart_inbox_sources
        SET priority_score = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(
          calculatePriorityScore(
            update.predicted_priority,
            update.predicted_due_date
          ),
          update.predicted_due_date,
          item.id
        );
    }

    return jsonResponse({ updates }, 200, middlewareResult.headers);
  } catch (error) {
    console.error('Triage error:', error);
    return errorResponse('Internal server error', 500);
  }
}
