/**
 * Focus Mode enhancements with Pomodoro+ and distraction blocking
 */

'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface PomodoroTimer {
  id: number;
  user_id: number;
  task_id?: number;
  duration_minutes: number;
  remaining_seconds: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface DistractionBlock {
  id: number;
  user_id: number;
  source: 'time' | 'keyword' | 'manual';
  pattern: string; // regex or URL
  duration_minutes: number;
  expires_at?: string;
  reason?: string;
  blocked_count: number;
  created_at: string;
}

export interface FocusSession {
  id: number;
  user_id: number;
  task_id?: number;
  type: 'pomodoro' | 'deep_work' | 'creative_flow' | 'break';
  duration_minutes: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled' | 'interrupted';
  started_at?: string;
  completed_at?: string;
  interruption_count: number;
  notes?: string;
  created_at: string;
}

export interface FocusStats {
  totalFocusTime: number;
  completedSessions: number;
  interruptedSessions: number;
  avgInterruptions: number;
  longestSession: number;
  todayFocusTime: number;
  distractionBlocks: number;
  productivityScore: number; // 0-100
}

export interface BlockSuggestion {
  website: string;
  category: string;
  reason: string;
  confidence: number;
  blockedCount: number;
}

/**
 * Start a Pomodoro session
 */
export async function startPomodoroTimer(
  userId: number,
  task?: {
    taskId?: number;
    durationMinutes?: number;
    notes?: string;
  }
): Promise<PomodoroTimer> {
  const db = getDb();
  const duration = task?.durationMinutes || 25;

  // Cancel any existing active timers
  db.prepare(
    `
    UPDATE pomodoro_timers SET status = 'cancelled'
    WHERE user_id = ? AND status = 'active'
  `
  ).run(userId);

  const result = db
    .prepare(
      `
    INSERT INTO pomodoro_timers (user_id, task_id, duration_minutes, remaining_seconds, status, started_at, created_at)
    VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
  `
    )
    .run(userId, task?.taskId || null, duration, duration * 60);

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM pomodoro_timers WHERE id = ?')
    .get(result.lastInsertRowid) as PomodoroTimer;
}

/**
 * Update Pomodoro timer
 */
export async function updatePomodoroTimer(
  userId: number,
  timerId: number,
  updates: {
    remainingSeconds?: number;
    status?: 'paused' | 'completed' | 'cancelled';
  }
): Promise<PomodoroTimer | null> {
  const db = getDb();

  const timer = db
    .prepare('SELECT * FROM pomodoro_timers WHERE id = ? AND user_id = ?')
    .get(timerId, userId) as PomodoroTimer | undefined;
  if (!timer) return null;

  const remainingSeconds = updates.remainingSeconds ?? timer.remaining_seconds;
  const status = updates.status || timer.status;

  const completedAt = status === 'completed' ? "datetime('now')" : 'NULL';

  db.prepare(
    `
    UPDATE pomodoro_timers
    SET remaining_seconds = ?, status = ?, completed_at = ${completedAt}, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(remainingSeconds, status, timerId);

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM pomodoro_timers WHERE id = ?')
    .get(timerId) as PomodoroTimer;
}

/**
 * Get active Pomodoro session
 */
export async function getActivePomadoreSession(
  userId: number
): Promise<PomodoroTimer | null> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT * FROM pomodoro_timers
    WHERE user_id = ? AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
  `
    )
    .get(userId) as PomodoroTimer | null;
}

/**
 * Create a distraction block
 */
export async function createDistractionBlock(
  userId: number,
  data: {
    source: 'time' | 'keyword' | 'manual';
    pattern: string;
    durationMinutes: number;
    reason?: string;
  }
): Promise<DistractionBlock> {
  const db = getDb();

  const expiresAt =
    data.durationMinutes > 0
      ? `datetime('now', '+' || ? || ' minutes')`
      : 'NULL';

  const result = db
    .prepare(
      `
    INSERT INTO distraction_blocks (user_id, source, pattern, duration_minutes, expires_at, reason, created_at)
    VALUES (?, ?, ?, ?, ${expiresAt}, ?, datetime('now'))
  `
    )
    .run(
      userId,
      data.source,
      data.pattern,
      data.durationMinutes,
      data.reason || null
    );

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM distraction_blocks WHERE id = ?')
    .get(result.lastInsertRowid) as DistractionBlock;
}

/**
 * Get active distraction blocks
 */
export async function getActiveDistractionBlocks(
  userId: number
): Promise<DistractionBlock[]> {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT * FROM distraction_blocks
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY created_at DESC
  `
    )
    .all(userId) as DistractionBlock[];
}

/**
 * Start a focus session
 */
export async function startFocusSession(
  userId: number,
  data: {
    taskId?: number;
    type: 'pomodoro' | 'deep_work' | 'creative_flow' | 'break';
    durationMinutes?: number;
    notes?: string;
  }
): Promise<FocusSession> {
  const db = getDb();

  const duration = data.durationMinutes || (data.type === 'break' ? 15 : 52);

  // Cancel any existing active sessions
  db.prepare(
    `
    UPDATE focus_sessions SET status = 'cancelled'
    WHERE user_id = ? AND status = 'active'
  `
  ).run(userId);

  const result = db
    .prepare(
      `
    INSERT INTO focus_sessions (user_id, task_id, type, duration_minutes, status, notes, created_at)
    VALUES (?, ?, ?, ?, 'active', ?, datetime('now'))
  `
    )
    .run(userId, data.taskId || null, data.type, duration, data.notes || null);

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM focus_sessions WHERE id = ?')
    .get(result.lastInsertRowid) as FocusSession;
}

/**
 * Complete a focus session
 */
export async function completeFocusSession(
  sessionId: number,
  userId: number
): Promise<FocusSession | null> {
  const db = getDb();

  const session = db
    .prepare('SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId) as FocusSession | undefined;
  if (!session || session.status !== 'active') return null;

  db.prepare(
    `
    UPDATE focus_sessions
    SET status = 'completed', completed_at = datetime('now'), interruption_count = 0, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(sessionId);

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM focus_sessions WHERE id = ?')
    .get(sessionId) as FocusSession;
}

/**
 * Interrupt a focus session
 */
export async function interruptFocusSession(
  sessionId: number,
  userId: number,
  reason?: string
): Promise<FocusSession | null> {
  const db = getDb();

  const session = db
    .prepare('SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId) as FocusSession | undefined;
  if (!session || session.status !== 'active') return null;

  const interruptions = session.interruption_count + 1;

  db.prepare(
    `
    UPDATE focus_sessions
    SET status = 'interrupted', interruption_count = ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(interruptions, sessionId);

  revalidatePath(`/focus`);
  return db
    .prepare('SELECT * FROM focus_sessions WHERE id = ?')
    .get(sessionId) as FocusSession;
}

/**
 * Get focus statistics for the day
 */
export async function getFocusStats(userId: number): Promise<FocusStats> {
  const db = getDb();

  const today = new Date().toISOString().split('T')[0];

  // Total focus time (completed sessions)
  const completed = db
    .prepare(
      `
    SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions
    WHERE user_id = ? AND status = 'completed'
  `
    )
    .get(userId) as { total: number };

  const completedSessions = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM focus_sessions
    WHERE user_id = ? AND status = 'completed'
  `
    )
    .get(userId) as { count: number };

  const interruptedSessions = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM focus_sessions
    WHERE user_id = ? AND status = 'interrupted'
  `
    )
    .get(userId) as { count: number };

  const totalInterruptions = db
    .prepare(
      `
    SELECT COALESCE(SUM(interruption_count), 0) as total FROM focus_sessions
    WHERE user_id = ?
  `
    )
    .get(userId) as { total: number | null };

  const longest = db
    .prepare(
      `
    SELECT MAX(duration_minutes) as max FROM focus_sessions
    WHERE user_id = ? AND status = 'completed'
  `
    )
    .get(userId) as { max: number | null };

  const todayFocus = db
    .prepare(
      `
    SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions
    WHERE user_id = ? AND status = 'completed' AND date(created_at) = ?
  `
    )
    .get(userId, today) as { total: number | null };

  const distractionBlocks = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM distraction_blocks
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
  `
    )
    .get(userId) as { count: number };

  const productivityScore =
    completedSessions.count > 0
      ? Math.min(
          100,
          Math.round((completed.total / (completedSessions.count * 52)) * 100)
        )
      : 0;

  return {
    totalFocusTime: completed.total || 0,
    completedSessions: completedSessions.count,
    interruptedSessions: interruptedSessions.count,
    avgInterruptions:
      completedSessions.count > 0 && totalInterruptions.total != null
        ? Math.round(totalInterruptions.total / completedSessions.count)
        : 0,
    longestSession: longest.max || 0,
    todayFocusTime: todayFocus.total || 0,
    distractionBlocks: distractionBlocks.count,
    productivityScore,
  };
}

/**
 * Get websites to block based on patterns
 */
export async function getDistractionBlocks(userId: number): Promise<{
  websites: BlockSuggestion[];
  totalBlocked: number;
}> {
  const db = getDb();

  const blocks = db
    .prepare(
      `
    SELECT pattern, source, blocked_count FROM distraction_blocks
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
  `
    )
    .all(userId) as {
    pattern: string;
    source: string;
    blocked_count: number;
  }[];

  const websites = blocks.map(b => ({
    website: b.pattern,
    category: getCategoryFromPattern(b.pattern),
    reason: `Auto-blocked via ${b.source} setting`,
    confidence: 0.9,
    blockedCount: b.blocked_count,
  }));

  return {
    websites,
    totalBlocked: blocks.length,
  };
}

/**
 * Generate smart distraction blocks based on usage patterns
 */
export async function generateSmartDistractionBlocks(
  userId: number
): Promise<BlockSuggestion[]> {
  const db = getDb();

  // Get all tasks for context
  const tasks = db
    .prepare(
      `
    SELECT name, description FROM tasks
    WHERE user_id = ? AND completed = 0
  `
    )
    .all(userId) as { name: string; description: string }[];

  const taskKeywords = tasks.flatMap(t => [
    ...(t.name?.split(/\s+/) || []),
    ...(t.description?.split(/\s+/) || []),
  ]);

  // Common distraction patterns
  const commonDistractions = [
    { pattern: 'social media', category: 'social', confidence: 0.9 },
    { pattern: 'youtube.com', category: 'entertainment', confidence: 0.8 },
    { pattern: 'reddit.com', category: 'social', confidence: 0.85 },
    { pattern: 'twitter.com', category: 'social', confidence: 0.85 },
    { pattern: 'facebook.com', category: 'social', confidence: 0.85 },
    { pattern: 'instagram.com', category: 'social', confidence: 0.9 },
    { pattern: 'tiktok.com', category: 'entertainment', confidence: 0.95 },
    { pattern: 'github.com', category: 'work', confidence: 0.5 }, // Could be work or distraction
    { pattern: 'stackoverflow.com', category: 'work', confidence: 0.3 },
    { pattern: 'news', category: 'news', confidence: 0.7 },
  ];

  // Generate blocks based on keywords in task descriptions
  const suggestions: BlockSuggestion[] = [];

  commonDistractions.forEach(d => {
    const matchesKeyword = taskKeywords.some(k =>
      k.toLowerCase().includes(d.pattern.toLowerCase())
    );

    if (!matchesKeyword || d.confidence > 0.7) {
      suggestions.push({
        website: d.pattern,
        category: d.category,
        reason: matchesKeyword
          ? 'Related to current tasks'
          : 'High distraction category',
        confidence: d.confidence,
        blockedCount: 0,
      });
    }
  });

  return suggestions;
}

/**
 * Reset daily focus stats
 */
export async function resetDailyFocusStats(userId: number): Promise<void> {
  const db = getDb();

  // Archive yesterday's completed sessions to history
  db.prepare(
    `
    INSERT INTO focus_session_history (user_id, session_id, type, duration_minutes, completed_at)
    SELECT user_id, id, type, duration_minutes, completed_at
    FROM focus_sessions
    WHERE user_id = ? AND status = 'completed' AND date(completed_at) = date('now', '-1 day')
  `
  ).run(userId);

  revalidatePath(`/focus`);
}

/**
 * Get Pomodoro history
 */
export async function getPomodoroHistory(
  userId: number,
  days = 30
): Promise<
  {
    date: string;
    completed: number;
    interruptions: number;
    totalTime: number;
  }[]
> {
  const db = getDb();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = db
    .prepare(
      `
    SELECT
      date(completed_at) as date,
      COUNT(*) as completed,
      AVG(interruption_count) as interruptions,
      SUM(duration_minutes) as totalTime
    FROM focus_sessions
    WHERE user_id = ? AND status = 'completed' AND completed_at >= ?
    GROUP BY date(completed_at)
    ORDER BY date
  `
    )
    .all(userId, startDate.toISOString().split('T')[0]) as any[];

  return history.map(h => ({
    date: h.date,
    completed: h.completed || 0,
    interruptions: Math.round(h.interruptions || 0),
    totalTime: h.totalTime || 0,
  }));
}

function getCategoryFromPattern(pattern: string): string {
  const categories: Record<string, string> = {
    social: 'Social',
    entertainment: 'Entertainment',
    news: 'News',
    work: 'Work/Research',
    shopping: 'Shopping',
    games: 'Games',
  };

  const lower = pattern.toLowerCase();
  for (const [key, value] of Object.entries(categories)) {
    if (lower.includes(key)) return value;
  }
  return 'Other';
}
