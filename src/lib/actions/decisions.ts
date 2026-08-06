"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { DecisionEntry, DecisionOption, DecisionTemplate, Task } from "@/types";
import type { GeneratedDecisionTemplate } from "@/lib/ai/index";
import { aiCache } from "@/lib/ai/providers";

/**
 * Create a new decision entry
 */
export async function createDecisionEntry(
  input: Partial<DecisionEntry> & { options: Partial<DecisionOption>[] }
): Promise<{ entry: DecisionEntry; optionIds: number[] }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required to create decisions");
  }

  // Create the decision entry
  const result = db
    .prepare(
      `INSERT INTO decision_entries (
         task_id, user_id, decision_type, question, chosen_option_id,
         rationale, outcome, outcome_notes, outcome_rating,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(
      input.task_id || null,
      user.id,
      input.decision_type,
      input.question,
      input.chosen_option_id || null,
      input.rationale || "",
      input.outcome || "",
      input.outcome_notes || "",
      input.outcome_rating || null
    );

  const entryId = result.lastInsertRowid as number;

  // Create decision options
  const optionIds: number[] = [];
  if (input.options?.length > 0) {
    for (const option of input.options) {
      const optionResult = db
        .prepare(
          `INSERT INTO decision_options (
             decision_entry_id, option_text, pros, cons,
             estimated_impact, estimated_effort
           ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          entryId,
          option.option_text,
          option.pros ? JSON.stringify(option.pros) : null,
          option.cons ? JSON.stringify(option.cons) : null,
          option.estimated_impact || null,
          option.estimated_effort || null
        );

      optionIds.push(optionResult.lastInsertRowid as number);
    }
  }

  return {
    entry: {
      id: entryId,
      task_id: input.task_id ?? null,
      user_id: user.id,
      decision_type: input.decision_type,
      question: input.question,
      chosen_option_id: input.chosen_option_id ?? null,
      rationale: input.rationale ?? "",
      outcome: input.outcome ?? "",
      outcome_notes: input.outcome_notes ?? "",
      outcome_rating: input.outcome_rating ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: [],
    } as DecisionEntry,
    optionIds,
  };
}

/**
 * Get all decision entries for the current user
 */
export async function getUserDecisionHistory(
  userId: number,
  options?: {
    taskId?: number;
    decisionType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<DecisionEntry[]> {
  const db = getDb();

  let query = "SELECT * FROM decision_entries WHERE user_id = ?";
  const params: any[] = [userId];

  if (options?.taskId) {
    query += " AND (task_id = ? OR task_id IS NULL)";
    params.push(options.taskId);
  }

  if (options?.decisionType) {
    query += " AND decision_type = ?";
    params.push(options.decisionType);
  }

  if (options?.startDate) {
    query += " AND created_at >= ?";
    params.push(options.startDate);
  }

  if (options?.endDate) {
    query += " AND created_at <= ?";
    params.push(options.endDate);
  }

  query += " ORDER BY created_at DESC";

  if (options?.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  const entries = db.prepare(query).all(...params) as DecisionEntry[];

  // For each entry, get the associated options
  for (const entry of entries) {
    entry.options = await getDecisionOptionsForEntry(entry.id);
    (entry as any).tasks = await getTaskForDecision(entry.id);
  }

  return entries;
}

/**
 * Get decisions for a specific task
 */
export async function getTaskDecisions(taskId: number): Promise<DecisionEntry[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const entries = db
    .prepare("SELECT * FROM decision_entries WHERE user_id = ? AND (task_id = ? OR task_id IS NULL) ORDER BY created_at DESC")
    .all(user.id, taskId) as DecisionEntry[];

  for (const entry of entries) {
    entry.options = await getDecisionOptionsForEntry(entry.id);
    (entry as any).tasks = await getTaskForDecision(entry.id);
  }

  return entries;
}

/**
 * Update an existing decision entry
 */
export async function updateDecisionEntry(
  decisionId: number,
  userId: number,
  updates: Partial<DecisionEntry>
): Promise<DecisionEntry | null> {
  const db = getDb();

  // Check if decision belongs to user
  const existing = db
    .prepare("SELECT * FROM decision_entries WHERE id = ? AND user_id = ?")
    .get(decisionId, userId) as DecisionEntry | undefined;

  if (!existing) {
    throw new Error("Decision entry not found or not accessible");
  }

  // Build update query dynamically
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.question !== undefined) {
    fields.push("question = ?");
    values.push(updates.question);
  }

  if (updates.chosen_option_id !== undefined) {
    fields.push("chosen_option_id = ?");
    values.push(updates.chosen_option_id);
  }

  if (updates.rationale !== undefined) {
    fields.push("rationale = ?");
    values.push(updates.rationale);
  }

  if (updates.outcome !== undefined) {
    fields.push("outcome = ?");
    values.push(updates.outcome);
  }

  if (updates.outcome_notes !== undefined) {
    fields.push("outcome_notes = ?");
    values.push(updates.outcome_notes);
  }

  if (updates.outcome_rating !== undefined) {
    fields.push("outcome_rating = ?");
    values.push(updates.outcome_rating);
  }

  if (updates.decision_type !== undefined) {
    fields.push("decision_type = ?");
    values.push(updates.decision_type);
  }

  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(decisionId);

    const query = `UPDATE decision_entries SET ${fields.join(", ")} WHERE id = ?`;
    db.prepare(query).run(...values);

    return getDecisionEntryById(decisionId);
  }

  return existing;
}

/**
 * Delete a decision entry and its associated options
 */
export async function deleteDecisionEntry(decisionId: number, userId: number): Promise<boolean> {
  const db = getDb();

  // Check if decision belongs to user
  const existing = db
    .prepare("SELECT id FROM decision_entries WHERE id = ? AND user_id = ?")
    .get(decisionId, userId) as { id: number } | undefined;

  if (!existing) {
    throw new Error("Decision entry not found or not accessible");
  }

  // Delete options first (foreign key constraint)
  db.prepare("DELETE FROM decision_options WHERE decision_entry_id = ?").run(decisionId);

  // Delete the entry
  const result = db
    .prepare("DELETE FROM decision_entries WHERE id = ? AND user_id = ?")
    .run(decisionId, userId);

  return result.changes > 0;
}

/**
 * Analyze decision outcomes and provide insights
 */
export async function analyzeDecisionOutcomes(
  userId: number,
  options?: {
    decisionType?: string;
    timeFrame?: string;
  }
): Promise<any> {
  const cacheKey = `decision-analysis:${userId}:${options?.decisionType || 'all'}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const decisions = await getUserDecisionHistory(userId, {
    decisionType: options?.decisionType,
    startDate: options?.timeFrame === '30_days' ? formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) : undefined,
  });

  const analysis = {
    total_decisions: decisions.length,
    decision_types: countDecisionTypes(decisions),
    outcome_quality: calculateOutcomeQuality(decisions),
    patterns: identifyDecisionPatterns(decisions),
    learning_insights: extractLearningInsights(decisions),
    recommendations: generateDecisionRecommendations(decisions, options),
  };

  aiCache.set(cacheKey, analysis);
  return analysis;
}

/**
 * Generate AI-powered decision templates
 */
export async function generateDecisionTemplate(
  userId: number,
  context: {
    decisionType?: string;
    task?: { name: string; priority?: string; deadline?: string };
    environment?: string;
  }
): Promise<GeneratedDecisionTemplate> {
  const ai = await getAIManager();
  const result = await ai.generateDecisionTemplate(context);

  // Cache the result
  const cacheKey = `decision-template:${userId}:${context.decisionType || 'general'}`;
  aiCache.set(cacheKey, result);

  return { ...result, provider: "keyword-parser" };
}

/**
 * Get decision templates for a user
 */
export async function getDecisionTemplates(userId: number): Promise<DecisionTemplate[]> {
  const db = getDb();

  const templates = db
    .prepare("SELECT * FROM decision_templates WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as DecisionTemplate[];

  return templates;
}

/**
 * Create a new decision template
 */
export async function createDecisionTemplate(
  userId: number,
  input: { name: string; prompt_template: string; option_template?: string }
): Promise<DecisionTemplate> {
  const db = getDb();

  const result = db
    .prepare(
      "INSERT INTO decision_templates (user_id, name, prompt_template, option_template, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .run(userId, input.name, input.prompt_template, input.option_template || null);

  return {
    id: result.lastInsertRowid as number,
    user_id: userId,
    name: input.name,
    prompt_template: input.prompt_template,
    option_template: input.option_template || null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Delete a decision template
 */
export async function deleteDecisionTemplate(templateId: number, userId: number): Promise<boolean> {
  const db = getDb();

  const result = db
    .prepare("DELETE FROM decision_templates WHERE id = ? AND user_id = ?")
    .run(templateId, userId);

  return result.changes > 0;
}

/**
 * Helper function to get decision entry by ID
 */
async function getDecisionEntryById(decisionId: number): Promise<DecisionEntry | null> {
  const db = getDb();

  const entry = db
    .prepare("SELECT * FROM decision_entries WHERE id = ?")
    .get(decisionId) as DecisionEntry | undefined;

  if (!entry) return null;

  entry.options = await getDecisionOptionsForEntry(entry.id);
  (entry as any).tasks = await getTaskForDecision(entry.id);

  return entry;
}

/**
 * Helper function to get decision options for an entry
 */
async function getDecisionOptionsForEntry(decisionId: number): Promise<DecisionOption[]> {
  const db = getDb();

  const options = db
    .prepare("SELECT * FROM decision_options WHERE decision_entry_id = ? ORDER BY id")
    .all(decisionId) as DecisionOption[];

  return options;
}

/**
 * Helper function to get task associated with decision
 */
async function getTaskForDecision(decisionId: number): Promise<Task | null> {
  const db = getDb();

  const entry = db
    .prepare("SELECT task_id FROM decision_entries WHERE id = ?")
    .get(decisionId) as { task_id: number | null } | undefined;

  if (!entry?.task_id) return null;

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(entry.task_id) as Task | undefined;

  return task || null;
}

/**
 * Helper function to format date for database queries
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Count decisions by type
 */
function countDecisionTypes(decisions: DecisionEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};

  decisions.forEach(decision => {
    counts[decision.decision_type] = (counts[decision.decision_type] || 0) + 1;
  });

  return counts;
}

/**
 * Calculate outcome quality for decisions
 */
function calculateOutcomeQuality(decisions: DecisionEntry[]): any {
  const outcomes = decisions.filter(d => d.outcome_rating !== null);

  if (outcomes.length === 0) {
    return {
      total_decisions: decisions.length,
      outcomes_with_rating: 0,
      average_rating: null,
      positive_outcomes: 0,
      negative_outcomes: 0,
    };
  }

  const ratings = outcomes.map(d => d.outcome_rating as number);
  const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  const positive = ratings.filter(r => r > 0).length;
  const negative = ratings.filter(r => r < 0).length;

  return {
    total_decisions: decisions.length,
    outcomes_with_rating: outcomes.length,
    average_rating: Math.round(average * 10) / 10,
    positive_outcomes: positive,
    negative_outcomes: negative,
  };
}

/**
 * Identify patterns in decision-making
 */
function identifyDecisionPatterns(decisions: DecisionEntry[]): any {
  // Group decisions by type and analyze patterns
  interface PatternType {
    count: number;
    outcome_quality: number[];
    average_outcome?: number;
  }

  const patterns: {
    by_decision_type: Record<string, PatternType>;
    by_time_of_day: Record<string, PatternType>;
    by_task_context: Record<string, PatternType>;
  } = {
    by_decision_type: {},
    by_time_of_day: {},
    by_task_context: {},
  };

  decisions.forEach(decision => {
    // By decision type
    if (!patterns.by_decision_type[decision.decision_type]) {
      patterns.by_decision_type[decision.decision_type] = { count: 0, outcome_quality: [] };
    }

    patterns.by_decision_type[decision.decision_type].count++;
    if (decision.outcome_rating !== null) {
      patterns.by_decision_type[decision.decision_type].outcome_quality.push(decision.outcome_rating);
    }

    // By time of day (extract from created_at)
    const date = new Date(decision.created_at);
    const hour = date.getHours();

    const hourKey = hour.toString();
    if (!patterns.by_time_of_day[hourKey]) {
      patterns.by_time_of_day[hourKey] = { count: 0, outcome_quality: [] };
    }

    patterns.by_time_of_day[hourKey].count++;
    if (decision.outcome_rating !== null) {
      patterns.by_time_of_day[hourKey].outcome_quality.push(decision.outcome_rating);
    }
  });

  // Calculate average outcomes by pattern
  for (const key in patterns.by_decision_type) {
    const type = patterns.by_decision_type[key];
    type.average_outcome = type.outcome_quality.reduce((sum, r) => sum + r, 0) / (type.outcome_quality.length || 1);
  }

  for (const key in patterns.by_time_of_day) {
    const hour = patterns.by_time_of_day[key];
    hour.average_outcome = hour.outcome_quality.reduce((sum, r) => sum + r, 0) / (hour.outcome_quality.length || 1);
  }

  return patterns;
}

/**
 * Extract learning insights from decisions
 */
function extractLearningInsights(decisions: DecisionEntry[]): any {
  const insights = {
    good_decision_makers: [] as Array<{ decision_type: string; success_rate: number }>,
    learning_opportunities: [] as Array<{ decision_type: string; success_rate: number; improvement_areas: string[] }>,
    timing_insights: [], // Best times to make certain decisions
    context_insights: [], // When certain contexts lead to better outcomes
  };

  // Get unique decision types
  const decisionTypes = [...new Set(decisions.map(d => d.decision_type))];

  // Analyze success rates by decision type
  for (const decisionType of decisionTypes) {
    const typedDecisions = decisions.filter(d => d.decision_type === decisionType);

    const successful = typedDecisions.filter(d => d.outcome_rating && d.outcome_rating > 0);

    const successRate = successful.length / Math.max(typedDecisions.length, 1);

    if (successRate > 0.7) {
      insights.good_decision_makers.push({
        decision_type: decisionType,
        success_rate: Math.round(successRate * 100),
      });
    } else if (successRate < 0.4) {
      insights.learning_opportunities.push({
        decision_type: decisionType,
        success_rate: Math.round(successRate * 100),
        improvement_areas: identifyImprovementAreas(typedDecisions),
      });
    }
  }

  return insights;
}

/**
 * Generate recommendations based on decision analysis
 */
function generateDecisionRecommendations(decisions: DecisionEntry[], options?: any): any {
  const recommendations = [];

  const outcomes = decisions.filter(d => d.outcome_rating !== null);

  if (outcomes.length === 0) {
    return {
      immediate_actions: ["Start tracking decision outcomes to get personalized insights"],
      long_term_goals: ["Build a consistent decision-making framework"],
    };
  }

  // Generate based on patterns
  const avgOutcome = outcomes.reduce((sum, d) => sum + (d.outcome_rating as number), 0) / outcomes.length;

  if (avgOutcome < 0) {
    recommendations.push({
      priority: 'immediate',
      message: 'Decision quality needs improvement',
      strategies: [
        'Take time to systematically analyze options before deciding',
        'Seek input from trusted sources for complex decisions',
        'Implement a decision review process to learn from outcomes',
      ],
    });
  } else if (avgOutcome > 0.5) {
    recommendations.push({
      priority: 'maintain',
      message: 'Strong decision-making track record',
      strategies: [
        'Develop decision templates for common scenarios',
        'Share your decision-making framework with others',
        'Refine your intuition with more diverse decision experiences',
      ],
    });
  }

  return {
    immediate_actions: recommendations.filter(r => r.priority === 'immediate').map(r => r.strategies).flat(),
    long_term_goals: recommendations.filter(r => r.priority === 'maintain').map(r => r.strategies).flat(),
    quick_tips: [
      'Document your decision rationale for better learning',
      'Set deadlines for time-sensitive decisions',
      'Use decision checklists for complex choices',
      'Review past similar decisions for context',
    ],
  };
}

/**
 * Identify improvement areas for a decision type
 */
function identifyImprovementAreas(decisions: DecisionEntry[]): string[] {
  const improvements: string[] = [];

  // Analyze by outcome rating patterns
  const highRiskDecisions = decisions.filter(d =>
    d.outcome_rating && d.outcome_rating <= -0.5
  );

  if (highRiskDecisions.length > 0) {
    improvements.push('Risk assessment and opportunity evaluation');
  }

  // Check if similar decisions have mixed outcomes
  const decisionTypes = [...new Set(decisions.map(d => d.decision_type))];

  if (decisionTypes.length > 1) {
    improvements.push('Consistency across different decision types');
  }

  // Time-based analysis
  const rushedDecisions = decisions.filter(d => {
    const created = new Date(d.created_at);
    return created.getHours() < 9; // Before 9 AM
  });

  if (rushedDecisions.length > decisions.length * 0.3) {
    improvements.push('Avoid making important decisions in morning rush');
  }

  return improvements.length > 0 ? improvements : ['General decision process refinement'];
}

// AI Manager helper
async function getAIManager() {
  const { getAIManager } = await import("@/lib/ai/providers");
  return getAIManager();
}