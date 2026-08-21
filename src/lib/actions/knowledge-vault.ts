/**
 * Knowledge Vault and Evolution Timeline
 */

'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface KnowledgeEntry {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type:
    | 'lesson_learned'
    | 'best_practice'
    | 'tip'
    | 'insight'
    | 'tool'
    | 'template';
  category?: string;
  related_task_id?: number;
  tags: string; // JSON string
  confidence: number;
  source: 'manual' | 'ai_extracted' | 'task_completion';
  evolution_steps?: EvolutionStep[];
  created_at: string;
  updated_at: string;
}

export interface EvolutionStep {
  id: number;
  entry_id: number;
  version: number;
  content: string;
  changes: string;
  confidence_score: number;
  created_at: string;
  created_by?: number;
}

export interface EvolutionTimeline {
  entryId: number;
  title: string;
  currentVersion: number;
  totalVersions: number;
  evolutionHistory: EvolutionStep[];
  improvementScore: number; // 0-100
}

export interface KnowledgeStats {
  totalEntries: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
  recentAdditions: number;
}

export interface LessonLearned {
  id: number;
  title: string;
  content: string;
  relatedTasks: Array<{ id: number; name: string }>;
  outcomeRating: number | null;
  contextTags: string;
  confidence: number;
  created_at: string;
}

/**
 * Create a knowledge entry
 */
export async function createKnowledgeEntry(
  userId: number,
  data: {
    title: string;
    content: string;
    type:
      | 'lesson_learned'
      | 'best_practice'
      | 'tip'
      | 'insight'
      | 'tool'
      | 'template';
    category?: string;
    relatedTaskId?: number;
    tags?: string[];
    source?: 'manual' | 'ai_extracted' | 'task_completion';
  }
): Promise<KnowledgeEntry> {
  const db = getDb();

  const result = db
    .prepare(
      `
    INSERT INTO knowledge_entries (
      user_id, title, content, type, category, related_task_id, tags, confidence, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `
    )
    .run(
      userId,
      data.title,
      data.content,
      data.type,
      data.category || null,
      data.relatedTaskId || null,
      JSON.stringify(data.tags || []),
      data.source === 'ai_extracted' ? 0.8 : 0.9,
      data.source || 'manual'
    );

  revalidatePath(`/knowledge`);
  return db
    .prepare('SELECT * FROM knowledge_entries WHERE id = ?')
    .get(result.lastInsertRowid) as KnowledgeEntry;
}

/**
 * Get all knowledge entries for a user
 */
export async function getKnowledgeEntries(
  userId: number,
  options?: {
    type?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }
): Promise<KnowledgeEntry[]> {
  const db = getDb();

  let query = `
    SELECT * FROM knowledge_entries
    WHERE user_id = ?
  `;
  const params: any[] = [userId];

  if (options?.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }

  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }

  if (options?.tags && options.tags.length > 0) {
    query += ' AND tags LIKE ?';
    params.push(`%${options.tags.join('%')}%`);
  }

  query += ' ORDER BY created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.prepare(query).all(...params) as KnowledgeEntry[];
}

/**
 * Get knowledge entry with evolution history
 */
export async function getKnowledgeEntryWithEvolution(
  id: number,
  userId: number
): Promise<EvolutionTimeline | null> {
  const db = getDb();

  const entry = db
    .prepare(
      `
    SELECT * FROM knowledge_entries
    WHERE id = ? AND user_id = ?
  `
    )
    .get(id, userId) as KnowledgeEntry | undefined;

  if (!entry) return null;

  const evolutionSteps = db
    .prepare(
      `
    SELECT * FROM evolution_steps
    WHERE entry_id = ?
    ORDER BY version ASC
  `
    )
    .all(id) as EvolutionStep[];

  // Calculate improvement score based on evolution progress
  const improvementScore = Math.min(
    100,
    evolutionSteps.length * 10 + entry.confidence * 100
  );

  return {
    entryId: entry.id,
    title: entry.title,
    currentVersion: evolutionSteps.length + 1,
    totalVersions: evolutionSteps.length + 1,
    evolutionHistory: evolutionSteps,
    improvementScore,
  };
}

/**
 * Get knowledge statistics
 */
export async function getKnowledgeStats(
  userId: number
): Promise<KnowledgeStats> {
  const db = getDb();

  const stats = db
    .prepare(
      `
    SELECT type, COUNT(*) as count FROM knowledge_entries
    WHERE user_id = ?
    GROUP BY type
  `
    )
    .all(userId) as { type: string; count: number }[];

  const categories = db
    .prepare(
      `
    SELECT category, COUNT(*) as count FROM knowledge_entries
    WHERE user_id = ? AND category IS NOT NULL
    GROUP BY category
  `
    )
    .all(userId) as { category: string; count: number }[];

  const totalEntries = db
    .prepare(
      `SELECT COUNT(*) as count FROM knowledge_entries WHERE user_id = ?`
    )
    .get(userId) as { count: number };

  const recentAdditions = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM knowledge_entries
    WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
  `
    )
    .get(userId) as { count: number };

  const avgConfidence = db
    .prepare(
      `
    SELECT AVG(confidence) as avg FROM knowledge_entries WHERE user_id = ?
  `
    )
    .get(userId) as { avg: number };

  const byType: Record<string, number> = {};
  stats.forEach(s => {
    byType[s.type] = s.count;
  });

  const byCategory: Record<string, number> = {};
  categories.forEach(c => {
    byCategory[c.category] = c.count;
  });

  return {
    totalEntries: totalEntries.count,
    byType,
    byCategory,
    avgConfidence: avgConfidence.avg || 0,
    recentAdditions: recentAdditions.count,
  };
}

/**
 * Extract lessons learned from completed tasks
 */
export async function extractLessonsLearned(
  userId: number
): Promise<LessonLearned[]> {
  const db = getDb();

  const lessons = db
    .prepare(
      `
    SELECT t.id, t.name, t.description, de.outcome, de.outcome_notes, de.outcome_rating, de.created_at
    FROM tasks t
    JOIN decision_entries de ON t.id = de.task_id
    WHERE t.user_id = ? AND t.completed = 1 AND de.outcome IS NOT NULL
    AND de.outcome_notes IS NOT NULL
    ORDER BY de.created_at DESC
  `
    )
    .all(userId) as any[];

  return lessons.map(l => ({
    id: l.id,
    title: `Lesson from: ${l.name}`,
    content: l.outcome_notes || l.outcome || '',
    relatedTasks: [{ id: l.id, name: l.name }],
    outcomeRating: l.outcome_rating,
    contextTags: JSON.stringify([]),
    confidence: l.outcome_rating ? Math.abs(l.outcome_rating) : 0.5,
    created_at: l.created_at,
  }));
}

/**
 * Add evolution step to a knowledge entry
 */
export async function addEvolutionStep(
  userId: number,
  entryId: number,
  content: string,
  changes: string
): Promise<EvolutionStep> {
  const db = getDb();

  const existing = db
    .prepare('SELECT * FROM knowledge_entries WHERE id = ? AND user_id = ?')
    .get(entryId, userId) as KnowledgeEntry | undefined;
  if (!existing) {
    throw new Error('Knowledge entry not found');
  }

  const versionCount = db
    .prepare('SELECT COUNT(*) as count FROM evolution_steps WHERE entry_id = ?')
    .get(entryId) as { count: number };

  const result = db
    .prepare(
      `
    INSERT INTO evolution_steps (entry_id, version, content, changes, confidence_score, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
  `
    )
    .run(entryId, versionCount.count + 1, content, changes, 0.9, userId);

  // Update entry
  db.prepare(
    `
    UPDATE knowledge_entries SET updated_at = datetime('now'), confidence = confidence + 0.1
    WHERE id = ?
  `
  ).run(entryId);

  revalidatePath(`/knowledge/${entryId}`);
  return db
    .prepare('SELECT * FROM evolution_steps WHERE id = ?')
    .get(result.lastInsertRowid) as EvolutionStep;
}

/**
 * Generate knowledge timeline view
 */
export async function getKnowledgeTimeline(
  userId: number,
  months = 6
): Promise<
  {
    month: string;
    entries: number;
    lessons: number;
  }[]
> {
  const db = getDb();

  const result: { month: string; entries: number; lessons: number }[] = [];

  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStr = date.toISOString().slice(0, 7);

    const entries = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM knowledge_entries
      WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?
    `
      )
      .get(userId, monthStr) as { count: number };

    const lessons = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM knowledge_entries
      WHERE user_id = ? AND type = 'lesson_learned' AND strftime('%Y-%m', created_at) = ?
    `
      )
      .get(userId, monthStr) as { count: number };

    result.unshift({
      month: monthStr,
      entries: entries.count,
      lessons: lessons.count,
    });
  }

  return result;
}

/**
 * Get evolution metrics for a user
 */
export async function getEvolutionMetrics(userId: number): Promise<{
  totalEntries: number;
  entriesWithEvolution: number;
  avgVersionsPerEntry: number;
  totalEvolutions: number;
  latestEvolution: string | null;
}> {
  const db = getDb();

  const totalEntries = db
    .prepare(
      'SELECT COUNT(*) as count FROM knowledge_entries WHERE user_id = ?'
    )
    .get(userId) as { count: number };

  const entriesWithEvolution = db
    .prepare(
      `
    SELECT COUNT(DISTINCT ke.id) as count
    FROM knowledge_entries ke
    JOIN evolution_steps es ON ke.id = es.entry_id
    WHERE ke.user_id = ?
  `
    )
    .get(userId) as { count: number };

  const totalEvolutions = db
    .prepare('SELECT COUNT(*) as count FROM evolution_steps')
    .get() as { count: number };

  const latestEvolution = db
    .prepare(
      `
    SELECT MAX(created_at) as latest FROM evolution_steps
  `
    )
    .get() as { latest: string };

  const avgVersionsPerEntry =
    entriesWithEvolution.count > 0
      ? Math.round((totalEvolutions.count / entriesWithEvolution.count) * 10) /
        10
      : 0;

  return {
    totalEntries: totalEntries.count,
    entriesWithEvolution: entriesWithEvolution.count,
    avgVersionsPerEntry,
    totalEvolutions: totalEvolutions.count,
    latestEvolution: latestEvolution.latest,
  };
}
