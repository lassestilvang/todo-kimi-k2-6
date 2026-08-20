'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import type { TaskWithRelations } from '@/types';

// ============================================================================
// COGNITIVE LOAD TRACKING
// ============================================================================

export interface CognitiveLoadLogInput {
  date: string;
  task_count: number;
  completed_count: number;
  avg_time_to_complete?: number | null;
  energy_level?: number | null;
  distraction_score?: number | null;
  focus_blocks: number;
  interruption_count: number;
}

export async function logCognitiveLoad(
  input: CognitiveLoadLogInput
): Promise<{ id: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `
      INSERT INTO cognitive_load_logs
      (user_id, date, task_count, completed_count, avg_time_to_complete, energy_level, distraction_score, focus_blocks, interruption_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, date) DO UPDATE SET
        task_count = excluded.task_count,
        completed_count = excluded.completed_count,
        avg_time_to_complete = excluded.avg_time_to_complete,
        energy_level = excluded.energy_level,
        distraction_score = excluded.distraction_score,
        focus_blocks = excluded.focus_blocks,
        interruption_count = excluded.interruption_count,
        updated_at = CURRENT_TIMESTAMP
    `
    )
    .run(
      user.id,
      input.date,
      input.task_count,
      input.completed_count,
      input.avg_time_to_complete ?? null,
      input.energy_level ?? null,
      input.distraction_score ?? null,
      input.focus_blocks,
      input.interruption_count
    );

  return { id: result.lastInsertRowid as number };
}

export async function getCognitiveLoadAnalysis(
  userId: number,
  days: number = 7
): Promise<{
  avgTaskCount: number;
  completionRate: number;
  avgEnergyLevel: number;
  distractionScore: number;
  loadTrend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}> {
  const db = getDb();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const logs = db
    .prepare(
      `
      SELECT * FROM cognitive_load_logs
      WHERE user_id = ? AND date >= ?
      ORDER BY date DESC
    `
    )
    .all(userId, cutoffDate.toISOString().split('T')[0]) as Array<{
    task_count: number;
    completed_count: number;
    energy_level: number | null;
    distraction_score: number | null;
  }>;

  if (logs.length === 0) {
    return {
      avgTaskCount: 0,
      completionRate: 0,
      avgEnergyLevel: 5,
      distractionScore: 0.5,
      loadTrend: 'stable',
      recommendations: [
        'Start tracking your cognitive load to get personalized recommendations',
      ],
    };
  }

  const avgTaskCount =
    logs.reduce((sum, l) => sum + l.task_count, 0) / logs.length;
  const totalCompleted = logs.reduce((sum, l) => sum + l.completed_count, 0);
  const totalTasks = logs.reduce((sum, l) => sum + l.task_count, 0);
  const completionRate = totalTasks > 0 ? totalCompleted / totalTasks : 0;

  const energyLevels = logs.map(l => l.energy_level ?? 5);
  const avgEnergyLevel =
    energyLevels.length > 0
      ? energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length
      : 5;

  const distractionScores = logs.map(l => l.distraction_score ?? 0.5);
  const distractionScore =
    distractionScores.length > 0
      ? distractionScores.reduce((sum, d) => sum + d, 0) /
        distractionScores.length
      : 0.5;

  // Determine load trend
  const firstHalf = logs.slice(0, Math.floor(logs.length / 2));
  const secondHalf = logs.slice(Math.floor(logs.length / 2));
  const firstAvg =
    firstHalf.reduce((sum, l) => sum + l.task_count, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, l) => sum + l.task_count, 0) / secondHalf.length;

  let loadTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (Math.abs(secondAvg - firstAvg) < 1) loadTrend = 'stable';
  else if (secondAvg > firstAvg) loadTrend = 'increasing';
  else loadTrend = 'decreasing';

  // Generate recommendations
  const recommendations: string[] = [];
  if (completionRate < 0.5) {
    recommendations.push(
      'Consider reducing daily task count to improve completion rate'
    );
  }
  if (distractionScore > 0.7) {
    recommendations.push(
      'High distraction score detected - try focus blocks or DND mode'
    );
  }
  if (avgEnergyLevel < 3) {
    recommendations.push(
      'Low energy levels - consider scheduling easier tasks'
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'Your cognitive load is well-balanced! Keep up the good work.'
    );
  }

  return {
    avgTaskCount,
    completionRate,
    avgEnergyLevel,
    distractionScore,
    loadTrend,
    recommendations,
  };
}

// ============================================================================
// ENERGY BUDGET SYSTEM
// ============================================================================

export interface EnergyBudgetLogInput {
  date: string;
  energy_spent?: number;
  energy_recovered?: number;
  activities?: Array<{
    task_id: number;
    energy_cost: number;
    timestamp: string;
  }>;
  recovery_activities?: Array<{
    activity: string;
    energy_restored: number;
    timestamp: string;
  }>;
}

export async function logEnergyBudget(
  input: EnergyBudgetLogInput
): Promise<{ id: number; balance: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Get current balance
  const existing = db
    .prepare(
      'SELECT current_balance FROM energy_budget_logs WHERE user_id = ? AND date = ?'
    )
    .get(user.id, input.date) as { current_balance: number } | undefined;

  const currentBalance = existing?.current_balance ?? 100;
  const prevBalance = existing ? (existing as any).energy_spent : 0;
  const energySpent = (input.energy_spent ?? 0) + prevBalance;
  const energyRecovered =
    (input.energy_recovered ?? 0) +
    (existing ? (existing as any).energy_recovered : 0);
  const newBalance = Math.max(
    0,
    Math.min(100, currentBalance - energySpent + energyRecovered)
  );

  const result = db
    .prepare(
      `
      INSERT INTO energy_budget_logs
      (user_id, date, energy_spent, energy_recovered, current_balance, activities, recovery_activities, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, date) DO UPDATE SET
        energy_spent = excluded.energy_spent,
        energy_recovered = excluded.energy_recovered,
        current_balance = excluded.current_balance,
        activities = excluded.activities,
        recovery_activities = excluded.recovery_activities,
        updated_at = CURRENT_TIMESTAMP
    `
    )
    .run(
      user.id,
      input.date,
      energySpent,
      energyRecovered,
      newBalance,
      input.activities ? JSON.stringify(input.activities) : null,
      input.recovery_activities
        ? JSON.stringify(input.recovery_activities)
        : null
    );

  return { id: result.lastInsertRowid as number, balance: newBalance };
}

export async function getEnergyBudget(date: string): Promise<{
  balance: number;
  spent: number;
  recovered: number;
  dailyLimit: number;
  percentageUsed: number;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return {
      balance: 100,
      spent: 0,
      recovered: 0,
      dailyLimit: 100,
      percentageUsed: 0,
    };
  }

  const connection = db
    .prepare(
      `
      SELECT e.current_balance, e.energy_spent, e.energy_recovered, u.energy_budget_daily
      FROM energy_budget_logs e
      JOIN user_energy_profiles u ON e.user_id = u.user_id
      WHERE e.user_id = ? AND e.date = ?
    `
    )
    .get(user.id, date) as
    | {
        current_balance: number;
        energy_spent: number;
        energy_recovered: number;
        energy_budget_daily: number;
      }
    | undefined;

  if (!connection) {
    return {
      balance: 100,
      spent: 0,
      recovered: 0,
      dailyLimit: 100,
      percentageUsed: 0,
    };
  }

  const percentageUsed =
    ((connection.energy_budget_daily - connection.current_balance) /
      connection.energy_budget_daily) *
    100;

  return {
    balance: connection.current_balance,
    spent: connection.energy_spent ?? 0,
    recovered: connection.energy_recovered ?? 0,
    dailyLimit: connection.energy_budget_daily,
    percentageUsed: Math.round(percentageUsed),
  };
}

// ============================================================================
// USER ENERGY PROFILE
// ============================================================================

export interface EnergyProfileInput {
  wake_hour?: number;
  sleep_hour?: number;
  work_start_hour?: number;
  work_end_hour?: number;
  peak_energy_times?: Array<{ start: string; end: string }>;
  energy_levels?: Array<{ time: string; level: number; type: string }>;
  fatigue_sensitivity?: number;
  recovery_time_minutes?: number;
  preferred_break_duration?: number;
  energy_budget_daily?: number;
  recovery_activities?: string[];
}

export async function getEnergyProfile(): Promise<{
  wake_hour: number;
  sleep_hour: number;
  work_hours: { start: number; end: number };
  peak_energy_times: Array<{ start: string; end: string }>;
  energy_levels: Array<{ time: string; level: number; type: string }>;
  energy_budget: { daily: number; balance: number };
} | null> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) return null;

  const profile = db
    .prepare(
      `
      SELECT pe.*, e.current_balance, e.date as current_date
      FROM user_energy_profiles pe
      LEFT JOIN energy_budget_logs e ON pe.user_id = e.user_id AND e.date = ?
      WHERE pe.user_id = ?
    `
    )
    .get(new Date().toISOString().split('T')[0], user.id) as
    | {
        wake_hour: number;
        sleep_hour: number;
        work_start_hour: number;
        work_end_hour: number;
        peak_energy_times: string;
        energy_levels: string;
        energy_budget_daily: number;
        current_balance: number;
      }
    | undefined;

  if (!profile) return null;

  return {
    wake_hour: profile.wake_hour,
    sleep_hour: profile.sleep_hour,
    work_hours: { start: profile.work_start_hour, end: profile.work_end_hour },
    peak_energy_times: JSON.parse(profile.peak_energy_times || '[]'),
    energy_levels: JSON.parse(profile.energy_levels || '[]'),
    energy_budget: {
      daily: profile.energy_budget_daily,
      balance: profile.current_balance ?? profile.energy_budget_daily,
    },
  };
}

export async function upsertEnergyProfile(
  input: EnergyProfileInput
): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Check if profile exists
  const existing = db
    .prepare('SELECT id FROM user_energy_profiles WHERE user_id = ?')
    .get(user.id);

  if (existing) {
    db.prepare(
      `
        UPDATE user_energy_profiles SET
          wake_hour = COALESCE(?, wake_hour),
          sleep_hour = COALESCE(?, sleep_hour),
          work_start_hour = COALESCE(?, work_start_hour),
          work_end_hour = COALESCE(?, work_end_hour),
          peak_energy_times = COALESCE(?, peak_energy_times),
          energy_levels = COALESCE(?, energy_levels),
          fatigue_sensitivity = COALESCE(?, fatigue_sensitivity),
          recovery_time_minutes = COALESCE(?, recovery_time_minutes),
          preferred_break_duration = COALESCE(?, preferred_break_duration),
          energy_budget_daily = COALESCE(?, energy_budget_daily),
          recovery_activities = COALESCE(?, recovery_activities),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `
    ).run(
      input.wake_hour,
      input.sleep_hour,
      input.work_start_hour,
      input.work_end_hour,
      input.peak_energy_times ? JSON.stringify(input.peak_energy_times) : null,
      input.energy_levels ? JSON.stringify(input.energy_levels) : null,
      input.fatigue_sensitivity,
      input.recovery_time_minutes,
      input.preferred_break_duration,
      input.energy_budget_daily,
      input.recovery_activities
        ? JSON.stringify(input.recovery_activities)
        : null,
      user.id
    );
  } else {
    db.prepare(
      `
        INSERT INTO user_energy_profiles
        (user_id, wake_hour, sleep_hour, work_start_hour, work_end_hour, peak_energy_times, energy_levels, fatigue_sensitivity, recovery_time_minutes, preferred_break_duration, energy_budget_daily, recovery_activities, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    ).run(
      user.id,
      input.wake_hour ?? 7,
      input.sleep_hour ?? 23,
      input.work_start_hour ?? 9,
      input.work_end_hour ?? 17,
      input.peak_energy_times ? JSON.stringify(input.peak_energy_times) : null,
      input.energy_levels ? JSON.stringify(input.energy_levels) : null,
      input.fatigue_sensitivity ?? 5,
      input.recovery_time_minutes ?? 15,
      input.preferred_break_duration ?? 5,
      input.energy_budget_daily ?? 100,
      input.recovery_activities
        ? JSON.stringify(input.recovery_activities)
        : null
    );
  }
}

// ============================================================================
// CROSS-APP SYNC
// ============================================================================

export interface SyncConnectionInput {
  app_type: string;
  app_name: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency_minutes?: number;
  field_mappings?: Record<string, string>;
  conflict_resolution?:
    'prefer_latest' | 'prefer_local' | 'prefer_remote' | 'prompt_user';
}

export async function createSyncConnection(
  input: SyncConnectionInput
): Promise<{ id: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `
      INSERT INTO cross_app_sync_connections
      (user_id, app_type, app_name, sync_direction, sync_frequency_minutes, field_mappings, conflict_resolution_strategy, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    )
    .run(
      user.id,
      input.app_type,
      input.app_name,
      input.sync_direction,
      input.sync_frequency_minutes ?? 60,
      input.field_mappings ? JSON.stringify(input.field_mappings) : null,
      input.conflict_resolution ?? 'prefer_latest'
    );

  return { id: result.lastInsertRowid as number };
}

export async function getExternalTasks(status: string = 'pending'): Promise<
  Array<{
    id: number;
    external_id: string;
    external_app_type: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: string;
    confidence: number;
    energy_cost_estimate: number;
    created_at: string;
  }>
> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `
      SELECT * FROM external_tasks
      WHERE user_id = ? AND status = ?
      ORDER BY priority DESC, due_date ASC
    `
    )
    .all(user.id, status) as Array<{
    id: number;
    external_id: string;
    external_app_type: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: string;
    confidence: number;
    energy_cost_estimate: number;
    created_at: string;
  }>;
}

export async function convertExternalTaskToTask(
  externalTaskId: number
): Promise<{ taskId: number; taskName: string }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Get external task
  const externalTask = db
    .prepare('SELECT * FROM external_tasks WHERE id = ? AND user_id = ?')
    .get(externalTaskId, user.id) as
    | {
        id: number;
        title: string;
        description: string | null;
        due_date: string | null;
        priority: string;
        energy_cost_estimate: number;
      }
    | undefined;

  if (!externalTask) {
    throw new Error('External task not found');
  }

  // Import into tasks table
  const result = db
    .prepare(
      `
      INSERT INTO tasks
      (user_id, name, description, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, 'none', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
        (SELECT IFNULL(MAX(sort_order), -1) + 1 FROM tasks WHERE user_id = ?))
    `
    )
    .run(
      user.id,
      externalTask.title,
      externalTask.description,
      externalTask.due_date,
      externalTask.due_date,
      externalTask.priority
    );

  const taskId = result.lastInsertRowid as number;

  // Update external task
  db.prepare(
    `
      UPDATE external_tasks
      SET status = 'converted', local_task_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(taskId, externalTaskId);

  return { taskId, taskName: externalTask.title };
}

// ============================================================================
// DECISION SHADOWS
// ============================================================================

export interface DecisionShadowInput {
  parent_task_id?: number;
  decision_type:
    | 'priority'
    | 'approach'
    | 'tool'
    | 'timeline'
    | 'allocation'
    | 'cancellation'
    | 'feature';
  question: string;
  chosen_option_id?: number;
  chosen_option_text: string;
  rationale: string;
  opportunity_cost?: string;
  outcome?: string;
  outcome_rating?: number;
  alternative_options?: Array<{
    option_text: string;
    pros?: string[];
    cons?: string[];
    estimated_impact?: number;
    estimated_effort?: number;
  }>;
  time_spent_minutes?: number;
  context_tags?: string[];
}

export async function createDecisionShadow(
  input: DecisionShadowInput
): Promise<{ id: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Create decision shadow record
  const result = db
    .prepare(
      `
      INSERT INTO decision_shadows
      (user_id, parent_task_id, decision_type, question, chosen_option_id, chosen_option_text, rationale,
       opportunity_cost, outcome, outcome_rating, alternative_options, time_spent_minutes, context_tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    )
    .run(
      user.id,
      input.parent_task_id ?? null,
      input.decision_type,
      input.question,
      input.chosen_option_id ?? null,
      input.chosen_option_text,
      input.rationale,
      input.opportunity_cost ?? null,
      input.outcome ?? null,
      input.outcome_rating ?? null,
      input.alternative_options
        ? JSON.stringify(input.alternative_options)
        : null,
      input.time_spent_minutes ?? 0,
      input.context_tags ? JSON.stringify(input.context_tags) : null
    );

  const decisionShadowId = result.lastInsertRowid as number;

  // Create decision options if alternatives provided
  if (input.alternative_options && input.alternative_options.length > 0) {
    for (const option of input.alternative_options) {
      // Check if this is the chosen option
      const isChosen = option.option_text === input.chosen_option_text;

      if (!isChosen) {
        db.prepare(
          `
            INSERT INTO decision_options
            (decision_shadow_id, option_text, pros, cons, estimated_impact, estimated_effort, was_chosen, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
          `
        ).run(
          decisionShadowId,
          option.option_text,
          option.pros ? JSON.stringify(option.pros) : null,
          option.cons ? JSON.stringify(option.cons) : null,
          option.estimated_impact ?? null,
          option.estimated_effort ?? null
        );
      }
    }
  }

  return { id: decisionShadowId };
}

export async function getDecisions(
  userId: number,
  limit: number = 50
): Promise<
  Array<{
    id: number;
    decision_type: string;
    question: string;
    chosen_option_text: string;
    rationale: string;
    outcome?: string | null;
    outcome_rating?: number | null;
    created_at: string;
    updated_at?: string | null;
  }>
> {
  const db = getDb();

  return db
    .prepare(
      `
      SELECT id, decision_type, question, chosen_option_text, rationale,
             outcome, outcome_rating, created_at, updated_at
      FROM decision_shadows
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
    )
    .all(userId, limit) as Array<{
    id: number;
    decision_type: string;
    question: string;
    chosen_option_text: string;
    rationale: string;
    outcome: string | null;
    outcome_rating: number | null;
    created_at: string;
    updated_at: string | null;
  }>;
}

export async function getDecisionAnalysis(
  userId: number,
  limit: number = 20
): Promise<{
  totalDecisions: number;
  avgOutcomeRating: number;
  decisionTypes: Array<{ type: string; count: number; avgRating: number }>;
  patternAnalysis: Array<{ pattern: string; recommendation: string }>;
}> {
  const db = getDb();

  const decisions = db
    .prepare(
      `
      SELECT decision_type, outcome_rating FROM decision_shadows
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
    )
    .all(userId, limit) as Array<{
    decision_type: string;
    outcome_rating: number | null;
  }>;

  if (decisions.length === 0) {
    return {
      totalDecisions: 0,
      avgOutcomeRating: 0,
      decisionTypes: [],
      patternAnalysis: [],
    };
  }

  const totalDecisions = decisions.length;
  const ratings = decisions.map(d => d.outcome_rating ?? 0);
  const avgOutcomeRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

  const typeStats: Record<string, { count: number; ratings: number[] }> = {};
  for (const d of decisions) {
    if (!typeStats[d.decision_type]) {
      typeStats[d.decision_type] = { count: 0, ratings: [] };
    }
    typeStats[d.decision_type].count++;
    if (d.outcome_rating !== null) {
      typeStats[d.decision_type].ratings.push(d.outcome_rating);
    }
  }

  const decisionTypes = Object.entries(typeStats).map(([type, stats]) => ({
    type,
    count: stats.count,
    avgRating:
      stats.ratings.length > 0
        ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
        : 0,
  }));

  const patternAnalysis = generateDecisionPatterns(
    decisionTypes,
    avgOutcomeRating
  );

  return {
    totalDecisions,
    avgOutcomeRating,
    decisionTypes,
    patternAnalysis,
  };
}

function generateDecisionPatterns(
  decisionTypes: Array<{ type: string; count: number; avgRating: number }>,
  avgOutcomeRating: number
): Array<{ pattern: string; recommendation: string }> {
  const patterns = [];

  // Check for poorly rated decision types
  const poorDecisions = decisionTypes.filter(t => t.avgRating < 0);
  if (poorDecisions.length > 0) {
    patterns.push({
      pattern: `Low-rated decisions in: ${poorDecisions.map(t => t.type).join(', ')}`,
      recommendation:
        'Consider gathering more information before making these decisions',
    });
  }

  // Check for over/under decision making
  const totalDecisions = decisionTypes.reduce((sum, t) => sum + t.count, 0);
  if (totalDecisions > 50) {
    patterns.push({
      pattern: 'High decision volume detected',
      recommendation:
        'Consider batching similar decisions or setting decision quotas',
    });
  }

  // General pattern if no issues
  if (patterns.length === 0) {
    patterns.push({
      pattern: 'Decision quality is good',
      recommendation: 'Continue your current decision-making approach',
    });
  }

  return patterns;
}

// ============================================================================
// MOOD TRACKING
// ============================================================================

export interface MoodContextInput {
  date: string;
  mood: number; // 1-5
  energy: number; // 1-5
  stress: number; // 1-5
  focus: number; // 1-5
  notes?: string;
  tasks_filtered?: number[];
}

export async function logMoodContext(
  input: MoodContextInput
): Promise<{ id: number }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Assess based on mood state and suggest relevant tasks
  const tasksToHighlight: number[] = input.tasks_filtered ?? [];

  const result = db
    .prepare(
      `
      INSERT INTO mood_contexts
      (user_id, date, mood, energy, stress, focus, notes, tasks_filtered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, date) DO UPDATE SET
        mood = excluded.mood,
        energy = excluded.energy,
        stress = excluded.stress,
        focus = excluded.focus,
        notes = excluded.notes,
        tasks_filtered = excluded.tasks_filtered,
        updated_at = CURRENT_TIMESTAMP
    `
    )
    .run(
      user.id,
      input.date,
      input.mood,
      input.energy,
      input.stress,
      input.focus,
      input.notes ?? null,
      tasksToHighlight.length > 0 ? JSON.stringify(tasksToHighlight) : null
    );

  return { id: result.lastInsertRowid as number };
}

export async function getMoodBasedTaskRecommendations(
  userId: number,
  date: string
): Promise<{
  recommendedTaskIds: number[];
  reasoning: string;
  energyAdjustment: number;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return {
      recommendedTaskIds: [],
      reasoning: 'No mood data available',
      energyAdjustment: 0,
    };
  }

  const mood = db
    .prepare('SELECT * FROM mood_contexts WHERE user_id = ? AND date = ?')
    .get(userId, date) as
    | {
        mood: number;
        energy: number;
        stress: number;
        focus: number;
      }
    | undefined;

  if (!mood) {
    return {
      recommendedTaskIds: [],
      reasoning: 'No mood data for today',
      energyAdjustment: 0,
    };
  }

  // Get tasks for the day
  const tasks = db
    .prepare(
      'SELECT id, priority, estimate FROM tasks WHERE user_id = ? AND date = ?'
    )
    .all(userId, date) as Array<{
    id: number;
    priority: string;
    estimate: string | null;
  }>;

  let recommendedTaskIds: number[] = [];
  let reasoning = '';
  let energyAdjustment = 0;

  if (mood.mood >= 4 && mood.energy >= 4) {
    // High energy - recommend challenging tasks
    recommendedTaskIds = tasks
      .filter(t => t.priority === 'critical' || t.priority === 'high')
      .map(t => t.id);
    reasoning = 'High energy detected - tackle challenging tasks';
    energyAdjustment = 1;
  } else if (mood.mood <= 2 || mood.energy <= 2) {
    // Low energy - recommend easier tasks
    recommendedTaskIds = tasks
      .filter(t => t.priority === 'low' || t.priority === 'none')
      .map(t => t.id);
    reasoning = 'Lower energy detected - focus on easier, routine tasks';
    energyAdjustment = -1;
  } else {
    // Medium energy - recommend medium priority tasks
    recommendedTaskIds = tasks
      .filter(t => t.priority === 'medium')
      .map(t => t.id);
    reasoning = 'Moderate energy - work on medium priority tasks';
    energyAdjustment = 0;
  }

  // If stress is high, recommend breaks or calming activities
  if (mood.stress >= 4) {
    reasoning +=
      '. High stress detected - consider taking a break before starting';
  }

  return {
    recommendedTaskIds,
    reasoning,
    energyAdjustment,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function estimateEnergyCost(
  task: TaskWithRelations
): Promise<number> {
  // Base cost calculation
  const priorityWeights: Record<string, number> = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2,
    none: 1,
  };

  let cost = priorityWeights[task.priority] || 5;

  // Add cost for complexity
  if (task.estimate) {
    const hours = parseFloat(task.estimate.replace(':', '.')) || 0;
    cost += Math.min(hours * 2, 15); // Cap at 15 for very long tasks
  }

  // Add cost for dependencies
  if (task.blockers?.length || task.blocked_by?.length) {
    cost += 5;
  }

  // Add cost for subtasks
  if (task.subtasks?.length) {
    cost += task.subtasks.length * 2;
  }

  return Math.min(cost, 30); // Cap at 30
}
